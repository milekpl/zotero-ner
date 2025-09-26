# Detailed Implementation Plan for Zotero NER Author Name Normalizer

## Current Status
- ✅ Extension installs correctly in Zotero 7
- ✅ UI elements appear (toolbar button, menu item)
- ❌ Toolbar button is oversized (1.5x too large)
- ❌ UI shows placeholder dialogs instead of actual processing
- ❌ No real name normalization happening
- ✅ All core NER logic is implemented (93KB bundled)
- ✅ All unit tests pass (22/22)

## Phase 1: Fix UI Issues (Immediate Priority)

### 1. Fix Toolbar Button Sizing
**Issue**: Toolbar button is 1.5x too large
**Action Items**:
- [ ] Remove explicit width/height styling from toolbar button
- [ ] Use proper CSS classes for Zotero toolbar buttons
- [ ] Set appropriate icon size (16x16 pixels)
- [ ] Position button correctly in toolbar (before search box)
- [ ] Test sizing in different Zotero themes

### 2. Fix Menu Item Placement
**Issue**: Menu item may not appear in correct location
**Action Items**:
- [ ] Ensure menu item appears after a proper separator in Tools menu
- [ ] Use correct XUL element types for menu items
- [ ] Set proper labels and tooltips
- [ ] Test in different Zotero versions and locales

## Phase 2: Implement Real Dialog System (High Priority)

### 3. Create Proper XUL Dialog
**Issue**: Using alert() instead of proper dialog
**Action Items**:
- [ ] Create zotero-ner-normalization-dialog.xul with proper layout
- [ ] Design dialog with:
  - Item list showing selected items
  - Creator list showing authors/editors
  - Variant suggestions with radio buttons
  - Progress indicator for batch processing
  - Action buttons (Apply, Skip, Cancel)
- [ ] Implement proper styling matching Zotero's UI
- [ ] Add keyboard shortcuts (Enter to apply, Esc to cancel)

### 4. Implement Dialog Logic
**Issue**: No real processing in dialog
**Action Items**:
- [ ] Create dialog controller in JavaScript
- [ ] Load selected items and extract creators
- [ ] Process creators with NER logic to generate variants
- [ ] Display variants in radio button groups
- [ ] Handle user selections and apply normalizations
- [ ] Implement batch processing with progress updates

## Phase 3: Connect to Real NER Processing (Critical Priority)

### 5. Integrate Core NER Modules
**Issue**: Placeholder processing instead of real NER
**Action Items**:
- [ ] Load bundled NER modules in dialog context
- [ ] Connect ItemProcessor to process Zotero items
- [ ] Connect NameParser to parse creator names
- [ ] Connect VariantGenerator to create name variants
- [ ] Connect LearningEngine to apply learned mappings
- [ ] Connect CandidateFinder to find similar names in library

### 6. Implement Real Processing Workflow
**Issue**: No actual name normalization
**Action Items**:
- [ ] Parse each creator's full name using NameParser
- [ ] Generate multiple variants using VariantGenerator
- [ ] Check LearningEngine for previously learned mappings
- [ ] Search library for similar names using CandidateFinder
- [ ] Present all options to user in dialog
- [ ] Apply user-selected normalizations to items

## Phase 4: Enhance User Experience (Medium Priority)

### 7. Add Progress Indicators
**Issue**: No feedback during processing
**Action Items**:
- [ ] Add progress bar for batch processing
- [ ] Show current item being processed
- [ ] Display estimated time remaining
- [ ] Add cancel button for long operations

### 8. Implement Undo Functionality
**Issue**: No way to revert changes
**Action Items**:
- [ ] Track applied normalizations
- [ ] Store original creator data before changes
- [ ] Add undo button or menu item
- [ ] Implement restore functionality

### 9. Add Preferences System
**Issue**: No user-configurable options
**Action Items**:
- [ ] Create preferences dialog
- [ ] Add options for:
  - Auto-apply learned mappings
  - Confidence threshold for suggestions
  - Enable/disable specific name formats
  - Show/hide similar library names
- [ ] Store preferences using Zotero's preference system

## Phase 5: Advanced Features (Low Priority)

### 10. Implement Batch Processing
**Issue**: Processes items one by one
**Action Items**:
- [ ] Add batch processing mode
- [ ] Implement smart queuing system
- [ ] Add pause/resume functionality
- [ ] Show detailed processing report

### 11. Enhance Learning Engine
**Issue**: Basic learning capabilities
**Action Items**:
- [ ] Add manual training mode
- [ ] Implement conflict resolution
- [ ] Add export/import for learned mappings
- [ ] Implement similarity-based suggestions

### 12. Add Internationalization
**Issue**: Limited language support
**Action Items**:
- [ ] Add localization files for major languages
- [ ] Implement string translation system
- [ ] Test with different character sets
- [ ] Add RTL language support

## Implementation Timeline

### Week 1: UI Fixes and Basic Dialog
- Fix toolbar button sizing
- Fix menu item placement
- Create basic XUL dialog structure
- Implement dialog controller basics

### Week 2: NER Integration
- Connect to bundled NER modules
- Implement real name parsing
- Generate actual name variants
- Display results in dialog

### Week 3: Processing Workflow
- Implement full normalization workflow
- Add user interaction for selections
- Apply normalizations to items
- Add basic progress indicators

### Week 4: Advanced Features
- Implement preferences system
- Add undo functionality
- Enhance learning engine
- Polish UI/UX

## Technical Dependencies

### Required Libraries
1. **Zotero 7 API** - For accessing items and creators
2. **XUL** - For creating dialogs and UI elements
3. **Bundled NER modules** - Already implemented (93KB)
4. **Storage APIs** - For saving learned mappings

### File Structure Changes Needed
```
zotero-ner-author-normalizer/
├── content/
│   ├── zotero-ner-normalization-dialog.xul  ← NEW: Main dialog
│   ├── zotero-ner-overlay.xul              ← EXISTING: Menu/toolbar
│   ├── icons/
│   │   └── icon.svg                         ← EXISTING: Fixed size
│   └── scripts/
│       ├── zotero-ner.js                   ← EXISTING: Main integration
│       ├── zotero-ner-bundled.js           ← EXISTING: Core NER logic
│       └── ner-normalization-dialog.js     ← NEW: Dialog controller
├── src/
│   ├── core/                               ← EXISTING: NER modules
│   ├── zotero/                             ← EXISTING: Zotero integration
│   └── ui/                                 ← EXISTING: UI components
└── _locales/                               ← EXISTING: Localization
```

## Testing Requirements

### Unit Tests
- [ ] Dialog controller logic
- [ ] NER module integration
- [ ] User selection handling
- [ ] Undo functionality

### Integration Tests
- [ ] Toolbar button functionality
- [ ] Menu item functionality
- [ ] Dialog opening/closing
- [ ] Item processing workflow

### UI Tests
- [ ] Dialog layout and elements
- [ ] User interaction flows
- [ ] Progress indicators
- [ ] Error handling

## Success Criteria

### Minimum Viable Product (MVP)
1. ✅ Extension installs in Zotero 7 without errors
2. ✅ Toolbar button appears at correct size
3. ✅ Menu item appears in correct location
4. ✅ Clicking UI elements opens proper dialog
5. ✅ Dialog shows real processing of selected items
6. ✅ User can select normalization variants
7. ✅ Selected normalizations are applied to items

### Full Implementation
1. ✅ All MVP criteria
2. ✅ Progress indicators for batch processing
3. ✅ Undo functionality for applied changes
4. ✅ Preferences system for customization
5. ✅ Export/import for learned mappings
6. ✅ Comprehensive error handling
7. ✅ Full internationalization support
8. ✅ Batch processing with pause/resume

This plan provides a clear roadmap for transforming the current placeholder implementation into a fully functional Zotero 7 extension.