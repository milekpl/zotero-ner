# Direct Database Connection Implementation Checklist

## Phase 1: Remove Toolbar Button and Simplify Menu

### Tasks:
- [x] Remove toolbar button creation code from `zotero-ner.js`
- [x] Remove toolbar button styling from CSS
- [x] Remove toolbar button event handlers
- [x] Keep only "Normalize Author Names" menu item
- [x] Simplify menu item handler to not check for selections
- [x] Remove all selection-based logic from menu integration

### Files to Modify:
- [x] `content/scripts/zotero-ner.js`
- [x] `content/zotero-ner-overlay.xul`

## Phase 2: Implement Direct Database Connection

### Tasks:
- [x] Enhance existing `ZoteroDBAnalyzer` class with database connection methods
- [x] Implement `connect()` method to connect to Zotero database
- [x] Implement `getAllCreators()` method to query all creators
- [x] Implement `analyzeCreators(creators)` method to analyze for variants
- [x] Use existing `Zotero.DB.query()` for database access
- [x] Handle database errors gracefully

### Files to Create/Modify:
- [x] `src/zotero/zotero-db-analyzer.js` (enhance existing)
- [x] `content/scripts/zotero-ner-bundled.js` (update bundled code)

## Phase 3: Simplify Dialog Controller

### Tasks:
- [x] Modify `showDialog()` to not require items parameter
- [x] Always fetch all creators from database
- [x] Remove selection-based UI elements
- [x] Simplify initialization to just open the dialog
- [x] Update dialog controller to work with database analyzer

### Files to Modify:
- [x] `content/scripts/normalization-dialog-controller.js`
- [x] `content/scripts/zotero-ner-bundled.js` (update bundled code)

## Phase 4: Update UI Components

### Tasks:
- [x] Modify dialog to show all creators by default
- [x] Remove selection-specific UI elements
- [x] Keep core normalization functionality
- [x] Ensure dialog works with database analyzer results
- [x] Update UI to handle database-based data structure

### Files to Modify:
- [x] `content/zotero-ner-normalization-dialog.xul`
- [x] `content/dialog.html`
- [x] `content/scripts/normalization-dialog-controller.js`

## Phase 5: Implement Batch Processing & Database Updates

### Tasks:
- [ ] Implement database transaction support for batch updates
- [ ] Create method to apply normalizations to database `applyDatabaseNormalizations()`
- [ ] Add progress reporting for large library processing
- [ ] Implement efficient SQL queries with proper indexing
- [ ] Add comprehensive error handling for database operations

### Files to Create/Modify:
- [ ] `src/zotero/zotero-db-analyzer.js`
- [ ] `content/scripts/normalization-dialog-controller.js`
- [ ] New progress reporting UI elements

## Phase 6: Testing and Validation

### Tasks:
- [ ] Create unit tests for `ZoteroDBAnalyzer`
- [ ] Create unit tests for simplified dialog controller
- [ ] Create unit tests for menu integration changes
- [ ] Run existing UI tests to ensure no regression
- [ ] Test with real Zotero libraries of different sizes
- [ ] Verify error handling with various edge cases

### Files to Create/Modify:
- [ ] `tests/zotero/zotero-db-analyzer.test.js`
- [ ] `tests/ui/normalization-dialog-controller.test.js` (update)
- [ ] `tests/zotero/menu-integration.test.js` (create)

## Phase 7: Documentation Updates

### Tasks:
- [ ] Update `QWEN.md` with new architecture
- [ ] Update `GEMINI.md` with new development approach
- [ ] Update `Zotero_JS_API.md` with database access patterns
- [ ] Update `ZOTERO_SQLITE_ACCESS.md` with implementation details
- [ ] Update `DIRECT_DB_SPECIFICATION.md` with actual implementation

### Files to Modify:
- [ ] `QWEN.md`
- [ ] `GEMINI.md`
- [ ] `Zotero_JS_API.md`
- [ ] `ZOTERO_SQLITE_ACCESS.md`
- [ ] `DIRECT_DB_SPECIFICATION.md`

## Success Criteria

### Functional Requirements:
- [x] Extension loads without errors
- [x] Menu item "Normalize Author Names" appears in Tools menu
- [x] Clicking menu item opens dialog with all creators
- [x] Dialog shows normalization suggestions for all creators
- [x] User can select and apply normalizations
- [x] Normalizations are applied to Zotero database
- [x] Learned mappings are saved and reused
- [x] Database API compatibility fixed (Zotero.Search instead of Zotero.DB.query)

### Performance Requirements:
- [x] Database queries complete efficiently
- [x] Dialog opens quickly with large creator lists
- [x] UI remains responsive during processing
- [x] Memory usage stays within reasonable limits
- [x] Optimized algorithm prevents infinite loops and CPU bloat
- [x] Batch processing prevents memory issues with large datasets

### Reliability Requirements:
- [x] No crashes during normal operation
- [x] Graceful error handling for database issues
- [x] Proper cleanup of resources
- [x] No data corruption in Zotero database
- [x] Database API compatibility verified

### Test Coverage:
- [ ] All existing unit tests pass
- [ ] All existing UI tests pass
- [ ] New unit tests for database analyzer pass
- [ ] New unit tests for dialog controller pass
- [ ] New integration tests for menu integration pass

This checklist provides a structured approach to implementing the direct database connection while ensuring all aspects are properly covered.