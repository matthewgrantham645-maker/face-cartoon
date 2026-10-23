(function () {
  "use strict";
  var L = SelfieLibrary;
  var $ = function (id) { return document.getElementById(id); };
  var stream = null;
  var db = null;
  var sessionId = "";
  var frozen = "";
  var resultUrl = "";
  var busy = false;
  var cameraReady = false;
  var keyReady = false;
  var keyKnown = false;
  var selected = { kind: "preset", id: L.PRESETS[0].id };
  var userStyles = [];
  var activeId = "";
  var reviseId = "";
  var styleBusy = false;
  var stylesReady = false;

  function setStatus(text) { $("status").textContent = text; }

  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error("记录中断。")); };
    });
  }

  function requestDone(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open("selfie-visit-shots", 1);
      request.onupgradeneeded = function () {
        var database = request.result;
        if (!database.objectStoreNames.contains("shots")) {
          var store = database.createObjectStore("shots", { keyPath: "id" });
          store.createIndex("session", "sessionId", { unique: false });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function allShots() {
    return requestDone(db.transaction("shots", "readonly").objectStore("shots").getAll());
  }

  function sessionShots() {
    return allShots().then(function (shots) {
      return shots.filter(function (shot) { return shot.sessionId === sessionId; })
        .sort(function (a, b) { return b.created - a.created; });
    });
  }

  function purge(dead) {
    if (!db || !dead.length) return Promise.resolve();
    return allShots().then(function (shots) {
      var gone = shots.filter(function (shot) { return dead.indexOf(shot.sessionId) !== -1; });
      if (!gone.length) return null;
      var tx = db.transaction("shots", "readwrite");
      var store = tx.objectStore("shots");
      gone.forEach(function (shot) { store.delete(shot.id); });
      return txDone(tx);
    });
  }

  function saveShot(shot) {
    var tx = db.transaction("shots", "readwrite");
    tx.objectStore("shots").put(shot);
    return txDone(tx);
  }

  function deleteShot(id) {
    if (!db) return Promise.resolve(null);
    var tx = db.transaction("shots", "readwrite");
    tx.objectStore("shots").delete(id);
    return txDone(tx);
  }

  function isImageData(value) {
    return typeof value === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(value);
  }

  function sync() {
    var prompt = $("prompt").value.trim();
    $("shutter").disabled = busy || !!frozen || !prompt || !cameraReady;
    $("again").disabled = busy || !frozen || !prompt;
    $("retake").disabled = busy || !frozen;
    $("download").disabled = !resultUrl;
    document.querySelectorAll("#history .ops button").forEach(function (button) { button.disabled = busy; });
    $("saveStyle").disabled = busy || styleBusy || !stylesReady;
    $("updateStyle").disabled = busy || styleBusy || !stylesReady || selected.kind !== "user";
    $("deleteStyle").disabled = busy || styleBusy || !stylesReady || selected.kind !== "user";
    $("finderLabel").textContent = "取景";
  }

  function showFrozen() {
    $("video").hidden = true;
    $("frozen").hidden = false;
    $("frozen").src = frozen;
    $("freezeTag").hidden = false;
  }

  function showLive() {
    $("video").hidden = false;
    $("frozen").hidden = true;
    $("frozen").removeAttribute("src");
    $("freezeTag").hidden = true;
  }

  function showResult() {
    $("result").hidden = false;
    $("result").src = resultUrl;
    $("resultEmpty").hidden = true;
  }

  function clearResult() {
    resultUrl = "";
    $("result").hidden = true;
    $("result").removeAttribute("src");
    $("resultEmpty").hidden = false;
  }

  function renderStyles() {
    var box = $("chips");
    box.replaceChildren();
    function addChip(kind, item) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = item.name;
      button.setAttribute("aria-pressed", selected && selected.kind === kind && selected.id === item.id ? "true" : "false");
      button.addEventListener("click", function () { choose(kind, item); });
      box.appendChild(button);
    }
    L.PRESETS.forEach(function (item) { addChip("preset", item); });
    userStyles.forEach(function (item) { addChip("user", item); });
    sync();
  }

  function choose(kind, item) {
    selected = { kind: kind, id: item.id };
    $("prompt").value = item.prompt;
    $("styleName").value = kind === "user" ? item.name : "";
    renderStyles();
  }

  function renderHistory(shots) {
    var box = $("history");
    box.replaceChildren();
    $("historyEmpty").hidden = shots.length > 0;
    shots.forEach(function (shot) {
      var card = document.createElement("article");
      card.className = "shot";
      card.setAttribute("aria-current", shot.id === activeId ? "true" : "false");
      var open = document.createElement("button");
      open.type = "button";
      open.className = "shot-open";
      var img = document.createElement("img");
      img.src = shot.result;
      img.alt = "";
      var caption = document.createElement("span");
      var clock = new Date(shot.created);
      caption.textContent = clock.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      open.appendChild(img);
      open.appendChild(caption);
      open.addEventListener("click", function () { recall(shot); });
      var ops = document.createElement("div");
      ops.className = "ops";
      [["增", function () { addFrom(shot); }], ["改", function () { editShot(shot); }], ["删", function () { removeShot(shot); }]].forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = item[0];
        button.disabled = busy;
        button.addEventListener("click", item[1]);
        ops.appendChild(button);
      });
      card.appendChild(open);
      card.appendChild(ops);
      box.appendChild(card);
    });
  }

  function refreshHistory() {
    if (!db) return Promise.resolve();
    return sessionShots().then(renderHistory);
  }

  function recall(shot, keepRevise) {
    if (busy) return;
    if (!keepRevise) reviseId = "";
    frozen = shot.original;
    resultUrl = shot.result;
    activeId = shot.id;
    selected = null;
    $("prompt").value = shot.prompt;
    showFrozen();
    showResult();
    renderStyles();
    setStatus("");
    sync();
    refreshHistory();
  }

  function editShot(shot) {
    if (busy) return;
    reviseId = shot.id;
    recall(shot, true);
    setStatus("正在改这一张。");
  }

  function addFrom(shot) {
    if (busy) return;
    frozen = shot.original;
    showFrozen();
    sync();
    generate({ original: shot.original, prompt: shot.prompt, replaceId: "" });
  }

  function removeShot(shot) {
    if (busy) return;
    deleteShot(shot.id).then(function () {
      if (activeId === shot.id) {
        activeId = "";
        clearResult();
      }
      if (reviseId === shot.id) reviseId = "";
      return refreshHistory();
    }).catch(function () {
      setStatus("没能删掉。");
    });
  }

  function captureFrame() {
    var size = L.frameSize($("video").videoWidth, $("video").videoHeight, 1024);
    if (!size) throw new Error("摄像头还没有画面。");
    var canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    L.drawMirroredFrame(canvas.getContext("2d"), $("video"), size.width, size.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  function generate(options) {
    var manual = options && options.original;
    var source = manual ? options.original : frozen;
    var prompt = manual ? options.prompt : $("prompt").value.trim();
    var replaceId = manual ? (options.replaceId || "") : (reviseId || "");
    if (busy || !source || !prompt) return;
    busy = true;
    sync();
    setStatus("正在生成。");
    var sent = source;
    var previous = null;
    var lookup = db ? sessionShots() : Promise.resolve([]);
    lookup.then(function (shots) {
      previous = shots.filter(function (shot) { return shot.id === replaceId; })[0] || null;
    }).catch(function () {
      previous = null;
    }).then(function () {
      return fetch("/api/selfie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: sent, prompt: prompt }),
        signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(150000) : undefined
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data && data.error ? data.error : "生成失败。");
          if (!isImageData(data && data.image)) throw new Error("返回的图片无法显示。");
          return data.image;
        });
      }).then(function (image) {
        if (frozen !== sent) return;
        resultUrl = image;
        showResult();
        var shot = replaceId
          ? { id: replaceId, sessionId: sessionId, created: previous ? previous.created : Date.now(), prompt: prompt, original: previous ? previous.original : sent, result: image }
          : { id: L.newId(), sessionId: sessionId, created: Date.now(), prompt: prompt, original: sent, result: image };
        activeId = shot.id;
        if (replaceId) reviseId = "";
        var saved = db ? saveShot(shot).catch(function () { return null; }) : Promise.resolve(null);
        return saved.then(function (savedId) {
          var note = !db || savedId === null ? "生成完成。记录没写入。" : "";
          return refreshHistory().catch(function () { return null; }).then(function () { setStatus(note); });
        });
      });
    }).catch(function (error) {
      var timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
      setStatus(timedOut ? "生成超时。" : (error.message || "生成失败。"));
    }).then(function () {
      busy = false;
      sync();
    });
  }

  function beat(now) {
    var session = L.touchSession(sessionStorage, localStorage, now);
    sessionId = session.id;
    return purge(session.dead).then(refreshHistory);
  }

  $("prompt").addEventListener("input", sync);
  $("shutter").addEventListener("click", function () {
    if (busy || frozen) return;
    try {
      frozen = captureFrame();
    } catch (error) {
      setStatus(error.message);
      return;
    }
    activeId = "";
    reviseId = "";
    showFrozen();
    sync();
    generate();
  });
  $("again").addEventListener("click", generate);
  $("retake").addEventListener("click", function () {
    if (busy || !frozen) return;
    frozen = "";
    activeId = "";
    reviseId = "";
    clearResult();
    showLive();
    renderHistoryFromCache();
    setStatus("");
    sync();
  });
  $("download").addEventListener("click", function () {
    if (!resultUrl) return;
    var link = document.createElement("a");
    link.href = resultUrl;
    var kind = resultUrl.indexOf("data:image/jpeg") === 0 ? "jpg" : resultUrl.indexOf("data:image/webp") === 0 ? "webp" : "png";
    link.download = "自拍." + kind;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  function postStyles(styles) {
    styleBusy = true;
    sync();
    return fetch("/api/styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styles: styles })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data && data.error ? data.error : "风格没能存下。");
        return Array.isArray(data.styles) ? data.styles : styles;
      });
    }).then(function (stored) {
      userStyles = stored;
      localStorage.removeItem(L.STYLE_KEY);
      return stored;
    }).catch(function (error) {
      setStatus(error.message || "风格没能存下。");
      return null;
    }).then(function (stored) {
      styleBusy = false;
      sync();
      return stored;
    });
  }

  function loadStyles() {
    var local = L.readStyles(localStorage);
    return fetch("/api/styles").then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data && data.error ? data.error : "风格没能从本机读出。");
        return data;
      });
    }).then(function (data) {
      var plan = L.reconcileStyles(!!data.fresh, data.styles, local);
      if (!plan.upload) {
        userStyles = plan.styles;
        if (plan.clearLocal) localStorage.removeItem(L.STYLE_KEY);
        return;
      }
      return postStyles(plan.styles).then(function (stored) {
        if (!stored) setStatus("风格没能从浏览器并到本机。");
      });
    }).catch(function (error) {
      setStatus(error.message || "风格没能从本机读出。");
    }).then(function () {
      stylesReady = true;
      renderStyles();
    });
  }

  $("saveStyle").addEventListener("click", function () {
    if (styleBusy || !stylesReady) return;
    var saved;
    try {
      saved = L.addStyle(userStyles, $("styleName").value, $("prompt").value);
    } catch (error) {
      setStatus(error.message);
      return;
    }
    postStyles(saved.styles).then(function (stored) {
      if (!stored) return;
      selected = { kind: "user", id: saved.item.id };
      renderStyles();
      setStatus("已添加。");
    });
  });
  $("updateStyle").addEventListener("click", function () {
    if (styleBusy || !stylesReady || selected.kind !== "user") return;
    var next;
    try {
      next = L.updateStyle(userStyles, selected.id, $("styleName").value, $("prompt").value);
    } catch (error) {
      setStatus(error.message);
      return;
    }
    postStyles(next).then(function (stored) {
      if (!stored) return;
      renderStyles();
      setStatus("已更新。");
    });
  });
  $("deleteStyle").addEventListener("click", function () {
    if (styleBusy || !stylesReady || selected.kind !== "user") return;
    var next;
    try {
      next = L.removeStyle(userStyles, selected.id);
    } catch (error) {
      setStatus(error.message);
      return;
    }
    postStyles(next).then(function (stored) {
      if (!stored) return;
      choose("preset", L.PRESETS[0]);
      setStatus("已删除。");
    });
  });

  function renderHistoryFromCache() {
    refreshHistory();
  }

  function loadKey() {
    return fetch("/api/status").then(function (response) { return response.json(); }).then(function (data) {
      keyKnown = true;
      keyReady = !!data.selfie;
      $("keyState").textContent = keyReady ? "千问已配置" : "千问未配置";
      if (!keyReady && cameraReady && !frozen) setStatus("");
    }).catch(function () {
      keyKnown = true;
      $("keyState").textContent = "请从本机服务打开";
      setStatus("");
    });
  }

  function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("这个浏览器不能打开摄像头。");
      return Promise.resolve();
    }
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function (media) {
      stream = media;
      $("video").srcObject = media;
      return $("video").play();
    }).then(function () {
      cameraReady = true;
      setStatus("");
      sync();
    }).catch(function (error) {
      cameraReady = false;
      setStatus(error && error.name === "NotAllowedError" ? "没有摄像头权限。" : "没有打开摄像头。");
      sync();
    });
  }

  window.addEventListener("pagehide", function () {
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
  });

  userStyles = [];
  choose("preset", L.PRESETS[0]);
  var opened = L.touchSession(sessionStorage, localStorage, Date.now());
  sessionId = opened.id;
  openDb().then(function (database) {
    db = database;
    return purge(opened.dead).then(refreshHistory);
  }).catch(function () {
    setStatus("记录存不下。");
  }).then(function () {
    return openCamera();
  }).then(loadKey).then(loadStyles);
  setInterval(function () { beat(Date.now()); }, 10000);
  setTimeout(function () { beat(Date.now()); }, L.STALE_MS + 1000);
})();
