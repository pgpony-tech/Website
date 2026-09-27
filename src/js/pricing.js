// Once a season's early-bird date has passed (end of that day, local time),
// show the regular price instead, so the page doesn't need a rebuild on the
// deadline.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-early-bird-ends]").forEach((block) => {
    const [y, m, d] = block.dataset.earlyBirdEnds.split("-").map(Number);
    if (new Date() <= new Date(y, m - 1, d, 23, 59, 59)) return;
    block.querySelectorAll("[data-early-bird]").forEach((el) => { el.hidden = true; });
    block.querySelectorAll("[data-regular]").forEach((el) => { el.hidden = false; });
  });
});
