/**
 * Entry point for bundling all NER functionality
 * This file exports all core modules for use in the bundled extension
 */

// Core modules
export { default as NERProcessor } from './core/ner-processor.js';
export { default as NameParser } from './core/name-parser.js';
export { default as VariantGenerator } from './core/variant-generator.js';
export { default as LearningEngine } from './core/learning-engine.js';
export { default as CandidateFinder } from './core/candidate-finder.js';
export { default as GLINERHandler } from './core/gliner-handler.js';

// Zotero integration modules
export { default as ItemProcessor } from './zotero/item-processor.js';
export { default as MenuIntegration } from './zotero/menu-integration.js';
export { default as ZoteroDBAnalyzer } from './zotero/zotero-db-analyzer.js';

// UI modules
export { default as NormalizerDialog } from './ui/normalizer-dialog.js';
export { default as BatchProcessor } from './ui/batch-processor.js';

// Storage modules
export { default as DataManager } from './storage/data-manager.js';

// Worker modules
export { default as NERWorker } from './worker/ner-worker.js';

// Create a global namespace for easy access
const ZoteroNER = {
  NERProcessor,
  NameParser,
  VariantGenerator,
  LearningEngine,
  CandidateFinder,
  GLINERHandler,
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