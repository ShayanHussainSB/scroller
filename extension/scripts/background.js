// Puts "ON" on the toolbar icon for tabs where Scroller is running.
chrome.action.setBadgeBackgroundColor({ color: '#e5484d' });
chrome.action.setBadgeTextColor({ color: '#ffffff' });

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (typeof msg?.running !== 'boolean' || !sender.tab) return;
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.running ? 'ON' : '' });
});

// A reload or navigation takes the page script down with it, so clear its badge too.
// The page reports again if it resumes (next chapter).
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') chrome.action.setBadgeText({ tabId, text: '' });
});
