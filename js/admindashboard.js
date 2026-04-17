document.addEventListener("DOMContentLoaded", function () {
  const html = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  function updateThemeIcon() {
    if (html.classList.contains("dark")) {
      themeIcon.textContent = "light_mode";
    } else {
      themeIcon.textContent = "dark_mode";
    }
  }
  updateThemeIcon();
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      html.classList.toggle("dark");
      html.classList.toggle("light");
      if (html.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
      } else {
        localStorage.setItem("theme", "light");
      }
      updateThemeIcon();
    });
  }
  const menuToggles = document.querySelectorAll(".menu-toggle");
  menuToggles.forEach(function (button) {
    button.addEventListener("click", function () {
      const targetId = button.getAttribute("data-target");
      const targetMenu = document.getElementById(targetId);
      const arrow = button.querySelector(".menu-arrow");
      if (!targetMenu) return;
      const isHidden = targetMenu.classList.contains("hidden");
      if (isHidden) {
        targetMenu.classList.remove("hidden");
        button.setAttribute("aria-expanded", "true");
        if (arrow) arrow.textContent = "expand_less";
      } else {
        targetMenu.classList.add("hidden");
        button.setAttribute("aria-expanded", "false");
        if (arrow) arrow.textContent = "expand_more";
      }
    });
  });
});
