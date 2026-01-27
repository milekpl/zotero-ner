
## Plugin Development Harness (Scaffold + “zotero‑plugin” Template)

## Zotero-Native UI Testing (CI)

See [docs/zotero-native-ui-testing.md](docs/zotero-native-ui-testing.md) for the spec + implementation plan to run DOM/state-based UI tests **inside Zotero** in Linux CI (no Playwright, no screenshots).

For general desktop plugins (Zotero 7/8 add‑ons), authors use a Node‑based scaffold/template that does two things:

1. Provides a **development harness** (compile → load into Zotero → auto‑reload on change).  
2. Provides a **test runner hook** (`zotero‑plugin test`) that can be hooked up to Mocha.

The canonical implementation is the **Zotero Plugin Template** plus **zotero‑plugin‑scaffold**.

### 3.1 Dev harness: auto‑hot‑reload

The template projects (e.g., `windingwind/zotero-plugin-template`, `denismaier/zotero-plugin-test`) define scripts like:

```json
"scripts": {
  "start": "zotero-plugin serve",
  "build": "zotero-plugin build && tsc --noEmit",
  "test": "zotero-plugin test",
  "release": "zotero-plugin release",
  "lint:check": "prettier --check . && eslint .",
  "lint:fix": "prettier --write . && eslint . --fix"
}
```

And in some templates:

```json
"scripts": {
  "reload": "node scripts/reload.mjs",
  "watch": "chokidar 'src/**' 'addon/**' -c 'npm run reload'",
  "start-watch": "npm run reload && npm run watch"
}
```

**What the dev harness does:**

- **Build step**:
  - Uses `esbuild` to compile TypeScript sources (`./src`) to JS in the plugin’s `addon/chrome/content/scripts` tree.[2]
  - Copies the `addon/` directory to a build location (e.g., `.scaffold/build/addon`), replacing version and timestamp placeholders, then zips it into an `.xpi`.[2]

- **Serve / start‑watch**:
  - Starts Zotero with a specified dev profile and loads the plugin from the build directory.
  - Watches `src/**` and `addon/**` with `chokidar`: on any change, recompiles and reloads the plugin into the running Zotero instance.[2][3]

This doesn’t by itself give assertions, but it *is* a harness for repeatedly exercising your plugin against Zotero with minimal friction.

### 3.2 Test harness: `zotero‑plugin test` (Mocha‑based)

The same ecosystem (template + scaffold) supports **running tests directly inside Zotero** via Mocha:

- In `package.json`, plugins built with the template almost always define:

  ```json
  "test": "zotero-plugin test"
  ```

- The npm `zotero-plugin` package wires this to:
  - Start Zotero in a special **test profile** (isolated from the user’s profile).
  - Load the plugin from the build output.
  - Run **Mocha** tests (JS/TS) in the plugin context using the same Mocha framework used by Zotero itself and Mozilla projects.[4]

From the Zotero‑dev discussion, XY Wong describes this pipeline as:

> *“A plugin testing pipeline… uses the Mocha testing framework… enables testing directly in Zotero and supports both JavaScript and TypeScript test scripts. The structure and logic align closely with the Zotero client’s existing tests. The pipeline can run tests locally or in a headless environment via GitHub Actions.”*[4]

**How a typical Mocha test harness looks conceptually**

Although we don’t have a full test file excerpt, the pattern is:

1. `npm test` (alias of `zotero-plugin test`).  
2. `zotero-plugin test`:
   - Starts Zotero with a test profile and loads the plugin.
   - Exposes a test API to Mocha (e.g., helpers for finding items, menus, invoking plugin commands).
   - Runs Mocha’s `describe`/`it` tests, typically stored under a `test/` directory in the plugin repo.

**Intended usage**

- Unit‑style tests for plugin logic (e.g., processing functions), and  
- “Light” integration tests (e.g., asserting that menu items exist, preferences panes load, actions don’t throw errors) running **against a live Zotero instance**, but with a controlled, throw‑away profile.

---

## 4. Full E2E Harness using a Dedicated Test Profile (Better BibTeX)

The **Better BibTeX for Zotero (BBT)** plugin is the best documented example of a full e2e harness that tests deep behavior (citekey generation, export, prefs) inside a running Zotero.

### 4.1 Isolation and data safety

BBT is explicit that its tests run in a separate profile and will delete that profile:

- Tests create and use a Zotero profile named **`BBTTEST`**.  
- Every time you run the tests, the `BBTTEST` profile is **clobbered** (overwritten).[5]
- To avoid accidental data corruption:
  - You’re instructed to move `~/Zotero` aside (e.g. `mv ~/Zotero ~/Zotero.saved` and `touch ~/Zotero`), so Zotero’s data directory is not your real library.
  - BBT starts Zotero with `-datadir profile -P BBTTEST` so that everything lives inside that test profile.[5][6]

### 4.2 Harness stack

The BBT harness uses a multi‑language stack:

1. **Node** – builds the plugin and its XPI; `npm test` is the standard entry point.[6]  
2. **Python `behave`** – BDD‑style test runner, configured by `behave.ini` to look at `test/features`.[7]  
3. **Zotero + Debug Bridge** – tests talk to Zotero via a “debug bridge” configuration, allowing remote scripting of the running Zotero and the BBT plugin.[8]

From the BBT docs:

- To run tests:

  ```bash
  git clone https://github.com/retorquere/zotero-better-bibtex.git
  cd zotero-better-bibtex
  pip3 install -r requirements.txt
  npm install
  npm run build
  npm test            # runs behave & launches Zotero in BBTTEST profile
  ```

- Or more directly:

  ```bash
  ./test/behave --tags @438
  ```

  which:  
  > *“Zotero will pop up, load the test library, executes one test, and shuts down.”*[6]

- A log file is written to `~/.BBTTEST.log`. The harness ensures your regular library is not touched if you follow the preparatory steps.[6]

### 4.3 What gets tested

The `behave` feature files express high‑level e2e scenarios, such as:

- Generating citation keys under different preference combinations.  
- Exporting items and comparing BibTeX/BibLaTeX output.  
- Automatic export triggers, caching behavior, etc.

Because the harness runs a *real Zotero*, this is true e2e behavior: plugin UI and background services run as they do in a user’s environment, but against a throw‑away library and profile.

**Key idea**  
BBT shows a pattern for **heavy e2e testing**:

- **Dedicated profile** (safely destroyed each run).
- **External orchestrator (Python behave)** controlling Zotero through a debug bridge.
- **Node build step** to ensure the tested plugin is freshly built.

---

## 5. How These Harnesses Are Used in CI / Automation

From the Zotero‑dev mailing list:

- The Mocha‑based pipeline (`zotero-plugin test`) was explicitly designed to be **CI‑friendly** and used from **GitHub Actions**, including headless runs.[4]
- BBT’s test suite is run heavily by its maintainer; every commit is typically tested, and the harness is used to gate releases.[6]

**Typical CI pattern for a plugin using the template/scaffold:**

1. Install Node, Python (if needed) on CI runner.  
2. `npm install` (and `pip install -r requirements` if using Python).  
3. `npm run build`.  
4. `npm test` (Mocha inside Zotero or Python + behave inside Zotero, depending on project).

This ensures every commit is tested against an actual Zotero environment.

---

## 6. Practical Guidance: How to Build a Harness for Your Own Zotero Plugin

Based on the above, here are actionable patterns you can emulate.

### 6.1 If you’re writing a translator

1. **Embed tests in the translator**:
   - Add a `var testCases = [...]` block as per the doc, with representative URLs and expected item data.[1]
2. **Use Scaffold to run them**:
   - Open `Tools → Developer → Translator Editor`.
   - Use the **Tests** and **Testing** tabs to run and refine cases.
3. **Handle dynamic sites**:
   - Add `"defer": true` to tests that fail due to DOM not being ready on load.

This gives you a stable, versioned e2e harness for the translator itself.

### 6.2 If you’re writing a general plugin and want continuous e2e coverage

1. **Start from Zotero Plugin Template**[2]:
   - Use it as a GitHub template.
   - `npm install`, then `npm start` or `npm run start-watch` for hot‑reload.

2. **Add Mocha tests** and wire them to `zotero-plugin test`:
   - Put tests under `test/` using `describe/it` (Mocha style).
   - Use whatever helpers `zotero-plugin` or your own code provides to:
     - Open a known library state (e.g., a pre‑loaded test Zotero DB).
     - Trigger plugin actions (UI commands, background operations).
     - Assert expected side effects (new items, changed metadata, etc.).

3. **Use a dedicated test profile**:  
   - Ensure your `zotero-plugin` config or your test harness uses a **dedicated profile** that’s safe to blow away between tests (mirroring the BBT `BBTTEST` pattern).

4. **Run in CI**:  
   - Add a GitHub Action step to run `npm test`.  
   - For more complex scenarios, follow BBT’s approach: use Python/behave if you want BDD‑style tests driving Zotero through a debug bridge.

---

## 7. Summary

Zotero plugins and translators are tested against Zotero in three main ways:

- **Translator harness inside Zotero** via `testCases` JSON and Scaffold: embedded test specifications run inside Zotero’s translation engine, ideal for import/web/search translators.[1]

- **Node‑based plugin harness** via Zotero Plugin Template and zotero‑plugin‑scaffold:
  - Development harness with compile‑and‑reload (auto hot‑reload).  
  - Mocha‑based testing pipeline (`zotero-plugin test`) that loads the plugin in a dedicated Zotero profile and runs JS/TS tests.[2][3][4]

- **Full e2e harness with dedicated test profile** as in Better BibTeX:
  - Separate profile (`BBTTEST`) that is destroyed each run.  
  - Python `behave` tests (BDD) orchestrating a running Zotero via a debug bridge.  
  - Node build and test commands integrating everything into `npm test`.[5][6][7][8]

Together, these patterns show a mature ecosystem for e2e/integration testing: plugins are tested not just with unit tests, but through dedicated profiles and test runners that exercise real Zotero instances while keeping user data safe.

---

### References

[1] DEV:TRANSLATORS:TESTING. <https://www.zotero.org/support/dev/translators/testing>  
[2] ZOTERO PLUGIN TEMPLATE (README). <https://github.com/windingwind/zotero-plugin-template>  
[3] ZOTERO-PLUGIN-SCAFFOLD (README). <https://github.com/northword/zotero-plugin-scaffold>  
[4] TESTING/CONTINUOUS INTEGRATION FOR PLUGINS? (zotero-dev thread). <https://groups.google.com/g/zotero-dev/c/LQQLXaBhnew>  
[5] RUNNING THE BBT TEST SUITE. <https://retorque.re/zotero-better-bibtex/support/tests/index.html>  
[6] CONTRIBUTING (Better BibTeX for Zotero). <https://github.com/retorquere/zotero-better-bibtex/blob/master/CONTRIBUTING.md>  
[7] BEHAVE.INI (Better BibTeX). <https://github.com/retorquere/zotero-better-bibtex/blob/master/behave.ini>  
[8] DEBUG-BRIDGE README (Better BibTeX test fixtures). <https://github.com/retorquere/zotero-better-bibtex/blob/master/test/fixtures/debug-bridge/README.md>