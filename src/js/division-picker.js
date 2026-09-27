// Divisions page filter. Every division card shows by default; the picker
// buttons toggle divisions on and off, and when any are selected only those
// cards show. Without JS the cards all stay visible. The age calculator
// narrows to one division by dispatching a "pgpony:division" event with its name.
document.addEventListener("DOMContentLoaded", () => {
  const picker = document.querySelector("[data-division-picker]");
  if (!picker) return;

  const buttons = [...picker.querySelectorAll("[data-division-pick]")];
  const panels = [...document.querySelectorAll("[data-division-panel]")];
  const statusEl = picker.querySelector("[data-division-status]");
  const clearBtn = picker.querySelector("[data-division-clear]");
  const selected = new Set();
  picker.hidden = false;

  function apply() {
    panels.forEach((panel) => {
      panel.hidden = selected.size > 0 && !selected.has(panel.dataset.divisionPanel);
    });
    buttons.forEach((btn) => {
      const on = selected.has(btn.dataset.divisionPick);
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    statusEl.textContent = selected.size
      ? `Showing ${selected.size} of ${panels.length} divisions`
      : "Showing all divisions";
    clearBtn.hidden = selected.size === 0;

    // A single selection gets a shareable link (/divisions/#10u-mustang).
    const only = selected.size === 1 ? panels.find((p) => selected.has(p.dataset.divisionPanel)) : null;
    history.replaceState(null, "", only ? "#" + only.id : location.pathname);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.divisionPick;
      if (selected.has(name)) selected.delete(name);
      else selected.add(name);
      apply();
    });
  });

  clearBtn.addEventListener("click", () => {
    selected.clear();
    apply();
  });

  document.addEventListener("pgpony:division", (e) => {
    if (!panels.some((p) => p.dataset.divisionPanel === e.detail.name)) return;
    selected.clear();
    selected.add(e.detail.name);
    apply();
  });

  // Deep links (/divisions/#10u-mustang, e.g. from the homepage cards) open
  // filtered to that division.
  const fromHash = panels.find((p) => location.hash === "#" + p.id);
  if (fromHash) {
    selected.add(fromHash.dataset.divisionPanel);
    apply();
    fromHash.scrollIntoView();
  }
});
