# Plan: Address Code Review Medium Priority Issues

## Overview
Consolidate duplicate code and fix code quality issues identified in the code review.

## Verified Issue Locations

### Duplicate Levenshtein Distance Implementation
| File | Lines | Function Name | Note |
|------|-------|---------------|------|
| `src/core/ner-processor.js` | 189-219 | `levenshteinDistance()` | Raw distance |
| `src/zotero/zotero-db-analyzer.js` | 1279-1315 | `calculateStringSimilarity()` | Normalized 0-1 |
| `tests/core/ner-processor.test.js` | 187-323 | Inline helpers | 3 duplicates in tests |

### Duplicate Prefix/Suffix Arrays
| File | Lines |
|------|-------|
| `src/core/name-parser.js` | 6-7 |
| `src/core/ner-processor.js` | 36-37 |
| `src/core/gliner-handler.js` | 123-124 |

### Large Functions to Refactor
| File | Function | Lines | Refactor Target |
|------|----------|-------|-----------------|
| `src/zotero/zotero-db-analyzer.js` | `analyzeFullLibrary` | 149 | Extract data fetching, analysis, suggestion generation |
| `src/zotero/zotero-db-analyzer.js` | `findGivenNameVariantsForSurname` | 150 | Extract bucket building, clustering |
| `src/zotero/zotero-db-analyzer.js` | `applyDatabaseNormalizations` | 140 | Extract batch processing |
| `content/dialog.html` | `populateVariantGroupList` | 128 | Extract render, filter, event helpers |

### Other Issues
| File | Issue | Lines |
|------|-------|-------|
| `src/core/learning-engine.js` | Missing null check in `createCanonicalKey` | 316-322 |
| `src/zotero/menu-integration.js` | Missing try-catch in `handleNormalizeAction` | 36-61 |
| `src/core/candidate-finder.js` | Constructor side effects (eager require) | 6-11 |

## Work Plan

### Phase 0: Baseline Verification
- [ ] Run `npm run test:unit` to verify existing tests pass
- [ ] Record baseline test coverage
- [ ] Document baseline state

### Phase 1: Create Shared Utility Module
- [ ] Create `src/utils/string-distance.js` with:
  - `levenshteinDistance(str1, str2)` - returns raw distance
  - `normalizedLevenshtein(str1, str2)` - returns 0-1 similarity
  - Export both functions
- [ ] Create `tests/core/string-distance.test.js` with:
  - Basic distance tests
  - Normalized distance tests
  - Edge case tests (empty strings, null/undefined)
  - **Target: 80%+ coverage**
- [ ] Verify tests pass

### Phase 2: Create Shared Config Module
- [ ] Create `src/config/name-constants.js` with:
  - `NAME_PREFIXES` array
  - `NAME_SUFFIXES` array
- [ ] Create `tests/core/name-constants.test.js` with:
  - Array content validation tests
- [ ] Verify tests pass

### Phase 3: Refactor Ner-Processor (Both Duplicates Here)
- [ ] Update `src/core/ner-processor.js`:
  - Import from `src/utils/string-distance.js`
  - Import from `src/config/name-constants.js`
  - Remove inline implementations
- [ ] Run tests to verify functionality unchanged

### Phase 4: Refactor Zotero-DB-Analyzer
- [ ] Update `src/zotero/zotero-db-analyzer.js`:
  - Import from `src/utils/string-distance.js`
  - Import from `src/config/name-constants.js`
  - Remove inline `calculateStringSimilarity` implementation
- [ ] Run tests to verify functionality unchanged

### Phase 5: Refactor Other Files for Shared Config
- [ ] Update `src/core/name-parser.js` to use `src/config/name-constants.js`
- [ ] Update `src/core/gliner-handler.js` to use `src/config/name-constants.js`
- [ ] Run tests to verify functionality unchanged

### Phase 6: Fix Candidate-Finder Constructor
- [ ] Update `src/core/candidate-finder.js`:
  - Change constructor to use lazy initialization
  - Move require() calls to method bodies or use dependency injection
- [ ] Run tests to verify functionality unchanged

### Phase 7: Refactor Large Functions (zotero-db-analyzer.js)
- [ ] Refactor `analyzeFullLibrary` (149 lines):
  - Extract `fetchLibraryItems()` - data fetching logic
  - Extract `runItemAnalysis()` - analysis per item
  - Extract `compileSuggestions()` - suggestion generation
- [ ] Refactor `findGivenNameVariantsForSurname` (150 lines):
  - Extract `buildSurnameBuckets()` - bucket creation
  - Extract `clusterGivenNameVariants()` - clustering logic
- [ ] Refactor `applyDatabaseNormalizations` (140 lines):
  - Extract `processNormalizationBatch()` - batch processing
- [ ] Run tests to verify functionality unchanged

### Phase 8: Refactor Dialog HTML Function
- [ ] Extract `populateVariantGroupList` helpers to `src/ui/variant-list-helpers.js`:
  - `renderVariantItems(container, items)`
  - `setupVariantEventHandlers(container, handlers)`
  - `filterVariantGroups(groups, criteria)`
- [ ] Update `content/dialog.html` to use extracted helpers
- [ ] Run Playwright UI tests to verify functionality unchanged

### Phase 9: Fix Missing Validation
- [ ] Add null/undefined check to `src/core/learning-engine.js:createCanonicalKey`:
  ```javascript
  if (name == null) return '';
  ```
- [ ] Run tests to verify functionality unchanged

### Phase 10: Fix Async Error Handling
- [ ] Add try-catch to `src/zotero/menu-integration.js:handleNormalizeAction`
- [ ] Run tests to verify functionality unchanged

### Phase 11: Low Priority Fixes
- [ ] Replace magic number `0.6` with constant `FIRST_NAME_SIMILARITY_THRESHOLD`
- [ ] Replace magic weights with named constants in learning-engine.js
- [ ] Remove or wrap console.log in gliner-handler.js

### Phase 12: Final Verification
- [ ] Run full test suite
- [ ] Verify 80%+ coverage for new shared utilities
- [ ] Verify no regression in functionality

## Files to Create
| File | Purpose |
|------|---------|
| `src/utils/string-distance.js` | Shared string distance utilities |
| `src/config/name-constants.js` | Shared name configuration |
| `tests/core/string-distance.test.js` | Tests for string utilities |
| `tests/core/name-constants.test.js` | Tests for config |
| `src/ui/variant-list-helpers.js` | Shared dialog UI helpers |

## Files to Modify
| File | Changes |
|------|---------|
| `src/core/ner-processor.js` | Import shared utils + config, remove duplicates |
| `src/zotero/zotero-db-analyzer.js` | Import shared utils + config, remove duplicates |
| `src/core/name-parser.js` | Import shared config |
| `src/core/gliner-handler.js` | Import shared config |
| `src/core/candidate-finder.js` | Lazy initialization |
| `src/core/learning-engine.js` | Add null check |
| `src/zotero/menu-integration.js` | Add try-catch |
| `content/dialog.html` | Use extracted helpers |

## Test Strategy
1. **Phase 0**: Record baseline test state
2. **Phase 1-2**: Create shared modules with comprehensive tests
3. **Phase 3-6**: Refactor files one at a time, run tests after each
4. **Phase 7**: Large function refactoring with careful testing
5. **Phase 8**: UI refactoring with Playwright tests
6. **Phase 9-11**: Simple validation and error handling fixes
7. **Phase 12**: Full regression testing

## Rollback Strategy
If any refactoring causes test failures:
1. Note the specific test failure
2. Compare old implementation with new
3. Fix the shared module or refactored code
4. Re-run tests before continuing

## Dependencies
- Jest (existing test runner)
- Playwright (existing UI tests)
- No new dependencies required

## Success Criteria
- All medium priority issues from code review resolved
- Test coverage >= 80% for new shared utilities
- No regression in existing tests
- All code compiles/runs without errors
- Dialog UI functions correctly with Playwright tests

## Risk Mitigation
| Risk | Mitigation |
|------|------------|
| dialog.html HTML/JS mix | Extract JS to separate file, import in script tag |
| Breaking existing functionality | Test after each refactoring step |
| Test coverage below target | Add more edge case tests |
| Large function refactoring complexity | One sub-function at a time |
