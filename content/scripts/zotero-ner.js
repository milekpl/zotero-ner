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
        { name: 'window', getValue: () => (typeof window !== 'undefined' ? window.ZoteroNameNormalizer : null) },
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

        if (!this.initialized) {
          // Re-initialize modules in case bundle wasn't available before
          const newModules = initializeModules();
          for (const key of Object.keys(newModules)) {
            if (newModules[key] && !this[key]) {
              this[key] = newModules[key];
            }
          }

          this.initialized = true;
          this.log('Extension initialization complete, modules: ' +
            MODULE_CLASSES.map(m => m.toLowerCase() + ':' + (this[m.toLowerCase()] ? 'yes' : 'no')).join(', '));
        }

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
            try {
              self.log('Starting async analysis...');

              // Get ZoteroNameNormalizer from the main window (where Zotero is available)
              // Note: ZoteroNameNormalizer is set in main window scope via bootstrap.js
              const mainWindowZoteroNameNormalizer = window.ZoteroNameNormalizer;
              self.log('window.ZoteroNameNormalizer: ' + (mainWindowZoteroNameNormalizer ? 'defined' : 'undefined'));

              if (mainWindowZoteroNameNormalizer && mainWindowZoteroNameNormalizer.ZoteroDBAnalyzer) {
                const dbAnalyzer = new mainWindowZoteroNameNormalizer.ZoteroDBAnalyzer();

                // Create progress callback to update dialog
                const progressCallback = (progress) => {
                  self.log('Progress callback: ' + JSON.stringify(progress));
                  if (dialogWindow && dialogWindow.ZoteroNERController) {
                    dialogWindow.ZoteroNERController.handleAnalysisProgress(progress);
                  } else {
                    self.log('Warning: Dialog window or controller not available for progress update');
                  }
                };

                // Perform analysis asynchronously
                self.log('Calling analyzeFullLibrary...');
                const analysisResults = await dbAnalyzer.analyzeFullLibrary(progressCallback);
                self.log('Analysis complete, updating dialog...');

                // Update dialog with results
                if (dialogWindow && dialogWindow.ZoteroNERController) {
                  dialogWindow.ZoteroNERController.updateAnalysisResults(analysisResults);
                } else {
                  self.log('Warning: Dialog window or controller not available for results update');
                }
              } else {
                self.log('ZoteroDBAnalyzer not available');
                if (dialogWindow && dialogWindow.ZoteroNERController) {
                  dialogWindow.ZoteroNERController.showEmptyState('ZoteroDBAnalyzer not available');
                }
              }
            } catch (asyncError) {
              self.log('Error in async analysis: ' + asyncError.message);
              if (typeof Zotero !== 'undefined' && typeof Zotero.logError === 'function') {
                Zotero.logError(asyncError);
              }
              if (dialogWindow && dialogWindow.ZoteroNERController) {
                dialogWindow.ZoteroNERController.showEmptyState('Analysis failed: ' + asyncError.message);
              }
            }
          }, 100); // Give dialog 100ms to initialize
          
        } catch (error) {
          if (typeof Zotero !== 'undefined') {
            if (typeof Zotero.logError === 'function') {
              Zotero.logError(error);
            }
            if (typeof Zotero.getMainWindow === 'function') {
              const mainWindow = Zotero.getMainWindow();
              if (mainWindow && typeof mainWindow.alert === 'function') {
                mainWindow.alert('Error', 'Failed to perform full library analysis: ' + error.message);
              }
            }
          } else {
            console.error(error);
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
          var params = {
            items: items,
            analysisResults: analysisResults
          };

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

          // Open the dialog slightly wider so the variant detail panel is visible
          // Note: Using 'chrome,centerscreen' instead of 'chrome,modal' to allow async updates
          const dialogWindow = mainWindow.openDialog(
            'chrome://zoteronamenormalizer/content/dialog.html',
            'zotero-name-normalizer-dialog',
            'chrome,centerscreen,resizable=yes,dialog=yes,width=1200,height=700',
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
      }
    };
  }
  
  // Backward compatibility alias
  Zotero.NER = Zotero.NameNormalizer;
}
