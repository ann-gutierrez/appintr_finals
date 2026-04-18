
const API_BASE_URL = "http://127.0.0.1:8000/api";

// ─── State ────────────────────────────────────────────────────────────────────
let currentStep = 1;
let selectedRole = null; // "student" | "mentor"
let expertiseList = []; // mentor expertise chips

// ─── DOM refs — Step 1 ────────────────────────────────────────────────────────
const roleStudentCard = document.getElementById("roleStudent");
const roleMentorCard = document.getElementById("roleMentor");
const roleError = document.getElementById("roleError");
const nextStep1Btn = document.getElementById("nextStep1");

// ─── DOM refs — Step 2 ────────────────────────────────────────────────────────
const backStep2Btn = document.getElementById("backStep2");
const nextStep2Btn = document.getElementById("nextStep2");
const step2Title = document.getElementById("step2Title");
const step2Sub = document.getElementById("step2Sub");
const step2RoleIcon = document.getElementById("step2RoleIcon");
const studentOnlyFields = document.getElementById("studentOnlyFields");
const mentorOnlyFields = document.getElementById("mentorOnlyFields");
const idLabel = document.getElementById("idLabel");
const photoInput = document.getElementById("reg_photo");
const photoPreview = document.getElementById("photoPreview");
const expertiseChipsEl = document.getElementById("expertiseChips");
const expertiseInputEl = document.getElementById("expertiseInput");

// ─── DOM refs — Step 3 ────────────────────────────────────────────────────────
const backStep3Btn = document.getElementById("backStep3");
const submitRegisterBtn = document.getElementById("submitRegister");
const submitText = document.getElementById("submitText");
const globalMsg = document.getElementById("globalMsg");
const summaryIcon = document.getElementById("summaryIcon");
const summaryName = document.getElementById("summaryName");
const summaryDetail = document.getElementById("summaryDetail");
const summaryRole = document.getElementById("summaryRole");

// Password toggles
const togglePwd1Btn = document.getElementById("togglePwd1");
const togglePwd1Icon = document.getElementById("togglePwd1Icon");
const togglePwd2Btn = document.getElementById("togglePwd2");
const togglePwd2Icon = document.getElementById("togglePwd2Icon");

// ─── Stepper ──────────────────────────────────────────────────────────────────
function goToStep(n) {
  // Hide all sections
  document
    .querySelectorAll(".step-section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`step${n}`).classList.add("active");

  // Update dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (!dot) continue;
    dot.classList.remove("active", "done");
    if (i < n) dot.classList.add("done");
    else if (i === n) dot.classList.add("active");
  }

  // Hide stepper on success screen
  const stepperRow = document.getElementById("stepperRow");
  stepperRow.style.display = n === 4 ? "none" : "";

  // Step label
  const labels = {
    1: "Step 1 of 3 — Role",
    2: "Step 2 of 3 — Profile",
    3: "Step 3 of 3 — Account",
  };
  document.getElementById("stepLabel").textContent = labels[n] ?? "";

  currentStep = n;
  clearGlobalMsg();
}

// ─── Role selection ───────────────────────────────────────────────────────────
[roleStudentCard, roleMentorCard].forEach((card) => {
  card.addEventListener("click", () => {
    [roleStudentCard, roleMentorCard].forEach((c) =>
      c.classList.remove("selected"),
    );
    card.classList.add("selected");
    selectedRole = card.dataset.role;
    roleError.classList.add("hidden");
  });
});

// ─── Step 1 → 2 ──────────────────────────────────────────────────────────────
nextStep1Btn.addEventListener("click", () => {
  if (!selectedRole) {
    roleError.classList.remove("hidden");
    return;
  }
  configureStep2ForRole(selectedRole);
  goToStep(2);
});

function configureStep2ForRole(role) {
  if (role === "student") {
    step2Title.textContent = "Student Profile";
    step2Sub.textContent = "Your personal and academic details";
    step2RoleIcon.innerHTML = `<span class="material-symbols-outlined text-violet-400 text-lg">school</span>`;
    idLabel.innerHTML = `Student Number <span class="required">*</span>`;
    document.getElementById("reg_id_number").placeholder = "2024-00001";
    studentOnlyFields.classList.remove("hidden");
    mentorOnlyFields.classList.add("hidden");
  } else {
    step2Title.textContent = "Mentor Profile";
    step2Sub.textContent = "Your professional and expertise details";
    step2RoleIcon.innerHTML = `<span class="material-symbols-outlined text-violet-400 text-lg">person_book</span>`;
    idLabel.innerHTML = `Mentor Number <span class="required">*</span>`;
    document.getElementById("reg_id_number").placeholder = "MNT-00001";
    studentOnlyFields.classList.add("hidden");
    mentorOnlyFields.classList.remove("hidden");
  }
}

// ─── Step 2 → 3 ──────────────────────────────────────────────────────────────
nextStep2Btn.addEventListener("click", () => {
  if (!validateStep2()) return;
  populateSummary();
  goToStep(3);
});

backStep2Btn.addEventListener("click", () => goToStep(1));

function validateStep2() {
  let valid = true;

  // Always required
  valid =
    requireField("reg_last_name", "err_last_name", "Last name is required.") &&
    valid;
  valid =
    requireField(
      "reg_first_name",
      "err_first_name",
      "First name is required.",
    ) && valid;
  valid =
    requireField(
      "reg_id_number",
      "err_id_number",
      selectedRole === "student"
        ? "Student number is required."
        : "Mentor number is required.",
    ) && valid;

  if (selectedRole === "student") {
    valid =
      requireField("reg_college", "err_college", "College is required.") &&
      valid;
    valid =
      requireField(
        "reg_department",
        "err_department",
        "Department is required.",
      ) && valid;
    valid =
      requireField("reg_course", "err_course", "Course is required.") && valid;
    valid =
      requireField("reg_gender", "err_gender", "Please select a gender.") &&
      valid;
  } else {
    valid =
      requireField(
        "reg_mentor_department",
        "err_mentor_department",
        "Department is required.",
      ) && valid;
  }

  return valid;
}

// ─── Step 3 → submit ─────────────────────────────────────────────────────────
backStep3Btn.addEventListener("click", () => goToStep(2));

submitRegisterBtn.addEventListener("click", async () => {
  if (!validateStep3()) return;
  await submitRegistration();
});

function validateStep3() {
  let valid = true;

  valid =
    requireField("reg_username", "err_username", "Username is required.") &&
    valid;

  const email = document.getElementById("reg_email").value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError("err_email", "Please enter a valid email address.");
    document.getElementById("reg_email").classList.add("error-field");
    valid = false;
  } else {
    hideFieldError("err_email");
    document.getElementById("reg_email").classList.remove("error-field");
  }

  const pwd = document.getElementById("reg_password").value;
  if (!pwd || pwd.length < 8) {
    showFieldError("err_password", "Password must be at least 8 characters.");
    valid = false;
  } else {
    hideFieldError("err_password");
  }

  const confirm = document.getElementById("reg_password_confirm").value;
  if (pwd !== confirm) {
    showFieldError("err_confirm", "Passwords do not match.");
    valid = false;
  } else {
    hideFieldError("err_confirm");
  }

  const terms = document.getElementById("reg_terms").checked;
  if (!terms) {
    showFieldError("err_terms", "You must agree to the Terms of Service.");
    valid = false;
  } else {
    hideFieldError("err_terms");
  }

  return valid;
}

async function submitRegistration() {
  clearGlobalMsg();
  setSubmitLoading(true);

  try {
    const formData = buildFormData();
    const endpoint =
      selectedRole === "student"
        ? `${API_BASE_URL}/auth/register/student/`
        : `${API_BASE_URL}/auth/register/mentor/`;

    const res = await fetch(endpoint, { method: "POST", body: formData });

    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      // Try to surface the first meaningful field error from DRF
      const firstError = extractDRFError(data);
      throw new Error(
        firstError ?? `Registration failed (${res.status}). Please try again.`,
      );
    }

    // Success
    const firstName = document.getElementById("reg_first_name").value.trim();
    const lastName = document.getElementById("reg_last_name").value.trim();
    document.getElementById("successName").textContent =
      `Welcome, ${firstName} ${lastName}!`;
    document.getElementById("successSub").textContent =
      `Your ${selectedRole} account has been created. Sign in to get started.`;

    goToStep(4);
  } catch (err) {
    console.error("Register error:", err);
    showGlobalMsg(err.message, "error");
  } finally {
    setSubmitLoading(false);
  }
}

function buildFormData() {
  const fd = new FormData();

  // ── User fields ──
  fd.append("username", document.getElementById("reg_username").value.trim());
  fd.append("email", document.getElementById("reg_email").value.trim());
  fd.append("password", document.getElementById("reg_password").value);
  fd.append("role", selectedRole);

  // ── Shared profile fields ──
  fd.append("last_name", document.getElementById("reg_last_name").value.trim());
  fd.append(
    "first_name",
    document.getElementById("reg_first_name").value.trim(),
  );
  fd.append(
    "middle_initial",
    document.getElementById("reg_middle_initial").value.trim(),
  );
  fd.append("phone", document.getElementById("reg_phone").value.trim());

  const photoFile = photoInput.files[0];
  if (photoFile) fd.append("photo", photoFile);

  if (selectedRole === "student") {
    fd.append(
      "student_number",
      document.getElementById("reg_id_number").value.trim(),
    );
    fd.append("college", document.getElementById("reg_college").value.trim());
    fd.append(
      "department",
      document.getElementById("reg_department").value.trim(),
    );
    fd.append("course", document.getElementById("reg_course").value.trim());
    fd.append("gender", document.getElementById("reg_gender").value);
    // email duplicated on Student model — send it there too
    fd.append(
      "student_email",
      document.getElementById("reg_email").value.trim(),
    );
  } else {
    fd.append(
      "mentor_number",
      document.getElementById("reg_id_number").value.trim(),
    );
    fd.append(
      "department",
      document.getElementById("reg_mentor_department").value.trim(),
    );
    fd.append("expertise_names", expertiseList.join(","));
    fd.append(
      "mentor_email",
      document.getElementById("reg_email").value.trim(),
    );
  }

  return fd;
}

function extractDRFError(data) {
  if (!data || typeof data !== "object") return null;
  // DRF can return { field: ["msg"] } or { detail: "msg" } or { non_field_errors: ["msg"] }
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

// ─── Summary strip ────────────────────────────────────────────────────────────
function populateSummary() {
  const firstName = document.getElementById("reg_first_name").value.trim();
  const lastName = document.getElementById("reg_last_name").value.trim();
  const idNum = document.getElementById("reg_id_number").value.trim();

  summaryName.textContent = `${lastName}, ${firstName}`;
  summaryRole.textContent = selectedRole === "student" ? "Student" : "Mentor";
  summaryIcon.textContent =
    selectedRole === "student" ? "school" : "person_book";

  if (selectedRole === "student") {
    const college = document.getElementById("reg_college").value.trim();
    const course = document.getElementById("reg_course").value.trim();
    summaryDetail.textContent = `${idNum} · ${course}, ${college}`;
  } else {
    const dept = document.getElementById("reg_mentor_department").value.trim();
    const exp = expertiseList.slice(0, 3).join(", ");
    summaryDetail.textContent = `${idNum} · ${dept}${exp ? ` · ${exp}` : ""}`;
  }
}

// ─── Expertise chips (mentor) ─────────────────────────────────────────────────
function renderExpertiseChips() {
  expertiseChipsEl.innerHTML = expertiseList
    .map(
      (name, i) => `
    <span class="expertise-chip">
      ${name}
      <button type="button" class="remove-expertise text-violet-400/60 hover:text-red-400 transition-colors ml-1" data-index="${i}">
        <span class="material-symbols-outlined" style="font-size:13px">close</span>
      </button>
    </span>`,
    )
    .join("");

  expertiseChipsEl.querySelectorAll(".remove-expertise").forEach((btn) => {
    btn.addEventListener("click", () => {
      expertiseList.splice(parseInt(btn.dataset.index, 10), 1);
      renderExpertiseChips();
    });
  });
}

function addExpertiseChip(value) {
  const trimmed = value.trim().replace(/,+$/, "");
  if (!trimmed || expertiseList.includes(trimmed)) return;
  expertiseList.push(trimmed);
  renderExpertiseChips();
}

expertiseInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addExpertiseChip(expertiseInputEl.value);
    expertiseInputEl.value = "";
  }
});
expertiseInputEl.addEventListener("blur", () => {
  if (expertiseInputEl.value.trim()) {
    addExpertiseChip(expertiseInputEl.value);
    expertiseInputEl.value = "";
  }
});

// ─── Photo preview ────────────────────────────────────────────────────────────
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) {
    photoPreview.style.display = "none";
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreview.src = e.target.result;
    photoPreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// ─── Password strength ────────────────────────────────────────────────────────
document.getElementById("reg_password").addEventListener("input", function () {
  const pwd = this.value;
  const strength = calcStrength(pwd);
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`s${i}`).style.background =
      i <= strength ? colors[strength] : "rgba(255,255,255,0.1)";
  }
  document.getElementById("strengthLabel").textContent = pwd.length
    ? labels[strength]
    : "Enter a password";
  document.getElementById("strengthLabel").style.color = pwd.length
    ? colors[strength]
    : "rgba(255,255,255,0.3)";
});

function calcStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

// ─── Password toggles ─────────────────────────────────────────────────────────
togglePwd1Btn.addEventListener("click", () => {
  const input = document.getElementById("reg_password");
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  togglePwd1Icon.textContent = isHidden ? "visibility_off" : "visibility";
});
togglePwd2Btn.addEventListener("click", () => {
  const input = document.getElementById("reg_password_confirm");
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  togglePwd2Icon.textContent = isHidden ? "visibility_off" : "visibility";
});

// ─── Validation helpers ───────────────────────────────────────────────────────
function requireField(inputId, errorId, message) {
  const el = document.getElementById(inputId);
  const val = el.value.trim();
  if (!val) {
    el.classList.add("error-field");
    showFieldError(errorId, message);
    return false;
  }
  el.classList.remove("error-field");
  hideFieldError(errorId);
  return true;
}

function showFieldError(errorId, message) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
}

function hideFieldError(errorId) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.classList.remove("visible");
}

// Clear error-field class on input
document.querySelectorAll(".field").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("error-field");
  });
});

// ─── Global message ───────────────────────────────────────────────────────────
function showGlobalMsg(text, type) {
  globalMsg.textContent = text;
  globalMsg.className = `msg ${type}`;
  globalMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearGlobalMsg() {
  globalMsg.textContent = "";
  globalMsg.className = "msg";
}

// ─── Submit state ─────────────────────────────────────────────────────────────
function setSubmitLoading(loading) {
  submitRegisterBtn.disabled = loading;
  submitText.textContent = loading ? "Creating account…" : "Create Account";
}
