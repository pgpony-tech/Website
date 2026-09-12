document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-tabs]").forEach((group) => {
    const groupName = group.dataset.tabs;
    const buttons = group.querySelectorAll(".tabs__tab");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-selected", "false"));
        btn.setAttribute("aria-selected", "true");

        const value = btn.dataset.value;
        document.querySelectorAll(`[data-tabpanel="${groupName}"]`).forEach((panel) => {
          panel.hidden = panel.dataset.tabpanelValue !== value;
        });
        document.dispatchEvent(new CustomEvent("tabchange", { detail: { group: groupName, value } }));
      });
    });
  });

  // Divisions page: the sport tabs (baseball/softball/allstar) filter the division cards
  // client-side, since baseball/softball share four divisions and only Fillies is softball-only.
  document.addEventListener("tabchange", (e) => {
    if (e.detail.group !== "sport") return;
    const value = e.detail.value;
    document.querySelectorAll(".division-card").forEach((card) => {
      if (value === "allstar") {
        card.hidden = card.dataset.allstar !== "true";
      } else {
        card.hidden = !(card.dataset.sport || "").includes(value);
      }
    });
  });
});
