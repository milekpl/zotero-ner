/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Bootstrap file for Zotero NER Author Name Normalizer Extension
 * Based on Zotero 7 hybrid extension approach
 */

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

var chromeHandle;
var windowListener;
var zoteroNERScope;
var registeredRootURI;

if (typeof console === 'undefined') {
  let consoleModule;
  if (typeof ChromeUtils !== 'undefined' && typeof ChromeUtils.import === 'function') {
    consoleModule = ChromeUtils.import('resource://gre/modules/Console.jsm');
  } else if (typeof Components !== 'undefined' && Components.utils?.import) {
    consoleModule = Components.utils.import('resource://gre/modules/Console.jsm', {});
  }

  if (consoleModule?.console) {
    globalThis.console = consoleModule.console;
  }
}

function install(_data, _reason) {}

async function startup({ resourceURI, rootURI }, reason) {
  await Zotero.initializationPromise;
  Zotero.debug('NER Author Name Normalizer: Zotero initializationPromise resolved.');

  // String 'rootURI' introduced in Zotero 7
  if (!rootURI) {
    rootURI = resourceURI.spec;
  }

  if (!rootURI.endsWith('/')) {
    rootURI += '/';
  }

  registeredRootURI = rootURI;
  globalThis.registeredRootURI = registeredRootURI;

  var aomStartup = Components.classes[
    '@mozilla.org/addons/addon-manager-startup;1'
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + 'manifest.json');
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ['content', 'zoteroner', rootURI + 'content/'],
  ]);
  console.log('NER Author Name Normalizer: chromeHandle registered.');

  // Load bundled core into an isolated scope so we can share it with Zotero windows
  zoteroNERScope = {
    Zotero,
    Components,
    Services,
    ChromeUtils,
    console,
  };

  if (typeof Cu !== 'undefined') {
    zoteroNERScope.Cu = Cu;
  }
  if (typeof Ci !== 'undefined') {
    zoteroNERScope.Ci = Ci;
  }
  if (typeof Cr !== 'undefined') {
    zoteroNERScope.Cr = Cr;
  }
  if (typeof Cc !== 'undefined') {
    zoteroNERScope.Cc = Cc;
  }

  Services.scriptloader.loadSubScript(
    `${rootURI}content/scripts/zotero-ner-bundled.js`,
    zoteroNERScope,
    'UTF-8',
  );
  console.log('NER Author Name Normalizer: zotero-ner-bundled.js loaded.');

  if (zoteroNERScope.ZoteroNER) {
    globalThis.ZoteroNER = zoteroNERScope.ZoteroNER;
    console.log('NER Author Name Normalizer: ZoteroNER exposed globally.');
    // Call custom onStartup hook
    if (globalThis.ZoteroNER.hooks && globalThis.ZoteroNER.hooks.onStartup) {
      globalThis.ZoteroNER.hooks.onStartup();
    }
  }

  registerWindowListeners(reason);



}



function shutdown(data, reason) {
  // No longer using windowListener
  // Zotero calls onMainWindowUnload for each window
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }

  if (windowListener) {
    Services.wm.removeListener(windowListener);
  }

  // Ensure we clean up from all existing Zotero windows
  const enumerator = Services.wm.getEnumerator('navigator:browser');
  while (enumerator.hasMoreElements()) {
    const win = enumerator.getNext();
    if (isZoteroMainWindow(win)) {
      onMainWindowUnload({ window: win }, reason);
    }
  }
}

async function onMainWindowLoad({ window }, _reason) {
  console.log('NER Author Name Normalizer: === Entering onMainWindowLoad ===');
  console.log('NER Author Name Normalizer: onMainWindowLoad called for window: ' + (window ? window.location.href : 'unknown'));
  // Load zotero-ner.js into the window's scope
  Services.scriptloader.loadSubScript(
    `${registeredRootURI}content/scripts/zotero-ner.js`,
    window,
    'UTF-8',
  );

  if (window.Zotero?.NER?.hooks?.onMainWindowLoad) {
    console.log('NER Author Name Normalizer: Calling Zotero.NER.hooks.onMainWindowLoad.');
    window.Zotero.NER.hooks.onMainWindowLoad(window);
  }
}

async function onMainWindowUnload({ window }, _reason) {
  console.log('NER Author Name Normalizer: onMainWindowUnload called for window: ' + (window ? window.location.href : 'unknown'));
  if (window.Zotero?.NER?.hooks?.onMainWindowUnload) {
    console.log('NER Author Name Normalizer: Calling Zotero.NER.hooks.onMainWindowUnload.');
    window.Zotero.NER.hooks.onMainWindowUnload(window);
  }
  // Clean up injected properties if necessary
  delete window.ZoteroNER;
  delete window.Zotero.__zoteroNERInjected; // Assuming this was used
}

function uninstall(_data, _reason) {}

function registerWindowListeners(reason) {
  if (!windowListener) {
    windowListener = {
      onOpenWindow(xulWindow) {
        const domWindow = getDOMWindowFromXUL(xulWindow);
        if (!domWindow) {
          return;
        }

        const onLoad = () => {
          domWindow.removeEventListener('load', onLoad);
          if (isZoteroMainWindow(domWindow)) {
            onMainWindowLoad({ window: domWindow }, reason);
          }
        };

        if (domWindow.document?.readyState === 'complete') {
          onLoad();
        } else {
          domWindow.addEventListener('load', onLoad, { once: true });
        }

        domWindow.addEventListener(
          'unload',
          function() {
            if (isZoteroMainWindow(domWindow)) {
              onMainWindowUnload({ window: domWindow }, reason);
            }
          },
          { once: true },
        );
      },
      onCloseWindow(xulWindow) {
        const domWindow = getDOMWindowFromXUL(xulWindow);
        if (domWindow && isZoteroMainWindow(domWindow)) {
          onMainWindowUnload({ window: domWindow }, reason);
        }
      },
      onWindowTitleChange() {},
    };
  }

  Services.wm.addListener(windowListener);

  // Handle already open Zotero windows
  const enumerator = Services.wm.getEnumerator('navigator:browser');
  while (enumerator.hasMoreElements()) {
    const win = enumerator.getNext();
    if (!isZoteroMainWindow(win)) {
      continue;
    }

    if (win.document?.readyState === 'complete') {
      onMainWindowLoad({ window: win }, reason);
    } else {
      win.addEventListener(
        'load',
        function onLoad() {
          win.removeEventListener('load', onLoad);
          onMainWindowLoad({ window: win }, reason);
        },
        { once: true },
      );
    }
  }
}

function getDOMWindowFromXUL(xulWindow) {
  try {
    return xulWindow
      .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindow);
  } catch (err) {
    Zotero.debug('NER Author Name Normalizer: Failed to resolve DOM window - ' + err);
    return null;
  }
}

function isZoteroMainWindow(win) {
  if (!win || !win.document) {
    return false;
  }

  const windowType = win.document.documentElement.getAttribute('windowtype');
  return windowType === 'navigator:browser' || windowType === 'zotero:browser';
}