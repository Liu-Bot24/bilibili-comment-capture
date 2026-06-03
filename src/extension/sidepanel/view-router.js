export function activateView(name) {
  for (const button of document.querySelectorAll("[data-view-target]")) {
    button.classList.toggle("is-active", button.dataset.viewTarget === name);
  }
  for (const panel of document.querySelectorAll("[data-view-panel]")) {
    const active = panel.dataset.viewPanel === name;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  }
}

export function setViewEnabled(name, enabled) {
  const button = document.querySelector(`[data-view-target="${name}"]`);
  if (button) button.disabled = !enabled;
}
