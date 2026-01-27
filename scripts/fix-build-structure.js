#!/usr/bin/env node
/**
 * Post-build script to fix the directory structure created by zotero-plugin-scaffold
 * The scaffold flattens _locales to the root, but WebExtensions need _locales as a directory
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build', 'addon');
const enUSSource = path.join(buildDir, 'en_US');
const localesDir = path.join(buildDir, '_locales');
const enUSTarget = path.join(localesDir, 'en_US');

// Check if en_US directory exists at root level (incorrect location)
if (fs.existsSync(enUSSource)) {
  console.log('Fixing locale directory structure...');
  
  // Create _locales directory if it doesn't exist
  if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
    console.log('Created _locales directory');
  }
  
  // Remove target if it exists
  if (fs.existsSync(enUSTarget)) {
    fs.rmSync(enUSTarget, { recursive: true, force: true });
  }
  
  // Move en_US into _locales
  fs.renameSync(enUSSource, enUSTarget);
  console.log('Moved en_US to _locales/en_US');
} else if (fs.existsSync(enUSTarget)) {
  console.log('Locale directory structure is already correct.');
} else {
  console.warn('Warning: Could not find locale files.');
}
