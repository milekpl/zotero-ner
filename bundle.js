#!/usr/bin/env node
/**
 * Simple bundling script for Zotero NER extension
 * Concatenates core modules into a single file for the extension
 */

const fs = require('fs');
const path = require('path');

function bundleExtension() {
  console.log('Bundling Zotero NER extension...');
  
  // Define the output directory and file
  const outputDir = path.join(__dirname, 'content', 'scripts');
  const outputFile = path.join(outputDir, 'zotero-ner-bundled.js');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // List of core modules to include in the bundle
  const coreModules = [
    'core/ner-processor.js',
    'core/name-parser.js', 
    'core/variant-generator.js',
    'core/learning-engine.js',
    'core/candidate-finder.js',
    'core/gliner-handler.js',
    'zotero/item-processor.js',
    'zotero/menu-integration.js',
    'zotero/zotero-db-analyzer.js',
    'ui/normalizer-dialog.js',
    'ui/batch-processor.js',
    'storage/data-manager.js',
    'worker/ner-worker.js'
  ];
  
  // Start with a header
  let bundledContent = `/**
 * Zotero NER Author Name Normalizer - Bundled Implementation
 * Generated on ${new Date().toISOString()}
 * Contains all core functionality for the extension
 */

// Global namespace for the extension
if (typeof window !== 'undefined' && !window.ZoteroNER) {
  window.ZoteroNER = {};
}

(function() {
  'use strict';
  
  // Utility functions
  const utils = {
    // Deep clone an object
    clone: function(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) {
        const copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
      }
      if (obj instanceof Array) {
        const copy = [];
        for (let i = 0, len = obj.length; i < len; i++) {
          copy[i] = utils.clone(obj[i]);
        }
        return copy;
      }
      if (obj instanceof Object) {
        const copy = {};
        for (const attr in obj) {
          if (obj.hasOwnProperty(attr)) copy[attr] = utils.clone(obj[attr]);
        }
        return copy;
      }
      throw new Error("Unable to copy obj! Its type isn't supported.");
    },
    
    // Merge two objects
    merge: function(target, source) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
      return target;
    },
    
    // Calculate Levenshtein distance between two strings
    levenshteinDistance: function(str1, str2) {
      const matrix = [];
      
      if (str1.length === 0) return str2.length;
      if (str2.length === 0) return str1.length;
      
      // Initialize matrix
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      
      // Fill the matrix
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1,     // insertion
              matrix[i - 1][j] + 1      // deletion
            );
          }
        }
      }
      
      return matrix[str2.length][str1.length];
    }
  };
  
  // Main ZoteroNER namespace
  const ZoteroNER = window.ZoteroNER || {};
  
`;
  
  // Add each module to the bundle
  for (const modulePath of coreModules) {
    const fullPath = path.join(__dirname, 'src', modulePath);
    if (fs.existsSync(fullPath)) {
      console.log(`Including module: ${modulePath}`);
      
      // Get the module name (last part of the path without extension)
      const moduleName = path.basename(modulePath, '.js');
      const className = moduleName.charAt(0).toUpperCase() + moduleName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      
      // Read the module content
      let moduleContent = fs.readFileSync(fullPath, 'utf8');
      
      // Wrap the module in a function to avoid polluting the global scope
      bundledContent += `
  // Module: ${moduleName}
  try {
    ZoteroNER.${className} = (function() {
      // Module content
      ${moduleContent}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module ${moduleName}:', e);
  }
  
`;
    } else {
      console.warn(`Module not found: ${modulePath}`);
    }
  }
  
  // Add the initialization and export code
  bundledContent += `
  // Initialize the extension when Zotero is ready
  function initZoteroNER() {
    if (typeof Zotero === 'undefined') {
      console.warn('Zotero not found, delaying initialization');
      setTimeout(initZoteroNER, 1000);
      return;
    }
    
    try {
      // Make sure Zotero.NER exists
      if (!Zotero.NER) {
        Zotero.NER = {};
      }
      
      // Attach our bundled modules to Zotero.NER
      Object.keys(ZoteroNER).forEach(key => {
        Zotero.NER[key] = ZoteroNER[key];
      });
      
      console.log('Zotero NER Author Name Normalizer initialized');
    } catch (e) {
      console.error('Error initializing Zotero NER:', e);
    }
  }
  
  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZoteroNER;
  }
  
  // Initialize when the script loads
  if (typeof window !== 'undefined') {
    // Wait a bit for Zotero to be fully loaded
    setTimeout(initZoteroNER, 100);
  }
  
  // Make available globally
  window.ZoteroNER = ZoteroNER;
  
})();

// End of bundled content
`;
  
  // Write the bundled content to the output file
  fs.writeFileSync(outputFile, bundledContent);
  
  console.log(`Bundle created successfully: ${outputFile}`);
  console.log(`Bundle size: ${fs.statSync(outputFile).size} bytes`);
  
  return outputFile;
}

// Run the bundling if this script is executed directly
if (require.main === module) {
  try {
    const outputFile = bundleExtension();
    console.log('Bundling completed successfully!');
  } catch (error) {
    console.error('Bundling failed:', error);
    process.exit(1);
  }
}

module.exports = bundleExtension;