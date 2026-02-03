/**
 * Main integration file for Zotero Name Normalizer Extension
 * This file handles integration with the Zotero 7/8 interface
 */

if (typeof Zotero === 'undefined') {
  // In some contexts (like dialogs), Zotero might not be immediately available
  // but that's OK - the extension components will handle this appropriately
} else {
  if (!Zotero.NameNormalizer) {
    // Module class mappings
    const MODULE_CLASSES = [
      'NameParser',
      'VariantGenerator',
      'LearningEngine',
      'CandidateFinder',
      'ItemProcessor',
      'MenuIntegration',
      'ZoteroDBAnalyzer',
      'NormalizerDialog',
      'BatchProcessor',
      'DataManager'
    ];

    // Helper function to get the bundle from any scope
    function getBundle() {
      // Check all possible scopes in order of preference
      const scopes = [
        { name: 'window', getValue: () => {
          // Check window (browser) or global.window (Node.js/Jest)
          if (typeof window !== 'undefined' && window && window.ZoteroNameNormalizer) {
            return window.ZoteroNameNormalizer;
          }
          if (typeof global !== 'undefined' && global.window && global.window.ZoteroNameNormalizer) {
            return global.window.ZoteroNameNormalizer;
          }
          return null;
        }},
        { name: 'globalThis', getValue: () => (typeof globalThis !== 'undefined' ? globalThis.ZoteroNameNormalizer : null) },
        { name: 'direct', getValue: () => (typeof ZoteroNameNormalizer !== 'undefined' ? ZoteroNameNormalizer : null) },
        { name: 'zoteroNameNormalizerScope', getValue: () => (typeof zoteroNameNormalizerScope !== 'undefined' ? zoteroNameNormalizerScope.ZoteroNameNormalizer : null) },
        { name: 'Zotero.scope', getValue: () => (typeof Zotero !== 'undefined' && Zotero.scope ? Zotero.scope.ZoteroNameNormalizer : null) },
      ];

      for (const scope of scopes) {
        try {
          const value = scope.getValue();
          if (value !== null && value !== undefined) {
            return value;
          }
        } catch (e) {
          // Continue to next scope
        }
      }
      return null;
    }

    // Helper function to instantiate a module class
    function instantiateModule(moduleName, moduleClass) {
      if (typeof moduleClass === 'function') {
        try {
          return new moduleClass();
        } catch (e) {
          if (typeof Zotero !== 'undefined' && Zotero.debug) {
            Zotero.debug('Failed to instantiate ' + moduleName + ': ' + e.message);
          }
          return null;
        }
      }
      return moduleClass;
    }

    // Initialize all modules immediately
    function initializeModules() {
      const bundle = getBundle();
      const modules = {};

      if (bundle) {
        for (const moduleName of MODULE_CLASSES) {
          const key = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
          if (bundle[moduleName]) {
            modules[key] = instantiateModule(moduleName, bundle[moduleName]);
          }
        }
        if (typeof Zotero !== 'undefined' && Zotero.debug) {
          Zotero.debug('Initialized modules: ' + Object.keys(modules).filter(k => modules[k]).join(', '));
        }
      } else {
        if (typeof Zotero !== 'undefined' && Zotero.debug) {
          Zotero.debug('Bundle not found during module initialization');
        }
      }

      return modules;
    }

    // Create the Zotero.NameNormalizer object with all modules
    const initializedModules = initializeModules();

    // File-based logger for debugging (writes to /tmp/zotero-normalizer.log)
    function fileLog(msg) {
      try {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const line = timestamp + ' [zotero-ner.js] ' + msg + '\n';
        if (typeof Components !== 'undefined') {
          // Firefox/XUL context - use nsIFileOutputStream
          const file = Components.classes['@mozilla.org/file/directory_service;1']
            .getService(Components.interfaces.nsIProperties)
            .get('TmpD', Components.interfaces.nsIFile);
          file.append('zotero-normalizer.log');
          const fos = Components.classes['@mozilla.org/network/file-output-stream;1']
            .createInstance(Components.interfaces.nsIFileOutputStream);
          fos.init(file, 0x02 | 0x08 | 0x10, 0o644, 0); // WRONLY | CREATE | APPEND
          const encoder = new TextEncoder();
          const data = encoder.encode(line);
          fos.write(line, line.length);
          fos.close();
        }
        // Also log to Zotero.debug
        if (typeof Zotero !== 'undefined' && Zotero.debug) {
          Zotero.debug('NER-LOG: ' + msg);
        }
      } catch (e) {
        // Fallback to console
        if (typeof console !== 'undefined' && console.log) {
          console.log('NER-LOG: ' + msg);
        }
      }
    }

    Zotero.NameNormalizer = {
      initialized: false,
      rootURI: null,
      windowStates: new Map(),
      menuItemId: 'zotero-name-normalizer-menuitem',

      // Direct module references (already instantiated)
      nameParser: initializedModules.nameParser || null,
      variantGenerator: initializedModules.variantGenerator || null,
      learningEngine: initializedModules.learningEngine || null,
      candidateFinder: initializedModules.candidateFinder || null,
      itemProcessor: initializedModules.itemProcessor || null,
      menuIntegration: initializedModules.menuIntegration || null,
      zoteroDBAnalyzer: initializedModules.zoteroDBAnalyzer || null,
      normalizerDialog: initializedModules.normalizerDialog || null,
      batchProcessor: initializedModules.batchProcessor || null,
      dataManager: initializedModules.dataManager || null,

      hooks: {
        onStartup: function() {
          console.log('Name Normalizer: Zotero.NameNormalizer.hooks.onStartup called.');
        },
        onMainWindowLoad: function(window) {
          console.log('Name Normalizer: Zotero.NameNormalizer.hooks.onMainWindowLoad called.');
          Zotero.NameNormalizer.init({ rootURI: globalThis.registeredRootURI, window: window });
          // Set up listener for item selection requests from dialogs
          Zotero.NameNormalizer.setupDialogItemSelector();
        },
        onMainWindowUnload: function(window) {
          console.log('Name Normalizer: Zotero.NameNormalizer.hooks.onMainWindowUnload called.');
          Zotero.NameNormalizer.teardown(window);
        }
      },

      init: function(options) {
        this.log('Extension init called');
        const opts = typeof options === 'string' ? { rootURI: options } : (options || {});
        if (opts.rootURI) {
          this.rootURI = opts.rootURI;
        }

        if (!this.windowStates) {
          this.windowStates = new Map();
        }

        const targetWindow = opts.window || (typeof window !== 'undefined' ? window : null);
        if (targetWindow && !this.windowStates.has(targetWindow)) {
          this.windowStates.set(targetWindow, { uiInitialized: false });
        }

        // Always try to (re)initialize modules in case bundle wasn't available before
        const newModules = initializeModules();
        for (const key of Object.keys(newModules)) {
          if (newModules[key]) {
            this[key] = newModules[key];
          }
        }

        this.initialized = true;
        this.log('Extension initialization complete, modules: ' +
          MODULE_CLASSES.map(m => m.toLowerCase() + ':' + (this[m.toLowerCase()] ? 'yes' : 'no')).join(', '));

        if (targetWindow) {
          this.addUIElements(targetWindow);
        }
      },

      log: function(message) {
        const formatted = 'Name Normalizer: ' + message;
        if (typeof Zotero !== 'undefined' && typeof Zotero.debug === 'function') {
          Zotero.debug(formatted);
        } else {
          console.log(formatted);
        }
      },

      addUIElements: function(targetWindow) {
        const windowHref = targetWindow && targetWindow.location && targetWindow.location.href
          ? targetWindow.location.href
          : 'unknown';
        this.log('addUIElements called for window: ' + windowHref);
        const win = targetWindow;
        if (!win || !win.document) {
          this.log('No window available to add UI elements');
          return;
        }

        const doc = win.document;
        const state = this.windowStates.get(win) || {};
        const commandHandler = ((event) => {
          if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
          }
          this.showDialogForFullLibrary();
        });
        state.commandHandler = commandHandler;

        const ensureMenuItem = () => {
          this.log('Attempting to add menu item');
          try {
            const selectors = [
              '#menu_Tools',
              '#menu-tools',
              '#menu-tools-menu',
              '#zotero-pane-tools-menu',
              '#zotero-tools-menu',
            ];

            const popupSelectors = [
              '#menu_ToolsPopup',
              '#menu-tools-popup',
              '#menu-tools-menupopup',
              '#zotero-pane-tools-menupopup',
              '#zotero-tools-menupopup',
              '#tools-menupopup',
            ];

            let toolsMenu = null;
            for (const selector of selectors) {
              const candidate = doc.querySelector(selector);
              if (candidate) {
                toolsMenu = candidate;
                break;
              }
            }

            let toolsPopup = null;
            if (toolsMenu) {
              toolsPopup = toolsMenu.querySelector('menupopup, popup');
            }

            if (!toolsPopup) {
              for (const selector of popupSelectors) {
                const candidate = doc.querySelector(selector);
                if (candidate) {
                  toolsPopup = candidate;
                  break;
                }
              }
            }

            if (!toolsPopup) {
              // Last resort: heuristically look for a Tools menu popup
              const possiblePopups = Array.from(doc.querySelectorAll('menupopup'));
              toolsPopup = possiblePopups.find((popup) => {
                const parent = popup.parentElement;
                const parentId = (parent?.id || '').toLowerCase();
                const parentClasses = (parent?.className || '').toLowerCase();
                const parentLabel = (parent?.getAttribute('label') || '').toLowerCase();
                const popupId = (popup.id || '').toLowerCase();
                const popupLabel = (popup.getAttribute('label') || '').toLowerCase();

                const keywords = ['tools', 'narz', 'narzedzia'];

                const containsKeyword = (value) =>
                  value && keywords.some((keyword) => value.includes(keyword));

                return (
                  containsKeyword(parentId) ||
                  containsKeyword(parentClasses) ||
                  containsKeyword(parentLabel) ||
                  containsKeyword(popupId) ||
                  containsKeyword(popupLabel)
                );
              });
            }

            if (!toolsPopup) {
              this.log('Could not locate Tools menu popup');
              return;
            }

            this.log('Found toolsPopup: ' + (toolsPopup.id || '[no id]'));

            let menuItem = doc.getElementById(this.menuItemId);
            if (!menuItem) {
              if (typeof doc.createXULElement === 'function') {
                menuItem = doc.createXULElement('menuitem');
              } else if (typeof doc.createElementNS === 'function') {
                menuItem = doc.createElementNS(
                  'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
                  'menuitem',
                );
              } else if (typeof doc.createElement === 'function') {
                menuItem = doc.createElement('menuitem');
              } else {
                this.log('Document does not support creating menu items');
                return;
              }
              menuItem.id = this.menuItemId;
              menuItem.setAttribute('label', 'Normalize Author Names');
              menuItem.setAttribute('tooltiptext', 'Normalize author names');
              menuItem.addEventListener('command', commandHandler);
              if (toolsPopup && typeof toolsPopup.appendChild === 'function') {
                toolsPopup.appendChild(menuItem);
                state.menuElement = menuItem;
                this.log('Added Tools menu item');
              } else {
                this.log('Tools popup does not support appendChild');
              }
            } else if (!state.menuElement) {
              state.menuElement = menuItem;
              this.log('Found existing menu item');
            }
          } catch (err) {
            this.log('Error adding menu item: ' + err.message);
          }
        };

        const addElements = () => {
          ensureMenuItem();
          state.uiInitialized = true;
          this.windowStates.set(win, state);
        };

        // Add immediately
        addElements();

        // Retry after delays
        if (typeof win.setTimeout === 'function') {
          win.setTimeout(addElements, 1000);
          win.setTimeout(addElements, 3000);
          win.setTimeout(addElements, 5000);
        }

        // Retry on DOM ready
        if (doc && doc.readyState === 'loading') {
          doc.addEventListener('DOMContentLoaded', addElements);
        } else {
          addElements();
        }
      },

      removeUIElements: function(targetWindow) {
        const win = targetWindow;
        if (!win) return;

        const state = this.windowStates.get(win);
        if (!state) return;

        if (state.menuElement) {
          try {
            state.menuElement.removeEventListener('command', state.commandHandler);
            state.menuElement.removeEventListener('click', state.commandHandler);
            if (state.menuElement.parentNode) {
              state.menuElement.parentNode.removeChild(state.menuElement);
            }
          } catch (err) {
            this.log('Error removing menu item: ' + err.message);
          }
          state.menuElement = null;
        }

        state.uiInitialized = false;
        this.windowStates.set(win, state);
      },

      teardown: function(targetWindow) {
        const win = targetWindow;
        if (win) {
          this.removeUIElements(win);
          this.windowStates.delete(win);
        }

        if (this.windowStates.size === 0) {
          this.initialized = false;
        }
      },

      showDialogForFullLibrary: async function() {
        try {
          this.log('showDialogForFullLibrary called');

          // Open dialog immediately with loading state
          const dialogWindow = this.showDialog(null, { loading: true });
          this.currentDialogWindow = dialogWindow;
          this.log('Dialog opened, window reference stored');

          // Use setTimeout to let dialog initialize before starting analysis
          const self = this;
          setTimeout(async function() {
            fileLog('setTimeout callback running');
            console.log('Name Normalizer: setTimeout callback running');
            try {
              fileLog('Starting async analysis...');
              self.log('Starting async analysis...');
              console.log('Name Normalizer: Starting async analysis...');

              // Get ZoteroNameNormalizer from the main window (where Zotero is available)
              // Note: ZoteroNameNormalizer is set in main window scope via bootstrap.js
              const mainWindow = typeof Zotero !== 'undefined' ? Zotero.getMainWindow() : null;
              fileLog('mainWindow: ' + (mainWindow ? 'EXISTS' : 'NULL'));
              console.log('Name Normalizer: mainWindow=' + (mainWindow ? 'EXISTS' : 'NULL'));
              const mainWindowZoteroNameNormalizer = mainWindow ? mainWindow.ZoteroNameNormalizer : null;
              fileLog('ZoteroNameNormalizer: ' + (mainWindowZoteroNameNormalizer ? 'EXISTS' : 'NULL'));
              console.log('Name Normalizer: ZoteroNameNormalizer=' + (mainWindowZoteroNameNormalizer ? 'EXISTS' : 'NULL'));

              if (mainWindowZoteroNameNormalizer && mainWindowZoteroNameNormalizer.ZoteroDBAnalyzer) {
                const dbAnalyzer = new mainWindowZoteroNameNormalizer.ZoteroDBAnalyzer();
                fileLog('ZoteroDBAnalyzer created');
                console.log('Name Normalizer: ZoteroDBAnalyzer created');

                // Create progress callback to update dialog
                const progressCallback = (progress) => {
                  // Use Zotero.debug which outputs to stderr in test mode
                  Zotero.debug('Zotero NER: Progress=' + progress.stage + ' ' + progress.percent + '%');

                  const targetWindow = self.currentDialogWindow;
                  if (targetWindow && targetWindow.ZoteroNERController) {
                    targetWindow.ZoteroNERController.handleAnalysisProgress(progress);
                    // Also send heartbeat on progress
                    targetWindow.ZoteroNERController.receiveHeartbeat();
                  } else {
                    Zotero.debug('Zotero NER: ERROR - targetWindow=' + (!!targetWindow) + ' ZoteroNERController=' + !!(targetWindow && targetWindow.ZoteroNERController));
                  }
                };

                // Start heartbeat timer (independent of progress callbacks)
                const heartbeatTimer = setInterval(() => {
                  const targetWindow = self.currentDialogWindow;
                  if (targetWindow && targetWindow.ZoteroNERController) {
                    targetWindow.ZoteroNERController.receiveHeartbeat();
                  }
                }, 10000);  // Every 10 seconds

                // Perform analysis asynchronously
                fileLog('Calling analyzeFullLibrary...');
                console.log('Name Normalizer: Calling analyzeFullLibrary...');
                let analysisResults = null;
                try {
                  // Signal the dialog to start progress tracking
                  // This sets up the timeout interval and shows the loading UI
                  if (dialogWindow && dialogWindow.ZoteroNERController) {
                    dialogWindow.ZoteroNERController.startProgressTracking();
                    fileLog('startProgressTracking called');
                    console.log('Name Normalizer: startProgressTracking called');
                  }

                  analysisResults = await dbAnalyzer.analyzeFullLibrary(progressCallback);
                  fileLog('Analysis complete: suggestions=' + (analysisResults ? analysisResults.suggestions.length : 'NULL'));
                  console.log('Name Normalizer: Analysis complete, suggestions=' + (analysisResults ? analysisResults.suggestions.length : 'NULL'));
                  self.log('Analysis complete, updating dialog...');
                  // Clear heartbeat timer
                  clearInterval(heartbeatTimer);
                } catch (analysisError) {
                  // Clear heartbeat timer on error
                  clearInterval(heartbeatTimer);
                  throw analysisError;
                }

                // Update dialog with results
                if (dialogWindow && dialogWindow.ZoteroNERController) {
                  fileLog('Calling updateAnalysisResults...');
                  console.log('Name Normalizer: Calling updateAnalysisResults...');
                  dialogWindow.ZoteroNERController.updateAnalysisResults(analysisResults);
                  fileLog('updateAnalysisResults called');
                  console.log('Name Normalizer: updateAnalysisResults called');
                } else {
                  fileLog('ERROR: dialogWindow or ZoteroNERController not available');
                  self.log('Warning: Dialog window or controller not available for results update');
                }
              } else {
                fileLog('ZoteroDBAnalyzer not available');
                self.log('ZoteroDBAnalyzer not available');
                if (dialogWindow && dialogWindow.ZoteroNERController) {
                  dialogWindow.ZoteroNERController.showEmptyState('ZoteroDBAnalyzer not available');
                }
              }
            } catch (asyncError) {
              self.log('Error in async analysis: ' + asyncError.message);
              fileLog('Async error: ' + asyncError.message);
              if (typeof Zotero !== 'undefined' && typeof Zotero.logError === 'function') {
                Zotero.logError(asyncError);
              }
              if (dialogWindow && dialogWindow.ZoteroNERController) {
                dialogWindow.ZoteroNERController.showEmptyState('Analysis failed: ' + asyncError.message);
              }
            }
          }, 100); // Give dialog 100ms to initialize

        } catch (error) {
          fileLog('Error in showDialogForFullLibrary: ' + error.message);
          if (typeof Zotero !== 'undefined' && typeof Zotero.logError === 'function') {
            Zotero.logError(error);
          }

          // Update dialog with error state
          if (this.currentDialogWindow && this.currentDialogWindow.ZoteroNERController) {
            this.currentDialogWindow.ZoteroNERController.showEmptyState('Analysis failed: ' + error.message);
          }
        }
      },

      showDialog: function(items, analysisResults) {
        try {
          var mainWindow = Zotero.getMainWindow();

          // Clear cached stale data to force fresh analysis
          this.log('Clearing cached dialog params');
          mainWindow.ZoteroNameNormalizerDialogParams = null;
          mainWindow.ZoteroNameNormalizerAnalysisResults = null;
          mainWindow.ZoteroNameNormalizerDialogParamsJSON = null;
          mainWindow.ZoteroNameNormalizerAnalysisResultsJSON = null;

          var params = {
            items: items,
            analysisResults: analysisResults
          };

          this.log('showDialog: items=' + (items ? 'SET' : 'NULL') + ', analysisResults=' + (analysisResults ? JSON.stringify(analysisResults).substring(0, 100) : 'NULL'));

          var serializedAnalysisResults = null;
          try {
            if (analysisResults && !analysisResults.loading) {
              serializedAnalysisResults = JSON.stringify(analysisResults);
              params.analysisResultsJSON = serializedAnalysisResults;
            }
          } catch (serializationError) {
            this.log('Unable to serialize analysis results for dialog transfer: ' + serializationError.message);
          }

          if (mainWindow) {
            try {
              mainWindow.ZoteroNameNormalizerDialogParams = params;
              if (analysisResults && !analysisResults.loading) {
                mainWindow.ZoteroNameNormalizerAnalysisResults = analysisResults;
              }
              if (serializedAnalysisResults) {
                mainWindow.ZoteroNameNormalizerDialogParamsJSON = serializedAnalysisResults;
                mainWindow.ZoteroNameNormalizerAnalysisResultsJSON = serializedAnalysisResults;
              }
            } catch (paramError) {
              this.log('Unable to cache dialog params on main window: ' + paramError.message);
            }
          }

          // Open the dialog as a modeless window (not modal)
          // Modal dialogs block parent JavaScript and prevent progress updates
          const dialogWindow = mainWindow.openDialog(
            'chrome://zoteronamenormalizer/content/dialog.html',
            'zotero-name-normalizer-dialog',
            'chrome,centerscreen,resizable=yes,width=750,height=550',
            params
          );
          
          return dialogWindow;

        } catch (e) {
          if (typeof Zotero !== 'undefined') {
            if (typeof Zotero.logError === 'function') {
              Zotero.logError(e);
            }
            if (typeof Zotero.getMainWindow === 'function') {
              const mainWindow = Zotero.getMainWindow();
              if (mainWindow && typeof mainWindow.alert === 'function') {
                mainWindow.alert('Error', 'An error occurred: ' + e.message);
              }
            }
          } else {
            console.error(e);
          }
          return null;
        }
      },

      /**
       * Apply normalization suggestions (called from dialog via window.opener)
       * @param {Array} suggestions - Array of normalization suggestions
       * @param {boolean} autoConfirm - Whether to auto-confirm all
       * @param {Object} options - Additional options including progressCallback
       * @returns {Object} Results of the normalization application
       */
      applyNormalizationSuggestions: async function(suggestions, autoConfirm = false, options = {}) {
        if (!this.menuIntegration) {
          throw new Error('Menu integration not initialized');
        }
        return await this.menuIntegration.applyNormalizationSuggestions(suggestions, autoConfirm, options);
      },

      /**
       * Open an item in Zotero by its key
       * @param {string} itemKey - The item key to open
       */
      selectItem: async function(itemKey) {
        if (!itemKey) return;
        try {
          this.log('selectItem called with key: ' + itemKey);
          
          // Method 1: Use ZoteroPane (internal API, most reliable)
          if (typeof ZoteroPane !== 'undefined' && ZoteroPane.selectItem) {
            if (typeof Zotero !== 'undefined' && Zotero.Items && Zotero.Items.getByLibraryAndKeyAsync) {
              const libraryID = Zotero.Libraries.userLibraryID;
              const item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, itemKey);
              if (item && item.id) {
                this.log('Using ZoteroPane.selectItem with id: ' + item.id);
                await ZoteroPane.selectItem(item.id);
                return;
              }
            }
            // Fallback: try with key (may not work)
            this.log('Using ZoteroPane.selectItem with key: ' + itemKey);
            await ZoteroPane.selectItem(itemKey);
            return;
          }
          // Method 2: Use Zotero.NameNormalizer.selectItem (our helper)
          if (typeof Zotero !== 'undefined' && Zotero.NameNormalizer && Zotero.NameNormalizer.selectItem) {
            this.log('Using Zotero.NameNormalizer.selectItem');
            await Zotero.NameNormalizer.selectItem(itemKey);
            return;
          }
          // Method 3: Use zotero:// URI as a last resort
          if (typeof Zotero !== 'undefined' && Zotero.launchURL) {
            const url = 'zotero://select/library/items/' + itemKey;
            this.log('Using launchURL: ' + url);
            Zotero.launchURL(url);
            return;
          }
          this.log('No method available to select item');
        } catch (e) {
          this.log('Failed to select item: ' + e.message);
          console.error('Failed to select item: ' + e.message);
        }
      },

      /**
       * Set up event listener for dialog requests to select items
       * This is called from the dialog to open items in the main Zotero window
       */
      setupDialogItemSelector: function() {
        if (typeof window !== 'undefined') {
          window.addEventListener('zotero-ner-select-item', async function(event) {
            const itemKey = event.detail && event.detail.itemKey;
            if (!itemKey) return;

            try {
              if (typeof ZoteroPane !== 'undefined' && ZoteroPane.selectItems) {
                ZoteroPane.selectItems([itemKey]);
              } else if (typeof Zotero !== 'undefined' && Zotero.URI && Zotero.Items) {
                const item = await Zotero.Items.getAsync(itemKey);
                if (item) {
                  const itemPath = Zotero.URI.getItemPath(item);
                  const url = 'zotero://select/' + itemPath;
                  Zotero.launchURL(url);
                }
              }
            } catch (e) {
              console.error('Failed to select item from dialog: ' + e.message);
            }
          });
        }
      }
    };
  }
}
