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
});
