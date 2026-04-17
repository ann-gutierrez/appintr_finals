const API_BASE_URL = "http://127.0.0.1:8000/api";
async function loadStudents() {
  const message = document.getElementById("students-message");
  const table = document.getElementById("students-table");
  const body = document.getElementById("students-body");
  try {
    const response = await fetch(`${API_BASE_URL}/students/`);
    const students = await response.json();
    body.innerHTML = "";
    if (!students.length) {
      message.textContent = "No student records found.";
      table.classList.add("hidden");
      return;
    }
    students.forEach((student) => {
      body.innerHTML += `
    <tr>
        <td>${student.id}</td>
        <td>${student.student_number}</td>
        <td>${student.last_name}</td>
        <td>${student.first_name}</td>
        <td>${student.college}</td>
        <td>${student.department}</td>
        <td>${student.course}</td>
        <td>${student.gender}</td>
        <td>${student.role_name}</td>
        <td>${student.status_name}</td>
    </tr>
`;
    });
    message.textContent = "";
    table.classList.remove("hidden");
  } catch (error) {
    message.textContent = "Failed to load students.";
    table.classList.add("hidden");
    console.error("Students error:", error);
  }
}
async function loadmentors() {
  const message = document.getElementById("mentors-message");
  const table = document.getElementById("mentors-table");
  const body = document.getElementById("mentors-body");
  try {
    const response = await fetch(`${API_BASE_URL}/mentors/`);
    const mentors = await response.json();
    body.innerHTML = "";
    if (!mentors.length) {
      message.textContent = "No mentor records found.";
      table.classList.add("hidden");
      return;
    }
    mentors.forEach((mentor) => {
      body.innerHTML += `
    <tr>
        <td>${mentor.id}</td>
        <td>${mentor.mentor_number}</td>
        <td>${mentor.last_name}</td>
        <td>${mentor.first_name}</td>
        <td>${mentor.department}</td>
        <td>${mentor.position}</td>
        <td>${mentor.email ?? ""}</td>
        <td>${mentor.role_name}</td>
        <td>${mentor.status_name}</td>
    </tr>
`;
    });
    message.textContent = "";
    table.classList.remove("hidden");
  } catch (error) {
    message.textContent = "Failed to load mentors.";
    table.classList.add("hidden");
    console.error("mentors error:", error);
  }
}
loadStudents();
loadmentors();
