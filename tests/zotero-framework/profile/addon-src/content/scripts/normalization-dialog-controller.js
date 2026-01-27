/**
 * Legacy normalization dialog controller
 * ---------------------------------------------------------------
 * This file is retained as a thin compatibility shim for environments
 * that still load the old XUL-based dialog. The HTML dialog now owns all
 * business logic (see `content/dialog.html`).
 *
 * We intentionally avoid shipping the previous implementation here so the
 * old entry point cannot drift out of sync with the maintained dialog.
 */

(function(global) {
  if (!global || global.__ZoteroNERLegacyControllerWarned) {
    return;
  }

  try {
    global.__ZoteroNERLegacyControllerWarned = true;
    const consoleObject = global.console || (typeof console !== 'undefined' ? console : null);
    if (consoleObject && typeof consoleObject.warn === 'function') {
      consoleObject.warn('[Zotero NER] normalization-dialog-controller.js is deprecated. The HTML dialog (content/dialog.html) hosts the live implementation.');
    }
  } catch (_error) {
    void _error;
    // Best-effort notification only.
  }
})(typeof window !== 'undefined' ? window : this);
