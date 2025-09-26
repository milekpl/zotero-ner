/**
 * Main integration file for Zotero NER Author Name Normalization Extension
 * This file handles integration with the Zotero 7 interface
 */

if (typeof Zotero === 'undefined') {
  throw new Error('Zotero object not found. This extension must run in a Zotero context.');
}

// Extend Zotero object with our functionality
if (!Zotero.NER) {
  Zotero.NER = {
    initialized: false,
    rootURI: null,
    
    /**
     * Initialize the extension
     */
    init: function(rootURI) {
      if (this.initialized) return;
      
      this.rootURI = rootURI;
      
      try {
        // Initialize components when needed
        this.initialized = true;
        Zotero.debug('NER Author Name Normalizer extension initialized');
        
        // Add UI elements
        this.addUIElements();
      } catch (e) {
        Zotero.logError(e);
      }
    },

    addUIElements: function() {
      // Add menu item
      const toolsPopup = document.querySelector('#menu_ToolsPopup');
      if (toolsPopup) {
        const menuItem = document.createElement('menuitem');
        menuItem.id = 'zotero-ner-menuitem';
        menuItem.setAttribute('label', 'Normalize Author Names');
        menuItem.addEventListener('command', () => {
          this.showDialogForSelected();
        });
        toolsPopup.appendChild(menuItem);
      }
      
      // Add toolbar button
      const itemsToolbar = document.querySelector('#zotero-items-toolbar');
      if (itemsToolbar) {
        const button = document.createElement('toolbarbutton');
        button.id = 'zotero-ner-toolbarbutton';
        button.setAttribute('label', 'Normalize Names');
        button.setAttribute('tooltiptext', 'Normalize author names using NER');
        button.setAttribute('class', 'zotero-toolbar-button');
        button.addEventListener('click', () => {
          this.showDialogForSelected();
        });
        itemsToolbar.appendChild(button);
      }
    },
    

    
    /**
     * Show the normalization dialog for selected items
     */
    showDialogForSelected: function() {
      try {
        var items = Zotero.getActiveZoteroPane().getSelectedItems();
        if (!items || items.length === 0) {
          Zotero.getMainWindow().alert('NER Author Name Normalizer', 'No items selected for normalization.');
          return;
        }
        
        this.showDialog(items);
      } catch (e) {
        Zotero.logError(e);
        Zotero.getMainWindow().alert('Error', 'An error occurred: ' + e.message);
      }
    },
    
    /**
     * Show the normalization dialog
     * @param {Array} items - Zotero items to process (defaults to selected items)
     */
    showDialog: function(items) {
      try {
        if (!this.initialized) {
          this.init();
        }
        
        if (!items) {
          items = Zotero.getActiveZoteroPane().getSelectedItems();
        }
        
        if (!items || items.length === 0) {
          Zotero.getMainWindow().alert('NER Author Name Normalizer', 'No items to normalize.');
          return;
        }
        
        // Open the HTML dialog
        browser.windows.create({
          url: browser.runtime.getURL('content/dialog.html'),
          type: 'popup',
          width: 800,
          height: 600
        });
        
      } catch (e) {
        Zotero.logError(e);
        Zotero.getMainWindow().alert('Error', 'An error occurred: ' + e.message);
      }
    },
    
    /**
     * Process items programmatically
     * @param {Array} items - Zotero items to process
     * @param {Object} options - Processing options
     */
    processItems: function(items, options) {
      if (!options) options = {};
      
      if (!this.initialized) {
        this.init();
      }
      
      // Placeholder implementation - in real implementation, this would process the items
      var results = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        results.push({
          itemID: item.id,
          title: item.getField('title'),
          status: 'would-process'
        });
      }
      
      return results;
    },
    
    /**
     * Get the learning engine instance
     */
    getLearningEngine: function() {
      return this.learningEngine;
    }
  };
}



// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZoteroNER: Zotero.NER };
}