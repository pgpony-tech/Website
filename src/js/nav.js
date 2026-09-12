document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const toggle = document.getElementById("nav-toggle");
  if (!header || !toggle) return;

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
});
