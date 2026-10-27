/* Study Player Anywhere background worker.
   2.1: fetch proxy. Content scripts run in the page origin, so a direct
   fetch to a subtitle CDN is CORS-blocked even with host_permissions.
   Routing the subtitle download through the service worker uses the
   extension origin and the declared host_permissions, so cross-origin
   .vtt/.srt/.ass and YouTube timedtext files actually come back. */
chrome.runtime.onInstalled.addListener(function (details) {
  chrome.storage.local.get(["sp_settings"], function (res) {
    if (!res.sp_settings) {
      chrome.storage.local.set({
        sp_settings: { enabled: true, furigana: true, translation: true }
      });
    }
  });
  if (details.reason === "install") {
    console.log("[Study Player] Installed. Open any page with a video player, press play, then use Subs or Load sub on the video.");
  }
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === "SP_ANKI_ADD" && msg.payload) {
    // v2.6.2: AnkiConnect POSTs go through the service worker because a
    // page's Content-Security-Policy can block a content script's direct
    // fetch() to localhost (Crunchyroll does), which made Send to Anki
    // fail with "not reachable" even with Anki open and AnkiConnect up.
    // The target is hardcoded to AnkiConnect's loopback address; only the
    // JSON-RPC payload comes from the page.
    fetch("http://127.0.0.1:8765", {
      method: "POST",
      body: JSON.stringify(msg.payload)
    }).then(function (r) {
      return r.json().then(function (j) { sendResponse({ ok: true, data: j }); });
    }).catch(function (e) {
      sendResponse({ ok: false, error: String(e && e.message || e) });
    });
    return true; // async sendResponse
  }
  if (msg && msg.type === "SP_MINER_SHOT") {
    // v2.4.0 sentence miner: capture the visible tab as the card image.
    // Covered by the existing activeTab + <all_urls> host permissions;
    // no new permissions needed.
    try {
      var winId = (sender && sender.tab && typeof sender.tab.windowId === "number") ? sender.tab.windowId : null;
      chrome.tabs.captureVisibleTab(winId, { format: "jpeg", quality: 75 }, function (dataUrl) {
        if (chrome.runtime.lastError) sendResponse({ ok: false, error: String(chrome.runtime.lastError.message || chrome.runtime.lastError) });
        else sendResponse({ ok: !!dataUrl, dataUrl: dataUrl || "" });
      });
    } catch (e) { sendResponse({ ok: false, error: String(e && e.message || e) }); }
    return true; // async sendResponse
  }
  if (msg && msg.type === "SP_JIMAKU_SEARCH") {
    var query = encodeURIComponent(String(msg.query || "").trim());
    var apiKey = String(msg.apiKey || "").trim();
    var headers = apiKey ? { "Authorization": apiKey } : {};
    fetch("https://jimaku.cc/api/entries/search?anime=true&query=" + query, { headers: headers })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status + (r.status === 401 ? " (Add your free Jimaku.cc API key in Popup Settings)" : ""));
        return r.json();
      })
      .then(function (entries) {
        if (!Array.isArray(entries) || !entries.length) {
          sendResponse({ ok: true, entry: null, files: [] });
          return null;
        }
        var topEntry = entries[0];
        return fetch("https://jimaku.cc/api/entries/" + encodeURIComponent(topEntry.id) + "/files", { headers: headers })
          .then(function (r2) { return r2.ok ? r2.json() : []; })
          .then(function (files) {
            sendResponse({ ok: true, entry: topEntry, files: Array.isArray(files) ? files : [] });
          });
      })
      .catch(function (e) { sendResponse({ ok: false, error: String((e && e.message) || e) }); });
    return true;
  }
  if (!msg || msg.type !== "SP_FETCH_TEXT" || !msg.url) return false;
  var url = String(msg.url);
  // Only http(s) subtitle fetches are proxied.
  if (!/^https?:\/\//i.test(url)) { sendResponse({ ok: false, error: "bad url" }); return false; }
  fetch(url, { credentials: "include", redirect: "follow" }).then(function (r) {
    return r.text().then(function (t) {
      sendResponse({ ok: r.ok, status: r.status, text: t, finalUrl: r.url || url });
    });
  }).catch(function (e) {
    sendResponse({ ok: false, error: String(e && e.message || e) });
  });
  return true; // async sendResponse
});
