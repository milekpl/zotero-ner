# Direct Database Connection Implementation Checklist

## Phase 1: Remove Toolbar Button and Simplify Menu

### Tasks:
- [ ] Remove toolbar button creation code from `zotero-ner.js`
- [ ] Remove toolbar button styling from CSS
- [ ] Remove toolbar button event handlers
- [ ] Keep only "Normalize Author Names" menu item
- [ ] Simplify menu item handler to not check for selections
- [ ] Remove all selection-based logic from menu integration

### Files to Modify:
- [ ] `content/scripts/zotero-ner.js`
- [ ] `content/zotero-ner-overlay.xul`

## Phase 2: Implement Direct Database Connection

### Tasks:
- [ ] Create `ZoteroDBAnalyzer` class with database connection methods
- [ ] Implement `connect()` method to connect to Zotero database
- [ ] Implement `getAllCreators()` method to query all creators
- [ ] Implement `analyzeCreators(creators)` method to analyze for variants
- [ ] Use existing `Zotero.DB.query()` for database access
- [ ] Handle database errors gracefully

### Files to Create/Modify:
- [ ] `src/zotero/zotero-db-analyzer.js` (enhance existing)
- [ ] `content/scripts/zotero-ner-bundled.js` (update bundled code)

## Phase 3: Simplify Dialog Controller

### Tasks:
- [ ] Modify `showDialog()` to not require items parameter
- [ ] Always fetch all creators from database
- [ ] Remove selection-based UI elements
- [ ] Simplify initialization to just open the dialog
- [ ] Update dialog controller to work with database analyzer

### Files to Modify:
- [ ] `content/scripts/normalization-dialog-controller.js`
- [ ] `content/scripts/zotero-ner-bundled.js` (update bundled code)

## Phase 4: Update UI Components

### Tasks:
- [ ] Modify dialog to show all creators by default
- [ ] Remove selection-specific UI elements
- [ ] Keep core normalization functionality
- [ ] Ensure dialog works with database analyzer results
- [ ] Update UI to handle database-based data structure

### Files to Modify:
- [ ] `content/zotero-ner-normalization-dialog.xul`
- [ ] `content/dialog.html`
- [ ] Related UI script files

## Phase 5: Testing and Validation

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

## Phase 6: Documentation Updates

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
- [ ] Extension loads without errors
- [ ] Menu item "Normalize Author Names" appears in Tools menu
- [ ] Clicking menu item opens dialog with all creators
- [ ] Dialog shows normalization suggestions for all creators
- [ ] User can select and apply normalizations
- [ ] Normalizations are applied to Zotero database
- [ ] Learned mappings are saved and reused

### Performance Requirements:
- [ ] Database queries complete efficiently
- [ ] Dialog opens quickly with large creator lists
- [ ] UI remains responsive during processing
- [ ] Memory usage stays within reasonable limits

### Reliability Requirements:
- [ ] No crashes during normal operation
- [ ] Graceful error handling for database issues
- [ ] Proper cleanup of resources
- [ ] No data corruption in Zotero database

### Test Coverage:
- [ ] All existing unit tests pass
- [ ] All existing UI tests pass
- [ ] New unit tests for database analyzer pass
- [ ] New unit tests for dialog controller pass
- [ ] New integration tests for menu integration pass

This checklist provides a structured approach to implementing the direct database connection while ensuring all aspects are properly covered.