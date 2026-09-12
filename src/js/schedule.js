document.addEventListener("DOMContentLoaded", () => {
  const tagRow = document.querySelector("[data-filter-group='division']");
  if (!tagRow) return;

  const tags = tagRow.querySelectorAll(".tag");
  const games = document.querySelectorAll(".game-card[data-division]");
  const emptyState = document.getElementById("no-games");

  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      tags.forEach((t) => {
        t.classList.remove("tag--selected");
        t.setAttribute("aria-pressed", "false");
      });
      tag.classList.add("tag--selected");
      tag.setAttribute("aria-pressed", "true");

      const value = tag.dataset.filterValue;
      let visibleCount = 0;
      games.forEach((game) => {
        const match = value === "All" || game.dataset.division === value;
        game.hidden = !match;
        if (match) visibleCount++;
      });
      if (emptyState) emptyState.hidden = visibleCount !== 0;
    });
  });
});
