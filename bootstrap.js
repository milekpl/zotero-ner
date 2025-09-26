/* eslint-disable no-undef */

/**
 * Simplified Bootstrap file for Zotero NER Author Name Normalizer Extension
 */

function install(data, reason) {}

function startup({ id, version, resourceURI, rootURI }, reason) {
  var windowListener = {
    onOpenWindow: function(xulWindow) {
      var domWindow = xulWindow.docShell.domWindow;
      domWindow.addEventListener("load", function() {
        domWindow.removeEventListener("load", arguments.callee, false);
        if (domWindow.location.href !== "chrome://zotero/content/zoteroPane.xhtml") {
          return;
        }
        addUIElements(domWindow);
      }, false);
    },
    onCloseWindow: function(xulWindow) {}
  };
  
  Services.wm.addListener(windowListener);
}

function addUIElements(window) {
  // Load the main NER script
  Services.scriptloader.loadSubScript('chrome://zoteroner/content/scripts/zotero-ner.js', window);
  
  // Add menu item to Tools menu
  var toolsPopup = window.document.querySelector('#menu_ToolsPopup');
  if (toolsPopup) {
    var menuItem = window.document.createXULElement('menuitem');
    menuItem.setAttribute('id', 'zotero-ner-menuitem');
    menuItem.setAttribute('label', 'Normalize Author Names');
    menuItem.addEventListener('command', function() {
      Zotero.NER.showDialogForSelected();
    });
    toolsPopup.appendChild(menuItem);
  }
  
  // Add toolbar button to items toolbar
  var itemsToolbar = window.document.querySelector('#zotero-items-toolbar');
  if (itemsToolbar) {
    var toolbarButton = window.document.createXULElement('toolbarbutton');
    toolbarButton.setAttribute('id', 'zotero-ner-toolbarbutton');
    toolbarButton.setAttribute('label', 'Normalize Names');
    toolbarButton.setAttribute('tooltiptext', 'Normalize author names using NER');
    toolbarButton.setAttribute('class', 'zotero-toolbar-button');
    toolbarButton.addEventListener('command', function() {
      Zotero.NER.showDialogForSelected();
    });
    itemsToolbar.appendChild(toolbarButton);
  }
}

function shutdown(data, reason) {}

function uninstall(data, reason) {}
