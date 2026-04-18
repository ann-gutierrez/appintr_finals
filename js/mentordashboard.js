/**
 * mentordashboard.js
 * Drives the MentorMatch Mentor Dashboard.
 * Reads: Mentor, MentorAvailability, Session (via API)
 * Conversations are stored in localStorage (replace with API/WebSocket in production)
 */

const API = "http://127.0.0.1:8000/api";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Utility ──────────────────────────────────────────────────────────────────
function getInitials(first = "", last = "") {
  return `${last.charAt(0)}${first.charAt(0)}`.toUpperCase();
}

function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function formatDateShort(d) {
  return new Date(d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Mentor profile ───────────────────────────────────────────────────────────
async function loadMentorProfile() {
  // Replace with /api/mentors/me/ once auth endpoint exists
  try {
    const res = await fetch(`${API}/mentors/`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const mentor = Array.isArray(data) ? data[0] : data;
    if (!mentor) throw new Error();
    renderProfile(mentor);
    return mentor;
  } catch {
    renderProfileError();
    return null;
  }
}

function renderProfile(m) {
  const initials = getInitials(m.first_name, m.last_name);
  const fullName = `${m.first_name} ${m.last_name}`;
  const expertise = Array.isArray(m.expertise)
    ? m.expertise.map((e) => (typeof e === "object" ? e.name : e))
    : [];

  // Nav
  const navAvatar = document.getElementById("navAvatar");
  if (m.photo) {
    navAvatar.innerHTML = `<img src="${m.photo}" class="h-full w-full object-cover" />`;
  } else {
    navAvatar.textContent = initials;
  }
  document.getElementById("navName").textContent = fullName;

  // Profile card
  const photoEl = document.getElementById("profilePhoto");
  if (m.photo) {
    photoEl.innerHTML = `<img src="${m.photo}" class="h-full w-full object-cover" />`;
  } else {
    photoEl.textContent = initials;
  }
  document.getElementById("profileName").textContent = fullName;
  document.getElementById("profileNum").textContent = `#${m.mentor_number}`;
  document.getElementById("profileDept").textContent = m.department ?? "—";
  document.getElementById("profileEmail").textContent = m.email ?? "—";
  document.getElementById("profilePhone").textContent = m.phone ?? "—";

  // Expertise tags
  const tagsEl = document.getElementById("expertiseTags");
  tagsEl.innerHTML =
    expertise
      .map(
        (e) =>
          `<span class="px-2.5 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-[10px] font-semibold">${e}</span>`,
      )
      .join("") ||
    `<span class="text-xs text-gray-400">No expertise listed</span>`;

  document.getElementById("notifDot").classList.remove("hidden");
}

function renderProfileError() {
  document.getElementById("profileName").textContent = "Mentor";
  document.getElementById("navName").textContent = "Mentor";
}

// ─── Availability ─────────────────────────────────────────────────────────────
async function loadAvailability(mentorId) {
  try {
    const res = await fetch(`${API}/mentor-availability/?mentor=${mentorId}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    renderAvailability(Array.isArray(data) ? data : []);
    return Array.isArray(data) ? data : [];
  } catch {
    document.getElementById("availabilityList").innerHTML =
      `<p class="text-xs text-red-400">Could not load availability.</p>`;
    return [];
  }
}

function renderAvailability(slots) {
  const el = document.getElementById("availabilityList");
  if (!slots.length) {
    el.innerHTML = `<p class="text-sm text-gray-400">No availability set. <a href="availability.html" class="text-teal underline">Add slots</a></p>`;
    return;
  }
  // Group by day
  const grouped = {};
  slots.forEach((s) => {
    if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
    grouped[s.day_of_week].push(s);
  });
  el.innerHTML = Object.entries(grouped)
    .map(
      ([day, items]) => `
    <div class="flex items-start gap-2">
      <span class="w-8 text-[10px] font-bold text-gray-400 uppercase pt-0.5">${day.slice(0, 3)}</span>
      <div class="space-y-0.5">
        ${items
          .map(
            (item) => `
          <p class="text-xs font-medium text-gray-700 font-mono">${formatTime(item.start_time)} – ${formatTime(item.end_time)}</p>
        `,
          )
          .join("")}
      </div>
    </div>`,
    )
    .join("");
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
async function loadSessions(mentorId) {
  try {
    const res = await fetch(`${API}/sessions/?mentor=${mentorId}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const sessions = Array.isArray(data) ? data : [];
    renderStats(sessions);
    renderStudentList(sessions);
    renderAlerts(sessions);
    return sessions;
  } catch {
    document.getElementById("studentsList").innerHTML =
      `<div class="py-8 text-center text-sm text-red-400">Could not load sessions.</div>`;
    return [];
  }
}

function renderStats(sessions) {
  const today = new Date();
  const thisMonth = sessions.filter((s) => {
    const d = new Date(s.session_date);
    return (
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  });
  const done = thisMonth.filter((s) => new Date(s.session_date) < today).length;
  const upcoming = thisMonth.filter(
    (s) => new Date(s.session_date) >= today,
  ).length;
  const students = [...new Set(sessions.map((s) => s.student))].length;

  document.getElementById("statTotal").textContent = thisMonth.length;
  document.getElementById("statDone").textContent = done;
  document.getElementById("statUpcoming").textContent = upcoming;
  document.getElementById("statStudents").textContent = students;
}

function renderStudentList(sessions) {
  const el = document.getElementById("studentsList");
  if (!sessions.length) {
    el.innerHTML = `<div class="py-10 text-center text-sm text-gray-400">No students matched yet.</div>`;
    document.getElementById("studentCount").textContent = "0 students";
    return;
  }

  // Deduplicate students, keep most recent session
  const studentMap = {};
  sessions.forEach((s) => {
    const key = s.student;
    if (
      !studentMap[key] ||
      new Date(s.session_date) > new Date(studentMap[key].session_date)
    ) {
      studentMap[key] = s;
    }
  });
  const uniqueStudents = Object.values(studentMap);
  document.getElementById("studentCount").textContent =
    `${uniqueStudents.length} student${uniqueStudents.length !== 1 ? "s" : ""}`;

  el.innerHTML = uniqueStudents
    .map((s) => {
      const name = s.student_name ?? `Student #${s.student}`;
      const initials = name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      const upcoming = sessions.filter(
        (sess) =>
          sess.student === s.student &&
          new Date(sess.session_date) >= new Date(),
      ).length;
      const lastSession = sessions
        .filter(
          (sess) =>
            sess.student === s.student &&
            new Date(sess.session_date) < new Date(),
        )
        .sort((a, b) => new Date(b.session_date) - new Date(a.session_date))[0];

      return `
      <div class="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
        <div class="h-10 w-10 rounded-full bg-ink/10 text-ink flex items-center justify-center font-bold text-sm shrink-0">
          ${initials}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-ink text-sm truncate">${name}</p>
          <p class="text-xs text-gray-400">
            ${lastSession ? `Last: ${formatDateShort(lastSession.session_date)}` : "No past sessions"}
          </p>
        </div>
        <div class="flex items-center gap-3">
          ${upcoming > 0 ? `<span class="px-2 py-0.5 rounded-full bg-teal/10 text-teal text-[10px] font-bold">${upcoming} upcoming</span>` : ""}
          <button class="msg-student-btn h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-ink hover:text-white hover:border-ink transition-colors text-gray-400"
            data-student-id="${s.student}" data-student-name="${name}">
            <span class="material-symbols-rounded text-base">chat</span>
          </button>
        </div>
      </div>`;
    })
    .join("");

  // Bind message buttons
  el.querySelectorAll(".msg-student-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openConversation(btn.dataset.studentId, btn.dataset.studentName);
    });
  });
}

function renderAlerts(sessions) {
  const el = document.getElementById("alertsList");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const todaySessions = sessions.filter((s) => s.session_date === todayStr);
  const soonSessions = sessions.filter((s) => {
    const d = new Date(s.session_date);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 2;
  });

  const all = [...todaySessions, ...soonSessions];

  if (!all.length) {
    el.innerHTML = `
      <div class="flex items-center gap-2 text-xs text-gray-400">
        <span class="material-symbols-rounded text-green-400">check_circle</span>
        No alerts for today.
      </div>`;
    return;
  }

  el.innerHTML = all
    .map((s) => {
      const isToday = s.session_date === todayStr;
      const name = s.student_name ?? `Student #${s.student}`;
      return `
      <div class="flex gap-3 p-3 rounded-xl ${isToday ? "bg-amber2/10 border border-amber2/20" : "bg-blue-50 border border-blue-100"}">
        <span class="material-symbols-rounded text-lg ${isToday ? "text-amber2" : "text-blue-400"} shrink-0">
          ${isToday ? "schedule" : "event_upcoming"}
        </span>
        <div>
          <p class="text-xs font-bold ${isToday ? "text-amber2" : "text-blue-700"}">
            ${isToday ? "Today" : formatDateShort(s.session_date)}
          </p>
          <p class="text-xs text-gray-600">Session with <b>${name}</b></p>
          <p class="text-[10px] text-gray-400 font-mono">${formatTime(s.start_time)} – ${formatTime(s.end_time)}</p>
        </div>
      </div>`;
    })
    .join("");
}

// ─── Weekly Schedule ──────────────────────────────────────────────────────────
let currentWeekStart = getMondayOf(new Date());
let allSessions = [];

function renderWeekGrid(sessions) {
  const grid = document.getElementById("weekGrid");
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i),
  );

  // Update label
  const start = days[0];
  const end = days[6];
  document.getElementById("weekLabel").textContent =
    `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;

  grid.innerHTML = days
    .map((day) => {
      const isToday = isSameDay(day, today);
      const dayLabel = day.toLocaleDateString("en", { weekday: "short" });
      const dateLabel = day.getDate();

      const daySessions = sessions.filter((s) => {
        const sd = new Date(s.session_date);
        return isSameDay(sd, day);
      });

      const sessionBlocks = daySessions
        .map((s) => {
          const name = s.student_name ?? `Student #${s.student}`;
          return `
        <div class="session-slot mt-2 pl-2 pr-1 py-1.5 rounded-r-lg bg-teal/10 text-xs">
          <p class="font-semibold text-teal truncate">${name}</p>
          <p class="text-gray-400 font-mono text-[9px]">${formatTime(s.start_time)}</p>
        </div>`;
        })
        .join("");

      return `
      <div class="flex-1 day-col min-w-[100px] px-3 py-3">
        <div class="text-center mb-3">
          <p class="text-[10px] font-semibold uppercase tracking-wider ${isToday ? "text-teal" : "text-gray-400"}">${dayLabel}</p>
          <div class="mx-auto mt-1 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold
            ${isToday ? "bg-ink text-white" : "text-gray-600"}">
            ${dateLabel}
          </div>
        </div>
        <div class="space-y-0.5">
          ${sessionBlocks || `<p class="text-[10px] text-gray-300 text-center mt-4">—</p>`}
        </div>
      </div>`;
    })
    .join("");
}

document.getElementById("prevWeek").addEventListener("click", () => {
  currentWeekStart = addDays(currentWeekStart, -7);
  renderWeekGrid(allSessions);
});

document.getElementById("nextWeek").addEventListener("click", () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  renderWeekGrid(allSessions);
});

// ─── Conversations (localStorage) ────────────────────────────────────────────
// In production, replace with WebSocket / Django Channels / REST polling
let activeConvStudentId = null;
let activeConvStudentName = null;
let mentorId = null;

function getConvKey(mId, sId) {
  return `mm_conv_${mId}_${sId}`;
}

function loadConvMessages(mId, sId) {
  try {
    return JSON.parse(localStorage.getItem(getConvKey(mId, sId))) ?? [];
  } catch {
    return [];
  }
}

function saveConvMessages(mId, sId, msgs) {
  localStorage.setItem(getConvKey(mId, sId), JSON.stringify(msgs));
}

function renderConvList(sessions) {
  const el = document.getElementById("convList");
  const students = [...new Map(sessions.map((s) => [s.student, s])).values()];

  if (!students.length) {
    el.innerHTML = `<p class="text-xs text-gray-400 py-2">No students yet.</p>`;
    return;
  }

  el.innerHTML = students
    .map((s) => {
      const name = s.student_name ?? `Student #${s.student}`;
      const initials = name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      const msgs = loadConvMessages(mentorId, s.student);
      const last = msgs[msgs.length - 1];

      return `
      <button class="conv-item w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
        data-student-id="${s.student}" data-student-name="${name}">
        <div class="h-8 w-8 rounded-full bg-ink/10 text-ink flex items-center justify-center font-bold text-xs shrink-0">${initials}</div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-ink truncate">${name}</p>
          <p class="text-[10px] text-gray-400 truncate">${last ? last.text : "No messages yet"}</p>
        </div>
      </button>`;
    })
    .join("");

  el.querySelectorAll(".conv-item").forEach((btn) => {
    btn.addEventListener("click", () =>
      openConversation(btn.dataset.studentId, btn.dataset.studentName),
    );
  });
}

function openConversation(studentId, studentName) {
  activeConvStudentId = studentId;
  activeConvStudentName = studentName;

  // Highlight active conversation
  document.querySelectorAll(".conv-item").forEach((btn) => {
    btn.classList.toggle(
      "bg-teal/10",
      btn.dataset.studentId === String(studentId),
    );
  });

  renderMessages();

  // Enable composer
  const input = document.getElementById("msgInput");
  const sendBtn = document.getElementById("msgSend");
  input.disabled = false;
  sendBtn.disabled = false;
  input.placeholder = `Message ${studentName}…`;
  input.focus();
}

function renderMessages() {
  const thread = document.getElementById("msgThread");
  if (!activeConvStudentId || !mentorId) return;

  const msgs = loadConvMessages(mentorId, activeConvStudentId);

  if (!msgs.length) {
    thread.innerHTML = `
      <div class="text-center py-8">
        <span class="material-symbols-rounded text-4xl text-gray-200">chat_bubble</span>
        <p class="text-xs text-gray-400 mt-2">Start the conversation with ${activeConvStudentName}.</p>
      </div>`;
    return;
  }

  thread.innerHTML = msgs
    .map((msg) => {
      const isMentor = msg.sender === "mentor";
      return `
      <div class="flex ${isMentor ? "justify-end" : "justify-start"}">
        <div class="max-w-[80%] px-3 py-2 text-sm ${isMentor ? "msg-bubble-mentor" : "msg-bubble-student"}">
          <p>${msg.text}</p>
          <p class="text-[10px] mt-1 ${isMentor ? "text-white/50" : "text-gray-400"} font-mono">${msg.time}</p>
        </div>
      </div>`;
    })
    .join("");

  thread.scrollTop = thread.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || !activeConvStudentId || !mentorId) return;

  const msgs = loadConvMessages(mentorId, activeConvStudentId);
  msgs.push({
    sender: "mentor",
    text,
    time: new Date().toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  saveConvMessages(mentorId, activeConvStudentId, msgs);
  input.value = "";
  renderMessages();
}

document.getElementById("msgSend").addEventListener("click", sendMessage);
document.getElementById("msgInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const mentor = await loadMentorProfile();
  if (!mentor) return;

  mentorId = mentor.id;

  const [sessions, availability] = await Promise.all([
    loadSessions(mentorId),
    loadAvailability(mentorId),
  ]);

  allSessions = sessions;
  renderWeekGrid(sessions);
  renderConvList(sessions);
}

document.addEventListener("DOMContentLoaded", init);
