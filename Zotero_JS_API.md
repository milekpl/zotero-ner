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

## Zotero 7 WebExtension UI Integration Best Practices

For Zotero 7 WebExtensions, the UI integration patterns have evolved from the older XUL-based methods. Here's a summary of best practices:

### 1. `bootstrap.js` Structure
-   **Asynchronous `startup`**: The `startup` function should be `async` and `await Zotero.initializationPromise` to ensure Zotero is fully initialized before proceeding.
-   **Chrome Path Registration**: Use `aomStartup.registerChrome` to register chrome paths. It's recommended to use a simpler, short name (e.g., `'zoteroner'`) for the chrome package name instead of the full extension ID.
    ```javascript
    chromeHandle = aomStartup.registerChrome(manifestURI, [
      ['content', 'your-extension-short-name', rootURI + 'content/'],
    ]);
    ```
-   **Global Scope for Core Logic**: Load core extension logic (e.g., bundled JavaScript) into an `isolated scope` (`ctx` or `zoteroNERScope`) and then expose necessary objects globally (e.g., `globalThis.YourExtensionGlobalObject = ctx.YourExtensionGlobalObject;`).
    ```javascript
    Services.scriptloader.loadSubScript(
      `${rootURI}content/scripts/your-bundled-script.js`,
      ctx,
      'UTF-8',
    );
    if (ctx.YourExtensionGlobalObject) {
      globalThis.YourExtensionGlobalObject = ctx.YourExtensionGlobalObject;
    }
    ```
-   **`onMainWindowLoad` and `onMainWindowUnload`**: These functions are automatically called by Zotero when the main window loads and unloads. They are the primary entry points for UI initialization and teardown.
    ```javascript
    async function onMainWindowLoad({ window }, reason) {
      // Load UI-specific scripts into the window's scope
      Services.scriptloader.loadSubScript(
        `${registeredRootURI}content/scripts/your-ui-script.js`,
        window,
        'UTF-8',
      );
      // Initialize UI elements
      if (window.Zotero?.YourExtension?.init) {
        window.Zotero.YourExtension.init({ rootURI: registeredRootURI, window: window });
      }
    }

    async function onMainWindowUnload({ window }, reason) {
      // Teardown UI elements
      if (window.Zotero?.YourExtension?.teardown) {
        window.Zotero.YourExtension.teardown(window);
      }
      // Clean up injected properties
      delete window.YourExtensionGlobalObject;
      delete window.Zotero.__yourExtensionInjected;
    }
    ```
-   **`shutdown` function**: Ensure proper cleanup of `chromeHandle`.
    ```javascript
    function shutdown(data, reason) {
      if (chromeHandle) {
        chromeHandle.destruct();
        chromeHandle = null;
      }
    }
    ```

### 2. `install.rdf`
-   **`em:unpack`**: Set `em:unpack` to `true` to ensure the extension is unpacked, which can resolve issues with `bootstrap.js` execution.

### 3. UI Script (`zotero-ner.js` equivalent)
-   **Window Scope**: Scripts loaded into the window's scope (e.g., `zotero-ner.js`) will have access to the `window` object.
-   **Chrome URIs**: Use the registered chrome path (e.g., `chrome://your-extension-short-name/content/dialog.html`) for accessing resources like dialogs.
-   **Safe `window` access**: When accessing `window` directly, ensure checks for `typeof window !== 'undefined'` if the script might be executed in a non-window context.


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