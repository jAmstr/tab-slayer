const DEFAULT_TIMEOUT_DAYS = 2;
const CHECK_INTERVAL_MS = 5 * 1000; // 1 hour

let tabCache = {};
let closedTabs = [];
let urls = [];

chrome.storage.local.get(["tabCache", "closedTabs"], (data) => {
  tabCache = data.tabCache || {};
  closedTabs = data.closedTabs || [];
});

// Track tab creation
chrome.tabs.onCreated.addListener((tab) => {
  tabCache[tab.id] = Date.now();
  chrome.storage.local.set({ tabCache });
});

// Track tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tabCache[tabId]) {
    tabCache[tabId] = Date.now(); // Update creation time on reload
    chrome.storage.local.set({ tabCache });
  }
});

// track tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (tabCache[activeInfo.tabId]) {
    tabCache[activeInfo.tabId] = Date.now(); // Update creation time on activation
    chrome.storage.local.set({ tabCache });
  }
});

// Clean up cache on close
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabCache[tabId]) {
    chrome.tabs.get(tabId, (tab) => {
      const url = tab ? tab.url : "";

      closedTabs.push({ tabId, time: Date.now(), url });

      if (closedTabs.length > 1000) {
        closedTabs.shift(); // cap log size
      }

      chrome.storage.local.set({ tabCache, closedTabs });
    });
  }
  delete tabCache[tabId];
});

// Periodic cleanup
function cleanOldTabs() {
  chrome.storage.local.get(["timeoutDays"], (data) => {
    const timeoutDays = data.timeoutDays || DEFAULT_TIMEOUT_DAYS;
    const cutoff = Date.now() - timeoutDays * 24 * 60 * 60 * 1000;

    chrome.tabs.query({ url: "*://*/*", active: false }, (tabs) => {
      tabs
        .filter(({ id }) => tabCache[id])
        .forEach((tab) => {
          const createdTime = tabCache[tab.id];

          if (!tab.pinned && createdTime && createdTime < cutoff) {
            chrome.tabs.remove(tab.id);
            closedTabs.push({ tabId: tab.id, time: Date.now(), url: tab.url });

            delete tabCache[tab.id];
          }
        });
      chrome.storage.local.set({ tabCache, closedTabs });
    });
  });
}

setInterval(cleanOldTabs, CHECK_INTERVAL_MS);
