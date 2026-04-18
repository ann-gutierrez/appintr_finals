/**
 * browse-mentors.js
 * Powers the MentorMatch Browse Mentors page.
 *
 * Models used: Mentor, Expertise, MentorAvailability, Session, Student
 *
 * Ratings note: The backend has no dedicated Rating model yet.
 * We derive a "score" from session history (sessions completed = experience proxy)
 * and store student ratings in localStorage until a Rating endpoint is added.
 * Replace computeRating() with a real API call when available.
 */

const API = "http://127.0.0.1:8000/api";

// ─── State ────────────────────────────────────────────────────────────────────
let allMentors = []; // raw from API
let allSessions = []; // all sessions (for session count per mentor)
let allAvailability = []; // all availability slots
let filteredMentors = []; // after search + filter
let currentSort = "rating";
let filterAvailable = false;
let currentStudent = null;
let isGridView = true;

// ─── Utilities ────────────────────────────────────────────────────────────────
function getInitials(first = "", last = "") {
  return `${last.charAt(0)}${first.charAt(0)}`.toUpperCase();
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function getRatingKey(mentorId) {
  return `mm_rating_${mentorId}`;
}
function getMyRatings() {
  try {
    return JSON.parse(localStorage.getItem("mm_my_ratings")) ?? {};
  } catch {
    return {};
  }
}
function saveMyRatings(obj) {
  localStorage.setItem("mm_my_ratings", JSON.stringify(obj));
}

/**
 * Computes a display rating for a mentor.
 * Priority: stored student ratings → session-based heuristic.
 */
function computeRating(mentor, sessionCount) {
  const stored = JSON.parse(
    localStorage.getItem(getRatingKey(mentor.id)) ?? "null",
  );
  if (stored && stored.avg !== undefined) {
    return { avg: stored.avg, count: stored.count, source: "rated" };
  }
  // Heuristic: scale session count → a 3.0–5.0 star range
  if (sessionCount === 0) return { avg: 0, count: 0, source: "none" };
  const clamped = Math.min(sessionCount, 30);
  const avg = +(3.0 + (clamped / 30) * 2.0).toFixed(1);
  return { avg, count: sessionCount, source: "derived" };
}

function storeRating(mentorId, avg, count) {
  localStorage.setItem(getRatingKey(mentorId), JSON.stringify({ avg, count }));
  // Also track which mentor this student has rated
  const mine = getMyRatings();
  mine[mentorId] = avg;
  saveMyRatings(mine);
}

function renderStars(avg, interactive = false, mentorId = null) {
  const full = Math.floor(avg);
  const half = avg - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  if (!interactive) {
    return Array.from({ length: 5 }, (_, i) => {
      if (i < full)
        return `<span class="star material-symbols-rounded text-base">star</span>`;
      if (i === full && half)
        return `<span class="star material-symbols-rounded text-base">star_half</span>`;
      return `<span class="star-empty material-symbols-rounded text-base">star</span>`;
    }).join("");
  }

  // Interactive stars (for rating widget)
  return Array.from(
    { length: 5 },
    (_, i) =>
      `<button class="rate-star material-symbols-rounded text-2xl transition-colors ${i < full ? "star" : "star-empty"}"
      data-star="${i + 1}" data-mentor-id="${mentorId}">star</button>`,
  ).join("");
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [mentorsRes, sessionsRes, availRes] = await Promise.all([
      fetch(`${API}/mentors/`),
      fetch(`${API}/sessions/`),
      fetch(`${API}/mentor-availability/`),
    ]);

    allMentors = mentorsRes.ok ? await mentorsRes.json() : [];
    allSessions = sessionsRes.ok ? await sessionsRes.json() : [];
    allAvailability = availRes.ok ? await availRes.json() : [];

    allMentors = Array.isArray(allMentors) ? allMentors : [];
    allSessions = Array.isArray(allSessions) ? allSessions : [];
    allAvailability = Array.isArray(allAvailability) ? allAvailability : [];

    buildQuickTags();
    applySearchAndFilters();
  } catch (err) {
    console.error("Browse mentors load error:", err);
    showError(
      "Could not connect to the server. Make sure your Django backend is running.",
    );
  }
}

async function loadCurrentStudent() {
  try {
    const res = await fetch(`${API}/students/`);
    if (!res.ok) return;
    const data = await res.json();
    currentStudent = Array.isArray(data) ? data[0] : data;
    if (!currentStudent) return;

    // Nav avatar
    const navEl = document.getElementById("navAvatar");
    if (currentStudent.photo) {
      navEl.innerHTML = `<img src="${currentStudent.photo}" class="h-full w-full object-cover" />`;
    } else {
      navEl.textContent = getInitials(
        currentStudent.first_name,
        currentStudent.last_name,
      );
    }
  } catch {
    /* silent */
  }
}

// ─── Quick tags ───────────────────────────────────────────────────────────────
function buildQuickTags() {
  // Collect all expertise names
  const names = {};
  allMentors.forEach((m) => {
    const expertise = Array.isArray(m.expertise) ? m.expertise : [];
    expertise.forEach((e) => {
      const name = typeof e === "object" ? e.name : e;
      names[name] = (names[name] ?? 0) + 1;
    });
  });

  // Top 8 by frequency
  const top = Object.entries(names)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  document.getElementById("quickTags").innerHTML = top
    .map(
      (tag) => `
    <button class="pill pill-default quick-tag" data-tag="${tag}">
      ${tag}
    </button>`,
    )
    .join("");

  document.querySelectorAll(".quick-tag").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;
      const input = document.getElementById("searchInput");
      input.value = tag;
      triggerSearch();
    });
  });
}

// ─── Search & filter ──────────────────────────────────────────────────────────
function sessionCountFor(mentorId) {
  return allSessions.filter((s) => String(s.mentor) === String(mentorId))
    .length;
}

function availableDaysFor(mentorId) {
  return allAvailability
    .filter((a) => String(a.mentor) === String(mentorId))
    .map((a) => a.day_of_week);
}

function hasAvailability(mentorId) {
  return allAvailability.some((a) => String(a.mentor) === String(mentorId));
}

function matchScore(mentor, query) {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const expertise = Array.isArray(mentor.expertise) ? mentor.expertise : [];
  const names = expertise.map((e) =>
    (typeof e === "object" ? e.name : e).toLowerCase(),
  );

  // Exact expertise match → highest score
  if (names.some((n) => n === q)) return 3;
  // Partial expertise match
  if (names.some((n) => n.includes(q) || q.includes(n))) return 2;
  // Dept / name match
  const dept = (mentor.department ?? "").toLowerCase();
  const full = `${mentor.first_name} ${mentor.last_name}`.toLowerCase();
  if (dept.includes(q) || full.includes(q)) return 1;
  return 0;
}

function sortMentors(mentors) {
  return [...mentors].sort((a, b) => {
    if (currentSort === "rating") {
      const ra = computeRating(a, sessionCountFor(a.id));
      const rb = computeRating(b, sessionCountFor(b.id));
      return rb.avg - ra.avg || rb.count - ra.count;
    }
    if (currentSort === "sessions") {
      return sessionCountFor(b.id) - sessionCountFor(a.id);
    }
    if (currentSort === "name") {
      return a.last_name.localeCompare(b.last_name);
    }
    return 0;
  });
}

function applySearchAndFilters() {
  const query = document.getElementById("searchInput").value.trim();

  let results = allMentors.filter((m) => {
    const score = matchScore(m, query);
    if (query && score === 0) return false;
    if (filterAvailable && !hasAvailability(m.id)) return false;
    m._matchScore = score;
    return true;
  });

  // Sort by match relevance first when searching, then by chosen sort
  if (query) {
    results.sort((a, b) => b._matchScore - a._matchScore || 0);
  } else {
    results = sortMentors(results);
  }

  filteredMentors = results;

  updateResultsLabel(query, results.length);
  renderMentors(results, query);

  // Clear search button
  document.getElementById("clearSearch").classList.toggle("hidden", !query);
}

function triggerSearch() {
  applySearchAndFilters();
}

function updateResultsLabel(query, count) {
  const label = document.getElementById("resultsLabel");
  const search = document.getElementById("searchLabel");
  label.textContent = `${count} mentor${count !== 1 ? "s" : ""} found`;
  if (query) {
    search.textContent = `Showing results for "${query}"`;
    search.classList.remove("hidden");
  } else {
    search.classList.add("hidden");
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderMentors(mentors, query = "") {
  const grid = document.getElementById("mentorGrid");
  const empty = document.getElementById("emptyState");
  const myRatings = getMyRatings();

  if (!mentors.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  grid.className = isGridView
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
    : "grid grid-cols-1 gap-4";

  grid.innerHTML = mentors
    .map((mentor, idx) => {
      const sessions = sessionCountFor(mentor.id);
      const rating = computeRating(mentor, sessions);
      const availability = availableDaysFor(mentor.id);
      const expertise = Array.isArray(mentor.expertise) ? mentor.expertise : [];
      const names = expertise.map((e) => (typeof e === "object" ? e.name : e));
      const initials = getInitials(mentor.first_name, mentor.last_name);
      const hasRated = myRatings[mentor.id] !== undefined;
      const isMatched = mentor._matchScore >= 2 && query;
      const delay = idx < 9 ? `animation-delay:${idx * 50}ms` : "";

      const pillsHtml =
        names
          .slice(0, 4)
          .map((name) => {
            const isSearchMatch =
              query && name.toLowerCase().includes(query.toLowerCase());
            return `<span class="pill ${isSearchMatch ? "pill-match" : "pill-default"}">${name}</span>`;
          })
          .join("") +
        (names.length > 4
          ? `<span class="pill pill-default">+${names.length - 4}</span>`
          : "");

      const availHtml =
        availability
          .slice(0, 3)
          .map(
            (day) =>
              `<span class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">${day.slice(0, 3)}</span>`,
          )
          .join("") +
        (availability.length > 3
          ? `<span class="text-[10px] text-muted">+${availability.length - 3} more</span>`
          : "");

      if (isGridView) {
        return `
        <div class="mentor-card p-6 card-in ${isMatched ? "matched-highlight" : ""}" style="${delay}">
          <!-- Match badge -->
          ${isMatched ? `<div class="flex justify-end mb-3"><span class="match-badge">✦ Best Match</span></div>` : "<div class='mb-3 h-5'></div>"}

          <!-- Header -->
          <div class="flex items-start gap-3 mb-4">
            <div class="h-14 w-14 rounded-2xl bg-brand/10 text-brand font-bold text-lg flex items-center justify-center overflow-hidden shrink-0">
              ${mentor.photo ? `<img src="${mentor.photo}" class="h-full w-full object-cover" />` : initials}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-display font-semibold text-ink text-lg leading-tight">${mentor.first_name} ${mentor.last_name}</h3>
              <p class="text-xs text-muted mt-0.5 truncate">${mentor.department ?? "—"}</p>
              <p class="text-[10px] font-mono text-slate-400 mt-0.5">#${mentor.mentor_number}</p>
            </div>
          </div>

          <!-- Rating -->
          <div class="flex items-center gap-2 mb-3">
            <div class="flex items-center gap-0.5">
              ${renderStars(rating.avg)}
            </div>
            <span class="text-sm font-bold text-ink">${rating.avg > 0 ? rating.avg.toFixed(1) : "—"}</span>
            <span class="text-xs text-muted">
              ${
                rating.source === "rated"
                  ? `(${rating.count} rating${rating.count !== 1 ? "s" : ""})`
                  : rating.count > 0
                    ? `(${rating.count} session${rating.count !== 1 ? "s" : ""})`
                    : "(No sessions yet)"
              }
            </span>
            ${hasRated ? `<span class="ml-auto text-[10px] text-brand font-semibold">You rated</span>` : ""}
          </div>

          <!-- Expertise pills -->
          <div class="flex flex-wrap gap-1.5 mb-3">${pillsHtml || `<span class="text-xs text-muted">No expertise listed</span>`}</div>

          <!-- Availability -->
          ${availability.length ? `<div class="flex items-center gap-1.5 flex-wrap mb-4">${availHtml}</div>` : `<p class="text-xs text-muted mb-4">No availability set</p>`}

          <!-- Actions -->
          <div class="flex gap-2 pt-3 border-t border-slate-50">
            <button class="view-profile-btn flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              data-mentor-id="${mentor.id}">
              View Profile
            </button>
            <button class="request-btn flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors flex items-center justify-center gap-1.5"
              data-mentor-id="${mentor.id}" data-mentor-name="${mentor.first_name} ${mentor.last_name}">
              <span class="material-symbols-rounded text-base">handshake</span>
              Request
            </button>
          </div>
        </div>`;
      } else {
        // List view
        return `
        <div class="mentor-card px-6 py-4 card-in flex items-center gap-5 ${isMatched ? "matched-highlight" : ""}" style="${delay}">
          <div class="h-12 w-12 rounded-xl bg-brand/10 text-brand font-bold text-base flex items-center justify-center overflow-hidden shrink-0">
            ${mentor.photo ? `<img src="${mentor.photo}" class="h-full w-full object-cover" />` : initials}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-display font-semibold text-ink">${mentor.first_name} ${mentor.last_name}</h3>
              ${isMatched ? `<span class="match-badge">✦ Best Match</span>` : ""}
            </div>
            <p class="text-xs text-muted">${mentor.department ?? "—"}</p>
            <div class="flex flex-wrap gap-1 mt-1.5">${pillsHtml}</div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${renderStars(rating.avg)}
            <span class="text-sm font-bold text-ink ml-1">${rating.avg > 0 ? rating.avg.toFixed(1) : "—"}</span>
          </div>
          <div class="flex gap-2 shrink-0">
            <button class="view-profile-btn px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              data-mentor-id="${mentor.id}">View</button>
            <button class="request-btn px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
              data-mentor-id="${mentor.id}" data-mentor-name="${mentor.first_name} ${mentor.last_name}">
              Request
            </button>
          </div>
        </div>`;
      }
    })
    .join("");

  // Bind action buttons
  document.querySelectorAll(".request-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      openRequestModal(btn.dataset.mentorId, btn.dataset.mentorName),
    );
  });
  document.querySelectorAll(".view-profile-btn").forEach((btn) => {
    btn.addEventListener("click", () => openDetailModal(btn.dataset.mentorId));
  });
}

function showError(msg) {
  document.getElementById("mentorGrid").innerHTML = `
    <div class="col-span-3 py-20 text-center">
      <span class="material-symbols-rounded text-5xl text-red-300">cloud_off</span>
      <p class="text-muted text-sm mt-4">${msg}</p>
    </div>`;
}

// ─── Request Session Modal ────────────────────────────────────────────────────
async function openRequestModal(mentorId, mentorName) {
  document.getElementById("modalMentorId").value = mentorId;
  document.getElementById("modalMentorName").textContent = `with ${mentorName}`;
  document.getElementById("modalMsg").classList.add("hidden");

  // Pre-fill today's date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("sessionDate").value = today;
  document.getElementById("sessionStart").value = "09:00";
  document.getElementById("sessionEnd").value = "10:00";

  // Show mentor's availability
  const slots = allAvailability.filter(
    (a) => String(a.mentor) === String(mentorId),
  );
  const hint = document.getElementById("availabilityHint");
  const slotsEl = document.getElementById("availabilitySlots");

  if (slots.length) {
    hint.classList.remove("hidden");
    slotsEl.innerHTML = slots
      .map(
        (s) =>
          `<p class="text-xs font-medium text-brand">
        <span class="font-bold">${s.day_of_week}</span>
        &nbsp;·&nbsp; ${formatTime(s.start_time)} – ${formatTime(s.end_time)}
      </p>`,
      )
      .join("");
  } else {
    hint.classList.add("hidden");
  }

  document.getElementById("requestModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeRequestModal() {
  document.getElementById("requestModal").classList.add("hidden");
  document.body.style.overflow = "";
}

async function submitRequest() {
  const mentorId = document.getElementById("modalMentorId").value;
  const date = document.getElementById("sessionDate").value;
  const start = document.getElementById("sessionStart").value;
  const end = document.getElementById("sessionEnd").value;
  const msgEl = document.getElementById("modalMsg");

  if (!date || !start || !end) {
    showModalMsg("Please fill in all fields.", "error");
    return;
  }
  if (start >= end) {
    showModalMsg("End time must be after start time.", "error");
    return;
  }
  if (!currentStudent) {
    showModalMsg(
      "Could not identify your student account. Please log in.",
      "error",
    );
    return;
  }

  const btn = document.getElementById("submitRequest");
  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    const body = {
      student: currentStudent.id,
      mentor: mentorId,
      session_date: date,
      start_time: start,
      end_time: end,
    };
    const res = await fetch(`${API}/sessions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(JSON.stringify(err));
    }

    showModalMsg("Session request sent! Check your dashboard.", "success");
    setTimeout(closeRequestModal, 1500);
  } catch (err) {
    console.error("Request error:", err);
    showModalMsg("Failed to send request. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-rounded text-base">send</span> Send Request`;
  }
}

function showModalMsg(msg, type) {
  const el = document.getElementById("modalMsg");
  el.className = `rounded-xl px-4 py-3 text-sm border ${
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700"
  }`;
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function openDetailModal(mentorId) {
  const mentor = allMentors.find((m) => String(m.id) === String(mentorId));
  if (!mentor) return;

  const sessions = sessionCountFor(mentor.id);
  const rating = computeRating(mentor, sessions);
  const slots = allAvailability.filter(
    (a) => String(a.mentor) === String(mentorId),
  );
  const expertise = Array.isArray(mentor.expertise) ? mentor.expertise : [];
  const names = expertise.map((e) => (typeof e === "object" ? e.name : e));
  const initials = getInitials(mentor.first_name, mentor.last_name);
  const myRatings = getMyRatings();
  const myRating = myRatings[mentor.id] ?? 0;

  document.getElementById("detailContent").innerHTML = `
    <!-- Header -->
    <div class="flex gap-4 items-start mb-6">
      <div class="h-20 w-20 rounded-2xl bg-brand/10 text-brand font-bold text-2xl flex items-center justify-center overflow-hidden shrink-0">
        ${mentor.photo ? `<img src="${mentor.photo}" class="h-full w-full object-cover" />` : initials}
      </div>
      <div>
        <h4 class="font-display text-xl font-bold text-ink">${mentor.first_name} ${mentor.last_name}</h4>
        <p class="text-sm text-muted">${mentor.department ?? "—"}</p>
        <p class="text-xs font-mono text-slate-400">Mentor #${mentor.mentor_number}</p>
        <div class="flex items-center gap-1.5 mt-2">
          ${renderStars(rating.avg)}
          <span class="text-sm font-bold text-ink">${rating.avg > 0 ? rating.avg.toFixed(1) : "—"}</span>
          <span class="text-xs text-muted">(${sessions} session${sessions !== 1 ? "s" : ""})</span>
        </div>
      </div>
    </div>

    <!-- Expertise -->
    <div class="mb-5">
      <h5 class="text-xs font-bold uppercase tracking-widest text-muted mb-2">Areas of Expertise</h5>
      <div class="flex flex-wrap gap-1.5">
        ${names.length ? names.map((n) => `<span class="pill pill-default">${n}</span>`).join("") : `<span class="text-xs text-muted">No expertise listed</span>`}
      </div>
    </div>

    <!-- Contact -->
    <div class="mb-5 space-y-2">
      <h5 class="text-xs font-bold uppercase tracking-widest text-muted mb-2">Contact</h5>
      ${mentor.email ? `<p class="flex items-center gap-2 text-sm text-slate-600"><span class="material-symbols-rounded text-muted text-base">mail</span>${mentor.email}</p>` : ""}
      ${mentor.phone ? `<p class="flex items-center gap-2 text-sm text-slate-600"><span class="material-symbols-rounded text-muted text-base">phone</span>${mentor.phone}</p>` : ""}
    </div>

    <!-- Availability -->
    <div class="mb-6">
      <h5 class="text-xs font-bold uppercase tracking-widest text-muted mb-2">Availability</h5>
      ${
        slots.length
          ? `<div class="space-y-1.5">
            ${slots
              .map(
                (s) => `
              <div class="flex items-center gap-3 text-sm">
                <span class="w-16 font-semibold text-ink">${s.day_of_week}</span>
                <span class="text-muted font-mono text-xs">${formatTime(s.start_time)} – ${formatTime(s.end_time)}</span>
              </div>`,
              )
              .join("")}
          </div>`
          : `<p class="text-sm text-muted">No availability set.</p>`
      }
    </div>

    <!-- Rate this mentor -->
    <div class="rounded-2xl bg-sand border border-slate-200 px-4 py-4 mb-5">
      <h5 class="text-xs font-bold uppercase tracking-widest text-muted mb-3">Rate this Mentor</h5>
      <div class="flex items-center gap-1" id="ratingWidget">
        ${renderStars(myRating, true, mentor.id)}
      </div>
      <p id="ratingFeedback" class="text-xs text-muted mt-2">${myRating ? `You rated ${myRating} star${myRating !== 1 ? "s" : ""}` : "Tap stars to rate"}</p>
    </div>

    <!-- CTA -->
    <button class="request-detail-btn w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors flex items-center justify-center gap-2"
      data-mentor-id="${mentor.id}" data-mentor-name="${mentor.first_name} ${mentor.last_name}">
      <span class="material-symbols-rounded">handshake</span>
      Request a Session
    </button>
  `;

  // Bind interactive stars
  document.querySelectorAll(".rate-star").forEach((btn) => {
    btn.addEventListener("mouseenter", () =>
      highlightStars(parseInt(btn.dataset.star), mentor.id),
    );
    btn.addEventListener("mouseleave", () =>
      highlightStars(myRatings[mentor.id] ?? 0, mentor.id),
    );
    btn.addEventListener("click", () =>
      submitRating(parseInt(btn.dataset.star), mentor.id),
    );
  });

  // Bind request button
  document
    .querySelector(".request-detail-btn")
    .addEventListener("click", (e) => {
      closeDetailModal();
      openRequestModal(
        e.currentTarget.dataset.mentorId,
        e.currentTarget.dataset.mentorName,
      );
    });

  document.getElementById("detailModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function highlightStars(count, mentorId) {
  document.querySelectorAll(".rate-star").forEach((btn, i) => {
    btn.classList.toggle("star", i < count);
    btn.classList.toggle("star-empty", i >= count);
  });
}

function submitRating(stars, mentorId) {
  const stored = JSON.parse(
    localStorage.getItem(getRatingKey(mentorId)) ?? "null",
  );
  const oldCount = stored?.count ?? 0;
  const oldAvg = stored?.avg ?? 0;
  // Rolling average
  const newCount = oldCount + 1;
  const newAvg = +((oldAvg * oldCount + stars) / newCount).toFixed(2);
  storeRating(mentorId, newAvg, newCount);

  document.getElementById("ratingFeedback").textContent =
    `You rated ${stars} star${stars !== 1 ? "s" : ""} — thank you!`;
  // Refresh card in background
  applySearchAndFilters();
}

function closeDetailModal() {
  document.getElementById("detailModal").classList.add("hidden");
  document.body.style.overflow = "";
}

// ─── Event listeners ──────────────────────────────────────────────────────────
// Search
let searchTimeout;
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(triggerSearch, 250);
});

document.getElementById("clearSearch").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  triggerSearch();
});

document.getElementById("resetSearch").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  triggerSearch();
});

// Sort chips
document.querySelectorAll("[data-sort]").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentSort = btn.dataset.sort;
    document
      .querySelectorAll("[data-sort]")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applySearchAndFilters();
  });
});

// Filter chips
document
  .querySelector("[data-filter='available']")
  .addEventListener("click", function () {
    filterAvailable = !filterAvailable;
    this.classList.toggle("active", filterAvailable);
    document
      .getElementById("clearFilters")
      .classList.toggle("hidden", !filterAvailable);
    applySearchAndFilters();
  });

document.getElementById("clearFilters").addEventListener("click", () => {
  filterAvailable = false;
  document
    .querySelector("[data-filter='available']")
    .classList.remove("active");
  document.getElementById("clearFilters").classList.add("hidden");
  applySearchAndFilters();
});

// View toggle
document.getElementById("viewGrid").addEventListener("click", () => {
  isGridView = true;
  document
    .getElementById("viewGrid")
    .classList.add("text-brand", "bg-brand/5", "border-brand/30");
  document
    .getElementById("viewList")
    .classList.remove("text-brand", "bg-brand/5", "border-brand/30");
  renderMentors(
    filteredMentors,
    document.getElementById("searchInput").value.trim(),
  );
});
document.getElementById("viewList").addEventListener("click", () => {
  isGridView = false;
  document
    .getElementById("viewList")
    .classList.add("text-brand", "bg-brand/5", "border-brand/30");
  document
    .getElementById("viewGrid")
    .classList.remove("text-brand", "bg-brand/5", "border-brand/30");
  renderMentors(
    filteredMentors,
    document.getElementById("searchInput").value.trim(),
  );
});

// Request modal
document
  .getElementById("closeModal")
  .addEventListener("click", closeRequestModal);
document
  .getElementById("cancelModal")
  .addEventListener("click", closeRequestModal);
document
  .getElementById("submitRequest")
  .addEventListener("click", submitRequest);
document.getElementById("requestModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("requestModal")) closeRequestModal();
});

// Detail modal
document
  .getElementById("closeDetailModal")
  .addEventListener("click", closeDetailModal);
document.getElementById("detailModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("detailModal")) closeDetailModal();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadCurrentStudent();
  loadAll();
});
