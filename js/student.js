const API_BASE_URL = "http://127.0.0.1:8000/api";

let allStudents = [];

document.addEventListener("DOMContentLoaded", () => {
  // ── DOM refs ──────────────────────────────────────────────────────────────
  const studentsTableBody = document.getElementById("studentsTableBody");
  const studentsSummary = document.getElementById("studentsSummary");
  const studentSearch = document.getElementById("studentSearch");
  const collegeFilter = document.getElementById("collegeFilter");
  const departmentFilter = document.getElementById("departmentFilter");
  const genderFilter = document.getElementById("genderFilter");
  const resetFilters = document.getElementById("resetFilters");

  // Add modal
  const openAddStudentModal = document.getElementById("openAddStudentModal");
  const addStudentModal = document.getElementById("addStudentModal");
  const closeAddStudentModal = document.getElementById("closeAddStudentModal");
  const cancelAddStudent = document.getElementById("cancelAddStudent");
  const addStudentForm = document.getElementById("addStudentForm");
  const addStudentMessage = document.getElementById("addStudentMessage");
  const saveStudentButton = document.getElementById("saveStudentButton");

  // View modal
  const viewStudentModal = document.getElementById("viewStudentModal");
  const closeViewStudentModal = document.getElementById(
    "closeViewStudentModal",
  );
  const viewStudentDoneButton = document.getElementById(
    "viewStudentDoneButton",
  );
  const viewStudentPhotoWrapper = document.getElementById(
    "viewStudentPhotoWrapper",
  );
  const viewFullName = document.getElementById("viewFullName");
  const viewStudentNumber = document.getElementById("viewStudentNumber");
  const viewGenderBadge = document.getElementById("viewGenderBadge");
  const viewFirstName = document.getElementById("viewFirstName");
  const viewLastName = document.getElementById("viewLastName");
  const viewMiddleInitial = document.getElementById("viewMiddleInitial");
  const viewGenderText = document.getElementById("viewGenderText");
  const viewCollege = document.getElementById("viewCollege");
  const viewDepartment = document.getElementById("viewDepartment");
  const viewCourse = document.getElementById("viewCourse");
  const viewEmail = document.getElementById("viewEmail");
  const viewPhone = document.getElementById("viewPhone");

  // Edit modal
  const editStudentModal = document.getElementById("editStudentModal");
  const closeEditStudentModal = document.getElementById(
    "closeEditStudentModal",
  );
  const cancelEditStudent = document.getElementById("cancelEditStudent");
  const editStudentForm = document.getElementById("editStudentForm");
  const editStudentMessage = document.getElementById("editStudentMessage");
  const updateStudentButton = document.getElementById("updateStudentButton");
  const editStudentId = document.getElementById("edit_student_id");
  const editStudentNumber = document.getElementById("edit_student_number");
  const editLastName = document.getElementById("edit_last_name");
  const editFirstName = document.getElementById("edit_first_name");
  const editMiddleInitial = document.getElementById("edit_middle_initial");
  const editGender = document.getElementById("edit_gender");
  const editCollege = document.getElementById("edit_college");
  const editDepartment = document.getElementById("edit_department");
  const editCourse = document.getElementById("edit_course");
  const editEmail = document.getElementById("edit_email");
  const editPhone = document.getElementById("edit_phone");
  const editPhoto = document.getElementById("edit_photo");

  // Delete modal
  const deleteStudentModal = document.getElementById("deleteStudentModal");
  const cancelDeleteStudent = document.getElementById("cancelDeleteStudent");
  const confirmDeleteStudentButton = document.getElementById(
    "confirmDeleteStudent",
  );
  const deleteStudentId = document.getElementById("delete_student_id");
  const deleteStudentName = document.getElementById("deleteStudentName");

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getInitials(firstName = "", lastName = "") {
    return `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
  }

  function getGenderBadgeClass(gender) {
    if (gender === "Male")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (gender === "Female")
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
    return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  }

  /**
   * Parse a DRF error response body into a human-readable string.
   * DRF can return:
   *   { "field": ["msg"] }
   *   { "detail": "msg" }
   *   { "non_field_errors": ["msg"] }
   */
  function parseDRFError(data) {
    if (!data || typeof data !== "object") return null;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.non_field_errors))
      return data.non_field_errors.join(" ");

    // Field-level errors — collect them all
    const lines = [];
    for (const [field, value] of Object.entries(data)) {
      const msg = Array.isArray(value) ? value.join(" ") : String(value);
      lines.push(`${field}: ${msg}`);
    }
    return lines.join("\n") || null;
  }

  function showMessage(container, message, isError = false) {
    container.classList.remove("hidden");
    container.textContent = message;
    container.className = `rounded-lg px-4 py-3 text-sm border ${
      isError
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-emerald-100 text-emerald-700 border-emerald-200"
    }`;
  }

  function clearMessage(container) {
    container.classList.add("hidden");
    container.textContent = "";
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal(modal, form = null, msg = null) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
    if (form) form.reset();
    if (msg) clearMessage(msg);
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  function populateFilters(students) {
    const colleges = [
      ...new Set(students.map((s) => s.college).filter(Boolean)),
    ].sort();
    const departments = [
      ...new Set(students.map((s) => s.department).filter(Boolean)),
    ].sort();

    collegeFilter.innerHTML = `<option value="">All Colleges</option>`;
    departmentFilter.innerHTML = `<option value="">All Departments</option>`;
    colleges.forEach((c) => {
      collegeFilter.innerHTML += `<option value="${c}">${c}</option>`;
    });
    departments.forEach((d) => {
      departmentFilter.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }

  function applyFilters() {
    const search = studentSearch.value.trim().toLowerCase();
    const college = collegeFilter.value;
    const department = departmentFilter.value;
    const gender = genderFilter.value;

    const filtered = allStudents.filter((s) => {
      const fullName =
        `${s.last_name} ${s.first_name} ${s.middle_initial ?? ""}`.toLowerCase();
      const num = (s.student_number ?? "").toLowerCase();

      return (
        (!search || fullName.includes(search) || num.includes(search)) &&
        (!college || s.college === college) &&
        (!department || s.department === department) &&
        (!gender || s.gender === gender)
      );
    });

    renderStudents(filtered);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderStudents(students) {
    if (!students.length) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">No students found.</td>
        </tr>`;
      studentsSummary.innerHTML = `Showing <span class="font-semibold">0</span> students`;
      return;
    }

    studentsTableBody.innerHTML = students
      .map((s) => {
        const initials = getInitials(s.first_name, s.last_name);
        const photoHtml = s.photo
          ? `<img src="${s.photo}" alt="${s.first_name}" class="size-10 rounded-full object-cover" />`
          : `<div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">${initials}</div>`;

        return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              ${photoHtml}
              <div>
                <p class="font-bold text-slate-900 dark:text-slate-100">${s.last_name}, ${s.first_name}${s.middle_initial ? ` ${s.middle_initial}.` : ""}</p>
                <p class="text-xs text-slate-500">ID: ${s.student_number}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4">
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">${s.college ?? "—"}</p>
            <p class="text-xs text-slate-500">${s.course ?? "—"}</p>
            <p class="text-xs text-slate-400 mt-0.5">${s.department ?? "—"}</p>
          </td>
          <td class="px-6 py-4">
            <p class="text-sm text-slate-700 dark:text-slate-200">${s.phone ?? "—"}</p>
            <p class="text-xs text-slate-500">${s.email ?? "—"}</p>
          </td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGenderBadgeClass(s.gender)}">
              ${s.gender ?? "—"}
            </span>
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex justify-end gap-2">
              <button class="view-student-btn p-2 text-slate-400 hover:text-primary transition-colors" title="View" data-id="${s.id}">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button class="edit-student-btn p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Edit" data-id="${s.id}">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="delete-student-btn p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete" data-id="${s.id}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    studentsSummary.innerHTML = `Showing <span class="font-semibold">${students.length}</span> student${students.length !== 1 ? "s" : ""}`;

    bindViewButtons();
    bindEditButtons();
    bindDeleteButtons();
  }

  // ── View modal ────────────────────────────────────────────────────────────
  function fillViewModal(s) {
    const fullName = `${s.last_name}, ${s.first_name}${s.middle_initial ? ` ${s.middle_initial}.` : ""}`;
    viewFullName.textContent = fullName;
    viewStudentNumber.textContent = `Student Number: ${s.student_number ?? "—"}`;
    viewFirstName.textContent = s.first_name ?? "—";
    viewLastName.textContent = s.last_name ?? "—";
    viewMiddleInitial.textContent = s.middle_initial ?? "—";
    viewGenderText.textContent = s.gender ?? "—";
    viewCollege.textContent = s.college ?? "—";
    viewDepartment.textContent = s.department ?? "—";
    viewCourse.textContent = s.course ?? "—";
    viewEmail.textContent = s.email ?? "—";
    viewPhone.textContent = s.phone ?? "—";

    viewGenderBadge.className = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getGenderBadgeClass(s.gender)}`;
    viewGenderBadge.textContent = s.gender ?? "—";

    if (s.photo) {
      viewStudentPhotoWrapper.innerHTML = `<img src="${s.photo}" class="h-full w-full object-cover" />`;
    } else {
      viewStudentPhotoWrapper.textContent = getInitials(
        s.first_name,
        s.last_name,
      );
    }
  }

  function bindViewButtons() {
    document.querySelectorAll(".view-student-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = allStudents.find((x) => x.id === Number(btn.dataset.id));
        if (!s) return;
        fillViewModal(s);
        openModal(viewStudentModal);
      });
    });
  }

  // ── Edit modal ────────────────────────────────────────────────────────────
  function fillEditModal(s) {
    editStudentId.value = s.id;
    editStudentNumber.value = s.student_number ?? "";
    editLastName.value = s.last_name ?? "";
    editFirstName.value = s.first_name ?? "";
    editMiddleInitial.value = s.middle_initial ?? "";
    editGender.value = s.gender ?? "";
    editCollege.value = s.college ?? "";
    editDepartment.value = s.department ?? "";
    editCourse.value = s.course ?? "";
    editEmail.value = s.email ?? "";
    editPhone.value = s.phone ?? "";
  }

  function bindEditButtons() {
    document.querySelectorAll(".edit-student-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = allStudents.find((x) => x.id === Number(btn.dataset.id));
        if (!s) return;
        fillEditModal(s);
        clearMessage(editStudentMessage);
        openModal(editStudentModal);
      });
    });
  }

  // ── Delete modal ──────────────────────────────────────────────────────────
  function bindDeleteButtons() {
    document.querySelectorAll(".delete-student-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = allStudents.find((x) => x.id === Number(btn.dataset.id));
        if (!s) return;
        deleteStudentId.value = s.id;
        deleteStudentName.textContent = `${s.last_name}, ${s.first_name}`;
        openModal(deleteStudentModal);
      });
    });
  }

  // ── Load students ─────────────────────────────────────────────────────────
  async function loadStudents() {
    try {
      const res = await fetch(`${API_BASE_URL}/students/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allStudents = await res.json();
      allStudents = Array.isArray(allStudents) ? allStudents : [];
      populateFilters(allStudents);
      renderStudents(allStudents);
    } catch (err) {
      console.error("Load students error:", err);
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-10 text-center text-sm text-red-500">
            Failed to load students. Is the backend running?
          </td>
        </tr>`;
    }
  }

  // ── ADD ───────────────────────────────────────────────────────────────────
  addStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage(addStudentMessage);
    saveStudentButton.disabled = true;
    saveStudentButton.textContent = "Saving…";

    try {
      const res = await fetch(`${API_BASE_URL}/students/`, {
        method: "POST",
        body: new FormData(addStudentForm),
      });

      // ← Always read the body so we can show the real error
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* no body */
      }

      if (!res.ok) {
        const msg = parseDRFError(data) ?? `Server error (${res.status})`;
        throw new Error(msg);
      }

      showMessage(addStudentMessage, "Student added successfully!");
      await loadStudents();
      setTimeout(
        () => closeModal(addStudentModal, addStudentForm, addStudentMessage),
        900,
      );
    } catch (err) {
      console.error("Add student error:", err);
      showMessage(addStudentMessage, err.message, true);
    } finally {
      saveStudentButton.disabled = false;
      saveStudentButton.textContent = "Save Student";
    }
  });

  // ── EDIT ──────────────────────────────────────────────────────────────────
  editStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage(editStudentMessage);
    updateStudentButton.disabled = true;
    updateStudentButton.textContent = "Updating…";

    try {
      const id = editStudentId.value;
      const formData = new FormData(editStudentForm);

      // Don't send photo if no new file was chosen — avoids wiping the existing one
      if (!editPhoto || !editPhoto.files.length) formData.delete("photo");

      // Use PATCH (partial update) instead of PUT — PUT requires ALL fields
      const res = await fetch(`${API_BASE_URL}/students/${id}/`, {
        method: "PATCH",
        body: formData,
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        /* no body */
      }

      if (!res.ok) {
        const msg = parseDRFError(data) ?? `Server error (${res.status})`;
        throw new Error(msg);
      }

      showMessage(editStudentMessage, "Student updated successfully!");
      await loadStudents();
      setTimeout(
        () => closeModal(editStudentModal, editStudentForm, editStudentMessage),
        900,
      );
    } catch (err) {
      console.error("Edit student error:", err);
      showMessage(editStudentMessage, err.message, true);
    } finally {
      updateStudentButton.disabled = false;
      updateStudentButton.textContent = "Update Student";
    }
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  confirmDeleteStudentButton.addEventListener("click", async () => {
    const id = deleteStudentId.value;
    confirmDeleteStudentButton.disabled = true;
    confirmDeleteStudentButton.textContent = "Deleting…";

    try {
      const res = await fetch(`${API_BASE_URL}/students/${id}/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      closeModal(deleteStudentModal);
      await loadStudents();
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Failed to delete student: ${err.message}`);
    } finally {
      confirmDeleteStudentButton.disabled = false;
      confirmDeleteStudentButton.textContent = "Delete";
    }
  });

  // ── Event listeners ───────────────────────────────────────────────────────
  studentSearch.addEventListener("input", applyFilters);
  collegeFilter.addEventListener("change", applyFilters);
  departmentFilter.addEventListener("change", applyFilters);
  genderFilter.addEventListener("change", applyFilters);

  resetFilters.addEventListener("click", () => {
    studentSearch.value = "";
    collegeFilter.value = "";
    departmentFilter.value = "";
    genderFilter.value = "";
    renderStudents(allStudents);
  });

  // Add modal
  openAddStudentModal.addEventListener("click", () => {
    clearMessage(addStudentMessage);
    openModal(addStudentModal);
  });
  closeAddStudentModal.addEventListener("click", () =>
    closeModal(addStudentModal, addStudentForm, addStudentMessage),
  );
  cancelAddStudent.addEventListener("click", () =>
    closeModal(addStudentModal, addStudentForm, addStudentMessage),
  );
  addStudentModal.addEventListener("click", (e) => {
    if (e.target === addStudentModal)
      closeModal(addStudentModal, addStudentForm, addStudentMessage);
  });

  // View modal
  closeViewStudentModal.addEventListener("click", () =>
    closeModal(viewStudentModal),
  );
  viewStudentDoneButton.addEventListener("click", () =>
    closeModal(viewStudentModal),
  );
  viewStudentModal.addEventListener("click", (e) => {
    if (e.target === viewStudentModal) closeModal(viewStudentModal);
  });

  // Edit modal
  closeEditStudentModal.addEventListener("click", () =>
    closeModal(editStudentModal, editStudentForm, editStudentMessage),
  );
  cancelEditStudent.addEventListener("click", () =>
    closeModal(editStudentModal, editStudentForm, editStudentMessage),
  );
  editStudentModal.addEventListener("click", (e) => {
    if (e.target === editStudentModal)
      closeModal(editStudentModal, editStudentForm, editStudentMessage);
  });

  // Delete modal
  cancelDeleteStudent.addEventListener("click", () =>
    closeModal(deleteStudentModal),
  );
  deleteStudentModal.addEventListener("click", (e) => {
    if (e.target === deleteStudentModal) closeModal(deleteStudentModal);
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadStudents();
});
