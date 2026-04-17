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
  const closeDeleteStudentModal = document.getElementById(
    "closeDeleteStudentModal",
  );
  const cancelDeleteStudent = document.getElementById("cancelDeleteStudent");
  const confirmDeleteStudentButton = document.getElementById(
    "confirmDeleteStudentButton",
  );
  const deleteStudentId = document.getElementById("delete_student_id");
  const deleteStudentName = document.getElementById("deleteStudentName");

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

  // ── Render ────────────────────────────────────────────────────────────────
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
          ? `<img src="${student.photo}" class="size-10 rounded-full object-cover"/>`
          : `<div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">${getInitials(student.first_name, student.last_name)}</div>`;

        return `
      <tr>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            ${photoHtml}
            <div>
              <p class="font-bold">${student.last_name}, ${student.first_name}</p>
              <p class="text-xs">ID: ${student.student_number}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <p>${student.college ?? "-"}</p>
          <p class="text-xs">${student.course ?? "-"}</p>
        </td>
        <td class="px-6 py-4">
          <p>${student.phone ?? "-"}</p>
          <p class="text-xs">${student.email ?? "-"}</p>
        </td>
        <td class="px-6 py-4">
          <span class="${getGenderBadgeClass(student.gender)} px-2 py-1 rounded text-xs">
            ${student.gender ?? "-"}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <button class="view-student-btn" data-student-id="${student.id}">View</button>
          <button class="edit-student-btn" data-student-id="${student.id}">Edit</button>
          <button class="delete-student-btn" data-student-id="${student.id}">Delete</button>
        </td>
      </tr>`;
      })
      .join("");

    bindViewButtons();
    bindEditButtons();
    bindDeleteButtons();
  }

  // ── Delete logic ──────────────────────────────────────────────────────────
  function fillDeleteModal(student) {
    deleteStudentId.value = student.id;
    deleteStudentName.textContent = `${student.last_name}, ${student.first_name}`;
  }

  function bindDeleteButtons() {
    document.querySelectorAll(".delete-student-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.studentId);
        const student = allStudents.find((s) => s.id === id);
        if (!student) return;

        fillDeleteModal(student);
        openModal(deleteStudentModal);
      });
    });
  }

  async function confirmDeleteStudent() {
    confirmDeleteStudentButton.disabled = true;
    confirmDeleteStudentButton.textContent = "Deleting...";

    try {
      const id = deleteStudentId.value;

      const response = await fetch(`${API_BASE_URL}/students/${id}/`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      await loadStudents();

      setTimeout(() => closeModal(deleteStudentModal), 500);
    } catch {
      alert("Failed to delete student.");
    } finally {
      confirmDeleteStudentButton.disabled = false;
      confirmDeleteStudentButton.textContent = "Delete Student";
    }
  }

  // ── API ───────────────────────────────────────────────────────────────────
  async function loadStudents() {
    const res = await fetch(`${API_BASE_URL}/students/`);
    allStudents = await res.json();
    renderStudents(allStudents);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  confirmDeleteStudentButton.addEventListener("click", confirmDeleteStudent);
  closeDeleteStudentModal.addEventListener("click", () =>
    closeModal(deleteStudentModal),
  );
  cancelDeleteStudent.addEventListener("click", () =>
    closeModal(deleteStudentModal),
  );

  loadStudents();
});
