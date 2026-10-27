(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SPTokenRefiner = api;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  var KATAKANA_RE = /^[\u30a1-\u30fa\u30fc\u30fd\u30fe]+$/;
  var DASH_RE = /^ー+$/;
  var MIN_RUN = 4;        // shortest katakana run worth attempting to split
  var MIN_CHUNK = 2;      // shortest dictionary chunk considered (JMdict path)
  var LEGACY_MIN_CHUNK = 4; // shortest chunk considered (IPADIC-only fallback path)
  var MAX_CHUNK = 16;
  var MIN_COVERAGE = 0.5; // known chars / total chars required to accept a split
  var MIN_UNKNOWN_PIECE = 4; // unknown fragments must be this long, so names
                             // like タナカタロウ cannot shred into タ|ナカ|タロウ

  function isKatakanaRun(text) {
    return KATAKANA_RE.test(text || "") && Array.from(text).length >= MIN_RUN;
  }

  function oneKnownToken(tokenizer, text) {
    try {
      var result = tokenizer.tokenize(text);
      return result.length === 1 && result[0].word_type === "KNOWN" && result[0].surface_form === text ? result[0] : null;
    } catch (e) {
      return null;
    }
  }

  function synthKnownToken(template, text) {
    // Katakana reads itself, so a synthesized token is always correct on reading.
    return Object.assign({}, template, {
      word_type: "KNOWN",
      surface_form: text,
      basic_form: text,
      reading: text,
      pronunciation: text,
      pos: "\u540d\u8a5e",
      pos_detail_1: "\u4e00\u822c",
      pos_detail_2: "*",
      pos_detail_3: "*",
      conjugated_type: "*",
      conjugated_form: "*"
    });
  }

  // IPADIC treats an uninterrupted unknown katakana run as one proper noun.
  // Auto-captions remove spaces, so several ordinary loanwords can become one
  // giant click target. Recover dictionary words inside the run with a
  // longest-match dynamic program. When the bundled JMdict is available
  // (opts.hasWord), chunks as short as 2 characters are considered and a
  // split is only accepted when known chunks cover most of the run, so names
  // like ヒカキン are left alone. Without the dictionary, fall back to the
  // conservative IPADIC-only behavior (4+ character chunks).
  function splitKatakanaRun(token, tokenizer, hasWord) {
    var text = (token && token.surface_form) || "";
    if (!tokenizer || !isKatakanaRun(text)) return [token];
    if (token.word_type === "KNOWN") {
      // Only re-split a known token when the bundled dictionary cannot define
      // the whole thing, meaning IPADIC glued a compound JMdict never heard of.
      if (!hasWord || hasWord(text)) return [token];
    } else if (token.word_type !== "UNKNOWN") {
      return [token];
    }

    var minChunk = hasWord ? MIN_CHUNK : LEGACY_MIN_CHUNK;
    var isWord = hasWord
      ? function (part) { return hasWord(part); }
      : function (part) { return part.length >= LEGACY_MIN_CHUNK && !!oneKnownToken(tokenizer, part); };

    // IPADIC's unknown-word handler sometimes leaves a trailing ー run
    // outside the token (インターネットエクスプローラー + ー). The coverage
    // rule below exempts it, and the merge pass in refine() folds it back.
    var chars = Array.from(text), n = chars.length;
    var best = new Array(n + 1), prev = new Array(n + 1);
    best[0] = 0;
    for (var i = 0; i < n; i++) {
      if (typeof best[i] !== "number") continue;
      var unknownScore = best[i] - 1;
      if (typeof best[i + 1] !== "number" || unknownScore > best[i + 1]) {
        best[i + 1] = unknownScore;
        prev[i + 1] = { at: i, text: chars[i], known: false };
      }
      for (var j = i + minChunk; j <= n && j <= i + MAX_CHUNK; j++) {
        var part = chars.slice(i, j).join("");
        if (!isWord(part)) continue;
        var score = best[i] + ((j - i) * (j - i)) + 3;
        if (typeof best[j] !== "number" || score > best[j]) {
          best[j] = score;
          prev[j] = { at: i, text: part, known: true };
        }
      }
    }

    var pieces = [], cursor = n, knownChars = 0, knownCount = 0, maxKnownLen = 0;
    while (cursor > 0 && prev[cursor]) {
      var step = prev[cursor];
      pieces.unshift(step);
      if (step.known) {
        var pieceLen = Array.from(step.text).length;
        knownChars += pieceLen; knownCount++;
        if (pieceLen > maxKnownLen) maxKnownLen = pieceLen;
      }
      cursor = step.at;
    }
    if (cursor !== 0 || !knownCount) return [token];
    if (hasWord) {
      // With the dictionary available, demand real coverage, forbid tiny
      // unknown fragments, and require at least one chunk of 3+ characters,
      // so coincidental 2-character matches (アク|オス inside アクオス,
      // アリ inside アリス, タ|ナカ|タロウ) cannot shred names and brand
      // words into nonsense pieces. A trailing run of bare ー marks is
      // IPADIC's unknown-word quirk, not a real fragment, so it is exempt
      // from the fragment-size rule.
      var end = pieces.length;
      while (end > 0 && !pieces[end - 1].known && DASH_RE.test(pieces[end - 1].text)) end--;
      var unknownRuns = [], runLen = 0;
      pieces.slice(0, end).forEach(function (p) {
        if (p.known) { if (runLen) { unknownRuns.push(runLen); runLen = 0; } }
        else runLen += Array.from(p.text).length;
      });
      if (runLen) unknownRuns.push(runLen);
      var minUnknown = unknownRuns.length ? Math.min.apply(null, unknownRuns) : Infinity;
      if (knownChars / n < MIN_COVERAGE || minUnknown < MIN_UNKNOWN_PIECE || maxKnownLen < 3) return [token];
      // A 2-character chunk is only trustworthy next to a longer word.
      // Otherwise coincidental pairs (アク|オス inside the brand name
      // アクオス) shred real words, while anchored pairs (タイ|ヌードル,
      // カキ|フライ) still split.
      for (var pi = 0; pi < pieces.length; pi++) {
        var pc = pieces[pi];
        if (!pc.known || Array.from(pc.text).length !== 2) continue;
        var anchored = false;
        for (var qi = pi - 1; qi <= pi + 1; qi++) {
          if (qi === pi || qi < 0 || qi >= pieces.length) continue;
          var nb = pieces[qi];
          if (nb.known && Array.from(nb.text).length >= 3) { anchored = true; break; }
        }
        if (!anchored) return [token];
      }
    }

    var output = [];
    pieces.forEach(function (piece) {
      if (piece.known) {
        output.push(oneKnownToken(tokenizer, piece.text) || synthKnownToken(token, piece.text));
        return;
      }
      var last = output[output.length - 1];
      if (last && last.__spUnknownPiece) {
        last.surface_form += piece.text;
        last.reading = last.surface_form;
      } else {
        output.push(Object.assign({}, token, {
          word_type: "UNKNOWN",
          surface_form: piece.text,
          basic_form: "*",
          reading: piece.text,
          pronunciation: undefined,
          __spUnknownPiece: true
        }));
      }
    });
    output.forEach(function (item) { if (item && item.__spUnknownPiece) delete item.__spUnknownPiece; });
    return output;
  }

  // Katakana reads itself: even an unsplittable katakana token deserves a
  // reading so the word card and the romaji line stay useful.
  function ensureKatakanaReading(token) {
    if (token && token.word_type === "UNKNOWN" && !token.reading &&
        KATAKANA_RE.test(token.surface_form || "")) {
      token.reading = token.surface_form;
    }
    return token;
  }

  function refine(tokens, tokenizer, opts) {
    var hasWord = opts && typeof opts.hasWord === "function" ? opts.hasWord : null;
    var result = [];
    (tokens || []).forEach(function (token) {
      splitKatakanaRun(token, tokenizer, hasWord).forEach(function (part) {
        result.push(ensureKatakanaReading(part));
      });
    });
    if (hasWord) {
      // Kuromoji/IPADIC sometimes splits a real katakana word into pieces
      // (ガン|ダム for ガンダム). Fuse adjacent katakana tokens when the fused
      // form is a dictionary word. Only short pieces (2 chars or fewer) are
      // fused: longer adjacent words like チョコレート|ケーキ are legitimate
      // click targets on their own, and fusing them would only remove
      // interactivity. The dictionary-membership requirement keeps this from
      // gluing words that merely sit next to each other.
      var fused = [];
      result.forEach(function (tok) {
        var prevTok = fused[fused.length - 1];
        var prevLen = prevTok ? Array.from(prevTok.surface_form || "").length : 0;
        var tokLen = tok ? Array.from(tok.surface_form || "").length : 0;
        var word = prevTok && tok ? prevTok.surface_form + tok.surface_form : "";
        if (prevTok && tok && Math.min(prevLen, tokLen) <= 2 &&
            KATAKANA_RE.test(prevTok.surface_form || "") &&
            KATAKANA_RE.test(tok.surface_form || "") && hasWord(word)) {
          prevTok.surface_form = word;
          prevTok.basic_form = word;
          if (prevTok.reading && KATAKANA_RE.test(prevTok.reading) &&
              tok.reading && KATAKANA_RE.test(tok.reading)) {
            prevTok.reading = prevTok.reading + tok.reading;
          } else {
            prevTok.reading = word; // katakana reads itself
          }
          return;
        }
        fused.push(tok);
      });
      result = fused;
    }
    // IPADIC's unknown-word handler sometimes strands a bare ー run after a
    // katakana token (インターネットエクスプローラー + ー). Fold it back into
    // the previous katakana token when that token is a real dictionary word,
    // so the defined word keeps its definition instead of becoming unknown.
    if (hasWord) {
      var merged = [];
      result.forEach(function (tok) {
        var prevTok = merged[merged.length - 1];
        if (tok && tok.word_type === "UNKNOWN" && DASH_RE.test(tok.surface_form || "") &&
            prevTok && KATAKANA_RE.test(prevTok.surface_form || "") &&
            hasWord(prevTok.surface_form)) {
          prevTok.surface_form += tok.surface_form;
          if (prevTok.reading && KATAKANA_RE.test(prevTok.reading)) prevTok.reading += tok.surface_form;
          return;
        }
        merged.push(tok);
      });
      result = merged;
    }
    if (!opts || opts.groupVerbs !== false) {
      result = groupInflections(result, hasWord);
    }
    return result;
  }

  /* ---------- 1. Compound Verb & Auxiliary Grouping ---------- */
  var AUX_LABELS = {
    "ます": "Polite (~ます)",
    "た": "Past/Completed (~た)",
    "だ": "Copula/Past",
    "ない": "Negative (~ない)",
    "ぬ": "Negative (~ぬ)",
    "ん": "Negative (~ん)",
    "たい": "Desire (~たい)",
    "たがる": "3rd-person Desire (~たがる)",
    "れる": "Passive/Potential (~れる)",
    "られる": "Passive/Potential (~られる)",
    "せる": "Causative (~せる)",
    "させる": "Causative (~させる)",
    "우": "Volitional (~う)",
    "う": "Volitional (~う)",
    "よう": "Volitional (~よう)",
    "まい": "Negative Volitional (~まい)",
    "らしい": "Conjecture (~らしい)",
    "そう": "Appearance/Hearsay (~そう)",
    "べし": "Obligation (~べき)",
    "べき": "Obligation (~べき)",
    "いる": "Continuous/State (~ている)",
    "てる": "Continuous (~てる)",
    "でる": "Continuous (~でる)",
    "しまう": "Completion/Regret (~てしまう)",
    "ちゃう": "Completion/Casual (~ちゃう)",
    "じゃう": "Completion/Casual (~じゃう)",
    "みる": "Try doing (~てみる)",
    "おく": "Preparation (~ておく)",
    "とく": "Preparation/Casual (~とく)",
    "どく": "Preparation/Casual (~どく)",
    "いく": "Progression (~ていく)",
    "くる": "Emergence (~てくる)",
    "あげる": "Benefactive (~てあげる)",
    "くれる": "Benefactive (~てくれる)",
    "もらう": "Benefactive (~てもらう)",
    "ほしい": "Request (~てほしい)"
  };

  function isVerbOrAdjHead(tok) {
    if (!tok) return false;
    if ((tok.pos === "動詞" || tok.pos === "形容詞") && tok.pos_detail_1 === "自立") return true;
    return false;
  }

  function isTrailingInflection(tok, nextTok) {
    if (!tok) return false;
    var pos = tok.pos || "", d1 = tok.pos_detail_1 || "", surf = tok.surface_form || "", base = tok.basic_form || "";
    if (pos === "助動詞") {
      // Avoid swallowing standalone copula だ/です at the end of a noun, only attach to verb/adj chains
      return true;
    }
    if ((pos === "動詞" || pos === "形容詞") && (d1 === "非自立" || d1 === "接尾")) return true;
    if (pos === "助詞" && d1 === "接続助詞" && (surf === "て" || surf === "で" || surf === "ちゃ" || surf === "じゃ" || surf === "ば" || surf === "たら" || surf === "ても" || surf === "でも")) {
      // Always attach て/で/ば/たら to the preceding verb/adj
      return true;
    }
    // Negative なく / なくて inside an adjective/auxiliary chain
    if (pos === "助詞" && surf === "て" && nextTok && (nextTok.pos_detail_1 === "非自立" || nextTok.pos === "助動詞")) return true;
    if (base === "ない" && (pos === "形容詞" || pos === "助動詞")) return true;
    return false;
  }

  function describeChainToken(tok) {
    if (!tok) return "";
    var base = (tok.basic_form && tok.basic_form !== "*") ? tok.basic_form : (tok.surface_form || "");
    var surf = tok.surface_form || "";
    if (AUX_LABELS[base]) return AUX_LABELS[base];
    if (AUX_LABELS[surf]) return AUX_LABELS[surf];
    if (tok.pos === "助詞" && (surf === "ば" || surf === "たら")) return "Conditional (~" + surf + ")";
    if (tok.pos === "助詞" && (surf === "ても" || surf === "でも")) return "Concessive (~" + surf + ")";
    if (tok.pos === "助詞" && (surf === "て" || surf === "で")) return "Te-form (~" + surf + ")";
    if (tok.conjugated_form && tok.conjugated_form.indexOf("未然") === 0) return "Irrealis stem";
    return "";
  }

  function groupInflections(tokens, hasWord) {
    if (!Array.isArray(tokens) || !tokens.length) return tokens || [];
    var out = [];
    var i = 0;
    while (i < tokens.length) {
      var cur = Object.assign({}, tokens[i]);
      // Suru-verb fusion: 名詞(サ変接続) + する -> single verb phrase
      if (cur.pos === "名詞" && cur.pos_detail_1 === "サ変接続" &&
          i + 1 < tokens.length && tokens[i + 1].pos === "動詞" &&
          (tokens[i + 1].basic_form === "する" || tokens[i + 1].basic_form === "できる")) {
        var suruTok = tokens[i + 1];
        var combinedBase = cur.surface_form + suruTok.basic_form;
        var rootBase = (hasWord && hasWord(combinedBase)) ? combinedBase : ((cur.basic_form && cur.basic_form !== "*") ? cur.basic_form : cur.surface_form);
        cur.surface_form = (cur.surface_form || "") + (suruTok.surface_form || "");
        cur.basic_form = rootBase;
        cur.pos = "動詞";
        cur.pos_detail_1 = "自立";
        if (cur.reading && cur.reading !== "*" && suruTok.reading && suruTok.reading !== "*") {
          cur.reading = cur.reading + suruTok.reading;
        }
        cur.grammarNotes = ["Suru-verb (~" + suruTok.basic_form + ")"];
        i += 2;
      } else if (isVerbOrAdjHead(cur)) {
        cur.grammarNotes = [];
        i++;
      } else {
        out.push(cur);
        i++;
        continue;
      }

      // Greedily absorb trailing auxiliary/dependent verb chain
      while (i < tokens.length && isTrailingInflection(tokens[i], tokens[i + 1])) {
        var nxt = tokens[i];
        cur.surface_form = (cur.surface_form || "") + (nxt.surface_form || "");
        if (cur.reading && cur.reading !== "*" && nxt.reading && nxt.reading !== "*") {
          cur.reading = cur.reading + nxt.reading;
        }
        var label = describeChainToken(nxt);
        if (label && cur.grammarNotes.indexOf(label) === -1) {
          // If a later auxiliary explains a て-form (e.g. ている), replace bare "Te-form" with the specific construction
          if (label.indexOf("(~て") !== -1 || label.indexOf("(~ちゃ") !== -1 || label.indexOf("(~じゃ") !== -1) {
            cur.grammarNotes = cur.grammarNotes.filter(function (g) { return g.indexOf("Te-form") !== 0; });
          }
          cur.grammarNotes.push(label);
        }
        i++;
      }
      if (cur.grammarNotes && cur.grammarNotes.length) {
        cur.grammarNote = cur.grammarNotes.join(" · ");
      }
      out.push(cur);
    }
    return out;
  }

  /* ---------- 3. Mora Splitter & Pitch Accent Analyzer ---------- */
  var SMALL_Y_VOWEL = /^[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]$/;
  function splitMoras(kana) {
    var s = String(kana || "");
    var chars = Array.from(s);
    var moras = [];
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (moras.length && SMALL_Y_VOWEL.test(c)) {
        moras[moras.length - 1] += c;
      } else {
        moras.push(c);
      }
    }
    return moras;
  }

  function analyzePitch(readingHira, pitchStr) {
    if (!readingHira || pitchStr == null || pitchStr === "") return null;
    var firstNumStr = String(pitchStr).split(",")[0].trim();
    var n = parseInt(firstNumStr, 10);
    if (isNaN(n) || n < 0) return null;
    var moras = splitMoras(readingHira);
    if (!moras.length) return null;
    var mLen = moras.length;
    var heights = [];
    for (var i = 0; i <= mLen; i++) {
      var pos = i + 1; // 1-indexed mora position; mLen + 1 is the following particle
      if (n === 0) {
        heights.push(pos === 1 ? 0 : 1);
      } else if (n === 1) {
        heights.push(pos === 1 ? 1 : 0);
      } else {
        heights.push(pos > 1 && pos <= n ? 1 : 0);
      }
    }
    var patternKey = "nakadaka", patternName = "Nakadaka";
    if (n === 0) { patternKey = "heiban"; patternName = "Heiban (Flat)"; }
    else if (n === 1) { patternKey = "atamadaka"; patternName = "Atamadaka (Head-high)"; }
    else if (n >= mLen) { patternKey = "odaka"; patternName = "Odaka (Tail-high)"; }
    return {
      number: n,
      raw: String(pitchStr),
      patternKey: patternKey,
      patternName: patternName,
      moras: moras,
      heights: heights
    };
  }

  /* ---------- 9. Kanji Component, Radical & Lookalike Inspector ---------- */
  var KANJI_META = {
    "日": { r: "ニチ・جツ / ひ・か", m: "day, sun, Japan", comp: "日 (sun)", look: "目, 白, 旧" },
    "月": { r: "ゲツ・ガツ / つき", m: "month, moon", comp: "月 (moon)", look: "用, 角, 肉" },
    "火": { r: "カ / ひ・ほ", m: "fire", comp: "火 (fire)", look: "水, 犬, 大" },
    "水": { r: "スイ / みず", m: "water", comp: "水 (water)", look: "氷, 永, 氷" },
    "木": { r: "モク・ボク / き・こ", m: "tree, wood", comp: "木 (tree)", look: "本, 末, 未" },
    "金": { r: "キン・コン / かね", m: "gold, money, metal", comp: "金 (metal)", look: "全, 釜" },
    "土": { r: "ド・ト / つち", m: "soil, earth, Saturday", comp: "土 (earth)", look: "士, 王, 工" },
    "人": { r: "ジン・ニン / ひと", m: "person, human", comp: "人 (person)", look: "入, 八, 大" },
    "心": { r: "シン / こころ", m: "heart, mind, spirit", comp: "心 (heart)", look: "必, 思" },
    "手": { r: "シュ / て・た", m: "hand", comp: "手 (hand)", look: "毛, 牛, 午" },
    "目": { r: "モク・ボク / め", m: "eye, item", comp: "目 (eye)", look: "日, 自, 白, 貝" },
    "口": { r: "コウ・ク / くち", m: "mouth, opening", comp: "口 (mouth)", look: "回, 品, 田" },
    "言": { r: "ゲン・ゴン / い(う)・こと", m: "say, word", comp: "言 (speech)", look: "信, 音, 舌" },
    "行": { r: "コウ・ギョウ / い(く)・ゆ(く)・おこな(う)", m: "go, conduct, line", comp: "彳 (step) + 亍", look: "待, 往, 街" },
    "来": { r: "ライ / く(る)・きた(る)", m: "come, next, future", comp: "木 + 米", look: "米, 未, 末" },
    "見": { r: "ケン / み(る)", m: "see, look, show", comp: "目 (eye) + 儿 (legs)", look: "貝, 現, 覚" },
    "食": { r: "ショク / た(べる)・く(う)", m: "eat, food", comp: "人 + 良", look: "良, 飲, 養" },
    "飲": { r: "イン / の(む)", m: "drink", comp: "飠 (food) + 欠 (yawn)", look: "食, 飯, 飼" },
    "知": { r: "チ / し(る)", m: "know, wisdom", comp: "矢 (arrow) + 口 (mouth)", look: "和, 短, 智" },
    "思": { r: "シ / おも(う)", m: "think, feel", comp: "田 (field) + 心 (heart)", look: "恩, 息, 悪" },
    "聞": { r: "ブン・モン / き(く)", m: "hear, listen, ask", comp: "門 (gate) + 耳 (ear)", look: "問, 間, 開, 関" },
    "話": { r: "ワ / はな(す)・はなし", m: "speak, talk, story", comp: "言 (speech) + 舌 (tongue)", look: "語, 活, 読" },
    "読": { r: "ドク / よ(む)", m: "read", comp: "言 (speech) + 売 (sell)", look: "続, 説, 語" },
    "書": { r: "ショ / か(く)", m: "write, book", comp: "聿 (brush) + 日", look: "画, 昼, 事" },
    "買": { r: "バイ / か(う)", m: "buy", comp: "罒 (net) + 貝 (shell/money)", look: "置, 員, 売" },
    "売": { r: "バイ / う(る)", m: "sell", comp: "士 + 冖 + 儿", look: "読, 買, 完" },
    "待": { r: "タイ / ま(つ)", m: "wait, depend on", comp: "彳 (step) + 寺 (temple)", look: "持, 侍, 特, 時" },
    "持": { r: "ジ / も(つ)", m: "hold, have, possess", comp: "扌 (hand) + 寺 (temple)", look: "待, 特, 時, 指" },
    "時": { r: "ジ / とき", m: "time, hour", comp: "日 (sun) + 寺 (temple)", look: "待, 持, 詩" },
    "間": { r: "カン・ケン / あいだ・ま", m: "interval, space, between", comp: "門 (gate) + 日 (sun)", look: "問, 聞, 開, 関" },
    "分": { r: "ブン・フン / わ(かる)・わ(ける)", m: "understand, divide, minute", comp: "八 (divide) + 刀 (sword)", look: "切, 公, 方" },
    "今": { r: "コン・キン / いま", m: "now, present", comp: "亼 + 冖", look: "令, 含, 会" },
    "何": { r: "カ / なに・なん", m: "what, how many", comp: "亻 (person) + 可 (possible)", look: "伺, 荷, 向" },
    "私": { r: "シ / わたし・わたくし", m: "I, private", comp: "禾 (grain) + 厶 (private)", look: "和, 秋, 利" },
    "俺": { r: "エン / おれ", m: "I, me (masculine)", comp: "亻 (person) + 奄", look: "僕, 他, 倫" },
    "僕": { r: "ボク / ぼく", m: "I, me, servant", comp: "亻 (person) + 菐", look: "俺, 撲" },
    "君": { r: "クン / きみ", m: "you, monarch", comp: "尹 + 口 (mouth)", look: "群, 若, 名" },
    "申": { r: "シン / もう(す)", m: "say humbly, report", comp: "日 + ｜", look: "由, 甲, 神, 押" },
    "込": { r: "こ(む)・こ(める)", m: "crowd into, include", comp: "⻌ (road) + 入 (enter)", look: "近, 迎, 返" },
    "取": { r: "シュ / と(る)", m: "take, fetch", comp: "耳 (ear) + 又 (hand)", look: "最, 敢, 恥" },
    "扱": { r: "あつか(う)", m: "handle, treat, deal with", comp: "扌 (hand) + 及 (reach)", look: "吸, 級, 投" },
    "引": { r: "イン / ひ(く)", m: "pull, draw, subtract", comp: "弓 (bow) + ｜", look: "弔, 弘, 張" },
    "越": { r: "エツ / こ(す)・こ(える)", m: "surpass, cross over, move", comp: "走 (run) + 戉 (axe)", look: "超, 起, 趣" },
    "強": { r: "キョウ・ゴウ / つよ(い)・し(いる)", m: "strong, force", comp: "弓 (bow) + 厶 + 虫", look: "弱, 勉, 張" },
    "弱": { r: "ジャク / よわ(い)", m: "weak, frail", comp: "弓 (bow) + 冫", look: "強, 羽" },
    "好": { r: "コウ / す(き)・この(む)", m: "like, fond, pleasing", comp: "女 (woman) + 子 (child)", look: "如, 始, 姉" },
    "嫌": { r: "ケン・ゲン / きら(う)・いや", m: "dislike, detest, unpleasant", comp: "女 (woman) + 兼 (concurrently)", look: "謙, 兼" },
    "愛": { r: "アイ / いと(しい)", m: "love, affection", comp: "爫 + 冖 + 心 (heart) + 夊", look: "受, 覚, 憂" },
    "気": { r: "キ・ケ / いき", m: "spirit, mind, air, mood", comp: "气 (steam) + 〆", look: "汽, 決" },
    "生": { r: "セイ・ショウ / い(きる)・う(まれる)・なま", m: "life, birth, raw", comp: "生 (sprout)", look: "主, 王, 牛, 年" },
    "死": { r: "シ / し(ぬ)", m: "death, die", comp: "歹 (bones) + 匕 (spoon)", look: "列, 例, 葬" },
    "世": { r: "セイ・セ / よ", m: "world, generation", comp: "卅 (thirty)", look: "葉, 笹, 冊" },
    "界": { r: "カイ", m: "world, boundary", comp: "田 (field) + 介 (mediate)", look: "思, 畏, 胃" },
    "力": { r: "リョク・リキ / ちから", m: "power, strength, effort", comp: "力 (power/muscle)", look: "刀, 万, 方, 九" },
    "約": { r: "ヤク / つづ(まる)", m: "promise, approximately", comp: "糸 (thread) + 勺 (ladle)", look: "的, 釣, 紀" },
    "束": { r: "ソク / たば", m: "bundle, tie, restrain", comp: "木 (tree) + 口 (enclosure)", look: "東, 刺, 頼" },
    "秘": { r: "ヒ / ひ(める)", m: "secret, conceal", comp: "禾 (grain) + 必 (certain)", look: "必, 泌, 称" },
    "密": { r: "ミツ / ひそ(か)", m: "secrecy, dense, close", comp: "宀 (roof) + 必 + 山 (mountain)", look: "蜜, 室, 富" },
    "場": { r: "ジョウ / ば", m: "place, location, scene", comp: "土 (earth) + 易 (sun/rays)", look: "陽, 湯, 傷" },
    "所": { r: "ショ / ところ", m: "place, spot", comp: "戸 (door) + 斤 (axe)", look: "戸, 祈, 近" },
    "理": { r: "リ / ことわり", m: "reason, logic, arrange", comp: "王 (jewel) + 里 (village)", look: "埋, 里, 程" },
    "由": { r: "ユ・ユウ / よし", m: "reason, cause, wherefore", comp: "田 + ｜", look: "申, 甲, 曲, 油" },
    "問": { r: "モン / と(う)・と(い)", m: "question, ask, problem", comp: "門 (gate) + 口 (mouth)", look: "間, 聞, 開, 関" },
    "題": { r: "ダイ", m: "topic, subject, problem", comp: "是 (right) + 頁 (head/page)", look: "提, 堤, 顔" },
    "必": { r: "ヒツ / かなら(ず)", m: "invariably, certain, necessary", comp: "心 (heart) + 丿 (slash)", look: "心, 秘, 泌" },
    "要": { r: "ヨウ / い(る)・かなめ", m: "need, main point, essential", comp: "覀 (cover) + 女 (woman)", look: "腰, 票, 悪" },
    "切": { r: "セツ・サイ / き(る)", m: "cut, keen, important", comp: "七 (seven) + 刀 (sword)", look: "分, 初, 功" }
  };

  function inspectKanji(text, dictGet, jlptFor) {
    var chars = Array.from(String(text || ""));
    var seen = {}, list = [];
    chars.forEach(function (ch) {
      if (!/[\u4e00-\u9faf]/.test(ch) || seen[ch]) return;
      seen[ch] = 1;
      var meta = KANJI_META[ch] || null;
      var dHit = (typeof dictGet === "function") ? dictGet(ch) : null;
      var jlpt = (typeof jlptFor === "function") ? jlptFor(ch, ch) : "";
      var reading = (meta && meta.r) || (dHit && dHit.r) || "";
      var meaning = (meta && meta.m) || (dHit && dHit.g && dHit.g.slice(0, 3).join("; ")) || "Kanji character";
      list.push({
        kanji: ch,
        reading: reading,
        meaning: meaning,
        components: (meta && meta.comp) || "",
        lookalikes: (meta && meta.look) || "",
        jlpt: jlpt || ""
      });
    });
    return list;
  }

  return {
    refine: refine,
    groupInflections: groupInflections,
    splitKatakanaRun: splitKatakanaRun,
    splitUnknownKatakana: function (token, tokenizer) {
      return splitKatakanaRun(token, tokenizer, null);
    },
    splitMoras: splitMoras,
    analyzePitch: analyzePitch,
    inspectKanji: inspectKanji
  };
});
