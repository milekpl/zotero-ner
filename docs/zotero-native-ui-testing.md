# Zotero-Native UI Testing (CI) — Spec + Implementation Plan

## Summary
This document specifies and plans **Zotero-native UI testing** for the Zotero NER plugin, where tests run **inside a real Zotero instance** (chrome context) and validate behavior through **DOM/state assertions**.

Key properties:
- Runs in **Linux CI** (GitHub Actions) under **Xvfb**.
- No Playwright / OS-level automation.
- No screenshots.
- Strong diagnostics: **continuous debug print loop** while the external runner waits.

---

## Goals
- Provide a CI-gated, repeatable UI test harness that:
  - Opens the real plugin dialog(s) the same way the user does.
  - Injects deterministic test data (no reliance on the user’s library).
  - Asserts UI state via stable DOM anchors.
  - Produces machine-readable results and exits CI with correct status.
- Make failures actionable by:
  - Streaming Zotero stdout/stderr to CI logs.
  - Printing periodic “still waiting” heartbeats.
  - Uploading the test profile/logs as CI artifacts.

## Non-goals
- Playwright/Selenium-style end-to-end automation.
- Screenshot diffs / visual testing.
- Stress/perf testing (beyond basic timeouts).

---

## Constraints & Assumptions
- Tests run in a **throw-away Zotero profile** created per run.
- Zotero must run with an X server in CI; prefer `xvfb-run`.
- UI tests must not rely on unbounded timeouts.
- Cross-platform: avoid hardcoding `/tmp` for results/logs; prefer paths inside the generated profile.

---

## Existing Entry Points (current repo shape)
This plan builds on existing harness pieces:
- A Node runner that builds, creates a test profile, launches Zotero, and waits for a results JSON.
- A test-mode preference (e.g., `extensions.zotero-ner.testMode`) used to gate test behavior.
- An in-Zotero test harness that can run a suite and write results.

This doc intentionally avoids duplicating exact file paths/line references; keep them in code comments and commit diffs.

---

## Architecture

### 1) External orchestrator (Node)
Responsibilities:
- Build the extension bundle.
- Create/clean a dedicated test profile directory.
- Install/copy extension files into the test profile.
- Launch Zotero pointing at that profile.
- Wait for a single results file to appear.
- Print a concise summary + exit non-zero on failures/timeouts.

**Diagnostics requirement (critical):**
- The runner must implement a **debug print loop**:
  - Every N seconds, print a heartbeat: elapsed time, process status.
  - Tail and print “interesting” Zotero output lines.
  - On timeout/failure: dump buffered output + point to artifacts.

### 2) In-Zotero test harness
Responsibilities:
- In `testMode`, register and execute test suites.
- Support Mocha-style tests (preferred) or a minimal fallback harness.
- Ensure Zotero exits after tests finish.
- Write results JSON to a known location.

### 3) UI test suite
Responsibilities:
- Open the plugin dialog in the same way production code does.
- Inject deterministic input (analysis/variants) through an explicit test-only channel.
- Assert DOM/state changes:
  - initial empty state
  - variants rendered
  - selecting a variant updates details panel
  - recommended normalization/formatting changes

### 4) Results + artifacts
- Results JSON is written to a predictable path inside the test profile directory.
- CI uploads:
  - results JSON
  - any test trace logs (optional)
  - the test profile directory (preferred on failure)

---

## Determinism Model (UI tests)
UI tests must be deterministic by design:
- Never depend on the user’s real Zotero database.
- Prefer an injected “analysis payload” for dialog rendering.
- Avoid network and heavy model inference in UI tests.
- Bound all waits with explicit timeouts.

### Recommended injection pattern
- When `testMode` is enabled:
  - Provide a test API that sets dialog input payloads.
  - Open the dialog and read payload from `window.opener` or dialog args.

This keeps tests stable and avoids mixing concerns between UI tests and NER pipeline correctness.

---

## UI Assertions (no screenshots)
Recommended assertion types:
- **Presence/visibility**: element exists, not hidden.
- **State**: class/attribute indicates selected/recommended variant.
- **Text**: contains expected normalized name or recommendation.
- **Flow**: click pill → details panel updates.

To avoid brittle selectors:
- Prefer stable IDs already present in the dialog.
- Avoid deep CSS selectors.

---

## Result Format (contract)
Write a single JSON file (within the test profile directory) with this shape:

```json
{
  "passed": 3,
  "failed": 1,
  "timedOut": false,
  "duration": 12345,
  "tests": [
    {
      "name": "UI: dialog opens",
      "status": "pass"
    },
    {
      "name": "UI: selecting a variant shows details",
      "status": "fail",
      "error": "Expected #variant-detail-panel to be visible"
    }
  ]
}
```

**Exit code contract:**
- Exit `0` if `failed === 0` and no fatal error.
- Exit `1` if any test fails, or harness errors, or timeout.

---

## CI Spec (Linux GitHub Actions)

### Why Linux
Linux runners are widely available and stable for GUI apps under Xvfb.

### Required CI behavior
- Start Zotero under Xvfb via `xvfb-run -a`.
- Ensure the runner **does not override `DISPLAY`** when CI provides it.

### Conceptual CI steps
1. Checkout
2. Install system deps (`xvfb`, GTK/DBus libs as needed)
3. Download Zotero and export `ZOTERO_PATH`
4. `npm ci`
5. `npm run build` (or runner builds internally)
6. Run: `xvfb-run -a node tests/zotero-framework/run-zotero-tests.js --debug`
7. Upload artifacts on failure

---

## Implementation Plan

### Phase 1 — Make the runner CI-robust (foundation)
Deliverables:
- Results path moved from `/tmp/...` to a file inside the generated test profile.
- Runner respects externally-provided `DISPLAY` (works under `xvfb-run`).
- Debug print loop:
  - Heartbeat every 10s
  - Output tail on heartbeat
  - Full dump on timeout
- CI job uses `xvfb-run` and uploads artifacts on failure.

Success criteria:
- CI can launch Zotero reliably and always produce a results JSON.
- On induced failure, CI logs clearly show where to look (results + artifacts).

### Phase 2 — First Zotero-native UI tests (minimum viable)
Deliverables:
- A UI suite that runs in-Zotero and asserts:
  1) Dialog opens and initial empty state is correct.
  2) Injected variants render into the list.
  3) Clicking a variant updates the detail panel.
- A small set of UI helpers (wait/click/assert) colocated with the suite.

Success criteria:
- 3–5 UI tests pass in CI 10 times in a row.
- Failure output includes:
  - Which DOM ID failed
  - Current key state (e.g., selected variant)

### Phase 3 — Coverage expansion + de-flaking
Deliverables:
- Port remaining UI scenarios (currently covered elsewhere) into Zotero-native suites.
- Add negative tests (missing data, disabled actions).
- Add per-test time budgets and consistent cleanup.

Success criteria:
- <1% flake rate over 20 CI runs.
- “Most failures are actionable without rerun.”

---

## Debug Print Loop (external runner) — Requirements
The runner must:
- Stream Zotero stdout/stderr when `--debug` is enabled.
- In CI (or `--debug`), print periodic:
  - elapsed time
  - last N lines of “interesting” output
- On timeout/failure:
  - dump buffered output
  - print the test profile location
  - print the path to results JSON

---

## Open Questions (to settle during implementation)
- Where to store the results JSON:
  - Prefer `${TEST_PROFILE_DIR}/zotero-ner-test-results.json`.
- How to capture Zotero debug logs most reliably:
  - Prefer uploading the whole profile dir.
- Whether to run UI tests on every PR or on a nightly schedule:
  - Recommended: PR gating once Phase 2 stability criteria are met.
