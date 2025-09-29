#!/usr/bin/env node

const { ESLint } = require('eslint');
const path = require('path');

async function lintSpecificFiles() {
  // Get the project root directory
  const projectRoot = path.join(__dirname, '..');
  const configPath = path.join(projectRoot, '.eslintrc.simple.json');

  const eslint = new ESLint({
    overrideConfigFile: configPath,
  });

  // Only lint the specific files we're working on
  const filesToLint = [
    path.join(projectRoot, 'content/scripts/zotero-ner.js'),
    path.join(projectRoot, 'content/scripts/normalization-dialog-controller.js')
  ];

  try {
    const results = await eslint.lintFiles(filesToLint);
    
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);
    
    console.log(resultText);
    
    // Check if there are any errors (warnings are OK)
    const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0);
    
    if (errorCount > 0) {
      console.error(`\n❌ Found ${errorCount} errors that need to be fixed.`);
      process.exit(1);
    } else {
      console.log('\n✅ All files passed linting!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running ESLint:', error);
    process.exit(1);
  }
}

lintSpecificFiles();