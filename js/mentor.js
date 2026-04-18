const API_BASE_URL = "http://127.0.0.1:8000/api";

let allMentors = [];

document.addEventListener("DOMContentLoaded", () => {
  // ── DOM refs ──────────────────────────────────────────────────────────────
  const mentorsTableBody = document.getElementById("mentorsTableBody");
  const mentorsSummary = document.getElementById("mentorsSummary");
  const mentorSearch = document.getElementById("mentorSearch");
  const departmentFilter = document.getElementById("departmentFilter");
  const expertiseFilter = document.getElementById("expertiseFilter");
  const resetFiltersBtn = document.getElementById("resetFilters");

  // Add modal
  const openAddMentorModal = document.getElementById("openAddMentorModal");
  const addMentorModal = document.getElementById("addMentorModal");
  const closeAddMentorModal = document.getElementById("closeAddMentorModal");
  const cancelAddMentor = document.getElementById("cancelAddMentor");
  const addMentorForm = document.getElementById("addMentorForm");
  const addMentorMessage = document.getElementById("addMentorMessage");
  const saveMentorButton = document.getElementById("saveMentorButton");

  // View modal
  const viewMentorModal = document.getElementById("viewMentorModal");
  const closeViewMentorModal = document.getElementById("closeViewMentorModal");
  const viewMentorDoneButton = document.getElementById("viewMentorDoneButton");
  const viewMentorPhotoWrapper = document.getElementById(
    "viewMentorPhotoWrapper",
  );
  const viewMentorFullName = document.getElementById("viewMentorFullName");
  const viewMentorNumber = document.getElementById("viewMentorNumber");
  const viewMentorFirstName = document.getElementById("viewMentorFirstName");
  const viewMentorLastName = document.getElementById("viewMentorLastName");
  const viewMentorMiddleInitial = document.getElementById(
    "viewMentorMiddleInitial",
  );
  const viewMentorDepartment = document.getElementById("viewMentorDepartment");
  const viewMentorEmail = document.getElementById("viewMentorEmail");
  const viewMentorPhone = document.getElementById("viewMentorPhone");
  const viewMentorExpertise = document.getElementById("viewMentorExpertise");

  // Edit modal
  const editMentorModal = document.getElementById("editMentorModal");
  const closeEditMentorModal = document.getElementById("closeEditMentorModal");
  const cancelEditMentor = document.getElementById("cancelEditMentor");
  const editMentorForm = document.getElementById("editMentorForm");
  const editMentorMessage = document.getElementById("editMentorMessage");
  const updateMentorButton = document.getElementById("updateMentorButton");
  const editMentorId = document.getElementById("edit_mentor_id");
  const editMentorNumber = document.getElementById("edit_mentor_number");
  const editLastName = document.getElementById("edit_last_name");
  const editFirstName = document.getElementById("edit_first_name");
  const editMiddleInitial = document.getElementById("edit_middle_initial");
  const editDepartment = document.getElementById("edit_department");
  const editEmail = document.getElementById("edit_email");
  const editPhone = document.getElementById("edit_phone");
  const editPhoto = document.getElementById("edit_photo");

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getInitials(firstName = "", lastName = "") {
    return `${lastName.charAt(0).toUpperCase()}${firstName.charAt(0).toUpperCase()}`;
  }

  function getExpertiseNames(mentor) {
    if (!Array.isArray(mentor.expertise)) return [];
    return mentor.expertise.map((e) => (typeof e === "object" ? e.name : e));
  }

  function showFormMessage(container, message, type = "success") {
    container.className = "rounded-lg px-4 py-3 text-sm border";
    container.classList.remove("hidden");
    if (type === "error") {
      container.classList.add("bg-red-100", "text-red-700", "border-red-200");
    } else {
      container.classList.add(
        "bg-emerald-100",
        "text-emerald-700",
        "border-emerald-200",
      );
    }
    container.textContent = message;
  }

  function clearFormMessage(container) {
    container.classList.add("hidden");
    container.textContent = "";
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openModal(modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal(modal, form = null, msgEl = null) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
    if (form) form.reset();
    if (msgEl) clearFormMessage(msgEl);
  }

  // ── Expertise chip widget ─────────────────────────────────────────────────
  // Works for both Add and Edit forms.
  // Each widget is identified by a suffix: "Add" or "Edit"
  const chipState = { Add: [], Edit: [] };

  function renderChips(suffix) {
    const container = document.getElementById(`expertiseChips${suffix}`);
    const hidden = document.getElementById(`expertiseHidden${suffix}`);
    container.innerHTML = chipState[suffix]
      .map(
        (name, i) => `
      <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
        ${name}
        <button type="button" class="remove-chip ml-1 text-primary/60 hover:text-red-500 transition-colors" data-index="${i}" data-suffix="${suffix}">
          <span class="material-symbols-outlined text-xs" style="font-size:14px">close</span>
        </button>
      </span>`,
      )
      .join("");
    hidden.value = chipState[suffix].join(",");

    // Bind remove buttons
    container.querySelectorAll(".remove-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        chipState[btn.dataset.suffix].splice(idx, 1);
        renderChips(btn.dataset.suffix);
      });
    });
  }

  function addChip(suffix, value) {
    const trimmed = value.trim().replace(/,$/, "");
    if (!trimmed || chipState[suffix].includes(trimmed)) return;
    chipState[suffix].push(trimmed);
    renderChips(suffix);
  }

  function initChipInput(suffix) {
    const input = document.getElementById(`expertiseInput${suffix}`);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addChip(suffix, input.value);
        input.value = "";
      }
    });
    input.addEventListener("blur", () => {
      if (input.value.trim()) {
        addChip(suffix, input.value);
        input.value = "";
      }
    });
  }

  function clearChips(suffix) {
    chipState[suffix] = [];
    renderChips(suffix);
    document.getElementById(`expertiseInput${suffix}`).value = "";
  }

  function setChips(suffix, names) {
    chipState[suffix] = [...names];
    renderChips(suffix);
  }

  initChipInput("Add");
  initChipInput("Edit");

  // ── Filter population ─────────────────────────────────────────────────────
  function populateFilters(mentors) {
    const departments = [
      ...new Set(mentors.map((m) => m.department).filter(Boolean)),
    ].sort();
    const expertiseSet = new Set();
    mentors.forEach((m) =>
      getExpertiseNames(m).forEach((n) => expertiseSet.add(n)),
    );
    const expertiseList = [...expertiseSet].sort();

    departmentFilter.innerHTML = `<option value="">All Departments</option>`;
    expertiseFilter.innerHTML = `<option value="">All Expertise</option>`;

    departments.forEach((d) => {
      departmentFilter.innerHTML += `<option value="${d}">${d}</option>`;
    });
    expertiseList.forEach((e) => {
      expertiseFilter.innerHTML += `<option value="${e}">${e}</option>`;
    });
  }

  // ── Render table ──────────────────────────────────────────────────────────
  function renderMentors(mentors) {
    if (!mentors.length) {
      mentorsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">No mentor records found.</td>
        </tr>`;
      mentorsSummary.innerHTML = `Showing <span class="font-semibold">0</span> mentors`;
      return;
    }

    mentorsTableBody.innerHTML = mentors
      .map((mentor) => {
        const names = getExpertiseNames(mentor);
        const initials = getInitials(mentor.first_name, mentor.last_name);
        const photoHtml = mentor.photo
          ? `<img src="${mentor.photo}" alt="${mentor.first_name} ${mentor.last_name}" class="size-10 rounded-full object-cover" />`
          : `<div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">${initials}</div>`;

        const expertisePills = names.length
          ? names
              .slice(0, 3)
              .map(
                (n) =>
                  `<span class="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">${n}</span>`,
              )
              .join("") +
            (names.length > 3
              ? `<span class="text-[10px] text-slate-400">+${names.length - 3}</span>`
              : "")
          : `<span class="text-xs text-slate-400">—</span>`;

        return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              ${photoHtml}
              <div>
                <p class="font-bold text-slate-900 dark:text-slate-100">${mentor.last_name}, ${mentor.first_name}${mentor.middle_initial ? ` ${mentor.middle_initial}.` : ""}</p>
                <p class="text-xs text-slate-500">Mentor No: ${mentor.mentor_number}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">${mentor.department ?? "—"}</td>
          <td class="px-6 py-4">
            <div class="flex flex-wrap gap-1">${expertisePills}</div>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm">
              <p class="text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">phone</span>
                ${mentor.phone ?? "—"}
              </p>
              <p class="text-xs text-slate-500">${mentor.email ?? "—"}</p>
            </div>
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex justify-end gap-2">
              <button class="view-mentor-btn p-2 text-slate-400 hover:text-primary transition-colors" title="View" data-mentor-id="${mentor.id}">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button class="edit-mentor-btn p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Edit" data-mentor-id="${mentor.id}">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="delete-mentor-btn p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete" data-mentor-id="${mentor.id}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    mentorsSummary.innerHTML = `Showing <span class="font-semibold">${mentors.length}</span> mentor${mentors.length !== 1 ? "s" : ""}`;

    bindViewButtons();
    bindEditButtons();
    bindDeleteButtons();
  }

  // ── View modal fill ───────────────────────────────────────────────────────
  function fillViewModal(mentor) {
    const fullName = `${mentor.last_name}, ${mentor.first_name}${mentor.middle_initial ? ` ${mentor.middle_initial}.` : ""}`;
    const names = getExpertiseNames(mentor);

    viewMentorFullName.textContent = fullName;
    viewMentorNumber.textContent = `Mentor Number: ${mentor.mentor_number ?? "—"}`;
    viewMentorFirstName.textContent = mentor.first_name ?? "—";
    viewMentorLastName.textContent = mentor.last_name ?? "—";
    viewMentorMiddleInitial.textContent = mentor.middle_initial ?? "—";
    viewMentorDepartment.textContent = mentor.department ?? "—";
    viewMentorEmail.textContent = mentor.email ?? "—";
    viewMentorPhone.textContent = mentor.phone ?? "—";

    viewMentorExpertise.innerHTML = names.length
      ? names
          .map(
            (n) =>
              `<span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">${n}</span>`,
          )
          .join("")
      : `<span class="text-xs text-slate-400">No expertise listed</span>`;

    if (mentor.photo) {
      viewMentorPhotoWrapper.innerHTML = `<img src="${mentor.photo}" alt="${mentor.first_name} ${mentor.last_name}" class="h-full w-full object-cover" />`;
    } else {
      viewMentorPhotoWrapper.textContent = getInitials(
        mentor.first_name,
        mentor.last_name,
      );
    }
  }

  // ── Edit modal fill ───────────────────────────────────────────────────────
  function fillEditModal(mentor) {
    editMentorId.value = mentor.id;
    editMentorNumber.value = mentor.mentor_number ?? "";
    editLastName.value = mentor.last_name ?? "";
    editFirstName.value = mentor.first_name ?? "";
    editMiddleInitial.value = mentor.middle_initial ?? "";
    editDepartment.value = mentor.department ?? "";
    editEmail.value = mentor.email ?? "";
    editPhone.value = mentor.phone ?? "";
    setChips("Edit", getExpertiseNames(mentor));
  }

  // ── Button bindings ───────────────────────────────────────────────────────
  function bindViewButtons() {
    document.querySelectorAll(".view-mentor-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mentor = allMentors.find(
          (m) => m.id === Number(btn.dataset.mentorId),
        );
        if (!mentor) return;
        fillViewModal(mentor);
        openModal(viewMentorModal);
      });
    });
  }

  function bindEditButtons() {
    document.querySelectorAll(".edit-mentor-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mentor = allMentors.find(
          (m) => m.id === Number(btn.dataset.mentorId),
        );
        if (!mentor) return;
        fillEditModal(mentor);
        clearFormMessage(editMentorMessage);
        openModal(editMentorModal);
      });
    });
  }

  function bindDeleteButtons() {
    document.querySelectorAll(".delete-mentor-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.mentorId);
        const mentor = allMentors.find((m) => m.id === id);
        if (!mentor) return;
        const confirmed = confirm(
          `Delete mentor "${mentor.last_name}, ${mentor.first_name}"? This cannot be undone.`,
        );
        if (!confirmed) return;
        try {
          const res = await fetch(`${API_BASE_URL}/mentors/${id}/`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          await loadMentors();
        } catch (err) {
          console.error("Delete error:", err);
          alert("Failed to delete mentor. Please try again.");
        }
      });
    });
  }

  // ── Filter logic ──────────────────────────────────────────────────────────
  function applyFilters() {
    const search = mentorSearch.value.trim().toLowerCase();
    const department = departmentFilter.value;
    const expertise = expertiseFilter.value;

    const filtered = allMentors.filter((m) => {
      const fullName =
        `${m.last_name} ${m.first_name} ${m.middle_initial ?? ""}`.toLowerCase();
      const num = (m.mentor_number ?? "").toLowerCase();
      const dept = (m.department ?? "").toLowerCase();
      const names = getExpertiseNames(m).map((n) => n.toLowerCase());

      const matchSearch =
        !search ||
        fullName.includes(search) ||
        num.includes(search) ||
        dept.includes(search) ||
        names.some((n) => n.includes(search));

      const matchDept = !department || m.department === department;
      const matchExpertise =
        !expertise || getExpertiseNames(m).includes(expertise);

      return matchSearch && matchDept && matchExpertise;
    });

    renderMentors(filtered);
  }

  // ── API calls ─────────────────────────────────────────────────────────────
  async function loadMentors() {
    try {
      const res = await fetch(`${API_BASE_URL}/mentors/`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      allMentors = await res.json();
      allMentors = Array.isArray(allMentors) ? allMentors : [];
      populateFilters(allMentors);
      renderMentors(allMentors);
    } catch (err) {
      console.error("Mentors load error:", err);
      mentorsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-10 text-center text-sm text-red-500">Failed to load mentors. Is the backend running?</td>
        </tr>`;
      mentorsSummary.innerHTML = `Showing <span class="font-semibold">0</span> mentors`;
    }
  }

  // Build FormData, appending expertise names as comma-separated string
  function buildFormData(form, expertiseSuffix) {
    const fd = new FormData(form);
    const names = chipState[expertiseSuffix].join(",");
    fd.set("expertise_names", names);
    return fd;
  }

  async function submitAddMentor(event) {
    event.preventDefault();
    clearFormMessage(addMentorMessage);
    saveMentorButton.disabled = true;
    saveMentorButton.textContent = "Saving…";

    try {
      const formData = buildFormData(addMentorForm, "Add");
      const res = await fetch(`${API_BASE_URL}/mentors/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = `Failed to save mentor. Status: ${res.status}`;
        try {
          msg = JSON.stringify(await res.json());
        } catch {}
        throw new Error(msg);
      }

      showFormMessage(
        addMentorMessage,
        "Mentor added successfully.",
        "success",
      );
      await loadMentors();
      setTimeout(() => {
        closeModal(addMentorModal, addMentorForm, addMentorMessage);
        clearChips("Add");
      }, 800);
    } catch (err) {
      console.error("Add mentor error:", err);
      showFormMessage(addMentorMessage, err.message, "error");
    } finally {
      saveMentorButton.disabled = false;
      saveMentorButton.textContent = "Save Mentor";
    }
  }

  async function submitEditMentor(event) {
    event.preventDefault();
    clearFormMessage(editMentorMessage);
    updateMentorButton.disabled = true;
    updateMentorButton.textContent = "Updating…";

    try {
      const id = editMentorId.value;
      const formData = buildFormData(editMentorForm, "Edit");

      // Don't send photo if no new file was chosen
      if (!editPhoto.files.length) formData.delete("photo");

      const res = await fetch(`${API_BASE_URL}/mentors/${id}/`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        let msg = `Failed to update mentor. Status: ${res.status}`;
        try {
          msg = JSON.stringify(await res.json());
        } catch {}
        throw new Error(msg);
      }

      showFormMessage(
        editMentorMessage,
        "Mentor updated successfully.",
        "success",
      );
      await loadMentors();
      setTimeout(() => {
        closeModal(editMentorModal, editMentorForm, editMentorMessage);
        clearChips("Edit");
      }, 800);
    } catch (err) {
      console.error("Edit mentor error:", err);
      showFormMessage(editMentorMessage, err.message, "error");
    } finally {
      updateMentorButton.disabled = false;
      updateMentorButton.textContent = "Update Mentor";
    }
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  mentorSearch.addEventListener("input", applyFilters);
  departmentFilter.addEventListener("change", applyFilters);
  expertiseFilter.addEventListener("change", applyFilters);

  resetFiltersBtn.addEventListener("click", () => {
    mentorSearch.value = "";
    departmentFilter.value = "";
    expertiseFilter.value = "";
    renderMentors(allMentors);
  });

  // Add modal
  openAddMentorModal.addEventListener("click", () => {
    clearFormMessage(addMentorMessage);
    clearChips("Add");
    openModal(addMentorModal);
  });
  closeAddMentorModal.addEventListener("click", () => {
    closeModal(addMentorModal, addMentorForm, addMentorMessage);
    clearChips("Add");
  });
  cancelAddMentor.addEventListener("click", () => {
    closeModal(addMentorModal, addMentorForm, addMentorMessage);
    clearChips("Add");
  });
  addMentorModal.addEventListener("click", (e) => {
    if (e.target === addMentorModal) {
      closeModal(addMentorModal, addMentorForm, addMentorMessage);
      clearChips("Add");
    }
  });

  // View modal
  closeViewMentorModal.addEventListener("click", () =>
    closeModal(viewMentorModal),
  );
  viewMentorDoneButton.addEventListener("click", () =>
    closeModal(viewMentorModal),
  );
  viewMentorModal.addEventListener("click", (e) => {
    if (e.target === viewMentorModal) closeModal(viewMentorModal);
  });

  // Edit modal
  closeEditMentorModal.addEventListener("click", () => {
    closeModal(editMentorModal, editMentorForm, editMentorMessage);
    clearChips("Edit");
  });
  cancelEditMentor.addEventListener("click", () => {
    closeModal(editMentorModal, editMentorForm, editMentorMessage);
    clearChips("Edit");
  });
  editMentorModal.addEventListener("click", (e) => {
    if (e.target === editMentorModal) {
      closeModal(editMentorModal, editMentorForm, editMentorMessage);
      clearChips("Edit");
    }
  });

  // Forms
  addMentorForm.addEventListener("submit", submitAddMentor);
  editMentorForm.addEventListener("submit", submitEditMentor);

  // ── Populate nav from session ─────────────────────────────────────────────
  const adminName = sessionStorage.getItem("mm_name") ?? "Admin";
  const navName = document.getElementById("navAdminName");
  const navAvatar = document.getElementById("navAdminAvatar");
  if (navName) navName.textContent = adminName;
  if (navAvatar) navAvatar.textContent = adminName.charAt(0).toUpperCase();

  // ── Init ──────────────────────────────────────────────────────────────────
  loadMentors();
});
