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

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getInitials(firstName = "", lastName = "") {
    return `${lastName.charAt(0).toUpperCase()}${firstName.charAt(0).toUpperCase()}`;
  }

  function getGenderBadgeClass(gender) {
    if (gender === "Male")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (gender === "Female")
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
    return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
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

  // ── Filter population ─────────────────────────────────────────────────────
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

  // ── Render table ──────────────────────────────────────────────────────────
  function renderStudents(students) {
    if (!students.length) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">No student records found.</td>
        </tr>`;
      studentsSummary.innerHTML = `Showing <span class="font-semibold">0</span> students`;
      return;
    }

    studentsTableBody.innerHTML = students
      .map((student) => {
        const photoHtml = student.photo
          ? `<img src="${student.photo}" alt="${student.first_name} ${student.last_name}" class="size-10 rounded-full bg-slate-100 object-cover" />`
          : `<div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">${getInitials(student.first_name, student.last_name)}</div>`;

        return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              ${photoHtml}
              <div>
                <p class="font-bold text-slate-900 dark:text-slate-100">${student.last_name}, ${student.first_name}${student.middle_initial ? ` ${student.middle_initial}.` : ""}</p>
                <p class="text-xs text-slate-500">ID: ${student.student_number}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm">
              <p class="font-semibold text-slate-700 dark:text-slate-200">${student.college ?? "-"}</p>
              <p class="text-xs text-slate-500">${student.course ?? "-"}</p>
              <p class="text-xs text-slate-400 mt-1">${student.department ?? "-"}</p>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm">
              <p class="text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">phone</span>
                ${student.phone ?? "-"}
              </p>
              <p class="text-xs text-slate-500">${student.email ?? "-"}</p>
            </div>
          </td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGenderBadgeClass(student.gender)}">
              ${student.gender ?? "-"}
            </span>
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex justify-end gap-2">
              <button class="view-student-btn p-2 text-slate-400 hover:text-primary transition-colors" title="View" data-student-id="${student.id}">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button class="edit-student-btn p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Edit" data-student-id="${student.id}">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="delete-student-btn p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete" data-student-id="${student.id}">
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

  // ── View modal fill ───────────────────────────────────────────────────────
  function fillViewModal(student) {
    const fullName = `${student.last_name}, ${student.first_name}${student.middle_initial ? ` ${student.middle_initial}.` : ""}`;
    viewFullName.textContent = fullName;
    viewStudentNumber.textContent = `Student Number: ${student.student_number ?? "-"}`;
    viewFirstName.textContent = student.first_name ?? "-";
    viewLastName.textContent = student.last_name ?? "-";
    viewMiddleInitial.textContent = student.middle_initial ?? "-";
    viewGenderText.textContent = student.gender ?? "-";
    viewCollege.textContent = student.college ?? "-";
    viewDepartment.textContent = student.department ?? "-";
    viewCourse.textContent = student.course ?? "-";
    viewEmail.textContent = student.email ?? "-";
    viewPhone.textContent = student.phone ?? "-";

    viewGenderBadge.className = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getGenderBadgeClass(student.gender)}`;
    viewGenderBadge.textContent = student.gender ?? "-";

    if (student.photo) {
      viewStudentPhotoWrapper.innerHTML = `<img src="${student.photo}" alt="${student.first_name} ${student.last_name}" class="h-full w-full object-cover" />`;
    } else {
      viewStudentPhotoWrapper.textContent = getInitials(
        student.first_name,
        student.last_name,
      );
    }
  }

  // ── Edit modal fill ───────────────────────────────────────────────────────
  function fillEditModal(student) {
    editStudentId.value = student.id;
    editStudentNumber.value = student.student_number ?? "";
    editLastName.value = student.last_name ?? "";
    editFirstName.value = student.first_name ?? "";
    editMiddleInitial.value = student.middle_initial ?? "";
    editGender.value = student.gender ?? "";
    editCollege.value = student.college ?? "";
    editDepartment.value = student.department ?? "";
    editCourse.value = student.course ?? "";
    editEmail.value = student.email ?? "";
    editPhone.value = student.phone ?? "";
  }

  // ── Button bindings ───────────────────────────────────────────────────────
  function bindViewButtons() {
    document.querySelectorAll(".view-student-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.studentId);
        const student = allStudents.find((s) => s.id === id);
        if (!student) return;
        fillViewModal(student);
        openModal(viewStudentModal);
      });
    });
  }

  function bindEditButtons() {
    document.querySelectorAll(".edit-student-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.studentId);
        const student = allStudents.find((s) => s.id === id);
        if (!student) return;
        fillEditModal(student);
        openModal(editStudentModal);
        clearFormMessage(editStudentMessage);
      });
    });
  }

  function bindDeleteButtons() {
    document.querySelectorAll(".delete-student-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.studentId);
        const student = allStudents.find((s) => s.id === id);
        if (!student) return;
        const confirmed = confirm(
          `Delete student "${student.last_name}, ${student.first_name}"? This cannot be undone.`,
        );
        if (!confirmed) return;
        try {
          const response = await fetch(`${API_BASE_URL}/students/${id}/`, {
            method: "DELETE",
          });
          if (!response.ok)
            throw new Error(`Failed to delete. Status: ${response.status}`);
          await loadStudents();
        } catch (err) {
          console.error("Delete error:", err);
          alert("Failed to delete student. Please try again.");
        }
      });
    });
  }

  // ── Filter logic ──────────────────────────────────────────────────────────
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

  // ── API calls ─────────────────────────────────────────────────────────────
  async function loadStudents() {
    try {
      const response = await fetch(`${API_BASE_URL}/students/`);
      if (!response.ok)
        throw new Error(`Failed to fetch students: ${response.status}`);
      allStudents = await response.json();
      populateFilters(allStudents);
      renderStudents(allStudents);
    } catch (err) {
      console.error("Students error:", err);
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-10 text-center text-sm text-red-500">Failed to load students. Is the backend running?</td>
        </tr>`;
      studentsSummary.innerHTML = `Showing <span class="font-semibold">0</span> students`;
    }
  }

  async function submitAddStudent(event) {
    event.preventDefault();
    clearFormMessage(addStudentMessage);
    saveStudentButton.disabled = true;
    saveStudentButton.textContent = "Saving...";

    try {
      const formData = new FormData(addStudentForm);
      const response = await fetch(`${API_BASE_URL}/students/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let msg = `Failed to save student. Status: ${response.status}`;
        try {
          msg = JSON.stringify(await response.json());
        } catch {}
        throw new Error(msg);
      }

      showFormMessage(
        addStudentMessage,
        "Student added successfully.",
        "success",
      );
      await loadStudents();
      setTimeout(
        () => closeModal(addStudentModal, addStudentForm, addStudentMessage),
        800,
      );
    } catch (err) {
      console.error("Add student error:", err);
      showFormMessage(addStudentMessage, err.message, "error");
    } finally {
      saveStudentButton.disabled = false;
      saveStudentButton.textContent = "Save Student";
    }
  }

  async function submitEditStudent(event) {
    event.preventDefault();
    clearFormMessage(editStudentMessage);
    updateStudentButton.disabled = true;
    updateStudentButton.textContent = "Updating...";

    try {
      const id = editStudentId.value;
      const formData = new FormData(editStudentForm);

      // Don't send photo field if no new file was chosen
      if (!editPhoto.files.length) formData.delete("photo");

      const response = await fetch(`${API_BASE_URL}/students/${id}/`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        let msg = `Failed to update student. Status: ${response.status}`;
        try {
          msg = JSON.stringify(await response.json());
        } catch {}
        throw new Error(msg);
      }

      showFormMessage(
        editStudentMessage,
        "Student updated successfully.",
        "success",
      );
      await loadStudents();
      setTimeout(
        () => closeModal(editStudentModal, editStudentForm, editStudentMessage),
        800,
      );
    } catch (err) {
      console.error("Edit student error:", err);
      showFormMessage(editStudentMessage, err.message, "error");
    } finally {
      updateStudentButton.disabled = false;
      updateStudentButton.textContent = "Update Student";
    }
  }

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

  openAddStudentModal.addEventListener("click", () => {
    clearFormMessage(addStudentMessage);
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

  closeViewStudentModal.addEventListener("click", () =>
    closeModal(viewStudentModal),
  );
  viewStudentDoneButton.addEventListener("click", () =>
    closeModal(viewStudentModal),
  );
  viewStudentModal.addEventListener("click", (e) => {
    if (e.target === viewStudentModal) closeModal(viewStudentModal);
  });

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

  addStudentForm.addEventListener("submit", submitAddStudent);
  editStudentForm.addEventListener("submit", submitEditStudent);

  // ── Init ──────────────────────────────────────────────────────────────────
  loadStudents();
});
