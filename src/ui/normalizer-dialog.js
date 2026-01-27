/**
 * Normalizer Dialog - UI for showing name normalization options
 * This will be implemented as a XUL dialog in the actual Zotero extension
 */
class NormalizerDialog {
  constructor() {
    this.learningEngine = new (require('../core/learning-engine.js'))();
    this.variantGenerator = new (require('../core/variant-generator.js'))();
    this.nameParser = new (require('../core/name-parser.js'))();
  }

  /**
   * Show the normalization dialog
   * @param {Array} items - Zotero items to process
   * @returns {Promise<Object>} User selections
   */
  async showDialog(items) {
    // In actual Zotero extension, this would create a XUL dialog
    console.log('Showing normalization dialog for', items.length, 'items');
    
    // Process each item and prepare options
    const results = [];
    for (const item of items) {
      const itemResults = await this.processItem(item);
      results.push(itemResults);
    }
    
    // Present options to user (in real implementation, show actual UI)
    return await this.presentOptions(results);
  }

  /**
   * Process a single Zotero item
   * @param {Object} item - Zotero item
   * @returns {Object} Processed results
   */
  async processItem(item) {
    const creators = item.getCreators ? item.getCreators() : [];
    const processedCreators = [];

    for (const creator of creators) {
      if (creator.firstName || creator.lastName) {
        const rawName = this.buildRawName(creator);
        
        // Check if we have a learned mapping
        let learned = this.learningEngine.getMapping(rawName);
        if (learned) {
          processedCreators.push({
            original: { ...creator },
            normalized: learned,
            type: creator.creatorType,
            alreadyLearned: true,
            status: 'learned'
          });
          continue;
        }

        // Get similar mappings
        const similars = this.learningEngine.findSimilar(rawName);
        
        // Parse the name and generate variants
        const parsed = this.nameParser.parse(rawName);
        const variants = this.variantGenerator.generateVariants(parsed);
        
        processedCreators.push({
          original: { ...creator },
          rawName: rawName,
          variants: variants,
          similars: similars,
          type: creator.creatorType,
          alreadyLearned: false,
          parsed: parsed,
          status: 'new'
        });
      }
    }

    return {
      itemID: item.id,
      title: item.getField ? item.getField('title') : 'Unknown Title',
      creators: processedCreators
    };
  }

  /**
   * Build raw name from creator object
   * @param {Object} creator - Creator object
   * @returns {string} Raw name string
   */
  buildRawName(creator) {
    return `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
  }

  /**
   * Present options to user (stub implementation)
   * @param {Array} results - Processed results
   * @returns {Promise<Array>} User selections
   */
  async presentOptions(results) {
    // This is a stub - in the real extension this would show actual UI
    console.log('Presenting options to user:');
    
    const userSelections = [];
    for (const itemResult of results) {
      const itemSelections = {
        itemID: itemResult.itemID,
        title: itemResult.title,
        creators: []
      };
      
      for (const creator of itemResult.creators) {
        if (creator.alreadyLearned) {
          // For learned mappings, just confirm they should be applied
          itemSelections.creators.push({
            original: creator.original,
            normalized: creator.normalized,
            type: creator.type,
            accepted: true,  // Auto-accept learned mappings
            source: 'learned'
          });
        } else {
          // For new mappings, simulate user selection
          // In real UI, this would allow user to select from variants or similars
          const selectedVariant = creator.variants[0]; // Default to first variant
          itemSelections.creators.push({
            original: creator.original,
            normalized: selectedVariant,
            type: creator.type,
            accepted: true, // For demo purposes, accept all
            source: 'user_selected',
            selectedFrom: 'variants'
          });
        }
      }
      
      userSelections.push(itemSelections);
    }
    
    return userSelections;
  }

  /**
   * Render the UI as HTML for demonstration purposes
   * @param {Array} results - Processed results to display
   * @returns {string} HTML representation of the dialog
   */
  renderUIDemo(results) {
    let html = '<div class="ner-normalizer-dialog"><h2>Author Name Normalization</h2>';
    
    for (const itemResult of results) {
      html += `<div class="item-section" data-item-id="${itemResult.itemID}">`;
      html += `<h3>${itemResult.title}</h3>`;
      
      for (const creator of itemResult.creators) {
        html += '<div class="creator-section">';
        
        if (creator.alreadyLearned) {
          html += `<p><strong>Learned:</strong> ${creator.rawName} → ${creator.normalized}</p>`;
        } else {
          html += `<p><strong>Original:</strong> ${creator.rawName}</p>`;
          
          // Show variants
          html += '<div class="variants-section">';
          html += '<h4>Variant Suggestions:</h4><ul>';
          for (const variant of creator.variants) {
            html += `<li><label><input type="radio" name="selection-${creator.rawName}" value="${variant}"> ${variant}</label></li>`;
          }
          html += '</ul></div>';
          
          // Show similar learned names
          if (creator.similars.length > 0) {
            html += '<div class="similar-section">';
            html += '<h4>Similar Previously Learned Names:</h4><ul>';
            for (const similar of creator.similars) {
              html += `<li><label><input type="radio" name="selection-${creator.rawName}" value="${similar.normalized}"> ${similar.raw} → ${similar.normalized} (confidence: ${(similar.similarity * 100).toFixed(1)}%)</label></li>`;
            }
            html += '</ul></div>';
          }
        }
        
        html += '</div>'; // creator-section
      }
      
      html += '</div>'; // item-section
    }
    
    html += '<div class="dialog-actions">';
    html += '<button id="accept-all-btn">Accept All</button>';
    html += '<button id="cancel-btn">Cancel</button>';
    html += '</div></div>'; // ner-normalizer-dialog
    
    return html;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NormalizerDialog;
}