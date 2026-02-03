/**
 * Test Support Utilities
 * Mimics Zotero's test/content/support.js for extension testing
 */

// Wait for a DOM event
function waitForDOMEvent(target, event, capture) {
    var deferred = Zotero.Promise.defer();
    var func = function(ev) {
        target.removeEventListener(event, func, capture);
        deferred.resolve(ev);
    }
    target.addEventListener(event, func, capture);
    return deferred.promise;
}

// Load Zotero pane
async function loadZoteroPane() {
    // Open Zotero pane if not already open
    if (!ZoteroPane) {
        await Zotero.FileMenuCommands.openLibrary();
        await waitForDOMEvent(Zotero.win, "zotero-pane-loaded");
    }
    return Zotero.win;
}

// Open a chrome window
function loadWindow(winurl, argument) {
    var win = window.openDialog(winurl, "_blank", "chrome", argument);
    return waitForDOMEvent(win, "load").then(function() {
        return win;
    });
}

// Wait for a window to open
function waitForWindow(uri, callback) {
    var deferred = Zotero.Promise.defer();
    var loadobserver = function(ev) {
        ev.originalTarget.removeEventListener("load", loadobserver, false);
        Zotero.debug("Window opened: " + ev.target.location.href);

        if (ev.target.location.href != uri) {
            Zotero.debug("Ignoring window " + ev.target.location.href + " in waitForWindow()");
            return;
        }

        Services.ww.unregisterNotification(winobserver);
        var win = ev.target.ownerGlobal;
        // Give window code time to run on load
        win.setTimeout(function () {
            if (callback) {
                try {
                    let maybePromise = callback(win);
                    if (maybePromise && maybePromise.then) {
                        maybePromise.then(() => deferred.resolve(win)).catch(e => deferred.reject(e));
                        return;
                    }
                }
                catch (e) {
                    Zotero.logError(e);
                    win.close();
                    deferred.reject(e);
                    return;
                }
            }
            deferred.resolve(win);
        });
    };
    var winobserver = {"observe":function(subject, topic, data) {
        if(topic != "domwindowopened") return;
        subject.addEventListener("load", loadobserver, false);
    }};
    Services.ww.registerNotification(winobserver);
    return deferred.promise;
}

// Get selected items
async function getSelectedItems() {
    var items = ZoteroPane.getSelectedItems();
    return items.filter(item => item && item.isImportedAttachment);
}

// Create a test item
async function createTestItem() {
    var item = new Zotero.Item('journalArticle');
    item.setField('title', 'Test Article for Zotero Name Normalizer');
    item.setField('date', '2024-01-01');
    item.setField('abstractNote', 'Test abstract');
    await item.save();
    return item;
}

// Get or create test library
async function getTestLibrary() {
    var library = Zotero.Libraries.userLibrary;
    if (!library) {
        throw new Error("No user library available");
    }
    return library;
}

// Cleanup helper
async function cleanupItems(items) {
    for (let item of items) {
        try {
            await item.deleteTx();
        } catch (e) {
            Zotero.logError(e);
        }
    }
}

// Assert helpers
var assert = {
    ok: function(val, msg) {
        if (!val) throw new Error(msg || "Assertion failed");
    },
    equal: function(a, b, msg) {
        if (a != b) throw new Error(msg || ("Expected " + a + " == " + b));
    },
    deepEqual: function(a, b, msg) {
        if (JSON.stringify(a) != JSON.stringify(b)) {
            throw new Error(msg || ("Expected " + JSON.stringify(a) + " == " + JSON.stringify(b)));
        }
    },
    throws: function(fn, msg) {
        try {
            fn();
            throw new Error(msg || "Expected function to throw");
        } catch (e) {
            if (e.message.indexOf("Expected function to throw") === 0) throw e;
        }
    },
    isTrue: function(val, msg) {
        if (val !== true) throw new Error(msg || ("Expected true, got " + val));
    },
    isFalse: function(val, msg) {
        if (val !== false) throw new Error(msg || ("Expected false, got " + val));
    },
    isNull: function(val, msg) {
        if (val !== null) throw new Error(msg || ("Expected null, got " + val));
    },
    isNotNull: function(val, msg) {
        if (val === null || val === undefined) throw new Error(msg || ("Expected non-null, got " + val));
    },
    include: function(arr, val, msg) {
        if (!arr.includes(val)) throw new Error(msg || ("Expected " + arr + " to include " + val));
    },
    lengthOf: function(arr, len, msg) {
        if (arr.length != len) throw new Error(msg || ("Expected length " + len + ", got " + arr.length));
    }
};

// Mock a window for testing
function createMockWindow() {
    return {
        document: {
            getElementById: () => null,
            querySelector: () => null,
            createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} })
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: () => {}
    };
}

// Export helpers
if (typeof window !== 'undefined') {
    window.waitForDOMEvent = waitForDOMEvent;
    window.loadZoteroPane = loadZoteroPane;
    window.loadWindow = loadWindow;
    window.waitForWindow = waitForWindow;
    window.getSelectedItems = getSelectedItems;
    window.createTestItem = createTestItem;
    window.getTestLibrary = getTestLibrary;
    window.cleanupItems = cleanupItems;
    window.assert = assert;
    window.createMockWindow = createMockWindow;
}
