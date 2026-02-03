import { defineConfig } from "zotero-plugin-scaffold";
import path from "path";
import pkg from "./package.json";
import fs from "fs";

const projectRoot = path.resolve(__dirname);

// Custom post-build hook to copy bundled script to source directory for development
function setupDevEnvironment() {
  const sourceBundledPath = path.join(projectRoot, 'content', 'scripts', 'zotero-ner-bundled.js');
  const buildBundledPath = path.join(projectRoot, 'build', 'addon', 'content', 'scripts', 'zotero-ner-bundled.js');
  
  if (fs.existsSync(buildBundledPath)) {
    fs.copyFileSync(buildBundledPath, sourceBundledPath);
    console.log('Copied bundled script to content/scripts for development');
  }
}

export default defineConfig({
  source: ["src"],
  dist: "build",
  name: pkg.description,
  id: "zotero-name-normalizer@marcinmilkowski.pl",
  namespace: "ZoteroNameNormalizer",

  build: {
    assets: [
      "bootstrap.js",
      "manifest.json",
      "content/**/*",
      "_locales/**/*"
    ],
    define: {
      author: pkg.author,
      description: pkg.description,
      homepage: "https://github.com/marcinmilkowski/zotero-ner",
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    prefs: {
      prefix: "extensions.zotero-name-normalizer",
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.js"],
        define: {
          __env__: `"${process.env.NODE_ENV || 'development'}"`,
        },
        bundle: true,
        target: "firefox115",
        outfile: "addon/content/scripts/zotero-ner-bundled.js",
        banner: {
          js: `// Console polyfill for Zotero 8
if (typeof console === 'undefined') {
  globalThis.console = {
    log: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer: ' + Array.prototype.join.call(arguments, ' ')); },
    warn: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer WARN: ' + Array.prototype.join.call(arguments, ' ')); },
    error: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer ERROR: ' + Array.prototype.join.call(arguments, ' ')); },
    info: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer INFO: ' + Array.prototype.join.call(arguments, ' ')); },
    debug: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer DEBUG: ' + Array.prototype.join.call(arguments, ' ')); }
  };
}
`,
        },
        footer: {
          js: `
// Export ZoteroNameNormalizer to scope for loadSubScript
// bootstrap.js sets __zotero_scope__ before loading this script
// Check both bare variable (if declared) and window/globalThis properties
var ZoteroNameNormalizerRef = typeof ZoteroNameNormalizer !== 'undefined'
  ? ZoteroNameNormalizer
  : (typeof window !== 'undefined' ? window.ZoteroNameNormalizer : null) ||
    (typeof globalThis !== 'undefined' ? globalThis.ZoteroNameNormalizer : null);

if (ZoteroNameNormalizerRef) {
  var targetScope = (typeof __zotero_scope__ !== 'undefined' && __zotero_scope__)
    ? __zotero_scope__
    : (typeof globalThis !== 'undefined' ? globalThis.__zotero_scope__ : null);
  if (targetScope) {
    targetScope.ZoteroNameNormalizer = ZoteroNameNormalizerRef;
  }
}
`,
        },
      },
    ],
    async onAfterBuild() {
      setupDevEnvironment();
    },
  },

  server: {
    asProxy: true,
  },

  test: {
    entries: ["tests/zotero-framework/test/tests"],
    waitForPlugin: "() => typeof Zotero !== 'undefined' && Zotero.NameNormalizer?.initialized",
    mocha: {
      timeout: 60000,
    },
    watch: false,
  },
});
