const API_BASE_URL = "http://127.0.0.1:8000/api";
let allStudents = [];
const studentsTableBody = document.getElementById("studentsTableBody");
const studentsSummary = document.getElementById("studentsSummary");
const studentSearch = document.getElementById("studentSearch");
const collegeFilter = document.getElementById("collegeFilter");
const departmentFilter = document.getElementById("departmentFilter");
const genderFilter = document.getElementById("genderFilter");
const resetFilters = document.getElementById("resetFilters");
function getInitials(firstName = "", lastName = "") {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return `${last}${first}`;
}
function getGenderBadge(gender) {
  if (gender === "Male") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (gender === "Female") {
    return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
  }
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
}
function populateFilters(students) {
  const colleges = [
    ...new Set(students.map((student) => student.college_name).filter(Boolean)),
  ].sort();
  const departments = [
    ...new Set(
      students.map((student) => student.department_name).filter(Boolean),
    ),
  ].sort();
  collegeFilter.innerHTML = `<option value="">All Colleges</option>`;
  departmentFilter.innerHTML = `<option value="">All Departments</option>`;
  colleges.forEach((college) => {
    collegeFilter.innerHTML += `<option value="${college}">${college}</option>`;
  });
  departments.forEach((department) => {
    departmentFilter.innerHTML += `<option value="${department}">${department}</option>`;
  });
}
function renderStudents(students) {
  if (!students.length) {
    studentsTableBody.innerHTML = `
<tr>
<td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">
No student records found.
</td>
</tr>
`;
    studentsSummary.innerHTML = `Showing <span class="font-semibold">0</span> students`;
    return;
  }
  studentsTableBody.innerHTML = students
    .map((student) => {
      const photoHtml = student.photo
        ? `<img src="${student.photo}" alt="${student.first_name} ${student.last_name}"
class="size-10 rounded-full bg-slate-100 object-cover" />`
        : `<div class="size-10 rounded-full bg-primary/10 text-primary flex items-center
justify-center text-xs font-bold">${getInitials(
            student.first_name,
            student.last_name,
          )}</div>`;
      return `
<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
${photoHtml}
<div>
<p class="font-bold text-slate-900 dark:text-slate-100">
${student.last_name}, ${student.first_name}${
        student.middle_initial
          ? `
${student.middle_initial}.`
          : ""
      }
</p>
<p class="text-xs text-slate-500">ID: ${student.student_number}</p>
</div>
</div>
</td>
<td class="px-6 py-4">
<div class="text-sm">
<p class="font-semibold text-slate-700 dark:text-slate200">${student.college_name ?? "-"}</p>
<p class="text-xs text-slate-500">${student.course_name ?? "-"}</p>
<p class="text-xs text-slate-400 mt-1">${student.department_name ?? "-"}</p>
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
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs fontmedium ${getGenderBadge(student.gender)}">
${student.gender}
</span>
</td>
<td class="px-6 py-4 text-right">
<div class="flex justify-end gap-2">
<button class="p-2 text-slate-400 hover:text-primary transition-colors"
title="View">
<span class="material-symbols-outlined">visibility</span>
</button>
<button class="p-2 text-slate-400 hover:text-blue-500 transition-colors"
title="Edit">
<span class="material-symbols-outlined">edit</span>
</button>
<button class="p-2 text-slate-400 hover:text-red-500 transition-colors"
title="Delete">
<span class="material-symbols-outlined">delete</span>
</button>
</div>
</td>
</tr>
`;
    })
    .join("");
  studentsSummary.innerHTML = `Showing <span class="fontsemibold">${students.length}</span> student${students.length > 1 ? "s" : ""}`;
}
function applyFilters() {
  const searchValue = studentSearch.value.trim().toLowerCase();
  const selectedCollege = collegeFilter.value;
  const selectedDepartment = departmentFilter.value;
  const selectedGender = genderFilter.value;
  const filtered = allStudents.filter((student) => {
    const fullName = `${student.last_name} ${student.first_name} ${
      student.middle_initial ?? ""
    }`.toLowerCase();
    const studentNumber = (student.student_number ?? "").toLowerCase();
    const matchesSearch =
      fullName.includes(searchValue) || studentNumber.includes(searchValue);
    const matchesCollege =
      !selectedCollege || student.college_name === selectedCollege;
    const matchesDepartment =
      !selectedDepartment || student.department_name === selectedDepartment;
    const matchesGender = !selectedGender || student.gender === selectedGender;
    return (
      matchesSearch && matchesCollege && matchesDepartment && matchesGender
    );
  });
  renderStudents(filtered);
}
async function loadStudents() {
  try {
    const response = await fetch(`${API_BASE_URL}/students/`);
    if (!response.ok) {
      throw new Error("Failed to fetch students");
    }
    allStudents = await response.json();
    populateFilters(allStudents);
    renderStudents(allStudents);
  } catch (error) {
    studentsTableBody.innerHTML = `
<tr>
<td colspan="5" class="px-6 py-10 text-center text-sm text-red-500">
Failed to load students.
</td>
</tr>
`;
    studentsSummary.innerHTML = `Showing <span class="font-semibold">0</span> students`;
    console.error("Students error:", error);
  }
}
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
loadStudents();
