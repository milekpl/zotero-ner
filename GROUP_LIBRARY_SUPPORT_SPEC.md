# Group Library Support Specification

## Overview

The Zotero Name Normalizer plugin currently only operates on the user's personal library (`Zotero.Libraries.userLibraryID`). This spec defines the requirements for supporting **group libraries**, allowing users to normalize author names within any library they have access to.

## Background

Zotero supports multiple library types:
- **User Library**: Personal library (`Zotero.Libraries.userLibraryID`)
- **Group Libraries**: Shared libraries associated with Zotero groups (each has unique `libraryID`)
- **Feed Libraries**: RSS/Atom feed subscriptions
- **Publications Library**: User's public publications

Each library type has its own `libraryID` and must be explicitly specified when querying items.

## Current Issues

1. **Hardcoded User Library**: All item queries use `Zotero.Items.getAll()` without `libraryID` parameter, defaulting to user library only
2. **No Library Context Detection**: Plugin doesn't detect which library/collection the user has selected in Zotero UI
3. **No Library Selection UI**: Users cannot choose which library to normalize
4. **Search Scope**: `Zotero.Search` queries don't specify `libraryID`, limiting scope to user library

## Requirements

### Functional Requirements

#### FR1: Library Context Detection
The plugin MUST detect the currently selected library context in Zotero:
- If user has a group library selected, operate on that library
- If user has a collection selected, operate on that collection's library
- If user has items selected, operate on the library containing those items
- Default to user library if no specific context is detected

#### FR2: Library Selection
The plugin MUST provide UI for users to explicitly select which library to normalize:
- Show all accessible libraries (user + groups)
- Display library names and types
- Allow selection before analysis/normalization

#### FR3: Collection Scoping
Within a selected library, the plugin MUST support:
- Normalizing all items in the library
- Normalizing items in a specific collection (and optionally subcollections)

#### FR4: Consistent Behavior
Normalization behavior MUST be identical across library types:
- Same name parsing rules
- Same variant detection
- Same learning engine (shared across libraries)
- Same UI workflow

### Non-Functional Requirements

#### NFR1: Performance
- Library queries MUST use efficient database access patterns
- Large group libraries (>10k items) MUST be handled without UI freezing
- Progress indicators MUST reflect actual progress

#### NFR2: Error Handling
- Graceful handling of inaccessible libraries (permission errors)
- Clear error messages indicating which library failed
- Continue processing other libraries if one fails

#### NFR3: Backward Compatibility
- Existing functionality for user library MUST remain unchanged
- Default behavior SHOULD match current behavior (user library)
- API changes MUST be backward compatible

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Library Selector│  │ Collection Tree │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Library Context Manager                    │
│  - Detect selected library from Zotero UI                    │
│  - Provide library selection dialog                          │
│  - Resolve collection → library mapping                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Collection Manager                         │
│  - Get items by libraryID + collection                       │
│  - Handle library-aware queries                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Zotero DB Analyzer                         │
│  - Query items with explicit libraryID                       │
│  - Support multi-library analysis                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Library Context Manager (NEW)
```javascript
class LibraryContextManager {
  /**
   * Get the currently selected library in Zotero UI
   * @returns {Promise<{libraryID: number, libraryType: string, libraryName: string}>}
   */
  async getCurrentLibraryContext() {}

  /**
   * Get all accessible libraries
   * @returns {Promise<Array<{libraryID: number, libraryType: string, name: string}>>}
   */
  async getAllLibraries() {}

  /**
   * Show library selection dialog
   * @returns {Promise<{libraryID: number, libraryType: string}>}
   */
  async showLibrarySelector() {}
}
```

#### 2. Updated Collection Manager
```javascript
class CollectionManager {
  /**
   * Get items from a specific library
   * @param {number} libraryID - Target library ID
   * @param {string|null} collectionKey - Optional collection filter
   * @returns {Promise<Array>}
   */
  async getItemsByLibrary(libraryID, collectionKey = null) {}

  /**
   * Get all items in a library (replaces getAllItems)
   * @param {number} libraryID - Target library ID
   * @returns {Promise<Array>}
   */
  async getAllItemsInLibrary(libraryID) {}
}
```

#### 3. Updated Zotero DB Analyzer
```javascript
class ZoteroDBAnalyzer {
  /**
   * Analyze a specific library
   * @param {number} libraryID - Target library ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>}
   */
  async analyzeLibrary(libraryID, options = {}) {}

  /**
   * Analyze multiple libraries
   * @param {Array<number>} libraryIDs - Libraries to analyze
   * @returns {Promise<Object>}
   */
  async analyzeLibraries(libraryIDs) {}
}
```

### Library ID Resolution

```javascript
// Get user library ID
const userLibraryID = Zotero.Libraries.userLibraryID;

// Get group library ID from group ID
const groupLibraryID = Zotero.Groups.getLibraryIDFromGroupID(groupID);

// Get library type
const library = Zotero.Libraries.get(libraryID);
const libraryType = library.libraryType; // 'user', 'group', 'feed', 'publications'

// Get all libraries
const allLibraries = Zotero.Libraries.getAll();
```

### Item Query Patterns

```javascript
// OLD (user library only)
const items = Zotero.Items.getAll();

// NEW (library-aware)
const items = Zotero.Items.getAll(libraryID, onlyTopLevel, includeDeleted);

// OLD (search without library scope)
const search = new Zotero.Search();
search.addCondition('title', 'contains', 'test');
const ids = await search.search();

// NEW (search with library scope)
const search = new Zotero.Search();
search.addCondition('libraryID', 'is', libraryID);
search.addCondition('title', 'contains', 'test');
const ids = await search.search();
```

## UI Changes

### Library Selector Dialog

```
┌────────────────────────────────────────────┐
│  Select Library to Normalize               │
├────────────────────────────────────────────┤
│                                            │
│  ○ My Library                              │
│  ○ Group: Research Team                    │
│  ○ Group: Lab Publications                 │
│  ○ Feed: ArXiv Physics                     │
│                                            │
│  [Cancel]                    [Continue →]  │
└────────────────────────────────────────────┘
```

### Collection Scope Selector (after library selection)

```
┌────────────────────────────────────────────┐
│  Normalize: Research Team                  │
├────────────────────────────────────────────┤
│                                            │
│  ○ All items in library (1,234 items)      │
│  ○ Specific collection:                    │
│     └─ Publications (456 items)            │
│     └─ Drafts (123 items)                  │
│                                            │
│  [Back]                      [Analyze →]   │
└────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Foundation (Library Context Detection)
1. Create `LibraryContextManager` class
2. Implement `getCurrentLibraryContext()` using Zotero's pane selection
3. Implement `getAllLibraries()` using `Zotero.Libraries.getAll()`
4. Add unit tests for library context detection

### Phase 2: Library-Aware Queries
1. Update `CollectionManager.getItemsByLibrary()` to accept `libraryID`
2. Update `CollectionManager.getAllItems()` to require `libraryID`
3. Update `ZoteroDBAnalyzer.analyzeFullLibrary()` to accept `libraryID`
4. Update `CandidateFinder.findNameVariants()` to accept `libraryID`
5. Add unit tests for library-scoped queries

### Phase 3: UI Integration
1. Add library selector dialog to `NormalizerDialog`
2. Add collection scope selector
3. Update menu integration to show library context
4. Add visual indicators for current library scope
5. Manual testing with group libraries

### Phase 4: E2E Testing
1. Create test fixtures with group libraries
2. Create E2E tests using `test:zotero` framework
3. Test library selection workflow
4. Test normalization in group libraries
5. Test error handling for inaccessible libraries

### Phase 5: Polish & Documentation
1. Update README with group library usage
2. Add inline help for library selection
3. Performance optimization for large libraries
4. Final manual testing

## Testing Strategy

### Unit Tests (Jest)
- `LibraryContextManager` methods
- Library ID resolution
- Collection → library mapping

### Integration Tests (Mocha in Zotero)
- Library-aware item queries
- Search with library scope
- Group library access

### E2E Tests (Playwright + Zotero test framework)
```javascript
describe('Group Library Support', function() {
  it('should detect selected group library', async function() {
    // Create test group
    const group = await createGroup();
    const libraryID = group.libraryID;
    
    // Select group library in UI
    await selectLibrary(libraryID);
    
    // Verify plugin detects correct library
    const context = await Zotero.NameNormalizer.libraryContextManager.getCurrentLibraryContext();
    assert.equal(context.libraryID, libraryID);
  });

  it('should normalize items in group library', async function() {
    // Create group with test items
    const group = await createGroup();
    const item = await createDataObject('item', { libraryID: group.libraryID });
    
    // Run normalization on group library
    await Zotero.NameNormalizer.analyzeLibrary(group.libraryID);
    
    // Verify normalization applied
    const updatedItem = await Zotero.Items.getAsync(item.id);
    assert.equal(updatedItem.getCreators()[0].lastName, 'Normalized');
  });

  it('should handle collection scoping within group library', async function() {
    // Create group with collections
    const group = await createGroup();
    const collection = await createDataObject('collection', { libraryID: group.libraryID });
    const item = await createDataObject('item', { libraryID: group.libraryID, collections: [collection.id] });
    
    // Run normalization on specific collection
    await Zotero.NameNormalizer.analyzeCollection(collection.id);
    
    // Verify only collection items normalized
  });
});
```

## API Changes

### New Public APIs
```javascript
// Library context detection
Zotero.NameNormalizer.libraryContextManager.getCurrentLibraryContext()
Zotero.NameNormalizer.libraryContextManager.getAllLibraries()
Zotero.NameNormalizer.libraryContextManager.showLibrarySelector()

// Library-aware analysis
Zotero.NameNormalizer.analyzeLibrary(libraryID, options)
Zotero.NameNormalizer.analyzeCollection(collectionKey, options)
```

### Modified APIs
```javascript
// Backward compatible - defaults to user library if no libraryID specified
Zotero.NameNormalizer.analyzeFullLibrary(libraryID = Zotero.Libraries.userLibraryID)
```

## Migration Path

### For Existing Users
- Default behavior unchanged (operates on user library)
- Library selector appears when explicitly invoked
- Learned mappings shared across all libraries

### For New Users
- Library selector shown on first use
- Clear indication of which library is being normalized
- Tutorial/guidance for group library normalization

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Permission errors on group libraries | Medium | Graceful error handling, skip inaccessible libraries |
| Performance degradation on large libraries | Medium | Progress indicators, batch processing, cancellation support |
| User confusion about library scope | High | Clear UI indicators, explicit selection dialogs |
| Learning engine conflicts between libraries | Low | Shared learning is desired behavior |
| Breaking existing workflows | High | Backward compatible defaults, opt-in library selection |

## Success Criteria

1. ✅ Users can normalize items in any accessible group library
2. ✅ Library context is correctly detected from Zotero UI selection
3. ✅ Users can explicitly select which library to normalize
4. ✅ Collection scoping works within group libraries
5. ✅ All existing user library functionality remains unchanged
6. ✅ E2E tests pass for group library workflows
7. ✅ Performance acceptable for libraries up to 10k items

## References

- Zotero Groups API: `Zotero.Groups.getLibraryIDFromGroupID(groupID)`
- Zotero Libraries API: `Zotero.Libraries.getAll()`, `Zotero.Libraries.userLibraryID`
- Item queries: `Zotero.Items.getAll(libraryID, ...)`
- Search scoping: `search.addCondition('libraryID', 'is', libraryID)`
- Similar implementation: zotero-search-replace plugin
