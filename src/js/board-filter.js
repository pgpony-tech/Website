// Filters the /board/ roster by text (role, name or email) and vacancy.
// Re-run after live-data.js re-renders #board-content from KV (see its call
// into window.applyBoardFilter), so a live refresh keeps the chosen filter.
let vacantOnly = false;

function applyBoardFilter() {
  const root = document.getElementById("board-content");
  const search = document.getElementById("board-search");
  if (!root || !search) return;

  const query = search.value.trim().toLowerCase();
  const text = (card, sel) => (card.querySelector(sel)?.textContent || "").toLowerCase();
  let visible = 0;

  root.querySelectorAll(".person-card").forEach((card) => {
    const isVacant = !!card.querySelector(".person-card__name--vacant");
    const haystack = [".person-card__role", ".person-card__name", ".person-card__email"].map((s) => text(card, s)).join(" ");
    const match = (!vacantOnly || isVacant) && (!query || haystack.includes(query));
    card.hidden = !match;
    if (match) visible++;
  });

  // Hide grids with no matches, plus the headings and eyebrows above them.
  // Walking backwards means each h3 already knows whether anything below it
  // (up to the next h3) is still showing.
  let sectionHasMatch = false;
  let gridHasMatch = false;
  Array.from(root.children).reverse().forEach((el) => {
    if (/^grid-/.test(el.className)) {
      gridHasMatch = !!el.querySelector(".person-card:not([hidden])");
      el.hidden = !gridHasMatch;
      if (gridHasMatch) sectionHasMatch = true;
    } else if (el.classList.contains("eyebrow")) {
      el.hidden = !gridHasMatch;
    } else if (el.tagName === "H3") {
      el.hidden = !sectionHasMatch;
      sectionHasMatch = false;
    }
  });

  const total = root.querySelectorAll(".person-card").length;
  const count = document.getElementById("board-filter-count");
  if (count) count.textContent = visible === total ? `${total} roles` : `Showing ${visible} of ${total} roles`;
  const empty = document.getElementById("board-empty");
  if (empty) empty.hidden = visible > 0;
}
window.applyBoardFilter = applyBoardFilter;

function setVacantOnly(value) {
  vacantOnly = value;
  document.querySelectorAll("[data-board-view]").forEach((btn) => {
    const active = (btn.dataset.boardView === "vacant") === vacantOnly;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  applyBoardFilter();
}

document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("board-search");
  if (!search) return;
  search.addEventListener("input", applyBoardFilter);
  document.querySelectorAll("[data-board-view]").forEach((btn) => {
    btn.addEventListener("click", () => setVacantOnly(btn.dataset.boardView === "vacant"));
  });
  // ?vacant=1 and ?q=… preselect the filter (the Help page links to ?vacant=1).
  const params = new URLSearchParams(location.search);
  if (params.get("q")) search.value = params.get("q");
  setVacantOnly(params.get("vacant") === "1");
});
