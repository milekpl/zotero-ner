/**
 * Entry point for bundling all Name Normalizer functionality
 * This file exports all core modules for use in the bundled extension
 */

// Console polyfill for Zotero 8 compatibility
// In Zotero's extension context, console may not be defined
if (typeof console === 'undefined') {
  // eslint-disable-next-line no-global-assign
  globalThis.console = {
    log: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NameNormalizer: ' + args.join(' '));
      }
    },
    warn: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NameNormalizer WARN: ' + args.join(' '));
      }
    },
    error: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NameNormalizer ERROR: ' + args.join(' '));
      }
    },
    info: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NameNormalizer INFO: ' + args.join(' '));
      }
    },
    debug: function(...args) {
      if (typeof Zotero !== 'undefined' && Zotero.debug) {
        Zotero.debug('NameNormalizer DEBUG: ' + args.join(' '));
      }
    }
  };
}

// Core modules
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

// Create the ZoteroNameNormalizer namespace
const ZoteroNameNormalizer = {
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
};

// Export modules for use in other modules
export {
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
};

export default ZoteroNameNormalizer;

// Also expose on window/global for non-module contexts
if (typeof window !== 'undefined') {
  window.ZoteroNameNormalizer = ZoteroNameNormalizer;
} else if (typeof globalThis !== 'undefined') {
  globalThis.ZoteroNameNormalizer = ZoteroNameNormalizer;
}
