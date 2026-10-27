(function () {
  "use strict";
  var themeEl = document.getElementById("theme");
  var enabledEl = document.getElementById("enabled");
  var furiganaEl = document.getElementById("furigana");
  var furiganaModeEl = document.getElementById("furiganaMode");
  var listeningModeEl = document.getElementById("listeningMode");
  var translationEl = document.getElementById("translation");
  var groupVerbsEl = document.getElementById("groupVerbs");
  var pitchColorsEl = document.getElementById("pitchColors");
  var autoPauseEl = document.getElementById("autoPause");
  var hoverPauseEl = document.getElementById("hoverPause");
  var statusEl = document.getElementById("status");
  var vocabMeta = document.getElementById("vocabMeta");

  function setStatus(text) { statusEl.textContent = text; }

  function applyPopupTheme(theme) {
    document.body.setAttribute("data-sp-theme", theme || "classic-light");
  }

  function sendToTab(message) {
    return new Promise(function (resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs && tabs[0];
        if (!tab || !tab.id || !/^https?:/.test(tab.url || "")) { resolve(null); return; }
        try {
          chrome.tabs.sendMessage(tab.id, message, function (resp) {
            if (chrome.runtime.lastError) resolve(null); else resolve(resp);
          });
        } catch (e) { resolve(null); }
      });
    });
  }

  function refreshKnown() {
    chrome.storage.local.get(["sp_known"], function (res) {
      var knownObj = (res && res.sp_known && typeof res.sp_known === "object") ? res.sp_known : {};
      var n = Object.keys(knownObj).length;
      document.getElementById("knownMeta").textContent =
        (n ? n + (n === 1 ? " word" : " words") + " marked as known. " : "No known words yet. ") +
        "Known words fade in captions and power i+1 sentence badges.";
    });
  }

  function fillAnkiInputs(anki) {
    if (!anki) return;
    var shotChk = document.getElementById("ankiIncludeShot");
    if (shotChk) shotChk.checked = anki.includeScreenshot !== false;
    document.getElementById("ankiDeck").value = anki.deck || "";
    document.getElementById("ankiModel").value = anki.model || "";
    document.getElementById("ankiTags").value = anki.tags || "";
    document.getElementById("ankiSentField").value = anki.sentenceField || "";
    document.getElementById("ankiMeanField").value = anki.meaningField || "";
    document.getElementById("ankiReadField").value = anki.readingField || "";
    document.getElementById("ankiPicField").value = anki.pictureField || "";
    document.getElementById("ankiAudioField").value = anki.audioField || "";
  }

  function fillJimakuInputs(jm) {
    if (!jm) return;
    var el = document.getElementById("jimakuKey");
    if (el) el.value = jm.jimakuKey || "";
  }

  function refresh() {
    chrome.storage.local.get(["sp_settings", "sp_vocab", "sp_anki", "sp_jimaku", "sp_ai"], function (res) {
      var s = res.sp_settings || {};
      var theme = s.theme || "classic-light";
      if (themeEl) themeEl.value = theme;
      applyPopupTheme(theme);
      enabledEl.checked = s.enabled !== false;
      furiganaEl.checked = s.furigana !== false;
      if (furiganaModeEl) furiganaModeEl.value = s.furiganaMode || "all";
      if (listeningModeEl) listeningModeEl.value = s.listeningMode || "normal";
      translationEl.checked = s.translation !== false;
      if (groupVerbsEl) groupVerbsEl.checked = s.groupVerbs !== false;
      if (pitchColorsEl) pitchColorsEl.checked = s.pitchColors === true;
      if (autoPauseEl) autoPauseEl.checked = s.autoPause === true;
      if (hoverPauseEl) hoverPauseEl.checked = s.hoverPause === true;
      if (s.caption && typeof s.caption === "object") {
        var sc = s.caption;
        if (sc.fontSize) captionState.fontSize = sc.fontSize;
        if (sc.bg != null) captionState.bg = sc.bg;
        if (sc.known != null) captionState.known = sc.known;
        if (sc.text) captionState.text = sc.text;
        if (sc.hover) captionState.hover = sc.hover;
        if (sc.pos) captionState.pos = sc.pos;
        syncCaptionUI();
      }
      if (res.sp_anki && typeof res.sp_anki === "object") fillAnkiInputs(res.sp_anki);
      if (res.sp_jimaku && typeof res.sp_jimaku === "object") fillJimakuInputs(res.sp_jimaku);
      else if (res.sp_ai && typeof res.sp_ai === "object") fillJimakuInputs(res.sp_ai);
      var n = Array.isArray(res.sp_vocab) ? res.sp_vocab.length : 0;
      vocabMeta.textContent = n ? n + (n === 1 ? " word" : " words") + " saved. Open a video and use Transcript > Saved to review, or Export above." : "No saved words yet. Tap any Japanese word over a video to save it.";
    });
    sendToTab({ type: "SP_GET_STATE" }).then(function (resp) {
      if (!resp) { setStatus("Open any page with a video player to connect. Settings below still apply to the next video."); return; }
      var lines = resp.lines ? resp.lines + " Japanese lines loaded on this video." : "No Japanese lines loaded yet. On the video, press play, open Subs & ASR, or use Load sub.";
      if (resp.dict === "ready") lines += " Dictionary ready: " + resp.dictWords + " word forms.";
      else if (resp.dict === "unavailable") lines += " Dictionary file failed to load; built-in glossary active.";
      else if (resp.dict === "loading") lines += " Dictionary is loading...";
      setStatus(lines);
      if (resp.theme && themeEl) { themeEl.value = resp.theme; applyPopupTheme(resp.theme); }
      if (resp.furiganaMode && furiganaModeEl) furiganaModeEl.value = resp.furiganaMode;
      if (resp.listeningMode && listeningModeEl) listeningModeEl.value = resp.listeningMode;
      if (typeof resp.groupVerbs === "boolean" && groupVerbsEl) groupVerbsEl.checked = resp.groupVerbs;
      if (typeof resp.pitchColors === "boolean" && pitchColorsEl) pitchColorsEl.checked = resp.pitchColors;
      if (typeof resp.autoPause === "boolean" && autoPauseEl) autoPauseEl.checked = resp.autoPause;
      if (typeof resp.hoverPause === "boolean" && hoverPauseEl) hoverPauseEl.checked = resp.hoverPause;
      if (resp.caption && typeof resp.caption === "object") {
        var rc = resp.caption;
        if (rc.fontSize) captionState.fontSize = rc.fontSize;
        if (rc.bg != null) captionState.bg = rc.bg;
        if (rc.known != null) captionState.known = rc.known;
        if (rc.text) captionState.text = rc.text;
        if (rc.hover) captionState.hover = rc.hover;
        syncCaptionUI();
      }
    });
    sendToTab({ type: "SP_ANKI_GET" }).then(function (resp) {
      if (resp && resp.ok && resp.anki) fillAnkiInputs(resp.anki);
    });
    refreshKnown();
  }

  function push() {
    var themeVal = themeEl ? themeEl.value : "classic-light";
    applyPopupTheme(themeVal);
    var settings = {
      theme: themeVal,
      enabled: enabledEl.checked,
      furigana: furiganaEl.checked,
      furiganaMode: furiganaModeEl ? furiganaModeEl.value : "all",
      listeningMode: listeningModeEl ? listeningModeEl.value : "normal",
      translation: translationEl.checked,
      groupVerbs: groupVerbsEl ? groupVerbsEl.checked : true,
      pitchColors: pitchColorsEl ? pitchColorsEl.checked : false,
      autoPause: autoPauseEl ? autoPauseEl.checked : false,
      hoverPause: hoverPauseEl ? hoverPauseEl.checked : false,
      caption: captionState
    };
    chrome.storage.local.set({ sp_settings: settings });
    sendToTab({
      type: "SP_SET",
      theme: settings.theme,
      enabled: settings.enabled,
      furigana: settings.furigana,
      furiganaMode: settings.furiganaMode,
      listeningMode: settings.listeningMode,
      translation: settings.translation,
      groupVerbs: settings.groupVerbs,
      pitchColors: settings.pitchColors,
      autoPause: settings.autoPause,
      hoverPause: settings.hoverPause
    });
  }

  var TEXT_COLORS = ["#ffffff", "#ffe58a", "#b8f5d0", "#bfe9ff"];
  var HOVER_COLORS = [
    { name: "Orange", v: "rgba(228,74,42,.45)" },
    { name: "Sky", v: "rgba(56,189,248,.45)" },
    { name: "Green", v: "rgba(34,197,94,.45)" },
    { name: "Violet", v: "rgba(168,85,247,.45)" }
  ];
  var captionState = { fontSize: 26, bg: 72, known: 45, text: "#ffffff", hover: "rgba(228,74,42,.45)" };

  function buildSwatches(el, colors, get, set) {
    el.innerHTML = "";
    colors.forEach(function (c) {
      var v = typeof c === "string" ? c : c.v;
      var b = document.createElement("button");
      b.type = "button"; b.className = "swatch"; b.title = typeof c === "string" ? v : c.name;
      b.style.background = v;
      b.setAttribute("data-v", v);
      b.addEventListener("click", function () { set(v); syncCaptionUI(); pushCaption(); });
      el.appendChild(b);
    });
  }
  function syncCaptionUI() {
    document.getElementById("capSize").value = captionState.fontSize;
    document.getElementById("capSizeVal").textContent = captionState.fontSize + "px";
    document.getElementById("capBg").value = captionState.bg;
    document.getElementById("capBgVal").textContent = captionState.bg + "%";
    document.getElementById("capKnown").value = captionState.known;
    document.getElementById("capKnownVal").textContent = captionState.known + "%";
    Array.prototype.forEach.call(document.querySelectorAll("#capTextSw .swatch"), function (b) {
      b.classList.toggle("sel", b.getAttribute("data-v") === captionState.text);
    });
    Array.prototype.forEach.call(document.querySelectorAll("#capHoverSw .swatch"), function (b) {
      b.classList.toggle("sel", b.getAttribute("data-v") === captionState.hover);
    });
  }
  function pushCaption() {
    chrome.storage.local.get(["sp_settings"], function (res) {
      var s = (res && res.sp_settings) || {};
      s.caption = captionState;
      chrome.storage.local.set({ sp_settings: s });
    });
    sendToTab({ type: "SP_SET", caption: captionState }).then(function (resp) {
      if (!resp) setStatus("Caption style saved. Open a page with a video player to preview changes live.");
    });
  }
  buildSwatches(document.getElementById("capTextSw"), TEXT_COLORS, null, function (v) { captionState.text = v; });
  buildSwatches(document.getElementById("capHoverSw"), HOVER_COLORS, null, function (v) { captionState.hover = v; });
  [["capSize", "fontSize", "capSizeVal", "px"], ["capBg", "bg", "capBgVal", "%"], ["capKnown", "known", "capKnownVal", "%"]].forEach(function (cfg) {
    document.getElementById(cfg[0]).addEventListener("input", function (e) {
      captionState[cfg[1]] = parseInt(e.target.value, 10);
      document.getElementById(cfg[2]).textContent = e.target.value + cfg[3];
      pushCaption();
    });
  });

  [themeEl, enabledEl, furiganaEl, furiganaModeEl, listeningModeEl, translationEl, groupVerbsEl, pitchColorsEl, autoPauseEl, hoverPauseEl].forEach(function (el) {
    if (el) el.addEventListener("change", push);
  });

  document.getElementById("openPanel").addEventListener("click", function () {
    sendToTab({ type: "SP_TOGGLE_PANEL" }).then(function (resp) {
      if (!resp) setStatus("Open a page with a video player first, then try again.");
      window.close();
    });
  });

  function tabAction(type, okMsg, failMsg) {
    sendToTab({ type: type }).then(function (resp) {
      if (!resp) { setStatus("Open a page with a video player first, then try again."); return; }
      if (!resp.ok) {
        setStatus(resp.error === "no-cue" ? "No subtitle line under the playhead yet. Play the video first." : (failMsg || "That didn't work on this page."));
        return;
      }
      if (okMsg) setStatus(okMsg);
      window.close();
    });
  }

  document.getElementById("mineBtn").addEventListener("click", function () {
    tabAction("SP_MINE", "Mining this line into a flashcard.", "Couldn't mine on this page.");
  });

  document.getElementById("loadSubBtn").addEventListener("click", function () {
    tabAction("SP_LOAD_SUB", "Pick a subtitle file.", "Couldn't open the file picker on this page.");
  });

  document.getElementById("subsBtn").addEventListener("click", function () {
    tabAction("SP_SUBS", "Subtitle & ASR menu toggled on the video.", "Couldn't open the subtitle menu on this page.");
  });

  document.getElementById("exportBtn").addEventListener("click", function () {
    chrome.storage.local.get(["sp_vocab"], function (res) {
      var vocab = Array.isArray(res.sp_vocab) ? res.sp_vocab : [];
      if (!vocab.length) { setStatus("Nothing to export yet. Save a word from a video first."); return; }
      function cell(v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }
      var rows = [["Word", "Reading", "Part of speech", "Meaning", "Japanese context", "Translation"]];
      vocab.forEach(function (it) { rows.push([it.word, it.reading, it.pos, it.meaning, it.context, it.translation]); });
      var csv = "\uFEFF" + rows.map(function (r) { return r.map(cell).join(","); }).join("\r\n");
      var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      var a = document.createElement("a"); a.href = url; a.download = "japanese-vocabulary.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    });
  });

  function callAnkiDirect(payload) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({ type: "SP_ANKI_ADD", payload: payload }, function (resp) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (resp && resp.ok) resolve(resp.data);
        else reject(new Error((resp && resp.error) || "unreachable"));
      });
    });
  }

  function populateDatalist(id, items) {
    var dl = document.getElementById(id);
    if (!dl || !Array.isArray(items)) return;
    dl.innerHTML = "";
    items.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      dl.appendChild(opt);
    });
  }

  function refreshAnkiFieldsForModel(modelName) {
    if (!modelName) return;
    callAnkiDirect({ action: "modelFieldNames", version: 6, params: { modelName: modelName } })
      .then(function (res) {
        if (res && Array.isArray(res.result)) populateDatalist("ankiFieldList", res.result);
      })
      .catch(function () {});
  }

  document.getElementById("ankiModel").addEventListener("change", function () {
    refreshAnkiFieldsForModel(this.value.trim());
  });

  function readAnkiForm() {
    var shotChk = document.getElementById("ankiIncludeShot");
    return {
      includeScreenshot: shotChk ? shotChk.checked : true,
      deck: document.getElementById("ankiDeck").value.trim() || "Default",
      model: document.getElementById("ankiModel").value.trim() || "Basic",
      tags: document.getElementById("ankiTags").value.trim(),
      sentenceField: document.getElementById("ankiSentField").value.trim(),
      meaningField: document.getElementById("ankiMeanField").value.trim(),
      readingField: document.getElementById("ankiReadField").value.trim(),
      pictureField: document.getElementById("ankiPicField").value.trim(),
      audioField: document.getElementById("ankiAudioField").value.trim()
    };
  }

  var shotChkEl = document.getElementById("ankiIncludeShot");
  if (shotChkEl) {
    shotChkEl.addEventListener("change", function () {
      var anki = readAnkiForm();
      chrome.storage.local.set({ sp_anki: anki });
      sendToTab({ type: "SP_ANKI_SET", anki: anki });
    });
  }

  document.getElementById("ankiSave").addEventListener("click", function () {
    var anki = readAnkiForm();
    chrome.storage.local.set({ sp_anki: anki });
    sendToTab({ type: "SP_ANKI_SET", anki: anki }).then(function () {
      document.getElementById("ankiMeta").textContent =
        "Saved. Mined cards go to deck '" + anki.deck + "' as '" + anki.model + "' notes.";
    });
  });

  document.getElementById("ankiTest").addEventListener("click", function () {
    var meta = document.getElementById("ankiMeta");
    meta.textContent = "Pinging AnkiConnect...";
    callAnkiDirect({ action: "version", version: 6 }).then(function (v) {
      var ver = (v && typeof v === "object" && v.result != null) ? v.result : v;
      return Promise.all([
        Promise.resolve(ver),
        callAnkiDirect({ action: "deckNames", version: 6 }).catch(function () { return null; }),
        callAnkiDirect({ action: "modelNames", version: 6 }).catch(function () { return null; })
      ]);
    }).then(function (all) {
      var ver = all[0];
      var decks = (all[1] && Array.isArray(all[1].result)) ? all[1].result : [];
      var models = (all[2] && Array.isArray(all[2].result)) ? all[2].result : [];
      populateDatalist("ankiDeckList", decks);
      populateDatalist("ankiModelList", models);
      var curModel = document.getElementById("ankiModel").value.trim() || "Basic";
      refreshAnkiFieldsForModel(curModel);
      meta.textContent = "Connected: AnkiConnect v" + ver + " (" + decks.length + " decks, " + models.length + " note types loaded into dropdowns).";
    }).catch(function (e) {
      meta.textContent = "Not reachable (" + ((e && e.message) || "no response") + "). Open Anki with the AnkiConnect add-on installed.";
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".bulkBtn"), function (btn) {
    btn.addEventListener("click", function () {
      var lvl = btn.getAttribute("data-bulk");
      btn.disabled = true;
      fetch(chrome.runtime.getURL("dict/jlpt.json"))
        .then(function (r) { return r.json(); })
        .then(function (jlptData) {
          chrome.storage.local.get(["sp_known"], function (res) {
            var known = (res && res.sp_known && typeof res.sp_known === "object") ? res.sp_known : {};
            var order = ["N5", "N4", "N3", "N2", "N1"];
            var maxIdx = Math.max(0, order.indexOf(lvl || "N5"));
            var added = 0;
            Object.keys(jlptData || {}).forEach(function (w) {
              if (order.indexOf(jlptData[w]) <= maxIdx && !known[w]) { known[w] = 1; added++; }
            });
            chrome.storage.local.set({ sp_known: known }, function () {
              btn.disabled = false;
              setStatus("Marked " + added + " new words as known (" + Object.keys(known).length + " total).");
              refreshKnown();
              sendToTab({ type: "SP_KNOWN_BULK", level: lvl });
            });
          });
        })
        .catch(function () {
          btn.disabled = false;
          setStatus("Could not load JLPT word list.");
        });
    });
  });

  document.getElementById("knownSyncAnki").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    setStatus("Syncing vocabulary from AnkiConnect...");
    var deckName = document.getElementById("ankiDeck").value.trim();
    var query = deckName && deckName !== "Default" ? ('"deck:' + deckName.replace(/"/g, "") + '" -is:suspended') : "-is:suspended";
    callAnkiDirect({ action: "findNotes", version: 6, params: { query: query } })
      .then(function (res) {
        var ids = (res && Array.isArray(res.result)) ? res.result.slice(0, 5000) : [];
        if (!ids.length) throw new Error("No active notes found for query: " + query);
        return callAnkiDirect({ action: "notesInfo", version: 6, params: { notes: ids } });
      })
      .then(function (infoRes) {
        var notes = (infoRes && Array.isArray(infoRes.result)) ? infoRes.result : [];
        var priorityFields = ["Expression", "Word", "Vocab", "Vocabulary", "TargetWord", "Kanji", "Front"];
        var extracted = [];
        notes.forEach(function (n) {
          var flds = n && n.fields;
          if (!flds) return;
          var candidate = "";
          for (var i = 0; i < priorityFields.length; i++) {
            var pf = priorityFields[i];
            if (flds[pf] && flds[pf].value) { candidate = flds[pf].value; break; }
          }
          if (!candidate) {
            var keys = Object.keys(flds);
            if (keys.length && flds[keys[0]]) candidate = flds[keys[0]].value || "";
          }
          if (!candidate) return;
          var cleaned = String(candidate)
            .replace(/<[^>]*>/g, "")
            .replace(/\[[^\]]*\]/g, "")
            .replace(/&nbsp;/gi, " ")
            .trim();
          if (/^[\u3040-\u30ff\u3400-\u9fff\u3005ー]{1,16}$/.test(cleaned)) {
            extracted.push(cleaned);
          }
        });
        chrome.storage.local.get(["sp_known"], function (st) {
          var known = (st && st.sp_known && typeof st.sp_known === "object") ? st.sp_known : {};
          var added = 0;
          extracted.forEach(function (w) {
            if (!known[w]) { known[w] = 1; added++; }
          });
          chrome.storage.local.set({ sp_known: known }, function () {
            btn.disabled = false;
            setStatus("Synced from Anki: +" + added + " new known words (" + Object.keys(known).length + " total).");
            refreshKnown();
            sendToTab({ type: "SP_KNOWN_REFRESH" });
          });
        });
      })
      .catch(function (e) {
        btn.disabled = false;
        setStatus("Anki sync failed: " + ((e && e.message) || "Open Anki with AnkiConnect installed."));
      });
  });

  document.getElementById("knownClear").addEventListener("click", function () {
    chrome.storage.local.set({ sp_known: {} }, function () {
      setStatus("Known words cleared.");
      refreshKnown();
      sendToTab({ type: "SP_KNOWN_CLEAR" });
    });
  });

  var jimakuSaveBtn = document.getElementById("jimakuSave");
  if (jimakuSaveBtn) {
    jimakuSaveBtn.addEventListener("click", function () {
      var jm = { jimakuKey: document.getElementById("jimakuKey").value.trim() };
      chrome.storage.local.set({ sp_jimaku: jm });
      sendToTab({ type: "SP_JIMAKU_SET", jimakuKey: jm.jimakuKey });
      document.getElementById("jimakuMeta").textContent = jm.jimakuKey
        ? "Saved Jimaku.cc API key. Open Subs & ASR on any video to search anime subtitles."
        : "Cleared Jimaku.cc API key.";
    });
  }

  refresh();
})();
