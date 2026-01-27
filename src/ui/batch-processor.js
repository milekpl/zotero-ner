/**
 * Batch Processor - UI for batch processing multiple items
 */
class BatchProcessor {
  constructor() {
    this.learningEngine = new (require('../core/learning-engine.js'))();
  }

  /**
   * Process multiple Zotero items in batch
   * @param {Array} items - Array of Zotero items to process
   */
  async processBatch(items) {
    console.log(`Processing ${items.length} items in batch`);
    
    for (const item of items) {
      await this.processItem(item);
    }
    
    return { success: true, processedCount: items.length };
  }

  /**
   * Process a single Zotero item
   * @param {Object} item - Zotero item to process
   */
  async processItem(item) {
    // Extract creators from the item
    const creators = item.getCreators ? item.getCreators() : [];
    
    for (const creator of creators) {
      if (creator.firstName || creator.lastName) {
        const rawName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
        
        // Check if we have a learned normalization
        const learned = this.learningEngine.getMapping(rawName);
        
        if (learned) {
          // Apply learned normalization
          console.log(`Applying learned normalization: ${rawName} -> ${learned}`);
          // In actual implementation, would update the item with normalized name
        } else {
          // For now, just log that we need to process this one
          console.log(`Need to process: ${rawName}`);
        }
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchProcessor;
}