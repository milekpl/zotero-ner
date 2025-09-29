/* eslint-disable no-undef */

/**
 * Bootstrap file for Zotero NER Author Name Normalizer Extension
 * Based on Zotero 7 hybrid extension approach
 */

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

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  await Zotero.initializationPromise;

  // String 'rootURI' introduced in Zotero 7
  if (!rootURI) {
    rootURI = resourceURI.spec;
  }

  if (!rootURI.endsWith('/')) {
    rootURI += '/';
  }

  registeredRootURI = rootURI;

  var aomStartup = Components.classes[
    '@mozilla.org/addons/addon-manager-startup;1'
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + 'manifest.json');
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ['content', 'zoteroner', rootURI + 'content/'],
  ]);

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

  if (zoteroNERScope.ZoteroNER) {
    globalThis.ZoteroNER = zoteroNERScope.ZoteroNER;
  }

  const loadIntoWindow = (domWindow) => {
    if (!domWindow || domWindow.closed) {
      return;
    }

    const windowType = domWindow.document?.documentElement?.getAttribute?.('windowtype');
    const allowedWindowTypes = ['navigator:browser', 'zotero:browser', 'zotero-main-window'];
    if (windowType && !allowedWindowTypes.includes(windowType)) {
      return;
    }

    if (zoteroNERScope?.ZoteroNER && !domWindow.ZoteroNER) {
      domWindow.ZoteroNER = zoteroNERScope.ZoteroNER;
    }

    const inject = () => {
      if (domWindow.__zoteroNERInjected) {
        if (domWindow.Zotero?.NER?.addUIElements) {
          domWindow.Zotero.NER.addUIElements();
        }
        return;
      }

      domWindow.__zoteroNERInjected = true;

      Services.scriptloader.loadSubScript(
        `${rootURI}content/scripts/zotero-ner.js`,
        domWindow,
        'UTF-8',
      );

      if (domWindow.Zotero?.NER?.init) {
        domWindow.Zotero.NER.init({ rootURI, window: domWindow });
      }
    };

    if (domWindow.document.readyState === 'complete' || domWindow.document.readyState === 'interactive') {
      inject();
    } else {
      domWindow.addEventListener(
        'load',
        function onLoad() {
          domWindow.removeEventListener('load', onLoad, false);
          inject();
        },
        false,
      );
    }
  };

  // Inject into already open windows (if any)
  const enumerator = Services.wm.getEnumerator(null);
  while (enumerator.hasMoreElements()) {
    loadIntoWindow(enumerator.getNext());
  }

  windowListener = {
    onOpenWindow(xulWindow) {
      const domWindow = xulWindow.docShell.domWindow;
      domWindow.addEventListener(
        'load',
        function onLoad() {
          domWindow.removeEventListener('load', onLoad, false);
          loadIntoWindow(domWindow);
        },
        false,
      );
    },
    onCloseWindow(xulWindow) {
      const domWindow = xulWindow.docShell.domWindow;
      if (domWindow.Zotero?.NER?.teardown) {
        try {
          domWindow.Zotero.NER.teardown(domWindow);
        } catch (e) {
          console.error('Error tearing down Zotero NER UI', e);
        }
      }
      delete domWindow.__zoteroNERInjected;
    },
  };

  Services.wm.addListener(windowListener);
}

async function onMainWindowLoad({ window }, reason) {
  // Initialize when main window loads
  if (Zotero.NER && Zotero.NER.init) {
    Zotero.NER.init();
  }
}

function onMainWindowUnload({ window }, reason) {}

function shutdown(data, reason) {
  if (windowListener) {
    Services.wm.removeListener(windowListener);
    windowListener = null;
  }

  const enumerator = Services.wm.getEnumerator(null);
  while (enumerator.hasMoreElements()) {
    const domWindow = enumerator.getNext();
    if (domWindow && domWindow.Zotero?.NER?.teardown) {
      try {
        domWindow.Zotero.NER.teardown(domWindow);
      } catch (e) {
        console.error('Error tearing down Zotero NER UI on shutdown', e);
      }
    }
    delete domWindow.__zoteroNERInjected;
  }

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

function uninstall(data, reason) {}
