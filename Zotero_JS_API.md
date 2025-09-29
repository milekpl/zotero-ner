# Zotero JavaScript API - Essential Guide

This document summarizes the essential aspects of the Zotero JavaScript API for extension development, based on the official documentation at https://www.zotero.org/support/dev/client_coding/javascript_api

## Core Objects and Methods

### The Zotero Object
The main entry point for all Zotero functionality:
```javascript
// Check if Zotero is available (in main windows)
if (typeof Zotero !== 'undefined') {
  // Access Zotero functionality
}
```

### Window Scope vs Non-Window Scope
- **Window scope**: Code running within main Zotero window or secondary windows (has DOM access)
- **Non-window scope**: Lower-level code without DOM access (contained in xpcom subdirectory)

To access Zotero functionality from non-window scopes, import the core object:
```html
<script src="chrome://zotero/content/include.js"></script>
```

### Getting the Active Zotero Pane
```javascript
var ZoteroPane = Zotero.getActiveZoteroPane();
```

### Working with Items
```javascript
// Get selected items
var items = ZoteroPane.getSelectedItems();

// Get items by ID
var item = Zotero.Items.get(itemID);
var items = Zotero.Items.getAsync(itemIDs);

// Working with item creators
var creators = item.getCreators();
item.setCreators(creators);
```

## Database Access and Queries

### Using Zotero.Search
The recommended way to query items:
```javascript
var s = new Zotero.Search();
s.libraryID = Zotero.Libraries.userLibraryID;

// Add search conditions
s.addCondition('libraryID', 'is', libraryID);
s.addCondition('numberOfCreators', 'isGreaterThan', 0);

// Execute search
var itemIDs = await s.search();
var items = await Zotero.Items.getAsync(itemIDs);
```

### Search Conditions
Common search conditions:
- `libraryID` - Filter by library
- `collectionID` - Filter by collection
- `tag` - Filter by tag
- `creator` - Filter by creator name
- `numberOfCreators` - Filter by number of creators
- `itemType` - Filter by item type

### Direct Database Access
For advanced queries, use direct database access:
```javascript
// Execute SQL queries directly
var rows = await Zotero.DB.query(sqlQuery, params);

// Example: Get all creators
const query = `
  SELECT firstName, lastName, fieldMode, COUNT(*) as occurrenceCount
  FROM creators
  GROUP BY firstName, lastName, fieldMode
  ORDER BY occurrenceCount DESC
`;
const rows = await Zotero.DB.query(query);
```

## UI Integration Patterns

### Menu Integration
Register menu items with Zotero's interface:
```javascript
// In main window context
var toolsPopup = doc.querySelector('#menu_ToolsPopup');
var menuItem = doc.createElement('menuitem');
menuItem.setAttribute('label', 'Custom Action');
menuItem.addEventListener('command', handler);
toolsPopup.appendChild(menuItem);
```

### Toolbar Integration
Add buttons to Zotero's toolbar:
```javascript
var itemsToolbar = doc.querySelector('#zotero-items-toolbar');
var toolbarButton = doc.createElement('toolbarbutton');
toolbarButton.setAttribute('label', 'Custom Action');
toolbarButton.addEventListener('command', handler);
itemsToolbar.appendChild(toolbarButton);
```

## Best Practices

### Async Operations
Most Zotero operations are asynchronous:
```javascript
// Use async/await for database operations
async function processItems() {
  var items = await ZoteroPane.getSelectedItems();
  for (let item of items) {
    await processItem(item);
  }
}

// Or use promises
ZoteroPane.getSelectedItems().then(function(items) {
  items.forEach(function(item) {
    processItem(item);
  });
});
```

### Transactions
Use transactions for database modifications:
```javascript
// For single item modifications
await item.saveTx();

// For batch operations
await Zotero.DB.executeTransaction(async function() {
  for (let item of items) {
    await item.save();
  }
});
```

### Error Handling
Always handle errors appropriately:
```javascript
try {
  var items = await ZoteroPane.getSelectedItems();
  // Process items
} catch (error) {
  Zotero.logError(error);
  Zotero.getMainWindow().alert('Error', error.message);
}
```

## Context Considerations

### Main Window vs Dialog Contexts
- Main windows: Zotero object is typically available
- Dialog contexts: May need special handling for Zotero access
- Always check if Zotero is available before using it

### Library and Collection Context
```javascript
// Get current library
var libraryID = Zotero.Libraries.userLibraryID;

// Get selected collection
var collection = ZoteroPane.getSelectedCollection();

// Get all items in library
var s = new Zotero.Search();
s.addCondition('libraryID', 'is', libraryID);
var itemIDs = await s.search();
```

## Useful Methods and Properties

### Zotero Object Properties
- `Zotero.Libraries.userLibraryID` - Current user library ID
- `Zotero.Prefs` - Preference management
- `Zotero.DB` - Direct database access
- `Zotero.Items` - Item management
- `Zotero.Search` - Search functionality

### Item Methods
- `item.getField(fieldName)` - Get field value
- `item.setField(fieldName, value)` - Set field value
- `item.getCreators()` - Get item creators
- `item.setCreators(creators)` - Set item creators
- `item.saveTx()` - Save item changes

### Pane Methods
- `ZoteroPane.getSelectedItems()` - Get selected items
- `ZoteroPane.getSelectedCollection()` - Get selected collection
- `ZoteroPane.getSelectedLibraryID()` - Get selected library ID

This guide provides the essential information needed to develop Zotero extensions that work with the local database and integrate properly with the Zotero interface.