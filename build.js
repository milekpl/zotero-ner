#!/usr/bin/env node
/**
 * Build script for Zotero NER Author Name Normalizer extension (Zotero 7 compatible)
 * Creates a .xpi file by zipping the extension files
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function buildExtension() {
  console.log('Building Zotero 7 extension...');

  // First, run webpack to build the bundled JavaScript
  console.log('Running webpack...');
  exec('npx webpack --mode production', (webpackError, webpackStdout, webpackStderr) => {
    if (webpackError) {
      console.error('Webpack build failed:', webpackError);
      console.error('Webpack stderr:', webpackStderr);
      return;
    }
    console.log('Webpack build completed successfully');

    // Continue with the rest of the build process
    continueBuild();
  });
}

function continueBuild() {

  // Define source and output directories
  const sourceDir = __dirname;
  const outputDir = path.join(__dirname, 'dist');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFileName = `zotero-ner-author-normalizer-${require('./package.json').version}.xpi`;
  const outputPath = path.join(outputDir, outputFileName);
  
  // Create a temporary directory to stage the build
  const tempDir = path.join(outputDir, 'temp-build');
  if (fs.existsSync(tempDir)) {
    // Clean up any existing temp directory
    exec(`rm -rf "${tempDir}"`, () => {});
  }
  fs.mkdirSync(tempDir, { recursive: true });
  
  console.log('Copying extension files to staging directory...');
  
    // Copy only the necessary extension files to the temp directory
  const extensionFiles = [
    'manifest.json',
    'bootstrap.js'
  ];
  
  const extensionDirs = [
    'content'
  ];
  
  // Copy files
  for (const file of extensionFiles) {
    const src = path.join(sourceDir, file);
    const dest = path.join(tempDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied: ${file}`);
    }
  }
  
  // Copy directories recursively
  for (const dir of extensionDirs) {
    const src = path.join(sourceDir, dir);
    const dest = path.join(tempDir, dir);
    if (fs.existsSync(src)) {
      copyDirectory(src, dest);
      console.log(`Copied directory: ${dir}`);
    }
  }
  
  // Also copy _locales directory if it exists
  const localesSrc = path.join(sourceDir, '_locales');
  const localesDest = path.join(tempDir, '_locales');
  if (fs.existsSync(localesSrc)) {
    copyDirectory(localesSrc, localesDest);
    console.log('Copied directory: _locales');
  }
  
  // Also copy src directory to make it available to the extension
  // const srcSrc = path.join(sourceDir, 'src');
  // const srcDest = path.join(tempDir, 'src');
  // if (fs.existsSync(srcSrc)) {
  //   copyDirectory(srcSrc, srcDest);
  //   console.log('Copied directory: src');
  // }
  
  // Verify contents of staging directory
  console.log('Staging directory contents:');
  const stagedItems = fs.readdirSync(tempDir);
  console.log(stagedItems);
  
  // Run zip command from the output directory to ensure correct pathing
  const tempDirName = path.basename(tempDir);
  const outputFileNameOnly = path.basename(outputPath);
  
  const zipCmd = `cd "${outputDir}" && rm -f "${outputFileNameOnly}" && cd "${tempDirName}" && zip -r "../${outputFileNameOnly}" .`;
  
  console.log('Running zip command:', zipCmd);

  exec(zipCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Build failed: ${error}`);
      console.error('Error output:', stderr);
      // Clean up temp directory even on error
      exec(`rm -rf "${tempDir}"`, (cleanErr) => {
        if (cleanErr) {
          console.warn(`Warning: Could not clean up temp directory: ${cleanErr.message}`);
        }
      });
      return;
    }

    console.log('Build completed successfully!');
    console.log(`Output file: ${outputPath}`);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    console.log(`Size: ${stats.size} bytes`);
    
    // Clean up temp directory
    exec(`rm -rf "${tempDir}"`, (cleanErr) => {
      if (cleanErr) {
        console.warn(`Warning: Could not clean up temp directory: ${cleanErr.message}`);
      }
      
      // Validate that the .xpi file contains only correct files
      exec(`unzip -Z1 "${outputPath}" | head -15`, (err, out) => {
        if (!err) {
          console.log('Contents preview:');
          console.log(out);
        }
      });
    });
  });
}

// Helper function to copy directory recursively
function copyDirectory(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const items = fs.readdirSync(srcDir);
  
  for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run the build if this script is executed directly
if (require.main === module) {
  buildExtension();
}

module.exports = buildExtension;