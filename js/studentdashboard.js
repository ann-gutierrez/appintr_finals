/**
 * studentdashboard.js
 * Drives the MentorMatch Student Dashboard.
 * Reads: Student, Session, StudentPreference (via API)
 * Tasks are stored in localStorage keyed to student id.
 */

const API = "http://127.0.0.1:8000/api";

// ─── Utility ──────────────────────────────────────────────────────────────────
function getInitials(first = "", last = "") {
  return `${last.charAt(0)}${first.charAt(0)}`.toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

// ─── Student profile ──────────────────────────────────────────────────────────
async function loadStudentProfile() {
  // In a real app this would use the logged-in user's session/token.
  // For now we fetch from /api/students/ and take the first record.
  // Replace with: fetch(`${API}/students/me/`) once that endpoint exists.
  try {
    const res = await fetch(`${API}/students/`);
    if (!res.ok) throw new Error();
    const students = await res.json();

    // Simulating "current user" as first student — replace with auth logic
    const student = Array.isArray(students) ? students[0] : students;
    if (!student) throw new Error("No student found");

    renderProfile(student);
    return student;
  } catch {
    renderProfileError();
    return null;
  }
}

function renderProfile(s) {
  const fullName = `${s.first_name} ${s.last_name}`;
  const initials = getInitials(s.first_name, s.last_name);

  // Nav
  const navAvatar = document.getElementById("navAvatar");
  if (s.photo) {
    navAvatar.innerHTML = `<img src="${s.photo}" class="h-full w-full object-cover" />`;
  } else {
    navAvatar.textContent = initials;
  }
  document.getElementById("navName").textContent = fullName;

  // Greeting hero
  document.getElementById("greetingName").textContent = s.first_name;
  document.getElementById("greetingInfo").textContent =
    `${s.course} · ${s.department} · ${s.college}`;

  // Sidebar profile
  const photoEl = document.getElementById("profilePhoto");
  if (s.photo) {
    photoEl.innerHTML = `<img src="${s.photo}" class="h-full w-full object-cover" />`;
  } else {
    photoEl.textContent = initials;
  }
  document.getElementById("profileName").textContent = fullName;
  document.getElementById("profileNum").textContent = `ID: ${s.student_number}`;
  document.getElementById("profileCollege").textContent = s.college ?? "—";
  document.getElementById("profileCourse").textContent = s.course ?? "—";
  document.getElementById("profileEmail").textContent = s.email ?? "—";

  // Notification dot (demo)
  document.getElementById("notifDot").classList.remove("hidden");

  return s;
}

function renderProfileError() {
  document.getElementById("greetingName").textContent = "Student";
  document.getElementById("greetingInfo").textContent =
    "Could not load profile.";
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
async function loadSessions(studentId) {
  try {
    const res = await fetch(`${API}/sessions/?student=${studentId}`);
    if (!res.ok) throw new Error();
    const sessions = await res.json();
    renderSessions(Array.isArray(sessions) ? sessions : []);
    return sessions;
  } catch {
    document.getElementById("sessionsContainer").innerHTML =
      `<div class="py-8 text-center text-sm text-red-400">Could not load sessions.</div>`;
    return [];
  }
}

function renderSessions(sessions) {
  const container = document.getElementById("sessionsContainer");

  // Sort: upcoming first
  const today = new Date();
  const upcoming = sessions
    .filter((s) => new Date(s.session_date) >= today)
    .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

  // Stats
  document.getElementById("statSessions").textContent = sessions.length;
  document.getElementById("statPending").textContent = upcoming.length;

  if (!upcoming.length) {
    container.innerHTML = `
      <div class="py-10 text-center">
        <span class="material-symbols-rounded text-4xl text-slate-300">event_busy</span>
        <p class="text-muted text-sm mt-2">No upcoming sessions.</p>
        <a href="browse-mentors.html" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
          Find a mentor <span class="material-symbols-rounded text-sm">arrow_forward</span>
        </a>
      </div>`;
    return;
  }

  container.innerHTML = upcoming
    .map((s) => {
      const isPast = new Date(`${s.session_date}T${s.end_time}`) < today;
      const badge = isPast
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Completed</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Upcoming</span>`;

      const mentorName = s.mentor_name ?? `Mentor #${s.mentor}`;

      return `
      <div class="session-card py-4 flex items-center gap-4">
        <div class="shrink-0 w-14 text-center">
          <p class="text-2xl font-display font-bold text-brand leading-none">
            ${new Date(s.session_date).getDate()}
          </p>
          <p class="text-[10px] font-semibold text-muted uppercase">
            ${new Date(s.session_date).toLocaleString("en", { month: "short" })}
          </p>
        </div>
        <div class="h-10 w-px bg-slate-100 shrink-0"></div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-slate-800 truncate">with ${mentorName}</p>
          <p class="text-xs text-muted mt-0.5">
            ${formatTime(s.start_time)} – ${formatTime(s.end_time)}
          </p>
        </div>
        ${badge}
      </div>`;
    })
    .join("");

  // Progress bar: ratio of past sessions
  const past = sessions.filter((s) => new Date(s.session_date) < today).length;
  const pct = sessions.length ? Math.round((past / sessions.length) * 100) : 0;
  document.getElementById("progressSessionsPct").textContent = `${pct}%`;
  document.getElementById("progressSessionsBar").style.width = `${pct}%`;
}

// ─── Mentor ───────────────────────────────────────────────────────────────────
async function loadMentor(studentId, sessions) {
  // Determine matched mentor from the most recent session
  if (!sessions || !sessions.length) {
    document.getElementById("statMentor").textContent = "—";
    renderNoMentor();
    return;
  }
  const latestSession = [...sessions].sort(
    (a, b) => new Date(b.session_date) - new Date(a.session_date),
  )[0];
  const mentorId = latestSession.mentor;

  try {
    const res = await fetch(`${API}/mentors/${mentorId}/`);
    if (!res.ok) throw new Error();
    const mentor = await res.json();
    renderMentor(mentor);
    document.getElementById("statMentor").textContent = "✓";
  } catch {
    renderNoMentor();
    document.getElementById("statMentor").textContent = "—";
  }
}

function renderMentor(mentor) {
  const initials = getInitials(mentor.first_name, mentor.last_name);
  const expertise = Array.isArray(mentor.expertise)
    ? mentor.expertise
        .map((e) => (typeof e === "object" ? e.name : e))
        .join(", ")
    : (mentor.expertise ?? "—");

  document.getElementById("mentorCard").innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <div class="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
        ${mentor.photo ? `<img src="${mentor.photo}" class="h-full w-full object-cover" />` : initials}
      </div>
      <div>
        <p class="font-bold text-slate-800">${mentor.first_name} ${mentor.last_name}</p>
        <p class="text-xs text-muted">${mentor.department ?? "—"}</p>
      </div>
    </div>
    <div class="flex flex-wrap gap-1.5 mb-4">
      ${expertise
        .split(",")
        .map(
          (e) =>
            `<span class="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-semibold">${e.trim()}</span>`,
        )
        .join("")}
    </div>
    <div class="space-y-1.5 text-xs text-muted">
      ${mentor.email ? `<p class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">mail</span>${mentor.email}</p>` : ""}
      ${mentor.phone ? `<p class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">phone</span>${mentor.phone}</p>` : ""}
    </div>
    <a href="messages.html?mentor=${mentor.id}" class="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors">
      <span class="material-symbols-rounded text-base">chat</span>
      Message Mentor
    </a>`;
}

function renderNoMentor() {
  document.getElementById("mentorCard").innerHTML = `
    <div class="text-center py-6">
      <span class="material-symbols-rounded text-4xl text-slate-300">person_off</span>
      <p class="text-muted text-sm mt-2">No mentor matched yet.</p>
      <a href="browse-mentors.html" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
        Browse mentors <span class="material-symbols-rounded text-sm">arrow_forward</span>
      </a>
    </div>`;
}

// ─── Preferences ──────────────────────────────────────────────────────────────
async function loadPreferences(studentId) {
  try {
    const res = await fetch(`${API}/student-preferences/?student=${studentId}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const pref = Array.isArray(data) ? data[0] : data;
    renderPreferences(pref);
  } catch {
    document.getElementById("preferencesArea").innerHTML =
      `<p class="text-purple-200 text-xs">No preferences set yet.</p>`;
  }
}

function renderPreferences(pref) {
  if (!pref) {
    document.getElementById("preferencesArea").innerHTML =
      `<p class="text-purple-200 text-xs">No preferences set yet.</p>`;
    return;
  }
  const items = [
    pref.preferred_department
      ? `<p class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">apartment</span>${pref.preferred_department}</p>`
      : "",
    pref.preferred_expertise
      ? `<p class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">stars</span>${pref.preferred_expertise}</p>`
      : "",
    pref.preferred_gender
      ? `<p class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">person</span>Prefers ${pref.preferred_gender} mentor</p>`
      : "",
    pref.availability_notes
      ? `<p class="flex items-center gap-1.5 italic text-purple-200 text-xs">"${pref.availability_notes}"</p>`
      : "",
  ].filter(Boolean);

  document.getElementById("preferencesArea").innerHTML = items.length
    ? items.join("")
    : `<p class="text-purple-200 text-xs">No preferences set yet.</p>`;
}

// ─── Tasks (localStorage) ─────────────────────────────────────────────────────
function getTaskKey(studentId) {
  return `mm_tasks_${studentId}`;
}

function loadTasks(studentId) {
  try {
    return JSON.parse(localStorage.getItem(getTaskKey(studentId))) ?? [];
  } catch {
    return [];
  }
}

function saveTasks(studentId, tasks) {
  localStorage.setItem(getTaskKey(studentId), JSON.stringify(tasks));
}

function renderTasks(studentId) {
  const tasks = loadTasks(studentId);
  const listEl = document.getElementById("tasksList");

  if (!tasks.length) {
    listEl.innerHTML = `<li class="py-6 text-center text-muted text-sm">No tasks yet — add one above!</li>`;
    updateTaskProgress(0, 0);
    return;
  }

  listEl.innerHTML = tasks
    .map(
      (t, i) => `
    <li class="flex items-center gap-3 py-2.5 group">
      <button class="task-toggle shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors
        ${t.done ? "bg-brand border-brand" : "border-slate-300 hover:border-brand"}"
        data-index="${i}">
        ${t.done ? `<span class="material-symbols-rounded text-white text-xs">check</span>` : ""}
      </button>
      <span class="flex-1 text-sm text-slate-700 ${t.done ? "task-done" : ""}">${t.text}</span>
      <button class="task-delete opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-300 hover:text-red-400" data-index="${i}">
        <span class="material-symbols-rounded text-sm">delete</span>
      </button>
    </li>`,
    )
    .join("");

  // Bind buttons
  listEl.querySelectorAll(".task-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      const tasks = loadTasks(studentId);
      tasks[idx].done = !tasks[idx].done;
      saveTasks(studentId, tasks);
      renderTasks(studentId);
    });
  });
  listEl.querySelectorAll(".task-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      const tasks = loadTasks(studentId);
      tasks.splice(idx, 1);
      saveTasks(studentId, tasks);
      renderTasks(studentId);
    });
  });

  const done = tasks.filter((t) => t.done).length;
  updateTaskProgress(done, tasks.length);
}

function updateTaskProgress(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("progressTasksPct").textContent = `${pct}%`;
  document.getElementById("progressTasksBar").style.width = `${pct}%`;
}

function initTaskForm(studentId) {
  const addBtn = document.getElementById("addTaskBtn");
  const formEl = document.getElementById("addTaskForm");
  const inputEl = document.getElementById("newTaskInput");
  const saveBtn = document.getElementById("saveTaskBtn");

  addBtn.addEventListener("click", () => {
    formEl.classList.toggle("hidden");
    if (!formEl.classList.contains("hidden")) inputEl.focus();
  });

  function submitTask() {
    const text = inputEl.value.trim();
    if (!text) return;
    const tasks = loadTasks(studentId);
    tasks.push({ text, done: false, createdAt: new Date().toISOString() });
    saveTasks(studentId, tasks);
    inputEl.value = "";
    formEl.classList.add("hidden");
    renderTasks(studentId);
  }

  saveBtn.addEventListener("click", submitTask);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitTask();
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const student = await loadStudentProfile();
  if (!student) return;

  const studentId = student.id;
  initTaskForm(studentId);
  renderTasks(studentId);

  const sessions = await loadSessions(studentId);
  await loadMentor(studentId, sessions);
  await loadPreferences(studentId);
}

document.addEventListener("DOMContentLoaded", init);
