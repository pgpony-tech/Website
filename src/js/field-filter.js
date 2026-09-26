// Filters the /fields/ grid by division. Re-run after live-data.js re-renders
// the grid from KV (see live-data.js's call into window.applyFieldFilter),
// so a live refresh doesn't silently reset an already-chosen filter.
function applyFieldFilter() {
  const select = document.getElementById("division-filter");
  const cards = document.querySelectorAll(".field-card");
  if (!select || !cards.length) return;

  const value = select.value;
  let anyVisible = false;
  cards.forEach((card) => {
    const games = (card.dataset.games || "").split("|").filter(Boolean);
    const practices = (card.dataset.practices || "").split("|").filter(Boolean);
    const match = value === "all" || games.includes(value) || practices.includes(value);
    card.hidden = !match;
    if (match) anyVisible = true;
  });

  const empty = document.getElementById("fields-empty");
  if (empty) empty.hidden = anyVisible;
}
window.applyFieldFilter = applyFieldFilter;

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("division-filter");
  if (!select) return;
  select.addEventListener("change", applyFieldFilter);
  applyFieldFilter();
});
