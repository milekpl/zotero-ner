/**
 * Main integration file for Zotero NER Author Name Normalization Extension
 * This file handles integration with the Zotero 7 interface
 */

if (typeof Zotero === 'undefined') {
  // In some contexts (like dialogs), Zotero might not be immediately available
  // but that's OK - the extension components will handle this appropriately
} else {
  if (!Zotero.NER) {
    Zotero.NER = {
      initialized: false,
      rootURI: null,
      windowStates: new Map(),
      menuItemId: 'zotero-ner-menuitem',
      hooks: {
        onStartup: function() {
          // This will be called from bootstrap.js startup
          console.log('NER Author Name Normalizer: Zotero.NER.hooks.onStartup called.');
        },
        onMainWindowLoad: function(window) {
          // This will be called from bootstrap.js onMainWindowLoad
          console.log('NER Author Name Normalizer: Zotero.NER.hooks.onMainWindowLoad called.');
          // Pass the rootURI from bootstrap.js directly
          Zotero.NER.init({ rootURI: globalThis.registeredRootURI, window: window });
        },
        onMainWindowUnload: function(window) {
          // This will be called from bootstrap.js onMainWindowUnload
          console.log('NER Author Name Normalizer: Zotero.NER.hooks.onMainWindowUnload called.');
          Zotero.NER.teardown(window);
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
          try {
            if (typeof ZoteroNER !== 'undefined') {
              if (!this.nerProcessor && typeof ZoteroNER.NERProcessor === 'function') {
                this.nerProcessor = new ZoteroNER.NERProcessor();
              }
              if (!this.nameParser && typeof ZoteroNER.NameParser === 'function') {
                this.nameParser = new ZoteroNER.NameParser();
              }
              if (!this.learningEngine && typeof ZoteroNER.LearningEngine === 'function') {
                this.learningEngine = new ZoteroNER.LearningEngine();
              }
              if (!this.normalizerDialog && typeof ZoteroNER.NormalizerDialog === 'function') {
                this.normalizerDialog = new ZoteroNER.NormalizerDialog();
              }
              this.log('Core components initialized');
            } else {
              this.log('ZoteroNER bundle not available during init');
            }

            this.initialized = true;
            this.log('Extension initialization complete');
          } catch (e) {
            if (typeof Zotero !== 'undefined' && typeof Zotero.logError === 'function') {
              Zotero.logError(e);
            } else {
              console.error(e);
            }
          }
        }

        if (targetWindow) {
          this.addUIElements(targetWindow);
        }
      },

      log: function(message) {
        const formatted = 'NER Author Name Normalizer: ' + message;
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
              menuItem.setAttribute('tooltiptext', 'Normalize author names using NER');
              menuItem.addEventListener('command', commandHandler);
              menuItem.addEventListener('click', commandHandler);
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
          if (typeof ZoteroNER !== 'undefined' && ZoteroNER.ZoteroDBAnalyzer) {
            const dbAnalyzer = new ZoteroNER.ZoteroDBAnalyzer();
            const analysisResults = await dbAnalyzer.analyzeFullLibrary();

            this.showDialog(null, analysisResults);
          } else {
            this.log('ZoteroDBAnalyzer not available');
            this.showDialog(null);
          }
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
            if (analysisResults) {
              serializedAnalysisResults = JSON.stringify(analysisResults);
              params.analysisResultsJSON = serializedAnalysisResults;
            }
          } catch (serializationError) {
            this.log('Unable to serialize analysis results for dialog transfer: ' + serializationError.message);
          }

          if (mainWindow) {
            try {
              mainWindow.ZoteroNERDialogParams = params;
              if (analysisResults) {
                mainWindow.ZoteroNERAnalysisResults = analysisResults;
              }
              if (serializedAnalysisResults) {
                mainWindow.ZoteroNERDialogParamsJSON = serializedAnalysisResults;
                mainWindow.ZoteroNERAnalysisResultsJSON = serializedAnalysisResults;
              }
            } catch (paramError) {
              this.log('Unable to cache dialog params on main window: ' + paramError.message);
            }
          }

          // Open the dialog slightly wider so the variant detail panel is visible
          mainWindow.openDialog(
            'chrome://zoteroner/content/dialog.html',
            'zotero-ner-normalization-dialog',
            'chrome,modal,resizable=yes,dialog=yes,width=1200,height=700',
            params
          );

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
        }
      }
    };
  }


}