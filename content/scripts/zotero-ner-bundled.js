// Console polyfill for Zotero 8
if (typeof console === 'undefined') {
  globalThis.console = {
    log: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer: ' + Array.prototype.join.call(arguments, ' ')); },
    warn: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer WARN: ' + Array.prototype.join.call(arguments, ' ')); },
    error: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer ERROR: ' + Array.prototype.join.call(arguments, ' ')); },
    info: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer INFO: ' + Array.prototype.join.call(arguments, ' ')); },
    debug: function() { if (typeof Zotero !== 'undefined' && Zotero.debug) Zotero.debug('NameNormalizer DEBUG: ' + Array.prototype.join.call(arguments, ' ')); }
  };
}

(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/config/name-constants.js
  var require_name_constants = __commonJS({
    "src/config/name-constants.js"(exports, module) {
      var NAME_PREFIXES = [
        "van",
        "de",
        "la",
        "von",
        "del",
        "di",
        "du",
        "le",
        "lo",
        "da",
        "des",
        "dos",
        "das",
        "el",
        "al",
        "do",
        "d",
        "O'",
        "Mac",
        "Mc",
        "Saint",
        "St",
        "San",
        "Santa"
      ];
      var NAME_SUFFIXES = [
        "Jr",
        "Sr",
        "II",
        "III",
        "IV",
        "V",
        "PhD",
        "MD",
        "JD",
        "MBA",
        "MA",
        "BA",
        "BS",
        "MS",
        "BSc",
        "MSc",
        "Dr",
        "Prof",
        "Sir",
        "Jr.",
        "Sr."
      ];
      var COMMON_GIVEN_NAME_EQUIVALENTS = {
        "William": ["Bill", "Will", "Willy", "Billy"],
        "Robert": ["Bob", "Rob", "Bobby", "Bert"],
        "James": ["Jim", "Jimmy", "Jamie", "Jake"],
        "John": ["Jack", "Johnny", "Jon", "Sean"],
        "Michael": ["Mike", "Mick", "Mickey", "Mikey"],
        "David": ["Dave", "Davey", "Davy"],
        "Richard": ["Rich", "Dick", "Ricky", "Rick"],
        "Charles": ["Chuck", "Charlie", "Charley", "Carl"],
        "Thomas": ["Tom", "Tommy", "Todd"],
        "Christopher": ["Chris", "Christoph", "Kit"],
        "Daniel": ["Dan", "Danny", "Dani"],
        "Matthew": ["Matt", "Matthieu", "Matthew"],
        "Anthony": ["Tony", "Ant"],
        "Mark": ["Marc", "Marco"],
        "Steven": ["Steve", "Stevie"],
        "Paul": ["Paolo"],
        "Andrew": ["Andy", "Drew", "Andreas"],
        "Joshua": ["Josh", "Josiah"],
        "Kenneth": ["Ken", "Kenny"],
        "Kevin": ["Kev"],
        "Brian": ["Bry", "Bri"],
        "George": ["Geo", "Georgie"],
        "Edward": ["Ed", "Eddie", "Ned", "Ted"],
        "Ronald": ["Ron", "Ronny"],
        "Timothy": ["Tim", "Timmy", "Timothy"],
        "Jason": ["Jay", "Jace"],
        "Jeffrey": ["Jeff", "Geoff", "Jeffrey"],
        "Ryan": ["Ry"],
        "Jacob": ["Jake", "Jay"],
        "Gary": ["Gare", "Gar"],
        "Jonathan": ["Jon", "John", "Jonny"],
        "Stephen": ["Steve", "Steph", "Steven"],
        "Larry": ["Lawr", "Larr"],
        "Justin": ["Just", "Jus"],
        "Scott": ["Scot"],
        "Brandon": ["Brand", "Bran"],
        "Benjamin": ["Ben", "Benny", "Benjy"],
        "Samuel": ["Sam", "Sammy", "Samuel"],
        "Raymond": ["Ray", "Raye"],
        "Frank": ["Fran", "Franky"],
        "Gregory": ["Greg", "Gregg", "Gregory"],
        "Alexander": ["Alex", "Xander", "Andy"],
        "Patrick": ["Pat", "Paddy", "Rick"],
        "Jack": ["John", "Johnny"],
        "Dennis": ["Denn", "Den"],
        "Jerry": ["Jer", "Jerr"],
        "Tyler": ["Ty"],
        "Aaron": ["Ron", "Aron"],
        "Jose": ["Joe", "Joey", "Jose"],
        "Adam": ["Addy"],
        "Nathan": ["Nate", "Nat"],
        "Henry": ["Hank", "Harry"],
        "Douglas": ["Doug", "Dough"],
        "Zachary": ["Zach", " Zak"],
        "Peter": ["Pete", "Peter"],
        "Kyle": ["Ky"],
        "Noah": ["Noa"],
        "Ethan": ["Eth"],
        "Jeremy": ["Jer", "Remy"],
        "Walter": ["Walt", "Wally"],
        "Christian": ["Chris", "Christ"],
        "Keith": ["Kei"],
        "Roger": ["Roge", "Rog"],
        "Terry": ["Ter", "Terr"],
        "Austin": ["Aus"],
        "Sean": ["Shawn", "John", "Sean"],
        "Gerald": ["Gerry", "Geral", "Jerry"],
        "Carl": ["Karl", "Chuck"],
        "Dylan": ["Dill"],
        "Arthur": ["Art", "Artie"],
        "Lawrence": ["Larry", "Laur"],
        "Jordan": ["Jord", "Jay"],
        "Jesse": ["Jess", "Jesse"],
        "Bryan": ["Bryant", "Bry"],
        "Billy": ["Bill", "William"],
        "Bruce": ["Bru"],
        "Gabriel": ["Gabe", "Gabby"],
        "Joe": ["Joseph", "Joey"],
        "Logan": ["Log"],
        "Albert": ["Al", "Bert"],
        "Willie": ["Bill", "William", "Will"],
        "Alan": ["Al", "Allen"],
        "Norman": ["Norm"],
        "Harold": ["Hal", "Harry"],
        "Martha": ["Marty"],
        "Gloria": ["Glo"],
        "Annie": ["Ann"],
        "Olivia": ["Livy"]
      };
      var EUROPEAN_NAME_EQUIVALENTS = {
        "Johann": ["Johannes", "Hans", "Jan"],
        "Johannes": ["Johann", "Hans", "Jan"],
        "Hans": ["Johann", "Johannes", "Jan", "Gian"],
        "Jan": ["Johannes", "Hans", "Johan"],
        "Johan": ["Johannes", "Jan", "John"],
        "Jean": ["John", "Jean", "Johannes"],
        "Pierre": ["Peter", "Pier"],
        "Gian": ["John", "Gianni", "Jean"],
        "Gianni": ["John", "Gian", "Jean"],
        "Ivan": ["John", "Ian"],
        "Ian": ["John", "Ivan"],
        "Willem": ["William", "Willy", "Bill"],
        "Guillaume": ["William", "Bill"],
        "Guillermo": ["William", "Bill"],
        "Guglielmo": ["William", "Bill"],
        "Wilhelm": ["William", "Bill"],
        "Franz": ["Francis", "Frank"],
        "Francis": ["Franz", "Frank", "Francesco"],
        "Francesco": ["Francis", "Frank"],
        "Andres": ["Andrew", "Andreas"],
        "Andreas": ["Andrew", "Andres"],
        "Andrea": ["Andrew", "Andreas"],
        "Andre": ["Andrew", "Andreas"],
        "Andrei": ["Andrew", "Andreas"],
        "Kurt": ["Conrad", "Kurt"],
        "Conrad": ["Kurt", "Con"],
        "Lukas": ["Lucas", "Luke"],
        "Lucas": ["Luke", "Lukas"],
        "Luca": ["Luke", "Lucas"],
        "Klaus": ["Nicolas", "Claus"],
        "Nicolas": ["Nick", "Nicolas", "Klaus"],
        "Nikolaus": ["Nick", "Nicolas", "Klaus"],
        "Boris": ["Bill", "Boris"],
        "Aleksander": ["Alex", "Sasha"],
        "Aleksandr": ["Alex", "Sasha"],
        "Sasha": ["Alexander", "Alex"],
        "Michele": ["Michael", "Michel", "Mick"],
        "Michel": ["Michael", "Michele", "Mick"],
        "Mikhail": ["Michael", "Mick"]
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = {
          NAME_PREFIXES,
          NAME_SUFFIXES,
          COMMON_GIVEN_NAME_EQUIVALENTS,
          EUROPEAN_NAME_EQUIVALENTS
        };
      }
      if (typeof window !== "undefined") {
        window.NameConstants = {
          NAME_PREFIXES,
          NAME_SUFFIXES,
          COMMON_GIVEN_NAME_EQUIVALENTS,
          EUROPEAN_NAME_EQUIVALENTS
        };
      }
    }
  });

  // src/core/name-parser.js
  var require_name_parser = __commonJS({
    "src/core/name-parser.js"(exports, module) {
      var { NAME_PREFIXES, NAME_SUFFIXES } = require_name_constants();
      var NameParser2 = class {
        constructor() {
          this.prefixes = NAME_PREFIXES;
          this.suffixes = NAME_SUFFIXES;
          this.initialPattern = /^[A-Z]\.?$/;
          this.initialsPattern = /^[A-Z]\.[A-Z]\.?$/;
          this.parseCache = /* @__PURE__ */ new Map();
          this.cacheMaxSize = 5e3;
        }
        /**
         * Parse a name string with enhanced logic for specific cases
         * @param {string} rawName - Raw name string
         * @returns {Object} Parsed name components
         */
        parse(rawName) {
          if (this.parseCache.has(rawName)) {
            return this.parseCache.get(rawName);
          }
          const result = this._doParse(rawName);
          if (this.parseCache.size >= this.cacheMaxSize) {
            const entriesToDelete = Math.floor(this.cacheMaxSize / 2);
            const keys = this.parseCache.keys();
            for (let i = 0; i < entriesToDelete; i++) {
              this.parseCache.delete(keys.next().value);
            }
          }
          this.parseCache.set(rawName, result);
          return result;
        }
        /**
         * Internal parse implementation
         * @param {string} rawName - Raw name string
         * @returns {Object} Parsed name components
         * @private
         */
        _doParse(rawName) {
          const original = rawName || "";
          let working = (original || "").trim();
          let isInvertedFormat = false;
          if (working.includes(",")) {
            const commaSegments = working.split(",").map((segment) => segment.trim()).filter((segment) => segment.length > 0);
            if (commaSegments.length >= 2) {
              const firstSegment = commaSegments[0];
              const restSegments = commaSegments.slice(1);
              const restCombined = restSegments.join(" ").trim();
              if (new RegExp("\\p{L}", "u").test(firstSegment) && new RegExp("\\p{L}", "u").test(restCombined)) {
                working = `${restCombined} ${firstSegment}`.trim();
                isInvertedFormat = true;
              }
            }
          }
          let parts = working.replace(/[ ,\s]+$/, "").split(/\s+/);
          const result = {
            firstName: "",
            middleName: "",
            lastName: "",
            prefix: "",
            suffix: "",
            original
          };
          if (parts.length === 1 && parts[0] !== "") {
            if (this.prefixes.includes(parts[0].toLowerCase())) {
              result.prefix = parts[0];
            } else {
              result.lastName = parts[0];
            }
            return result;
          }
          if (parts.length === 1 && parts[0] === "") {
            return result;
          }
          if (parts.length >= 2) {
            result.firstName = this.stripTrailingPeriodIfName(parts[0]);
            if (isInvertedFormat) {
              const remainingParts = parts.slice(1);
              result.lastName = remainingParts.join(" ");
            } else {
              let prefixEndIndex = 1;
              while (prefixEndIndex < parts.length - 1 && this.prefixes.includes(parts[prefixEndIndex].toLowerCase())) {
                if (result.prefix) {
                  result.prefix = `${result.prefix} ${parts[prefixEndIndex]}`;
                } else {
                  result.prefix = parts[prefixEndIndex];
                }
                prefixEndIndex++;
              }
              if (result.prefix && prefixEndIndex < parts.length - 1) {
                if (this.isNextWordForPrefix(result.prefix, parts[prefixEndIndex])) {
                  result.prefix = `${result.prefix} ${parts[prefixEndIndex]}`;
                  prefixEndIndex++;
                }
              }
              let suffixStartIndex = parts.length - 1;
              while (suffixStartIndex > prefixEndIndex && this.suffixes.some((s) => parts[suffixStartIndex].toLowerCase() === s.toLowerCase() || parts[suffixStartIndex].toLowerCase() === s.toLowerCase() + ".")) {
                if (result.suffix) {
                  result.suffix = `${parts[suffixStartIndex]} ${result.suffix}`;
                } else {
                  result.suffix = parts[suffixStartIndex];
                }
                suffixStartIndex--;
              }
              if (suffixStartIndex >= prefixEndIndex) {
                result.lastName = parts[suffixStartIndex];
              }
              if (prefixEndIndex < suffixStartIndex) {
                const middleParts = parts.slice(prefixEndIndex, suffixStartIndex);
                if (middleParts.length > 0) {
                  result.middleName = middleParts.map((part) => this.stripTrailingPeriodIfName(part)).join(" ");
                }
              }
            }
          }
          result.firstName = this.stripTrailingPeriodIfName(result.firstName);
          result.middleName = this.stripTrailingPeriodIfName(result.middleName);
          result.lastName = this.stripTrailingPeriodIfName(result.lastName);
          return result;
        }
        /**
         * Check if the next word should be considered part of the prefix
         * @param {string} currentPrefix - Current prefix word 
         * @param {string} nextWord - Next word to consider
         * @returns {boolean} True if next word should be part of the prefix
         */
        isNextWordForPrefix(currentPrefix, nextWord) {
          const prefixesThatTakeName = ["del", "de", "da", "das", "dos", "do", "du", "des", "di"];
          if (prefixesThatTakeName.includes(currentPrefix)) {
            return /^[A-Z][a-zA-Z]+$/.test(nextWord) && nextWord.length > 1;
          }
          return false;
        }
        stripTrailingPeriodIfName(value) {
          if (!value || typeof value !== "string") {
            return value || "";
          }
          const trimmed = value.trim();
          if (!trimmed.endsWith(".")) {
            return trimmed;
          }
          const core = trimmed.slice(0, -1);
          if (core.length < 2) {
            return trimmed;
          }
          if (core.includes(".")) {
            return trimmed;
          }
          if (!/[A-Za-z]/.test(core)) {
            return trimmed;
          }
          if (!/[AEIOUYaeiouy]/.test(core)) {
            return trimmed;
          }
          return core;
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = NameParser2;
      }
    }
  });

  // src/core/variant-generator.js
  var require_variant_generator = __commonJS({
    "src/core/variant-generator.js"(exports, module) {
      var VariantGenerator2 = class {
        constructor() {
          this.variationPatterns = [
            this.fullForm,
            this.initialForm,
            this.lastOnlyForm,
            this.firstInitialLastForm,
            this.firstInitialsLastForm
          ];
        }
        /**
         * Generate various forms of a parsed name
         * @param {Object} parsedName - Name components from parser
         * @returns {Array} Array of variant representations
         */
        generateVariants(parsedName) {
          const variants = /* @__PURE__ */ new Set();
          this.variationPatterns.forEach((pattern) => {
            const variant = pattern.call(this, parsedName);
            if (variant) {
              variants.add(variant);
            }
          });
          variants.add(parsedName.original);
          return Array.from(variants);
        }
        /**
         * Full name: First Middle [Prefix] Last
         * @param {Object} parsedName - Parsed name object
         * @returns {string} Full name form
         */
        fullForm(parsedName) {
          const parts = [];
          if (parsedName.firstName) parts.push(parsedName.firstName);
          if (parsedName.middleName) parts.push(parsedName.middleName);
          if (parsedName.prefix) parts.push(parsedName.prefix);
          if (parsedName.lastName) parts.push(parsedName.lastName);
          return parts.join(" ").trim();
        }
        /**
         * Initials form: F.M. [Prefix] Last
         * @param {Object} parsedName - Parsed name object
         * @returns {string} Initials form
         */
        initialForm(parsedName) {
          if (!parsedName.firstName || !parsedName.lastName) return null;
          const firstNameInitial = parsedName.firstName.charAt(0).toUpperCase() + ".";
          let middleInitials = "";
          if (parsedName.middleName) {
            const middleParts = parsedName.middleName.split(/\s+/);
            middleInitials = middleParts.map((part) => part.charAt(0).toUpperCase() + ".").join(" ");
          }
          const parts = [];
          parts.push(firstNameInitial);
          if (middleInitials) parts.push(middleInitials);
          if (parsedName.prefix) parts.push(parsedName.prefix);
          parts.push(parsedName.lastName);
          return parts.join(" ").trim();
        }
        /**
         * Last name only
         * @param {Object} parsedName - Parsed name object
         * @returns {string} Last name only
         */
        lastOnlyForm(parsedName) {
          return parsedName.lastName ? parsedName.lastName.trim() : null;
        }
        /**
         * First Initial Last form: F. [Prefix] Last
         * @param {Object} parsedName - Parsed name object
         * @returns {string} First initial last form
         */
        firstInitialLastForm(parsedName) {
          if (!parsedName.firstName || !parsedName.lastName) return null;
          const firstNameInitial = parsedName.firstName.charAt(0).toUpperCase() + ".";
          const parts = [];
          parts.push(firstNameInitial);
          if (parsedName.prefix) parts.push(parsedName.prefix);
          parts.push(parsedName.lastName);
          return parts.join(" ").trim();
        }
        /**
         * First Initials Last form: F.M. [Prefix] Last
         * @param {Object} parsedName - Parsed name object
         * @returns {string} First and middle initials last form
         */
        firstInitialsLastForm(parsedName) {
          if (!parsedName.firstName || !parsedName.lastName) return null;
          const firstNameInitial = parsedName.firstName.charAt(0).toUpperCase() + ".";
          let middleInitials = "";
          if (parsedName.middleName) {
            const middleParts = parsedName.middleName.split(/\s+/);
            middleInitials = middleParts.map((part) => part.charAt(0).toUpperCase() + ".").join("");
          }
          const parts = [];
          parts.push(firstNameInitial + middleInitials);
          if (parsedName.prefix) parts.push(parsedName.prefix);
          parts.push(parsedName.lastName);
          const result = parts.join(" ").trim();
          return result.replace(/\.{2,}/g, ".");
        }
        /**
         * Generate canonical form for comparison
         * @param {Object} parsedName - Parsed name object
         * @returns {string} Canonical form
         */
        generateCanonical(parsedName) {
          const parts = [];
          if (parsedName.lastName) parts.push(parsedName.lastName.toUpperCase());
          if (parsedName.firstName) parts.push(parsedName.firstName.toUpperCase());
          if (parsedName.middleName) {
            const middleParts = parsedName.middleName.split(/\s+/);
            middleParts.forEach((part) => parts.push(part.toUpperCase()));
          }
          return parts.join(" ").trim();
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = VariantGenerator2;
      }
    }
  });

  // src/utils/string-distance.js
  var require_string_distance = __commonJS({
    "src/utils/string-distance.js"(exports, module) {
      function levenshteinDistance(str1, str2, maxDistance = Infinity) {
        if (str1 === str2) return 0;
        if (str1.length === 0) return str2.length;
        if (str2.length === 0) return str1.length;
        if (str1.length > str2.length) {
          [str1, str2] = [str2, str1];
        }
        const len1 = str1.length;
        const len2 = str2.length;
        if (len2 - len1 > maxDistance) {
          return maxDistance + 1;
        }
        let prevRow = new Array(len1 + 1);
        let currRow = new Array(len1 + 1);
        for (let j = 0; j <= len1; j++) {
          prevRow[j] = j;
        }
        for (let i = 1; i <= len2; i++) {
          currRow[0] = i;
          let minInRow = currRow[0];
          for (let j = 1; j <= len1; j++) {
            const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
            currRow[j] = Math.min(
              prevRow[j] + 1,
              // deletion
              currRow[j - 1] + 1,
              // insertion
              prevRow[j - 1] + cost
              // substitution
            );
            minInRow = Math.min(minInRow, currRow[j]);
          }
          if (minInRow > maxDistance) {
            return maxDistance + 1;
          }
          [prevRow, currRow] = [currRow, prevRow];
        }
        return prevRow[len1];
      }
      function normalizedLevenshtein(str1, str2, threshold = 0) {
        const len1 = str1.length;
        const len2 = str2.length;
        if (len1 === 0 && len2 === 0) return 1;
        if (len1 === 0 || len2 === 0) return 0;
        const maxLen = Math.max(len1, len2);
        const minLen = Math.min(len1, len2);
        if (minLen / maxLen < threshold) {
          return 0;
        }
        const maxDistance = Math.floor(maxLen * (1 - threshold));
        const distance = levenshteinDistance(str1, str2, maxDistance);
        if (distance > maxDistance) {
          return 0;
        }
        return 1 - distance / maxLen;
      }
      function normalizeName(str) {
        if (!str) return "";
        let normalized = str.toLowerCase();
        normalized = normalized.replace(/^\s*(von|van|de|la|du|and|of|le|da|di)\s+/i, "");
        normalized = normalized.replace(/ä/g, "ae");
        normalized = normalized.replace(/ö/g, "oe");
        normalized = normalized.replace(/ü/g, "ue");
        normalized = normalized.replace(/ł/g, "l");
        normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalized;
      }
      function isDiacriticOnlyVariant(name1, name2) {
        if (!name1 || !name2) return false;
        return normalizeName(name1) === normalizeName(name2);
      }
      if (typeof module !== "undefined" && module.exports) {
        module.exports = {
          levenshteinDistance,
          normalizedLevenshtein,
          isDiacriticOnlyVariant,
          normalizeName
        };
      }
      if (typeof window !== "undefined") {
        window.StringDistance = {
          levenshteinDistance,
          normalizedLevenshtein,
          isDiacriticOnlyVariant,
          normalizeName
        };
      }
    }
  });

  // src/core/learning-engine.js
  var require_learning_engine = __commonJS({
    "src/core/learning-engine.js"(exports, module) {
      var LearningEngine2 = class _LearningEngine {
        // Constants for similarity calculations
        static get CONFIDENCE_THRESHOLD() {
          return 0.8;
        }
        // Scoped mappings key for storage
        static get SCOPED_MAPPINGS_KEY() {
          return "field_normalizer_scoped_mappings";
        }
        // Field types for scoped mappings
        static get FIELD_TYPES() {
          return {
            PUBLISHER: "publisher",
            LOCATION: "location",
            JOURNAL: "journal"
          };
        }
        static get JARO_WINKLER_WEIGHT() {
          return 0.5;
        }
        static get LCS_WEIGHT() {
          return 0.3;
        }
        static get INITIAL_MATCHING_WEIGHT() {
          return 0.2;
        }
        static get PREFIX_BONUS() {
          return 0.1;
        }
        static get SINGLE_CHAR_MATCH_SCORE() {
          return 0.8;
        }
        constructor() {
          this.storageKey = "name_normalizer_mappings";
          this.settingsKey = "name_normalizer_settings";
          this.mappings = /* @__PURE__ */ new Map();
          this.settings = this.getDefaultSettings();
          this.distinctPairsKey = "name_normalizer_distinct_pairs";
          this.distinctPairs = /* @__PURE__ */ new Map();
          this.skipStorageKey = "name_normalizer_skipped_suggestions";
          this.skippedPairs = /* @__PURE__ */ new Set();
          this.canonicalKeyCache = /* @__PURE__ */ new Map();
          this.canonicalKeyCacheMaxSize = 1e4;
          this.similarityCache = /* @__PURE__ */ new Map();
          this.similarityCacheMaxSize = 5e3;
          this.pendingSaves = /* @__PURE__ */ new Set();
          this.saveTimeout = null;
          this.saveDelay = 5e3;
          this.maxBatchSize = 100;
          this.isBatchingEnabled = true;
          if (typeof window !== "undefined") {
            window.addEventListener("beforeunload", () => this.forceSave());
          }
          this.loadMappings();
          this.loadSettings();
          this.loadDistinctPairs();
          this.loadSkippedPairs();
          this.scopedMappings = /* @__PURE__ */ new Map();
          this.loadScopedMappings();
        }
        /**
         * Get the storage object based on environment
         */
        getStorage() {
          if (typeof localStorage !== "undefined") {
            return localStorage;
          } else if (typeof window !== "undefined" && window.localStorage) {
            return window.localStorage;
          } else {
            const globalObj = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : {};
            if (!globalObj._nameNormalizerStorage) {
              globalObj._nameNormalizerStorage = {};
            }
            return {
              getItem: (key) => globalObj._nameNormalizerStorage[key] || null,
              setItem: (key, value) => {
                globalObj._nameNormalizerStorage[key] = value;
              },
              removeItem: (key) => {
                delete globalObj._nameNormalizerStorage[key];
              }
            };
          }
        }
        /**
         * Load mappings from storage
         */
        async loadMappings() {
          try {
            const storage = this.getStorage();
            const stored = storage.getItem(this.storageKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              this.mappings = new Map(parsed);
            }
          } catch (error) {
            console.error("Error loading mappings:", error);
            this.mappings = /* @__PURE__ */ new Map();
          }
        }
        /**
         * Save mappings to storage
         */
        async saveMappings() {
          try {
            const storage = this.getStorage();
            const serialized = JSON.stringify([...this.mappings.entries()]);
            storage.setItem(this.storageKey, serialized);
          } catch (error) {
            console.error("Error saving mappings:", error);
          }
        }
        /**
         * Load settings from storage
         */
        async loadSettings() {
          try {
            const storage = this.getStorage();
            const stored = storage.getItem(this.settingsKey);
            if (stored) {
              this.settings = { ...this.getDefaultSettings(), ...JSON.parse(stored) };
            }
          } catch (error) {
            console.error("Error loading settings:", error);
            this.settings = this.getDefaultSettings();
          }
        }
        /**
         * Save settings to storage
         */
        async saveSettings() {
          try {
            const storage = this.getStorage();
            storage.setItem(this.settingsKey, JSON.stringify(this.settings));
          } catch (error) {
            console.error("Error saving settings:", error);
          }
        }
        async loadDistinctPairs() {
          try {
            const storage = this.getStorage();
            const stored = storage.getItem(this.distinctPairsKey);
            if (stored) {
              this.distinctPairs = new Map(JSON.parse(stored));
            }
          } catch (error) {
            console.error("Error loading distinct name pairs:", error);
            this.distinctPairs = /* @__PURE__ */ new Map();
          }
        }
        async saveDistinctPairs() {
          try {
            const storage = this.getStorage();
            const serialized = JSON.stringify([...this.distinctPairs.entries()]);
            storage.setItem(this.distinctPairsKey, serialized);
          } catch (error) {
            console.error("Error saving distinct name pairs:", error);
          }
        }
        createPairKey(nameA, nameB, scope = "") {
          if (!nameA || !nameB) {
            return null;
          }
          const canonicalA = this.createCanonicalKey(nameA);
          const canonicalB = this.createCanonicalKey(nameB);
          if (!canonicalA || !canonicalB) {
            return null;
          }
          const sorted = [canonicalA, canonicalB].sort();
          return `${scope || "global"}::${sorted[0]}|${sorted[1]}`;
        }
        async recordDistinctPair(nameA, nameB, scope = "") {
          const key = this.createPairKey(nameA, nameB, scope);
          if (!key) {
            return false;
          }
          if (!this.distinctPairs.has(key)) {
            this.distinctPairs.set(key, {
              scope: scope || "global",
              timestamp: Date.now()
            });
            await this.saveDistinctPairs();
            return true;
          }
          return false;
        }
        isDistinctPair(nameA, nameB, scope = "") {
          const key = this.createPairKey(nameA, nameB, scope);
          if (!key) {
            return false;
          }
          return this.distinctPairs.has(key);
        }
        async clearDistinctPair(nameA, nameB, scope = "") {
          const key = this.createPairKey(nameA, nameB, scope);
          if (!key) {
            return false;
          }
          if (this.distinctPairs.delete(key)) {
            await this.saveDistinctPairs();
            return true;
          }
          return false;
        }
        /**
         * Get default settings
         */
        getDefaultSettings() {
          return {
            autoApplyLearned: true,
            confidenceThreshold: _LearningEngine.CONFIDENCE_THRESHOLD,
            enableSpanishSurnameDetection: true,
            showSimilarityScore: true,
            maxSuggestions: 5
          };
        }
        /**
         * Store a learned mapping
         * @param {string} rawName - Original raw name
         * @param {string} normalized - User-accepted normalized form
         * @param {number} confidence - Confidence score (0-1)
         * @param {Object} context - Additional context information
         */
        async storeMapping(rawName, normalized, confidence = 1, context = {}) {
          const canonicalKey = this.createCanonicalKey(rawName);
          const now = Date.now();
          if (this.mappings.has(canonicalKey)) {
            const existing = this.mappings.get(canonicalKey);
            existing.normalized = normalized;
            existing.confidence = Math.max(existing.confidence, confidence);
            existing.lastUsed = now;
            existing.usageCount = (existing.usageCount || 0) + 1;
            existing.context = { ...existing.context, ...context };
          } else {
            this.mappings.set(canonicalKey, {
              raw: rawName,
              normalized,
              timestamp: now,
              lastUsed: now,
              confidence,
              usageCount: 1,
              context
            });
          }
          if (this.isBatchingEnabled) {
            this.pendingSaves.add(canonicalKey);
            if (this.pendingSaves.size >= this.maxBatchSize) {
              await this.flushPendingSaves();
            } else {
              this.scheduleSave();
            }
          } else {
            await this.saveMappings();
          }
        }
        /**
         * Schedule a batched save operation
         * @private
         */
        scheduleSave() {
          if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
          }
          this.saveTimeout = setTimeout(() => {
            this.flushPendingSaves();
          }, this.saveDelay);
        }
        /**
         * Flush all pending saves to storage
         * @private
         */
        async flushPendingSaves() {
          if (this.pendingSaves.size === 0) return;
          this.pendingSaves.clear();
          await this.saveMappings();
        }
        /**
         * Force immediate save of all pending changes
         * Call this before shutdown or critical operations
         */
        async forceSave() {
          if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
          }
          await this.flushPendingSaves();
        }
        /**
         * Record that a mapping was used (for popularity tracking)
         * @param {string} rawName - Raw name that was mapped
         */
        async recordUsage(rawName) {
          const canonicalKey = this.createCanonicalKey(rawName);
          const mapping = this.mappings.get(canonicalKey);
          if (mapping) {
            mapping.lastUsed = Date.now();
            mapping.usageCount = (mapping.usageCount || 0) + 1;
            if (this.isBatchingEnabled) {
              this.pendingSaves.add(canonicalKey);
              this.scheduleSave();
            } else {
              await this.saveMappings();
            }
          }
        }
        /**
         * Retrieve a learned mapping
         * @param {string} rawName - Raw name to look up
         * @returns {string|null} Normalized form if found
         */
        getMapping(rawName) {
          const canonicalKey = this.createCanonicalKey(rawName);
          const mapping = this.mappings.get(canonicalKey);
          if (mapping) {
            this.recordUsage(rawName);
            return mapping.normalized;
          }
          return null;
        }
        /**
         * Check if a mapping exists
         * @param {string} rawName - Raw name to check
         * @returns {boolean} True if mapping exists
         */
        hasMapping(rawName) {
          const canonicalKey = this.createCanonicalKey(rawName);
          return this.mappings.has(canonicalKey);
        }
        /**
         * Get mapping details with metadata
         * @param {string} rawName - Raw name to look up
         * @returns {Object|null} Mapping object with metadata if found
         */
        getMappingDetails(rawName) {
          const canonicalKey = this.createCanonicalKey(rawName);
          const mapping = this.mappings.get(canonicalKey);
          if (mapping) {
            this.recordUsage(rawName);
            return { ...mapping };
          }
          return null;
        }
        /**
         * Get all mappings
         * @returns {Map} All stored mappings
         */
        getAllMappings() {
          return new Map(this.mappings);
        }
        /**
         * Remove a specific mapping
         * @param {string} rawName - Raw name to remove
         */
        async removeMapping(rawName) {
          const canonicalKey = this.createCanonicalKey(rawName);
          this.mappings.delete(canonicalKey);
          await this.saveMappings();
        }
        /**
         * Clear all mappings
         */
        async clearAllMappings() {
          this.mappings.clear();
          await this.saveMappings();
        }
        /**
         * Create a canonical key for consistent lookups
         * @param {string} name - Name to create key for
         * @returns {string} Canonical key
         */
        createCanonicalKey(name) {
          if (name == null) {
            return "";
          }
          if (this.canonicalKeyCache.has(name)) {
            return this.canonicalKeyCache.get(name);
          }
          const key = name.trim().toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
          if (this.canonicalKeyCache.size >= this.canonicalKeyCacheMaxSize) {
            const entriesToDelete = Math.floor(this.canonicalKeyCacheMaxSize / 2);
            const keys = this.canonicalKeyCache.keys();
            for (let i = 0; i < entriesToDelete; i++) {
              this.canonicalKeyCache.delete(keys.next().value);
            }
          }
          this.canonicalKeyCache.set(name, key);
          return key;
        }
        /**
         * Find similar names using enhanced similarity algorithm
         * @param {string} name - Name to find similarities for
         * @returns {Array} Array of similar mappings
         */
        findSimilar(name) {
          const query = this.createCanonicalKey(name);
          const results = [];
          const candidateKeys = [...this.mappings.keys()];
          for (const key of candidateKeys) {
            const mapping = this.mappings.get(key);
            if (!mapping) continue;
            const { isDiacriticOnlyVariant } = require_string_distance();
            if (isDiacriticOnlyVariant(query, key)) {
              const similarity2 = 0.95;
              if (similarity2 >= this.settings.confidenceThreshold) {
                results.push({
                  ...mapping,
                  similarity: similarity2
                });
              }
              continue;
            }
            const similarity = this.calculateSimilarity(query, key);
            if (similarity >= this.settings.confidenceThreshold) {
              results.push({
                ...mapping,
                similarity
              });
            }
          }
          return results.sort((a, b) => {
            if (b.similarity !== a.similarity) {
              return b.similarity - a.similarity;
            }
            return (b.usageCount || 0) - (a.usageCount || 0);
          }).slice(0, this.settings.maxSuggestions);
        }
        /**
         * Calculate similarity between two strings using multiple methods
         * @param {string} str1 - First string
         * @param {string} str2 - Second string
         * @returns {number} Similarity score (0-1)
         */
        calculateSimilarity(str1, str2) {
          if (str1 === str2) return 1;
          if (!str1 || !str2) return 0;
          const cacheKey = str1 < str2 ? `${str1}|${str2}` : `${str2}|${str1}`;
          if (this.similarityCache.has(cacheKey)) {
            return this.similarityCache.get(cacheKey);
          }
          const len1 = str1.length;
          const len2 = str2.length;
          const maxLen = Math.max(len1, len2);
          const minLen = Math.min(len1, len2);
          if (minLen / maxLen < 0.5) {
            this.setSimilarityCache(cacheKey, 0);
            return 0;
          }
          if (str1[0]?.toLowerCase() !== str2[0]?.toLowerCase()) {
            const jaroWinkler2 = this.jaroWinklerSimilarity(str1, str2);
            if (jaroWinkler2 < 0.5) {
              const result2 = jaroWinkler2 * 0.5;
              this.setSimilarityCache(cacheKey, result2);
              return result2;
            }
          }
          const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
          if (jaroWinkler < 0.3) {
            const result2 = jaroWinkler * 0.5;
            this.setSimilarityCache(cacheKey, result2);
            return result2;
          }
          const longestCommonSubsequence = this.lcsSimilarity(str1, str2);
          const initialMatching = this.initialMatchingSimilarity(str1, str2);
          const result = jaroWinkler * _LearningEngine.JARO_WINKLER_WEIGHT + longestCommonSubsequence * _LearningEngine.LCS_WEIGHT + initialMatching * _LearningEngine.INITIAL_MATCHING_WEIGHT;
          this.setSimilarityCache(cacheKey, result);
          return result;
        }
        /**
         * Set similarity cache with LRU eviction
         * @param {string} key - Cache key
         * @param {number} value - Similarity score
         */
        setSimilarityCache(key, value) {
          if (this.similarityCache.size >= this.similarityCacheMaxSize) {
            const entriesToDelete = Math.floor(this.similarityCacheMaxSize / 2);
            const keys = this.similarityCache.keys();
            for (let i = 0; i < entriesToDelete; i++) {
              this.similarityCache.delete(keys.next().value);
            }
          }
          this.similarityCache.set(key, value);
        }
        /**
         * Jaro-Winkler similarity (good for names)
         * @param {string} s1 - First string
         * @param {string} s2 - Second string
         * @returns {number} Similarity score
         */
        jaroWinklerSimilarity(s1, s2) {
          if (s1 === s2) return 1;
          if (!s1 || !s2) return 0;
          const matches = [];
          const s1_len = s1.length;
          const s2_len = s2.length;
          const match_window = Math.floor(Math.max(s1_len, s2_len) / 2) - 1;
          let matches_count = 0;
          let transpositions = 0;
          const s1_matches = new Array(s1_len).fill(false);
          const s2_matches = new Array(s2_len).fill(false);
          for (let i = 0; i < s1_len; i++) {
            const start = Math.max(0, i - match_window);
            const end = Math.min(i + match_window + 1, s2_len);
            for (let j = start; j < end; j++) {
              if (s2_matches[j] || s1[i] !== s2[j]) continue;
              s1_matches[i] = s2_matches[j] = true;
              matches_count++;
              matches.push(s1[i]);
              break;
            }
          }
          if (matches_count === 0) return 0;
          let k = 0;
          for (let i = 0; i < s1_len; i++) {
            if (!s1_matches[i]) continue;
            while (!s2_matches[k]) k++;
            if (s1[i] !== s2[k]) transpositions++;
            k++;
          }
          const jaro = (matches_count / s1_len + matches_count / s2_len + (matches_count - transpositions / 2) / matches_count) / 3;
          let prefix = 0;
          const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
          for (let i = 0; i < maxPrefix; i++) {
            if (s1[i] === s2[i]) prefix++;
            else break;
          }
          return jaro + _LearningEngine.PREFIX_BONUS * prefix * (1 - jaro);
        }
        /**
         * Longest Common Subsequence similarity
         * @param {string} s1 - First string
         * @param {string} s2 - Second string
         * @returns {number} Similarity score
         */
        lcsSimilarity(s1, s2) {
          if (!s1 || !s2) return 0;
          if (s1 === s2) return 1;
          const words1 = s1.split(/\s+/);
          const words2 = s2.split(/\s+/);
          let matches = 0;
          for (const word1 of words1) {
            if (words2.some((word2) => this.isSimilarWord(word1, word2))) {
              matches++;
            }
          }
          const totalWords = Math.max(words1.length, words2.length);
          return totalWords > 0 ? matches / totalWords : 0;
        }
        /**
         * Check if two words are similar (considering initials)
         * @param {string} word1 - First word
         * @param {string} word2 - Second word
         * @returns {boolean} True if words are similar
         */
        isSimilarWord(word1, word2) {
          word1 = word1.replace(/\./g, "");
          word2 = word2.replace(/\./g, "");
          if (word1 === word2) return true;
          if (word1.length === 1 && word2.startsWith(word1) || word2.length === 1 && word1.startsWith(word2)) {
            return true;
          }
          const commonAbbreviations = {
            "jose": "joseph",
            "joseph": "joe",
            "robert": "rob",
            "charles": "chuck",
            "william": "will",
            "jonathan": "jon"
          };
          if (commonAbbreviations[word1] === word2 || commonAbbreviations[word2] === word1) {
            return true;
          }
          return false;
        }
        /**
         * Public method to check if two words are similar
         * @param {string} word1 - First word
         * @param {string} word2 - Second word
         * @returns {boolean} True if words are similar
         */
        areWordsSimilar(word1, word2) {
          return this.isSimilarWord(word1, word2);
        }
        /**
         * Check if one word is an abbreviation of another
         * @param {string} abbr - Abbreviation
         * @param {string} full - Full word
         * @returns {boolean} True if abbr is an abbreviation of full
         */
        isAbbreviation(abbr, full) {
          if (abbr.length >= full.length) return false;
          for (let i = 0; i < abbr.length; i++) {
            if (full[i] !== abbr[i]) return false;
          }
          return true;
        }
        /**
         * Similarity based on initial matching
         * @param {string} s1 - First string
         * @param {string} s2 - Second string
         * @returns {number} Similarity score
         */
        initialMatchingSimilarity(s1, s2) {
          const words1 = s1.split(/\s+/);
          const words2 = s2.split(/\s+/);
          if (words1.length === 0 || words2.length === 0) return 0;
          const firstNameSim = this.compareNameParts(
            words1[0],
            words2[0]
          );
          const lastNameSim = this.compareNameParts(
            words1[words1.length - 1],
            words2[words2.length - 1]
          );
          return (firstNameSim + lastNameSim) / 2;
        }
        /**
         * Compare two name parts for similarity
         * @param {string} part1 - First name part
         * @param {string} part2 - Second name part
         * @returns {number} Similarity score
         */
        compareNameParts(part1, part2) {
          if (!part1 || !part2) return 0;
          if (part1.toLowerCase() === part2.toLowerCase()) return 1;
          const clean1 = part1.replace(/\./g, "").toLowerCase();
          const clean2 = part2.replace(/\./g, "").toLowerCase();
          if (clean1.length === 1 && clean2.startsWith(clean1)) return _LearningEngine.SINGLE_CHAR_MATCH_SCORE;
          if (clean2.length === 1 && clean1.startsWith(clean2)) return _LearningEngine.SINGLE_CHAR_MATCH_SCORE;
          return this.jaroWinklerSimilarity(clean1, clean2);
        }
        /**
         * Export mappings to a format suitable for sharing or backup
         * @returns {Object} Exported data
         */
        exportMappings() {
          const exportData = {
            version: "1.0",
            timestamp: Date.now(),
            mappings: [...this.mappings.entries()],
            settings: this.settings
          };
          return exportData;
        }
        /**
         * Import mappings from exported data
         * @param {Object} importData - Data to import
         */
        importMappings(importData) {
          if (importData.version !== "1.0") {
            throw new Error("Unsupported import data version");
          }
          this.mappings = new Map(importData.mappings);
          if (importData.settings) {
            this.settings = { ...this.settings, ...importData.settings };
            this.saveSettings();
          }
          this.saveMappings();
        }
        /**
         * Get statistics about the learning engine
         * @returns {Object} Statistics
         */
        getStatistics() {
          const totalMappings = this.mappings.size;
          let totalUsage = 0;
          let avgConfidence = 0;
          for (const mapping of this.mappings.values()) {
            totalUsage += mapping.usageCount || 0;
            avgConfidence += mapping.confidence || 0;
          }
          avgConfidence = totalMappings > 0 ? avgConfidence / totalMappings : 0;
          return {
            totalMappings,
            totalUsage,
            averageUsage: totalMappings > 0 ? totalUsage / totalMappings : 0,
            averageConfidence: avgConfidence,
            skippedPairs: this.skippedPairs ? this.skippedPairs.size : 0
          };
        }
        // ============ Skip Learning Methods ============
        /**
         * Get the storage key for skipped suggestions
         */
        static get SKIP_STORAGE_KEY() {
          return "name_normalizer_skipped_suggestions";
        }
        /**
         * Initialize skipped pairs from storage
         */
        loadSkippedPairs() {
          try {
            const storage = this.getStorage();
            const stored = storage.getItem(_LearningEngine.SKIP_STORAGE_KEY);
            if (stored) {
              this.skippedPairs = new Set(JSON.parse(stored));
            } else {
              this.skippedPairs = /* @__PURE__ */ new Set();
            }
          } catch (error) {
            console.error("Error loading skipped pairs:", error);
            this.skippedPairs = /* @__PURE__ */ new Set();
          }
        }
        /**
         * Save skipped pairs to storage
         */
        saveSkippedPairs() {
          try {
            const storage = this.getStorage();
            const serialized = JSON.stringify([...this.skippedPairs]);
            storage.setItem(_LearningEngine.SKIP_STORAGE_KEY, serialized);
            if (typeof Zotero !== "undefined" && Zotero.Prefs) {
              Zotero.Prefs.set(_LearningEngine.SKIP_STORAGE_KEY, serialized);
            }
          } catch (error) {
            console.error("Error saving skipped pairs:", error);
          }
        }
        /**
         * Generate a unique key for skip decisions
         * Format: name:skip:{surnameHash}:{firstNamePatternHash}
         * @param {string} surname - Surname to generate key for
         * @param {string} firstNamePattern - First name pattern (can be empty string)
         * @returns {string} Skip key
         */
        generateSkipKey(surname, firstNamePattern) {
          const s = (surname || "").toLowerCase().trim();
          const f = (firstNamePattern || "").toLowerCase().trim();
          const hashString = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = (hash << 5) - hash + char;
              hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
          };
          const sHash = hashString(s);
          const fHash = hashString(f);
          return `name:skip:${sHash}:${fHash}`;
        }
        /**
         * Record a skip decision for a suggestion
         * @param {string} surname - Surname that was skipped
         * @param {string} firstNamePattern - First name pattern that was skipped
         * @param {Object} context - Additional context (e.g., suggestion object)
         * @returns {boolean} True if recorded successfully
         */
        recordSkipDecision(surname, firstNamePattern, context = {}) {
          const key = this.generateSkipKey(surname, firstNamePattern);
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          if (!this.skippedPairs.has(key)) {
            this.skippedPairs.add(key);
            this.saveSkippedPairs();
            if (context.debug) {
              console.debug(`LearningEngine: Recorded skip for "${surname}, ${firstNamePattern}" -> ${key}`);
            }
            return true;
          }
          return false;
        }
        /**
         * Check if a suggestion should be skipped
         * @param {Object} suggestion - Suggestion object with surname and firstNamePattern
         * @returns {boolean} True if suggestion should be skipped
         */
        shouldSkipSuggestion(suggestion) {
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          const surname = suggestion.surname || suggestion.canonical || "";
          const firstNamePattern = suggestion.firstNamePattern || suggestion.firstName || "";
          const key = this.generateSkipKey(surname, firstNamePattern);
          return this.skippedPairs.has(key);
        }
        /**
         * Check if a specific pair should be skipped
         * @param {string} surname - Surname to check
         * @param {string} firstNamePattern - First name pattern to check
         * @returns {boolean} True if should be skipped
         */
        shouldSkipPair(surname, firstNamePattern) {
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          const key = this.generateSkipKey(surname, firstNamePattern);
          return this.skippedPairs.has(key);
        }
        /**
         * Remove a skip decision
         * @param {string} surname - Surname to unskip
         * @param {string} firstNamePattern - First name pattern to unskip
         * @returns {boolean} True if removed successfully
         */
        removeSkipDecision(surname, firstNamePattern) {
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          const key = this.generateSkipKey(surname, firstNamePattern);
          const removed = this.skippedPairs.delete(key);
          if (removed) {
            this.saveSkippedPairs();
          }
          return removed;
        }
        /**
         * Clear all skip decisions
         */
        clearSkippedPairs() {
          this.skippedPairs = /* @__PURE__ */ new Set();
          this.saveSkippedPairs();
          if (typeof Zotero !== "undefined" && Zotero.Prefs) {
            Zotero.Prefs.clear(_LearningEngine.SKIP_STORAGE_KEY);
          }
        }
        /**
         * Get count of skipped pairs
         * @returns {number} Number of skipped pairs
         */
        getSkippedPairsCount() {
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          return this.skippedPairs.size;
        }
        /**
         * Get all skipped pairs (for debugging/display)
         * @returns {Array} Array of skipped pair objects
         */
        getSkippedPairs() {
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          return [...this.skippedPairs];
        }
        /**
         * Filter out skipped suggestions from an array
         * @param {Array} suggestions - Array of suggestions to filter
         * @returns {Array} Filtered suggestions
         */
        filterSkippedSuggestions(suggestions) {
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          return suggestions.filter((suggestion) => !this.shouldSkipSuggestion(suggestion));
        }
        /**
         * Get statistics about skipped suggestions
         * @returns {Object} Skip statistics
         */
        getSkipStatistics() {
          if (!this.skippedPairs) {
            this.loadSkippedPairs();
          }
          return {
            skippedCount: this.skippedPairs ? this.skippedPairs.size : 0
          };
        }
        // ============ Scoped Mappings Methods ============
        /**
         * Load scoped mappings from storage
         */
        async loadScopedMappings() {
          try {
            const storage = this.getStorage();
            const stored = storage.getItem(_LearningEngine.SCOPED_MAPPINGS_KEY);
            if (stored) {
              const parsed = JSON.parse(stored);
              this.scopedMappings = new Map(parsed);
            }
          } catch (error) {
            console.error("Error loading scoped mappings:", error);
            this.scopedMappings = /* @__PURE__ */ new Map();
          }
        }
        /**
         * Save scoped mappings to storage
         */
        async saveScopedMappings() {
          try {
            const storage = this.getStorage();
            const serialized = JSON.stringify([...this.scopedMappings.entries()]);
            storage.setItem(_LearningEngine.SCOPED_MAPPINGS_KEY, serialized);
          } catch (error) {
            console.error("Error saving scoped mappings:", error);
          }
        }
        /**
         * Create a scoped key for mapping lookups
         * Format: ${scope}::${fieldType}::${canonicalKey}
         * @param {string} rawValue - Raw value to create key for
         * @param {string} fieldType - Field type (publisher, location, journal)
         * @param {string|null} collectionId - Collection ID or null for global scope
         * @returns {string} Scoped key
         */
        createScopedKey(rawValue, fieldType, collectionId) {
          const scope = collectionId || "global";
          const canonicalKey = this.createCanonicalKey(rawValue);
          return `${scope}::${fieldType}::${canonicalKey}`;
        }
        /**
         * Store a scoped mapping
         * @param {string} rawValue - Original raw value
         * @param {string} normalizedValue - User-accepted normalized form
         * @param {string} fieldType - Field type (publisher, location, journal)
         * @param {string|null} collectionId - Collection ID or null for global scope
         */
        async storeScopedMapping(rawValue, normalizedValue, fieldType, collectionId) {
          const scopedKey = this.createScopedKey(rawValue, fieldType, collectionId);
          const now = Date.now();
          if (this.scopedMappings.has(scopedKey)) {
            const existing = this.scopedMappings.get(scopedKey);
            existing.normalized = normalizedValue;
            existing.lastUsed = now;
            existing.usageCount = (existing.usageCount || 0) + 1;
          } else {
            this.scopedMappings.set(scopedKey, {
              raw: rawValue,
              normalized: normalizedValue,
              fieldType,
              scope: collectionId || "global",
              timestamp: now,
              lastUsed: now,
              usageCount: 1
            });
          }
          await this.saveScopedMappings();
        }
        /**
         * Get a scoped mapping
         * First checks exact scope (collectionId), then global scope (collectionId === null)
         * NO fallback to global mappings
         * @param {string} rawValue - Raw value to look up
         * @param {string} fieldType - Field type (publisher, location, journal)
         * @param {string|null} collectionId - Collection ID or null for global scope
         * @returns {string|null} Normalized form if found
         */
        getScopedMapping(rawValue, fieldType, collectionId) {
          const canonicalKey = this.createCanonicalKey(rawValue);
          const scope = collectionId || "global";
          const scopedKey = `${scope}::${fieldType}::${canonicalKey}`;
          const scopedMapping = this.scopedMappings.get(scopedKey);
          if (scopedMapping) {
            scopedMapping.lastUsed = Date.now();
            scopedMapping.usageCount = (scopedMapping.usageCount || 0) + 1;
            return scopedMapping.normalized;
          }
          if (collectionId !== null) {
            const globalKey = `global::${fieldType}::${canonicalKey}`;
            const globalMapping = this.scopedMappings.get(globalKey);
            if (globalMapping) {
              globalMapping.lastUsed = Date.now();
              globalMapping.usageCount = (globalMapping.usageCount || 0) + 1;
              return globalMapping.normalized;
            }
          }
          return null;
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = LearningEngine2;
      }
    }
  });

  // src/core/candidate-finder.js
  var require_candidate_finder = __commonJS({
    "src/core/candidate-finder.js"(exports, module) {
      var CandidateFinder2 = class _CandidateFinder {
        // Constants for name matching
        static get FIRST_NAME_SIMILARITY_THRESHOLD() {
          return 0.6;
        }
        constructor() {
          this._learningEngine = null;
          this._nameParser = null;
          this._variantGenerator = null;
        }
        /**
         * Lazy getter for learning engine
         */
        get learningEngine() {
          if (!this._learningEngine) {
            const LearningEngine2 = require_learning_engine();
            this._learningEngine = new LearningEngine2();
          }
          return this._learningEngine;
        }
        /**
         * Lazy getter for name parser
         */
        get nameParser() {
          if (!this._nameParser) {
            const NameParser2 = require_name_parser();
            this._nameParser = new NameParser2();
          }
          return this._nameParser;
        }
        /**
         * Lazy getter for variant generator
         */
        get variantGenerator() {
          if (!this._variantGenerator) {
            const VariantGenerator2 = require_variant_generator();
            this._variantGenerator = new VariantGenerator2();
          }
          return this._variantGenerator;
        }
        /**
         * Find all name variants in the Zotero database, focusing on first name/initial variations
         * for the same surnames
         * @param {Object} zoteroDB - Zotero database object (Zotero.DB in Zotero context)
         * @returns {Object} Object with surname groups and name variations
         */
        async findNameVariants(zoteroDB) {
          if (!zoteroDB) {
            throw new Error("Zotero database object required for candidate finding");
          }
          try {
            const creators = await this.fetchAllCreators(zoteroDB);
            const creatorsBySurname = this.groupCreatorsBySurname(creators);
            const surnameVariations = {};
            let totalVariantGroups = 0;
            for (const [surname, creatorList] of Object.entries(creatorsBySurname)) {
              const variations = this.findFirstInitialVariations(creatorList);
              if (variations.length > 0) {
                surnameVariations[surname] = variations;
                totalVariantGroups += variations.length;
              }
            }
            return {
              surnameGroups: creatorsBySurname,
              variationsBySurname: surnameVariations,
              totalVariantGroups,
              totalSurnames: Object.keys(creatorsBySurname).length
            };
          } catch (error) {
            console.error("Error in findNameVariants:", error);
            throw error;
          }
        }
        /**
         * Fetch all creators from the Zotero database
         * @param {Object} zoteroDB - Zotero database object
         * @returns {Array} Array of creator objects
         */
        async fetchAllCreators(zoteroDB) {
          if (typeof Zotero !== "undefined") {
            const creators = [];
            const items = await Zotero.Items.getAll();
            for (const item of items) {
              const itemCreators = item.getCreators();
              for (const creator of itemCreators) {
                creators.push(creator);
              }
            }
            return creators;
          } else {
            return [
              { firstName: "Jerry", lastName: "Fodor", creatorType: "author" },
              { firstName: "J.", lastName: "Fodor", creatorType: "author" },
              { firstName: "Jerry", lastName: "Fodor", creatorType: "author" },
              { firstName: "Jerry A.", lastName: "Fodor", creatorType: "author" },
              { firstName: "J.A.", lastName: "Fodor", creatorType: "author" },
              { firstName: "Eva", lastName: "van Dijk", creatorType: "author" },
              { firstName: "E.", lastName: "van Dijk", creatorType: "author" },
              { firstName: "John", lastName: "Smith", creatorType: "author" },
              { firstName: "J.", lastName: "Smith", creatorType: "author" },
              { firstName: "Johnny", lastName: "Smith", creatorType: "author" },
              { firstName: "J.B.", lastName: "Smith", creatorType: "author" },
              { firstName: "John B.", lastName: "Smith", creatorType: "author" }
            ];
          }
        }
        /**
         * Group creators by normalized first name + surname
         * This ensures only the SAME author (same first name variant) is grouped together
         * Different authors with the same surname (e.g., "Alex Martin" vs "Andrea Martin") are NOT grouped
         * Initial-only names are grouped with full names that match their first letter
         * @param {Array} creators - Array of creator objects
         * @returns {Object} Object with group keys and creator arrays as values
         */
        groupCreatorsBySurname(creators) {
          const grouped = {};
          const initialGroups = {};
          for (const creator of creators) {
            const parsed = this.nameParser.parse(`${creator.firstName || ""} ${creator.lastName || ""}`.trim());
            if (!parsed.lastName) {
              continue;
            }
            const firstName = (creator.firstName || "").trim();
            const normalizedFirst = this.normalizeFirstNameForGrouping(firstName);
            const lastNameKey = parsed.lastName.toLowerCase().trim();
            if (normalizedFirst.startsWith("init:")) {
              if (!initialGroups[lastNameKey]) {
                initialGroups[lastNameKey] = [];
              }
              initialGroups[lastNameKey].push({ creator, normalizedFirst });
            } else {
              const groupKey = `${normalizedFirst}|${lastNameKey}`;
              if (!grouped[groupKey]) {
                grouped[groupKey] = [];
              }
              grouped[groupKey].push(creator);
            }
          }
          for (const [surname, initials] of Object.entries(initialGroups)) {
            for (const { creator, normalizedFirst } of initials) {
              const firstLetter = normalizedFirst.slice(5).charAt(0).toLowerCase();
              const matchingKey = Object.keys(grouped).find((key) => {
                const [normFirst] = key.split("|");
                return normFirst.startsWith(firstLetter) && key.endsWith(`|${surname}`);
              });
              if (matchingKey) {
                grouped[matchingKey].push(creator);
              } else {
                const groupKey = `${normalizedFirst}|${surname}`;
                if (!grouped[groupKey]) {
                  grouped[groupKey] = [];
                }
                grouped[groupKey].push(creator);
              }
            }
          }
          return grouped;
        }
        /**
         * Normalize first name for grouping purposes
         * Handles initials and uses name variants from COMMON_GIVEN_NAME_EQUIVALENTS
         * @param {string} firstName - The first name to normalize
         * @returns {string} Normalized first name for grouping
         */
        normalizeFirstNameForGrouping(firstName) {
          if (!firstName || !firstName.trim()) {
            return "unknown";
          }
          const cleaned = firstName.toLowerCase().trim();
          const tokens = cleaned.split(/[\s.-]+/).filter(Boolean);
          const baseWord = tokens[0] || "";
          try {
            const { COMMON_GIVEN_NAME_EQUIVALENTS } = require_name_constants();
            for (const [canonical, variants] of Object.entries(COMMON_GIVEN_NAME_EQUIVALENTS)) {
              if (canonical.toLowerCase() === baseWord || variants && variants.some((v) => v.toLowerCase() === baseWord)) {
                return canonical.toLowerCase();
              }
            }
          } catch (e) {
          }
          const allTokensAreInitials = tokens.length > 0 && tokens.every((t) => t.length === 1);
          if (tokens.length === 1 && tokens[0].length <= 3) {
            return `init:${tokens[0]}`;
          } else if (allTokensAreInitials) {
            return `init:${cleaned.replace(/\./g, "")}`;
          }
          return baseWord || cleaned;
        }
        /**
         * Find first name/initial variations within a surname group
         * @param {Array} creators - Array of creators with the same surname
         * @returns {Array} Array of variation groups
         */
        findFirstInitialVariations(creators) {
          const nameFrequency = {};
          const nameToCreator = {};
          for (const creator of creators) {
            const fullName = `${creator.firstName || ""} ${creator.lastName || ""}`.trim().toLowerCase();
            nameFrequency[fullName] = (nameFrequency[fullName] || 0) + 1;
            if (!nameToCreator[fullName]) {
              nameToCreator[fullName] = creator;
            }
          }
          const firstNameVariants = {};
          for (const creator of creators) {
            const firstName = (creator.firstName || "").trim().toLowerCase();
            if (firstName) {
              if (!firstNameVariants[firstName]) {
                firstNameVariants[firstName] = 0;
              }
              firstNameVariants[firstName]++;
            }
          }
          const firstNames = Object.keys(firstNameVariants);
          const variantGroups = [];
          const getGroupingKey = (name) => {
            const len = name.length;
            const lengthBucket = len <= 3 ? "tiny" : len <= 5 ? "short" : len <= 8 ? "medium" : "long";
            const initial = name.charAt(0).toLowerCase();
            return `${initial}_${lengthBucket}`;
          };
          const byGroup = {};
          for (const name of firstNames) {
            const key = getGroupingKey(name);
            if (!byGroup[key]) byGroup[key] = [];
            byGroup[key].push(name);
          }
          const { normalizedLevenshtein } = require_string_distance();
          for (const key in byGroup) {
            const group = byGroup[key];
            if (group.length < 2) continue;
            for (let i = 0; i < group.length; i++) {
              for (let j = i + 1; j < group.length; j++) {
                const name1 = group[i];
                const name2 = group[j];
                if (Math.abs(name1.length - name2.length) > 3) continue;
                const similarity = normalizedLevenshtein(name1, name2, _CandidateFinder.FIRST_NAME_SIMILARITY_THRESHOLD);
                if (similarity >= _CandidateFinder.FIRST_NAME_SIMILARITY_THRESHOLD) {
                  const maxLength = Math.max(name1.length, name2.length);
                  const distance = Math.floor(maxLength * (1 - similarity));
                  variantGroups.push({
                    surname: creators[0].lastName,
                    variant1: {
                      firstName: name1,
                      frequency: firstNameVariants[name1]
                    },
                    variant2: {
                      firstName: name2,
                      frequency: firstNameVariants[name2]
                    },
                    similarity,
                    distance
                  });
                }
              }
            }
          }
          variantGroups.sort((a, b) => {
            const totalFreqA = a.variant1.frequency + a.variant2.frequency;
            const totalFreqB = b.variant1.frequency + b.variant2.frequency;
            return totalFreqB - totalFreqA;
          });
          return variantGroups;
        }
        /**
         * Find canonical forms based on frequency for each surname group
         * @param {Object} variationsBySurname - Object with surname variations
         * @returns {Object} Mapping of name variants to canonical forms
         */
        findCanonicalForms(variationsBySurname) {
          const canonicalForms = {};
          for (const [surname, variations] of Object.entries(variationsBySurname)) {
            for (const variation of variations) {
              const canonical = variation.variant1.frequency >= variation.variant2.frequency ? variation.variant1.firstName : variation.variant2.firstName;
              const fullVariant1 = `${variation.variant1.firstName} ${variation.surname}`.trim();
              const fullVariant2 = `${variation.variant2.firstName} ${variation.surname}`.trim();
              const fullCanonical = `${canonical} ${variation.surname}`.trim();
              canonicalForms[fullVariant1.toLowerCase()] = fullCanonical;
              canonicalForms[fullVariant2.toLowerCase()] = fullCanonical;
            }
          }
          return canonicalForms;
        }
        /**
         * Calculate Levenshtein distance between two strings
         * @param {string} str1 - First string
         * @param {string} str2 - Second string
         * @returns {number} Levenshtein distance
         */
        calculateLevenshteinDistance(str1, str2) {
          const matrix = [];
          if (str1.length === 0) return str2.length;
          if (str2.length === 0) return str1.length;
          for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
              if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1,
                  matrix[i][j - 1] + 1,
                  matrix[i - 1][j] + 1
                );
              }
            }
          }
          return matrix[str2.length][str1.length];
        }
        /**
         * Perform a full analysis of the Zotero library for first name/initial normalization opportunities
         * @param {Object} zoteroDB - Zotero database object
         * @returns {Object} Complete analysis results
         */
        async performFullAnalysis(zoteroDB) {
          console.log("Starting full name variant analysis (first name/initial focus)...");
          const variantData = await this.findNameVariants(zoteroDB);
          const canonicalForms = this.findCanonicalForms(variantData.variationsBySurname);
          const suggestions = await this.generateNormalizationSuggestions(
            variantData.variationsBySurname,
            canonicalForms
          );
          console.log(`Analysis complete: Found ${variantData.totalVariantGroups} variant groups across ${variantData.totalSurnames} surnames`);
          return {
            surnameGroups: variantData.surnameGroups,
            variationsBySurname: variantData.variationsBySurname,
            canonicalForms,
            suggestions,
            totalVariantGroups: variantData.totalVariantGroups,
            totalSurnamesAnalyzed: variantData.totalSurnames
          };
        }
        /**
         * Generate normalization suggestions for UI presentation
         * @param {Object} variationsBySurname - Variations grouped by surname
         * @param {Object} canonicalForms - Canonical form mappings
         * @returns {Array} Array of suggestions for user review
         */
        async generateNormalizationSuggestions(variationsBySurname, canonicalForms) {
          const suggestions = [];
          for (const [surname, variations] of Object.entries(variationsBySurname)) {
            for (const variation of variations) {
              const fullVariant1 = `${variation.variant1.firstName} ${variation.surname}`.trim();
              const fullVariant2 = `${variation.variant2.firstName} ${variation.surname}`.trim();
              suggestions.push({
                surname: variation.surname,
                canonicalForm: canonicalForms[fullVariant1.toLowerCase()] || canonicalForms[fullVariant2.toLowerCase()],
                variant1: {
                  firstName: variation.variant1.firstName,
                  frequency: variation.variant1.frequency
                },
                variant2: {
                  firstName: variation.variant2.firstName,
                  frequency: variation.variant2.frequency
                },
                similarity: variation.similarity,
                recommendedNormalization: variation.variant1.frequency >= variation.variant2.frequency ? variation.variant1.firstName : variation.variant2.firstName
              });
            }
          }
          return suggestions;
        }
        /**
         * Get all variations of a name using the variant generator
         * @param {string} name - Name to generate variations for
         * @returns {Array} Array of possible variations
         */
        async getAllVariations(name) {
          const parsed = this.nameParser.parse(name);
          return this.variantGenerator.generateVariants(parsed);
        }
        /**
         * Find potential name variants from a list of surnames (simple synchronous version)
         * Used for testing and UI purposes
         * @param {Array} surnames - Array of surname strings to check for variants
         * @returns {Array} Array of potential variant pairs with similarity scores
         */
        findPotentialVariants(surnames) {
          const results = [];
          const threshold = _CandidateFinder.FIRST_NAME_SIMILARITY_THRESHOLD;
          for (let i = 0; i < surnames.length; i++) {
            for (let j = i + 1; j < surnames.length; j++) {
              const name1 = surnames[i];
              const name2 = surnames[j];
              if (name1.toLowerCase() === name2.toLowerCase()) continue;
              const maxLen = Math.max(name1.length, name2.length);
              if (maxLen === 0) continue;
              const distance = this.calculateLevenshteinDistance(name1, name2);
              const similarity = 1 - distance / maxLen;
              if (similarity >= threshold) {
                results.push({
                  name1,
                  name2,
                  similarity,
                  isDiacriticOnlyVariant: this.isDiacriticOnlyVariant(name1, name2)
                });
              }
            }
          }
          results.sort((a, b) => b.similarity - a.similarity);
          return results;
        }
        /**
         * Check if two names differ only by diacritics
         * @param {string} name1 - First name
         * @param {string} name2 - Second name
         * @returns {boolean} True if names differ only by diacritics
         */
        isDiacriticOnlyVariant(name1, name2) {
          if (!name1 || !name2) return false;
          const normalize = (str) => {
            return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ł/g, "l");
          };
          return normalize(name1) === normalize(name2);
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = CandidateFinder2;
      }
    }
  });

  // src/zotero/item-processor.js
  var require_item_processor = __commonJS({
    "src/zotero/item-processor.js"(exports, module) {
      var ItemProcessor2 = class {
        constructor() {
          this.nameParser = new (require_name_parser())();
          this.variantGenerator = new (require_variant_generator())();
          this.learningEngine = new (require_learning_engine())();
          this.candidateFinder = new (require_candidate_finder())();
        }
        /**
         * Process creators in a Zotero item
         * @param {Object} item - Zotero item
         * @returns {Array} Processed creators with normalization options
         */
        async processItemCreators(item) {
          const results = [];
          const creators = item.getCreators ? item.getCreators() : [];
          for (const creator of creators) {
            if (creator.firstName || creator.lastName) {
              const rawName = this.buildRawName(creator);
              const learned = this.learningEngine.getMapping(rawName);
              if (learned) {
                results.push({
                  original: { ...creator },
                  normalized: this.parseNameFromFullString(learned),
                  type: creator.creatorType,
                  status: "learned",
                  suggestion: learned
                });
                continue;
              }
              const similars = this.learningEngine.findSimilar(rawName);
              const parsed = this.nameParser.parse(rawName);
              const variants = this.variantGenerator.generateVariants(parsed);
              const libraryVariants = await this.findLibraryWideVariants(parsed.lastName);
              results.push({
                original: { ...creator },
                parsed,
                variants,
                similars,
                libraryVariants,
                type: creator.creatorType,
                status: "new"
              });
            }
          }
          return results;
        }
        /**
         * Find variants that might exist across the entire library for this surname
         * @param {string} lastName - Last name to check for variants
         * @returns {Array} Array of potential library-wide variants
         */
        async findLibraryWideVariants(lastName) {
          if (typeof Zotero !== "undefined") {
            try {
              return [];
            } catch (error) {
              console.warn("Could not perform library-wide variant scan:", error);
              return [];
            }
          }
          return [];
        }
        /**
         * Build a raw name string from creator object
         * @param {Object} creator - Creator object
         * @returns {string} Raw name string
         */
        buildRawName(creator) {
          return `${creator.firstName || ""} ${creator.lastName || ""}`.trim();
        }
        /**
         * Parse a full name string back to Zotero creator format
         * @param {string} fullName - Full name string
         * @returns {Object} Creator object with firstName and lastName
         */
        parseNameFromFullString(fullName) {
          const parsed = this.nameParser.parse(fullName);
          return {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            fieldMode: 0
            // Standard format in Zotero
          };
        }
        /**
         * Apply normalization to a Zotero item
         * @param {Object} item - Zotero item
         * @param {Array} normalizations - Normalization mappings to apply
         */
        async applyNormalizations(item, normalizations) {
          for (let i = 0; i < normalizations.length; i++) {
            const norm = normalizations[i];
            if (norm.accepted) {
              console.log(`Applying normalization: ${norm.original.firstName} ${norm.original.lastName} -> ${norm.normalized.firstName} ${norm.normalized.lastName}`);
              const originalName = this.buildRawName(norm.original);
              const normalizedName = this.buildRawName(norm.normalized);
              await this.learningEngine.storeMapping(originalName, normalizedName);
            }
          }
          console.log("Applied normalizations to item:", item.getField("title"));
        }
        /**
         * Perform a library-wide name normalization analysis
         * @param {Array} items - Array of Zotero items to analyze
         * @returns {Object} Analysis results
         */
        async performLibraryAnalysis(items) {
          const allNames = [];
          for (const item of items) {
            const creators = item.getCreators ? item.getCreators() : [];
            for (const creator of creators) {
              if (creator.firstName || creator.lastName) {
                const rawName = this.buildRawName(creator);
                allNames.push(rawName);
              }
            }
          }
          const surnameFreq = this.learningEngine.constructor.prototype.extractSurnamesWithFrequency || this.nameParser.constructor.prototype.extractSurnamesWithFrequency;
          const frequencies = {};
          for (const name of allNames) {
            const parsed = this.nameParser.parse(name);
            if (parsed.lastName) {
              const lastName = parsed.lastName.toLowerCase().trim();
              frequencies[lastName] = (frequencies[lastName] || 0) + 1;
            }
          }
          const surnames = Object.keys(frequencies);
          const variants = [];
          const { isDiacriticOnlyVariant } = require_string_distance();
          const countUmlauts = (str) => {
            return (str.match(/[äöü]/gi) || []).length;
          };
          for (let i = 0; i < surnames.length; i++) {
            for (let j = i + 1; j < surnames.length; j++) {
              const name1 = surnames[i];
              const name2 = surnames[j];
              const umlautCount1 = countUmlauts(name1);
              const umlautCount2 = countUmlauts(name2);
              const adjustedLen1 = name1.length + umlautCount1;
              const adjustedLen2 = name2.length + umlautCount2;
              if (adjustedLen1 !== adjustedLen2) continue;
              if (isDiacriticOnlyVariant(name1, name2)) {
                variants.push({
                  name1,
                  name2,
                  frequency1: frequencies[name1],
                  frequency2: frequencies[name2],
                  similarity: 1
                });
              }
            }
          }
          return {
            surnameFrequencies: frequencies,
            potentialVariants: variants,
            totalNames: allNames.length,
            uniqueSurnames: surnames.length
          };
        }
        /**
         * Calculate Levenshtein distance between two strings
         * @param {string} str1 - First string
         * @param {string} str2 - Second string
         * @returns {number} Levenshtein distance
         */
        calculateLevenshteinDistance(str1, str2) {
          const matrix = [];
          if (str1.length === 0) return str2.length;
          if (str2.length === 0) return str1.length;
          for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
              if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1,
                  // substitution
                  matrix[i][j - 1] + 1,
                  // insertion
                  matrix[i - 1][j] + 1
                  // deletion
                );
              }
            }
          }
          return matrix[str2.length][str1.length];
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = ItemProcessor2;
      }
    }
  });

  // src/zotero/zotero-db-analyzer.js
  var require_zotero_db_analyzer = __commonJS({
    "src/zotero/zotero-db-analyzer.js"(exports, module) {
      var { NAME_PREFIXES, NAME_SUFFIXES, COMMON_GIVEN_NAME_EQUIVALENTS: SHARED_NAME_EQUIVALENTS } = require_name_constants();
      var { normalizedLevenshtein, isDiacriticOnlyVariant, normalizeName } = require_string_distance();
      function fileLog(msg) {
        try {
          const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[1].split(".")[0];
          const line = timestamp + " [db-analyzer] " + msg + "\n";
          if (typeof Components !== "undefined") {
            const file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
            file.append("zotero-normalizer.log");
            const fos = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
            fos.init(file, 2 | 8 | 16, 420, 0);
            fos.write(line, line.length);
            fos.close();
          }
          if (typeof Zotero !== "undefined" && Zotero.debug) {
            Zotero.debug("NER-DB: " + msg);
          }
        } catch (e) {
          if (typeof console !== "undefined" && console.log) {
            console.log("NER-DB: " + msg);
          }
        }
      }
      var COMMON_GIVEN_NAME_EQUIVALENTS = Object.freeze({
        alex: "alexander",
        alexander: "alexander",
        alexandra: "alexandra",
        alexis: "alexander",
        ally: "allison",
        ann: "anne",
        anna: "anne",
        annie: "anne",
        anthony: "anthony",
        antonio: "antonio",
        beth: "elizabeth",
        betsy: "elizabeth",
        betty: "elizabeth",
        bill: "william",
        billy: "william",
        bob: "robert",
        bobby: "robert",
        charles: "charles",
        charlie: "charles",
        charlotte: "charlotte",
        chaz: "charles",
        che: "ernesto",
        chuck: "charles",
        cathy: "catherine",
        catherine: "catherine",
        cathie: "catherine",
        cathryn: "catherine",
        frank: "francis",
        francis: "francis",
        francisco: "francisco",
        fran: "francis",
        frederic: "frederick",
        frederick: "frederick",
        fred: "frederick",
        freddie: "frederick",
        freddy: "frederick",
        harold: "harold",
        harry: "harry",
        hal: "harold",
        hank: "henry",
        henry: "henry",
        jack: "john",
        jacob: "jacob",
        jake: "jacob",
        james: "james",
        jamie: "james",
        jen: "jennifer",
        jenn: "jennifer",
        jenny: "jennifer",
        jennifer: "jennifer",
        jesse: "jessica",
        jess: "jessica",
        jessica: "jessica",
        jim: "james",
        jimmy: "james",
        joe: "joseph",
        joey: "joseph",
        john: "john",
        jon: "jonathan",
        jonathan: "jonathan",
        jose: "jose",
        joseph: "joseph",
        joyce: "joyce",
        kate: "katherine",
        katherine: "katherine",
        kathy: "catherine",
        katy: "katherine",
        katie: "katherine",
        liz: "elizabeth",
        lizzie: "elizabeth",
        lou: "louis",
        louis: "louis",
        maggie: "margaret",
        margaret: "margaret",
        marie: "mary",
        mary: "mary",
        megan: "margaret",
        meg: "margaret",
        michael: "michael",
        mick: "michael",
        mickey: "michael",
        mike: "michael",
        manuel: "manuel",
        manu: "manuel",
        nancy: "anne",
        nick: "nicholas",
        nicholas: "nicholas",
        nico: "nicholas",
        paco: "francisco",
        patricia: "patricia",
        patty: "patricia",
        peggy: "margaret",
        pepe: "jose",
        rick: "richard",
        rich: "richard",
        richard: "richard",
        ricky: "richard",
        rob: "robert",
        robbie: "robert",
        robert: "robert",
        ron: "ronald",
        ronnie: "ronald",
        ronald: "ronald",
        rose: "rose",
        rosie: "rose",
        sasha: "alexander",
        sandy: "alexander",
        ted: "theodore",
        teddy: "theodore",
        theodore: "theodore",
        toni: "antonio",
        tonya: "antonia",
        will: "william",
        willie: "william",
        william: "william"
      });
      var ZoteroDBAnalyzer2 = class {
        constructor() {
          this.candidateFinder = new (require_candidate_finder())();
          this.learningEngine = new (require_learning_engine())();
        }
        /**
         * Perform a database-wide analysis of creator names
         * In a Zotero context, this would execute efficient SQL queries
         * @returns {Promise<Object>} Analysis results
         */
        async analyzeFullLibrary(progressCallback = null, shouldCancel = null) {
          const DEBUG = true;
          const log = (msg) => {
            if (DEBUG) {
              const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[1].split(".")[0];
              const line = timestamp + " ANALYZER: " + msg;
              console.error(line);
            }
          };
          fileLog("analyzeFullLibrary started");
          log("analyzeFullLibrary started");
          if (typeof Zotero === "undefined") {
            log("ERROR: Zotero is undefined");
            fileLog("ERROR: Zotero is undefined");
            throw new Error("This method must be run in the Zotero context");
          }
          console.log("Starting full library analysis...");
          try {
            const libraryID = Zotero.Libraries.userLibraryID;
            fileLog("Creating search for libraryID: " + libraryID);
            log("Creating search for libraryID: " + libraryID);
            const search = new Zotero.Search();
            search.addCondition("libraryID", "is", libraryID);
            const itemIDs = await search.search();
            fileLog("Search returned " + (itemIDs ? itemIDs.length : 0) + " item IDs");
            log("Search returned " + (itemIDs ? itemIDs.length : 0) + " item IDs");
            console.log(`Found ${itemIDs.length} total items in library`);
            if (!itemIDs || itemIDs.length === 0) {
              console.log("No items found in library");
              fileLog("No items found in library - returning empty");
              return {
                surnameFrequencies: {},
                potentialVariants: [],
                suggestions: [],
                totalUniqueSurnames: 0,
                totalVariantGroups: 0
              };
            }
            const filterBatchSize = 200;
            const processingBatchSize = 100;
            const creatorsMap = {};
            const itemsWithCreators = [];
            let processedItems = 0;
            for (let i = 0; i < itemIDs.length; i += filterBatchSize) {
              const batch = itemIDs.slice(i, i + filterBatchSize);
              const items = await Zotero.Items.getAsync(batch);
              for (const item of items) {
                try {
                  const creators2 = item.getCreators ? item.getCreators() : [];
                  if (creators2 && Array.isArray(creators2) && creators2.length > 0) {
                    const validCreators = creators2.filter(
                      (creator) => creator && (creator.firstName || creator.lastName)
                    );
                    if (validCreators.length > 0) {
                      itemsWithCreators.push(item);
                    }
                    for (const creator of creators2) {
                      this.addCreatorOccurrence(creatorsMap, creator, item);
                    }
                  }
                } catch (itemError) {
                  console.warn("Error processing item creators:", itemError);
                }
              }
              if (progressCallback) {
                progressCallback({
                  stage: "filtering_items",
                  processed: i + batch.length,
                  total: itemIDs.length,
                  percent: Math.round((i + batch.length) / itemIDs.length * 100)
                });
              }
            }
            Zotero.debug("ZoteroDBAnalyzer: Filtering complete, items with creators: " + itemsWithCreators.length);
            fileLog("Filtering complete: itemsWithCreators=" + itemsWithCreators.length + ", creatorsMap keys=" + Object.keys(creatorsMap).length);
            console.log(`Found ${itemsWithCreators.length} items with valid creators`);
            if (itemsWithCreators.length === 0) {
              console.log("WARNING: No items with valid creators found!");
              console.log("This might indicate:");
              console.log("1. Items exist but have no creators");
              console.log("2. Creator data is malformed");
              console.log("3. Search conditions are too restrictive");
              console.log("Trying fallback search to verify database access...");
              const fallbackSearch = new Zotero.Search();
              fallbackSearch.addCondition("libraryID", "is", Zotero.Libraries.userLibraryID);
              fallbackSearch.addCondition("limit", "is", 10);
              try {
                const fallbackItemIDs = await fallbackSearch.search();
                if (fallbackItemIDs && fallbackItemIDs.length > 0) {
                  const fallbackItems = await Zotero.Items.getAsync(fallbackItemIDs);
                  console.log(`Fallback found ${fallbackItems.length} items`);
                  for (const item of fallbackItems.slice(0, 3)) {
                    try {
                      const creators2 = item.getCreators ? item.getCreators() : [];
                      console.log(`Item "${item.getField ? item.getField("title") : "Unknown"}" has ${creators2.length} creators:`, creators2);
                    } catch (e) {
                      console.log("Error getting creators for item:", e);
                    }
                  }
                } else {
                  console.log("Fallback search also found no items");
                }
              } catch (fallbackError) {
                console.error("Fallback search failed:", fallbackError);
              }
              Zotero.debug("ZoteroDBAnalyzer: No items with creators found, fallback search initiated");
            }
            const creators = Object.values(creatorsMap);
            Zotero.debug("ZoteroDBAnalyzer: Extracted " + creators.length + " unique creators");
            console.log(`Found ${creators.length} unique creator combinations`);
            if (creators.length > 0) {
              Zotero.debug("ZoteroDBAnalyzer: Sample creators: " + JSON.stringify(creators.slice(0, 3)));
              console.log("Sample creators:", creators.slice(0, 5));
            } else {
              Zotero.debug("ZoteroDBAnalyzer: WARNING - No creators extracted at all");
              console.log("WARNING: No creators found! This indicates an issue with creator extraction.");
            }
            Zotero.debug("ZoteroDBAnalyzer: Starting analyzeCreators with " + creators.length + " creators");
            fileLog("Calling analyzeCreators with " + creators.length + " creators");
            if (this.learningEngine) {
              fileLog("LearningEngine distinctPairs size: " + (this.learningEngine.distinctPairs ? this.learningEngine.distinctPairs.size : "unknown"));
              try {
                const distinctCount = this.learningEngine.distinctPairs ? this.learningEngine.distinctPairs.size : 0;
                fileLog("Distinct pairs in learning engine: " + distinctCount);
                if (distinctCount > 0) {
                  fileLog("Sample distinct pairs: " + JSON.stringify([...this.learningEngine.distinctPairs.keys()].slice(0, 5)));
                }
              } catch (e) {
                fileLog("Error checking distinctPairs: " + e.message);
              }
            } else {
              fileLog("LearningEngine is NULL");
            }
            const results = await this.analyzeCreators(creators, progressCallback, shouldCancel);
            Zotero.debug("ZoteroDBAnalyzer: analyzeCreators completed, suggestions count: " + (results.suggestions ? results.suggestions.length : 0));
            fileLog("analyzeCreators complete: suggestions=" + (results.suggestions ? results.suggestions.length : 0) + ", totalUniqueSurnames=" + results.totalUniqueSurnames);
            console.log(`Analysis complete: processed ${creators.length} unique creator entries`);
            return results;
          } catch (error) {
            console.error("Error in database analysis:", error);
            if (error.message === "Analysis cancelled") {
              throw error;
            }
            return {
              surnameFrequencies: {},
              potentialVariants: [],
              suggestions: [],
              totalUniqueSurnames: 0,
              totalVariantGroups: 0
            };
          }
        }
        addCreatorOccurrence(creatorsMap, creator, item) {
          if (!creator || !creator.firstName && !creator.lastName) {
            return;
          }
          const key = `${creator.firstName || ""}|${creator.lastName || ""}|${creator.fieldMode || 0}`;
          if (!creatorsMap[key]) {
            const parsed = this.parseName(`${creator.firstName || ""} ${creator.lastName || ""}`.trim() || creator.lastName || "");
            creatorsMap[key] = {
              key,
              firstName: creator.firstName || "",
              lastName: creator.lastName || "",
              fieldMode: creator.fieldMode || 0,
              count: 0,
              items: [],
              parsedName: parsed
            };
          }
          creatorsMap[key].count = (creatorsMap[key].count || 0) + 1;
          if (item) {
            const summary = this.buildItemSummary(item, creator);
            if (summary) {
              const limit = 25;
              if ((creatorsMap[key].items || []).length < limit) {
                creatorsMap[key].items.push(summary);
              }
            }
          }
        }
        buildItemSummary(item, forCreator = null) {
          if (!item) {
            return null;
          }
          try {
            const getField = typeof item.getField === "function" ? item.getField.bind(item) : null;
            const title = getField ? getField("title") : item.title || "";
            const date = getField ? getField("date") : item.date || "";
            const publicationYear = this.extractYear(date);
            const creators = typeof item.getCreators === "function" ? item.getCreators() || [] : [];
            let firstAuthorFirstName = "";
            let firstAuthorLastName = "";
            if (creators.length > 0) {
              const creator = forCreator || creators[0];
              if (creator) {
                firstAuthorFirstName = creator.firstName || "";
                firstAuthorLastName = creator.lastName || "";
              }
            }
            return {
              id: item.id || null,
              key: item.key || null,
              title: title || "Untitled",
              date: date || "",
              year: publicationYear,
              itemType: item.itemType || (getField ? getField("itemType") : ""),
              creatorsCount: creators.length,
              authorFirstName: firstAuthorFirstName,
              authorLastName: firstAuthorLastName,
              // Full author string for display
              author: this.buildAuthorString(firstAuthorFirstName, firstAuthorLastName)
            };
          } catch (summaryError) {
            console.warn("Unable to summarize item for creator mapping:", summaryError);
            return null;
          }
        }
        buildAuthorString(firstName, lastName) {
          const first = (firstName || "").trim();
          const last = (lastName || "").trim();
          if (first && last) {
            return `${first} ${last}`;
          } else if (last) {
            return last;
          } else if (first) {
            return first;
          }
          return "";
        }
        /**
         * Find items for authors with a specific surname variant
         * @param {Object} itemsByFullAuthor - Items keyed by "firstName|lastName"
         * @param {string} surname - The surname to match (e.g., "Martin", "Martín")
         * @returns {Array} Array of items from authors with that surname
         */
        findItemsBySurname(itemsByFullAuthor, surname) {
          if (!surname || !itemsByFullAuthor) {
            return [];
          }
          const items = [];
          const normalizedSurname = surname.toLowerCase().trim();
          for (const [authorKey, authorItems] of Object.entries(itemsByFullAuthor)) {
            const lastNameMatch = authorKey.match(/\|([^|]+)$/);
            if (lastNameMatch) {
              const authorLastName = lastNameMatch[1].trim().toLowerCase();
              if (authorLastName === normalizedSurname) {
                if (Array.isArray(authorItems)) {
                  items.push(...authorItems);
                }
              }
            }
          }
          items.sort((a, b) => {
            const authorA = (a.author || "").toLowerCase();
            const authorB = (b.author || "").toLowerCase();
            return authorA.localeCompare(authorB);
          });
          return items;
        }
        /**
         * Find items for a specific author (firstName + lastName)
         * Used for surname variant suggestions to avoid mixing different authors
         * Case-insensitive matching for robustness
         * @param {Object} itemsByFullAuthor - Items keyed by "firstName|lastName"
         * @param {string} firstName - The author's first name (can be empty for malformed entries)
         * @param {string} lastName - The author's last name
         * @returns {Array} Array of items from this specific author
         */
        findItemsByFullAuthorName(itemsByFullAuthor, firstName, lastName) {
          if (!lastName || !itemsByFullAuthor) {
            return [];
          }
          const normalizedFirst = (firstName || "").trim().toLowerCase();
          const variantLastName = lastName.trim();
          fileLog('findItemsByFullAuthorName: searching for firstName="' + firstName + '" lastName="' + lastName + '"');
          fileLog('  normalizedFirst="' + normalizedFirst + '" variantLastName="' + variantLastName + '"');
          fileLog("  itemsByFullAuthor has " + Object.keys(itemsByFullAuthor).length + " keys");
          const sampleKeys = Object.keys(itemsByFullAuthor).slice(0, 5);
          fileLog("  Sample keys: " + JSON.stringify(sampleKeys));
          for (const [authorKey, authorItems] of Object.entries(itemsByFullAuthor)) {
            const keyParts = authorKey.split("|");
            if (keyParts.length >= 2) {
              const storedFirst = keyParts[0].trim().toLowerCase();
              const storedLastRaw = keyParts[keyParts.length - 1].trim();
              const storedLastLower = storedLastRaw.toLowerCase();
              const searchLastLower = variantLastName.toLowerCase();
              if (storedFirst === normalizedFirst && storedLastLower === searchLastLower) {
                fileLog('  MATCH FOUND: authorKey="' + authorKey + '" items=' + (Array.isArray(authorItems) ? authorItems.length : 0));
                if (Array.isArray(authorItems)) {
                  return authorItems.slice().sort((a, b) => {
                    const authorA = (a.author || "").toLowerCase();
                    const authorB = (b.author || "").toLowerCase();
                    return authorA.localeCompare(authorB);
                  });
                }
                break;
              }
            }
          }
          fileLog('  NO MATCH FOUND for firstName="' + firstName + '" lastName="' + lastName + '"');
          return [];
        }
        extractYear(dateValue) {
          if (!dateValue || typeof dateValue !== "string") {
            return "";
          }
          const match = dateValue.match(/(\d{4})/);
          return match ? match[1] : "";
        }
        /**
         * Analyze a list of creators for name variants
         * @param {Array} creators - Array of creator objects with occurrence counts
         * @returns {Object} Analysis results
         */
        async analyzeCreators(creators, progressCallback = null, shouldCancel = null) {
          Zotero.debug("ZoteroDBAnalyzer: analyzeCreators started with " + (creators ? creators.length : 0) + " creators");
          const authorOccurrences = {};
          const itemsByFullAuthor = {};
          for (const creator of creators) {
            const fullName = `${creator.firstName} ${creator.lastName}`.trim();
            const parsed = this.parseName(fullName);
            const rawLastName = (creator.lastName || "").trim();
            if (parsed.lastName || rawLastName) {
              const firstName = (creator.firstName || "").trim();
              const normalizedFirst = this.normalizeFirstNameForGrouping(firstName);
              const normalizedLast = (parsed.lastName || rawLastName).toLowerCase().trim();
              const authorKey = `${normalizedFirst}|${normalizedLast}`;
              if (!authorOccurrences[authorKey]) {
                authorOccurrences[authorKey] = {
                  count: 0,
                  firstName,
                  lastName: parsed.lastName || rawLastName,
                  // Keep parsed last name if available, else raw
                  originalLastName: rawLastName,
                  // Keep the raw lastName from the creator (before parsing)
                  normalizedFirst,
                  normalizedLast,
                  surnameVariants: {}
                  // Track all surname variations for this author: {lastName: {count, firstName, items}}
                };
              }
              authorOccurrences[authorKey].count += creator.count || 1;
              if (!authorOccurrences[authorKey].surnameVariants[rawLastName]) {
                authorOccurrences[authorKey].surnameVariants[rawLastName] = {
                  count: 0,
                  firstName,
                  // Store the raw firstName used with this surname variant
                  items: []
                  // Store items directly with this variant
                };
              }
              authorOccurrences[authorKey].surnameVariants[rawLastName].count += creator.count || 1;
              if (creator.items && creator.items.length > 0) {
                const existingItems = authorOccurrences[authorKey].surnameVariants[rawLastName].items;
                const limit = 25;
                for (const item of creator.items) {
                  if (existingItems.length >= limit) break;
                  const isDuplicate = existingItems.some((existing) => {
                    if (item.key && existing.key) return existing.key === item.key;
                    if (item.id && existing.id) return existing.id === item.id;
                    return false;
                  });
                  if (!isDuplicate) {
                    existingItems.push(item);
                  }
                }
              }
              if (creator.items && creator.items.length > 0) {
                for (const item of creator.items) {
                  const itemLastName = (item.authorLastName || rawLastName || "").trim();
                  if (itemLastName && itemLastName !== rawLastName) {
                    if (!authorOccurrences[authorKey].surnameVariants[itemLastName]) {
                      authorOccurrences[authorKey].surnameVariants[itemLastName] = {
                        count: 0,
                        firstName,
                        items: []
                      };
                    }
                    authorOccurrences[authorKey].surnameVariants[itemLastName].count += 1;
                    const variantItems = authorOccurrences[authorKey].surnameVariants[itemLastName].items;
                    const isDuplicateVar = variantItems.some((existing) => {
                      if (item.key && existing.key) return existing.key === item.key;
                      if (item.id && existing.id) return existing.id === item.id;
                      return false;
                    });
                    if (variantItems.length < 25 && !isDuplicateVar) {
                      variantItems.push(item);
                    }
                  }
                }
              }
              const fullAuthorKey = `${creator.firstName || ""}|${creator.lastName || ""}`;
              if (creator.items && creator.items.length > 0) {
                itemsByFullAuthor[fullAuthorKey] = creator.items;
              }
            }
          }
          const surnameFrequencies = {};
          for (const [authorKey, data] of Object.entries(authorOccurrences)) {
            const lastNameKey = (data.lastName || data.originalLastName || "").toLowerCase().trim();
            surnameFrequencies[lastNameKey] = (surnameFrequencies[lastNameKey] || 0) + data.count;
          }
          const surnames = Object.keys(surnameFrequencies);
          Zotero.debug("ZoteroDBAnalyzer: Found " + surnames.length + " unique surnames");
          console.log(`Analyzing ${surnames.length} unique surnames for variants...`);
          if (progressCallback) {
            progressCallback({
              stage: "debug",
              message: "Found " + surnames.length + " unique surnames",
              percent: 30
            });
          }
          const potentialVariants = this.findDiacriticVariantsByAuthor(authorOccurrences, progressCallback, shouldCancel);
          if (progressCallback) {
            progressCallback({
              stage: "debug",
              message: "Found " + potentialVariants.length + " potential variants",
              percent: 50
            });
          }
          potentialVariants.sort((a, b) => {
            const totalFreqA = a.variant1.frequency + a.variant2.frequency;
            const totalFreqB = b.variant1.frequency + b.variant2.frequency;
            return totalFreqB - totalFreqA;
          });
          const creatorsBySurname = this.groupCreatorsBySurnameForVariants(creators);
          const givenNameVariantGroups = this.findGivenNameVariantGroups(creatorsBySurname);
          if (progressCallback) {
            progressCallback({
              stage: "debug",
              message: "Given name variant groups: " + givenNameVariantGroups.length,
              percent: 70
            });
          }
          if (progressCallback) {
            progressCallback({
              stage: "generating_suggestions",
              processed: null,
              total: null,
              percent: 90
            });
          }
          const suggestions = this.generateNormalizationSuggestions(
            potentialVariants,
            givenNameVariantGroups,
            itemsByFullAuthor
          );
          if (progressCallback) {
            progressCallback({
              stage: "debug",
              message: "Generated " + suggestions.length + " suggestions",
              percent: 95
            });
          }
          return {
            surnameFrequencies,
            potentialVariants,
            suggestions,
            totalUniqueSurnames: surnames.length,
            totalVariantGroups: suggestions.length,
            givenNameVariantGroups
          };
        }
        findVariantsEfficiently(surnameFrequencies, progressCallback = null, shouldCancel = null) {
          const surnames = Object.keys(surnameFrequencies);
          const potentialVariants = [];
          const { normalizeName: normalizeName2 } = require_string_distance();
          const normalizedGroups = /* @__PURE__ */ new Map();
          for (let i = 0; i < surnames.length; i++) {
            if (shouldCancel && shouldCancel()) {
              throw new Error("Analysis cancelled");
            }
            const name = surnames[i];
            const normalizedKey = normalizeName2(name);
            if (!normalizedGroups.has(normalizedKey)) {
              normalizedGroups.set(normalizedKey, []);
            }
            normalizedGroups.get(normalizedKey).push({
              name,
              frequency: surnameFrequencies[name]
            });
            if (progressCallback && i % 10 === 0) {
              progressCallback({
                stage: "analyzing_surnames",
                processed: i,
                total: surnames.length,
                percent: Math.round(i / surnames.length * 80)
                // Max 80% here, save 20% for suggestions
              });
            }
          }
          for (const [normalizedKey, variants] of normalizedGroups) {
            if (variants.length > 1) {
              variants.sort((a, b) => b.frequency - a.frequency);
              const recommended = variants[0].name;
              for (let i = 1; i < variants.length; i++) {
                potentialVariants.push({
                  variant1: {
                    name: recommended,
                    frequency: variants[0].frequency
                  },
                  variant2: {
                    name: variants[i].name,
                    frequency: variants[i].frequency
                  },
                  similarity: 1,
                  recommendedNormalization: recommended
                });
              }
            }
          }
          Zotero.debug("ZoteroDBAnalyzer: Variant detection complete, found " + potentialVariants.length + " variant groups");
          console.log(`Found ${potentialVariants.length} diacritic variant pairs`);
          return potentialVariants;
        }
        /**
         * Find diacritic variants within the same author's surname variations
         * This ensures only the SAME author (same first name) can have surname variants detected
         * @param {Object} authorOccurrences - Object keyed by "normalizedFirst|normalizedLast" with author data including surnameVariants
         * @param {Function} progressCallback - Optional progress callback
         * @param {Function} shouldCancel - Optional cancellation check
         * @returns {Array} Array of variant pairs
         */
        findDiacriticVariantsByAuthor(authorOccurrences, progressCallback = null, shouldCancel = null) {
          const { normalizeName: normalizeName2, isDiacriticOnlyVariant: isDiacriticOnlyVariant2 } = require_string_distance();
          const potentialVariants = [];
          Zotero.debug("ZoteroDBAnalyzer: findDiacriticVariantsByAuthor called with " + Object.keys(authorOccurrences).length + " authors");
          const authorKeys = Object.keys(authorOccurrences);
          const totalAuthors = authorKeys.length;
          const threshold = Math.max(50, Math.ceil(totalAuthors * 0.05));
          for (let i = 0; i < authorKeys.length; i++) {
            const authorKey = authorKeys[i];
            const data = authorOccurrences[authorKey];
            if (progressCallback && (i === 0 || i === totalAuthors - 1 || i % threshold === 0)) {
              progressCallback({
                stage: "analyzing_surnames",
                processed: i + 1,
                total: totalAuthors,
                percent: Math.round((i + 1) / totalAuthors * 80)
              });
            }
            if (shouldCancel && shouldCancel()) {
              throw new Error("Analysis cancelled");
            }
            const surnameVariants = data.surnameVariants || {};
            const variantNames = Object.keys(surnameVariants);
            Zotero.debug("ZoteroDBAnalyzer: Checking author " + authorKey + " with variants: " + JSON.stringify(surnameVariants));
            if (variantNames.length < 2) {
              Zotero.debug("ZoteroDBAnalyzer: Skipping - only " + variantNames.length + " variant(s)");
              continue;
            }
            const normalizedVariantGroups = /* @__PURE__ */ new Map();
            for (const [name, variantData] of Object.entries(surnameVariants)) {
              const count = typeof variantData === "object" ? variantData.count : variantData;
              const variantFirstName = typeof variantData === "object" ? variantData.firstName : data.firstName;
              const variantItems = typeof variantData === "object" ? variantData.items || [] : [];
              const normalizedKey = normalizeName2(name);
              Zotero.debug('ZoteroDBAnalyzer: Normalized "' + name + '" -> "' + normalizedKey + '" (items: ' + variantItems.length + ")");
              if (!normalizedVariantGroups.has(normalizedKey)) {
                normalizedVariantGroups.set(normalizedKey, []);
              }
              normalizedVariantGroups.get(normalizedKey).push({ name, count, firstName: variantFirstName, items: variantItems });
            }
            if (normalizedVariantGroups.size >= 1) {
              const allVariants = [];
              for (const [normalizedKey, variants] of normalizedVariantGroups) {
                for (const v of variants) {
                  allVariants.push({
                    name: v.name,
                    count: v.count,
                    normalizedKey,
                    firstName: v.firstName,
                    items: v.items || []
                  });
                }
              }
              if (allVariants.length < 2) {
                continue;
              }
              allVariants.sort((a, b) => b.count - a.count);
              const recommended = allVariants[0].name;
              const recommendedFirstName = allVariants[0].firstName || data.firstName || "";
              const recommendedItems = allVariants[0].items || [];
              const recommendedNormalized = normalizeName2(recommended);
              const recommendedGroup = normalizedVariantGroups.get(recommendedNormalized);
              const recommendedCount = recommendedGroup.reduce((sum, v) => sum + v.count, 0);
              const authorLastName = data.originalLastName || data.lastName || "";
              for (let i2 = 1; i2 < allVariants.length; i2++) {
                const v = allVariants[i2];
                potentialVariants.push({
                  variant1: {
                    name: recommended,
                    frequency: recommendedCount,
                    firstName: recommendedFirstName,
                    items: recommendedItems
                    // Items stored directly, no lookup needed
                  },
                  variant2: {
                    name: v.name,
                    frequency: v.count,
                    firstName: v.firstName || data.firstName || "",
                    items: v.items || []
                    // Items stored directly, no lookup needed
                  },
                  similarity: 1,
                  recommendedNormalization: recommended,
                  // Include author info for display purposes
                  authorInfo: {
                    firstName: recommendedFirstName,
                    lastName: authorLastName
                  }
                });
              }
            }
          }
          Zotero.debug("ZoteroDBAnalyzer: Author diacritic variant detection complete, found " + potentialVariants.length + " variant groups");
          if (progressCallback && totalAuthors > 0) {
            progressCallback({
              stage: "analyzing_surnames",
              processed: totalAuthors,
              total: totalAuthors,
              percent: 80
            });
          }
          return potentialVariants;
        }
        /**
         * Group creators by normalized first name + surname
         * This ensures only the SAME author (same first name variant) is grouped together
         * Different authors with the same surname (e.g., "Alex Martin" vs "Andrea Martin") are NOT grouped
         * Initial-only names are grouped with full names that match their first letter
         * @param {Array} creators - Array of creator objects
         * @returns {Object} Object with group keys and creator arrays as values
         */
        groupCreatorsBySurnameForVariants(creators) {
          const surnameGroups = {};
          const initialGroups = {};
          for (const creator of creators) {
            if (!creator || !creator.lastName) {
              continue;
            }
            const firstName = (creator.firstName || "").trim();
            const normalizedFirst = this.normalizeFirstNameForGrouping(firstName);
            const lastNameKey = (creator.lastName || "").toLowerCase().trim();
            if (normalizedFirst.startsWith("init:")) {
              if (!initialGroups[lastNameKey]) {
                initialGroups[lastNameKey] = [];
              }
              initialGroups[lastNameKey].push({ creator, normalizedFirst });
            } else {
              const groupKey = `${normalizedFirst}|${lastNameKey}`;
              if (!surnameGroups[groupKey]) {
                surnameGroups[groupKey] = [];
              }
              surnameGroups[groupKey].push(creator);
            }
          }
          for (const [surname, initials] of Object.entries(initialGroups)) {
            for (const { creator, normalizedFirst } of initials) {
              const firstLetter = normalizedFirst.slice(5).charAt(0).toLowerCase();
              const matchingKey = Object.keys(surnameGroups).find((key) => {
                const [normalizedFirst2] = key.split("|");
                return normalizedFirst2.startsWith(firstLetter) && key.endsWith(`|${surname}`);
              });
              if (matchingKey) {
                surnameGroups[matchingKey].push(creator);
              } else {
                const groupKey = `${normalizedFirst}|${surname}`;
                if (!surnameGroups[groupKey]) {
                  surnameGroups[groupKey] = [];
                }
                surnameGroups[groupKey].push(creator);
              }
            }
          }
          return surnameGroups;
        }
        /**
         * Normalize first name for grouping purposes
         * Handles initials and uses name variants from COMMON_GIVEN_NAME_EQUIVALENTS
         * @param {string} firstName - The first name to normalize
         * @returns {string} Normalized first name for grouping
         */
        normalizeFirstNameForGrouping(firstName) {
          if (!firstName || !firstName.trim()) {
            return "unknown";
          }
          const cleaned = firstName.toLowerCase().trim();
          const tokens = cleaned.split(/[\s.-]+/).filter(Boolean);
          const baseWord = tokens[0] || "";
          const withoutDots = cleaned.replace(/\./g, "");
          const allTokensAreInitials = tokens.length > 0 && tokens.every((t) => t.length === 1);
          if (tokens.length === 1 && tokens[0].length <= 3) {
            return `init:${tokens[0]}`;
          } else if (allTokensAreInitials) {
            return `init:${withoutDots}`;
          }
          if (COMMON_GIVEN_NAME_EQUIVALENTS && COMMON_GIVEN_NAME_EQUIVALENTS[baseWord]) {
            return COMMON_GIVEN_NAME_EQUIVALENTS[baseWord];
          }
          return baseWord || cleaned;
        }
        parseGivenNameTokens(name) {
          const trimmed = (name || "").trim();
          if (!trimmed) {
            return [];
          }
          const tokens = trimmed.split(/[\s-]+/).filter(Boolean);
          const parsed = [];
          for (const token of tokens) {
            const cleaned = token.replace(/[^A-Za-z]/g, "");
            if (!cleaned) {
              continue;
            }
            if (this.isLikelyInitialSequence(cleaned, token)) {
              cleaned.toUpperCase().split("").forEach((letter) => {
                parsed.push({ type: "initial", value: letter });
              });
              continue;
            }
            if (cleaned.length === 1) {
              parsed.push({ type: "initial", value: cleaned.toUpperCase() });
            } else {
              parsed.push({ type: "word", value: this.toTitleCase(cleaned) });
            }
          }
          return parsed;
        }
        extractTokenSignature(tokens = []) {
          const initials = /* @__PURE__ */ new Set();
          const extraWords = /* @__PURE__ */ new Set();
          let baseConsumed = false;
          for (const token of tokens) {
            if (!token) {
              continue;
            }
            if (token.type === "word") {
              if (!baseConsumed) {
                baseConsumed = true;
                continue;
              }
              extraWords.add(token.value.toLowerCase());
            } else if (token.type === "initial") {
              initials.add(token.value.toUpperCase());
            }
          }
          return {
            initials: Array.from(initials),
            extraWords: Array.from(extraWords)
          };
        }
        mergeTokenSignatures(signatures = []) {
          const initials = /* @__PURE__ */ new Set();
          const extraWords = /* @__PURE__ */ new Set();
          for (const sig of signatures) {
            if (!sig) {
              continue;
            }
            (sig.initials || []).forEach((letter) => initials.add(letter.toUpperCase()));
            (sig.extraWords || []).forEach((word) => extraWords.add(word.toLowerCase()));
          }
          return {
            initials: Array.from(initials),
            extraWords: Array.from(extraWords)
          };
        }
        signaturesOverlap(signatureA, signatureB) {
          if (!signatureA || !signatureB) {
            return false;
          }
          const initialsA = new Set((signatureA.initials || []).map((letter) => letter.toUpperCase()));
          for (const letter of signatureB.initials || []) {
            if (initialsA.has(letter.toUpperCase())) {
              return true;
            }
          }
          const wordsA = new Set((signatureA.extraWords || []).map((word) => word.toLowerCase()));
          for (const word of signatureB.extraWords || []) {
            if (wordsA.has(word.toLowerCase())) {
              return true;
            }
          }
          return false;
        }
        clusterVariantsBySignature(variants = []) {
          if (!variants || variants.length <= 1) {
            return [variants.map((_, index) => index)];
          }
          const hasConnectors = (index) => {
            const signature = variants[index]?.tokenSignature;
            return !!(signature && (signature.initials && signature.initials.length || signature.extraWords && signature.extraWords.length));
          };
          const parent = variants.map((_, index) => index);
          const find = (index) => {
            if (parent[index] !== index) {
              parent[index] = find(parent[index]);
            }
            return parent[index];
          };
          const union = (a, b) => {
            const rootA = find(a);
            const rootB = find(b);
            if (rootA !== rootB) {
              parent[rootB] = rootA;
            }
          };
          for (let i = 0; i < variants.length; i++) {
            if (!hasConnectors(i)) {
              continue;
            }
            for (let j = i + 1; j < variants.length; j++) {
              if (!hasConnectors(j)) {
                continue;
              }
              if (this.signaturesOverlap(variants[i].tokenSignature, variants[j].tokenSignature)) {
                union(i, j);
              }
            }
          }
          const clustersMap = /* @__PURE__ */ new Map();
          const connectorless = [];
          for (let index = 0; index < variants.length; index++) {
            if (!hasConnectors(index)) {
              connectorless.push(index);
              continue;
            }
            const root = find(index);
            if (!clustersMap.has(root)) {
              clustersMap.set(root, []);
            }
            clustersMap.get(root).push(index);
          }
          const clusters = Array.from(clustersMap.values());
          if (clusters.length === 0) {
            return [variants.map((_, index) => index)];
          }
          if (connectorless.length > 0) {
            const clusterFrequencies = clusters.map(
              (indexes) => indexes.reduce((sum, idx) => sum + (variants[idx].frequency || 0), 0)
            );
            let maxIndex = 0;
            let maxValue = clusterFrequencies[0] || 0;
            for (let i = 1; i < clusterFrequencies.length; i++) {
              if (clusterFrequencies[i] > maxValue) {
                maxValue = clusterFrequencies[i];
                maxIndex = i;
              }
            }
            connectorless.forEach((idx) => clusters[maxIndex].push(idx));
          }
          return clusters;
        }
        isLikelyInitialSequence(cleanedValue, originalToken = "") {
          if (!cleanedValue) {
            return false;
          }
          const upper = cleanedValue.toUpperCase();
          if (upper.length < 2 || upper.length > 4) {
            return false;
          }
          if (/[^A-Z]/.test(upper)) {
            return false;
          }
          if (/\./.test(originalToken)) {
            return true;
          }
          const vowelPattern = /[AEIOUY]/;
          if (!vowelPattern.test(upper)) {
            return true;
          }
          return false;
        }
        selectCanonicalGivenNameData(bucket, normalizedKey) {
          const fallbackBase = normalizedKey && !normalizedKey.startsWith("initial:") ? this.toTitleCase(normalizedKey) : "";
          let bestTokens = [];
          let bestWeight = -Infinity;
          for (const creator of bucket || []) {
            const rawFirst = (creator.parsedName?.firstName || creator.firstName || "").trim();
            if (!rawFirst) {
              continue;
            }
            const tokens = this.parseGivenNameTokens(rawFirst);
            if (tokens.length === 0) {
              continue;
            }
            const hasWord = tokens.some((token) => token.type === "word");
            let weight = (creator.count || 1) + tokens.length;
            if (hasWord) {
              weight += 1e3;
            }
            if (weight > bestWeight) {
              bestTokens = tokens;
              bestWeight = weight;
            }
          }
          const baseWordToken = bestTokens.find((token) => token.type === "word");
          const baseWord = baseWordToken ? baseWordToken.value : fallbackBase;
          const extraWords = [];
          const initials = [];
          let encounteredBase = false;
          for (const token of bestTokens) {
            if (token.type === "word") {
              if (!encounteredBase && (!baseWordToken || token.value === baseWordToken.value)) {
                encounteredBase = true;
                continue;
              }
              if (!extraWords.includes(token.value)) {
                extraWords.push(token.value);
              }
            } else if (token.type === "initial") {
              const upper = token.value.toUpperCase();
              if (!initials.includes(upper)) {
                initials.push(upper);
              }
            }
          }
          return {
            baseWord,
            extraWords,
            initials
          };
        }
        composeGivenNameFromTokens(tokens, canonicalData = {}) {
          const baseWordDefault = canonicalData.baseWord || "";
          const canonicalExtraWords = canonicalData.extraWords || [];
          const canonicalInitials = canonicalData.initials || [];
          const safeTokens = Array.isArray(tokens) ? tokens : [];
          const wordTokens = safeTokens.filter((token) => token && token.type === "word");
          const initialTokens = safeTokens.filter((token) => token && token.type === "initial");
          const variantHasWord = wordTokens.length > 0;
          const variantHasInitial = initialTokens.length > 0;
          const variantIsInitialOnly = !variantHasWord && variantHasInitial;
          let basePart = "";
          const additionalWords = [];
          const orderedInitials = [];
          for (const token of safeTokens) {
            if (token.type === "word") {
              if (!basePart) {
                basePart = token.value;
              } else if (!additionalWords.includes(token.value)) {
                additionalWords.push(token.value);
              }
            } else if (token.type === "initial") {
              const upper = token.value.toUpperCase();
              if (!orderedInitials.includes(upper)) {
                orderedInitials.push(upper);
              }
            }
          }
          if (!basePart && baseWordDefault) {
            basePart = baseWordDefault;
          }
          const baseInitial = basePart ? basePart.charAt(0).toUpperCase() : "";
          if (!basePart && orderedInitials.length > 0) {
            basePart = `${orderedInitials[0]}.`;
            orderedInitials.shift();
          }
          if (variantIsInitialOnly) {
            canonicalExtraWords.forEach((word) => {
              if (!word) {
                return;
              }
              if (!additionalWords.includes(word) && word !== basePart) {
                additionalWords.push(word);
              }
            });
          }
          const combinedInitials = [];
          const seenInitials = /* @__PURE__ */ new Set();
          const appendInitial = (letter) => {
            if (!letter) {
              return;
            }
            const upper = letter.toUpperCase();
            if (upper === baseInitial && !seenInitials.has(upper)) {
              seenInitials.add(upper);
              return;
            }
            if (!seenInitials.has(upper)) {
              combinedInitials.push(`${upper}.`);
              seenInitials.add(upper);
            }
          };
          orderedInitials.forEach((letter) => appendInitial(letter));
          if (variantIsInitialOnly) {
            canonicalInitials.forEach((letter) => appendInitial(letter));
          }
          const parts = [];
          if (basePart) {
            parts.push(basePart);
          }
          parts.push(...additionalWords);
          parts.push(...combinedInitials);
          return parts.join(" ").replace(/\s+/g, " ").trim();
        }
        findGivenNameVariantGroups(creatorsBySurname) {
          const groups = [];
          for (const [groupKey, creators] of Object.entries(creatorsBySurname)) {
            if (!creators || creators.length < 1) {
              continue;
            }
            const lastPipeIndex = groupKey.lastIndexOf("|");
            const surname = lastPipeIndex > 0 ? groupKey.slice(lastPipeIndex + 1) : groupKey;
            const results = this.findGivenNameVariantsForSurname(surname, creators);
            if (results.length > 0) {
              groups.push(...results);
            }
          }
          return groups;
        }
        findGivenNameVariantsForSurname(surname, creators) {
          const groups = [];
          const normalizedBuckets = /* @__PURE__ */ new Map();
          const itemsByKey = /* @__PURE__ */ new Map();
          const surnameKey = (surname || "").trim();
          const surnameLower = surnameKey.toLowerCase();
          const displaySurname = this.toTitleCase(surnameKey);
          for (const creator of creators) {
            const parsedFirstParts = [
              creator.parsedName?.firstName,
              creator.parsedName?.middleName
            ].filter((part) => part && typeof part === "string" && part.trim().length > 0);
            const parsedFirst = parsedFirstParts.join(" ").trim();
            const fallbackFirst = (creator.firstName || "").trim();
            const effectiveFirst = parsedFirst || fallbackFirst;
            if (!effectiveFirst) {
              continue;
            }
            const normalized = this.normalizeGivenName(effectiveFirst);
            const key = normalized || effectiveFirst.toLowerCase();
            if (!normalizedBuckets.has(key)) {
              normalizedBuckets.set(key, []);
            }
            normalizedBuckets.get(key).push(creator);
            const creatorKey = `${effectiveFirst}|${creator.lastName}`;
            if (!itemsByKey.has(creatorKey)) {
              itemsByKey.set(creatorKey, creator.items || []);
            }
          }
          this.mergeInitialBuckets(normalizedBuckets);
          for (const [normalizedKey, bucket] of normalizedBuckets.entries()) {
            if (bucket.length < 2) {
              continue;
            }
            const bucketCanonical = this.selectCanonicalGivenNameData(bucket, normalizedKey);
            const fullNames = /* @__PURE__ */ new Map();
            for (const creator of bucket) {
              const rawFirstParts = [
                creator.parsedName?.firstName,
                creator.parsedName?.middleName
              ].filter((part) => part && typeof part === "string" && part.trim().length > 0);
              const rawFirst = rawFirstParts.join(" ").trim() || (creator.firstName || "").trim();
              const tokens = this.parseGivenNameTokens(rawFirst);
              const signature = this.extractTokenSignature(tokens);
              const displayFirst = this.composeGivenNameFromTokens(tokens, bucketCanonical) || bucketCanonical.baseWord || rawFirst;
              const rawLast = (creator.parsedName?.lastName || creator.lastName || surnameKey).trim();
              const displayLast = this.toTitleCase(rawLast);
              const variantKey = `${displayFirst}|${displayLast}`.toLowerCase();
              const existing = fullNames.get(variantKey) || {
                firstName: displayFirst,
                lastName: displayLast,
                frequency: 0,
                items: [],
                name: `${displayFirst} ${displayLast}`.trim(),
                tokenSignatures: [],
                creatorRefs: []
              };
              existing.frequency += creator.count || 1;
              existing.lastName = displayLast;
              existing.name = `${existing.firstName} ${displayLast}`.trim();
              existing.tokenSignatures.push(signature);
              existing.creatorRefs.push({ creator, tokens, signature });
              const nameKey = `${rawFirst}|${creator.lastName}`;
              if (itemsByKey.has(nameKey)) {
                existing.items = this.mergeItemSummaries(existing.items, itemsByKey.get(nameKey));
              }
              fullNames.set(variantKey, existing);
            }
            if (fullNames.size < 2) {
              continue;
            }
            const variantsArray = Array.from(fullNames.values()).map((variant) => {
              const lastNameDisplay = this.toTitleCase(variant.lastName || displaySurname);
              const combinedSignature = this.mergeTokenSignatures(variant.tokenSignatures || []);
              return Object.assign({}, variant, {
                lastName: lastNameDisplay,
                name: `${variant.firstName} ${lastNameDisplay}`.trim(),
                tokenSignature: combinedSignature,
                creatorRefs: (variant.creatorRefs || []).slice()
              });
            });
            const clusters = this.clusterVariantsBySignature(variantsArray);
            for (const indexSet of clusters) {
              if (!indexSet || indexSet.length < 2) {
                continue;
              }
              const clusterVariants = indexSet.map((idx) => Object.assign({}, variantsArray[idx]));
              const clusterCreators = [];
              clusterVariants.forEach((variant) => {
                (variant.creatorRefs || []).forEach((ref) => {
                  if (ref && ref.creator) {
                    clusterCreators.push(ref.creator);
                  }
                });
              });
              if (clusterCreators.length === 0) {
                continue;
              }
              const clusterCanonical = this.selectCanonicalGivenNameData(clusterCreators, normalizedKey);
              const sanitizedVariants = clusterVariants.map((variant) => {
                const clone = Object.assign({}, variant);
                delete clone.tokenSignature;
                delete clone.creatorRefs;
                return clone;
              });
              const recommendation = this.buildGivenNameRecommendation(sanitizedVariants, displaySurname, clusterCanonical);
              const clusterTotalFrequency = sanitizedVariants.reduce((sum, variant) => sum + (variant.frequency || 0), 0);
              groups.push({
                surname: displaySurname,
                surnameKey: surnameLower,
                normalizedKey,
                variants: sanitizedVariants,
                totalFrequency: clusterTotalFrequency,
                recommendedFirstName: recommendation.firstName,
                recommendedFullName: recommendation.fullName
              });
            }
          }
          return groups;
        }
        normalizeGivenName(firstName) {
          const trimmed = firstName.trim();
          if (!trimmed) {
            return "";
          }
          const tokens = trimmed.split(/[\s-]+/).filter(Boolean);
          const cleanedTokens = tokens.map((token) => token.replace(/\./g, ""));
          if (cleanedTokens.length === 0) {
            return "";
          }
          const primaryToken = cleanedTokens[0].toLowerCase();
          if (cleanedTokens.every((token) => token.length === 1)) {
            return `initial:${cleanedTokens.join("")}`;
          }
          if (cleanedTokens.length === 1 && this.isLikelyInitialSequence(cleanedTokens[0], tokens[0])) {
            return `initial:${cleanedTokens[0].toUpperCase()}`;
          }
          if (COMMON_GIVEN_NAME_EQUIVALENTS[primaryToken]) {
            return COMMON_GIVEN_NAME_EQUIVALENTS[primaryToken];
          }
          return primaryToken;
        }
        mergeItemSummaries(existing = [], incoming = []) {
          if (!incoming || incoming.length === 0) {
            return existing;
          }
          const byId = /* @__PURE__ */ new Map();
          const max = 25;
          for (const summary of existing) {
            if (!summary) continue;
            const key = summary.key || summary.id || JSON.stringify(summary);
            if (!byId.has(key)) {
              byId.set(key, summary);
            }
            if (byId.size >= max) break;
          }
          for (const summary of incoming) {
            if (!summary) continue;
            const key = summary.key || summary.id || JSON.stringify(summary);
            if (!byId.has(key) && byId.size < max) {
              byId.set(key, summary);
            }
            if (byId.size >= max) break;
          }
          return Array.from(byId.values());
        }
        mergeInitialBuckets(normalizedBuckets) {
          const canonicalKeys = Array.from(normalizedBuckets.keys()).filter((key) => !key.startsWith("initial:"));
          if (canonicalKeys.length === 0) {
            return normalizedBuckets;
          }
          for (const [key, bucket] of Array.from(normalizedBuckets.entries())) {
            if (!key.startsWith("initial:")) {
              continue;
            }
            const initials = key.replace("initial:", "");
            if (!initials) {
              continue;
            }
            const firstLetter = initials.charAt(0).toLowerCase();
            let destinationKey = null;
            if (initials.length > 1) {
              destinationKey = canonicalKeys.find(
                (canonicalKey) => canonicalKey.startsWith(initials.toLowerCase())
              );
            }
            if (!destinationKey) {
              destinationKey = canonicalKeys.find(
                (canonicalKey) => canonicalKey.charAt(0).toLowerCase() === firstLetter
              );
            }
            if (destinationKey) {
              const destination = normalizedBuckets.get(destinationKey);
              bucket.forEach((entry) => destination.push(entry));
              normalizedBuckets.delete(key);
            }
          }
          return normalizedBuckets;
        }
        buildGivenNameRecommendation(variants, surname, canonicalData = {}) {
          if (!variants || variants.length === 0) {
            return {
              firstName: "",
              fullName: surname || ""
            };
          }
          const pushUnique = (collection, value) => {
            if (!value) {
              return;
            }
            if (!collection.includes(value)) {
              collection.push(value);
            }
          };
          let baseWord = canonicalData.baseWord ? this.toTitleCase(canonicalData.baseWord) : "";
          const extraWords = [];
          const initials = [];
          let hasPlainWordVariant = false;
          for (const variant of variants) {
            const tokens = this.parseGivenNameTokens(variant.firstName || "");
            const variantHasWord = tokens.some((token) => token.type === "word");
            const variantHasInitial = tokens.some((token) => token.type === "initial");
            if (variantHasWord && !variantHasInitial) {
              hasPlainWordVariant = true;
            }
            let encounteredWord = false;
            for (const token of tokens) {
              if (token.type === "word") {
                if (!encounteredWord) {
                  encounteredWord = true;
                  if (!baseWord) {
                    baseWord = token.value;
                  }
                } else {
                  pushUnique(extraWords, token.value);
                }
              } else if (token.type === "initial") {
                pushUnique(initials, token.value.toUpperCase());
              }
            }
          }
          (canonicalData.extraWords || []).forEach((word) => pushUnique(extraWords, word));
          if (!hasPlainWordVariant) {
            (canonicalData.initials || []).forEach((letter) => pushUnique(initials, letter.toUpperCase()));
          }
          if (!baseWord) {
            const fallbackTokens = this.parseGivenNameTokens(variants[0].firstName || "");
            const fallbackWord = fallbackTokens.find((token) => token.type === "word");
            if (fallbackWord) {
              baseWord = fallbackWord.value;
            } else {
              const fallbackInitial = fallbackTokens.find((token) => token.type === "initial");
              if (fallbackInitial) {
                const fallbackLetter = fallbackInitial.value.toUpperCase();
                baseWord = `${fallbackLetter}.`;
                const idx = initials.indexOf(fallbackLetter);
                if (idx !== -1) {
                  initials.splice(idx, 1);
                }
              }
            }
          }
          const baseInitial = baseWord ? baseWord.charAt(0).toUpperCase() : "";
          if (baseInitial) {
            const index = initials.indexOf(baseInitial);
            if (index !== -1) {
              initials.splice(index, 1);
            }
          }
          if (hasPlainWordVariant) {
            initials.length = 0;
          }
          const recommendedParts = [];
          if (baseWord) {
            recommendedParts.push(baseWord);
          }
          recommendedParts.push(...extraWords);
          initials.forEach((letter) => recommendedParts.push(`${letter}.`));
          const recommendedFirst = recommendedParts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
          const surnameDisplay = this.toTitleCase(surname || "");
          const recommendedFullName = surnameDisplay ? `${recommendedFirst} ${surnameDisplay}`.trim() : recommendedFirst;
          return {
            firstName: recommendedFirst,
            fullName: recommendedFullName
          };
        }
        scoreGivenNameVariant(variant) {
          if (!variant) {
            return 0;
          }
          let score = variant.frequency || 0;
          const name = (variant.firstName || "").trim();
          if (!name) {
            return score;
          }
          const cleaned = name.replace(/\./g, "");
          if (/[a-z]{2,}/i.test(cleaned)) {
            score += 1e3;
          }
          if (!name.includes(".")) {
            score += 200;
          }
          const primaryToken = cleaned.split(/[\s-]+/)[0]?.toLowerCase() || "";
          if (COMMON_GIVEN_NAME_EQUIVALENTS[primaryToken]) {
            score += 50;
          }
          score += Math.min(cleaned.length, 20);
          return score;
        }
        toTitleCase(value) {
          if (!value) {
            return "";
          }
          return value.split(/\s+/).filter(Boolean).map((part) => {
            const lowered = part.toLowerCase();
            return lowered.replace(new RegExp("(^|['`-])(\\p{L})", "gu"), (m, p, c) => p + c.toUpperCase());
          }).join(" ");
        }
        /**
         * Check if a name appears to be in all uppercase
         * Used to determine if given name should be title-cased during surname normalization
         * @param {string} name - Name to check
         * @returns {boolean} True if the name appears to be uppercase
         */
        isUpperCaseName(name) {
          if (!name || typeof name !== "string") {
            return false;
          }
          const letters = name.replace(/[.\s-]/g, "");
          if (letters.length === 0) {
            return false;
          }
          return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
        }
        /**
         * Parse a name string into components
         * @param {string} name - Full name string
         * @returns {Object} Parsed name components
         */
        parseName(name) {
          const NameParser2 = require_name_parser();
          const parser = new NameParser2();
          return parser.parse(name);
        }
        /**
         * Calculate similarity between two strings using Levenshtein distance
         * @param {string} str1 - First string
         * @param {string} str2 - Second string
         * @returns {number} Similarity score (0-1)
         */
        calculateStringSimilarity(str1, str2) {
          return normalizedLevenshtein(str1, str2);
        }
        /**
         * Generate normalization suggestions from variant pairs
         * @param {Array} variants - Array of variant pairs
         * @param {Array} givenNameVariantGroups - Given name variant groups
         * @param {Object} itemsByFullAuthor - Items keyed by "firstName|lastName"
         * @returns {Array} Array of normalization suggestions
         */
        generateNormalizationSuggestions(variants, givenNameVariantGroups = [], itemsByFullAuthor = {}) {
          const DEBUG = true;
          const log = (msg) => {
            if (DEBUG) {
              const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[1].split(".")[0];
              const line = timestamp + " SUGGEST: " + msg;
              console.error(line);
            }
          };
          log("generateNormalizationSuggestions called with " + (variants ? variants.length : 0) + " variants, " + (givenNameVariantGroups ? givenNameVariantGroups.length : 0) + " given-name groups");
          const suggestions = [];
          const processedSurnames = /* @__PURE__ */ new Set();
          for (const variant of variants || []) {
            const norm1 = variant.variant1.name;
            const norm2 = variant.variant2.name;
            if (!processedSurnames.has(norm1) && !processedSurnames.has(norm2)) {
              let items1 = variant.variant1.items || [];
              let items2 = variant.variant2.items || [];
              if (items1.length === 0) {
                const firstName1 = variant.variant1.firstName || variant.authorInfo && variant.authorInfo.firstName || "";
                items1 = firstName1 ? this.findItemsByFullAuthorName(itemsByFullAuthor, firstName1, variant.variant1.name) : this.findItemsBySurname(itemsByFullAuthor, variant.variant1.name);
              }
              if (items2.length === 0) {
                const firstName2 = variant.variant2.firstName || variant.authorInfo && variant.authorInfo.firstName || "";
                items2 = firstName2 ? this.findItemsByFullAuthorName(itemsByFullAuthor, firstName2, variant.variant2.name) : this.findItemsBySurname(itemsByFullAuthor, variant.variant2.name);
              }
              const suggestion = {
                type: "surname",
                primary: variant.recommendedNormalization,
                // Include authorInfo for display purposes
                authorInfo: variant.authorInfo || null,
                variants: [
                  {
                    name: variant.variant1.name,
                    frequency: variant.variant1.frequency,
                    items: items1
                  },
                  {
                    name: variant.variant2.name,
                    frequency: variant.variant2.frequency,
                    items: items2
                  }
                ],
                similarity: variant.similarity,
                surnameKey: (variant.recommendedNormalization || "").toLowerCase()
              };
              this.enrichSuggestionWithGivenNameData(suggestion, givenNameVariantGroups);
              const shouldSkip = this.shouldSkipSuggestionFromLearning(suggestion);
              log("Checking suggestion: " + norm1 + " vs " + norm2 + " -> shouldSkip=" + shouldSkip);
              if (shouldSkip) {
                processedSurnames.add(norm1);
                processedSurnames.add(norm2);
                continue;
              }
              suggestions.push(suggestion);
              processedSurnames.add(norm1);
              processedSurnames.add(norm2);
            }
          }
          log("generateNormalizationSuggestions complete: suggestions=" + suggestions.length + " of " + (variants ? variants.length : 0) + " variants");
          for (const group of givenNameVariantGroups || []) {
            if (!group || !group.surname || !Array.isArray(group.variants) || group.variants.length < 2) {
              continue;
            }
            const groupSurnameKey = group.surnameKey || group.surname.toLowerCase();
            const existing = suggestions.find(
              (s) => s.type === "given-name" && (s.surnameKey || (s.surname || "").toLowerCase()) === groupSurnameKey && s.normalizedGivenNameKey === group.normalizedKey
            );
            const variantDatasets = group.variants.map((variant) => {
              const lastNameDisplay = variant.lastName || group.surname;
              return {
                name: `${variant.firstName} ${lastNameDisplay}`.trim(),
                firstName: variant.firstName,
                lastName: lastNameDisplay,
                frequency: variant.frequency,
                items: variant.items || []
              };
            });
            if (existing) {
              existing.variants = this.mergeVariantLists(existing.variants, variantDatasets);
              existing.totalFrequency = (existing.totalFrequency || 0) + (group.totalFrequency || 0);
              existing.surname = group.surname;
              existing.surnameKey = groupSurnameKey;
              existing.normalizedGivenNameKey = group.normalizedKey;
              if (!existing.recommendedFullName && group.recommendedFullName) {
                existing.recommendedFullName = group.recommendedFullName;
              }
            } else {
              const candidate = {
                type: "given-name",
                surname: group.surname,
                surnameKey: groupSurnameKey,
                normalizedGivenNameKey: group.normalizedKey,
                variants: variantDatasets,
                totalFrequency: group.totalFrequency,
                recommendedFirstName: group.recommendedFirstName,
                recommendedFullName: group.recommendedFullName,
                primary: group.recommendedFullName || `${variantDatasets[0]?.name || ""}`
              };
              if (this.shouldSkipSuggestionFromLearning(candidate)) {
                continue;
              }
              suggestions.push(candidate);
            }
          }
          Zotero.debug("ZoteroDBAnalyzer: Generated " + suggestions.length + " normalization suggestions (combined)");
          return suggestions;
        }
        enrichSuggestionWithGivenNameData(suggestion, givenNameVariantGroups) {
          if (!suggestion || !givenNameVariantGroups || givenNameVariantGroups.length === 0) {
            return suggestion;
          }
          const surnameKey = (suggestion.surnameKey || suggestion.primary || "").toLowerCase();
          if (!surnameKey) {
            return suggestion;
          }
          const givenNameGroup = givenNameVariantGroups.find(
            (group) => group && (group.surnameKey || (group.surname || "").toLowerCase()) === surnameKey
          );
          if (!givenNameGroup) {
            return suggestion;
          }
          suggestion.relatedGivenNameVariants = givenNameGroup.variants.map((variant) => ({
            firstName: variant.firstName,
            frequency: variant.frequency,
            items: variant.items || []
          }));
          suggestion.relatedGivenNameKey = givenNameGroup.normalizedKey;
          suggestion.relatedGivenNameTotal = givenNameGroup.totalFrequency;
          return suggestion;
        }
        mergeVariantLists(existing = [], incoming = []) {
          if (!incoming || incoming.length === 0) {
            return existing || [];
          }
          const byName = /* @__PURE__ */ new Map();
          for (const variant of existing || []) {
            if (!variant) continue;
            const key = variant.name ? variant.name.toLowerCase() : JSON.stringify(variant);
            if (!byName.has(key)) {
              byName.set(key, { ...variant, items: variant.items ? [...variant.items] : [] });
            }
          }
          for (const variant of incoming) {
            if (!variant) continue;
            const key = variant.name ? variant.name.toLowerCase() : JSON.stringify(variant);
            if (!byName.has(key)) {
              byName.set(key, { ...variant, items: variant.items ? [...variant.items] : [] });
            } else {
              const current = byName.get(key);
              current.frequency = (current.frequency || 0) + (variant.frequency || 0);
              current.items = this.mergeItemSummaries(current.items, variant.items);
            }
          }
          return Array.from(byName.values()).sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
        }
        /**
         * Get normalization recommendations for a specific surname
         * @param {string} surname - Surname to check
         * @returns {Object|null} Normalization recommendation or null
         */
        async getNormalizationForSurname(surname) {
          if (typeof Zotero === "undefined") {
            return null;
          }
          const results = await this.analyzeFullLibrary();
          for (const variant of results.potentialVariants) {
            if (variant.variant1.name === surname || variant.variant2.name === surname) {
              return {
                recommended: variant.recommendedNormalization,
                alternatives: [
                  variant.variant1.name,
                  variant.variant2.name
                ],
                similarity: variant.similarity,
                frequencies: {
                  [variant.variant1.name]: variant.variant1.frequency,
                  [variant.variant2.name]: variant.variant2.frequency
                }
              };
            }
          }
          return null;
        }
        /**
         * Apply learned normalizations from analysis to the database
         * @param {Array} suggestions - Array of normalization suggestions to apply
         * @param {boolean} autoConfirm - Whether to auto-confirm all suggestions
         * @returns {Object} Results of the normalization application
         */
        async applyNormalizationSuggestions(suggestions, autoConfirm = false, options = {}) {
          if (typeof Zotero === "undefined") {
            throw new Error("This method must be run in the Zotero context");
          }
          if (typeof Zotero === "undefined" || !Zotero.Items || typeof Zotero.Items.getAsync !== "function") {
            throw new Error("Zotero Items API is not available");
          }
          const { progressCallback = null, declinedSuggestions = [] } = options || {};
          const incoming = Array.isArray(suggestions) ? suggestions : [];
          const results = {
            totalSuggestions: incoming.length,
            applied: 0,
            skipped: 0,
            errors: 0,
            updatedCreators: 0,
            declinedRecorded: 0
          };
          if (incoming.length === 0) {
            if (Array.isArray(declinedSuggestions) && declinedSuggestions.length > 0) {
              results.declinedRecorded += await this.recordDeclinedSuggestions(declinedSuggestions);
            }
            if (progressCallback) {
              progressCallback({
                stage: "complete",
                applied: results.applied,
                skipped: results.skipped,
                updatedCreators: results.updatedCreators,
                declined: results.declinedRecorded,
                total: results.totalSuggestions
              });
            }
            return results;
          }
          try {
            const confirmed = [];
            for (const suggestion of incoming) {
              try {
                const shouldApply = autoConfirm || await this.confirmNormalization(suggestion);
                if (shouldApply) {
                  confirmed.push(suggestion);
                } else {
                  results.skipped++;
                }
              } catch (error) {
                console.error("Error applying normalization:", error);
                results.errors++;
              }
            }
            if (confirmed.length > 0) {
              if (progressCallback) {
                progressCallback({
                  stage: "prepare",
                  total: confirmed.length
                });
              }
              const dbOutcome = await this.applyDatabaseNormalizations(confirmed, { progressCallback });
              results.applied = confirmed.length;
              results.updatedCreators = dbOutcome.updatedCreators || 0;
              results.errors += Array.isArray(dbOutcome.errors) ? dbOutcome.errors.length : 0;
              await this.persistLearningDecisions(confirmed, dbOutcome.plans);
              if (progressCallback) {
                progressCallback({
                  stage: "finalizing",
                  total: confirmed.length,
                  updatedCreators: results.updatedCreators
                });
              }
            }
            if (Array.isArray(declinedSuggestions) && declinedSuggestions.length > 0) {
              results.declinedRecorded += await this.recordDeclinedSuggestions(declinedSuggestions);
            }
            if (progressCallback) {
              progressCallback({
                stage: "complete",
                applied: results.applied,
                skipped: results.skipped,
                updatedCreators: results.updatedCreators,
                declined: results.declinedRecorded,
                total: results.totalSuggestions
              });
            }
          } catch (error) {
            console.error("Error in applyNormalizationSuggestions:", error);
            results.errors++;
            if (progressCallback) {
              progressCallback({ stage: "error", error });
            }
          }
          return results;
        }
        async persistLearningDecisions(suggestions, plans) {
          if (!this.learningEngine) {
            return;
          }
          const planMap = /* @__PURE__ */ new Map();
          if (Array.isArray(plans)) {
            for (const plan of plans) {
              if (plan && plan.suggestion) {
                planMap.set(plan.suggestion, plan);
              }
            }
          }
          for (const suggestion of suggestions || []) {
            const plan = planMap.get(suggestion) || this.buildSuggestionOperationPlan(suggestion);
            await this.persistLearningForSuggestion(suggestion, plan);
          }
        }
        async persistLearningForSuggestion(suggestion, plan) {
          if (!this.learningEngine || !suggestion) {
            return;
          }
          const normalizedValue = (suggestion.primary || "").trim();
          const variants = Array.isArray(suggestion.variants) ? suggestion.variants : [];
          const variantPairs = plan && Array.isArray(plan.variantPairs) ? plan.variantPairs : this.getVariantPairsForSuggestion(suggestion);
          if (suggestion.type === "surname") {
            for (const variant of variants) {
              const variantName = (variant && variant.name ? variant.name : "").trim();
              if (!variantName) {
                continue;
              }
              if (this.stringsEqualIgnoreCase(variantName, normalizedValue)) {
                continue;
              }
              try {
                await this.learningEngine.storeMapping(
                  variantName,
                  normalizedValue,
                  suggestion.similarity || 1
                );
              } catch (error) {
                console.error("Error storing surname mapping:", error);
              }
            }
          } else {
            const normalizedFirstName = plan?.normalizedFirstName || "";
            const normalizedLastName = plan?.normalizedLastName || suggestion.surname || "";
            const normalizedFullName = plan?.normalizedFullName || this.buildFullName(normalizedFirstName, normalizedLastName);
            if (normalizedFullName) {
              for (const variant of variants) {
                const variantFirstName = this.extractVariantGivenName(variant);
                const variantLastName = this.extractVariantSurname(variant, normalizedLastName);
                const variantFullName = this.buildFullName(variantFirstName, variantLastName);
                if (!variantFullName) {
                  continue;
                }
                if (this.stringsEqualIgnoreCase(variantFullName, normalizedFullName)) {
                  continue;
                }
                try {
                  await this.learningEngine.storeMapping(
                    variantFullName,
                    normalizedFullName,
                    suggestion.similarity || 1
                  );
                } catch (error) {
                  console.error("Error storing given-name mapping:", error);
                }
              }
            }
          }
          if (variantPairs && variantPairs.length > 0 && typeof this.learningEngine.clearDistinctPair === "function") {
            for (const pair of variantPairs) {
              try {
                await this.learningEngine.clearDistinctPair(pair.nameA, pair.nameB, pair.scope);
              } catch (error) {
                console.error("Error clearing distinct pair learning entry:", error);
              }
            }
          }
        }
        async recordDeclinedSuggestions(suggestions) {
          if (!this.learningEngine || typeof this.learningEngine.recordDistinctPair !== "function") {
            return 0;
          }
          if (!Array.isArray(suggestions) || suggestions.length === 0) {
            return 0;
          }
          let recorded = 0;
          for (const suggestion of suggestions) {
            if (!suggestion) {
              continue;
            }
            const pairs = this.getVariantPairsForSuggestion(suggestion);
            for (const pair of pairs) {
              try {
                const saved = await this.learningEngine.recordDistinctPair(pair.nameA, pair.nameB, pair.scope);
                if (saved) {
                  recorded++;
                }
              } catch (error) {
                console.error("Error recording distinct pair decision:", error);
              }
            }
          }
          return recorded;
        }
        async applyDatabaseNormalizations(suggestions, options = {}) {
          if (!Array.isArray(suggestions) || suggestions.length === 0) {
            return { plans: [], operations: [], updatedCreators: 0, errors: [] };
          }
          const progressCallback = options.progressCallback || null;
          if (progressCallback) {
            progressCallback({
              stage: "operations-planned",
              total: suggestions.length,
              suggestions: suggestions.length
            });
          }
          const errors = [];
          let updatedCreators = 0;
          let processed = 0;
          const totalSuggestions = suggestions.length;
          const allItemIds = /* @__PURE__ */ new Set();
          const itemUpdates = /* @__PURE__ */ new Map();
          for (const suggestion of suggestions) {
            if (!suggestion || !suggestion.primary) continue;
            const normalizedValue = suggestion.primary.trim();
            const type = suggestion.type || "surname";
            for (const variant of suggestion.variants || []) {
              if (!variant || !variant.items || variant.items.length === 0) continue;
              for (const itemSummary of variant.items) {
                if (!itemSummary || !itemSummary.id) continue;
                const itemId = itemSummary.id;
                const variantName = (variant.name || "").trim();
                if (variantName === normalizedValue) continue;
                allItemIds.add(itemId);
                if (!itemUpdates.has(itemId)) {
                  itemUpdates.set(itemId, { suggestion, variant, normalizedValue, type });
                }
              }
            }
          }
          if (allItemIds.size === 0) {
            if (progressCallback) {
              progressCallback({ stage: "operations-finished", total: 0, updatedCreators: 0 });
            }
            return { plans: [], operations: [], updatedCreators: 0, errors: [] };
          }
          const itemIdsArray = Array.from(allItemIds);
          const items = await Zotero.Items.getAsync(itemIdsArray);
          for (const item of items) {
            if (!item || typeof item.getCreators !== "function") continue;
            try {
              const creators = item.getCreators();
              if (!Array.isArray(creators)) continue;
              let updated = false;
              const normalizedCreators = creators.map((creator) => {
                if (!creator) return creator;
                const updateInfo = itemUpdates.get(item.id);
                if (!updateInfo) return creator;
                const { normalizedValue, type, variant } = updateInfo;
                let newCreator = { ...creator };
                if (type === "surname") {
                  const creatorLastName = (creator.lastName || "").trim();
                  const variantName = (variant.name || "").trim();
                  if (this.stringsEqualIgnoreCase(creatorLastName, variantName)) {
                    newCreator.lastName = normalizedValue;
                    const creatorFirstName = (creator.firstName || "").trim();
                    if (creatorFirstName && this.isUpperCaseName(creatorFirstName)) {
                      newCreator.firstName = this.toTitleCase(creatorFirstName);
                    }
                    updated = true;
                  }
                } else {
                  const creatorFirstName = (creator.firstName || "").trim();
                  const creatorLastName = (creator.lastName || "").trim();
                  const variantFirstName = (variant.firstName || "").trim();
                  const variantLastName = (variant.lastName || creatorLastName).trim();
                  if (this.stringsEqualIgnoreCase(creatorFirstName, variantFirstName) && this.stringsEqualIgnoreCase(creatorLastName, variantLastName)) {
                    const normalizedParts = normalizedValue.split(" ");
                    newCreator.firstName = normalizedParts[0] || "";
                    newCreator.lastName = normalizedParts.slice(1).join(" ") || creatorLastName;
                    updated = true;
                  }
                }
                return newCreator;
              });
              if (updated) {
                item.setCreators(normalizedCreators);
                await item.saveTx();
                updatedCreators++;
                if (progressCallback) {
                  processed++;
                  progressCallback({
                    stage: "operation-complete",
                    processed,
                    total: totalSuggestions,
                    affected: 1,
                    itemId: item.id
                  });
                }
              }
            } catch (error) {
              errors.push({ itemId: item.id, error });
              console.error("Error updating item:", error);
            }
          }
          if (progressCallback) {
            progressCallback({
              stage: "operations-finished",
              total: totalSuggestions,
              updatedCreators
            });
          }
          const plans = suggestions.map((suggestion) => this.buildSuggestionOperationPlan(suggestion));
          return { plans, operations: [], updatedCreators, errors };
        }
        buildSuggestionOperationPlan(suggestion) {
          const normalizedValue = (suggestion && suggestion.primary ? suggestion.primary : "").trim();
          const plan = {
            suggestion,
            normalizedValue,
            operations: [],
            variantPairs: this.getVariantPairsForSuggestion(suggestion),
            normalizedFirstName: "",
            normalizedLastName: "",
            normalizedFullName: ""
          };
          if (!suggestion || !Array.isArray(suggestion.variants) || suggestion.variants.length === 0) {
            return plan;
          }
          const unique = /* @__PURE__ */ new Set();
          if (suggestion.type === "surname") {
            for (const variant of suggestion.variants) {
              const variantName = (variant && variant.name ? variant.name : "").trim();
              if (!variantName) {
                continue;
              }
              const opKey = `surname|${variantName.toLowerCase()}|${normalizedValue.toLowerCase()}`;
              if (unique.has(opKey)) {
                continue;
              }
              unique.add(opKey);
              if (variantName === normalizedValue) {
                continue;
              }
              plan.operations.push({
                type: "surname",
                fromLastName: variantName,
                toLastName: normalizedValue,
                scope: "surname",
                variant
              });
            }
            return plan;
          }
          const parsedNormalized = this.parseName(normalizedValue);
          const normalizedFirstName = [parsedNormalized.firstName, parsedNormalized.middleName].filter(Boolean).join(" ").trim() || parsedNormalized.firstName || normalizedValue;
          const normalizedLastName = parsedNormalized.lastName || suggestion.surname || "";
          plan.normalizedFirstName = normalizedFirstName;
          plan.normalizedLastName = normalizedLastName;
          plan.normalizedFullName = this.buildFullName(normalizedFirstName, normalizedLastName);
          for (const variant of suggestion.variants) {
            const variantFirstName = this.extractVariantGivenName(variant);
            const variantLastName = this.extractVariantSurname(variant, normalizedLastName || suggestion.surname || "");
            if (!variantFirstName || !variantLastName) {
              continue;
            }
            const opKey = `given|${variantFirstName.toLowerCase()}|${variantLastName.toLowerCase()}`;
            if (unique.has(opKey)) {
              continue;
            }
            unique.add(opKey);
            if (this.stringsEqualIgnoreCase(variantFirstName, normalizedFirstName) && this.stringsEqualIgnoreCase(variantLastName, normalizedLastName)) {
              continue;
            }
            plan.operations.push({
              type: "given-name",
              fromFirstName: variantFirstName,
              fromLastName: variantLastName,
              toFirstName: normalizedFirstName,
              toLastName: normalizedLastName || variantLastName,
              scope: `given:${suggestion.surnameKey || (variantLastName || "").toLowerCase()}`,
              variant
            });
          }
          return plan;
        }
        getVariantPairsForSuggestion(suggestion) {
          if (!suggestion || !Array.isArray(suggestion.variants) || suggestion.variants.length < 2) {
            return [];
          }
          const variants = suggestion.variants;
          const scopeBase = suggestion.type === "surname" ? "surname" : `given:${suggestion.surnameKey || (suggestion.surname || "").toLowerCase()}`;
          const pairs = [];
          for (let i = 0; i < variants.length; i++) {
            const nameA = this.extractVariantPairName(suggestion, variants[i]);
            if (!nameA) {
              continue;
            }
            for (let j = i + 1; j < variants.length; j++) {
              const nameB = this.extractVariantPairName(suggestion, variants[j]);
              if (!nameB) {
                continue;
              }
              pairs.push({ nameA, nameB, scope: scopeBase });
            }
          }
          return pairs;
        }
        extractVariantPairName(suggestion, variant) {
          if (!variant) {
            return "";
          }
          if (suggestion && suggestion.type === "surname") {
            return (variant.name || "").trim();
          }
          const surname = suggestion?.surname || variant.lastName || suggestion?.primary || "";
          const firstName = this.extractVariantGivenName(variant);
          if (firstName) {
            return this.buildFullName(firstName, surname);
          }
          return (variant.name || "").trim();
        }
        stringsEqualIgnoreCase(a, b) {
          if (!a && !b) {
            return true;
          }
          if (!a || !b) {
            return false;
          }
          return a.trim().toLowerCase() === b.trim().toLowerCase();
        }
        extractVariantGivenName(variant) {
          if (!variant) {
            return "";
          }
          if (typeof variant.firstName === "string" && variant.firstName.trim()) {
            return variant.firstName.trim();
          }
          if (typeof variant.name === "string" && variant.name.trim()) {
            const parsed = this.parseName(variant.name);
            const given = [parsed.firstName, parsed.middleName].filter(Boolean).join(" ").trim();
            if (given) {
              return given;
            }
          }
          return "";
        }
        extractVariantSurname(variant, fallback = "") {
          if (!variant) {
            return fallback || "";
          }
          if (typeof variant.lastName === "string" && variant.lastName.trim()) {
            return variant.lastName.trim();
          }
          if (typeof variant.name === "string" && variant.name.trim()) {
            const parsed = this.parseName(variant.name);
            if (parsed.lastName) {
              return parsed.lastName.trim();
            }
          }
          return fallback || "";
        }
        buildFullName(first, last) {
          return [first, last].filter((part) => part && part.trim()).join(" ").trim();
        }
        describeOperation(operation) {
          if (!operation) {
            return "";
          }
          if (operation.type === "surname") {
            return `${operation.fromLastName} \u2192 ${operation.toLastName}`;
          }
          const from = this.buildFullName(operation.fromFirstName, operation.fromLastName);
          const to = this.buildFullName(operation.toFirstName, operation.toLastName);
          return `${from} \u2192 ${to}`;
        }
        shouldSkipSuggestionFromLearning(suggestion) {
          if (!this.learningEngine || typeof this.learningEngine.isDistinctPair !== "function") {
            return false;
          }
          const pairs = this.getVariantPairsForSuggestion(suggestion);
          if (!pairs || pairs.length === 0) {
            return false;
          }
          return pairs.some((pair) => this.learningEngine.isDistinctPair(pair.nameA, pair.nameB, pair.scope));
        }
        /**
         * Confirm if a normalization should be applied (in a real UI this would show a dialog)
         * @param {Object} suggestion - Normalization suggestion
         * @returns {Promise<boolean>} Whether to apply the normalization
         */
        async confirmNormalization() {
          return true;
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = ZoteroDBAnalyzer2;
      }
    }
  });

  // src/ui/normalizer-dialog.js
  var require_normalizer_dialog = __commonJS({
    "src/ui/normalizer-dialog.js"(exports, module) {
      var NormalizerDialog2 = class {
        constructor() {
          this.learningEngine = new (require_learning_engine())();
          this.variantGenerator = new (require_variant_generator())();
          this.nameParser = new (require_name_parser())();
        }
        /**
         * Show the normalization dialog
         * @param {Array} items - Zotero items to process
         * @returns {Promise<Object>} User selections
         */
        async showDialog(items) {
          console.log("Showing normalization dialog for", items.length, "items");
          const results = [];
          for (const item of items) {
            const itemResults = await this.processItem(item);
            results.push(itemResults);
          }
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
              let learned = this.learningEngine.getMapping(rawName);
              if (learned) {
                processedCreators.push({
                  original: { ...creator },
                  normalized: learned,
                  type: creator.creatorType,
                  alreadyLearned: true,
                  status: "learned"
                });
                continue;
              }
              const similars = this.learningEngine.findSimilar(rawName);
              const parsed = this.nameParser.parse(rawName);
              const variants = this.variantGenerator.generateVariants(parsed);
              processedCreators.push({
                original: { ...creator },
                rawName,
                variants,
                similars,
                type: creator.creatorType,
                alreadyLearned: false,
                parsed,
                status: "new"
              });
            }
          }
          return {
            itemID: item.id,
            title: item.getField ? item.getField("title") : "Unknown Title",
            creators: processedCreators
          };
        }
        /**
         * Build raw name from creator object
         * @param {Object} creator - Creator object
         * @returns {string} Raw name string
         */
        buildRawName(creator) {
          return `${creator.firstName || ""} ${creator.lastName || ""}`.trim();
        }
        /**
         * Present options to user (stub implementation)
         * @param {Array} results - Processed results
         * @returns {Promise<Array>} User selections
         */
        async presentOptions(results) {
          console.log("Presenting options to user:");
          const userSelections = [];
          for (const itemResult of results) {
            const itemSelections = {
              itemID: itemResult.itemID,
              title: itemResult.title,
              creators: []
            };
            for (const creator of itemResult.creators) {
              if (creator.alreadyLearned) {
                itemSelections.creators.push({
                  original: creator.original,
                  normalized: creator.normalized,
                  type: creator.type,
                  accepted: true,
                  // Auto-accept learned mappings
                  source: "learned"
                });
              } else {
                const selectedVariant = creator.variants[0];
                itemSelections.creators.push({
                  original: creator.original,
                  normalized: selectedVariant,
                  type: creator.type,
                  accepted: true,
                  // For demo purposes, accept all
                  source: "user_selected",
                  selectedFrom: "variants"
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
                html += `<p><strong>Learned:</strong> ${creator.rawName} \u2192 ${creator.normalized}</p>`;
              } else {
                html += `<p><strong>Original:</strong> ${creator.rawName}</p>`;
                html += '<div class="variants-section">';
                html += "<h4>Variant Suggestions:</h4><ul>";
                for (const variant of creator.variants) {
                  html += `<li><label><input type="radio" name="selection-${creator.rawName}" value="${variant}"> ${variant}</label></li>`;
                }
                html += "</ul></div>";
                if (creator.similars.length > 0) {
                  html += '<div class="similar-section">';
                  html += "<h4>Similar Previously Learned Names:</h4><ul>";
                  for (const similar of creator.similars) {
                    html += `<li><label><input type="radio" name="selection-${creator.rawName}" value="${similar.normalized}"> ${similar.raw} \u2192 ${similar.normalized} (confidence: ${(similar.similarity * 100).toFixed(1)}%)</label></li>`;
                  }
                  html += "</ul></div>";
                }
              }
              html += "</div>";
            }
            html += "</div>";
          }
          html += '<div class="dialog-actions">';
          html += '<button id="accept-all-btn">Accept All</button>';
          html += '<button id="cancel-btn">Cancel</button>';
          html += "</div></div>";
          return html;
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = NormalizerDialog2;
      }
    }
  });

  // src/zotero/menu-integration.js
  var require_menu_integration = __commonJS({
    "src/zotero/menu-integration.js"(exports, module) {
      var MenuIntegration2 = class {
        constructor() {
          this.itemProcessor = new (require_item_processor())();
          this.zoteroDBAnalyzer = new (require_zotero_db_analyzer())();
        }
        /**
         * Initialize the menu integration
         */
        async initialize() {
          console.log("Initializing menu integration");
          this.registerMenuItems();
        }
        /**
         * Register menu items with Zotero
         */
        registerMenuItems() {
          console.log("Registered menu items for data normalization");
          this.registerFieldMenuItems();
        }
        /**
         * Register field-specific menu items under Tools > Normalize Field Data
         * Creates submenu with Publisher, Location, and Journal normalization options
         */
        registerFieldMenuItems() {
          if (typeof Zotero === "undefined") {
            console.log("Zotero context not available, skipping field menu registration");
            return;
          }
          try {
            const mainWindow = Zotero.getMainWindow();
            if (!mainWindow) {
              console.log("Could not get Zotero main window");
              return;
            }
            const doc = mainWindow.document;
            if (!doc) {
              console.log("Could not get main window document");
              return;
            }
            const toolsMenu = doc.querySelector("#menu_ToolsPopup");
            if (!toolsMenu) {
              console.log("Could not find Tools menu");
              return;
            }
            const separator = doc.createElement("menuseparator");
            toolsMenu.appendChild(separator);
            const fieldSubmenu = doc.createElement("menu");
            fieldSubmenu.setAttribute("label", "Normalize Field Data");
            fieldSubmenu.setAttribute("id", "zotero-ner-field-normalization-menu");
            const fieldTypes = [
              { id: "publisher", label: "Publisher" },
              { id: "location", label: "Location" },
              { id: "journal", label: "Journal" }
            ];
            for (const fieldType of fieldTypes) {
              const menuItem = doc.createElement("menuitem");
              menuItem.setAttribute("id", `zotero-ner-normalize-${fieldType.id}`);
              menuItem.setAttribute("label", `Normalize ${fieldType.label}`);
              menuItem.addEventListener("command", async () => {
                await this.handleFieldNormalizeAction(fieldType.id);
              });
              fieldSubmenu.appendChild(menuItem);
            }
            toolsMenu.appendChild(fieldSubmenu);
            console.log("Registered field normalization menu items: Publisher, Location, Journal");
          } catch (error) {
            console.error("Error registering field menu items:", error);
          }
        }
        /**
         * Handle field-specific normalize action for selected items
         * Opens the dialog with field type parameter
         * @param {string} fieldType - Type of field to normalize (publisher, location, journal)
         * @returns {Promise<Object>} Result object with success/error status
         */
        async handleFieldNormalizeAction(fieldType) {
          if (typeof Zotero === "undefined") {
            throw new Error("This feature requires Zotero context");
          }
          try {
            const zoteroPane = Zotero.getActiveZoteroPane();
            if (!zoteroPane) {
              Zotero.alert(null, "Zotero Name Normalizer", "Could not get Zotero pane");
              return { success: false, error: "Could not get Zotero pane" };
            }
            const items = zoteroPane.getSelectedItems();
            if (!items || items.length === 0) {
              Zotero.alert(null, "Zotero Name Normalizer", "Please select items to normalize");
              return { success: false, error: "No items selected" };
            }
            console.log(`Handling ${fieldType} normalization for ${items.length} items`);
            const mainWindow = Zotero.getMainWindow();
            if (!mainWindow) {
              Zotero.alert(null, "Zotero Name Normalizer", "Could not get main window");
              return { success: false, error: "Could not get main window" };
            }
            const params = {
              items: items.map((item) => item.id),
              // Pass item IDs
              fieldType
            };
            mainWindow.openDialog(
              "chrome://zoteronamenormalizer/content/dialog.html",
              "zotero-field-normalizer-dialog",
              "chrome,centerscreen,resizable=yes,width=750,height=550",
              params
            );
            return {
              success: true,
              message: `Opening ${fieldType} normalization dialog`
            };
          } catch (error) {
            Zotero.debug(`MenuIntegration: Error in handleFieldNormalizeAction: ${error.message}`);
            throw error;
          }
        }
        /**
         * Handle normalize action for selected items
         * @param {Array} items - Selected Zotero items
         */
        async handleNormalizeAction(items) {
          try {
            console.log(`Handling normalize action for ${items.length} items`);
            const results = [];
            for (const item of items) {
              const itemResults = await this.itemProcessor.processItemCreators(item);
              results.push({
                item,
                results: itemResults
              });
            }
            const normalizerDialog = new (require_normalizer_dialog())();
            const userSelections = await normalizerDialog.showDialog(items);
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const selections = userSelections[i];
              await this.itemProcessor.applyNormalizations(item, selections.creators);
            }
            return { success: true, processed: items.length };
          } catch (error) {
            Zotero.debug(`MenuIntegration: Error in handleNormalizeAction: ${error.message}`);
            throw error;
          }
        }
        /**
         * Perform a full library analysis for name variants
         * @returns {Object} Analysis results
         */
        async performFullLibraryAnalysis() {
          if (typeof Zotero === "undefined") {
            throw new Error("This feature requires Zotero context");
          }
          console.log("Starting full library analysis for name variants...");
          try {
            const results = await this.zoteroDBAnalyzer.analyzeFullLibrary();
            console.log(`Analysis complete: Found ${results.totalVariantGroups} potential variant groups`);
            return results;
          } catch (error) {
            console.error("Error in full library analysis:", error);
            throw error;
          }
        }
        /**
         * Handle full library analysis action
         */
        async handleFullLibraryAnalysis() {
          try {
            const results = await this.performFullLibraryAnalysis();
            console.log("Full library analysis results:", {
              totalUniqueSurnames: results.totalUniqueSurnames,
              totalVariantGroups: results.totalVariantGroups,
              topSuggestions: results.suggestions.slice(0, 10)
              // First 10 suggestions
            });
            return results;
          } catch (error) {
            console.error("Error handling full library analysis:", error);
            throw error;
          }
        }
        /**
         * Apply normalization suggestions (called from dialog via window.opener)
         * @param {Array} suggestions - Array of normalization suggestions
         * @param {boolean} autoConfirm - Whether to auto-confirm all
         * @param {Object} options - Additional options including progressCallback
         * @returns {Object} Results of the normalization application
         */
        async applyNormalizationSuggestions(suggestions, autoConfirm = false, options = {}) {
          if (typeof Zotero === "undefined") {
            throw new Error("This feature requires Zotero context");
          }
          console.log("Applying normalization suggestions for " + suggestions.length + " items");
          try {
            const results = await this.zoteroDBAnalyzer.applyNormalizationSuggestions(
              suggestions,
              autoConfirm,
              options
            );
            console.log("Normalization application complete:", results);
            return results;
          } catch (error) {
            console.error("Error applying normalization suggestions:", error);
            throw error;
          }
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = MenuIntegration2;
      }
    }
  });

  // src/ui/batch-processor.js
  var require_batch_processor = __commonJS({
    "src/ui/batch-processor.js"(exports, module) {
      var BatchProcessor2 = class {
        constructor() {
          this.learningEngine = new (require_learning_engine())();
        }
        /**
         * Process multiple Zotero items in batch
         * @param {Array} items - Array of Zotero items to process
         */
        async processBatch(items) {
          console.log(`Processing ${items.length} items in batch`);
          for (const item of items) {
            await this.processItem(item);
          }
          return { success: true, processedCount: items.length };
        }
        /**
         * Process a single Zotero item
         * @param {Object} item - Zotero item to process
         */
        async processItem(item) {
          const creators = item.getCreators ? item.getCreators() : [];
          for (const creator of creators) {
            if (creator.firstName || creator.lastName) {
              const rawName = `${creator.firstName || ""} ${creator.lastName || ""}`.trim();
              const learned = this.learningEngine.getMapping(rawName);
              if (learned) {
                console.log(`Applying learned normalization: ${rawName} -> ${learned}`);
              } else {
                console.log(`Need to process: ${rawName}`);
              }
            }
          }
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = BatchProcessor2;
      }
    }
  });

  // src/storage/data-manager.js
  var require_data_manager = __commonJS({
    "src/storage/data-manager.js"(exports, module) {
      var DataManager2 = class {
        constructor() {
          this.settingsKey = "name_normalizer_settings";
          this.mappingsKey = "name_normalizer_mappings";
        }
        /**
         * Save settings
         * @param {Object} settings - Settings object to save
         */
        async saveSettings(settings) {
          try {
            const serialized = JSON.stringify(settings);
            localStorage.setItem(this.settingsKey, serialized);
            return true;
          } catch (error) {
            console.error("Error saving settings:", error);
            return false;
          }
        }
        /**
         * Load settings
         * @returns {Object} Loaded settings or default
         */
        async loadSettings() {
          try {
            const stored = localStorage.getItem(this.settingsKey);
            if (stored) {
              return JSON.parse(stored);
            }
            return this.getDefaultSettings();
          } catch (error) {
            console.error("Error loading settings:", error);
            return this.getDefaultSettings();
          }
        }
        /**
         * Get default settings
         * @returns {Object} Default settings
         */
        getDefaultSettings() {
          return {
            autoApplyLearned: true,
            showSuggestionsThreshold: 0.8,
            enableSpanishSurnameDetection: true
          };
        }
        /**
         * Save name mappings
         * @param {Map} mappings - Name mappings to save
         */
        async saveMappings(mappings) {
          try {
            const serialized = JSON.stringify([...mappings.entries()]);
            localStorage.setItem(this.mappingsKey, serialized);
            return true;
          } catch (error) {
            console.error("Error saving mappings:", error);
            return false;
          }
        }
        /**
         * Load name mappings
         * @returns {Map} Loaded mappings
         */
        async loadMappings() {
          try {
            const stored = localStorage.getItem(this.mappingsKey);
            if (stored) {
              return new Map(JSON.parse(stored));
            }
            return /* @__PURE__ */ new Map();
          } catch (error) {
            console.error("Error loading mappings:", error);
            return /* @__PURE__ */ new Map();
          }
        }
        /**
         * Clear all stored data
         */
        async clearAllData() {
          localStorage.removeItem(this.settingsKey);
          localStorage.removeItem(this.mappingsKey);
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = DataManager2;
      }
    }
  });

  // src/index.js
  var import_name_parser = __toESM(require_name_parser());
  var import_variant_generator = __toESM(require_variant_generator());
  var import_learning_engine = __toESM(require_learning_engine());
  var import_candidate_finder = __toESM(require_candidate_finder());
  var import_item_processor = __toESM(require_item_processor());
  var import_menu_integration = __toESM(require_menu_integration());
  var import_zotero_db_analyzer = __toESM(require_zotero_db_analyzer());
  var import_normalizer_dialog = __toESM(require_normalizer_dialog());
  var import_batch_processor = __toESM(require_batch_processor());
  var import_data_manager = __toESM(require_data_manager());
  if (typeof console === "undefined") {
    globalThis.console = {
      log: function(...args) {
        if (typeof Zotero !== "undefined" && Zotero.debug) {
          Zotero.debug("NameNormalizer: " + args.join(" "));
        }
      },
      warn: function(...args) {
        if (typeof Zotero !== "undefined" && Zotero.debug) {
          Zotero.debug("NameNormalizer WARN: " + args.join(" "));
        }
      },
      error: function(...args) {
        if (typeof Zotero !== "undefined" && Zotero.debug) {
          Zotero.debug("NameNormalizer ERROR: " + args.join(" "));
        }
      },
      info: function(...args) {
        if (typeof Zotero !== "undefined" && Zotero.debug) {
          Zotero.debug("NameNormalizer INFO: " + args.join(" "));
        }
      },
      debug: function(...args) {
        if (typeof Zotero !== "undefined" && Zotero.debug) {
          Zotero.debug("NameNormalizer DEBUG: " + args.join(" "));
        }
      }
    };
  }
  var ZoteroNameNormalizer = {
    NameParser: import_name_parser.default,
    VariantGenerator: import_variant_generator.default,
    LearningEngine: import_learning_engine.default,
    CandidateFinder: import_candidate_finder.default,
    ItemProcessor: import_item_processor.default,
    MenuIntegration: import_menu_integration.default,
    ZoteroDBAnalyzer: import_zotero_db_analyzer.default,
    NormalizerDialog: import_normalizer_dialog.default,
    BatchProcessor: import_batch_processor.default,
    DataManager: import_data_manager.default
  };
  var index_default = ZoteroNameNormalizer;
  if (typeof window !== "undefined") {
    window.ZoteroNameNormalizer = ZoteroNameNormalizer;
  } else if (typeof globalThis !== "undefined") {
    globalThis.ZoteroNameNormalizer = ZoteroNameNormalizer;
  }
})();

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

