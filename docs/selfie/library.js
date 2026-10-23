(function (root) {
  "use strict";
  var PRESETS = [{
    id: "crayon-journal",
    name: "蜡笔手账",
    prompt: "把这张照片画成可爱、混乱的儿童蜡笔涂鸦。彩铅、蜡笔、手账贴纸和画图软件涂鸦叠在一起。粗糙线条，抖动边缘，上色不匀，纸上有彩铅叠色和蜡笔颗粒。故意幼稚，保留手绘失败感和乱涂鸦感，但要有灵气。人物画成 Q 版萌系二次元：大眼睛，夸张表情，可爱活泼。背景塞满爱心、星星、糖果、笑脸云朵、箭头、贴纸、游戏界面小元素和乱画的符号。颜色以粉色、蓝色、紫色、黄色、薄荷色为主。氛围是可爱、混乱、梦幻、少女游戏手账、互联网 kawaii。不要精致，不要商业插画，不要真实渲染，不要干净线稿。"
  }];
  var STYLE_KEY = "selfie-user-styles";
  var SESSION_KEY = "selfie-visit";
  var BEAT_KEY = "selfie-heartbeats";
  var STALE_MS = 15000;

  function newId() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(16).slice(2);
  }

  function cleanName(value) {
    var name = String(value || "").trim();
    if (!name || name.length > 24) throw new Error("风格名称需要 1 到 24 个字。");
    return name;
  }

  function cleanPrompt(value) {
    var prompt = String(value || "").trim();
    if (!prompt || prompt.length > 4000) throw new Error("提示词不能为空，且不超过 4000 字。");
    return prompt;
  }

  function readStyles(storage) {
    try {
      var raw = JSON.parse(storage.getItem(STYLE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (item) {
        return item && typeof item.id === "string" && typeof item.name === "string" && typeof item.prompt === "string" && item.name.trim() && item.prompt.trim() && !PRESETS.some(function (preset) { return preset.id === item.id; });
      }).map(function (item) {
        return { id: item.id, name: item.name.trim().slice(0, 24), prompt: item.prompt.trim().slice(0, 4000) };
      });
    } catch (error) {
      return [];
    }
  }

  function writeStyles(storage, styles) {
    storage.setItem(STYLE_KEY, JSON.stringify(styles));
  }

  function addStyle(styles, name, prompt, id) {
    if (id && PRESETS.some(function (preset) { return preset.id === id; })) throw new Error("内置风格不能修改。");
    var item = { id: id || newId(), name: cleanName(name), prompt: cleanPrompt(prompt) };
    return { styles: styles.concat(item), item: item };
  }

  function updateStyle(styles, id, name, prompt) {
    if (PRESETS.some(function (preset) { return preset.id === id; })) throw new Error("内置风格不能修改。");
    var next = cleanName(name), text = cleanPrompt(prompt), found = false;
    var updated = styles.map(function (item) {
      if (item.id !== id) return item;
      found = true;
      return { id: id, name: next, prompt: text };
    });
    if (!found) throw new Error("找不到这条风格。");
    return updated;
  }

  function removeStyle(styles, id) {
    if (PRESETS.some(function (preset) { return preset.id === id; })) throw new Error("内置风格不能删除。");
    if (!styles.some(function (item) { return item.id === id; })) throw new Error("找不到这条风格。");
    return styles.filter(function (item) { return item.id !== id; });
  }

  function readBeats(storage) {
    try {
      var value = JSON.parse(storage.getItem(BEAT_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function touchSession(sessionStorage, localStorage, now, staleMs) {
    var id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    var beats = readBeats(localStorage);
    beats[id] = now;
    var limit = staleMs == null ? STALE_MS : staleMs;
    var dead = [];
    var next = {};
    Object.keys(beats).forEach(function (sid) {
      var stamp = Number(beats[sid]);
      if (sid !== id && (!isFinite(stamp) || now - stamp > limit)) dead.push(sid);
      else next[sid] = sid === id ? now : stamp;
    });
    localStorage.setItem(BEAT_KEY, JSON.stringify(next));
    return { id: id, dead: dead };
  }

  function frameSize(width, height, maxEdge) {
    if (!(width > 1) || !(height > 1)) return null;
    var scale = Math.min(1, maxEdge / Math.max(width, height));
    return { width: Math.max(2, Math.round(width * scale)), height: Math.max(2, Math.round(height * scale)) };
  }

  function drawMirroredFrame(ctx, source, width, height) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0, width, height);
  }

  root.SelfieLibrary = {
    PRESETS: PRESETS, STYLE_KEY: STYLE_KEY, STALE_MS: STALE_MS, newId: newId,
    readStyles: readStyles, writeStyles: writeStyles, addStyle: addStyle, updateStyle: updateStyle, removeStyle: removeStyle,
    touchSession: touchSession, frameSize: frameSize, drawMirroredFrame: drawMirroredFrame
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
