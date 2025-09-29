/**
 * Main integration file for Zotero NER Author Name Normalization Extension
 * This file handles integration with the Zotero 7 interface
 */

// Check if Zotero is available
if (typeof Zotero === 'undefined') {
  // In some contexts (like dialogs), Zotero might not be immediately available
  // but that's OK - the extension components will handle this appropriately
  // Just continue without throwing an error
} else {
  // Only initialize the extension when Zotero is available (main windows)
  if (!Zotero.NER) {
    Zotero.NER = {
      initialized: false,
      rootURI: null,
      windowStates: new Map(),
      // Removed toolbarButtonId since we're no longer using toolbar buttons to avoid UI context issues
      menuItemId: 'zotero-ner-menuitem',
      // Core NER components
      nerProcessor: null,
      nameParser: null,
      learningEngine: null,
      normalizerDialog: null,
      
      /**
       * Initialize the extension
       */
      init: function(options) {
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
              this.nerProcessor = new ZoteroNER.NERProcessor();
              this.nameParser = new ZoteroNER.NameParser();
              this.learningEngine = new ZoteroNER.LearningEngine();
              this.normalizerDialog = new ZoteroNER.NormalizerDialog();
              Zotero.debug('NER Author Name Normalizer: Core components initialized');
            } else if (typeof targetWindow !== 'undefined' && targetWindow && targetWindow.ZoteroNER) {
              this.nerProcessor = new targetWindow.ZoteroNER.NERProcessor();
              this.nameParser = new targetWindow.ZoteroNER.NameParser();
              this.learningEngine = new targetWindow.ZoteroNER.LearningEngine();
              this.normalizerDialog = new targetWindow.ZoteroNER.NormalizerDialog();
              Zotero.debug('NER Author Name Normalizer: Core components initialized from window.ZoteroNER');
            } else {
              Zotero.debug('NER Author Name Normalizer: Warning - ZoteroNER not found, using fallback');
            }

            this.initialized = true;
            Zotero.debug('NER Author Name Normalizer extension initialized');
          } catch (e) {
            Zotero.logError(e);
          }
        }

        if (targetWindow) {
          this.addUIElements(targetWindow);
        }
      },

      addUIElements: function(targetWindow) {
        const win = targetWindow || (typeof window !== 'undefined' ? window : null);
        if (!win || !win.document) {
          Zotero.debug('NER Author Name Normalizer: No window available to add UI elements');
          return;
        }

        const doc = win.document;
        const state = this.windowStates.get(win) || {};
        const commandHandler = state.commandHandler || ((event) => {
          if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
          }
          this.showDialogForSelected();
        });
        state.commandHandler = commandHandler;

        const ensureStyles = () => {
          try {
            if (state.styleElement && state.styleElement.isConnected) {
              return;
            }

            const head = doc.head || doc.querySelector('head');
            if (!head) {
              return;
            }

            const style = doc.createElement('style');
            style.id = 'zotero-ner-toolbar-styles';
            style.textContent = `
              .zotero-ner-menuitem {
                /* Styles for the menu item */
              }
              
              .zotero-ner-menuitem-full-library {
                /* Styles for the full library menu item */
              }
            `;
            head.appendChild(style);
            state.styleElement = style;
          } catch (err) {
            Zotero.debug('NER Author Name Normalizer: Failed to inject styles: ' + err.message);
          }
        };

        ensureStyles();

        const createElement = (tag, fallbackTag) => {
          if (doc.createXULElement) {
            try {
              return doc.createXULElement(tag);
            } catch (err) {
              // ignore and use fallback
            }
          }
          if (typeof doc.createElement === 'function') {
            return doc.createElement(fallbackTag || tag);
          }
          return null;
        };

        const ensureMenuItem = () => {
          try {
            let toolsPopup = doc.querySelector('#menu_ToolsPopup') ||
              doc.querySelector('#menu-tools-popup') ||
              doc.querySelector('menupopup[data-l10n-id="menu-tools"]');

            if (!toolsPopup) {
              const toolsMenu = doc.querySelector('#menu_Tools') ||
                doc.querySelector('[data-l10n-id="menu-tools"]');
              if (toolsMenu) {
                toolsPopup = toolsMenu.querySelector('menupopup');
              }
            }

            if (!toolsPopup) {
              Zotero.debug('NER Author Name Normalizer: Could not locate Tools menu popup');
              return;
            }

            let menuItem = doc.getElementById(this.menuItemId);
            if (!menuItem) {
              menuItem = createElement('menuitem', 'button');
              if (!menuItem) {
                return;
              }
              menuItem.id = this.menuItemId;
              menuItem.setAttribute('label', 'Normalize Author Names');
              menuItem.setAttribute('tooltiptext', 'Normalize author names using NER');
              menuItem.setAttribute('data-l10n-id', 'zotero-ner-menuitem');
              const existingMenuClass = menuItem.getAttribute('class') || '';
              menuItem.setAttribute('class', `${existingMenuClass} zotero-ner-menuitem`.trim());
              if (menuItem.tagName && menuItem.tagName.toLowerCase() === 'button') {
                menuItem.setAttribute('type', 'menuitem');
                if (menuItem.classList) {
                  menuItem.classList.add('menuitem-iconic');
                } else {
                  menuItem.setAttribute('class', `${menuItem.getAttribute('class') || ''} menuitem-iconic`.trim());
                }
              }
              menuItem.addEventListener('command', commandHandler);
              menuItem.addEventListener('click', commandHandler);
              toolsPopup.appendChild(menuItem);
              state.menuElement = menuItem;
              Zotero.debug('NER Author Name Normalizer: Added Tools menu item');
              
              // Add a second menu item for full library analysis
              let fullLibraryMenuItem = doc.getElementById(this.menuItemId + '-full-library');
              if (!fullLibraryMenuItem) {
                fullLibraryMenuItem = createElement('menuitem', 'button');
                if (!fullLibraryMenuItem) {
                  return;
                }
                fullLibraryMenuItem.id = this.menuItemId + '-full-library';
                fullLibraryMenuItem.setAttribute('label', 'Normalize Entire Library');
                fullLibraryMenuItem.setAttribute('tooltiptext', 'Normalize all author names in the entire library');
                fullLibraryMenuItem.setAttribute('data-l10n-id', 'zotero-ner-menuitem-full-library');
                const existingMenuClass = fullLibraryMenuItem.getAttribute('class') || '';
                fullLibraryMenuItem.setAttribute('class', `${existingMenuClass} zotero-ner-menuitem-full-library`.trim());
                if (fullLibraryMenuItem.tagName && fullLibraryMenuItem.tagName.toLowerCase() === 'button') {
                  fullLibraryMenuItem.setAttribute('type', 'menuitem');
                  if (fullLibraryMenuItem.classList) {
                    fullLibraryMenuItem.classList.add('menuitem-iconic');
                  } else {
                    fullLibraryMenuItem.setAttribute('class', `${fullLibraryMenuItem.getAttribute('class') || ''} menuitem-iconic`.trim());
                  }
                }
                // Create a separate handler for full library analysis
                const fullLibraryCommandHandler = (event) => {
                  if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                  }
                  this.showDialogForFullLibrary();
                };
                fullLibraryMenuItem.addEventListener('command', fullLibraryCommandHandler);
                fullLibraryMenuItem.addEventListener('click', fullLibraryCommandHandler);
                toolsPopup.appendChild(fullLibraryMenuItem);
                state.fullLibraryMenuElement = fullLibraryMenuItem;
                Zotero.debug('NER Author Name Normalizer: Added Full Library Tools menu item');
              } else if (!state.fullLibraryMenuElement) {
                state.fullLibraryMenuElement = fullLibraryMenuItem;
              }
            } else if (!state.menuElement) {
              state.menuElement = menuItem;
            }
          } catch (err) {
            Zotero.debug('NER Author Name Normalizer: Error adding menu item: ' + err.message);
          }
        };

        // Remove toolbar button implementation entirely to avoid UI context issues
        
        const addElements = () => {
          ensureMenuItem();
          // Removed toolbar button to avoid UI context issues
          state.uiInitialized = true;
          this.windowStates.set(win, state);
        };

        addElements();
        win.setTimeout(addElements, 1000);
        win.setTimeout(addElements, 3000);
      },

      removeUIElements: function(targetWindow) {
        const win = targetWindow || (typeof window !== 'undefined' ? window : null);
        if (!win) {
          return;
        }

        const state = this.windowStates.get(win);
        if (!state) {
          return;
        }

        if (state.menuElement) {
          try {
            state.menuElement.removeEventListener('command', state.commandHandler);
            state.menuElement.removeEventListener('click', state.commandHandler);
            if (state.menuElement.parentNode) {
              state.menuElement.parentNode.removeChild(state.menuElement);
            }
          } catch (err) {
            Zotero.debug('NER Author Name Normalizer: Error removing menu item: ' + err.message);
          }
          state.menuElement = null;
        }
        
        // Remove the full library menu item if it exists
        if (state.fullLibraryMenuElement) {
          try {
            // No specific handler to remove since it's inline function
            if (state.fullLibraryMenuElement.parentNode) {
              state.fullLibraryMenuElement.parentNode.removeChild(state.fullLibraryMenuElement);
            }
          } catch (err) {
            Zotero.debug('NER Author Name Normalizer: Error removing full library menu item: ' + err.message);
          }
          state.fullLibraryMenuElement = null;
        }

        // Toolbar button removal code removed since we're no longer adding toolbar buttons
        // This eliminates UI context issues in dialog windows

        if (state.styleElement && state.styleElement.parentNode) {
          try {
            state.styleElement.parentNode.removeChild(state.styleElement);
          } catch (err) {
            Zotero.debug('NER Author Name Normalizer: Error removing styles: ' + err.message);
          }
          state.styleElement = null;
        }

        state.uiInitialized = false;
        this.windowStates.set(win, state);
      },

      teardown: function(targetWindow) {
        const win = targetWindow || (typeof window !== 'undefined' ? window : null);
        if (win) {
          this.removeUIElements(win);
          this.windowStates.delete(win);
        }

        if (this.windowStates.size === 0) {
          this.initialized = false;
        }
      },
      

      
      /**
       * Show the normalization dialog for selected items
       */
      showDialogForSelected: function() {
        try {
          var items = Zotero.getActiveZoteroPane().getSelectedItems();
          if (!items || items.length === 0) {
            // If no items are selected, show dialog to process all items
            // The dialog controller will handle fetching all items with creators
          }
          
          this.showDialog(items);
        } catch (e) {
          Zotero.logError(e);
          Zotero.getMainWindow().alert('Error', 'An error occurred: ' + e.message);
        }
      },
      
      /**
       * Show the normalization dialog
       * @param {Array} items - Zotero items to process (defaults to selected items)
       * @param {Object} analysisResults - Optional pre-computed analysis results
       */
      showDialog: function(items, analysisResults) {
        try {
          if (!this.initialized) {
            this.init();
          }
          
          if (!items && !analysisResults) {
            items = Zotero.getActiveZoteroPane().getSelectedItems();
          }
          
          // If no items are selected and no analysis results provided, pass null so the dialog can decide what to do
          if ((!items || items.length === 0) && !analysisResults) {
            items = null; // Pass null instead of showing an error
          }
          
          var mainWindow = (typeof Zotero !== 'undefined' && typeof Zotero.getMainWindow === 'function')
            ? Zotero.getMainWindow()
            : null;
          var dialogHost = null;
          if (mainWindow && typeof mainWindow.openDialog === 'function') {
            dialogHost = mainWindow;
          } else if (typeof window !== 'undefined' && typeof window.openDialog === 'function') {
            dialogHost = window;
          }

          if (!dialogHost) {
            throw new Error('Unable to locate a window capable of opening the normalization dialog');
          }

          var params = {
            items: items,
            analysisResults: analysisResults // Pass analysis results if available
          };

          dialogHost.openDialog(
            'chrome://zoteroner/content/zotero-ner-normalization-dialog.xul',
            'zotero-ner-normalization-dialog',
            'chrome,modal,resizable=yes,dialog=yes,width=800,height=600',
            params
          );
          return;

        } catch (e) {
          Zotero.logError(e);
          try {
            Zotero.getMainWindow().alert('Error', 'An error occurred: ' + e.message);
          } catch (alertErr) {
            Zotero.debug('NER Author Name Normalizer: Failed to alert main window: ' + alertErr.message);
          }
        }
      },
      
      /**
       * Perform full library analysis using database analyzer
       */
      performFullLibraryAnalysis: async function() {
        try {
          // Check if ZoteroNER is available and has the database analyzer
          if (typeof ZoteroNER !== 'undefined' && ZoteroNER.ZoteroDBAnalyzer) {
            const dbAnalyzer = new ZoteroNER.ZoteroDBAnalyzer();
            const results = await dbAnalyzer.analyzeFullLibrary();
            return results;
          } else {
            // Fallback to manual implementation
            Zotero.debug('NER Author Name Normalizer: ZoteroDBAnalyzer not available, using fallback implementation');
            
            // Get all items with creators from the current library
            const items = await this.getAllItemsWithCreators();
            
            // Process all items
            const results = await this.processItems(items, { analyzeOnly: true });
            
            return results;
          }
        } catch (error) {
          Zotero.logError(error);
          throw error;
        }
      },
      
      /**
       * Get all items with creators from the current library
       */
      getAllItemsWithCreators: async function() {
        try {
          // Get the active pane
          const pane = Zotero.getActiveZoteroPane();
          if (!pane) {
            return [];
          }
          
          // Get the current library
          const libraryID = Zotero.Libraries.userLibraryID;
          
          // Create a search for items in the library
          const search = new Zotero.Search();
          search.addCondition('libraryID', 'is', libraryID);
          
          // Execute the search
          const itemIDs = await search.search();
          
          // Get the actual items
          let items = [];
          if (itemIDs && itemIDs.length > 0) {
            items = await Zotero.Items.getAsync(itemIDs);
          }
          
          // Filter to only include items that have creators
          const itemsWithCreators = items.filter(item => {
            try {
              // Check if the item has creators
              const creators = item.getCreators ? item.getCreators() : [];
              return creators && Array.isArray(creators) && creators.length > 0;
            } catch (e) {
              // If there's an error getting creators, skip this item
              return false;
            }
          });
          
          return itemsWithCreators;
        } catch (error) {
          Zotero.logError(error);
          return [];
        }
      },
      
      /**
       * Show dialog for full library analysis using direct database connection
       */
      showDialogForFullLibrary: async function() {
        try {
          // Use direct database connection for full library analysis
          // This is more efficient than getting all items with creators
          if (typeof Zotero !== 'undefined' && typeof Zotero.DB !== 'undefined') {
            // Use the ZoteroDBAnalyzer for efficient database queries
            const dbAnalyzer = new (require('./zotero-db-analyzer.js'))();
            const analysisResults = await dbAnalyzer.analyzeFullLibrary();
            
            // Show the dialog with analysis results
            // Pass the results directly rather than items
            this.showDialog(null, analysisResults);
          } else {
            // Fallback to manual implementation if database not available
            Zotero.debug('NER Author Name Normalizer: Zotero.DB not available, using fallback implementation');
            
            // Get all items with creators (less efficient)
            const items = await this.getAllItemsWithCreators();
            
            // Show the dialog with all items
            this.showDialog(items);
          }
        } catch (error) {
          Zotero.logError(error);
          Zotero.getMainWindow().alert('Error', 'Failed to perform full library analysis: ' + error.message);
        }
      },
      
      /**
       * Get the learning engine instance
       */
      getLearningEngine: function() {
        return this.learningEngine;
      }
    };
  }
}