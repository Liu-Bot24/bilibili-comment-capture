import test from "node:test";
import assert from "node:assert/strict";
import {
  readCaptureOptionsFromForm,
  setCaptureOptionsLocked,
  syncCaptureLimitInputs,
} from "../src/extension/sidepanel/capture-options-form.js";

test("disabling nested reply capture disables the nested reply settings group", () => {
  const elements = createElements();
  elements.includeReplies.checked = false;

  syncCaptureLimitInputs(elements);

  assert.equal(elements.rootLoads.disabled, false);
  assert.equal(elements.replyOrderDefault.disabled, true);
  assert.equal(elements.replyLoads.disabled, true);
  assert.equal(elements.replyItems.disabled, true);
  assert.equal(elements.replyOptionsPanel.classes.get("is-disabled"), true);
  assert.equal(elements.replyOptionsPanel.attributes.get("aria-disabled"), "true");
});

test("enabling nested reply capture restores numeric reply settings", () => {
  const elements = createElements();
  elements.includeReplies.checked = true;

  syncCaptureLimitInputs(elements);

  assert.equal(elements.replyOrderDefault.disabled, false);
  assert.equal(elements.replyLoads.disabled, false);
  assert.equal(elements.replyItems.disabled, false);
  assert.equal(elements.replyLoadsAll.disabled, false);
  assert.equal(elements.replyItemsAll.disabled, false);
  assert.equal(elements.replyOptionsPanel.classes.get("is-disabled"), false);
  assert.equal(elements.replyOptionsPanel.attributes.get("aria-disabled"), "false");
});

test("checking nested reply all-limit boxes disables numeric limits", () => {
  const elements = createElements();
  elements.includeReplies.checked = true;
  elements.replyLoadsAll.checked = true;
  elements.replyItemsAll.checked = true;

  syncCaptureLimitInputs(elements);

  assert.equal(elements.replyLoads.disabled, true);
  assert.equal(elements.replyItems.disabled, true);
});

test("locking capture options disables every capture setting during a running task", () => {
  const elements = createElements();

  setCaptureOptionsLocked(elements, true);

  for (const control of elements.captureOptionControls) {
    assert.equal(control.disabled, true);
  }

  setCaptureOptionsLocked(elements, false);

  assert.equal(elements.rootLoads.disabled, false);
  assert.equal(elements.replyLoads.disabled, false);
});

test("reading capture options keeps all-limit values JSON-serializable for Chrome storage and messaging", () => {
  const elements = createElements();
  elements.rootLoads.value = "20";
  elements.rootItems.value = "50";
  elements.replyLoads.value = "3";
  elements.replyItems.value = "8";
  elements.replyLoadsAll.checked = true;
  elements.replyItemsAll.checked = true;

  withDocumentRadios({ "root-order": "default", "reply-order": "default" }, () => {
    const options = readCaptureOptionsFromForm(elements);

    assert.equal(options.replyMaxPagesPerRoot, "all");
    assert.equal(options.replyMaxItemsPerRoot, "all");
    assert.doesNotMatch(JSON.stringify(options), /null/);
  });
});

function createElements() {
  const rootLoads = control();
  const rootLoadsAll = control();
  const rootItems = control();
  const rootItemsAll = control();
  const replyOrderDefault = control();
  const replyOrderLatest = control();
  const replyLoads = control();
  const replyLoadsAll = control();
  const replyItems = control();
  const replyItemsAll = control();

  return {
    includeReplies: control(true),
    rootLoads,
    rootLoadsAll,
    rootItems,
    rootItemsAll,
    replyOrderDefault,
    replyOrderLatest,
    replyLoads,
    replyLoadsAll,
    replyItems,
    replyItemsAll,
    replyOptionControls: [
      replyOrderDefault,
      replyOrderLatest,
      replyLoads,
      replyLoadsAll,
      replyItems,
      replyItemsAll,
    ],
    captureOptionControls: [
      rootLoads,
      rootLoadsAll,
      rootItems,
      rootItemsAll,
      replyOrderDefault,
      replyOrderLatest,
      replyLoads,
      replyLoadsAll,
      replyItems,
      replyItemsAll,
    ],
    replyOptionsPanel: panel(),
  };
}

function control(checked = false) {
  return {
    checked,
    disabled: false,
    value: "",
  };
}

function panel() {
  const classes = new Map();
  const attributes = new Map();
  return {
    classes,
    attributes,
    classList: {
      toggle(name, value) {
        classes.set(name, Boolean(value));
      },
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
}

function withDocumentRadios(values, callback) {
  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelector(selector) {
      const match = selector.match(/input\[name="([^"]+)"\]\:checked/);
      if (!match) return null;
      return { value: values[match[1]] };
    },
  };
  try {
    callback();
  } finally {
    globalThis.document = originalDocument;
  }
}
