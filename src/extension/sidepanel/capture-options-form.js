import { normalizeCaptureOptions, serializeCaptureOptions } from "../../core/capture.js";
import { t } from "./i18n.js";

const OPTION_STORAGE_KEY = "captureOptions";
let captureOptions = normalizeCaptureOptions();

export function bindCaptureOptionEvents(elements, onChange) {
  for (const input of document.querySelectorAll("#view-capture input")) {
    input.addEventListener("input", onChange);
    input.addEventListener("change", onChange);
  }
}

export async function loadCaptureOptions(storage, elements) {
  const stored = await storage.get([OPTION_STORAGE_KEY]);
  captureOptions = normalizeCaptureOptions(stored[OPTION_STORAGE_KEY] || {});
  applyCaptureOptions(elements, captureOptions);
}

export async function saveCaptureOptions(storage, elements) {
  const options = readCaptureOptionsFromForm(elements);
  await storage.set({ [OPTION_STORAGE_KEY]: options });
  return options;
}

export function readCaptureOptionsFromForm(elements) {
  captureOptions = normalizeCaptureOptions({
    ...captureOptions,
    rootOrder: getRadioValue("root-order"),
    rootMaxPages: readLimit(elements.rootLoads, elements.rootLoadsAll),
    rootMaxItems: readLimit(elements.rootItems, elements.rootItemsAll),
    includeReplies: elements.includeReplies.checked,
    replyOrder: getRadioValue("reply-order"),
    replyMaxPagesPerRoot: readLimit(elements.replyLoads, elements.replyLoadsAll),
    replyMaxItemsPerRoot: readLimit(elements.replyItems, elements.replyItemsAll),
  });
  return serializeCaptureOptions(captureOptions);
}

export function syncCaptureLimitInputs(elements) {
  const repliesEnabled = elements.includeReplies.checked;
  elements.replyOptionsPanel?.classList.toggle("is-disabled", !repliesEnabled);
  elements.replyOptionsPanel?.setAttribute("aria-disabled", repliesEnabled ? "false" : "true");

  for (const input of elements.replyOptionControls || []) {
    input.disabled = !repliesEnabled;
  }

  for (const [input, checkbox, groupEnabled] of [
    [elements.rootLoads, elements.rootLoadsAll, true],
    [elements.rootItems, elements.rootItemsAll, true],
    [elements.replyLoads, elements.replyLoadsAll, repliesEnabled],
    [elements.replyItems, elements.replyItemsAll, repliesEnabled],
  ]) {
    input.disabled = !groupEnabled || checkbox.checked;
  }
}

export function setCaptureOptionsLocked(elements, locked) {
  if (locked) {
    for (const input of elements.captureOptionControls || []) {
      input.disabled = true;
    }
    return;
  }

  syncCaptureLimitInputs(elements);
}

export function updateCaptureSummary(elements) {
  const loads = elements.rootLoadsAll.checked
    ? t("capture.summaryAllLoads")
    : t("capture.summaryLoads", { count: elements.rootLoads.value || 1 });
  const items = elements.rootItemsAll.checked
    ? t("capture.summaryAllItems")
    : t("capture.summaryItems", { count: elements.rootItems.value || 1 });
  elements.captureSummary.textContent = `${loads} · ${items}`;
}

function applyCaptureOptions(elements, options) {
  setRadioValue("root-order", options.rootOrder);
  setRadioValue("reply-order", options.replyOrder);
  setLimit(elements.rootLoads, elements.rootLoadsAll, options.rootMaxPages);
  setLimit(elements.rootItems, elements.rootItemsAll, options.rootMaxItems);
  setLimit(elements.replyLoads, elements.replyLoadsAll, options.replyMaxPagesPerRoot);
  setLimit(elements.replyItems, elements.replyItemsAll, options.replyMaxItemsPerRoot);
  elements.includeReplies.checked = options.includeReplies !== false;
}

function readLimit(input, checkbox) {
  return checkbox.checked ? "all" : Number(input.value);
}

function setLimit(input, checkbox, value) {
  checkbox.checked = value === "all" || value === Infinity;
  if (!checkbox.checked) input.value = String(value);
}

function getRadioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function setRadioValue(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}
