const API_BASE_URL = "http://127.0.0.1:8000/api";

const ROLE_DESTINATIONS = {
  admin: "admindashboard.html",
  student: "studentdashboard.html",
  mentor: "mentordashboard.html",
};

const ROLE_HINTS = {
  student:
    "Use your university email and the password you set during registration.",
  mentor: "Use your institutional email and mentor account password.",
  admin: "Admin accounts are provisioned by the system administrator.",
};

let selectedRole = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginBtnText = document.getElementById("loginBtnText");
const loginMsg = document.getElementById("loginMsg");
const roleHint = document.getElementById("roleHint");
const roleHintText = document.getElementById("roleHintText");
const togglePwdBtn = document.getElementById("togglePassword");
const togglePwdIcon = document.getElementById("togglePasswordIcon");

// ── Role selection ────────────────────────────────────────────────────────────
document.querySelectorAll(".role-card").forEach((card) => {
  card.addEventListener("click", () => {
    // Deselect all
    document
      .querySelectorAll(".role-card")
      .forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");

    selectedRole = card.dataset.role;

    // Update button
    loginBtn.disabled = false;
    loginBtnText.textContent = `Sign in as ${capitalize(selectedRole)}`;

    // Show hint
    roleHintText.textContent = ROLE_HINTS[selectedRole] ?? "";
    roleHint.classList.remove("hidden");

    clearMsg();
  });
});

// ── Password toggle ───────────────────────────────────────────────────────────
togglePwdBtn.addEventListener("click", () => {
  const isHidden = loginPassword.type === "password";
  loginPassword.type = isHidden ? "text" : "password";
  togglePwdIcon.textContent = isHidden ? "visibility_off" : "visibility";
});

// ── Form submit ───────────────────────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();

  if (!selectedRole) {
    showMsg("Please select your role before signing in.", "error");
    return;
  }

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showMsg("Please enter your email and password.", "error");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role: selectedRole }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      /* empty body */
    }

    if (!response.ok) {
      const msg =
        data.detail ??
        data.non_field_errors?.[0] ??
        data.error ??
        `Login failed (${response.status}). Please check your credentials.`;
      throw new Error(msg);
    }

    // Validate that the returned role matches what was selected
    const returnedRole = data.role ?? selectedRole;

    if (returnedRole !== selectedRole) {
      throw new Error(
        `This account is registered as a ${capitalize(returnedRole)}, not a ${capitalize(selectedRole)}. Please select the correct role.`,
      );
    }

    // Persist session
    sessionStorage.setItem("mm_token", data.token ?? "");
    sessionStorage.setItem("mm_role", returnedRole);
    sessionStorage.setItem("mm_user_id", data.user_id ?? "");
    sessionStorage.setItem("mm_name", data.name ?? email);

    showMsg(`Welcome back! Redirecting you to your dashboard…`, "success");

    const destination =
      ROLE_DESTINATIONS[returnedRole] ?? "admindashboard.html";
    setTimeout(() => {
      window.location.href = destination;
    }, 900);
  } catch (err) {
    console.error("Login error:", err);
    showMsg(err.message, "error");
    setLoading(false);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setLoading(loading) {
  loginBtn.disabled = loading || !selectedRole;
  loginBtnText.textContent = loading
    ? "Signing in…"
    : selectedRole
      ? `Sign in as ${capitalize(selectedRole)}`
      : "Select a role to continue";
}

function showMsg(text, type) {
  loginMsg.textContent = text;
  loginMsg.className = `msg ${type}`;
  loginMsg.style.display = "block";
}

function clearMsg() {
  loginMsg.style.display = "none";
  loginMsg.textContent = "";
}

function capitalize(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Auto-redirect if already logged in ───────────────────────────────────────
(function checkExistingSession() {
  const token = sessionStorage.getItem("mm_token");
  const role = sessionStorage.getItem("mm_role");
  if (token && role && ROLE_DESTINATIONS[role]) {
    window.location.href = ROLE_DESTINATIONS[role];
  }
})();
