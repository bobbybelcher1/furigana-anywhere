(function () {
  "use strict";
  if (window.__spBooted) return;
  window.__spBooted = true;

  var GLOSSARY = {
    "\u79c1":"I; me (neutral)","\u4ffa":"I; me (casual, masculine)","\u50d5":"I; me (usually masculine)","\u541b":"you; someone familiar","\u3042\u306a\u305f":"you",
    "\u4eca\u65e5":"today","\u660e\u65e5":"tomorrow","\u6628\u65e5":"yesterday","\u4eca":"now","\u6642\u9593":"time; hour","\u4eba":"person","\u4f55":"what","\u8ab0":"who",
    "\u5927\u4e08\u592b":"all right; okay; safe","\u672c\u5f53":"truth; really","\u597d\u304d":"liked; fond of","\u5acc\u3044":"disliked; to dislike","\u4e00\u7dd2":"together",
    "\u884c\u304f":"to go","\u6765\u308b":"to come","\u5e30\u308b":"to return; go home","\u898b\u308b":"to see; watch","\u805e\u304f":"to hear; ask","\u8a00\u3046":"to say","\u8a71\u3059":"to speak; talk",
    "\u601d\u3046":"to think; feel","\u77e5\u308b":"to know; find out","\u5206\u304b\u308b":"to understand","\u98df\u3079\u308b":"to eat","\u98f2\u3080":"to drink","\u3059\u308b":"to do","\u3042\u308b":"to exist (inanimate); to have",
    "\u3044\u308b":"to exist (animate); to be","\u3067\u304d\u308b":"can do; be able to","\u5f85\u3064":"to wait","\u9811\u5f35\u308b":"to do one's best; persist","\u3054\u3081\u3093":"sorry","\u3042\u308a\u304c\u3068\u3046":"thank you",
    "\u304a\u9858\u3044":"request; please","\u5148\u751f":"teacher; instructor","\u5b66\u6821":"school","\u5bb6":"house; home","\u53cb\u9054":"friend","\u6c17\u6301\u3061":"feeling","\u5fc3":"heart; mind","\u5922":"dream",
    "\u3059\u3054\u3044":"amazing; impressive","\u53ef\u611b\u3044":"cute","\u304b\u308f\u3044\u3044":"cute","\u5f37\u3044":"strong","\u5f31\u3044":"weak","\u6016\u3044":"scary; afraid","\u697d\u3057\u3044":"fun; enjoyable",
    "\u5b09\u3057\u3044":"happy; glad","\u60b2\u3057\u3044":"sad","\u65e9\u3044":"early; fast","\u9045\u3044":"late; slow","\u826f\u3044":"good","\u60aa\u3044":"bad","\u540d\u524d":"name","\u7d04\u675f":"promise",
    "\u79d8\u5bc6":"secret","\u5834\u6240":"place","\u4e16\u754c":"world","\u529b":"power; strength","\u554f\u984c":"problem; question","\u7406\u7531":"reason","\u5927\u5207":"important; precious","\u5fc5\u8981":"necessary; needed"
  };

  var state = {
    enabled: true, furigana: true, furiganaMode: "all", translation: true, loop: false,
    autoPause: false, autoPausedForIndex: -1, subOffset: 0,
    theme: "classic-light", listeningMode: "normal",
    groupVerbs: true, pitchColors: false, hoverPause: false, pausedByHover: false,
    i1Only: false, asrActive: false,
    tokenizer: null, tokenizerStatus: "idle", tokenCache: new Map(),
    jpCues: [], enCues: [], tracksSeen: [],
    ytPot: "", ytTimedTextSample: "",
    activeIndex: -1, currentVideoId: "", selectedWord: null, vocab: [],
    panelOpen: false, panelTab: "transcript", controlsCollapsed: false,
    discovered: [], discoveredSet: {}, genericLoaded: false, videoCount: 0,
    diag: [], autoTried: {}, autoLoadedFrom: "", nativeInfo: [],
    dict: null, dictStatus: "idle", lastTok: null,
    known: {},
    jimakuKey: "",
    anki: { deck: "Default", model: "Basic", tags: "furigana-anywhere", sentenceField: "", readingField: "", meaningField: "", pictureField: "", audioField: "", includeScreenshot: true },
    caption: { fontSize: 26, bg: 72, known: 45, text: "#ffffff", hover: "rgba(228,74,42,.45)", pos: null }
  };
  function diagLog(msg) {
    try {
      var line = new Date().toLocaleTimeString() + " " + String(msg || "");
      state.diag.unshift(line);
      if (state.diag.length > 30) state.diag.length = 30;
      if (subsMenuEl && !subsMenuEl.hidden) renderSubsMenu();
    } catch (e) {}
  }

  function kataToHira(t) { return String(t || "").replace(/[\u30a1-\u30f6]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }); }
  /* Hepburn romaji, ASCII only on purpose: no macrons, so "ou" stays "ou"
     and nothing can turn into mojibake on fragile screens. */
  var ROMAJI_TABLE = {
    "あ":"a","い":"i","う":"u","え":"e","お":"o",
    "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
    "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
    "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
    "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
    "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
    "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
    "や":"ya","ゆ":"yu","よ":"yo",
    "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
    "わ":"wa","ゐ":"wi","ゑ":"we","を":"wo","ん":"n",
    "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
    "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
    "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do",
    "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
    "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
    "うぁ":"wha","うぃ":"wi","うぇ":"we","うぉ":"who",
    "きゃ":"kya","きゅ":"kyu","きょ":"kyo",
    "しゃ":"sha","しゅ":"shu","しょ":"sho",
    "ちゃ":"cha","ちゅ":"chu","ちょ":"cho",
    "にゃ":"nya","にゅ":"nyu","にょ":"nyo",
    "ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo",
    "みゃ":"mya","みゅ":"myu","みょ":"myo",
    "りゃ":"rya","りゅ":"ryu","りょ":"ryo",
    "ぎゃ":"gya","ぎゅ":"gyu","ぎょ":"gyo",
    "じゃ":"ja","じゅ":"ju","じょ":"jo",
    "びゃ":"bya","びゅ":"byu","びょ":"byo",
    "ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo",
    "ぢゃ":"ja","ぢゅ":"ju","ぢょ":"jo",
    "ふぁ":"fa","ふぃ":"fi","ふぇ":"fe","ふぉ":"fo",
    "てぃ":"ti","でぃ":"di","とぅ":"tu","どぅ":"du",
    "ゔ":"vu","ゔぁ":"va","ゔぃ":"vi","ゔぇ":"ve","ゔぉ":"vo",
    "ぁ":"a","ぃ":"i","ぅ":"u","ぇ":"e","ぉ":"o",
    "ゃ":"ya","ゅ":"yu","ょ":"yo"
  };
  function hiraToRomaji(t) {
    t = String(t || "");
    if (!t) return "";
    var out = "", i = 0;
    while (i < t.length) {
      if (t[i] === "っ") { // sokuon: っか -> kka, っち -> tchi, っちゃ -> tcha, っし -> sshi
        var nxt = ROMAJI_TABLE[t.slice(i + 1, i + 3)] || ROMAJI_TABLE[t[i + 1]] || "";
        if (nxt) out += /^ch/.test(nxt) ? "t" : nxt[0];
        i++;
        continue;
      }
      var r = ROMAJI_TABLE[t.slice(i, i + 2)];
      if (r !== undefined) { out += r; i += 2; continue; }
      r = ROMAJI_TABLE[t[i]];
      if (r !== undefined) {
        if (t[i] === "ん" && /[あいうえおやゆよ]/.test(t[i + 1] || "")) out += "n'"; // ん before vowel/y
        else out += r;
        i++;
        continue;
      }
      if (t[i] === "ー") { var m = out.match(/[aeiou]$/); if (m) out += m[0]; i++; continue; } // long vowel mark
      out += t[i]; // unknown char: pass through
      i++;
    }
    return out;
  }
  function isKana(c) { return /[\u3040-\u30ff\u30fc]/.test(c || ""); }
  function hasKanji(t) { return /[\u3400-\u9fff\u3005]/.test(t || ""); }
  function cleanText(t) {
    return String(t || "").replace(/\{\\[^}]+\}/g, "").replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s*\n\s*/g, " ").trim();
  }
  function fmt(sec) {
    if (!isFinite(sec)) sec = 0;
    var s = Math.max(0, Math.floor(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  }
  function parseTimestamp(t) {
    t = String(t || "").trim().replace(",", ".");
    var m = t.match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d+))?/);
    if (!m) return 0;
    return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0) + Number("0." + (m[4] || "0"));
  }
  function normalizeCueList(cues) {
    if (!cues || !cues.length) return [];
    var sorted = cues.slice().sort(function (a, b) { return (a.start - b.start) || (a.end - b.end); });
    var out = [];
    for (var i = 0; i < sorted.length; i++) {
      var c = sorted[i];
      if (!c || !c.text) continue;
      var prev = out[out.length - 1];
      if (prev && Math.abs(prev.start - c.start) < 0.08 && Math.abs(prev.end - c.end) < 0.25) {
        if (prev.text === c.text || prev.text.indexOf(c.text) !== -1) continue;
        if (c.text.indexOf(prev.text) !== -1) { prev.text = c.text; continue; }
        prev.text = prev.text + " / " + c.text;
        prev.end = Math.max(prev.end, c.end);
        continue;
      }
      out.push({ start: c.start, end: c.end, text: c.text });
    }
    return out;
  }
  function parseSubtitles(text) {
    text = String(text || "").replace(/\uFEFF/g, "");
    if (/^\s*<\?xml/.test(text.slice(0, 80)) && /<transcript[\s>]/.test(text.slice(0, 900))) {
      var xmlCues = [];
      var reX = /<text[^>]*\bstart="([\d.]+)"[^>]*?(?:\bdur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g, mx;
      while ((mx = reX.exec(text))) {
        var sx = Number(mx[1] || 0), dx = Number(mx[2] || 2.5);
        var tx = cleanText(mx[3]);
        if (tx) xmlCues.push({ start: sx, end: sx + dx, text: tx });
      }
      if (xmlCues.length) return normalizeCueList(xmlCues);
    }
    if (/^\[Script Info\]/m.test(text) || /^Dialogue:/m.test(text)) {
      var ass = [];
      text.split(/\r?\n/).forEach(function (line) {
        if (line.indexOf("Dialogue:") !== 0) return;
        var parts = line.slice(9).split(",");
        if (parts.length < 10) return;
        var raw = parts.slice(9).join(",");
        // Skip ASS vector drawing commands (\p1, \p2, etc.) used in background signs
        if (/\{[^}]*\\p[1-9]\b/i.test(raw)) return;
        var txt = cleanText(raw.replace(/\\N/gi, " ").replace(/\{[^}]*\}/g, ""));
        if (txt) ass.push({ start: parseTimestamp(parts[1]), end: parseTimestamp(parts[2]), text: txt });
      });
      return normalizeCueList(ass);
    }
    var blocks = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n\n+/);
    var cues = [];
    blocks.forEach(function (b) {
      var lines = b.split("\n").filter(function (x) { return x.trim() !== ""; });
      var ti = lines.findIndex(function (x) { return x.indexOf("-->") !== -1; });
      if (ti === -1) return;
      var seg = lines[ti].split("-->");
      var body = cleanText(lines.slice(ti + 1).join(" "));
      if (body) cues.push({ start: parseTimestamp(seg[0]), end: parseTimestamp(seg[1]), text: body });
    });
    return normalizeCueList(cues);
  }
  function isJapaneseText(t) {
    var s2 = String(t || ""); if (!s2) return false;
    var jp = (s2.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
    return jp >= 2 && jp / Math.max(1, s2.replace(/\s/g, "").length) > 0.12;
  }
  function sampleCuesText(cues) {
    if (!cues || !cues.length) return "";
    var step = Math.max(1, Math.floor(cues.length / 40));
    var out = [];
    for (var i = 0; i < cues.length && out.length < 40; i += step) {
      if (cues[i] && cues[i].text) out.push(cues[i].text);
    }
    return out.join(" ");
  }
  function guessLang(hint, text) {
    var cleanT = String(text || "").replace(/\s/g, "");
    var h = String(hint || "").toLowerCase();
    // 1. Check explicit URL query parameters first (tlang overrides lang on YouTube).
    var tlangM = h.match(/[?&]tlang=([a-z-]+)/);
    if (tlangM && tlangM[1]) {
      if (tlangM[1].indexOf("ja") === 0 || tlangM[1].indexOf("jp") === 0) return "ja";
      if (tlangM[1].indexOf("en") === 0) return "en";
    }
    var langM = h.match(/[?&](?:lang|language|sub_lang|hl_lang)=([a-z-]+)/);
    if (langM && langM[1]) {
      if (langM[1].indexOf("ja") === 0 || langM[1].indexOf("jp") === 0) return "ja";
      if (langM[1].indexOf("en") === 0) return "en";
    }
    // 2. When we have actual subtitle text, character inspection is ground truth
    //    and avoids false matches on random base64/hex tokens in URLs.
    if (cleanT.length >= 6) {
      return isJapaneseText(text) ? "ja" : "en";
    }
    // 3. Fallback to path/label inspection (with query string stripped so random
    //    tokens like &hl=en or &pot=...1ja2... never false-match).
    var pathOnly = h.split("?")[0];
    if (/(^|[^a-z0-9])(ja|jp|jpn|japanese)([^a-z0-9]|$)/.test(pathOnly)) return "ja";
    if (/(^|[^a-z0-9])(en|eng|english)([^a-z0-9]|$)/.test(pathOnly)) return "en";
    return isJapaneseText(text) ? "ja" : "en";
  }
  function parseJson3Text(txt) {
    if (!txt || String(txt).trim().charAt(0) !== "{") return [];
    var data;
    try { data = JSON.parse(String(txt).trim()); } catch (e) { return []; }
    if (!data || !Array.isArray(data.events)) return [];
    var raw = [];
    data.events.forEach(function (ev) {
      if (!ev || !ev.segs) return;
      var text = cleanText(ev.segs.map(function (s) { return s.utf8 || ""; }).join(""));
      if (!text) return;
      var start = (ev.tStartMs || 0) / 1000;
      var end = start + (ev.dDurationMs || 2000) / 1000;
      raw.push({ start: start, end: end, text: text });
    });
    var norm = normalizeCueList(raw);
    for (var i = 0; i < norm.length - 1; i++) {
      if (norm[i + 1].start > norm[i].start + 0.08 && norm[i].end > norm[i + 1].start) {
        norm[i].end = norm[i + 1].start;
      }
    }
    return norm;
  }
  function ingestCues(cues, lang, label) {
    if (!cues || !cues.length) return false;
    clearLoadingWatchdog();
    if (lang === "en") {
      if (state.enCues.length > cues.length && cues.length < 5) return false;
      state.enCues = cues;
      if (state.jpCues.length) {
        clearCaptionWatchdog();
        setStatus("ready", "Japanese subtitles - " + state.jpCues.length + " lines - EN translation on");
      } else {
        setStatus("", "English track loaded (" + cues.length + " lines) - waiting for Japanese track");
      }
    } else {
      if (state.jpCues.length > cues.length && cues.length < 5) return false;
      state.jpCues = cues;
      state.genericLoaded = true;
      state.tokenCache.clear();
      clearCaptionWatchdog();
      setStatus("ready", label + " - " + cues.length + " lines" + (state.enCues.length ? " - EN translation on" : ""));
    }
    state.activeIndex = -1;
    renderTranscript(); renderVocab(); updateForTime(true); hideNativeTracks();
    return true;
  }
  function resolveUrl(rel, base) {
    try { return new URL(rel, base || location.href).href; } catch (e) { return rel; }
  }
  function fetchText(url) {
    // Direct fetch first (fast, same-origin), then the background proxy
    // which bypasses CORS for cross-origin subtitle CDNs (2.1 fix).
    diagLog("fetch " + String(url).slice(0, 110));
    return fetch(url, { credentials: "include" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.text().then(function (t) {
        if (t && t.trim().length > 4) return t;
        throw new Error("empty direct");
      });
    }).catch(function () {
      return new Promise(function (resolve, reject) {
        try {
          chrome.runtime.sendMessage({ type: "SP_FETCH_TEXT", url: url }, function (resp) {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            if (resp && typeof resp.text === "string" && resp.text.trim().length > 4) { diagLog("proxy ok " + resp.text.length + " chars"); resolve(resp.text); }
            else reject(new Error((resp && resp.error) || "proxy empty"));
          });
        } catch (e) { reject(e); }
      });
    });
  }
  function isHlsText(t) { return /^\s*#EXTM3U/.test(String(t || "").slice(0, 200)); }
  function parseHlsSubtitles(text, baseUrl) {
    var subs = [], segs = [], lines = String(text || "").split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (ln.indexOf("#EXT-X-MEDIA:") === 0 && /TYPE=SUBTITLES/i.test(ln)) {
        var uriM = ln.match(/URI="([^"]+)"/), langM = ln.match(/LANGUAGE="([^"]+)"/), nameM = ln.match(/NAME="([^"]+)"/);
        if (uriM) subs.push({ url: resolveUrl(uriM[1], baseUrl), lang: (langM && langM[1]) || "", name: (nameM && nameM[1]) || "" });
      } else if (ln && ln.charAt(0) !== "#") {
        segs.push(resolveUrl(ln, baseUrl));
      }
    }
    return { renditions: subs, segments: segs };
  }
  function loadHlsPlaylist(url, text, depth) {
    var parsed = parseHlsSubtitles(text, url);
    diagLog("HLS " + parsed.renditions.length + " renditions, " + parsed.segments.length + " segments");
    if (parsed.renditions.length) {
      parsed.renditions.forEach(function (r) { addDiscovered(r.url); });
      var jp = parsed.renditions.filter(function (r) { return guessLang(r.lang + " " + r.name + " " + r.url, "") === "ja"; })[0] || parsed.renditions[0];
      if (jp && !state.jpCues.length) return loadSubtitleUrl(jp.url);
      return Promise.resolve(false);
    }
    if (parsed.segments.length && (depth || 0) < 2) {
      // Media playlist of WebVTT segments: fetch + merge (cap 400).
      var chain = Promise.resolve([]);
      parsed.segments.slice(0, 400).forEach(function (segUrl) {
        chain = chain.then(function (acc) {
          return fetchText(segUrl).then(function (t) { return acc.concat(parseSubtitles(t)); }).catch(function () { return acc; });
        });
      });
      return chain.then(function (all) {
        if (!all.length) { diagLog("HLS segments had no cues"); return false; }
        all.sort(function (a, b) { return a.start - b.start; });
        var lang = guessLang(url, sampleCuesText(all));
        return ingestCues(all, lang, (lang === "ja" ? "Japanese" : "English") + " subtitles (HLS) - " + all.length + " lines");
      });
    }
    return Promise.resolve(false);
  }
  function harvestTimedTextUrl(url) {
    if (!url || !/\/api\/timedtext/i.test(url)) return;
    var m = String(url).match(/[?&]pot=([^&#]+)/);
    if (m && m[1]) state.ytPot = decodeURIComponent(m[1]);
    state.ytTimedTextSample = url;
  }
  function loadSubtitleText(text, hint) {
    harvestTimedTextUrl(hint);
    if (isHlsText(text)) { loadHlsPlaylist(hint || location.href, text, 0); return true; }
    // YouTube json3 handed over as text by the page bridge:
    var trimmed = String(text || "").trim();
    if (trimmed.charAt(0) === "{" && trimmed.indexOf('"events"') !== -1) {
      var jc = parseJson3Text(trimmed);
      if (jc.length) {
        var jl = guessLang(hint, sampleCuesText(jc));
        return ingestCues(jc, jl, (jl === "ja" ? "Japanese" : "English") + " subtitles loaded");
      }
    }
    var cues = parseSubtitles(text);
    if (!cues.length) {
      diagLog("no cues parsed from " + String(hint || "").slice(0, 80));
      if (!state.jpCues.length) setStatus("warn", "That subtitle file had no readable lines. Try .srt or .vtt.");
      return false;
    }
    var lang = guessLang(hint, sampleCuesText(cues));
    return ingestCues(cues, lang, lang === "ja" ? "Japanese subtitles loaded" : "English subtitles loaded");
  }
  function loadSubtitleUrl(url) {
    harvestTimedTextUrl(url);
    if (!state.jpCues.length) setStatus("", "Loading subtitle file");
    return fetchText(url).then(function (t) {
      if (isHlsText(t)) return loadHlsPlaylist(url, t, 0);
      var ok = loadSubtitleText(t, url);
      if (ok && !/timedtext/i.test(url)) state.autoLoadedFrom = url;
      return ok;
    }).catch(function (e) {
      diagLog("fetch failed " + (e && e.message || e));
      if (!state.jpCues.length) setStatus("warn", "Could not fetch that subtitle file. Use Load sub and pick the file instead.");
      return false;
    });
  }
  function maybeAutoLoad(url) {
    if (state.autoTried[url]) return;
    if (/googlevideo\.com\/videoplayback/i.test(url)) return;
    harvestTimedTextUrl(url);
    if (/youtube\.com\/api\/timedtext/i.test(url)) {
      if (!/[?&]fmt=/.test(url)) return;
      var urlLang = guessLang(url, "");
      if (urlLang === "ja" && state.jpCues.length) return;
      if (urlLang === "en" && state.enCues.length) return;
    } else if (state.jpCues.length) {
      return;
    }
    state.autoTried[url] = 1;
    diagLog("auto-try " + String(url).split("/").pop().split("?")[0]);
    loadSubtitleUrl(url);
  }
  function addDiscovered(url) {
    if (!url || /googlevideo\.com\/videoplayback/i.test(url)) return;
    var full = url;
    try { full = new URL(url, location.href).href; } catch (e) {}
    harvestTimedTextUrl(full);
    if (state.discoveredSet[full]) return;
    state.discoveredSet[full] = 1; state.discovered.push(full);
    diagLog("found " + full.slice(0, 110));
    renderSubsMenu();
    if (!state.jpCues.length || (/youtube\.com\/api\/timedtext/i.test(full) && !state.enCues.length)) {
      if (!state.jpCues.length) {
        setStatus("", "Subtitle file found - loading it now. Subs lists everything found.");
        armLoadingWatchdog();
      }
      maybeAutoLoad(full);
    }
  }
  // v2.3.4: the "loading it now" pill used to hang forever when a discovered
  // URL was skipped by maybeAutoLoad and no text ever arrived. If nothing
  // loads within 15s, say so instead of spinning silently.
  var loadingWatchdog = null;
  function armLoadingWatchdog() {
    if (loadingWatchdog) clearTimeout(loadingWatchdog);
    loadingWatchdog = setTimeout(function () {
      loadingWatchdog = null;
      if (!state.jpCues.length) setStatus("warn", "Subtitle file found but nothing loaded yet. Check Subs, or use Load sub.");
    }, 15000);
  }
  function clearLoadingWatchdog() { if (loadingWatchdog) { clearTimeout(loadingWatchdog); loadingWatchdog = null; } }
  function rubyParts(surface, reading) {
    var hr = kataToHira(reading);
    if (!hasKanji(surface) || !hr || reading === "*") return null;
    var start = 0;
    while (start < surface.length && start < hr.length && isKana(surface[start]) && kataToHira(surface[start]) === hr[start]) start++;
    var sEnd = surface.length - 1, rEnd = hr.length - 1;
    while (sEnd >= start && rEnd >= start && isKana(surface[sEnd]) && kataToHira(surface[sEnd]) === hr[rEnd]) { sEnd--; rEnd--; }
    var base = surface.slice(start, sEnd + 1), ruby = hr.slice(start, rEnd + 1);
    if (!base || !ruby || !hasKanji(base)) return null;
    return { prefix: surface.slice(0, start), base: base, ruby: ruby, suffix: surface.slice(sEnd + 1) };
  }
  // Splits words with internal okurigana (e.g. 申し込み -> 申[もう]し込[こ]み,
  // 取り扱い -> 取[と]り扱[あつか]い) into per-kanji ruby segments.
  function rubySegments(surface, reading) {
    var parts = rubyParts(surface, reading);
    if (!parts) return null;
    var base = parts.base, ruby = parts.ruby;
    var runs = [];
    for (var i = 0; i < base.length; i++) {
      var ch = base[i], k = isKana(ch);
      if (!runs.length || runs[runs.length - 1].isKana !== k) runs.push({ isKana: k, text: ch });
      else runs[runs.length - 1].text += ch;
    }
    var segs = [];
    if (parts.prefix) segs.push({ text: parts.prefix });
    if (runs.length > 1) {
      var rPos = 0, ok = true, midSegs = [];
      for (var rIdx = 0; rIdx < runs.length; rIdx++) {
        var run = runs[rIdx];
        if (run.isKana) {
          midSegs.push({ text: run.text });
        } else if (rIdx + 1 < runs.length && runs[rIdx + 1].isKana) {
          var nextKana = kataToHira(runs[rIdx + 1].text);
          var found = ruby.indexOf(nextKana, rPos + 1);
          if (found === -1) { ok = false; break; }
          var kRuby = ruby.slice(rPos, found);
          if (!kRuby) { ok = false; break; }
          midSegs.push({ base: run.text, ruby: kRuby });
          rPos = found + nextKana.length;
        } else {
          var tailRuby = ruby.slice(rPos);
          if (!tailRuby) { ok = false; break; }
          midSegs.push({ base: run.text, ruby: tailRuby });
          rPos = ruby.length;
        }
      }
      if (ok && rPos === ruby.length) {
        segs = segs.concat(midSegs);
        if (parts.suffix) segs.push({ text: parts.suffix });
        return segs;
      }
    }
    segs.push({ base: base, ruby: ruby });
    if (parts.suffix) segs.push({ text: parts.suffix });
    return segs;
  }
  function appendRubyNodes(container, surface, reading) {
    var segs = rubySegments(surface, reading);
    if (!segs) { container.appendChild(document.createTextNode(surface)); return; }
    segs.forEach(function (s) {
      if (s.base && s.ruby) {
        var ruby = document.createElement("ruby");
        ruby.appendChild(document.createTextNode(s.base));
        var rt = document.createElement("rt");
        rt.textContent = s.ruby;
        ruby.appendChild(rt);
        container.appendChild(ruby);
      } else if (s.text) {
        container.appendChild(document.createTextNode(s.text));
      }
    });
  }
  function findCue(cues, time) {
    var lo = 0, hi = cues.length - 1, res = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (cues[mid].start <= time) { res = mid; lo = mid + 1; } else hi = mid - 1; }
    if (res < 0) return -1;
    if (time <= cues[res].end + 0.08) return res;
    // Check recent earlier cues in case a short overlapping sign/interjection
    // ended while a longer spoken dialogue cue is still active.
    for (var i = res - 1; i >= 0 && i >= res - 8; i--) {
      if (time >= cues[i].start && time <= cues[i].end + 0.08) return i;
    }
    return -1;
  }
  function translationFor(cue) {
    if (!cue || !state.enCues.length) return "";
    var mid = cue.start + (cue.end - cue.start) / 2;
    var idx = findCue(state.enCues, mid);
    if (idx >= 0) return state.enCues[idx].text;
    for (var i = 0; i < state.enCues.length; i++) if (Math.abs(state.enCues[i].start - cue.start) < 0.65) return state.enCues[i].text;
    return "";
  }
  function hasDictWord(word) {
    var hit = dictGet(word);
    return !!(hit && hit.g && hit.g.length);
  }
  function tokenize(text) {
    // NFKC first: auto-captions sometimes emit half-width katakana
    // (ﾃﾚﾋﾞ), which the tokenizer and the dictionary both miss.
    var norm = (text || "").normalize("NFKC");
    var cacheKey = norm + "|" + (state.groupVerbs ? "1" : "0");
    if (state.tokenCache.has(cacheKey)) return state.tokenCache.get(cacheKey);
    if (!state.tokenizer) return null;
    try {
      var toks = state.tokenizer.tokenize(norm);
      // Auto-captions often remove the pause between adjacent katakana words.
      // IPADIC then returns the whole run as one unknown proper noun. Refine
      // those cases into useful click targets before rendering, using the
      // bundled JMdict when it has loaded (IPADIC-only fallback otherwise).
      if (window.SPTokenRefiner) toks = window.SPTokenRefiner.refine(toks, state.tokenizer, { hasWord: hasDictWord, groupVerbs: state.groupVerbs });
      state.tokenCache.set(cacheKey, toks);
      return toks;
    }
    catch (e) { return null; }
  }

  /* ---------- DOM ---------- */
  var root, overlay, jpEl, enEl, statusEl, dotEl, wordCard, panel, listEl, vocabListEl, episodeListEl, fileInputEl, subsMenuEl, minerPanel;
  function allVideos() { return Array.prototype.slice.call(document.querySelectorAll("video")); }
  function videoEl() {
    var vids = allVideos(); if (!vids.length) return null;
    var playing = vids.filter(function (v) { return !v.paused && !v.ended && v.readyState > 1; });
    var pool = playing.length ? playing : vids;
    pool.sort(function (a, b) { return (b.offsetWidth * b.offsetHeight || b.clientWidth * b.clientHeight || 0) - (a.offsetWidth * a.offsetHeight || a.clientWidth * a.clientHeight || 0); });
    return pool[0];
  }
  function playerEl() {
    var yt = document.querySelector("#movie_player");
    if (yt) return yt;
    var v = videoEl(); if (!v) return null;
    // closest() tests the element itself first, and some players put
    // "player" in the <video> tag's own id or class (Bitmovin on
    // Crunchyroll uses id "bitmovinplayer-video-..."). Matching the video
    // itself used to make ensureRoot() append the overlay inside the
    // <video> element, where it can never render, so the extension looked
    // completely dead on those players. Start from the parent so the
    // mount target is always a container.
    var from = v.parentElement || v;
    return from.closest(".plyr, .video-js, .jwplayer, .fluid_video_wrapper, [class*='player'], [id*='player']") || v.parentElement || v;
  }

  function ensureRoot() {
    var player = playerEl();
    if (!player) return false;
    ensureServices();
    if (document.getElementById("sp-root")) return true;
    if (getComputedStyle(player).position === "static") player.style.position = "relative";
    root = document.createElement("div");
    root.id = "sp-root";
    root.innerHTML =
      '<div id="sp-overlay">' +
        '<div id="sp-caption-box">' +
          '<span id="sp-drag-handle" title="Drag to reposition captions (double-click to reset)">&#8942;&#8942;</span>' +
          '<div id="sp-jp"></div><div id="sp-en" class="sp-en"></div>' +
        '</div>' +
        '<div><span id="sp-status"><span class="sp-dot"></span><span id="sp-status-text">Study Player loading</span></span></div>' +
        '<div id="sp-bar">' +
          '<button class="sp-btn" id="sp-prev" type="button" title="Previous line">|&#9664;</button>' +
          '<button class="sp-btn" id="sp-replay" type="button" title="Replay line (R)">Replay</button>' +
          '<button class="sp-btn" id="sp-next" type="button" title="Next line">&#9654;|</button>' +
          '<button class="sp-btn" id="sp-loop" type="button" aria-pressed="false" title="Loop current line">Loop</button>' +
          '<button class="sp-btn" id="sp-autopause" type="button" aria-pressed="false" title="Pause automatically at the end of each subtitle line (P)">Auto-pause</button>' +
          '<button class="sp-btn" id="sp-furi" type="button" aria-pressed="true" title="Toggle Furigana (Shift+F)">Furigana</button>' +
          '<button class="sp-btn" id="sp-en-toggle" type="button" aria-pressed="true" title="Toggle English translation (Shift+E)">EN</button>' +
          '<span class="sp-offset-group" title="Subtitle timing offset ([ and ] to adjust, click value to reset)">' +
            '<button class="sp-offset-btn" id="sp-offset-dec" type="button" aria-label="Delay subtitles by 0.25s">&#8722;</button>' +
            '<button class="sp-offset-val" id="sp-offset-val" type="button" title="Click to reset subtitle offset to 0.0s">0.0s</button>' +
            '<button class="sp-offset-btn" id="sp-offset-inc" type="button" aria-label="Advance subtitles by 0.25s">+</button>' +
          '</span>' +
          '<select class="sp-select" id="sp-speed"><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select>' +
          '<button class="sp-btn" id="sp-panel-btn" type="button">Transcript</button>' +
          '<button class="sp-btn sp-minimize" id="sp-minimize" type="button" aria-pressed="false" aria-label="Minimize controls" title="Minimize controls">&#8722;</button>' +
        '</div>' +
      '</div>' +
      '<aside id="sp-word-card" hidden>' +
        '<div class="sp-wc-head"><div><div class="sp-wc-main" id="sp-wc-main"></div><div class="sp-wc-reading" id="sp-wc-reading"></div><div class="sp-wc-romaji" id="sp-wc-romaji"></div></div>' +
        '<button class="sp-wc-close" id="sp-wc-close" type="button" aria-label="Close">x</button></div>' +
        '<span class="sp-wc-pos" id="sp-wc-pos"></span> <span class="sp-wc-jlpt" id="sp-wc-jlpt" style="display:none"></span><span class="sp-wc-grammar" id="sp-wc-grammar" style="display:none"></span>' +
        '<div id="sp-wc-pitch" style="margin-top:6px"></div>' +
        '<p class="sp-wc-meaning" id="sp-wc-meaning"></p>' +
        '<div id="sp-wc-kanji-box" class="sp-wc-kanji-box" hidden></div>' +
        '<div class="sp-wc-actions"><button class="sp-wc-know" id="sp-wc-know" type="button">I know this</button><button class="sp-wc-save" id="sp-wc-save" type="button">Save word</button></div>' +
      '</aside>';
    var fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.id = "sp-file"; fileInput.accept = ".srt,.vtt,.ass,.ssa,.txt"; fileInput.multiple = true; fileInput.hidden = true;
    var subsMenu = document.createElement("div");
    subsMenu.id = "sp-subs-menu"; subsMenu.hidden = true;
    player.appendChild(root); player.appendChild(fileInput); player.appendChild(subsMenu);
    overlay = root.querySelector("#sp-overlay");
    jpEl = root.querySelector("#sp-jp");
    enEl = root.querySelector("#sp-en");
    statusEl = root.querySelector("#sp-status-text");
    dotEl = root.querySelector(".sp-dot");
    wordCard = root.querySelector("#sp-word-card");
    fileInputEl = player.querySelector("#sp-file"); subsMenuEl = player.querySelector("#sp-subs-menu");
    bindBar();
    buildPanel();
    buildMinerPanel();
    syncFullscreenParent();
    applyToggles();
    return true;
  }
  function syncFullscreenParent() {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (!fsEl) return;
    if (panel && panel.parentElement !== fsEl) fsEl.appendChild(panel);
    if (minerPanel && minerPanel.parentElement !== fsEl) fsEl.appendChild(minerPanel);
  }
  function fmtOffset(sec) {
    var v = Number(sec || 0);
    if (Math.abs(v) < 0.005) return "0.0s";
    return (v > 0 ? "+" : "") + v.toFixed(2).replace(/0$/, "") + "s";
  }
  function shiftSubOffset(delta, reset) {
    state.subOffset = reset ? 0 : Math.round(((state.subOffset || 0) + delta) * 100) / 100;
    applyToggles();
    updateForTime(true);
    saveSettings();
  }
  function setStatus(kind, text) { if (statusEl) statusEl.textContent = text; if (dotEl) dotEl.className = "sp-dot" + (kind ? " " + kind : ""); }
  function applyToggles() {
    var theme = state.theme || "classic-light";
    [
      root, wordCard, panel, minerPanel, subsMenuEl,
      document.getElementById("sp-root"),
      document.getElementById("sp-word-card"),
      document.getElementById("sp-panel"),
      document.getElementById("sp-miner-panel"),
      document.getElementById("sp-subs-menu")
    ].forEach(function (el) {
      if (el) el.setAttribute("data-sp-theme", theme);
    });
    if (root) {
      root.classList.toggle("sp-hide-furigana", !state.furigana);
      root.classList.toggle("sp-furi-unknown", state.furigana && state.furiganaMode === "unknown");
      root.classList.toggle("sp-furi-hover", state.furigana && state.furiganaMode === "hover");
      root.classList.toggle("sp-hide-translation", !state.translation);
      root.classList.toggle("sp-controls-collapsed", state.controlsCollapsed);
      root.classList.toggle("sp-pitch-colors", !!state.pitchColors);
      root.classList.toggle("sp-listen-blur", state.listeningMode === "blur");
      root.classList.toggle("sp-listen-cloze", state.listeningMode === "cloze-unknown");
    }
    if (state.pitchColors && !pitchData) {
      loadPitch().then(function () { if (state.activeIndex >= 0) renderActive(); });
    }
    var f = document.getElementById("sp-furi"), e = document.getElementById("sp-en-toggle"), l = document.getElementById("sp-loop"), ap = document.getElementById("sp-autopause"), ov = document.getElementById("sp-offset-val"), m = document.getElementById("sp-minimize");
    if (f) {
      f.setAttribute("aria-pressed", String(state.furigana));
      var modeLabel = state.furiganaMode === "unknown" ? "Furi: Unknown" : (state.furiganaMode === "hover" ? "Furi: Hover" : "Furigana");
      f.textContent = state.furigana ? modeLabel : "Furigana";
    }
    if (e) e.setAttribute("aria-pressed", String(state.translation));
    if (l) l.setAttribute("aria-pressed", String(state.loop));
    if (ap) ap.setAttribute("aria-pressed", String(state.autoPause));
    if (ov) ov.textContent = fmtOffset(state.subOffset);
    if (m) {
      m.setAttribute("aria-pressed", String(state.controlsCollapsed));
      m.setAttribute("aria-label", state.controlsCollapsed ? "Show controls" : "Minimize controls");
      m.title = state.controlsCollapsed ? "Show controls" : "Minimize controls";
      m.textContent = state.controlsCollapsed ? "Controls" : "−";
    }
    document.body.classList.toggle("sp-native-off", !!state.enabled);
    if (overlay) overlay.style.display = state.enabled ? "" : "none";
    if (wordCard && !state.enabled) wordCard.hidden = true;
    if (minerPanel && !state.enabled) minerPanel.hidden = true;
    hideNativeTracks();
    applyCaptionStyle();
  }
  function applyCaptionStyle() {
    if (!root) return;
    var c = state.caption || {};
    root.style.setProperty("--sp-font-size", (c.fontSize || 26) + "px");
    root.style.setProperty("--sp-bg-alpha", ((c.bg == null ? 72 : c.bg) / 100).toFixed(2));
    root.style.setProperty("--sp-known-opacity", ((c.known == null ? 45 : c.known) / 100).toFixed(2));
    root.style.setProperty("--sp-text-color", c.text || "#ffffff");
    root.style.setProperty("--sp-hover-bg", c.hover || "rgba(228,74,42,.45)");
    var capBox = root.querySelector("#sp-caption-box");
    if (capBox) {
      if (c.pos && typeof c.pos.x === "number" && typeof c.pos.y === "number") {
        capBox.classList.add("sp-floating");
        capBox.style.left = c.pos.x.toFixed(1) + "%";
        capBox.style.top = c.pos.y.toFixed(1) + "%";
        capBox.style.transform = "translate(-50%, -50%)";
      } else {
        capBox.classList.remove("sp-floating");
        capBox.style.left = "";
        capBox.style.top = "";
        capBox.style.transform = "";
      }
    }
  }
  function hideNativeTracks() {
    var v = videoEl(); if (!v || !v.textTracks) return;
    for (var i = 0; i < v.textTracks.length; i++) { try { v.textTracks[i].mode = "hidden"; } catch (e) {} }
  }
  function toggleSubsMenu() {
    if (!subsMenuEl) return false;
    subsMenuEl.hidden = !subsMenuEl.hidden;
    if (!subsMenuEl.hidden) renderSubsMenu();
    return !subsMenuEl.hidden;
  }
  function loadSubFile() {
    if (!fileInputEl) return false;
    fileInputEl.click();
    return true;
  }
  function bindBar() {
    root.querySelector("#sp-replay").addEventListener("click", replay);
    root.querySelector("#sp-prev").addEventListener("click", function () { seekLine(-1); });
    root.querySelector("#sp-next").addEventListener("click", function () { seekLine(1); });
    root.querySelector("#sp-loop").addEventListener("click", function () { state.loop = !state.loop; if (state.loop) state.autoPause = false; applyToggles(); saveSettings(); });
    root.querySelector("#sp-autopause").addEventListener("click", function () { state.autoPause = !state.autoPause; state.autoPausedForIndex = -1; if (state.autoPause) state.loop = false; applyToggles(); saveSettings(); });
    root.querySelector("#sp-furi").addEventListener("click", function () { state.furigana = !state.furigana; applyToggles(); saveSettings(); });
    root.querySelector("#sp-en-toggle").addEventListener("click", function () { state.translation = !state.translation; applyToggles(); saveSettings(); });
    root.querySelector("#sp-offset-dec").addEventListener("click", function () { shiftSubOffset(-0.25, false); });
    root.querySelector("#sp-offset-inc").addEventListener("click", function () { shiftSubOffset(0.25, false); });
    root.querySelector("#sp-offset-val").addEventListener("click", function () { shiftSubOffset(0, true); });
    root.querySelector("#sp-speed").addEventListener("change", function () { var v = videoEl(); if (v) v.playbackRate = Number(this.value); });
    root.querySelector("#sp-panel-btn").addEventListener("click", function () { togglePanel(); });
    root.querySelector("#sp-minimize").addEventListener("click", function () {
      state.controlsCollapsed = !state.controlsCollapsed;
      if (subsMenuEl) subsMenuEl.hidden = true;
      applyToggles(); saveSettings();
    });
    if (fileInputEl) fileInputEl.addEventListener("change", function () {
      Array.prototype.forEach.call(fileInputEl.files || [], function (f) {
        var reader = new FileReader();
        reader.onload = function () { loadSubtitleText(String(reader.result || ""), f.name); };
        reader.readAsText(f);
      });
      fileInputEl.value = "";
    });
    root.querySelector("#sp-wc-close").addEventListener("click", function () { wordCard.hidden = true; });
    root.querySelector("#sp-wc-save").addEventListener("click", saveSelectedWord);
    var capBox = root.querySelector("#sp-caption-box");
    var dragHandle = root.querySelector("#sp-drag-handle");
    if (capBox) {
      capBox.addEventListener("mouseenter", function () {
        if (!state.hoverPause) return;
        var v = videoEl();
        if (v && !v.paused) { state.pausedByHover = true; try { v.pause(); } catch (e) {} }
      });
      capBox.addEventListener("mouseleave", function () {
        if (!state.hoverPause || !state.pausedByHover) return;
        state.pausedByHover = false;
        if (wordCard && !wordCard.hidden) return;
        var v = videoEl();
        if (v && v.paused) { v.play().catch(function () {}); }
      });
    }
    if (dragHandle && capBox) {
      dragHandle.addEventListener("dblclick", function (ev) {
        ev.stopPropagation();
        state.caption.pos = null;
        applyCaptionStyle();
        saveSettings();
      });
      dragHandle.addEventListener("mousedown", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var pl = playerEl() || root;
        var rect = pl.getBoundingClientRect();
        function onMove(me) {
          if (!rect.width || !rect.height) return;
          var xPct = Math.max(10, Math.min(90, ((me.clientX - rect.left) / rect.width) * 100));
          var yPct = Math.max(8, Math.min(92, ((me.clientY - rect.top) / rect.height) * 100));
          state.caption.pos = { x: xPct, y: yPct };
          applyCaptionStyle();
        }
        function onUp() {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          saveSettings();
        }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });
    }
  }
  /* ---------- Live ASR & Auto-Sync & Jimaku Search ---------- */
  var asrRec = null;
  function toggleLiveAsr() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus("warn", "Web Speech Recognition is not supported in this browser.");
      return;
    }
    if (state.asrActive && asrRec) {
      state.asrActive = false;
      try { asrRec.stop(); } catch (e) {}
      asrRec = null;
      setStatus("ready", "Live ASR stopped (" + state.jpCues.length + " lines)");
      if (subsMenuEl && !subsMenuEl.hidden) renderSubsMenu();
      return;
    }
    state.asrActive = true;
    asrRec = new SR();
    asrRec.lang = "ja-JP";
    asrRec.continuous = true;
    asrRec.interimResults = true;
    var interimStart = 0;
    asrRec.onresult = function (ev) {
      var v = videoEl();
      var nowT = v ? v.currentTime : 0;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var res = ev.results[i];
        var txt = cleanText(res[0] && res[0].transcript || "");
        if (!txt) continue;
        if (!interimStart) interimStart = Math.max(0, nowT - 1.2);
        if (res.isFinal) {
          var startT = interimStart;
          var endT = Math.max(startT + 1.5, nowT + 0.4);
          interimStart = 0;
          state.jpCues.push({ start: startT, end: endT, text: txt });
          state.jpCues.sort(function (a, b) { return a.start - b.start; });
          state.activeIndex = state.jpCues.length - 1;
          renderActive();
          if (state.panelOpen) renderTranscript();
        } else if (jpEl) {
          renderJapanese(txt);
        }
      }
    };
    asrRec.onerror = function (ev) {
      diagLog("Live ASR error: " + (ev && ev.error || "unknown"));
    };
    asrRec.onend = function () {
      if (state.asrActive && asrRec) {
        try { asrRec.start(); } catch (e) { state.asrActive = false; }
      }
    };
    try {
      asrRec.start();
      setStatus("ready", "Live ASR listening (speak or route audio to mic)");
    } catch (e) {
      state.asrActive = false;
      setStatus("warn", "Could not start Live ASR: " + (e.message || e));
    }
    if (subsMenuEl && !subsMenuEl.hidden) renderSubsMenu();
  }

  function autoSyncToAudio(btnEl) {
    var v = videoEl();
    if (!v || !state.jpCues.length) {
      if (btnEl) btnEl.textContent = "Need video + subs";
      return;
    }
    var origTime = v.currentTime;
    var targetIdx = findCue(state.jpCues, origTime - Number(state.subOffset || 0));
    if (targetIdx < 0) {
      // Find next cue starting within 10s
      for (var i = 0; i < state.jpCues.length; i++) {
        if (state.jpCues[i].start >= origTime - 5) { targetIdx = i; break; }
      }
    }
    if (targetIdx < 0) targetIdx = 0;
    var targetCue = state.jpCues[targetIdx];
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Listening for voice..."; }
    try {
      var stream = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null);
      if (!stream || !stream.getAudioTracks().length) throw new Error("CORS/DRM audio stream locked");
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      var actx = new AudioCtx();
      var src = actx.createMediaStreamSource(stream);
      var analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      var bins = new Uint8Array(analyser.frequencyBinCount);
      var sampleRate = actx.sampleRate || 44100;
      var binHz = sampleRate / analyser.fftSize;
      var loBin = Math.max(1, Math.floor(250 / binHz));
      var hiBin = Math.min(bins.length - 1, Math.ceil(3200 / binHz));
      var baseline = 0, samples = 0, detectedTime = null;
      var startWall = performance.now();
      if (v.paused) v.play().catch(function () {});
      var timer = setInterval(function () {
        analyser.getByteFrequencyData(bins);
        var energy = 0;
        for (var b = loBin; b <= hiBin; b++) energy += bins[b];
        energy /= Math.max(1, hiBin - loBin + 1);
        samples++;
        if (samples <= 5) {
          baseline = (baseline * (samples - 1) + energy) / samples;
        } else if (energy > Math.max(38, baseline * 1.65)) {
          detectedTime = v.currentTime;
        }
        if (detectedTime !== null || performance.now() - startWall > 3800) {
          clearInterval(timer);
          try { actx.close(); } catch (e) {}
          if (btnEl) btnEl.disabled = false;
          if (detectedTime !== null) {
            var newOffset = Math.round((detectedTime - targetCue.start) * 4) / 4;
            if (Math.abs(newOffset) <= 15) {
              state.subOffset = newOffset;
              applyToggles();
              updateForTime(true);
              saveSettings();
              if (btnEl) btnEl.textContent = "Synced (" + fmtOffset(newOffset) + ")";
              return;
            }
          }
          if (btnEl) btnEl.textContent = "No clear onset";
        }
      }, 45);
    } catch (e) {
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = "DRM/CORS blocked"; }
      diagLog("Auto-sync error: " + (e.message || e));
    }
  }

  function renderSubsMenu() {
    if (!subsMenuEl) return;
    subsMenuEl.innerHTML = "";
    if (state.theme) subsMenuEl.setAttribute("data-sp-theme", state.theme);
    var head = document.createElement("div"); head.className = "sp-subs-head";
    head.textContent = state.discovered.length ? "Subtitle files & tools" : "Subtitles, Auto-Sync, Live ASR & Jimaku Search";
    subsMenuEl.appendChild(head);
    // Diagnostics readout (2.1): what was actually found on this page.
    var diagBox = document.createElement("div"); diagBox.className = "sp-subs-diag";
    var vidsNow = allVideos();
    var lines = [];
    lines.push("Page: " + location.hostname + " - videos: " + vidsNow.length);
    lines.push("Loaded: JP " + state.jpCues.length + " lines, EN " + state.enCues.length + " lines" + (state.autoLoadedFrom ? " (auto: " + state.autoLoadedFrom.split("/").pop().split("?")[0] + ")" : ""));
    if (state.tracksSeen && state.tracksSeen.length) lines.push("YouTube tracks: " + state.tracksSeen.map(function (t) { return t.languageCode + (t.kind ? "/" + t.kind : ""); }).join(", "));
    if (state.nativeInfo && state.nativeInfo.length) lines.push("Player tracks: " + state.nativeInfo.join(" - "));
    lines.push("Found files: " + state.discovered.length);
    diagBox.textContent = lines.join("\n");
    subsMenuEl.appendChild(diagBox);
    var retryRow = document.createElement("div"); retryRow.className = "sp-subs-row";
    var retryBtn = document.createElement("button"); retryBtn.type = "button"; retryBtn.className = "sp-small-btn"; retryBtn.textContent = "Retry detection";
    retryBtn.addEventListener("click", function () {
      state.autoTried = {};
      try { window.postMessage({ type: "SP_REQUEST_TRACKS" }, "*"); } catch (e) {}
      pollNativeTracks();
      state.discovered.slice().forEach(function (u) { maybeAutoLoad(u); });
      renderSubsMenu();
    });
    var syncBtn = document.createElement("button"); syncBtn.type = "button"; syncBtn.className = "sp-small-btn"; syncBtn.textContent = "Auto-Sync to Voice";
    syncBtn.title = "Listen to video audio band and align current subtitle line onset";
    syncBtn.addEventListener("click", function () { autoSyncToAudio(syncBtn); });
    var asrBtn = document.createElement("button"); asrBtn.type = "button"; asrBtn.className = "sp-small-btn";
    asrBtn.textContent = state.asrActive ? "Stop Live ASR" : "Live ASR (Transcribe)";
    asrBtn.addEventListener("click", toggleLiveAsr);
    var copyBtn = document.createElement("button"); copyBtn.type = "button"; copyBtn.className = "sp-small-btn"; copyBtn.textContent = "Copy diag";
    copyBtn.addEventListener("click", function () {
      var txt = diagBox.textContent + "\n---\n" + (state.diag || []).slice(0, 10).join("\n");
      function done(ok) { copyBtn.textContent = ok ? "Copied" : "Copy failed"; setTimeout(function () { copyBtn.textContent = "Copy diag"; }, 1500); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); });
        else {
          var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
          var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta); done(ok);
        }
      } catch (e) { done(false); }
    });
    retryRow.appendChild(retryBtn);
    retryRow.appendChild(syncBtn);
    retryRow.appendChild(asrBtn);
    retryRow.appendChild(copyBtn);
    subsMenuEl.appendChild(retryRow);
    // Jimaku.cc Online Anime Subtitle Search
    var jmBox = document.createElement("div"); jmBox.className = "sp-jimaku-box";
    var jmRow = document.createElement("div"); jmRow.className = "sp-jimaku-row";
    var jmInput = document.createElement("input"); jmInput.type = "search"; jmInput.className = "sp-jimaku-input";
    jmInput.placeholder = "Search Jimaku.cc anime subs (e.g. Frieren)...";
    jmInput.value = String(document.title || "").replace(/\s*[-|–—]\s*(YouTube|Crunchyroll|Netflix|Bilibili).*$/i, "").trim().slice(0, 50);
    var jmBtn = document.createElement("button"); jmBtn.type = "button"; jmBtn.className = "sp-small-btn"; jmBtn.textContent = "Search Jimaku";
    var jmResults = document.createElement("div");
    jmBtn.addEventListener("click", function () {
      var q = jmInput.value.trim();
      if (!q) return;
      if (!state.jimakuKey) {
        jmResults.innerHTML = '<div class="sp-subs-hint">Add your free Jimaku.cc API key in the Study Player popup (Jimaku.cc Subtitle Search section) first.</div>';
        return;
      }
      jmBtn.disabled = true; jmBtn.textContent = "Searching...";
      jmResults.innerHTML = "";
      chrome.runtime.sendMessage({ type: "SP_JIMAKU_SEARCH", query: q, apiKey: state.jimakuKey }, function (resp) {
        jmBtn.disabled = false; jmBtn.textContent = "Search Jimaku";
        if (!resp || !resp.ok) {
          jmResults.innerHTML = '<div class="sp-subs-hint">Jimaku error: ' + escapeHtml((resp && resp.error) || "failed") + '</div>';
          return;
        }
        if (!resp.files || !resp.files.length) {
          jmResults.innerHTML = '<div class="sp-subs-hint">No subtitle files found on Jimaku for "' + escapeHtml(q) + '".</div>';
          return;
        }
        resp.files.slice(0, 12).forEach(function (f) {
          var r = document.createElement("div"); r.className = "sp-subs-row";
          var lbl = document.createElement("span"); lbl.className = "sp-subs-url";
          lbl.textContent = (resp.entry && resp.entry.name ? "[" + resp.entry.name.slice(0, 18) + "] " : "") + f.name;
          var lb = document.createElement("button"); lb.type = "button"; lb.className = "sp-small-btn"; lb.textContent = "Load";
          lb.addEventListener("click", function () { loadSubtitleUrl(f.url); subsMenuEl.hidden = true; });
          r.appendChild(lbl); r.appendChild(lb); jmResults.appendChild(r);
        });
      });
    });
    jmRow.appendChild(jmInput); jmRow.appendChild(jmBtn);
    jmBox.appendChild(jmRow); jmBox.appendChild(jmResults);
    subsMenuEl.appendChild(jmBox);
    if (!state.discovered.length) {
      var hint = document.createElement("p"); hint.className = "sp-subs-hint";
      hint.textContent = "Press play and turn the player's own CC on, wait a few seconds, then Retry detection. Streaming (HLS) subtitle playlists are followed automatically when spotted. Otherwise use Load sub to pick an .srt/.vtt file from your device.";
      subsMenuEl.appendChild(hint);
    }
    state.discovered.slice(0, 14).forEach(function (url) {
      var row = document.createElement("div"); row.className = "sp-subs-row";
      var label = document.createElement("span"); label.className = "sp-subs-url"; label.textContent = url.split("/").pop().split("?")[0] || url; label.title = url;
      var bJ = document.createElement("button"); bJ.type = "button"; bJ.className = "sp-small-btn"; bJ.textContent = "Load";
      bJ.addEventListener("click", function () { loadSubtitleUrl(url); subsMenuEl.hidden = true; });
      row.appendChild(label); row.appendChild(bJ); subsMenuEl.appendChild(row);
    });
    if (state.diag && state.diag.length) {
      var logEl = document.createElement("div"); logEl.className = "sp-subs-log";
      logEl.textContent = state.diag.slice(0, 10).join("\n");
      subsMenuEl.appendChild(logEl);
    }
    var vids = allVideos();
    state.videoCount = vids.length;
    if (vids.length > 1) {
      var vh = document.createElement("p"); vh.className = "sp-subs-hint";
      vh.textContent = vids.length + " video players found. Study Player follows the playing / largest one.";
      subsMenuEl.appendChild(vh);
    }
  }
  function pollNativeTracks() {
    var v = videoEl(); if (!v) return;
    try {
      v.querySelectorAll("track[src]").forEach(function (t) { addDiscovered(t.src); });
    } catch (e) {}
    if (/(^|\.)youtube\.com$/.test(location.hostname)) return;
    try {
      var info = [];
      for (var i = 0; i < v.textTracks.length; i++) {
        var tt = v.textTracks[i];
        // Force the browser to load cues: disabled tracks never populate.
        try { if (tt.mode === "disabled") tt.mode = "hidden"; } catch (e) {}
        var nCues = 0; try { nCues = tt.cues ? tt.cues.length : 0; } catch (e) {}
        info.push((tt.label || tt.language || "track") + " [" + (tt.language || "?") + "/" + tt.mode + "/" + nCues + "]");
        if (!nCues) continue;
        var cues = [];
        for (var k = 0; k < tt.cues.length; k++) { var c = tt.cues[k]; cues.push({ start: c.startTime, end: c.endTime, text: cleanText(c.text) }); }
        if (!cues.length) continue;
        var lang = guessLang(tt.language || tt.label || "", sampleCuesText(cues));
        if (lang === "en" && state.enCues.length >= cues.length) continue;
        if (lang === "ja" && state.jpCues.length >= cues.length) continue;
        diagLog("native track " + lang + " " + cues.length + " cues");
        ingestCues(cues, lang, lang === "ja" ? "Japanese subtitles (player track)" : "English subtitles (player track)");
      }
      state.nativeInfo = info;
    } catch (e) {}
  }
  function buildPanel() {
    panel = document.createElement("div");
    panel.id = "sp-panel"; panel.hidden = true;
    panel.setAttribute("data-sp-theme", state.theme || "classic-light");
    panel.innerHTML =
      '<div class="sp-panel-head"><p class="sp-panel-title">Study transcript</p>' +
      '<p class="sp-panel-sub">Tap a line to jump there. Filter i+1 lines or browse high-frequency episode words.</p></div>' +
      '<button class="sp-panel-close" id="sp-panel-close" type="button" aria-label="Close panel">x</button>' +
      '<div class="sp-tabs">' +
        '<button class="sp-tab" id="sp-tab-t" type="button" aria-selected="true">Transcript</button>' +
        '<button class="sp-tab" id="sp-tab-v" type="button" aria-selected="false">Saved <span id="sp-v-count">0</span></button>' +
        '<button class="sp-tab" id="sp-tab-e" type="button" aria-selected="false">Episode <span id="sp-e-count">0</span></button>' +
      '</div>' +
      '<div id="sp-view-t"><div class="sp-tools"><input class="sp-search" id="sp-search" type="search" placeholder="Search lines"><button class="sp-filter-btn" id="sp-i1-filter" type="button" aria-pressed="false" title="Show only i+1 sentences (lines with exactly 1 unknown content word)">i+1 only</button><span class="sp-count" id="sp-line-count">0 lines</span></div>' +
      '<div class="sp-list" id="sp-list"><div class="sp-empty"><strong>No transcript yet</strong>Play the video with Japanese captions on, open Subs to pick a subtitle file found on the page, or use Load sub to add an .srt/.vtt file.</div></div></div>' +
      '<div id="sp-view-v" hidden><div class="sp-vocab-bar"><p>Saved in this browser</p><div class="sp-vocab-actions">' +
      '<button class="sp-small-btn" id="sp-export" type="button">Export CSV</button><button class="sp-small-btn" id="sp-clear" type="button">Clear</button></div></div>' +
      '<div class="sp-list" id="sp-v-list"></div></div>' +
      '<div id="sp-view-e" hidden><div class="sp-vocab-bar"><p>Unknown words in this episode (by frequency)</p></div>' +
      '<div class="sp-list" id="sp-e-list"></div></div>';
    document.body.appendChild(panel);
    listEl = panel.querySelector("#sp-list");
    vocabListEl = panel.querySelector("#sp-v-list");
    episodeListEl = panel.querySelector("#sp-e-list");
    panel.querySelector("#sp-panel-close").addEventListener("click", togglePanel);
    panel.querySelector("#sp-tab-t").addEventListener("click", function () { setPanelTab("transcript"); });
    panel.querySelector("#sp-tab-v").addEventListener("click", function () { setPanelTab("vocab"); });
    panel.querySelector("#sp-tab-e").addEventListener("click", function () { setPanelTab("episode"); });
    panel.querySelector("#sp-search").addEventListener("input", renderTranscript);
    var i1Btn = panel.querySelector("#sp-i1-filter");
    if (i1Btn) i1Btn.addEventListener("click", function () {
      state.i1Only = !state.i1Only;
      i1Btn.setAttribute("aria-pressed", String(state.i1Only));
      renderTranscript();
    });
    panel.querySelector("#sp-export").addEventListener("click", exportCsv);
    panel.querySelector("#sp-clear").addEventListener("click", function () { state.vocab = []; persistVocab(); renderVocab(); });
  }
  function togglePanel(force) {
    state.panelOpen = typeof force === "boolean" ? force : !state.panelOpen;
    if (panel) {
      panel.setAttribute("data-sp-theme", state.theme || "classic-light");
      panel.hidden = !state.panelOpen;
    }
    if (state.panelOpen) { renderTranscript(); renderVocab(); renderEpisodeWords(); }
  }
  function setPanelTab(tab) {
    state.panelTab = tab;
    panel.querySelector("#sp-tab-t").setAttribute("aria-selected", String(tab === "transcript"));
    panel.querySelector("#sp-tab-v").setAttribute("aria-selected", String(tab === "vocab"));
    panel.querySelector("#sp-tab-e").setAttribute("aria-selected", String(tab === "episode"));
    panel.querySelector("#sp-view-t").hidden = tab !== "transcript";
    panel.querySelector("#sp-view-v").hidden = tab !== "vocab";
    panel.querySelector("#sp-view-e").hidden = tab !== "episode";
    if (tab === "vocab") renderVocab();
    if (tab === "episode") renderEpisodeWords();
  }
  // v2.5.3: the sentence miner lives in its own fixed side window on
  // document.body (like the transcript panel) instead of a card inside
  // the player, so player sizing can never squeeze it.
  function buildMinerPanel() {
    if (document.getElementById("sp-miner-panel")) { minerPanel = document.getElementById("sp-miner-panel"); return; }
    minerPanel = document.createElement("aside");
    minerPanel.id = "sp-miner-panel"; minerPanel.hidden = true;
    minerPanel.setAttribute("data-sp-theme", state.theme || "classic-light");
    minerPanel.innerHTML =
      '<div class="sp-mn-head"><div><div class="sp-panel-title">Mine sentence</div>' +
      '<div class="sp-wc-reading" id="sp-mn-sub"></div></div>' +
      '<button class="sp-wc-close" id="sp-mn-close" type="button" aria-label="Close">x</button></div>' +
      '<div class="sp-mn-body">' +
      '<div id="sp-mn-sent" class="sp-mn-sent"></div>' +
      '<div id="sp-mn-words" class="sp-mn-words"></div>' +
      '<div class="sp-subs-hint">pitch: 0 = flat (heiban), number = accented mora drop</div>' +
      '<div class="sp-mn-shot-bar">' +
        '<label class="sp-mn-shot-lbl"><input type="checkbox" id="sp-mn-shot-chk" checked> Include screenshot on card</label>' +
        '<button class="sp-small-btn" id="sp-mn-retake" type="button">Retake</button>' +
      '</div>' +
      '<img id="sp-mn-shot" class="sp-mn-shot" alt="Video frame">' +
      '<audio id="sp-mn-audio" class="sp-mn-audio" controls hidden></audio>' +
      '<div class="sp-wc-actions">' +
        '<button class="sp-wc-save" id="sp-mn-listen" type="button">Listen</button>' +
        '<button class="sp-wc-save" id="sp-mn-rec" type="button" title="Record real show audio for this subtitle line">Record clip</button>' +
        '<button class="sp-wc-save" id="sp-mn-shadow" type="button" title="Shadow this line with your microphone and score pronunciation">Shadow (Mic)</button>' +
        '<button class="sp-wc-save" id="sp-mn-anki" type="button">Send to Anki</button>' +
        '<button class="sp-wc-save" id="sp-mn-csv" type="button">CSV</button>' +
      '</div>' +
      '<div id="sp-mn-shadow-box" class="sp-shadow-box" hidden></div>' +
      '<div id="sp-mn-msg" class="sp-subs-hint"></div></div>';
    document.body.appendChild(minerPanel);
    minerPanel.querySelector("#sp-mn-close").addEventListener("click", closeMiner);
    minerPanel.querySelector("#sp-mn-listen").addEventListener("click", minerListen);
    minerPanel.querySelector("#sp-mn-rec").addEventListener("click", minerRecordAudioClip);
    minerPanel.querySelector("#sp-mn-shadow").addEventListener("click", startShadowing);
    minerPanel.querySelector("#sp-mn-anki").addEventListener("click", minerToAnki);
    minerPanel.querySelector("#sp-mn-csv").addEventListener("click", minerToCsv);
    var shotChk = minerPanel.querySelector("#sp-mn-shot-chk");
    var retakeBtn = minerPanel.querySelector("#sp-mn-retake");
    if (shotChk) {
      shotChk.checked = state.anki.includeScreenshot !== false;
      shotChk.addEventListener("change", function () {
        state.anki.includeScreenshot = !!shotChk.checked;
        try { chrome.storage.local.set({ sp_anki: state.anki }); } catch (e) {}
        var shotImg = minerPanel.querySelector("#sp-mn-shot");
        if (state.anki.includeScreenshot) {
          if (retakeBtn) retakeBtn.style.display = "";
          if (minerShot) {
            if (shotImg) { shotImg.src = minerShot; shotImg.style.display = ""; }
          } else {
            captureMinerScreenshot(minerGen);
          }
        } else {
          if (shotImg) shotImg.style.display = "none";
          if (retakeBtn) retakeBtn.style.display = "none";
        }
      });
    }
    if (retakeBtn) {
      retakeBtn.addEventListener("click", function () {
        captureMinerScreenshot(minerGen);
      });
    }
  }
  function isContentToken(tok) {
    if (!tok || !tok.surface_form) return false;
    var p = tok.pos || "";
    if (p === "記号" || p === "助詞" || p === "助動詞" || p === "接続詞" || p === "感動詞") return false;
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(tok.surface_form);
  }
  function renderJapanese(text) {
    if (!jpEl) return;
    jpEl.innerHTML = "";
    var toks = tokenize(text);
    if (!toks) { jpEl.textContent = text; return; }
    toks.forEach(function (tok) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "sp-word"; btn.textContent = "";
      var base = tok.basic_form && tok.basic_form !== "*" ? tok.basic_form : tok.surface_form;
      var readingHira = tok.reading && tok.reading !== "*" ? kataToHira(tok.reading) : "";
      var wordKnown = isKnown(base, tok.surface_form);
      if (wordKnown) btn.classList.add("sp-known");
      else if (state.listeningMode === "cloze-unknown" && isContentToken(tok)) {
        btn.classList.add("sp-cloze-target");
      }
      if (state.pitchColors && pitchData && window.SPTokenRefiner && window.SPTokenRefiner.analyzePitch) {
        var pStr = pitchFor(tok.surface_form, readingHira) || pitchFor(base, readingHira);
        var pat = window.SPTokenRefiner.analyzePitch(readingHira || kataToHira(tok.surface_form), pStr);
        if (pat && pat.patternKey) btn.setAttribute("data-pitch", pat.patternKey);
      }
      btn.setAttribute("aria-label", tok.surface_form + (readingHira ? ", " + readingHira : ""));
      appendRubyNodes(btn, tok.surface_form, tok.reading);
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        btn.classList.remove("sp-cloze-target");
        openWord(tok);
      });
      jpEl.appendChild(btn);
    });
  }
  function renderActive() {
    if (!jpEl) return;
    document.querySelectorAll(".sp-cue.active").forEach(function (n) { n.classList.remove("active"); });
    var idx = state.activeIndex;
    if (idx < 0 || !state.jpCues[idx]) {
      jpEl.textContent = state.jpCues.length ? "" : jpEl.textContent;
      if (enEl) enEl.textContent = "";
      return;
    }
    var cue = state.jpCues[idx];
    renderJapanese(cue.text);
    if (enEl) enEl.textContent = translationFor(cue) || (state.enCues.length ? "" : "");
    var row = listEl && listEl.querySelector('[data-idx="' + idx + '"]');
    if (row) {
      row.classList.add("active");
      var r = row.getBoundingClientRect(), c = listEl.getBoundingClientRect();
      if (r.top < c.top || r.bottom > c.bottom) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
  function updateForTime(force) {
    var v = videoEl(); if (!v || !state.jpCues.length) return;
    var offset = Number(state.subOffset || 0);
    var t = v.currentTime - offset;
    if (state.loop && state.activeIndex >= 0) {
      var cur = state.jpCues[state.activeIndex];
      if (cur && t >= cur.end - 0.03) { v.currentTime = Math.max(0, cur.start + offset + 0.01); return; }
    }
    if (state.autoPause && !state.loop && state.activeIndex >= 0) {
      var apCue = state.jpCues[state.activeIndex];
      if (apCue && t >= apCue.end - 0.05 && state.autoPausedForIndex !== state.activeIndex && !v.paused) {
        state.autoPausedForIndex = state.activeIndex;
        try { v.pause(); } catch (e) {}
        return;
      }
    }
    var idx = findCue(state.jpCues, t);
    if (idx === state.activeIndex && !force) return;
    if (idx >= 0 && idx !== state.activeIndex) state.autoPausedForIndex = -1;
    state.activeIndex = idx;
    renderActive();
  }
  function seekLine(delta) {
    if (!state.jpCues.length) return;
    var v = videoEl(); if (!v) return;
    var idx = state.activeIndex < 0 ? 0 : state.activeIndex + delta;
    idx = Math.max(0, Math.min(state.jpCues.length - 1, idx));
    state.autoPausedForIndex = -1;
    v.currentTime = Math.max(0, state.jpCues[idx].start + Number(state.subOffset || 0) + 0.01);
    state.activeIndex = idx; renderActive();
    v.play().catch(function () {});
  }
  function replay() {
    var v = videoEl(); if (!v || state.activeIndex < 0) return;
    state.autoPausedForIndex = -1;
    v.currentTime = Math.max(0, state.jpCues[state.activeIndex].start + Number(state.subOffset || 0) + 0.01);
    v.play().catch(function () {});
  }
  function cueUnknownInfo(cue) {
    if (!cue || !state.tokenizer) return { count: 0, target: "" };
    var toks = tokenize(cue.text) || [];
    var seen = {}, count = 0, target = "";
    for (var i = 0; i < toks.length; i++) {
      var tok = toks[i];
      if (!isContentToken(tok)) continue;
      var base = tok.basic_form && tok.basic_form !== "*" ? tok.basic_form : tok.surface_form;
      if (seen[base] || isKnown(base, tok.surface_form)) continue;
      seen[base] = 1;
      count++;
      if (!target) target = base;
    }
    return { count: count, target: target };
  }
  function renderTranscript() {
    if (!listEl) return;
    var q = (panel.querySelector("#sp-search").value || "").trim().toLowerCase();
    listEl.innerHTML = ""; var count = 0;
    state.jpCues.forEach(function (cue, i) {
      var en = translationFor(cue);
      if (q && (cue.text + " " + en).toLowerCase().indexOf(q) === -1) return;
      var uInfo = cueUnknownInfo(cue);
      var isI1 = uInfo.count === 1;
      if (state.i1Only && !isI1) return;
      count++;
      var row = document.createElement("button");
      row.type = "button"; row.className = "sp-cue" + (i === state.activeIndex ? " active" : "");
      row.dataset.idx = i;
      row.innerHTML = '<span class="sp-cue-time"></span><span><span class="sp-cue-jp"></span><span class="sp-cue-en"></span></span>';
      row.querySelector(".sp-cue-time").textContent = fmt(cue.start);
      var jpSpan = row.querySelector(".sp-cue-jp");
      jpSpan.textContent = cue.text;
      if (isI1) {
        var b = document.createElement("span");
        b.className = "sp-i1-badge";
        b.textContent = "i+1: " + uInfo.target;
        jpSpan.appendChild(b);
      }
      var enElRow = row.querySelector(".sp-cue-en");
      if (en) enElRow.textContent = en; else enElRow.remove();
      row.addEventListener("click", function () {
        var v = videoEl(); if (!v) return;
        state.autoPausedForIndex = -1;
        v.currentTime = Math.max(0, cue.start + Number(state.subOffset || 0) + 0.01);
        state.activeIndex = i; renderActive();
        v.play().catch(function () {});
      });
      listEl.appendChild(row);
    });
    panel.querySelector("#sp-line-count").textContent = count + (count === 1 ? " line" : " lines");
    if (!count) listEl.innerHTML = '<div class="sp-empty"><strong>No matching lines</strong>' + (state.i1Only ? 'No i+1 lines found yet. Mark more words as Known (or sync from Anki) to highlight sentences with 1 unknown word.' : 'Try a different search, or check that Japanese captions are on for this video.') + '</div>';
  }
  function renderEpisodeWords() {
    if (!episodeListEl) return;
    var freqMap = {};
    state.jpCues.forEach(function (cue, idx) {
      var toks = tokenize(cue.text) || [];
      toks.forEach(function (tok) {
        if (!isContentToken(tok)) return;
        var base = tok.basic_form && tok.basic_form !== "*" ? tok.basic_form : tok.surface_form;
        if (isKnown(base, tok.surface_form)) return;
        if (!freqMap[base]) {
          var readingHira = tok.reading && tok.reading !== "*" ? kataToHira(tok.reading) : "";
          freqMap[base] = { word: base, surface: tok.surface_form, reading: readingHira, pos: posLabel(tok), count: 0, firstCueIdx: idx, sampleTok: tok };
        }
        freqMap[base].count++;
      });
    });
    var items = Object.keys(freqMap).map(function (k) { return freqMap[k]; });
    items.sort(function (a, b) { return b.count - a.count; });
    var countEl = document.getElementById("sp-e-count");
    if (countEl) countEl.textContent = items.length;
    episodeListEl.innerHTML = "";
    if (!items.length) {
      episodeListEl.innerHTML = '<div class="sp-empty"><strong>No unknown episode words</strong>Load subtitles first, or all words in this episode are already marked Known!</div>';
      return;
    }
    items.slice(0, 80).forEach(function (it) {
      var hit = lookupWord(it.word, it.surface, it.reading);
      var meaning = GLOSSARY[it.word] || (hit && hit.meaning) || "";
      var row = document.createElement("div"); row.className = "sp-v-item";
      var body = document.createElement("div");
      body.innerHTML = '<div><span class="sp-v-word"></span><span class="sp-v-reading"></span><span class="sp-freq-badge"></span></div><div class="sp-v-meaning"></div>';
      body.querySelector(".sp-v-word").textContent = it.word;
      body.querySelector(".sp-v-reading").textContent = it.reading || (hit && hit.reading) || "";
      body.querySelector(".sp-freq-badge").textContent = it.count + "x";
      body.querySelector(".sp-v-meaning").textContent = meaning || "(tap to inspect)";
      body.style.cursor = "pointer";
      body.addEventListener("click", function () {
        var cue = state.jpCues[it.firstCueIdx];
        if (!cue) return;
        var v = videoEl();
        if (v) { v.currentTime = Math.max(0, cue.start + Number(state.subOffset || 0) + 0.01); }
        state.activeIndex = it.firstCueIdx;
        renderActive();
        openWord(it.sampleTok);
      });
      var knowBtn = document.createElement("button");
      knowBtn.type = "button"; knowBtn.className = "sp-v-remove"; knowBtn.textContent = "Know";
      knowBtn.title = "Mark as Known";
      knowBtn.addEventListener("click", function () {
        setKnown(it.word, it.surface, true);
        renderEpisodeWords();
        if (state.panelOpen) renderTranscript();
      });
      row.appendChild(body); row.appendChild(knowBtn);
      episodeListEl.appendChild(row);
    });
  }
  function posLabel(tok) {
    var map = { "\u540d\u8a5e":"noun","\u52d5\u8a5e":"verb","\u5f62\u5bb9\u8a5e":"adjective","\u526f\u8a5e":"adverb","\u52a9\u8a5e":"particle","\u52a9\u52d5\u8a5e":"auxiliary","\u63a5\u7d9a\u8a5e":"conjunction","\u611f\u52d5\u8a5e":"interjection","\u9023\u4f53\u8a5e":"pre-noun adjective","\u8a18\u53f7":"symbol" };
    return map[tok.pos] || tok.pos || "word";
  }
  /* ---------- Dictionary (bundled JMdict common-word subset) ---------- */
  function dictGet(key) {
    if (!state.dict || !key) return null;
    return state.dict[key] || null;
  }
  function lookupWord(base, surface, readingHira) {
    // Kuromoji hands us the dictionary form (basic_form), so inflected
    // words like 行きます resolve to 行く. Fall back to the surface form,
    // then to the reading for words written in kana.
    var hit = dictGet(base) || dictGet(surface) || dictGet(readingHira);
    // JMdict sometimes spells katakana words without the final long vowel
    // mark (インターネットエクスプローラ for インターネットエクスプローラー).
    // Strip trailing ー and retry before giving up.
    if (!hit && typeof surface === "string") {
      var stripped = surface.replace(/ー+$/, "");
      if (stripped && stripped !== surface) hit = dictGet(stripped);
    }
    if (!hit || !hit.g || !hit.g.length) return null;
    return { meaning: hit.g.join("; "), reading: hit.r || "", pos: hit.p || "" };
  }
  function loadDictionary() {
    if (state.dictStatus !== "idle") return;
    state.dictStatus = "loading";
    var url;
    try { url = chrome.runtime.getURL("dict/jmdict.json"); } catch (e) { state.dictStatus = "unavailable"; return; }
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      state.dict = data || {};
      state.dictStatus = "ready";
      state.tokenCache.clear();
      diagLog("dictionary ready - " + Object.keys(state.dict).length + " forms");
      // A card clicked while the dictionary was warming up gets its
      // definition filled in as soon as the data lands.
      if (state.selectedWord && state.selectedWord.pendingDict && state.lastTok) openWord(state.lastTok);
      if (state.activeIndex >= 0) renderActive();
    }).catch(function () {
      state.dictStatus = "unavailable";
      diagLog("dictionary failed to load - built-in glossary only");
    });
  }
  function buildPitchVizEl(readingHira, pitchStr) {
    if (!window.SPTokenRefiner || !window.SPTokenRefiner.analyzePitch) return null;
    var pat = window.SPTokenRefiner.analyzePitch(readingHira, pitchStr);
    if (!pat || !pat.moras || !pat.moras.length) return null;
    var wrap = document.createElement("span");
    wrap.className = "sp-pitch-viz";
    pat.moras.forEach(function (m, i) {
      var sp = document.createElement("span");
      var isHigh = pat.heights[i] === 1;
      var isDrop = pat.dropIndex === i + 1;
      sp.className = "sp-mora " + (isHigh ? "high" : "low") + (isDrop ? " drop" : "");
      sp.textContent = m;
      wrap.appendChild(sp);
    });
    var tag = document.createElement("span");
    tag.className = "sp-pitch-tag";
    tag.textContent = "[" + pat.accent + "] " + pat.patternName;
    wrap.appendChild(tag);
    return wrap;
  }
  function openWord(tok) {
    var base = tok.basic_form && tok.basic_form !== "*" ? tok.basic_form : tok.surface_form;
    var readingHira = tok.reading && tok.reading !== "*" ? kataToHira(tok.reading) : "";
    var curated = GLOSSARY[base] || GLOSSARY[tok.surface_form] || "";
    var hit = curated ? null : lookupWord(base, tok.surface_form, readingHira);
    var meaning, known = true, pendingDict = false;
    if (curated) meaning = curated;
    else if (hit) meaning = hit.meaning;
    else if (state.dictStatus === "loading") { meaning = "Dictionary is still loading, one moment..."; known = false; pendingDict = true; }
    else { meaning = "Not in the bundled dictionary. You can still save the word with its reading and the line it came from."; known = false; }
    var pos = posLabel(tok);
    if (hit && hit.pos && (pos === "word" || !tok.pos)) pos = hit.pos;
    state.lastTok = tok;
    state.selectedWord = {
      word: base, surface: tok.surface_form,
      reading: readingHira || (hit && hit.reading) || "Reading unavailable",
      pos: pos, meaning: meaning, known: known, pendingDict: pendingDict,
      context: state.activeIndex >= 0 ? state.jpCues[state.activeIndex].text : "",
      translation: state.activeIndex >= 0 ? translationFor(state.jpCues[state.activeIndex]) : ""
    };
    document.getElementById("sp-wc-main").textContent = tok.surface_form !== base ? tok.surface_form + " (" + base + ")" : base;
    document.getElementById("sp-wc-reading").textContent = state.selectedWord.reading;
    // v2.5.1: romaji under the kana reading. Hidden when there is no kana reading.
    var romajiEl = document.getElementById("sp-wc-romaji");
    var readingKana = kataToHira(state.selectedWord.reading);
    if (/^[぀-ヶー]+$/.test(readingKana)) { romajiEl.textContent = hiraToRomaji(readingKana); romajiEl.style.display = ""; }
    else { romajiEl.textContent = ""; romajiEl.style.display = "none"; }
    document.getElementById("sp-wc-pos").textContent = state.selectedWord.pos;
    var gramBadge = document.getElementById("sp-wc-grammar");
    if (gramBadge) {
      if (tok.grammarNote) { gramBadge.textContent = tok.grammarNote; gramBadge.style.display = ""; }
      else { gramBadge.textContent = ""; gramBadge.style.display = "none"; }
    }
    var jlptBadge = document.getElementById("sp-wc-jlpt");
    jlptBadge.textContent = ""; jlptBadge.style.display = "none";
    var pitchBox = document.getElementById("sp-wc-pitch");
    if (pitchBox) pitchBox.innerHTML = "";
    loadPitch().then(function () {
      if (!pitchBox) return;
      var pStr = pitchFor(tok.surface_form, readingHira) || pitchFor(base, readingHira);
      var viz = buildPitchVizEl(readingHira || (hit && hit.reading) || "", pStr);
      if (viz) { pitchBox.innerHTML = ""; pitchBox.appendChild(viz); }
    });
    var kanjiBox = document.getElementById("sp-wc-kanji-box");
    if (kanjiBox) { kanjiBox.innerHTML = ""; kanjiBox.hidden = true; }
    loadJlpt().then(function () {
      var lvl = jlptFor(base, tok.surface_form);
      if (lvl) { jlptBadge.textContent = lvl; jlptBadge.style.display = ""; }
      if (kanjiBox && window.SPTokenRefiner && window.SPTokenRefiner.inspectKanji) {
        var kList = window.SPTokenRefiner.inspectKanji(tok.surface_form, dictGet, jlptFor);
        if (kList && kList.length) {
          kanjiBox.innerHTML = "";
          kList.forEach(function (k) {
            var item = document.createElement("div"); item.className = "sp-kanji-item";
            var ch = document.createElement("div"); ch.className = "sp-kanji-char"; ch.textContent = k.kanji;
            var meta = document.createElement("div"); meta.className = "sp-kanji-meta";
            var line1 = (k.jlpt ? "[" + k.jlpt + "] " : "") + (k.reading ? k.reading + ", " : "") + (k.meaning || "Kanji");
            var compStr = k.components || k.parts || "";
            var lookStr = Array.isArray(k.lookalikes) ? k.lookalikes.join(", ") : (k.lookalikes || "");
            meta.innerHTML = "<strong>" + escapeHtml(line1) + "</strong>" +
              (compStr ? "<br>Parts: " + escapeHtml(compStr) : "") +
              (lookStr ? '<br><span class="sp-kanji-sim">Lookalikes: ' + escapeHtml(lookStr) + "</span>" : "");
            item.appendChild(ch); item.appendChild(meta);
            kanjiBox.appendChild(item);
          });
          kanjiBox.hidden = false;
        }
      }
    });
    var mEl = document.getElementById("sp-wc-meaning");
    mEl.textContent = meaning;
    mEl.classList.toggle("unknown", !known);
    var exists = state.vocab.some(function (it) { return it.word === base && it.reading === state.selectedWord.reading; });
    var saveBtn = document.getElementById("sp-wc-save");
    saveBtn.textContent = exists ? "Saved" : "Save word"; saveBtn.disabled = exists;
    var knowBtn = document.getElementById("sp-wc-know");
    var alreadyKnown = isKnown(base, tok.surface_form);
    knowBtn.textContent = alreadyKnown ? "Known" : "I know this";
    knowBtn.classList.toggle("known", alreadyKnown);
    knowBtn.onclick = function () {
      var nowKnown = !isKnown(base, tok.surface_form);
      setKnown(base, tok.surface_form, nowKnown);
      knowBtn.textContent = nowKnown ? "Known" : "I know this";
      knowBtn.classList.toggle("known", nowKnown);
    };
    if (wordCard) wordCard.setAttribute("data-sp-theme", state.theme || "classic-light");
    wordCard.hidden = false;
    var v = videoEl(); if (v && !v.paused) { /* keep playing; learner can pause with space */ }
  }
  function saveSelectedWord() {
    if (!state.selectedWord) return;
    var exists = state.vocab.some(function (it) { return it.word === state.selectedWord.word && it.reading === state.selectedWord.reading; });
    if (!exists) state.vocab.push(Object.assign({}, state.selectedWord));
    persistVocab(); renderVocab();
    this.textContent = "Saved"; this.disabled = true;
  }
  function persistVocab() {
    try { chrome.storage.local.set({ sp_vocab: state.vocab }); } catch (e) { try { localStorage.setItem("sp_vocab", JSON.stringify(state.vocab)); } catch (e2) {} }
  }
  function renderVocab() {
    if (!vocabListEl) return;
    var countEl = document.getElementById("sp-v-count"); if (countEl) countEl.textContent = state.vocab.length;
    vocabListEl.innerHTML = "";
    if (!state.vocab.length) {
      vocabListEl.innerHTML = '<div class="sp-empty"><strong>Your word list is empty</strong>Tap any word above the video, then save it for review.</div>';
      return;
    }
    state.vocab.forEach(function (item, idx) {
      var row = document.createElement("div"); row.className = "sp-v-item";
      var body = document.createElement("div");
      body.innerHTML = '<div><span class="sp-v-word"></span><span class="sp-v-reading"></span></div><div class="sp-v-meaning"></div>';
      body.querySelector(".sp-v-word").textContent = item.word;
      body.querySelector(".sp-v-reading").textContent = item.reading;
      body.querySelector(".sp-v-meaning").textContent = item.meaning;
      if (item.context) { var ctx = document.createElement("div"); ctx.className = "sp-v-context"; ctx.textContent = item.context; body.appendChild(ctx); }
      var rm = document.createElement("button");
      rm.type = "button"; rm.className = "sp-v-remove"; rm.textContent = "x"; rm.setAttribute("aria-label", "Remove " + item.word);
      rm.addEventListener("click", function () { state.vocab.splice(idx, 1); persistVocab(); renderVocab(); });
      row.appendChild(body); row.appendChild(rm);
      vocabListEl.appendChild(row);
    });
    var ex = document.getElementById("sp-export"), cl = document.getElementById("sp-clear");
    if (ex) ex.disabled = !state.vocab.length; if (cl) cl.disabled = !state.vocab.length;
  }
  function csvCell(v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }
  function exportCsv() {
    if (!state.vocab.length) return;
    var rows = [["Word","Reading","Part of speech","Meaning","Japanese context","Translation"]];
    state.vocab.forEach(function (it) { rows.push([it.word, it.reading, it.pos, it.meaning, it.context, it.translation]); });
    var csv = "\uFEFF" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var a = document.createElement("a"); a.href = url; a.download = "japanese-vocabulary.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- Sentence miner (v2.4.0) ----------
     One-click flashcard mining from the current subtitle line:
     sentence + furigana, per-word glosses, pitch accent, a video-frame
     screenshot, TTS listen-back, and export to Anki (via AnkiConnect)
     or CSV. Audio on the saved card is intentionally TTS-preview only;
     no show audio is ever recorded. */
  var minerCue = null, minerShot = null, minerAudioDataUrl = null, minerAudioExt = "webm", minerTokens = [], minerGen = 0;
  function minerEl() { return minerPanel || null; }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Pitch accent data (Kanjium-derived, see README), lazy-loaded so the
  // base extension never pays for it until the miner opens.
  var pitchData = null, pitchPromise = null;
  function loadPitch() {
    if (pitchData) return Promise.resolve(pitchData);
    if (pitchPromise) return pitchPromise;
    pitchPromise = fetch(chrome.runtime.getURL("dict/pitch.json"))
      .then(function (r) { if (!r.ok) throw new Error("no pitch data"); return r.json(); })
      .then(function (d) { pitchData = d || {}; return pitchData; })
      .catch(function () { pitchData = {}; return pitchData; });
    return pitchPromise;
  }
  function pitchFor(word, readingHira) {
    if (!pitchData || !word) return "";
    var arr = pitchData[word];
    if (!arr || !arr.length) return "";
    for (var i = 0; i < arr.length; i++) if (!readingHira || arr[i][0] === readingHira) return arr[i][1];
    return arr[0][1];
  }
  var jlptData = null, jlptPromise = null;
  function loadJlpt() {
    if (jlptData) return Promise.resolve(jlptData);
    if (jlptPromise) return jlptPromise;
    jlptPromise = fetch(chrome.runtime.getURL("dict/jlpt.json"))
      .then(function (r) { if (!r.ok) throw new Error("no jlpt data"); return r.json(); })
      .then(function (d) { jlptData = d || {}; return jlptData; })
      .catch(function () { jlptData = {}; return jlptData; });
    return jlptPromise;
  }
  function jlptFor(base, surface) {
    if (!jlptData) return "";
    return jlptData[base] || jlptData[surface] || "";
  }
  function knownKey(base, surface) { return base || surface || ""; }
  function isKnown(base, surface) {
    var k = knownKey(base, surface);
    return !!(k && state.known && state.known[k]);
  }
  function persistKnown() {
    try { chrome.storage.local.set({ sp_known: state.known }); } catch (e) {}
  }
  function setKnown(base, surface, known) {
    var k = knownKey(base, surface);
    if (!k) return;
    if (known) state.known[k] = 1; else delete state.known[k];
    persistKnown();
    if (state.activeIndex >= 0) renderActive();
  }
  function minerRubyInto(el, toks) {
    // Same ruby rendering as the caption overlay, as static spans.
    el.innerHTML = "";
    toks.forEach(function (tok) {
      appendRubyNodes(el, tok.surface_form, tok.reading);
    });
  }
  function openMiner() {
    var mel = minerEl(); if (!mel) return;
    var cue = state.activeIndex >= 0 ? state.jpCues[state.activeIndex] : null;
    if (!cue && state.jpCues.length) {
      var v0 = videoEl();
      if (v0) { var idx = findCue(state.jpCues, v0.currentTime - Number(state.subOffset || 0)); if (idx >= 0) cue = state.jpCues[idx]; }
    }
    if (!cue) { setStatus("warn", "No subtitle line under the playhead to mine yet."); return false; }
    minerGen++;
    minerCue = cue; minerShot = null; minerAudioDataUrl = null;
    var v = videoEl(); if (v && !v.paused) { try { v.pause(); } catch (e) {} }
    if (wordCard) wordCard.hidden = true;
    togglePanel(false);
    mel.setAttribute("data-sp-theme", state.theme || "classic-light");
    mel.hidden = false;
    mel.querySelector("#sp-mn-sub").textContent = fmt(cue.start) + " - " + String(document.title || "").slice(0, 60);
    mel.querySelector("#sp-mn-msg").textContent = "";
    var audEl = mel.querySelector("#sp-mn-audio");
    if (audEl) { audEl.hidden = true; audEl.removeAttribute("src"); }
    var recBtn = mel.querySelector("#sp-mn-rec");
    if (recBtn) { recBtn.disabled = false; recBtn.textContent = "Record clip"; }
    var shBox = mel.querySelector("#sp-mn-shadow-box");
    if (shBox) { shBox.hidden = true; shBox.innerHTML = ""; }
    minerTokens = tokenize(cue.text) || [];
    var sentEl = mel.querySelector("#sp-mn-sent");
    if (minerTokens.length) minerRubyInto(sentEl, minerTokens);
    else sentEl.textContent = cue.text;
    var wordsEl = mel.querySelector("#sp-mn-words");
    wordsEl.innerHTML = "";
    loadPitch().then(function () {
      var seen = {}, any = false;
      minerTokens.forEach(function (tok) {
        var surf = tok.surface_form;
        if (!hasKanji(surf) || seen[surf]) return;
        seen[surf] = 1; any = true;
        var reading = (tok.reading && tok.reading !== "*") ? kataToHira(tok.reading) : "";
        var base = (tok.basic_form && tok.basic_form !== "*") ? tok.basic_form : surf;
        var hit = lookupWord(base, surf, reading);
        var pitch = pitchFor(surf, reading) || pitchFor(base, reading);
        var row = document.createElement("div"); row.className = "sp-mn-word";
        var w = document.createElement("span"); w.className = "sp-mn-w"; w.textContent = surf + (tok.grammarNote ? " (" + tok.grammarNote + ")" : "");
        var r = document.createElement("span"); r.className = "sp-mn-r";
        var viz = buildPitchVizEl(reading || (hit && hit.reading) || "", pitch);
        if (viz) r.appendChild(viz);
        else r.textContent = reading + (pitch !== "" ? " [" + pitch + "]" : "");
        var g = document.createElement("span"); g.className = "sp-mn-g";
        g.textContent = hit ? hit.meaning : "(no definition)";
        row.appendChild(w); row.appendChild(r); row.appendChild(g);
        wordsEl.appendChild(row);
      });
      if (!any) wordsEl.innerHTML = '<div class="sp-subs-hint">No kanji words in this line.</div>';
    });
    captureMinerScreenshot(minerGen);
    return true;
  }
  function captureMinerScreenshot(myGen) {
    var mel = minerEl(); if (!mel) return;
    var shotImg = mel.querySelector("#sp-mn-shot");
    var shotChk = mel.querySelector("#sp-mn-shot-chk");
    var retakeBtn = mel.querySelector("#sp-mn-retake");
    var wantShot = state.anki.includeScreenshot !== false;
    if (shotChk) shotChk.checked = wantShot;
    if (!wantShot) {
      minerShot = null;
      if (shotImg) { shotImg.removeAttribute("src"); shotImg.style.display = "none"; }
      if (retakeBtn) retakeBtn.style.display = "none";
      return;
    }
    if (retakeBtn) retakeBtn.style.display = "";
    if (shotImg) { shotImg.removeAttribute("src"); shotImg.style.display = "none"; }
    minerShot = null;
    // Step 1: Immediately capture the raw <video> frame on canvas (with the
    // mined subtitle drawn on it). This succeeds synchronously on HTML5
    // videos (like YouTube) even if chrome.tabs.captureVisibleTab is blocked
    // or rate-limited while the toolbar popup is closing.
    videoFrameShot(function (frameUrl) {
      if (myGen !== minerGen) return;
      if (frameUrl && state.anki.includeScreenshot !== false) {
        minerShot = frameUrl;
        if (shotImg) { shotImg.src = minerShot; shotImg.style.display = ""; }
      }
    });
    // Step 2: Also request a cropped tab screenshot after a brief delay (so
    // popup.html has finished closing) to capture the styled furigana overlay
    // or players where <video> canvas readback is cross-origin tainted.
    setTimeout(function () {
      if (myGen !== minerGen || state.anki.includeScreenshot === false) return;
      var shotRect = null;
      try {
        var pl = playerEl();
        if (pl) {
          var r = pl.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          if (r.width > 40 && r.height > 40) {
            var rx = Math.max(0, r.left), ry = Math.max(0, r.top);
            shotRect = {
              x: rx, y: ry,
              w: Math.min(r.width, window.innerWidth - rx),
              h: Math.min(r.height, window.innerHeight - ry),
              dpr: dpr
            };
          }
        }
      } catch (e) { shotRect = null; }
      mel.hidden = true;
      var unhideGuard = setTimeout(function () {
        if (myGen === minerGen) mel.hidden = false;
      }, 600);
      try {
        chrome.runtime.sendMessage({ type: "SP_MINER_SHOT" }, function (resp) {
          clearTimeout(unhideGuard);
          if (myGen === minerGen) mel.hidden = false;
          if (myGen !== minerGen || state.anki.includeScreenshot === false) return;
          if (resp && resp.ok && resp.dataUrl) {
            cropMinerShot(resp.dataUrl, shotRect, function (res) {
              if (myGen !== minerGen || state.anki.includeScreenshot === false) return;
              if (res && res.url && !res.black) {
                minerShot = res.url;
                if (shotImg) { shotImg.src = minerShot; shotImg.style.display = ""; }
              } else if (!minerShot) {
                videoFrameShot(function (fallbackUrl) {
                  if (myGen !== minerGen || state.anki.includeScreenshot === false) return;
                  minerShot = fallbackUrl || (res && res.url) || resp.dataUrl;
                  if (minerShot && shotImg) { shotImg.src = minerShot; shotImg.style.display = ""; }
                });
              }
            });
          } else if (!minerShot) {
            videoFrameShot(function (fallbackUrl) {
              if (myGen !== minerGen || state.anki.includeScreenshot === false) return;
              if (fallbackUrl) {
                minerShot = fallbackUrl;
                if (shotImg) { shotImg.src = minerShot; shotImg.style.display = ""; }
              }
            });
          }
        });
      } catch (e) {
        clearTimeout(unhideGuard);
        if (myGen === minerGen) mel.hidden = false;
      }
    }, 120);
  }
  function minerRecordAudioClip() {
    var mel = minerEl(); if (!mel || !minerCue) return;
    var v = videoEl(); if (!v) return;
    var recBtn = mel.querySelector("#sp-mn-rec");
    var msgEl = mel.querySelector("#sp-mn-msg");
    var audEl = mel.querySelector("#sp-mn-audio");
    try {
      var stream = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null);
      if (!stream) throw new Error("captureStream unsupported");
      var aTracks = stream.getAudioTracks();
      if (!aTracks || !aTracks.length) throw new Error("DRM or cross-origin audio track locked");
      var audioStream = new MediaStream(aTracks);
      var mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : (MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "");
      minerAudioExt = mime.indexOf("mp4") !== -1 ? "m4a" : "webm";
      var rec = mime ? new MediaRecorder(audioStream, { mimeType: mime }) : new MediaRecorder(audioStream);
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = function () {
        try { v.pause(); } catch (e) {}
        if (recBtn) { recBtn.disabled = false; recBtn.textContent = "Re-record clip"; }
        var blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        var reader = new FileReader();
        reader.onloadend = function () {
          minerAudioDataUrl = String(reader.result || "");
          if (audEl && minerAudioDataUrl) {
            audEl.src = minerAudioDataUrl;
            audEl.hidden = false;
          }
          if (msgEl) msgEl.textContent = "Recorded show audio clip (" + Math.round(blob.size / 1024) + " KB). Will attach to Anki card!";
        };
        reader.readAsDataURL(blob);
      };
      var offset = Number(state.subOffset || 0);
      var startSec = Math.max(0, minerCue.start + offset - 0.12);
      var durMs = Math.min(14000, Math.max(1200, Math.round((minerCue.end - minerCue.start + 0.35) * 1000 / (v.playbackRate || 1))));
      if (recBtn) { recBtn.disabled = true; recBtn.textContent = "Recording..."; }
      if (msgEl) msgEl.textContent = "Playing line to capture show audio...";
      v.currentTime = startSec;
      rec.start();
      v.play().catch(function () {});
      setTimeout(function () {
        if (rec.state === "recording") rec.stop();
      }, durMs);
    } catch (e) {
      if (recBtn) { recBtn.disabled = false; recBtn.textContent = "Record clip"; }
      if (msgEl) msgEl.textContent = "Audio capture blocked by player DRM/CORS (" + (e.message || e) + ").";
    }
  }
  var shadowState = { active: false, rec: null, sr: null };
  function startShadowing() {
    var mel = minerEl(); if (!mel || !minerCue) return;
    var shBox = mel.querySelector("#sp-mn-shadow-box");
    var shBtn = mel.querySelector("#sp-mn-shadow");
    if (!shBox || !shBtn) return;
    shBox.hidden = false;
    if (shadowState.active) {
      shadowState.active = false;
      try { if (shadowState.rec && shadowState.rec.state === "recording") shadowState.rec.stop(); } catch (e) {}
      try { if (shadowState.sr) shadowState.sr.stop(); } catch (e) {}
      shBtn.textContent = "Shadow (Mic)";
      return;
    }
    var targetMoras = [];
    if (window.SPTokenRefiner && window.SPTokenRefiner.splitMoras) {
      var targetHira = minerTokens.map(function (t) {
        return (t.reading && t.reading !== "*") ? kataToHira(t.reading) : kataToHira(t.surface_form);
      }).join("").replace(/[^\u3040-\u309f\u30fc]/g, "");
      targetMoras = window.SPTokenRefiner.splitMoras(targetHira);
    }
    shBox.innerHTML = "<strong>Speak the sentence into your mic now...</strong> (Click <em>Stop Shadow</em> when done)";
    shBtn.textContent = "Stop Shadow";
    shadowState.active = true;
    var transcript = "";
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        var sr = new SR();
        sr.lang = "ja-JP";
        sr.continuous = false;
        sr.interimResults = true;
        sr.onresult = function (ev) {
          var parts = [];
          for (var i = 0; i < ev.results.length; i++) parts.push(ev.results[i][0].transcript);
          transcript = parts.join("");
        };
        sr.start();
        shadowState.sr = sr;
      } catch (e) {}
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      shBox.textContent = "Microphone access is not available on this page.";
      shadowState.active = false;
      shBtn.textContent = "Shadow (Mic)";
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (micStream) {
      var rec = new MediaRecorder(micStream);
      shadowState.rec = rec;
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = function () {
        micStream.getTracks().forEach(function (t) { t.stop(); });
        try { if (shadowState.sr) shadowState.sr.stop(); } catch (e) {}
        shadowState.active = false;
        shBtn.textContent = "Shadow (Mic)";
        var userBlob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        var userUrl = URL.createObjectURL(userBlob);
        setTimeout(function () {
          var spokenToks = transcript ? (tokenize(transcript) || []) : [];
          var spokenHira = spokenToks.length
            ? spokenToks.map(function (t) { return (t.reading && t.reading !== "*") ? kataToHira(t.reading) : kataToHira(t.surface_form); }).join("")
            : kataToHira(transcript);
          spokenHira = spokenHira.replace(/[^\u3040-\u309f\u30fc]/g, "");
          var spokenMoras = (window.SPTokenRefiner && window.SPTokenRefiner.splitMoras) ? window.SPTokenRefiner.splitMoras(spokenHira) : [];
          var matched = 0;
          var diffHtml = "";
          if (targetMoras.length && spokenMoras.length) {
            var used = {};
            targetMoras.forEach(function (m) {
              var foundIdx = -1;
              for (var k = 0; k < spokenMoras.length; k++) {
                if (!used[k] && spokenMoras[k] === m) { foundIdx = k; break; }
              }
              if (foundIdx !== -1) {
                used[foundIdx] = 1;
                matched++;
                diffHtml += '<span class="sp-mora-ok">' + escapeHtml(m) + '</span> ';
              } else {
                diffHtml += '<span class="sp-mora-miss">' + escapeHtml(m) + '</span> ';
              }
            });
          }
          var score = (targetMoras.length && spokenMoras.length) ? Math.round((matched / targetMoras.length) * 100) : null;
          shBox.innerHTML =
            (score !== null
              ? '<div><strong>Pronunciation match: ' + score + '%</strong> (' + matched + '/' + targetMoras.length + ' moras)</div><div style="margin:4px 0">' + diffHtml + '</div>' + (transcript ? '<div class="sp-subs-hint">Heard: ' + escapeHtml(transcript) + '</div>' : '')
              : '<div><strong>Recorded your shadowing take!</strong></div>') +
            '<div style="display:flex;gap:6px;align-items:center;margin-top:6px">' +
              '<button type="button" class="sp-small-btn" id="sp-sh-compare">Play Native &rarr; Mine</button>' +
              '<audio controls src="' + userUrl + '" style="height:26px;flex:1"></audio>' +
            '</div>';
          var cmpBtn = shBox.querySelector("#sp-sh-compare");
          if (cmpBtn) cmpBtn.addEventListener("click", function () {
            if (minerAudioDataUrl) {
              var a1 = new Audio(minerAudioDataUrl);
              a1.onended = function () { new Audio(userUrl).play().catch(function () {}); };
              a1.play().catch(function () {});
            } else {
              minerListen();
              setTimeout(function () { new Audio(userUrl).play().catch(function () {}); }, 2200);
            }
          });
        }, 350);
      };
      rec.start();
      setTimeout(function () {
        if (rec.state === "recording") rec.stop();
      }, 6500);
    }).catch(function (e) {
      shadowState.active = false;
      shBtn.textContent = "Shadow (Mic)";
      shBox.textContent = "Mic permission denied or unavailable (" + (e.message || e) + ").";
    });
  }
  // Crop a captureVisibleTab data URL to a CSS-pixel rect (scaled by dpr).
  // Also reports whether the crop looks black (protected video path) so the
  // caller can fall back to a direct video-frame capture. Falls back to the
  // uncropped image when anything looks off.
  function cropMinerShot(dataUrl, rect, done) {
    function fallback() { try { done(null); } catch (e) {} }
    if (!rect) return fallback();
    var img = new Image();
    img.onload = function () {
      try {
        var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
        var dpr = rect.dpr || 1;
        var sx = Math.round(rect.x * dpr), sy = Math.round(rect.y * dpr);
        var sw = Math.round(rect.w * dpr), sh = Math.round(rect.h * dpr);
        if (sx < 0) { sw += sx; sx = 0; }
        if (sy < 0) { sh += sy; sy = 0; }
        if (sx + sw > iw) sw = iw - sx;
        if (sy + sh > ih) sh = ih - sy;
        if (sw < 20 || sh < 20) return fallback();
        var c = document.createElement("canvas");
        c.width = sw; c.height = sh;
        var ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        var url = null;
        try { url = c.toDataURL("image/jpeg", 0.82); } catch (e) { url = null; }
        if (!url) return fallback();
        var black = false;
        try { black = isCanvasBlack(ctx, sw, sh); } catch (e) { black = false; }
        done({ url: url, black: black });
      } catch (e) { fallback(); }
    };
    img.onerror = fallback;
    img.src = dataUrl;
  }
  // True when the sampled regions of a canvas are essentially black.
  function isCanvasBlack(ctx, w, h) {
    var pts = [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.3], [0.5, 0.7]];
    var sum = 0, n = 0, i, j;
    for (i = 0; i < pts.length; i++) {
      var x = Math.max(0, Math.min(w - 8, Math.round(w * pts[i][0]) - 4));
      var y = Math.max(0, Math.min(h - 8, Math.round(h * pts[i][1]) - 4));
      var d = ctx.getImageData(x, y, 8, 8).data;
      for (j = 0; j < d.length; j += 4) { sum += d[j] + d[j + 1] + d[j + 2]; n++; }
    }
    return n > 0 && (sum / n / 3) < 12;
  }
  // Direct video-frame capture for DRM-black tab screenshots.
  // Redraws the mined caption since the raw frame has no overlay.
  function videoFrameShot(done) {
    function fail() { try { done(null); } catch (e) {} }
    try {
      var v = videoEl();
      if (!v || !v.videoWidth || !v.videoHeight) return fail();
      var scale = v.videoWidth > 1280 ? (1280 / v.videoWidth) : 1;
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(v.videoWidth * scale));
      c.height = Math.max(1, Math.round(v.videoHeight * scale));
      var ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      if (isCanvasBlack(ctx, c.width, c.height)) return fail();
      if (minerCue && minerCue.text) drawMinerCaption(ctx, c.width, c.height, minerCue.text);
      done(c.toDataURL("image/jpeg", 0.82));
    } catch (e) { fail(); }
  }
  function drawMinerCaption(ctx, W, H, text) {
    var size = Math.max(22, Math.round(H * 0.06));
    ctx.font = size + 'px "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    var maxW = W * 0.92, lines = [], line = "", i;
    var chars = String(text).split("");
    for (i = 0; i < chars.length; i++) {
      var t = line + chars[i];
      if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = chars[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > 3) lines = lines.slice(0, 3);
    var lh = Math.round(size * 1.3), y = H - Math.round(H * 0.05);
    ctx.lineWidth = Math.max(3, Math.round(size / 7));
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.fillStyle = "#ffffff";
    for (i = lines.length - 1; i >= 0; i--) {
      ctx.strokeText(lines[i], W / 2, y);
      ctx.fillText(lines[i], W / 2, y);
      y -= lh;
    }
  }
  function closeMiner() {
    minerGen++;
    var mel = minerEl(); if (mel) mel.hidden = true;
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  }
  function minerListen() {
    if (!minerCue) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(minerCue.text);
      u.lang = "ja-JP"; u.rate = 0.85;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function minerCardFields() {
    if (!minerCue) return null;
    var reading = minerTokens.map(function (t) {
      return (t.reading && t.reading !== "*") ? kataToHira(t.reading) : t.surface_form;
    }).join("");
    var glosses = [], seen = {}, targetWord = "", targetReading = "", targetMeaning = "";
    minerTokens.forEach(function (t) {
      var surf = t.surface_form;
      if (!hasKanji(surf) || seen[surf]) return;
      seen[surf] = 1;
      var rd = (t.reading && t.reading !== "*") ? kataToHira(t.reading) : "";
      var base = (t.basic_form && t.basic_form !== "*") ? t.basic_form : surf;
      var hit = lookupWord(base, surf, rd);
      if (hit) {
        if (!targetWord) { targetWord = base; targetReading = rd || hit.reading || ""; targetMeaning = hit.meaning; }
        glosses.push(surf + " [" + (rd || hit.reading || "") + "]: " + hit.meaning);
      }
    });
    return {
      sentence: minerCue.text,
      reading: reading,
      glosses: glosses,
      translation: translationFor(minerCue) || "",
      targetWord: targetWord || minerCue.text,
      targetReading: targetReading || reading,
      targetMeaning: targetMeaning || glosses.join("; "),
      time: fmt(minerCue.start),
      title: String(document.title || "")
    };
  }
  // v2.6.2: AnkiConnect lives on localhost, but a page's
  // Content-Security-Policy can block a content script's direct fetch()
  // to it (Crunchyroll does), which used to fail every Send to Anki with
  // "not reachable" even with Anki open and AnkiConnect answering.
  // Try direct first, then fall back to the background proxy, which is
  // not bound by page CSP (same pattern as subtitle fetching).
  function ankiRequest(payload) {
    return fetch("http://127.0.0.1:8765", {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).catch(function () {
      diagLog("anki direct fetch failed, trying background proxy");
      return new Promise(function (resolve, reject) {
        try {
          chrome.runtime.sendMessage({ type: "SP_ANKI_ADD", payload: payload }, function (resp) {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            if (resp && resp.ok) resolve(resp.data);
            else reject(new Error((resp && resp.error) || "proxy failed"));
          });
        } catch (e) { reject(e); }
      });
    });
  }
  function pickFieldName(available, preferred, candidates) {
    if (preferred && available.indexOf(preferred) !== -1) return preferred;
    for (var i = 0; i < candidates.length; i++) {
      for (var j = 0; j < available.length; j++) {
        if (available[j].toLowerCase() === candidates[i].toLowerCase()) return available[j];
      }
    }
    return preferred || "";
  }
  function minerToAnki() {
    var mel = minerEl(); if (!mel) return;
    var msgEl = mel.querySelector("#sp-mn-msg");
    var f = minerCardFields(); if (!f) return;
    msgEl.textContent = "Contacting AnkiConnect on your machine...";
    var back = escapeHtml(f.reading) +
      (f.translation ? "<br><em>" + escapeHtml(f.translation) + "</em>" : "") +
      "<br><br>" + f.glosses.map(escapeHtml).join("<br>") +
      "<br><br><small>" + escapeHtml(f.title) + " - " + escapeHtml(f.time) + "</small>";
    var tags = (state.anki.tags || "").split(/[\s,]+/).filter(function (t) { return t; });
    if (!tags.length) tags = ["furigana-anywhere"];
    var modelName = state.anki.model || "Basic";
    ankiRequest({ action: "modelFieldNames", version: 6, params: { modelName: modelName } })
      .then(function (res) { return (res && Array.isArray(res.result)) ? res.result : ["Front", "Back"]; })
      .catch(function () { return ["Front", "Back"]; })
      .then(function (avail) {
        var sentFld = pickFieldName(avail, state.anki.sentenceField, ["Front", "Sentence", "Expression", "Japanese", "Text", "Question"]) || avail[0] || "Front";
        var backFld = pickFieldName(avail, state.anki.meaningField, ["Back", "Glossary", "Meaning", "Definition", "Notes", "Answer"]) || avail[1] || avail[0] || "Back";
        var readFld = pickFieldName(avail, state.anki.readingField, ["Reading", "SentenceReading", "ExpressionReading", "Furigana", "Kana"]);
        var picFld = pickFieldName(avail, state.anki.pictureField, ["Picture", "Image", "Screenshot", backFld]) || backFld;
        var audFld = pickFieldName(avail, state.anki.audioField, ["SentenceAudio", "Audio", "Sound", "Voice", backFld]) || backFld;
        var fields = {};
        avail.forEach(function (k) { fields[k] = ""; });
        fields[sentFld] = escapeHtml(f.sentence);
        if (backFld === sentFld) {
          fields[sentFld] += "<br><br>" + back;
        } else {
          fields[backFld] = back;
        }
        if (readFld && readFld !== sentFld && readFld !== backFld) {
          fields[readFld] = escapeHtml(f.reading);
        }
        var note = {
          deckName: state.anki.deck || "Default",
          modelName: modelName,
          fields: fields,
          options: { allowDuplicate: false },
          tags: tags
        };
        if (state.anki.includeScreenshot !== false && minerShot && minerShot.indexOf(",") > 0) {
          note.picture = [{ data: minerShot.split(",")[1], filename: "fa_mine_" + Date.now() + ".jpg", fields: [picFld] }];
        }
        if (minerAudioDataUrl && minerAudioDataUrl.indexOf(",") > 0) {
          note.audio = [{ data: minerAudioDataUrl.split(",")[1], filename: "fa_audio_" + Date.now() + "." + (minerAudioExt || "webm"), fields: [audFld] }];
        }
        return ankiRequest({ action: "addNote", version: 6, params: { note: note } });
      }).then(function (j) {
        if (j && j.error) msgEl.textContent = "Anki said: " + j.error;
        else { msgEl.textContent = "Sent to Anki."; closeMiner(); }
      }).catch(function (e) {
        diagLog("anki failed: " + (e && e.message || e));
        msgEl.textContent = "AnkiConnect is not reachable. Open Anki with the AnkiConnect add-on installed, or use CSV instead.";
      });
  }
  function minerToCsv() {
    var mel = minerEl();
    var f = minerCardFields(); if (!f) return;
    var rows = [["sentence", "reading", "words", "time", "video"]];
    rows.push([f.sentence, f.reading, f.glosses.join(" | "), f.time, f.title]);
    var csv = "\uFEFF" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var a = document.createElement("a"); a.href = url; a.download = "mined-sentence.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    if (mel) mel.querySelector("#sp-mn-msg").textContent = "CSV downloaded.";
  }
  /* ---------- Captions ---------- */
  function pickTrack(tracks, lang) {
    var exact = tracks.filter(function (t) { return t.languageCode === lang; });
    var any = tracks.filter(function (t) { return t.languageCode && t.languageCode.indexOf(lang) === 0; });
    var pool = exact.length ? exact : any;
    if (!pool.length) return null;
    var manual = pool.filter(function (t) { return t.kind !== "asr"; });
    return (manual.length ? manual : pool)[0];
  }
  function fetchCues(track) {
    if (!track || !track.baseUrl) return Promise.resolve([]);
    // Bug fix (2.1): the old check tested the wrong offset, so it was true
    // even for absolute URLs (https: puts the slashes at index 5) and the
    // origin got prepended onto an already-absolute URL, so every YouTube
    // caption fetch went to a nonsense address and came back empty.
    function withFmt(base, fmtVal) {
      var u = base;
      if (/[?&]fmt=/.test(u)) u = u.replace(/([?&]fmt=)[^&]+/, "$1" + fmtVal);
      else u += (u.indexOf("?") === -1 ? "?" : "&") + "fmt=" + fmtVal;
      if (u.indexOf("://") === -1) u = "https://www.youtube.com" + (u.charAt(0) === "/" ? "" : "/") + u;
      if (state.ytTimedTextSample) {
        try {
          var sampleU = new URL(state.ytTimedTextSample, location.href);
          var targetU = new URL(u, location.href);
          ["pot", "c", "cver", "xoaf", "xorb", "xobt", "xovt", "cbr", "cbrver"].forEach(function (k) {
            if (sampleU.searchParams.has(k) && !targetU.searchParams.has(k)) {
              targetU.searchParams.set(k, sampleU.searchParams.get(k));
            }
          });
          u = targetU.href;
        } catch (e) {}
      } else if (state.ytPot && !/[?&]pot=/.test(u)) {
        u += "&pot=" + encodeURIComponent(state.ytPot) + "&c=WEB";
      }
      return u;
    }
    var url3 = withFmt(track.baseUrl, "json3");
    diagLog("YT fetch " + (track.languageCode || "?") + " json3" + (state.ytPot ? " (with pot)" : ""));
    return fetchText(url3).then(function (txt) {
      var cues = parseJson3Text(txt);
      if (cues.length) return cues;
      diagLog("json3 empty for " + (track.languageCode || "?") + ", trying srv3/vtt");
      return fetchText(withFmt(track.baseUrl, "srv3")).then(function (t2) {
        var c2 = parseSubtitles(t2);
        if (c2.length) return c2;
        return fetchText(withFmt(track.baseUrl, "vtt")).then(function (t3) { return parseSubtitles(t3); }).catch(function () { return []; });
      }).catch(function () { return []; });
    }).catch(function () { return []; });
  }
  function handleTracks(videoId, tracks) {
    if (!tracks || !tracks.length) {
      if (!state.jpCues.length) setStatus("warn", "No caption tracks found on this video");
      return;
    }
    var videoChanged = state.currentVideoId && state.currentVideoId !== videoId;
    if (videoChanged) {
      state.jpCues = [];
      state.enCues = [];
      state.activeIndex = -1;
      state.ytPot = "";
      state.ytTimedTextSample = "";
      state.tokenCache.clear();
    }
    state.currentVideoId = videoId;
    state.tracksSeen = tracks;
    diagLog("YT tracks: " + tracks.map(function (t) { return t.languageCode + (t.kind ? "/" + t.kind : ""); }).join(", "));
    var jpTrack = pickTrack(tracks, "ja");
    var enTrack = pickTrack(tracks, "en");
    if (!jpTrack) {
      if (!state.jpCues.length) {
        setStatus("warn", "No Japanese subtitles on this video. Try another video with CC.");
        if (jpEl) jpEl.textContent = "";
        if (enEl) enEl.textContent = "";
        renderTranscript();
      }
      return;
    }
    if (state.jpCues.length && (!enTrack || state.enCues.length)) {
      hideNativeTracks();
      return;
    }
    if (!state.jpCues.length) setStatus("", "Loading Japanese subtitles");
    var label = jpTrack.kind === "asr" ? "Japanese (auto-generated)" : "Japanese subtitles";
    var pJp = state.jpCues.length ? Promise.resolve(state.jpCues) : fetchCues(jpTrack);
    var pEn = (!enTrack || state.enCues.length) ? Promise.resolve(state.enCues) : fetchCues(enTrack);
    Promise.all([pJp, pEn]).then(function (res) {
      if (state.currentVideoId && state.currentVideoId !== videoId) return;
      if (res[0] && res[0].length > state.jpCues.length) {
        state.jpCues = res[0];
        state.activeIndex = -1;
        state.tokenCache.clear();
      }
      if (res[1] && res[1].length > state.enCues.length) {
        state.enCues = res[1];
      }
      if (!state.jpCues.length) {
        diagLog("YT track fetch empty - asking player to load CC so its own request can be captured");
        setStatus("", "Requesting Japanese track from YouTube player...");
        try {
          window.postMessage({
            type: "SP_FORCE_YT_CC",
            lang: jpTrack.languageCode || "ja",
            enLang: enTrack ? enTrack.languageCode : ""
          }, "*");
        } catch (e) {}
        return;
      }
      if (enTrack && !state.enCues.length) {
        try {
          window.postMessage({
            type: "SP_FORCE_YT_CC",
            lang: enTrack.languageCode || "en",
            enLang: jpTrack.languageCode || "ja"
          }, "*");
        } catch (e) {}
      }
      clearCaptionWatchdog();
      clearLoadingWatchdog();
      setStatus("ready", label + " - " + state.jpCues.length + " lines" + (state.enCues.length ? " - EN translation on" : (enTrack ? " - loading EN..." : " - no EN track")));
      renderTranscript(); renderVocab(); updateForTime(true);
      hideNativeTracks();
    }).catch(function () {
      if (!state.jpCues.length) setStatus("warn", "Could not load subtitle files");
    });
  }

  /* ---------- Tokenizer ---------- */
  function initTokenizer() {
    // YouTube sometimes inserts its <video> after DOMContentLoaded. In 2.3.0
    // boot() only reached this function when a video already existed, so on
    // those pages subtitles loaded normally but stayed plain and unclickable.
    // Keep initialization independent of player timing and make it idempotent.
    if (state.tokenizerStatus !== "idle") return;
    if (!window.kuromoji) {
      state.tokenizerStatus = "failed";
      setStatus("warn", "Furigana engine missing. Plain subtitles still work.");
      return;
    }
    state.tokenizerStatus = "loading";
    if (!state.jpCues.length) setStatus("", "Loading furigana engine (first video only)");
    try {
      window.kuromoji.builder({ dicPath: chrome.runtime.getURL("dict/") }).build(function (err, tok) {
        if (err || !tok) {
          state.tokenizerStatus = "failed";
          diagLog("furigana engine failed" + (err && err.message ? " - " + err.message : ""));
          if (!state.jpCues.length) setStatus("warn", "Furigana unavailable. Plain subtitles still work.");
          return;
        }
        state.tokenizer = tok;
        state.tokenizerStatus = "ready";
        state.tokenCache.clear();
        diagLog("furigana engine ready");
        if (state.jpCues.length) {
          setStatus("ready", "Japanese subtitles - " + state.jpCues.length + " lines" + (state.enCues.length ? " - EN translation on" : ""));
        } else {
          setStatus("ready", "Furigana ready - pick a video with Japanese CC");
        }
        if (state.activeIndex >= 0) renderActive();
        if (state.panelOpen) renderTranscript();
      });
    } catch (e) {
      state.tokenizerStatus = "failed";
      diagLog("furigana engine failed" + (e && e.message ? " - " + e.message : ""));
      if (!state.jpCues.length) setStatus("warn", "Furigana unavailable on this page");
    }
  }

  /* ---------- Video wiring ---------- */
  var wiredVideo = null, rafId = 0;
  function tick() {
    updateForTime(false);
    // v2.3.4: YouTube sometimes swaps the <video> element mid-playback
    // (ad transitions, quality changes). The old element goes paused, the
    // rAF loop below stops scheduling itself, and the new element never
    // fires "play" because it is already playing, so captions froze.
    // Re-wire to the live element and keep the loop alive.
    var cur = videoEl();
    if (cur && cur !== wiredVideo) wireVideo();
    cur = wiredVideo;
    if (cur && !cur.paused && !cur.ended) rafId = requestAnimationFrame(tick);
  }
  function wireVideo() {
    var v = videoEl(); if (!v || v === wiredVideo) return;
    wiredVideo = v;
    v.addEventListener("play", function () { cancelAnimationFrame(rafId); tick(); hideNativeTracks(); pollNativeTracks(); setTimeout(pollNativeTracks, 1200); setTimeout(pollNativeTracks, 3500); });
    v.addEventListener("pause", function () { cancelAnimationFrame(rafId); updateForTime(false); });
    v.addEventListener("seeked", function () { updateForTime(true); });
    v.addEventListener("timeupdate", function () { updateForTime(false); });
    try { v.playbackRate = Number((document.getElementById("sp-speed") || {}).value || 1); } catch (e) {}
    // v2.3.4: a freshly swapped-in element is already playing, so no "play"
    // event will arrive. Kick the caption loop directly.
    if (!v.paused && !v.ended) { cancelAnimationFrame(rafId); tick(); }
  }

  function ensureServices() {
    initTokenizer();
    loadDictionary();
  }
  function saveSettings() {
    try {
      chrome.storage.local.set({
        sp_settings: {
          enabled: state.enabled,
          furigana: state.furigana,
          furiganaMode: state.furiganaMode,
          translation: state.translation,
          autoPause: state.autoPause,
          subOffset: state.subOffset,
          theme: state.theme,
          listeningMode: state.listeningMode,
          groupVerbs: state.groupVerbs,
          pitchColors: state.pitchColors,
          hoverPause: state.hoverPause,
          controlsCollapsed: state.controlsCollapsed,
          caption: state.caption
        }
      });
    } catch (e) {}
  }
  function applySettingsObject(s) {
    if (!s || typeof s !== "object") return;
    state.enabled = s.enabled !== false;
    state.furigana = s.furigana !== false;
    if (s.furiganaMode) state.furiganaMode = s.furiganaMode;
    state.translation = s.translation !== false;
    state.autoPause = s.autoPause === true;
    if (typeof s.subOffset === "number" && isFinite(s.subOffset)) state.subOffset = s.subOffset;
    if (s.theme) state.theme = s.theme;
    if (s.listeningMode) state.listeningMode = s.listeningMode;
    state.groupVerbs = s.groupVerbs !== false;
    state.pitchColors = s.pitchColors === true;
    state.hoverPause = s.hoverPause === true;
    if (typeof s.controlsCollapsed === "boolean") state.controlsCollapsed = s.controlsCollapsed;
    if (s.caption && typeof s.caption === "object") {
      var cc = s.caption;
      if (cc.fontSize) state.caption.fontSize = cc.fontSize;
      if (cc.bg != null) state.caption.bg = cc.bg;
      if (cc.known != null) state.caption.known = cc.known;
      if (cc.text) state.caption.text = cc.text;
      if (cc.hover) state.caption.hover = cc.hover;
      if (cc.pos && typeof cc.pos.x === "number" && typeof cc.pos.y === "number") state.caption.pos = cc.pos;
    }
  }
  function loadPersisted() {
    try {
      chrome.storage.local.get(["sp_settings", "sp_vocab", "sp_known", "sp_anki", "sp_jimaku", "sp_ai"], function (res) {
        if (res.sp_settings) applySettingsObject(res.sp_settings);
        if (Array.isArray(res.sp_vocab)) state.vocab = res.sp_vocab;
        if (res.sp_known && typeof res.sp_known === "object") state.known = res.sp_known;
        if (res.sp_anki && typeof res.sp_anki === "object") {
          if (res.sp_anki.deck) state.anki.deck = String(res.sp_anki.deck);
          if (res.sp_anki.model) state.anki.model = String(res.sp_anki.model);
          if (typeof res.sp_anki.tags === "string") state.anki.tags = res.sp_anki.tags;
          if (typeof res.sp_anki.sentenceField === "string") state.anki.sentenceField = res.sp_anki.sentenceField;
          if (typeof res.sp_anki.readingField === "string") state.anki.readingField = res.sp_anki.readingField;
          if (typeof res.sp_anki.meaningField === "string") state.anki.meaningField = res.sp_anki.meaningField;
          if (typeof res.sp_anki.pictureField === "string") state.anki.pictureField = res.sp_anki.pictureField;
          if (typeof res.sp_anki.audioField === "string") state.anki.audioField = res.sp_anki.audioField;
          state.anki.includeScreenshot = res.sp_anki.includeScreenshot !== false;
        }
        if (res.sp_jimaku && typeof res.sp_jimaku === "object" && typeof res.sp_jimaku.jimakuKey === "string") {
          state.jimakuKey = res.sp_jimaku.jimakuKey;
        } else if (res.sp_ai && typeof res.sp_ai === "object" && typeof res.sp_ai.jimakuKey === "string") {
          state.jimakuKey = res.sp_ai.jimakuKey;
        }
        applyToggles(); renderVocab();
      });
    } catch (e) {
      try { state.vocab = JSON.parse(localStorage.getItem("sp_vocab") || "[]"); } catch (e2) {}
      renderVocab();
    }
  }
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local") return;
      if (changes.sp_settings && changes.sp_settings.newValue) {
        applySettingsObject(changes.sp_settings.newValue);
        applyToggles();
        if (state.activeIndex >= 0) renderActive();
      }
      if (changes.sp_known && changes.sp_known.newValue) {
        state.known = changes.sp_known.newValue;
        if (state.activeIndex >= 0) renderActive();
        if (state.panelOpen) { renderTranscript(); renderEpisodeWords(); }
      }
      if (changes.sp_jimaku && changes.sp_jimaku.newValue) {
        state.jimakuKey = changes.sp_jimaku.newValue.jimakuKey || "";
      }
      if (changes.sp_anki && changes.sp_anki.newValue) {
        var na = changes.sp_anki.newValue;
        if (typeof na.includeScreenshot === "boolean") {
          state.anki.includeScreenshot = na.includeScreenshot;
          if (minerPanel) {
            var chk = minerPanel.querySelector("#sp-mn-shot-chk");
            var shotImg = minerPanel.querySelector("#sp-mn-shot");
            var retakeBtn = minerPanel.querySelector("#sp-mn-retake");
            if (chk) chk.checked = na.includeScreenshot;
            if (!na.includeScreenshot) {
              if (shotImg) shotImg.style.display = "none";
              if (retakeBtn) retakeBtn.style.display = "none";
            } else {
              if (retakeBtn) retakeBtn.style.display = "";
              if (minerShot && shotImg) { shotImg.src = minerShot; shotImg.style.display = ""; }
            }
          }
        }
      }
    });
  } catch (e) {}
  /* ---------- Boot ---------- */
  /* The page-world bridge (injected.js) is declared in manifest.json as a
     content script with world:"MAIN". There is intentionally NO DOM
     <script> injection here: YouTube's Trusted Types CSP blocks inline
     script injection, which used to wedge the UI on "loading". */
  var captionWatchdog = null;
  function clearCaptionWatchdog() { if (captionWatchdog) { clearTimeout(captionWatchdog); captionWatchdog = null; } }
  function armCaptionWatchdog() {
    clearCaptionWatchdog();
    captionWatchdog = setTimeout(function () {
      captionWatchdog = null;
      if (!state.jpCues.length) {
        setStatus("warn", "No subtitles found yet. Press play, turn the player's CC on, or use Load sub to add an .srt/.vtt file.");
      }
    }, 12000);
  }
  function getYouTubeVideoId() {
    try {
      var u = new URL(location.href);
      var v = u.searchParams.get("v");
      if (v) return v;
      var m = u.pathname.match(/\/(?:shorts|embed|live)\/([^/?#]+)/);
      return m ? m[1] : "";
    } catch (e) { return ""; }
  }
  window.addEventListener("message", function (ev) {
    if (ev.source !== window || !ev.data) return;
    if (ev.data.type === "SP_YT_POT") {
      if (ev.data.pot) state.ytPot = ev.data.pot;
      if (ev.data.sampleUrl) state.ytTimedTextSample = ev.data.sampleUrl;
      if (state.tracksSeen && state.tracksSeen.length && (!state.jpCues.length || !state.enCues.length)) {
        handleTracks(state.currentVideoId || ev.data.videoId || getYouTubeVideoId(), state.tracksSeen);
      }
      return;
    }
    if (ev.data.type === "SP_GENERIC_SUB_URL") { ensureServices(); ensureRoot(); addDiscovered(ev.data.url); return; }
    if (ev.data.type === "SP_GENERIC_SUB_TEXT") { ensureServices(); ensureRoot(); loadSubtitleText(ev.data.text, ev.data.url); return; }
    if (ev.data.type === "SP_CAPTION_TRACKS") {
      clearCaptionWatchdog();
      ensureServices(); ensureRoot(); handleTracks(ev.data.videoId, ev.data.tracks);
      return;
    }
    if (ev.data.type === "SP_CAPTION_UNAVAILABLE") {
      clearCaptionWatchdog();
      ensureRoot();
      if (!state.jpCues.length) setStatus("warn", "No subtitles found yet. Press play, turn the player's CC on, or use Load sub to add an .srt/.vtt file.");
    }
  });
  function boot() {
    loadPersisted();
    if ( /(^|\.)youtube\.com$/.test(location.hostname) || videoEl() ) ensureServices();
    if (ensureRoot()) { wireVideo(); updateForTime(true); armCaptionWatchdog(); }
    try { window.postMessage({ type: "SP_REQUEST_TRACKS" }, "*"); } catch (e) {}
  }
  var bootTimer = setInterval(function () {
    if (ensureRoot()) { wireVideo(); pollNativeTracks(); }
  }, 1500);
  try {
    new MutationObserver(function () { if (ensureRoot()) wireVideo(); }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  document.addEventListener("fullscreenchange", syncFullscreenParent);
  document.addEventListener("webkitfullscreenchange", syncFullscreenParent);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  document.addEventListener("yt-navigate-finish", function () {
    var newVid = getYouTubeVideoId();
    // YouTube fires yt-navigate-finish on initial hydration too. If we already
    // have subtitles (or are actively loading) for this exact videoId, do NOT
    // wipe them or tear down #sp-root.
    if (newVid && newVid === state.currentVideoId && state.jpCues.length) {
      ensureRoot();
      wireVideo();
      updateForTime(true);
      return;
    }
    if (!newVid || newVid !== state.currentVideoId) {
      state.jpCues = [];
      state.enCues = [];
      state.activeIndex = -1;
      state.currentVideoId = newVid || "";
      state.ytPot = "";
      state.ytTimedTextSample = "";
      state.autoTried = {};
      state.autoLoadedFrom = "";
      state.discovered = [];
      state.discoveredSet = {};
      state.diag = [];
      state.tracksSeen = [];
      state.tokenCache.clear();
      if (jpEl) jpEl.textContent = "";
      if (enEl) enEl.textContent = "";
    }
    ensureRoot();
    wireVideo();
    loadPersisted();
    armCaptionWatchdog();
    try { window.postMessage({ type: "SP_REQUEST_TRACKS" }, "*"); } catch (e) {}
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || ev.target.isContentEditable) return;
    if (!state.enabled || !state.jpCues.length || !videoEl()) return;
    var k = ev.key;
    if (k === "r" || k === "R") { ev.preventDefault(); replay(); }
    else if (k === "F" && ev.shiftKey) { ev.preventDefault(); state.furigana = !state.furigana; applyToggles(); saveSettings(); }
    else if (k === "E" && ev.shiftKey) { ev.preventDefault(); state.translation = !state.translation; applyToggles(); saveSettings(); }
    else if (k === "p" || k === "P") { ev.preventDefault(); state.autoPause = !state.autoPause; state.autoPausedForIndex = -1; if (state.autoPause) state.loop = false; applyToggles(); saveSettings(); }
    else if (k === "[") { ev.preventDefault(); shiftSubOffset(-0.25, false); }
    else if (k === "]") { ev.preventDefault(); shiftSubOffset(0.25, false); }
    else if (k === "\\") { ev.preventDefault(); shiftSubOffset(0, true); }
  });
  function hasActivePlayer() {
    return !!(videoEl() || state.jpCues.length || state.discovered.length);
  }
  function respondFromPlayerFrame(sendResponse, buildResp) {
    if (hasActivePlayer()) {
      sendResponse(buildResp());
      return true;
    }
    // Non-top frames without a video player should ignore tab broadcasts so
    // they never beat the actual player frame.
    if (window !== window.top) return false;
    // Top frame without a direct <video> (e.g. Crunchyroll parent page hosting
    // a cross-origin player iframe): wait briefly so the player iframe can
    // respond first; if no iframe responds, reply as fallback.
    if (document.querySelector("iframe")) {
      setTimeout(function () { try { sendResponse(buildResp()); } catch (e) {} }, 90);
      return true;
    }
    sendResponse(buildResp());
    return true;
  }
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg && msg.type === "SP_GET_STATE") {
      return respondFromPlayerFrame(sendResponse, function () {
        return { enabled: state.enabled, furigana: state.furigana, furiganaMode: state.furiganaMode, translation: state.translation, autoPause: state.autoPause, subOffset: state.subOffset, theme: state.theme, listeningMode: state.listeningMode, groupVerbs: state.groupVerbs, pitchColors: state.pitchColors, hoverPause: state.hoverPause, caption: state.caption, vocabCount: state.vocab.length, lines: state.jpCues.length, enLines: state.enCues.length, found: state.discovered.length, tracks: (state.tracksSeen || []).map(function (t) { return t.languageCode; }), native: state.nativeInfo || [], dict: state.dictStatus, dictWords: state.dict ? Object.keys(state.dict).length : 0, diag: (state.diag || []).slice(0, 8) };
      });
    }
    if (msg && msg.type === "SP_SET") {
      if (typeof msg.enabled === "boolean") state.enabled = msg.enabled;
      if (typeof msg.furigana === "boolean") state.furigana = msg.furigana;
      if (typeof msg.furiganaMode === "string") state.furiganaMode = msg.furiganaMode;
      if (typeof msg.translation === "boolean") state.translation = msg.translation;
      if (typeof msg.autoPause === "boolean") { state.autoPause = msg.autoPause; state.autoPausedForIndex = -1; if (state.autoPause) state.loop = false; }
      if (typeof msg.subOffset === "number" && isFinite(msg.subOffset)) state.subOffset = msg.subOffset;
      if (typeof msg.theme === "string") state.theme = msg.theme;
      if (typeof msg.listeningMode === "string") state.listeningMode = msg.listeningMode;
      if (typeof msg.groupVerbs === "boolean") state.groupVerbs = msg.groupVerbs;
      if (typeof msg.pitchColors === "boolean") state.pitchColors = msg.pitchColors;
      if (typeof msg.hoverPause === "boolean") state.hoverPause = msg.hoverPause;
      if (msg.caption && typeof msg.caption === "object") {
        var nc = msg.caption;
        if (nc.fontSize) state.caption.fontSize = nc.fontSize;
        if (nc.bg != null) state.caption.bg = nc.bg;
        if (nc.known != null) state.caption.known = nc.known;
        if (nc.text) state.caption.text = nc.text;
        if (nc.hover) state.caption.hover = nc.hover;
      }
      applyToggles(); updateForTime(true); saveSettings();
      return respondFromPlayerFrame(sendResponse, function () { return { ok: true }; });
    }
    if (msg && msg.type === "SP_TOGGLE_PANEL") {
      return respondFromPlayerFrame(sendResponse, function () {
        if (!ensureRoot()) return { ok: false, error: "no-player" };
        togglePanel();
        return { ok: true };
      });
    }
    if (msg && msg.type === "SP_MINE") {
      if (!videoEl() && window !== window.top) return false;
      return respondFromPlayerFrame(sendResponse, function () {
        if (!ensureRoot()) return { ok: false, error: "no-player" };
        var mined = false;
        try { mined = openMiner() === true; } catch (e) { mined = false; }
        return mined ? { ok: true } : { ok: false, error: "no-cue" };
      });
    }
    if (msg && msg.type === "SP_LOAD_SUB") {
      return respondFromPlayerFrame(sendResponse, function () {
        var loaded = false;
        try { loaded = ensureRoot() && loadSubFile(); } catch (e) { loaded = false; }
        return loaded ? { ok: true } : { ok: false, error: "no-player" };
      });
    }
    if (msg && msg.type === "SP_SUBS") {
      return respondFromPlayerFrame(sendResponse, function () {
        if (!ensureRoot()) return { ok: false, error: "no-player" };
        var menuOpen = false;
        try { menuOpen = toggleSubsMenu(); } catch (e) { menuOpen = false; }
        return { ok: true, open: menuOpen };
      });
    }
    if (msg && msg.type === "SP_ANKI_GET") {
      if (window !== window.top && !hasActivePlayer()) return false;
      sendResponse({ ok: true, anki: state.anki });
      return true;
    }
    if (msg && msg.type === "SP_ANKI_SET") {
      if (msg.anki && typeof msg.anki === "object") {
        if (typeof msg.anki.deck === "string" && msg.anki.deck) state.anki.deck = msg.anki.deck;
        if (typeof msg.anki.model === "string" && msg.anki.model) state.anki.model = msg.anki.model;
        if (typeof msg.anki.tags === "string") state.anki.tags = msg.anki.tags;
        if (typeof msg.anki.sentenceField === "string") state.anki.sentenceField = msg.anki.sentenceField;
        if (typeof msg.anki.readingField === "string") state.anki.readingField = msg.anki.readingField;
        if (typeof msg.anki.meaningField === "string") state.anki.meaningField = msg.anki.meaningField;
        if (typeof msg.anki.pictureField === "string") state.anki.pictureField = msg.anki.pictureField;
        if (typeof msg.anki.audioField === "string") state.anki.audioField = msg.anki.audioField;
        if (typeof msg.anki.includeScreenshot === "boolean") state.anki.includeScreenshot = msg.anki.includeScreenshot;
        try { chrome.storage.local.set({ sp_anki: state.anki }); } catch (e) {}
      }
      if (window !== window.top && !hasActivePlayer()) return false;
      sendResponse({ ok: true });
      return true;
    }
    if (msg && msg.type === "SP_JIMAKU_SET") {
      if (typeof msg.jimakuKey === "string") state.jimakuKey = msg.jimakuKey;
      if (window !== window.top && !hasActivePlayer()) return false;
      sendResponse({ ok: true });
      return true;
    }
    if (msg && msg.type === "SP_KNOWN_REFRESH") {
      try {
        chrome.storage.local.get(["sp_known"], function (res) {
          if (res && res.sp_known && typeof res.sp_known === "object") state.known = res.sp_known;
          if (state.activeIndex >= 0) renderActive();
          if (state.panelOpen) { renderTranscript(); renderEpisodeWords(); }
        });
      } catch (e) {}
      if (window !== window.top && !hasActivePlayer()) return false;
      sendResponse({ ok: true });
      return true;
    }
    if (msg && msg.type === "SP_ANKI_TEST") {
      if (window !== window.top && !hasActivePlayer()) return false;
      ankiRequest({ action: "version", version: 6 }).then(function (v) {
        var ver = (v && typeof v === "object" && v.result != null) ? v.result : v;
        sendResponse({ ok: true, version: ver });
      }).catch(function (e) {
        sendResponse({ ok: false, error: (e && e.message) || "unreachable" });
      });
      return true;
    }
    if (msg && msg.type === "SP_KNOWN_COUNT") {
      if (window !== window.top && !hasActivePlayer()) return false;
      sendResponse({ ok: true, count: Object.keys(state.known).length });
      return true;
    }
    if (msg && msg.type === "SP_KNOWN_CLEAR") {
      state.known = {}; persistKnown();
      if (state.activeIndex >= 0) renderActive();
      if (window !== window.top && !hasActivePlayer()) return false;
      sendResponse({ ok: true });
      return true;
    }
    if (msg && msg.type === "SP_KNOWN_BULK") {
      if (window !== window.top && !hasActivePlayer()) return false;
      var order = ["N5", "N4", "N3", "N2", "N1"];
      var maxIdx = order.indexOf(msg.level || "N5");
      if (maxIdx < 0) maxIdx = 0;
      loadJlpt().then(function () {
        var added = 0;
        Object.keys(jlptData).forEach(function (w) {
          if (order.indexOf(jlptData[w]) <= maxIdx && !state.known[w]) { state.known[w] = 1; added++; }
        });
        persistKnown();
        if (state.activeIndex >= 0) renderActive();
        sendResponse({ ok: true, added: added, total: Object.keys(state.known).length });
      });
      return true;
    }
  });
})();
