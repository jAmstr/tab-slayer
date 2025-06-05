const closingSoonList = document.getElementById("closingSoonList");
const recentlyClosedList = document.getElementById("recentlyClosedList");
const totalManagedTabsLabel = document.getElementById("totalManagedTabsLabel");

document.addEventListener("DOMContentLoaded", () => {
  const timeoutSlider = document.getElementById("timeoutSlider");
  const timeoutLabel = document.getElementById("timeoutLabel");
  if (timeoutSlider && timeoutLabel) {
    chrome.storage.local.get(["timeoutDays"], (data) => {
      timeoutSlider.value = data.timeoutDays || 2;
      timeoutLabel.textContent = timeoutSlider.value;
    });

    timeoutSlider.addEventListener("input", () => {
      timeoutLabel.textContent = timeoutSlider.value;
      chrome.storage.local.set({
        timeoutDays: parseInt(timeoutSlider.value, 10),
      });
    });
  }

  if (totalManagedTabsLabel) {
    chrome.storage.local.get(["tabCache"], (data) => {
      totalManagedTabsLabel.textContent = `${
        Object.keys(data.tabCache).length || 0
      }`;
    });
  }

  populateLists();
});

function populateLists() {
  chrome.storage.local.get(["tabCache", "closedTabs"], (data) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    // Closing soon
    chrome.tabs.query({}, (tabs) => {
      closingSoonList.innerHTML = "";
      tabs.forEach((tab) => {
        const createdTime = data.tabCache?.[tab.id];
        if (
          createdTime &&
          now - createdTime > 2 * oneDay - oneDay &&
          !tab.pinned
        ) {
          const li = document.createElement("li");
          li.textContent = tab.title || tab.url;
          closingSoonList.appendChild(li);
        }
      });
    });

    // Recently closed
    recentlyClosedList.innerHTML = "";
    (data.closedTabs || []).forEach((entry) => {
      if (now - entry.time <= sevenDays) {
        const li = document.createElement("li");
        li.textContent = entry.url
          ? new URL(entry.url).hostname
          : "Unknown URL";
        recentlyClosedList.appendChild(li);
      }
    });
  });
}
