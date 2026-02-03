# Automated UI Testing with Zotero - Work Plan

**Created:** 2026-01-25
**Status:** Ready for Review

## Executive Summary

This plan outlines a comprehensive automated testing infrastructure for the Zotero Name Normalizer extension that runs **within Zotero's actual environment**, using Zotero's internal Mocha test framework. Tests will verify both core functionality and UI interactions, with CI/CD integration for GitHub Actions.

## Research Findings

### Zotero's Testing Framework

Based on analysis of the [official Zotero repository](https://github.com/zotero/zotero):

- **Test Framework:** Mocha (`^10.4.0`) with Chai assertions (`^4.1.2`)
- **Assertion Library:** Chai with `assert.strictEqual()`, `assert.isTrue()`, `assert.throws()`, etc.
- **Test Location:** `test/tests/` directory with 103+ test files
- **Test Execution:** `test/runtests.sh` launches Zotero with `-test` flag
- **Pattern:** `describe()` / `it()` blocks following Mocha conventions

### Test Execution Command

```bash
ZOTERO_TEST=1 zotero -profile <profile> -test <tests> -grep <pattern>
```

### Configuration Options
- `-f`: Stop after first failure (bail mode)
- `-c`: Open JS console, don't quit
- `-d LEVEL`: Debug logging level
- `-g PATTERN`: Filter tests by pattern

## Current State Analysis

### Existing Test Infrastructure

| Component | Location | Status |
|-----------|----------|--------|
| Jest Unit Tests | `tests/core/`, `tests/zotero/`, etc. | 40+ test files exist |
| Zotero Integration | `tests/zotero-integration/` | Basic runner exists |
| Zotero Framework Tests | `tests/zotero-framework/` | Mocha template exists |
| Playwright UI Tests | `playwright-tests/ui/` | Basic tests exist |

### Gaps Identified

1. **No Zotero Mocha Integration Tests** - Tests aren't running within Zotero's test framework
2. **No CI/CD Integration** - GitHub Actions doesn't run Zotero in-browser tests
3. **No UI Automation Tests** - Dialogs and menus not tested automatically
4. **No Test Profile Management** - Profile setup is manual

## Implementation Plan

### Phase 1: Test Framework Integration (Week 1)

#### 1.1 Create Zotero-Compatible Test Suite

**Task:** Convert existing tests to Zotero Mocha format

**Files to Create/Modify:**
- `tests/zotero-framework/test/tests/zoteroNerTest.js` - Main Mocha test file

**Test Categories:**
```javascript
describe("Zotero Name Normalizer Extension", function () {
    describe("Extension Loading", function () {
        it("should have Zotero.NER defined");
        it("should have all submodules initialized");
    });
    describe("Name Parser", function () {
        it("should parse full names");
        it("should handle initials");
        it("should handle Spanish prefixes");
    });
    describe("Learning Engine", function () {
        it("should store mappings");
        it("should retrieve mappings");
        it("should calculate similarity scores");
    });
    // ... more categories
});
```

#### 1.2 Create Test Profile Generator

**Task:** Automate test profile creation with extension installed

**File to Create:**
- `tests/zotero-framework/create-test-profile.js`

**Functionality:**
- Create temporary Firefox profile
- Install extension from built .xpi
- Configure test preferences
- Clean up after tests

#### 1.3 Create Test Runner Wrapper

**File to Create:** `tests/zotero-framework/runtests.js`

**Functionality:**
- Launch Zotero with test flags
- Parse test output
- Generate JUnit XML for CI
- Report pass/fail status

### Phase 2: Core Functionality Tests (Week 2)

#### 2.1 Name Parser Tests

**Test Cases:**
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Full name | "John Smith" | firstName: "John", lastName: "Smith" |
| Initial | "J. Smith" | firstName: "J.", lastName: "Smith" |
| Double surname | "Juan van der Berg" | lastName: "van der Berg" |
| Hyphenated | "Mary-Jane Doe" | lastName: "Doe" |
| Prefix | "Dr. Jane Smith" | prefix: "Dr." |

#### 2.2 Learning Engine Tests

**Test Cases:**
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Store mapping | `storeMapping('Smyth', 'Smith', 0.9)` | Mapping persisted |
| Retrieve mapping | `getMapping('Smyth')` | Returns normalized name |
| Similarity | Jaro-Winkler similarity | Correct score (0.0-1.0) |
| Persistence | Reload Zotero | Mappings still exist |

#### 2.3 Candidate Finder Tests

**Test Cases:**
- Find similar surnames (Smith/Smyth)
- Filter by threshold
- Generate variant pairs

#### 2.4 NER Processor Tests

**Test Cases:**
- Extract authors from text
- Match against known mappings
- Handle edge cases

### Phase 3: UI Integration Tests (Week 3)

#### 3.1 Dialog Tests

**File to Create:** `tests/zotero-framework/test/tests/dialogTest.js`

**Test Cases:**
| Test | Description |
|------|-------------|
| Dialog opens | Click menu item, dialog appears |
| Dialog closes | Click close button, dialog hides |
| Item list displays | Shows creator items |
| Normalization applies | Clicking normalize updates item |
| Multiple selections | Handle multiple creators |

#### 3.2 Menu Integration Tests

**File to Create:** `tests/zotero-framework/test/tests/menuTest.js`

**Test Cases:**
| Test | Description |
|------|-------------|
| Menu item exists | Check Tools menu for NER item |
| Click opens dialog | Verify dialog opens |
| Batch process works | Process selected items |
| Progress indicator | Shows processing progress |

#### 3.3 Item Processor Tests

**File to Create:** `tests/zotero-framework/test/tests/itemProcessorTest.js`

**Test Cases:**
| Test | Description |
|------|-------------|
| Extract creators | Get creators from item |
| Normalize names | Apply normalization |
| Save changes | Persist to database |
| Undo support | Restore original names |

### Phase 4: CI/CD Integration (Week 4)

#### 4.1 GitHub Actions Workflow

**File to Create:** `.github/workflows/test-zotero.yml`

**Jobs:**
```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run test:unit

  zotero-integration:
    runs-on: ubuntu-latest
    container: node:20
    steps:
      - uses: actions/checkout@v4
      - name: Setup Firefox
        run: apt-get install -y firefox
      - name: Build Extension
        run: npm run build
      - name: Run Zotero Tests
        run: node tests/zotero-framework/runtests.js
```

#### 4.2 Zotero Cache Setup

**Purpose:** Cache Zotero installation to speed up CI

**Steps:**
```yaml
- name: Cache Zotero
  id: cache-zotero
  uses: actions/cache@v4
  with:
    path: ~/.zotero
    key: zotero-${{ runner.os }}-v6
```

#### 4.3 Test Results Publishing

**Artifacts:**
- JUnit XML test results
- HTML test report
- Screenshots on failure

#### 4.4 Quality Gates

| Gate | Condition |
|------|-----------|
| Unit Tests | All 40+ tests pass |
| Integration Tests | Core tests pass |
| Linting | ESLint passes |
| Build | Extension builds successfully |

### Phase 5: Advanced Features (Week 5+)

#### 5.1 Regression Test Suite

**Purpose:** Prevent bugs from recurring

**Implementation:**
- Track bugs as test cases
- Add test when bug is fixed
- Run regression suite on PRs

#### 5.2 Performance Benchmarks

**Metrics:**
- Name parsing time (< 10ms per name)
- Database analysis time
- Dialog open time (< 500ms)

#### 5.3 Cross-Platform Testing

**Platforms:**
- Linux (Ubuntu)
- macOS
- Windows

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `.github/workflows/test-zotero.yml` | CI/CD workflow |
| `tests/zotero-framework/runtests.js` | Test runner |
| `tests/zotero-framework/create-test-profile.js` | Profile generator |
| `tests/zotero-framework/test/tests/dialogTest.js` | Dialog tests |
| `tests/zotero-framework/test/tests/menuTest.js` | Menu tests |
| `tests/zotero-framework/test/tests/itemProcessorTest.js` | Item tests |
| `tests/zotero-framework/test/tests/fullWorkflowTest.js` | E2E tests |

### Modified Files

| File | Change |
|------|--------|
| `tests/zotero-framework/test/tests/zoteroNerTest.js` | Expand coverage |
| `package.json` | Add test scripts |
| `jest.config.js` | Update for CI |

## Test Coverage Matrix

| Category | Tests | Priority |
|----------|-------|----------|
| Extension Loading | 5 | Critical |
| Name Parser | 15 | Critical |
| Learning Engine | 10 | Critical |
| Candidate Finder | 8 | High |
| NER Processor | 12 | High |
| Dialog UI | 15 | High |
| Menu Integration | 8 | High |
| Item Processor | 12 | High |
| Database Analyzer | 6 | Medium |
| Full Workflow | 10 | Medium |

**Total:** ~100 test cases

## Dependencies

### External

- Zotero 7.x - Target application
- Firefox - Browser for UI tests
- Node.js 18+ - Test runner
- GitHub Actions - CI/CD

### Internal

- All `src/*` modules
- Existing Jest tests

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zotero version changes | Tests break | Pin Zotero version in CI |
| UI changes | Tests fail | Use stable selectors |
| Slow CI runs | Developer feedback delay | Cache dependencies |
| Profile issues | Tests inconsistent | Use fresh profile each run |
| Extension loading failures | Tests hang | Add timeout and health checks |

## Success Criteria

### Phase 1
- [ ] Mocha tests compile without errors
- [ ] Test profile generates correctly
- [ ] Basic tests pass

### Phase 2
- [ ] All core modules tested
- [ ] 40+ unit tests pass
- [ ] Code coverage > 80%

### Phase 3
- [ ] Dialog tests pass
- [ ] Menu tests pass
- [ ] Item processor tests pass

### Phase 4
- [ ] CI/CD passes on all platforms
- [ ] Tests run in < 10 minutes
- [ ] Results published to GitHub

### Phase 5
- [ ] Regression suite complete
- [ ] Performance benchmarks in place
- [ ] Cross-platform tests pass

## Next Steps

1. **Approve this plan** - Review and approve
2. **Phase 1 start** - Begin with test profile generator
3. **Infrastructure setup** - Configure CI/CD
4. **Iterate** - Add tests incrementally

## References

- [Zotero Source Code](https://github.com/zotero/zotero)
- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

*Generated by Claude Code - Planning Session*
