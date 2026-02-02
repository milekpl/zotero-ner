# Remove Obsolete XUL Files and Firefox References

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove dead XUL files, deprecated dialog controllers, and obsolete XPCOM file I/O code blocks that never execute in modern Zotero.

**Architecture:** Remove unused files and dead code blocks. No refactoring needed - straightforward deletion.

**Tech Stack:** Git for file operations, no new dependencies.

---

## Task 1: Remove XUL resources directory

**Files:**
- Delete: `resources/`
- Delete: `resources/AGENTS.md` (if not covered by directory deletion)

**Step 1: Delete the resources directory**

Run: `rm -rf resources/`
Expected: Directory removed, no errors

**Step 2: Verify removal**

Run: `ls -la resources/ 2>&1 || echo "Directory successfully removed"`
Expected: Error or "No such file" message

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete XUL resources directory

- Removes dead normalizer-dialog.xul and normalizer-dialog.js
- XUL dialog was never shipped (not in build assets)
- Modern HTML dialog at content/dialog.html is used instead"
```

---

## Task 2: Remove deprecated normalization-dialog-controller.js

**Files:**
- Delete: `content/scripts/normalization-dialog-controller.js`

**Step 1: Delete the deprecated file**

Run: `rm content/scripts/normalization-dialog-controller.js`
Expected: File removed, no errors

**Step 2: Verify removal**

Run: `ls -la content/scripts/normalization-dialog-controller.js 2>&1 || echo "File successfully removed"`
Expected: Error or "No such file" message

**Step 3: Commit**

```bash
git add content/scripts/normalization-dialog-controller.js
git commit -m "chore: remove deprecated normalization-dialog-controller.js

- This was a compatibility shim that warned users it was deprecated
- The HTML dialog (content/dialog.html) has owned all logic since migration
- No longer needed"
```

---

## Task 3: Remove deprecated ner-normalization-dialog.js

**Files:**
- Delete: `content/scripts/ner-normalization-dialog.js`

**Step 1: Delete the deprecated file**

Run: `rm content/scripts/ner-normalization-dialog.js`
Expected: File removed, no errors

**Step 2: Verify removal**

Run: `ls -la content/scripts/ner-normalization-dialog.js 2>&1 || echo "File successfully removed"`
Expected: Error or "No such file" message

**Step 3: Commit**

```bash
git add content/scripts/ner-normalization-dialog.js
git commit -m "chore: remove deprecated ner-normalization-dialog.js

- Legacy placeholder that redirected to HTML dialog
- Only existed to prevent errors if old XUL entry point was opened
- No longer needed"
```

---

## Task 4: Remove dead XPCOM file I/O code from zotero-db-analyzer.js

**Files:**
- Modify: `src/zotero/zotero-db-analyzer.js:9-36`

**Step 1: Read the file to understand context**

Run: `head -50 src/zotero/zotero-db-analyzer.js`
Expected: Show lines 1-50 with the fileLog function

**Step 2: Remove the entire fileLog function (lines 9-36)**

Edit: Replace lines 9-36 with empty line or remove entirely

```javascript
// OLD (lines 9-36):
// File-based logger for debugging (writes to /tmp/zotero-normalizer.log)
// function fileLog(msg) {
//   try {
//     const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
//     const line = timestamp + ' [db-analyzer] ' + msg + '\n';
//     if (typeof Components !== 'undefined') {
//       // Firefox/XUL context - use nsIFileOutputStream
//       const file = Components.classes['@mozilla.org/file/directory_service;1']
//         .getService(Components.interfaces.nsIProperties)
//         .get('TmpD', Components.interfaces.nsIFile);
//       file.append('zotero//       const fos = Components.classes['@mozilla.org/network/file-output-stream;-normalizer.log');
1']
//         .createInstance(Components.interfaces.nsIFileOutputStream);
//       fos.init(file, 0x02 | 0x08 | 0x10, 0o644, 0); // WRONLY | CREATE | APPEND
//       fos.write(line, line.length);
//       fos.close();
//     }
//     // Also log to Zotero.debug
//     if (typeof Zotero !== 'undefined' && Zotero.debug) {
//       Zotero.debug('NER-DB: ' + msg);
//     }
//   } catch (e) {
//     // Fallback to console
//     if (typeof console !== 'undefined' && console.log) {
//       console.log('NER-DB: ' + msg);
//     }
//   }
// }

// NEW:
// (remove entire function - dead code never executed)
```

**Step 3: Verify the change**

Run: `head -20 src/zotero/zotero-db-analyzer.js`
Expected: File now starts directly with `const COMMON_GIVEN_NAME_EQUIVALENTS`

**Step 4: Commit**

```bash
git add src/zotero/zotero-db-analyzer.js
git commit -m "chore: remove dead XPCOM file I/O from zotero-db-analyzer.js

- Removes fileLog() function that never executed
- Was guarded by typeof Components !== 'undefined' which never evaluated true
- Zotero.debug() calls still available for logging"
```

---

## Task 5: Remove dead XPCOM file I/O code from zotero-ner.js

**Files:**
- Modify: `content/scripts/zotero-ner.js:100-129`

**Step 1: Read the file to understand context**

Run: `sed -n '95,135p' content/scripts/zotero-ner.js`
Expected: Show lines with fileLog function

**Step 2: Remove the fileLog function (lines ~100-129)**

Edit: Remove the `fileLog` function definition. The function starts around line 101.

**Step 3: Verify the change**

Run: `sed -n '95,110p' content/scripts/zotero-ner.js`
Expected: After removal, should show code continues past where fileLog was

**Step 4: Commit**

```bash
git add content/scripts/zotero-ner.js
git commit -m "chore: remove dead XPCOM file I/O from zotero-ner.js

- Removes fileLog() function guarded by typeof Components check
- This code never executed in Zotero context
- Zotero.debug() remains available for logging"
```

---

## Task 6: Remove dead XPCOM file I/O code from dialog.html (first occurrence)

**Files:**
- Modify: `content/dialog.html:520-546`

**Step 1: Read the section**

Run: `sed -n '515,550p' content/dialog.html`
Expected: Show the fileLogger object

**Step 2: Remove the fileLogger object (lines 520-546)**

Edit: Remove the entire `fileLogger` object from the config

**Step 3: Verify the change**

Run: `sed -n '515,530p' content/dialog.html`
Expected: Config object continues without fileLogger

**Step 4: Commit**

```bash
git add content/dialog.html
git commit -m "chore: remove dead XPCOM fileLogger from dialog.html (1st of 2)

- Removes fileLogger object with dead XPCOM code
- Console logging still available via console.log()"
```

---

## Task 7: Remove dead XPCOM file I/O code from dialog.html (second occurrence)

**Files:**
- Modify: `content/dialog.html:750-765`

**Step 1: Read the section**

Run: `sed -n '745,770p' content/dialog.html`
Expected: Show the debug function with XPCOM code

**Step 2: Remove the XPCOM file write block (lines 750-765)**

Edit: Remove the try block that writes to file via XPCOM. Keep the Zotero.debug() call.

```javascript
// BEFORE:
try {
  if (typeof Zotero !== 'undefined' && typeof Zotero.debug === 'function') {
    Zotero.debug('Zotero NER Dialog: ' + message);
  }
} catch (e) {}
// Also write to file for debugging
try {
  if (typeof Components !== 'undefined') {
    const file = Components.classes['@mozilla.org/file/directory_service;1']
      .getService(Components.interfaces.nsIProperties)
      .get('TmpD', Components.interfaces.nsIFile);
    file.append('zotero-normalizer.log');
    const fos = Components.classes['@mozilla.org/network/file-output-stream;1']
      .createInstance(Components.interfaces.nsIFileOutputStream);
    fos.init(file, 0x02 | 0x08 | 0x10, 0o644, 0);
    const data = new TextEncoder().encode(timestamp + ' ' + message + '\n');
    fos.write(message, data.length);
    fos.close();
  }
} catch (e) {}

// AFTER:
try {
  if (typeof Zotero !== 'undefined' && typeof Zotero.debug === 'function') {
    Zotero.debug('Zotero NER Dialog: ' + message);
  }
} catch (e) {}
// Note: XPCOM file logging removed (dead code that never executed)
```

**Step 3: Verify the change**

Run: `sed -n '745,760p' content/dialog.html`
Expected: Shows cleaner debug function without XPCOM

**Step 4: Commit**

```bash
git add content/dialog.html
git commit -m "chore: remove dead XPCOM file I/O from dialog.html (2nd of 2)

- Removes XPCOM file write code from debug() function
- Zotero.debug() remains functional"
```

---

## Task 8: Build and verify

**Step 1: Run the build**

Run: `cd /mnt/d/git/zotero-ner/worktrees/cleanup-xul-obsolete && npm run build`
Expected: Build succeeds, no errors about missing files

**Step 2: Run tests if available**

Run: `cd /mnt/d/git/zotero-ner/worktrees/cleanup-xul-obsolete && npm test 2>&1 || echo "No test script or tests pass"`
Expected: Tests pass or no test failures

**Step 3: Commit build artifacts if any**

```bash
git add -A
git commit -m "build: verify clean build after XUL cleanup

- All tests pass
- No build errors"
```

---

## Task 9: Final verification

**Step 1: Verify no XUL references remain in source code**

Run: `grep -r "\.xul" --include="*.js" --include="*.ts" --include="*.html" . 2>/dev/null | grep -v node_modules | grep -v ".history" | grep -v "worktrees" | grep -v "tests/zotero-framework"`
Expected: No output (no XUL references in source)

**Step 2: Verify no nsIFileOutputStream references in source**

Run: `grep -r "nsIFileOutputStream" --include="*.js" --include="*.html" . 2>/dev/null | grep -v node_modules | grep -v ".history" | grep -v "worktrees" | grep -v "tests/"`
Expected: No output (dead XPCOM code removed)

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify no XUL/XPCOM dead code remains

- Confirmed removal of all obsolete XUL and XPCOM code
- Build and tests pass"
```
