(function () {
  "use strict";
  var L = SelfieLibrary, $ = function (id) { return document.getElementById(id); };
  var stream = null, db = null, cameraReady = false, cameraStarting = false, cameraEpoch = 0;
  var sourceMode = "upload", frozen = "", sourceName = "", sourceKind = "upload";
  var resultUrl = "", busy = false, loadingSource = false, uploadSerial = 0;
  var keyKnown = false, keyReady = false, userStyles = [], category = "全部", activeId = "";
  var selected = { kind: "preset", id: L.DEFAULT_STYLE };
  function status(text) { $("status").textContent = text; }
  function currentStyle() {
    if (!selected) return null;
    return (selected.kind === "preset" ? L.PRESETS : userStyles).find(function (s) { return s.id === selected.id; }) || null;
  }
  function sync() {
    var blocked = busy || loadingSource, item = currentStyle();
    $("generate").disabled = blocked || !frozen || !keyKnown || !keyReady || !$("prompt").value.trim();
    $("generate").textContent = busy ? "正在生成…" : "生成这个风格";
    $("generating").hidden = !busy;
    ["sourceUpload", "sourceCamera", "choosePhoto", "upload", "portraitMode", "prompt", "styleName", "saveStyle"].forEach(function (id) { $(id).disabled = blocked; });
    $("shutter").disabled = blocked || !cameraReady;
    $("openCamera").disabled = blocked || cameraStarting || cameraReady || !!frozen;
    $("retake").disabled = blocked || !frozen;
    $("download").disabled = !resultUrl;
    $("updateStyle").disabled = blocked || !selected || selected.kind !== "user";
    $("deleteStyle").disabled = $("updateStyle").disabled;
    $("clearHistory").disabled = blocked || !$("history").children.length;
    $("selectedStyle").textContent = item ? item.name : "自定义提示词";
    document.querySelectorAll(".style-option, .categories button, .shot").forEach(function (el) { el.disabled = blocked; });
  }
  function stopCamera() {
    cameraEpoch++;
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    stream = null; cameraReady = false; cameraStarting = false; $("video").srcObject = null;
  }
  function showSource() {
    var live = sourceMode === "camera" && cameraReady && !frozen;
    $("video").hidden = !live;
    $("frozen").hidden = !frozen;
    if (frozen) $("frozen").src = frozen; else $("frozen").removeAttribute("src");
    $("sourceEmpty").hidden = !!frozen || live;
    $("freezeTag").hidden = !frozen;
    $("sourceEmptyTitle").textContent = sourceMode === "upload" ? "将人像照片拖到这里" : "摄像头取景";
    $("sourceEmptyText").textContent = sourceMode === "upload" ? "也可以点击下方按钮选择照片" : "点击开启摄像头，确认画面后拍照";
    $("sourceLabel").textContent = frozen ? sourceName : "尚未选择照片";
    $("retake").textContent = sourceMode === "camera" ? "重新拍照" : "更换照片";
    $("sourceUpload").setAttribute("aria-selected", String(sourceMode === "upload"));
    $("sourceCamera").setAttribute("aria-selected", String(sourceMode === "camera"));
    $("uploadPane").hidden = sourceMode !== "upload";
    $("cameraPane").hidden = sourceMode !== "camera";
    sync();
  }
  function showResult(shot) {
    resultUrl = shot.result; $("result").src = resultUrl; $("result").hidden = false; $("resultEmpty").hidden = true;
    $("resultStyle").textContent = shot.styleName || "自定义风格";
    $("resultSource").textContent = shot.sourceName || "历史照片";
    sync();
  }
  function clearResult() {
    resultUrl = ""; activeId = ""; $("result").hidden = true; $("result").removeAttribute("src");
    $("resultEmpty").hidden = false; $("resultStyle").textContent = "生成后可保存到本地"; $("resultSource").textContent = "";
  }
  async function openCamera() {
    if (busy || loadingSource || cameraStarting || cameraReady) return;
    stopCamera(); var token = cameraEpoch; cameraStarting = true; showSource();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Error("浏览器无法打开摄像头，请使用 localhost 访问，或改为上传照片。");
      var acquired = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false });
      if (token !== cameraEpoch || sourceMode !== "camera") { acquired.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = acquired; $("video").srcObject = acquired; await $("video").play();
      if (token !== cameraEpoch) return;
      cameraReady = true; status("确认取景后点击拍照；拍照不会自动调用生图接口。");
    } catch (error) {
      if (token !== cameraEpoch) return;
      stopCamera(); status(error.name === "NotAllowedError" ? "摄像头权限未开启，可以改为上传照片。" : error.message || "摄像头无法使用，请上传照片。");
    } finally { if (token === cameraEpoch) cameraStarting = false; showSource(); }
  }
  function switchSource(mode) {
    if (busy || loadingSource || sourceMode === mode) return;
    uploadSerial++; stopCamera(); sourceMode = mode; frozen = ""; clearResult(); showSource();
    if (mode === "camera") openCamera(); else status("选择一张清晰的单人人像照片。");
  }
  function takePhoto() {
    if (busy || !cameraReady) return;
    var video = $("video"), size = L.frameSize(video.videoWidth, video.videoHeight, 1024);
    if (!size) { status("摄像头画面尚未就绪，请稍后再拍。"); return; }
    var canvas = document.createElement("canvas"); canvas.width = size.width; canvas.height = size.height;
    L.drawMirroredFrame(canvas.getContext("2d"), video, size.width, size.height);
    frozen = canvas.toDataURL("image/jpeg", 0.9); sourceKind = "camera"; sourceName = "摄像头拍照 · " + size.width + "×" + size.height;
    stopCamera(); clearResult(); showSource(); status("照片已定格。选择画风后点击生成。");
  }
  async function loadPhoto(file) {
    if (!file || busy || loadingSource) return;
    if (!( /^image\/(jpeg|png|webp)$/.test(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name)))) { status("请选择 JPEG、PNG 或 WebP 照片。"); return; }
    if (file.size > 12 * 1024 * 1024) { status("照片超过 12 MB，请先缩小后重试。"); return; }
    var serial = ++uploadSerial, url = URL.createObjectURL(file); loadingSource = true; sync();
    try {
      var image = new Image();
      await new Promise(function (resolve, reject) { image.onload = resolve; image.onerror = function () { reject(Error("照片无法读取，请选择其他文件。")); }; image.src = url; });
      if (serial !== uploadSerial) return;
      if (image.naturalWidth < 32 || image.naturalHeight < 32 || image.naturalWidth * image.naturalHeight > 40000000) throw Error("照片尺寸不合适，请使用至少 32 像素且不超过 4000 万像素的照片。");
      var size = L.frameSize(image.naturalWidth, image.naturalHeight, 1024), canvas = document.createElement("canvas");
      canvas.width = size.width; canvas.height = size.height;
      var ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size.width, size.height); ctx.drawImage(image, 0, 0, size.width, size.height);
      frozen = canvas.toDataURL("image/jpeg", 0.9); stopCamera(); sourceMode = "upload"; sourceKind = "upload";
      sourceName = file.name + " · " + size.width + "×" + size.height;
      clearResult(); status("照片已准备好。可切换风格比较，点击生成才会提交照片。");
    } catch (error) { status(error.message); }
    finally { URL.revokeObjectURL(url); loadingSource = false; $("upload").value = ""; showSource(); }
  }
  function renderStyles() {
    var categories = ["全部", "动画", "插画", "平面", "材质", "我的"], colors = { "动画": "#dde6ff", "插画": "#ffead3", "平面": "#e4f4e8", "材质": "#f2e3f8", "我的": "#e5e9f0" };
    $("categories").replaceChildren();
    categories.forEach(function (name) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = name; b.setAttribute("aria-pressed", String(category === name));
      b.onclick = function () { if (!busy && !loadingSource) { category = name; renderStyles(); } }; $("categories").appendChild(b);
    });
    $("chips").replaceChildren();
    function add(item, kind) {
      var group = kind === "user" ? "我的" : item.category;
      if (category !== "全部" && category !== group) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "style-option"; b.dataset.styleId = item.id;
      b.style.setProperty("--swatch", colors[group]); b.setAttribute("aria-pressed", String(!!selected && selected.kind === kind && selected.id === item.id));
      var title = document.createElement("strong"), note = document.createElement("small"); title.textContent = item.name; note.textContent = item.note || "自定义风格";
      b.append(title, note); b.onclick = function () { if (busy || loadingSource) return; selected = {kind:kind,id:item.id}; $("prompt").value = item.prompt; $("styleName").value = kind === "user" ? item.name : ""; renderStyles(); }; $("chips").appendChild(b);
    }
    L.PRESETS.forEach(function (s) { add(s,"preset"); }); userStyles.forEach(function (s) { add(s,"user"); });
    $("styleCount").textContent = L.PRESETS.length + " 种内置风格";
    $("noStyles").hidden = !!$("chips").children.length; sync();
  }
  function requestDone(req) { return new Promise(function (resolve,reject) { req.onsuccess=function(){resolve(req.result);};req.onerror=function(){reject(req.error);}; }); }
  function txDone(tx) { return new Promise(function(resolve,reject){tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};tx.onabort=function(){reject(tx.error || Error("记录保存中断。"));};}); }
  function openDb() {
    return new Promise(function(resolve,reject){
      var req=indexedDB.open("selfie-visit-shots",1);
      req.onupgradeneeded=function(){var store=req.result.createObjectStore("shots",{keyPath:"id"});store.createIndex("session","sessionId",{unique:false});};
      req.onsuccess=function(){resolve(req.result);};req.onerror=function(){reject(req.error);};req.onblocked=function(){reject(Error("记录数据库暂不可用。"));};
    });
  }
  async function allShots() {
    if (!db) return [];
    return (await requestDone(db.transaction("shots","readonly").objectStore("shots").getAll())).sort(function(a,b){return b.created-a.created;});
  }
  async function refreshHistory() {
    var shots = (await allShots()).slice(0,30); $("history").replaceChildren(); $("historyEmpty").hidden=!!shots.length;
    shots.forEach(function(shot){
      if (!L.imageDataURL(shot.result) || !L.imageDataURL(shot.original)) return;
      var b=document.createElement("button"),img=document.createElement("img"),label=document.createElement("span");
      b.type="button";b.className="shot";b.setAttribute("aria-current",String(shot.id===activeId));img.src=shot.result;img.alt="";
      label.textContent=(shot.styleName || "历史风格")+" · "+new Date(shot.created).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
      b.append(img,label);b.onclick=function(){recall(shot);};$("history").appendChild(b);
    }); sync();
  }
  async function saveShot(shot) {
    if (!db) throw Error("浏览器未启用本地记录。");
    var tx=db.transaction("shots","readwrite");tx.objectStore("shots").put(shot);await txDone(tx);
    var shots=await allShots();
    if(shots.length>30){tx=db.transaction("shots","readwrite");shots.slice(30).forEach(function(s){tx.objectStore("shots").delete(s.id);});await txDone(tx);}
    await refreshHistory();
  }
  function recall(shot) {
    if(busy || loadingSource) return;
    stopCamera();sourceKind=shot.sourceKind==="camera"?"camera":"upload";sourceMode=sourceKind;sourceName=shot.sourceName||"历史照片";
    frozen=shot.original;activeId=shot.id;$("prompt").value=shot.basePrompt||shot.prompt;$("portraitMode").checked=!!shot.portraitMode;
    selected=null;
    [L.PRESETS,userStyles].forEach(function(list,i){var s=list.find(function(item){return item.id===shot.styleId&&item.prompt===$("prompt").value;});if(s)selected={kind:i?"user":"preset",id:s.id};});
    $("styleName").value=selected&&selected.kind==="user"?shot.styleName:"";
    showResult(shot);showSource();renderStyles();refreshHistory().catch(function(){});status("已恢复这次生成的照片与提示词，可以换风格再次生成。");
  }
  async function loadKey() {
    try { var response=await fetch("/api/status",{cache:"no-store"});if(!response.ok)throw Error();var data=await response.json();keyReady=data.selfie===true;keyKnown=true;
      $("keyState").textContent=keyReady?"生图接口已配置":"生图接口未配置";
      if(!keyReady)status("可先选照片和风格；在启动终端配置 DASHSCOPE_API_KEY 后刷新接口状态。");
    } catch(error){keyReady=false;keyKnown=true;$("keyState").textContent="服务未连接";status("请通过 python run_avatar.py 启动后访问此页面。");} sync();
  }
  async function generate() {
    if(busy || loadingSource || !frozen) return;
    if(!keyReady){status("请先在启动终端配置 DASHSCOPE_API_KEY，再刷新接口状态。");return;}
    var prompt,basePrompt=$("prompt").value.trim();try{prompt=L.buildPrompt(basePrompt,$("portraitMode").checked);}catch(error){status(error.message);return;}
    var item=currentStyle(),shot={id:L.newId(),created:Date.now(),original:frozen,basePrompt:basePrompt,prompt:prompt,portraitMode:$("portraitMode").checked,sourceKind:sourceKind,sourceName:sourceName,styleId:item?item.id:"",styleName:item?item.name:"自定义风格"};
    busy=true;sync();status("正在根据原照片生成，通常需要等待一段时间…");
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},180000);
    try {
      var response=await fetch("/api/selfie",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:shot.original,prompt:prompt}),signal:controller.signal});
      var data;try{data=await response.json();}catch(error){throw Error("生图服务返回异常，请稍后重试。");}
      if(!response.ok)throw Error(data.error||"生成失败，请稍后重试。");
      if(!L.imageDataURL(data.image))throw Error("生图服务未返回有效图片，请重试。");
      shot.result=data.image;activeId=shot.id;showResult(shot);
      try{await saveShot(shot);status("生成完成。可下载，或保留这张原照片继续比较其他风格。");}catch(error){status("生成完成，可以下载；浏览器记录未保存，可能是存储空间不足。");}
    }catch(error){status(error.name==="AbortError"?"生成等待超时，可保留原照片重试。":error.message||"生成失败，请重试。");}
    finally{clearTimeout(timer);busy=false;sync();}
  }
  function changeStyle(action) {
    if(busy || loadingSource)return;
    try{
      var next,item;
      if(action==="save"){var added=L.addStyle(userStyles,$("styleName").value,$("prompt").value);next=added.styles;item=added.item;}
      else{if(!selected||selected.kind!=="user")return;next=action==="update"?L.updateStyle(userStyles,selected.id,$("styleName").value,$("prompt").value):L.removeStyle(userStyles,selected.id);item=next.find(function(s){return s.id===selected.id;});}
      L.writeStyles(localStorage,next);userStyles=next;selected=item?{kind:"user",id:item.id}:null;category="我的";renderStyles();status(action==="delete"?"自定义风格已删除。":"自定义风格已保存。");
    }catch(error){status(error.message||"风格无法保存，请检查浏览器存储设置。");}
  }
  $("sourceUpload").onclick=function(){switchSource("upload");};$("sourceCamera").onclick=function(){switchSource("camera");};
  $("choosePhoto").onclick=function(){$("upload").click();};$("upload").onchange=function(){loadPhoto($("upload").files[0]);};
  $("openCamera").onclick=openCamera;$("shutter").onclick=takePhoto;
  $("retake").onclick=function(){if(sourceMode==="upload")$("upload").click();else{frozen="";clearResult();openCamera();}};
  $("dropZone").addEventListener("dragover",function(e){e.preventDefault();if(!busy&&!loadingSource)$("dropZone").classList.add("dragging");});
  $("dropZone").addEventListener("dragleave",function(){$("dropZone").classList.remove("dragging");});
  $("dropZone").addEventListener("drop",function(e){e.preventDefault();$("dropZone").classList.remove("dragging");loadPhoto(e.dataTransfer.files[0]);});
  $("generate").onclick=generate;$("refreshKey").onclick=loadKey;
  $("prompt").oninput=function(){/* Keep a selected custom style editable until Update is clicked. */if(selected&&selected.kind==="preset"&&currentStyle().prompt!==$("prompt").value)selected=null;renderStyles();};
  $("saveStyle").onclick=function(){changeStyle("save");};$("updateStyle").onclick=function(){changeStyle("update");};$("deleteStyle").onclick=function(){changeStyle("delete");};
  $("download").onclick=function(){if(!resultUrl)return;var a=document.createElement("a");a.href=resultUrl;a.download="cartoon-"+Date.now()+(/image\/jpeg/.test(resultUrl)?".jpg":/image\/webp/.test(resultUrl)?".webp":".png");a.click();};
  $("clearHistory").onclick=async function(){if(busy||!db)return;try{var tx=db.transaction("shots","readwrite");tx.objectStore("shots").clear();await txDone(tx);activeId="";await refreshHistory();status("本浏览器中的生成记录已清空。");}catch(error){status("记录清理失败，请重试。");}};
  window.addEventListener("pagehide",function(){uploadSerial++;stopCamera();});
  try{userStyles=L.readStyles(localStorage);}catch(error){userStyles=[];}
  $("prompt").value=currentStyle().prompt;renderStyles();showSource();loadKey();
  openDb().then(function(database){db=database;return refreshHistory();}).catch(function(){status("浏览器记录不可用；仍可生成并下载图片。");});
})();
