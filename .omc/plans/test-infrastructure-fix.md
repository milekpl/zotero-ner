# Test Infrastructure Fix Plan

**Plan saved:** 2026-02-03
**Iteration:** 2 (after Critic feedback)

---

## Context

### Original Request
Fix test infrastructure issues in the Zotero Name Normalizer project:
1. Only one test file runs when `npm run test:zotero` is executed
2. Translator/data files in `.scaffold/test/resource/` may be slowing down tests
3. Add screenshot capability to UI tests for visual verification
4. Verify the progress bar bug fix works correctly

### Current Test Setup Analysis

**package.json testRunner configuration:**
```json
"testRunner": {
  "type": "mocha",
  "testFile": [
    "tests/zotero-framework/test/tests/zotero-ner-test.js",
    "tests/zotero-framework/test/tests/zotero-ner-ui-test.js"
  ],
  "env": {
    "extensions.zotero-name-normalizer.testMode": true
  }
}
```

**PROBLEM IDENTIFIED BY CRITIC:** Both test files are configured as an array, but only `zotero-ner-test.js` runs. The `zotero-plugin` v8.0.8 may NOT support arrays - only the first file may be loaded.

**Test files identified:**
- `/mnt/d/git/zotero-ner/tests/zotero-framework/test/tests/zotero-ner-test.js` - Main tests (runs)
- `/mnt/d/git/zotero-ner/tests/zotero-framework/test/tests/zotero-ner-ui-test.js` - UI tests (doesn't run)

**Scaffold test resource content:**
- `/mnt/d/git/zotero-ner/.scaffold/test/resource/bootstrap.js` - Test runner bootstrap (scaffold framework)
- `/mnt/d/git/zotero-ner/.scaffold/test/resource/manifest.json` - MV2 manifest for test plugin
- `/mnt/d/git/zotero-ner/.scaffold/test/resource/content/chai.js` - Chai assertion library
- `/mnt/d/git/zotero-ner/.scaffold/test/resource/content/mocha.js` - Mocha test framework
- `/mnt/d/git/zotero-ner/.scaffold/test/resource/content/units/zotero-ner.test.js` - Scaffold sample test

**CRITICAL INSIGHT:** The scaffold `bootstrap.js` posts to `localhost:32945/update` - this is a SEPARATE test reporting mechanism that may conflict with our custom test framework.

### Progress Bar Bug Context

**THE BUG:** Progress bar stays visible after analysis completes when it should hide.

**THE FIX (already implemented):**
1. `dialog.html:1037` - Added `ZoteroNER_HTMLUtils.setHidden('progress-container', true)` when results load
2. `dialog.html:2495` - Added `setProgressIndeterminate(true)` for initial animation

**WHAT NEEDS VERIFICATION:**
- The UI test already checks `display === 'none'` (lines 235-238 of zotero-ner-ui-test.js)
- Need to verify THIS TEST ACTUALLY RUNS when `npm run test:zotero` executes

---

## Work Objectives

### Core Objective
Enable both test files to run, add visual verification capability, and verify the progress bar bug fix.

### Deliverables
1. Test runner configuration fixed to run both test files
2. Investigation report on scaffold translator files and potential simplification
3. Screenshot capability added to UI tests
4. Progress bar bug fix verified

### Definition of Done
- `npm run test:zotero` executes both `zotero-ner-test.js` and `zotero-ner-ui-test.js`
- Test output shows results from both test suites
- Report produced on `.scaffold/test/resource/` contents and recommendations
- UI tests can capture screenshots for visual verification
- Progress bar visibility test passes (progress hidden when results displayed)

---

## Must Have / Must NOT Have

### Must Have
- Both test files must execute when `npm run test:zotero` runs
- Test results must show pass/fail counts for both suites
- Progress bar visibility test must verify `display: none` when results loaded
- Screenshot capability must work in headless environment

### Must NOT Have
- Do NOT remove scaffold test resources without investigation
- Do NOT break existing unit tests (`npm run test:unit`)
- Do NOT modify dialog.html unless bug fix is incomplete

---

## Task Flow and Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Test Runner Investigation (BLOCKER)                    │
├─────────────────────────────────────────────────────────────────┤
│ 1.1 → Run `npm run test:zotero` to see current behavior        │
│ 1.2 → READ zotero-plugin source to verify array support         │
│ 1.3 → Identify why only one test file loads                     │
│                                                              │
│ Dependencies: None                                             │
└─────────────────────────────────────────────────────────────────┘
           ↓ (Must complete - determines all downstream work)
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Test Runner Configuration Fix                          │
├─────────────────────────────────────────────────────────────────┤
│ 2.1 → If array NOT supported: create combined test entry point │
│ 2.2 → If UI test has errors: fix syntax/loading issues         │
│ 2.3 → Verify both test files load (check test output)           │
│                                                              │
│ Depends on: 1.3                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────┬───────────────────┬─────────────────────────┐
│ PHASE 3: Scaffold │ PHASE 4: Screenshot │ PHASE 5: Progress Bar │
│ Resource Invest  │ Capability         │ Verification            │
├──────────────────┼───────────────────┼─────────────────────────┤
│ 3.1 → Catalog    │ 4.1 → Research     │ 5.1 → Read current      │
│     .scaffold/   │    XUL screenshot  │     progress bar tests  │
│                  │    limitations     │                        │
├──────────────────┼───────────────────┼─────────────────────────┤
│ 3.2 → Check what │ 4.2 → Acknowledge  │ 5.2 → Confirm existing  │
│     is actually  │    XUL cannot use  │     tests check        │
│     used by tests│    canvas directly │     display:none       │
├──────────────────┼───────────────────┼─────────────────────────┤
│ 3.3 → Document   │ 4.3 → DECIDE: Use  │ 5.3 → Run tests and     │
│     safe-to-     │    external capture│     verify test passes  │
│     remove files │    (xvfb) or skip  │                        │
├──────────────────┴───────────────────┴─────────────────────────┤
│              All 3 phases can run in PARALLEL                    │
│                 after Phase 2 completes                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Tasks with Acceptance Criteria

### Task 1: Run current test suite and document behavior
**File:** N/A (diagnostic task)

**Acceptance criteria:**
- [ ] `npm run test:zotero` executes successfully
- [ ] Console output shows which test file(s) loaded
- [ ] Count of tests passed/failed recorded
- [ ] UI test file presence verified in output

---

### Task 2: Investigate zotero-plugin test runner configuration
**File:** `package.json` (read for reference), zotero-plugin source code

**Acceptance criteria:**
- [ ] **CRITICAL**: Read zotero-plugin v8.0.8 source code to verify `testFile` array support
- [ ] **CRITICAL**: If array NOT supported, identify alternative (combined entry point, glob pattern, etc.)
- [ ] Root cause of single-file execution documented
- [ ] Solution approach confirmed (array fix OR single-file workaround)

**Reference for Task 5:** To check if scaffold resources are safe to remove:
- Look at what `.scaffold/test/resource/bootstrap.js` actually loads
- Check if our test files use ANY scaffold-provided utilities
- If they only use Zotero APIs and our own code, scaffold resources may be simplified

---

### Task 3: Fix test runner configuration
**File:** `/mnt/d/git/zotero-ner/package.json`

**Acceptance criteria:**
- [ ] package.json testRunner configuration updated
- [ ] Both test files explicitly listed in correct order
- [ ] `npm run test:zotero` runs and reports from both files
- [ ] Combined test results visible in output

---

### Task 4: Document scaffold test resources
**File:** `.omc/drafts/scaffold-resources-report.md`

**Acceptance criteria:**
- [ ] All files in `.scaffold/test/resource/` cataloged
- [ ] Purpose of each file documented
- [ ] Whether files are used by test runner identified
- [ ] Size/load time impact estimated

---

### Task 5: Determine if scaffold resources can be simplified
**File:** `/mnt/d/git/zotero-ner/.scaffold/test/resource/` (may modify)

**Acceptance criteria:**
- [ ] Investigation of scaffold bootstrap.js complete
- [ ] Translator files identified as needed or unused
- [ ] Safe-to-remove files documented
- [ ] Recommendation: keep, simplify, or remove

---

### Task 6: Research screenshot methods for Zotero dialogs
**Files:** `/mnt/d/git/zotero-ner/tests/zotero-framework/test/tests/zotero-ner-ui-test.js`

**Acceptance criteria:**
- [ ] **CRITICAL LIMITATION ACKNOWLEDGED**: Tests run in XUL/chrome context - canvas/dom-to-image may not work
- [ ] Method identified for capturing Zotero dialog DOM to image OR confirmation that it's not possible from within Zotero
- [ ] Alternative: Use external xvfb screenshot capture after test (not within Zotero)
- [ ] Decision documented: screenshot IN test vs. external capture

---

### Task 7: Add screenshot capability (OR document limitation)
**File:** `/mnt/d/git/zotero-ner/tests/zotero-framework/test/tests/zotero-ner-ui-test.js`

**Acceptance criteria:**
- [ ] IF possible: `captureScreenshot(filename)` function added that works in XUL context
- [ ] IF possible: Saves to configurable output directory
- [ ] IF NOT possible: Document this limitation and explain external capture approach
- [ ] Decision: Implement internal OR document external approach clearly

---

### Task 8: Verify progress bar tests exist AND run
**File:** `/mnt/d/git/zotero-ner/tests/zotero-framework/test/tests/zotero-ner-ui-test.js`

**Background:** Tests for progress bar hiding ALREADY EXIST (lines 235-238 check `display === 'none'`)

**Acceptance criteria:**
- [ ] CONFIRM existing test structure: `progress-container.style.display === 'none'` check exists
- [ ] **THE KEY VERIFICATION**: When `npm run test:zotero` runs, does THIS TEST actually execute?
- [ ] If test runs and passes: Progress bar bug fix is verified working
- [ ] If test doesn't run: This is a test runner issue (go back to Task 2)
- [ ] If test runs but fails: Progress bar bug fix is incomplete (fix dialog.html)

---

### Task 9: Run full test suite and verify all pass
**File:** N/A (verification task)

**Acceptance criteria:**
- [ ] `npm run test:zotero` completes successfully
- [ ] Main test suite: all tests pass (or known failures documented)
- [ ] UI test suite: all tests pass (or known failures documented)
- [ ] Progress bar visibility test passes
- [ ] Screenshot on failure mechanism tested

---

## Commit Strategy

| Task | Commit Message |
|------|----------------|
| 1 | "diagnostic: Run test suite to document current behavior" |
| 2 | "docs: Document zotero-plugin test runner configuration" |
| 3 | "fix: Configure test runner to load both test files" |
| 4 | "docs: Catalog scaffold test resource contents" |
| 5 | "refactor: Simplify scaffold test resources if safe" |
| 6 | "research: Screenshot methods for Zotero dialogs" |
| 7 | "feat: Add screenshot capture to UI tests" |
| 8 | "test: Verify progress bar hides when results loaded" |
| 9 | "verification: Run full test suite and confirm all pass" |

---

## Success Criteria

### Functional Success
1. `npm run test:zotero` executes BOTH test files
2. Combined test output shows results from `zotero-ner-test.js` and `zotero-ner-ui-test.js`
3. UI tests include screenshot capture capability
4. Progress bar visibility test passes (asserts `display: none` when results displayed)

### Quality Success
1. All existing tests continue to pass
2. Scaffold resources documented and optimized if possible
3. Visual verification capability available for future debugging

### Performance Success
1. Test execution time measured before/after optimization
2. Scaffold resource loading time impact quantified

---

## Notes

### CRITICAL INSIGHT: Scaffold Bootstrap Has Own Reporting
The scaffold `.scaffold/test/resource/bootstrap.js` posts to `localhost:32945/update` - this is a SEPARATE test reporting mechanism that may conflict with our custom test framework.

**This means:**
- Scaffold runs ITS OWN tests from `content/units/zotero-ner.test.js`
- Our tests in `tests/zotero-framework/test/tests/` may be loading in a DIFFERENT context
- The two systems may not share results

### Test Runner Investigation Needed
The `zotero-plugin` package version is `^8.0.8`. The test runner uses Mocha but the configuration may only support a single `testFile` despite accepting an array in package.json.

### Potential Issues
1. Mocha may only load the first file in the array
2. Test files may need to be concatenated or loaded via glob pattern
3. The UI test file may have syntax errors preventing loading
4. Two different test reporting mechanisms (scaffold vs. custom) may be in conflict

### Alternative Approaches
1. If array doesn't work, create a combined test entry point that imports both test suites
2. Use Mocha's `--grep` to run specific tests across files
3. Investigate `zotero-plugin` source for test loading behavior
4. Remove scaffold test resources if they're not actually being used by our tests
