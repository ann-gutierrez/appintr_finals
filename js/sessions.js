/* ═══════════════════════════════════════════════════════════════════════════
   sessions.js  —  MentorMatch Sessions page
   API base: http://127.0.0.1:8000/api
   Endpoints used:
     GET    /sessions/          → list all sessions
     POST   /sessions/          → create session
     GET    /sessions/{id}/     → retrieve session
     PUT    /sessions/{id}/     → full update
     PATCH  /sessions/{id}/     → partial update (status)
     DELETE /sessions/{id}/     → delete session
     GET    /students/          → populate student dropdown
     GET    /mentors/           → populate mentor dropdown
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE_URL = "http://127.0.0.1:8000/api";

// ─── State ────────────────────────────────────────────────────────────────────
let allSessions  = [];   // raw data from API
let filteredSessions = [];
let students     = [];
let mentors      = [];
let editingId    = null; // session id being edited, null = create mode
let deletingId   = null; // session id pending delete confirm
let currentPage  = 1;
const PAGE_SIZE  = 10;
let activeFilter = "all"; // all | scheduled | completed | cancelled

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const sessionList     = document.getElementById("sessionList");
const skeletonList    = document.getElementById("skeletonList");
const emptyState      = document.getElementById("emptyState");
const paginationRow   = document.getElementById("paginationRow");
const paginationInfo  = document.getElementById("paginationInfo");
const pageIndicator   = document.getElementById("pageIndicator");
const prevPageBtn     = document.getElementById("prevPage");
const nextPageBtn     = document.getElementById("nextPage");
const searchInput     = document.getElementById("searchInput");
const dateFilter      = document.getElementById("dateFilter");
const clearFiltersBtn = document.getElementById("clearFilters");
const globalMsg       = document.getElementById("globalMsg");
const globalMsgText   = document.getElementById("globalMsgText");
const globalMsgIcon   = document.getElementById("globalMsgIcon");

// Stat cards
const statTotal     = document.getElementById("statTotal");
const statScheduled = document.getElementById("statScheduled");
const statCompleted = document.getElementById("statCompleted");
const statCancelled = document.getElementById("statCancelled");

// Session modal
const sessionModal   = document.getElementById("sessionModal");
const modalTitle     = document.getElementById("modalTitle");
const modalSub       = document.getElementById("modalSub");
const modalIcon      = document.getElementById("modalIcon");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const saveSessionText = document.getElementById("saveSessionText");
const statusRow      = document.getElementById("statusRow");
const modalMsg       = document.getElementById("modalMsg");
const modalMsgText   = document.getElementById("modalMsgText");
const modalMsgIcon   = document.getElementById("modalMsgIcon");

// Delete modal
const deleteModal       = document.getElementById("deleteModal");
const deleteConfirmText = document.getElementById("deleteConfirmText");
const confirmDeleteBtn  = document.getElementById("confirmDeleteBtn");

// View modal
const viewModal     = document.getElementById("viewModal");
const viewModalBody = document.getElementById("viewModalBody");

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  loadSidebarUser();
  await Promise.all([fetchStudents(), fetchMentors()]);
  await fetchSessions();
  bindEvents();
});

// ─── Sidebar user ─────────────────────────────────────────────────────────────
function loadSidebarUser() {
  try {
    const raw = localStorage.getItem("mentormatch_user") ||
                sessionStorage.getItem("mentormatch_user");
    if (!raw) return;
    const user = JSON.parse(raw);
    const name = user.first_name
      ? `${user.first_name} ${user.last_name ?? ""}`.trim()
      : user.username ?? "—";
    document.getElementById("sidebarName").textContent  = name;
    document.getElementById("sidebarRole").textContent  = capitalise(user.role ?? "");
    document.getElementById("sidebarAvatar").textContent = name.charAt(0).toUpperCase();
  } catch (_) {}
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("mentormatch_token") ||
                sessionStorage.getItem("mentormatch_token");
  const headers = { ...(options.headers ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  return res;
}

// ─── Data fetchers ────────────────────────────────────────────────────────────
async function fetchSessions() {
  skeletonList.classList.remove("hidden");
  sessionList.classList.add("hidden");
  emptyState.classList.add("hidden");

  try {
    const res = await apiFetch("/sessions/");
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    allSessions = await res.json();
    // Handle DRF paginated or plain list
    if (allSessions && allSessions.results) allSessions = allSessions.results;
    updateStats();
    applyFilters();
  } catch (err) {
    console.error("fetchSessions:", err);
    showGlobalMsg("Could not load sessions. " + err.message, "error");
    allSessions = [];
    applyFilters();
  } finally {
    skeletonList.classList.add("hidden");
  }
}

async function fetchStudents() {
  try {
    const res = await apiFetch("/students/");
    if (!res.ok) return;
    let data = await res.json();
    if (data && data.results) data = data.results;
    students = data ?? [];
    populateSelect("modal_student", students, s =>
      `${s.student_number} — ${s.last_name}, ${s.first_name}`
    );
  } catch (err) {
    console.error("fetchStudents:", err);
  }
}

async function fetchMentors() {
  try {
    const res = await apiFetch("/mentors/");
    if (!res.ok) return;
    let data = await res.json();
    if (data && data.results) data = data.results;
    mentors = data ?? [];
    populateSelect("modal_mentor", mentors, m =>
      `${m.mentor_number} — ${m.last_name}, ${m.first_name}`
    );
  } catch (err) {
    console.error("fetchMentors:", err);
  }
}

function populateSelect(selectId, items, labelFn) {
  const sel = document.getElementById(selectId);
  const current = sel.value;
  // keep placeholder
  while (sel.options.length > 1) sel.remove(1);
  items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = labelFn(item);
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  statTotal.textContent     = allSessions.length;
  statScheduled.textContent = allSessions.filter(s => s.status === "scheduled" || !s.status).length;
  statCompleted.textContent = allSessions.filter(s => s.status === "completed").length;
  statCancelled.textContent = allSessions.filter(s => s.status === "cancelled").length;
}

// ─── Filter + Search ──────────────────────────────────────────────────────────
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const dateVal = dateFilter.value;

  filteredSessions = allSessions.filter(s => {
    // Tab filter
    if (activeFilter !== "all") {
      const status = s.status ?? "scheduled";
      if (status !== activeFilter) return false;
    }

    // Date filter
    if (dateVal && s.session_date !== dateVal) return false;

    // Search
    if (query) {
      const studentName = (s.student_name ?? "").toLowerCase();
      const mentorName  = (s.mentor_name  ?? "").toLowerCase();
      const date        = (s.session_date ?? "").toLowerCase();
      if (!studentName.includes(query) && !mentorName.includes(query) && !date.includes(query)) {
        return false;
      }
    }

    return true;
  });

  currentPage = 1;
  renderPage();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderPage() {
  const total = filteredSessions.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredSessions.slice(start, start + PAGE_SIZE);

  sessionList.innerHTML = "";

  if (slice.length === 0) {
    sessionList.classList.add("hidden");
    emptyState.classList.remove("hidden");
    paginationRow.style.visibility = "hidden";
  } else {
    emptyState.classList.add("hidden");
    sessionList.classList.remove("hidden");
    paginationRow.style.visibility = "visible";
    slice.forEach(s => sessionList.appendChild(buildSessionRow(s)));
  }

  // Pagination info
  const from = total === 0 ? 0 : start + 1;
  const to   = Math.min(start + PAGE_SIZE, total);
  paginationInfo.textContent  = `Showing ${from}–${to} of ${total} session${total !== 1 ? "s" : ""}`;
  pageIndicator.textContent   = `${currentPage} / ${totalPages}`;
  prevPageBtn.disabled        = currentPage <= 1;
  nextPageBtn.disabled        = currentPage >= totalPages;
}

function buildSessionRow(s) {
  const status = s.status ?? "scheduled";

  const row = document.createElement("div");
  row.className = "session-row";
  row.innerHTML = `
    <!-- Student -->
    <div class="min-w-0">
      <p class="text-sm font-semibold text-white truncate">${escHtml(s.student_name ?? "Unknown Student")}</p>
      <p class="text-[10px] text-white/35 mt-0.5 sm:hidden">vs ${escHtml(s.mentor_name ?? "Unknown Mentor")}</p>
    </div>

    <!-- Mentor -->
    <div class="min-w-0 hidden sm:block">
      <p class="text-sm text-white/70 truncate">${escHtml(s.mentor_name ?? "Unknown Mentor")}</p>
    </div>

    <!-- Date + time -->
    <div class="text-right sm:text-left whitespace-nowrap">
      <p class="text-xs font-semibold text-white/80">${formatDate(s.session_date)}</p>
      <p class="text-[10px] text-white/40 mt-0.5">${formatTime(s.start_time)} – ${formatTime(s.end_time)}</p>
    </div>

    <!-- Status badge -->
    <div>${statusBadge(status)}</div>

    <!-- Actions -->
    <div class="flex items-center gap-2 justify-end">
      <button class="text-white/30 hover:text-violet-400 transition-colors" title="View details" data-action="view" data-id="${s.id}">
        <span class="material-symbols-outlined text-xl">visibility</span>
      </button>
      <button class="text-white/30 hover:text-blue-400 transition-colors" title="Edit" data-action="edit" data-id="${s.id}">
        <span class="material-symbols-outlined text-xl">edit</span>
      </button>
      <button class="text-white/30 hover:text-red-400 transition-colors" title="Delete" data-action="delete" data-id="${s.id}">
        <span class="material-symbols-outlined text-xl">delete</span>
      </button>
    </div>
  `;

  // Delegate action buttons
  row.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id     = parseInt(btn.dataset.id, 10);
      const action = btn.dataset.action;
      if (action === "view")   openViewModal(id);
      if (action === "edit")   openEditModal(id);
      if (action === "delete") openDeleteModal(id);
    });
  });

  // Row click → view
  row.addEventListener("click", () => openViewModal(s.id));
  row.style.cursor = "pointer";

  return row;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    scheduled: `<span class="badge badge-scheduled"><span class="material-symbols-outlined text-xs" style="font-size:11px">schedule</span>${capitalise(status)}</span>`,
    completed: `<span class="badge badge-completed"><span class="material-symbols-outlined text-xs" style="font-size:11px">check_circle</span>${capitalise(status)}</span>`,
    cancelled: `<span class="badge badge-cancelled"><span class="material-symbols-outlined text-xs" style="font-size:11px">cancel</span>${capitalise(status)}</span>`,
  };
  return map[status] ?? map["scheduled"];
}

// ─── View modal ───────────────────────────────────────────────────────────────
function openViewModal(id) {
  const s = allSessions.find(x => x.id === id);
  if (!s) return;

  const status = s.status ?? "scheduled";

  viewModalBody.innerHTML = `
    <div class="rounded-xl bg-white/4 border border-white/7 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-white/30">Session #${s.id}</p>
        ${statusBadge(status)}
      </div>
      <hr class="border-white/7" />
      ${detailRow("person", "Student", s.student_name ?? "—")}
      ${detailRow("person_book", "Mentor", s.mentor_name ?? "—")}
      ${detailRow("calendar_today", "Date", formatDate(s.session_date))}
      ${detailRow("schedule", "Time", `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`)}
      ${detailRow("access_time", "Created", formatDateTime(s.created_at))}
    </div>
    <div class="flex gap-3 mt-2">
      <button class="btn-ghost flex-1 text-xs" onclick="openEditModal(${s.id}); closeViewModal();">
        <span class="material-symbols-outlined text-base">edit</span> Edit
      </button>
      <button class="btn-danger flex-1 text-xs" onclick="openDeleteModal(${s.id}); closeViewModal();">
        <span class="material-symbols-outlined text-base">delete</span> Cancel Session
      </button>
    </div>
  `;

  viewModal.classList.remove("hidden");
}

function detailRow(icon, label, value) {
  return `
    <div class="flex items-start gap-3">
      <span class="material-symbols-outlined text-violet-400/60 text-base mt-0.5" style="font-size:18px">${icon}</span>
      <div>
        <p class="text-[10px] text-white/30 uppercase tracking-wider font-bold">${label}</p>
        <p class="text-sm text-white/80 font-medium mt-0.5">${escHtml(value)}</p>
      </div>
    </div>
  `;
}

function closeViewModal() {
  viewModal.classList.add("hidden");
}

// ─── Book modal ───────────────────────────────────────────────────────────────
function openBookModal() {
  editingId = null;
  clearModalForm();
  modalTitle.textContent    = "Book Session";
  modalSub.textContent      = "Schedule a new mentoring session";
  modalIcon.textContent     = "calendar_add_on";
  saveSessionText.textContent = "Book Session";
  statusRow.classList.add("hidden");
  sessionModal.classList.remove("hidden");
}

function openEditModal(id) {
  const s = allSessions.find(x => x.id === id);
  if (!s) return;

  editingId = id;
  clearModalForm();
  modalTitle.textContent      = "Edit Session";
  modalSub.textContent        = `Editing session #${id}`;
  modalIcon.textContent       = "edit_calendar";
  saveSessionText.textContent = "Save Changes";
  statusRow.classList.remove("hidden");

  // Populate fields
  document.getElementById("modal_student").value    = s.student;
  document.getElementById("modal_mentor").value     = s.mentor;
  document.getElementById("modal_date").value       = s.session_date ?? "";
  document.getElementById("modal_start_time").value = s.start_time ?? "";
  document.getElementById("modal_end_time").value   = s.end_time ?? "";
  document.getElementById("modal_status").value     = s.status ?? "scheduled";

  sessionModal.classList.remove("hidden");
}

function closeModal() {
  sessionModal.classList.add("hidden");
  editingId = null;
  clearModalForm();
}

function clearModalForm() {
  ["modal_student","modal_mentor","modal_date","modal_start_time","modal_end_time","modal_status"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === "SELECT" ? "" : "";
  });
  ["err_student","err_mentor","err_date","err_start_time","err_end_time"].forEach(id => {
    hideFieldError(id);
  });
  clearModalMsg();
  saveSessionBtn.disabled = false;
}

// ─── Save session (create / update) ──────────────────────────────────────────
async function saveSession() {
  if (!validateModalForm()) return;

  const payload = {
    student:      parseInt(document.getElementById("modal_student").value, 10),
    mentor:       parseInt(document.getElementById("modal_mentor").value, 10),
    session_date: document.getElementById("modal_date").value,
    start_time:   document.getElementById("modal_start_time").value,
    end_time:     document.getElementById("modal_end_time").value,
  };

  if (editingId !== null) {
    payload.status = document.getElementById("modal_status").value;
  }

  clearModalMsg();
  saveSessionBtn.disabled = true;
  saveSessionText.textContent = editingId ? "Saving…" : "Booking…";

  try {
    const method   = editingId ? "PUT" : "POST";
    const endpoint = editingId ? `/sessions/${editingId}/` : "/sessions/";
    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload),
    });

    let data = {};
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
      const err = extractDRFError(data);
      throw new Error(err ?? `Request failed (${res.status})`);
    }

    showGlobalMsg(
      editingId ? "Session updated successfully." : "Session booked successfully.",
      "success"
    );
    closeModal();
    await fetchSessions();

  } catch (err) {
    console.error("saveSession:", err);
    showModalMsg(err.message, "error");
  } finally {
    saveSessionBtn.disabled = false;
    saveSessionText.textContent = editingId ? "Save Changes" : "Book Session";
  }
}

// ─── Delete modal ─────────────────────────────────────────────────────────────
function openDeleteModal(id) {
  deletingId = id;
  const s = allSessions.find(x => x.id === id);
  deleteConfirmText.textContent = s
    ? `Cancel the session between ${s.student_name} and ${s.mentor_name} on ${formatDate(s.session_date)}?`
    : "Are you sure you want to cancel this session?";
  deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  deleteModal.classList.add("hidden");
  deletingId = null;
}

async function confirmDelete() {
  if (deletingId === null) return;
  confirmDeleteBtn.disabled = true;

  try {
    const res = await apiFetch(`/sessions/${deletingId}/`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Delete failed (${res.status})`);
    }
    showGlobalMsg("Session cancelled successfully.", "success");
    closeDeleteModal();
    await fetchSessions();
  } catch (err) {
    console.error("confirmDelete:", err);
    showGlobalMsg(err.message, "error");
    closeDeleteModal();
  } finally {
    confirmDeleteBtn.disabled = false;
  }
}

// ─── Validate modal form ──────────────────────────────────────────────────────
function validateModalForm() {
  let valid = true;

  if (!document.getElementById("modal_student").value) {
    showFieldError("err_student", "Please select a student.");
    valid = false;
  } else {
    hideFieldError("err_student");
  }

  if (!document.getElementById("modal_mentor").value) {
    showFieldError("err_mentor", "Please select a mentor.");
    valid = false;
  } else {
    hideFieldError("err_mentor");
  }

  if (!document.getElementById("modal_date").value) {
    showFieldError("err_date", "Session date is required.");
    valid = false;
  } else {
    hideFieldError("err_date");
  }

  const start = document.getElementById("modal_start_time").value;
  const end   = document.getElementById("modal_end_time").value;

  if (!start) {
    showFieldError("err_start_time", "Start time is required.");
    valid = false;
  } else {
    hideFieldError("err_start_time");
  }

  if (!end) {
    showFieldError("err_end_time", "End time is required.");
    valid = false;
  } else if (start && end && end <= start) {
    showFieldError("err_end_time", "End time must be after start time.");
    valid = false;
  } else {
    hideFieldError("err_end_time");
  }

  return valid;
}

// ─── Event bindings ───────────────────────────────────────────────────────────
function bindEvents() {
  // Open book modal
  document.getElementById("openBookModal").addEventListener("click", openBookModal);

  // Close modals
  document.getElementById("closeModal").addEventListener("click",     closeModal);
  document.getElementById("cancelModal").addEventListener("click",    closeModal);
  document.getElementById("closeViewModal").addEventListener("click", closeViewModal);
  document.getElementById("closeViewModalBtn").addEventListener("click", closeViewModal);
  document.getElementById("cancelDeleteBtn").addEventListener("click", closeDeleteModal);

  // Save session
  saveSessionBtn.addEventListener("click", saveSession);

  // Confirm delete
  confirmDeleteBtn.addEventListener("click", confirmDelete);

  // Click outside modal to close
  [sessionModal, deleteModal, viewModal].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        if (modal === sessionModal) { editingId = null; clearModalForm(); }
        if (modal === deleteModal)  { deletingId = null; }
      }
    });
  });

  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  // Search
  searchInput.addEventListener("input", debounce(applyFilters, 250));

  // Date filter
  dateFilter.addEventListener("change", applyFilters);

  // Clear filters
  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value  = "";
    dateFilter.value   = "";
    activeFilter       = "all";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelector('.tab-btn[data-filter="all"]').classList.add("active");
    applyFilters();
  });

  // Pagination
  prevPageBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderPage(); } });
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredSessions.length / PAGE_SIZE);
    if (currentPage < totalPages) { currentPage++; renderPage(); }
  });

  // Sidebar mobile toggle
  const toggle = document.getElementById("sidebarToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open");
    });
  }

  // ESC to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeViewModal();
      closeDeleteModal();
    }
  });
}

// ─── Message helpers ──────────────────────────────────────────────────────────
function showGlobalMsg(text, type) {
  globalMsgText.textContent = text;
  globalMsgIcon.textContent = type === "error" ? "error" : "check_circle";
  globalMsg.className = `msg ${type}`;
  setTimeout(() => clearGlobalMsg(), 5000);
}
function clearGlobalMsg() {
  globalMsg.className = "msg";
}

function showModalMsg(text, type) {
  modalMsgText.textContent = text;
  modalMsgIcon.textContent = type === "error" ? "error" : "check_circle";
  modalMsg.className = `msg ${type}`;
}
function clearModalMsg() {
  modalMsg.className = "msg";
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visible");
}
function hideFieldError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("visible");
}

// ─── DRF error extractor ──────────────────────────────────────────────────────
function extractDRFError(data) {
  if (!data || typeof data !== "object") return null;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return data.non_field_errors[0];
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    const msg = Array.isArray(val) ? val[0] : val;
    return `${firstKey}: ${msg}`;
  }
  return null;
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch (_) { return dateStr; }
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch (_) { return timeStr; }
}

function formatDateTime(dtStr) {
  if (!dtStr) return "—";
  try {
    return new Date(dtStr).toLocaleString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch (_) { return dtStr; }
}

function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}