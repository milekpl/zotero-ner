/**
 * Entry point for bundling all NER functionality
 * This file exports all core modules for use in the bundled extension
 */

// Console polyfill for Zotero 8 compatibility
// In Zotero's extension context, console may not be defined
if (typeof console === 'undefined') {
  // eslint-disable-next-line no-global-assign
  globalThis.console = {
    log: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NER: ' + args.join(' '));
      }
    },
    warn: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NER WARN: ' + args.join(' '));
      }
    },
    error: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NER ERROR: ' + args.join(' '));
      }
    },
    info: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NER INFO: ' + args.join(' '));
      }
    },
    debug: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NER DEBUG: ' + args.join(' '));
      }
    }
  };
}

// Core modules
import NERProcessor from './core/ner-processor.js';
import NameParser from './core/name-parser.js';
import VariantGenerator from './core/variant-generator.js';
import LearningEngine from './core/learning-engine.js';
import CandidateFinder from './core/candidate-finder.js';

// Zotero integration modules
import ItemProcessor from './zotero/item-processor.js';
import MenuIntegration from './zotero/menu-integration.js';
import ZoteroDBAnalyzer from './zotero/zotero-db-analyzer.js';

// UI modules
import NormalizerDialog from './ui/normalizer-dialog.js';
import BatchProcessor from './ui/batch-processor.js';

// Storage modules
import DataManager from './storage/data-manager.js';

// Worker modules
import NERWorker from './worker/ner-worker.js';

// Re-export modules for external usage
export {
  NERProcessor,
  NameParser,
  VariantGenerator,
  LearningEngine,
  CandidateFinder,
  ItemProcessor,
  MenuIntegration,
  ZoteroDBAnalyzer,
  NormalizerDialog,
  BatchProcessor,
  DataManager,
  NERWorker
};

// Create a global namespace for easy access
const ZoteroNER = {
  NERProcessor,
  NameParser,
  VariantGenerator,
  LearningEngine,
  CandidateFinder,
  ItemProcessor,
  MenuIntegration,
  ZoteroDBAnalyzer,
  NormalizerDialog,
  BatchProcessor,
  DataManager,
  NERWorker
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.ZoteroNER = ZoteroNER;
}

// Also make it available as a module export
export default ZoteroNER;