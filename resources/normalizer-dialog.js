/**
 * JavaScript for the NER Normalizer Dialog
 * Handles the XUL interface for name normalization
 */

var NERNormalizerDialog = {
  items: [],
  results: [],
  
  init: function() {
    // Initialize the dialog
    this.loadSelectedItems();
    this.processItems();
  },
  
  loadSelectedItems: function() {
    // Get selected items from Zotero
    const ZoteroPane = Zotero.getActiveZoteroPane();
    this.items = ZoteroPane.getSelectedItems();
    this.updateItemsList();
  },
  
  updateItemsList: function() {
    const listbox = document.getElementById('items-list');
    listbox.removeAllItems();
    
    for (const item of this.items) {
      const title = item.getField('title') || 'Untitled';
      const listItem = document.createElement('listitem');
      listItem.setAttribute('value', item.id);
      
      const titleCell = document.createElement('listcell');
      titleCell.setAttribute('label', title);
      titleCell.setAttribute('flex', '1');
      
      const creatorsCell = document.createElement('listcell');
      const creators = item.getCreators();
      creatorsCell.setAttribute('label', `${creators.length} creator(s)`);
      
      listItem.appendChild(titleCell);
      listItem.appendChild(creatorsCell);
      listbox.appendChild(listItem);
    }
  },
  
  async processItems() {
    // Show progress
    document.getElementById('progress-container').style.display = 'block';
    
    try {
      // Process all items
      const processor = new (require('../src/zotero/item-processor.js'))();
      this.results = [];
      
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        const itemResult = await processor.processItemCreators(item);
        
        // Update progress
        const progress = document.getElementById('progress-bar');
        progress.value = ((i + 1) / this.items.length) * 100;
        
        this.results.push({
          item: item,
          creators: itemResult
        });
      }
      
      this.displayResults();
    } catch (error) {
      console.error('Error processing items:', error);
      alert('Error processing items: ' + error.message);
    } finally {
      document.getElementById('progress-container').style.display = 'none';
    }
  },
  
  displayResults: function() {
    // This would populate the dialog with the results
    // For each creator, show original name and suggested normalizations
    console.log('Results ready for display:', this.results);
  },
  
  accept: function() {
    // Apply the selected normalizations
    this.applyNormalizations();
    return true;
  },
  
  applyNormalizations: async function() {
    const autoApplyLearned = document.getElementById('auto-apply-learned').checked;
    const processor = new (require('../src/zotero/item-processor.js'))();
    
    for (const result of this.results) {
      await processor.applyNormalizations(result.item, result.creators);
    }
    
    // Notify user of completion
    Zotero.alert(null, 'Normalization Complete', `${this.results.length} items processed.`);
  },
  
  cancel: function() {
    // Cleanup if needed
    return true;
  }
};

// For Zotero integration
window.addEventListener('load', function(e) {
  NERNormalizerDialog.init();
}, false);