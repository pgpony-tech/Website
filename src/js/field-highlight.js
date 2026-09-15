// Jumping to a field via an anchor link (sidebar quick-nav, or a direct URL
// like /schedule/#arnett-park) briefly highlights that field's card so it's
// obvious which one you landed on.
document.addEventListener("DOMContentLoaded", () => {
  const fieldCards = document.querySelectorAll(".field-card");
  if (!fieldCards.length) return;

  function highlightFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (!target || !target.classList.contains("field-card")) return;

    fieldCards.forEach((el) => el.classList.remove("is-highlighted"));
    // Force a reflow so the animation restarts even if the same field is
    // re-selected (clicking the same sidebar link twice in a row).
    void target.offsetWidth;
    target.classList.add("is-highlighted");
  }

  window.addEventListener("hashchange", highlightFromHash);
  if (location.hash) highlightFromHash();

  // Clicking a link to the hash you're already on doesn't fire "hashchange".
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (link.getAttribute("href") === location.hash) {
        setTimeout(highlightFromHash, 0);
      }
    });
  });
});
