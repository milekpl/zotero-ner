import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json";

export default defineConfig({
  source: ["src"],
  dist: "build",
  name: pkg.description,
  id: "zotero-ner-author-normalizer@marcinmilkowski.pl",
  namespace: "zoteroNER",
  
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
      prefix: "extensions.zotero-ner",
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.js"],
        define: {
          __env__: `"${process.env.NODE_ENV || 'development'}"`,
        },
        bundle: true,
        target: "firefox115",
        outfile: "build/content/scripts/zotero-ner-bundled.js",
        banner: {
          js: `// Console polyfill for Zotero 8
if (typeof console === 'undefined') {
  globalThis.console = {
    log: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NER: ' + Array.prototype.join.call(arguments, ' ')); },
    warn: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NER WARN: ' + Array.prototype.join.call(arguments, ' ')); },
    error: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NER ERROR: ' + Array.prototype.join.call(arguments, ' ')); },
    info: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NER INFO: ' + Array.prototype.join.call(arguments, ' ')); },
    debug: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NER DEBUG: ' + Array.prototype.join.call(arguments, ' ')); }
  };
}`,
        },
      },
    ],
  },

  server: {
    asProxy: false,
  },

  test: {
    waitForPlugin: "() => typeof Zotero !== 'undefined' && Zotero.ZoteroNER?.initialized",
  },
});
