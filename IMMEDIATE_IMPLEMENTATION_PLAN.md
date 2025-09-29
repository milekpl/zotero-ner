# Immediate Implementation Plan: Direct Database Connection

## Core Changes Needed

### 1. Remove Toolbar Button
- Delete toolbar button creation code
- Remove toolbar button event handlers
- Remove toolbar button styling

### 2. Simplify Menu Integration
- Keep only one menu item: "Normalize Author Names"
- Remove all selection-based logic
- Remove "Normalize Selected Items" distinction

### 3. Implement Direct Database Connection
- Create `ZoteroDBAnalyzer` class that connects directly to Zotero database
- Query all creators from all items in the library
- Process all creators for normalization suggestions

### 4. Simplify Dialog Controller
- Remove item selection logic
- Always process all creators from database
- Simplify initialization to just open the dialog

## Step-by-Step Implementation

### Phase 1: Remove Toolbar Button and Simplify Menu
1. Remove toolbar button creation code from `zotero-ner.js`
2. Keep only the "Normalize Author Names" menu item
3. Simplify menu item handler to not check for selections

### Phase 2: Implement Direct Database Connection
1. Create `ZoteroDBAnalyzer` class with methods:
   - `connect()` - Connect to Zotero database
   - `getAllCreators()` - Get all creators from database
   - `analyzeCreators(creators)` - Analyze for variants
2. Use existing `Zotero.DB.query()` for database access

### Phase 3: Simplify Dialog Controller
1. Modify `showDialog()` to not require items parameter
2. Always fetch all creators from database
3. Remove selection-based UI elements

### Phase 4: Update UI Components
1. Modify dialog to show all creators by default
2. Remove selection-specific UI elements
3. Keep core normalization functionality

## Key Implementation Details

### Database Query
```javascript
// Get all creators from the database efficiently
const query = `
  SELECT firstName, lastName, fieldMode, COUNT(*) as occurrenceCount
  FROM creators c
  JOIN itemCreators ic ON c.creatorID = ic.creatorID
  JOIN items i ON ic.itemID = i.itemID
  WHERE i.libraryID = ?
  GROUP BY firstName, lastName, fieldMode
  ORDER BY occurrenceCount DESC
`;

const creators = await Zotero.DB.query(query, [libraryID]);
```

### Menu Handler Simplification
```javascript
// Simplified menu handler - no selection checking
async function handleNormalizeCommand() {
  try {
    // Always process all creators
    const dbAnalyzer = new ZoteroDBAnalyzer();
    const creators = await dbAnalyzer.getAllCreators();
    const analysis = await dbAnalyzer.analyzeCreators(creators);
    
    // Show dialog with all creators
    showNormalizationDialog(analysis);
  } catch (error) {
    Zotero.logError(error);
    alert('Error: ' + error.message);
  }
}
```

### Dialog Controller Simplification
```javascript
// Simplified dialog controller - always process all creators
async function showDialog() {
  try {
    const dbAnalyzer = new ZoteroDBAnalyzer();
    const creators = await dbAnalyzer.getAllCreators();
    const analysis = await dbAnalyzer.analyzeCreators(creators);
    
    // Render dialog with all creators
    renderDialog(analysis);
  } catch (error) {
    handleError(error);
  }
}
```

## Benefits of This Approach

1. **Eliminates Selection Complexity**: No need to handle selected vs unselected items
2. **Consistent Behavior**: Always processes the entire library
3. **Better Performance**: Direct database access is more efficient
4. **Cleaner Code**: Removes all selection-based conditional logic
5. **More Comprehensive**: Processes all authors, not just selected ones
6. **Fewer Edge Cases**: Eliminates dialog context issues

## Files to Modify

1. `content/scripts/zotero-ner.js` - Remove toolbar button, simplify menu integration
2. `content/scripts/zotero-ner-bundled.js` - Update bundled code with changes
3. `content/scripts/normalization-dialog-controller.js` - Simplify dialog controller
4. `src/zotero/zotero-db-analyzer.js` - Implement direct database connection
5. `content/zotero-ner-overlay.xul` - Remove toolbar button references

This approach will provide a much cleaner, more reliable implementation that focuses on the core functionality without the complexity of UI selection handling.