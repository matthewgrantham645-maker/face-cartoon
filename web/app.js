const video = document.querySelector("#video");
const cameraCanvas = document.querySelector("#camera");
const cameraCtx = cameraCanvas.getContext("2d");
const cartoonCanvas = document.querySelector("#cartoon");
const cartoonCtx = cartoonCanvas.getContext("2d");
const statusEl = document.querySelector("#status");
const noteEl = document.querySelector("#note");
const freezeBtn = document.querySelector("#freeze");
const retryBtn = document.querySelector("#retry");
const cameraEmpty = document.querySelector("#camera-empty");
const cartoonEmpty = document.querySelector("#cartoon-empty");
const card = document.querySelector("#card");
const portraitImg = document.querySelector("#portrait");
const thumbImg = document.querySelector("#thumb");

const cropCanvas = document.createElement("canvas");
cropCanvas.width = 640;
cropCanvas.height = 640;
const cropCtx = cropCanvas.getContext("2d");

let latestCrop = null;
let socket = null;
let sending = false;
let gotFrame = false;
let frames = 0;
let fpsStamp = performance.now();
let portraitUrl = "";
let thumbUrl = "";

function setStatus(text) {
  statusEl.textContent = text;
}

function setNote(text) {
  noteEl.textContent = text;
}

function centerSquare(width, height) {
  const side = Math.min(width, height);
  return {
    side,
    x: (width - side) / 2,
    y: (height - side) / 2,
  };
}

function drawBrackets(ctx, x, y, side) {
  const arm = Math.max(18, side * 0.08);
  const thick = Math.max(4, side * 0.012);
  ctx.save();
  ctx.strokeStyle = "#f5b700";
  ctx.lineWidth = thick;
  const corners = [
    [x, y, 1, 1],
    [x + side, y, -1, 1],
    [x, y + side, 1, -1],
    [x + side, y + side, -1, -1],
  ];
  corners.forEach(([cx, cy, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * arm);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * arm, cy);
    ctx.stroke();
  });
  ctx.restore();
}

function paintCamera() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width) {
    requestAnimationFrame(paintCamera);
    return;
  }
  if (cameraCanvas.width !== width || cameraCanvas.height !== height) {
    cameraCanvas.width = width;
    cameraCanvas.height = height;
  }
  cameraCtx.save();
  cameraCtx.translate(width, 0);
  cameraCtx.scale(-1, 1);
  cameraCtx.drawImage(video, 0, 0, width, height);
  cameraCtx.restore();
  const box = centerSquare(width, height);
  drawBrackets(cameraCtx, box.x, box.y, box.side);
  requestAnimationFrame(paintCamera);
}

function grabCrop() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width) return null;
  const box = centerSquare(width, height);
  const sourceX = width - box.x - box.side;
  cropCtx.save();
  cropCtx.setTransform(1, 0, 0, 1, 0, 0);
  cropCtx.translate(640, 0);
  cropCtx.scale(-1, 1);
  cropCtx.drawImage(video, sourceX, box.y, box.side, box.side, 0, 0, 640, 640);
  cropCtx.restore();
  return new Promise((resolve) => {
    cropCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

let shownFrame = 0;

function showCartoon(blob) {
  const serial = ++shownFrame;
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    if (serial !== shownFrame) return;
    cartoonCtx.drawImage(image, 0, 0, cartoonCanvas.width, cartoonCanvas.height);
    cartoonEmpty.hidden = true;
  };
  image.src = url;
  frames += 1;
  const now = performance.now();
  if (now - fpsStamp > 1000) {
    const fps = Math.round((frames * 1000) / (now - fpsStamp));
    frames = 0;
    fpsStamp = now;
    if (!freezeBtn.disabled || freezeBtn.textContent.startsWith("定格")) {
      setStatus(`跟拍中 · ${fps} 帧/秒`);
    }
  }
}

function connectSocket() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${protocol}://${location.host}/ws/cartoon`);
  socket.binaryType = "blob";
  socket.onopen = () => {
    setNote("");
    pump();
  };
  socket.onmessage = (event) => {
    sending = false;
    if (typeof event.data === "string") {
      try {
        const payload = JSON.parse(event.data);
        setNote(payload.error || "跟拍中断了。");
      } catch {
        setNote("跟拍中断了。");
      }
      return;
    }
    if (event.data instanceof Blob && event.data.type === "application/json") {
      event.data.text().then((text) => {
        const payload = JSON.parse(text);
        setNote(payload.error || "跟拍中断了。");
      });
      return;
    }
    gotFrame = true;
    freezeBtn.disabled = false;
    showCartoon(event.data);
    pump();
  };
  socket.onerror = () => setNote("跟拍服务没有连上。");
  socket.onclose = () => {
    sending = false;
  };
}

async function pump() {
  if (!socket || socket.readyState !== WebSocket.OPEN || sending) return;
  const blob = await grabCrop();
  if (!blob) {
    setTimeout(pump, 200);
    return;
  }
  if (socket.readyState !== WebSocket.OPEN) return;
  latestCrop = blob;
  if (freezeBtn.textContent.startsWith("定格")) freezeBtn.disabled = false;
  sending = true;
  socket.send(await blob.arrayBuffer());
}

async function openCamera() {
  setNote("");
  retryBtn.hidden = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    cameraEmpty.hidden = true;
    setStatus("正在连接跟拍");
    paintCamera();
    connectSocket();
  } catch (error) {
    cameraEmpty.hidden = false;
    retryBtn.hidden = false;
    freezeBtn.disabled = true;
    setStatus("摄像头没打开");
    setNote("没有打开摄像头。允许浏览器使用摄像头后再试。");
  }
}

freezeBtn.addEventListener("click", async () => {
  if (!latestCrop || freezeBtn.disabled) return;
  const snapshot = latestCrop;
  freezeBtn.disabled = true;
  freezeBtn.textContent = "正在生成定妆照";
  setNote("");
  try {
    const response = await fetch("/api/portrait", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: snapshot,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setNote(payload.error || "定妆照没有生成。");
      return;
    }
    const blob = await response.blob();
    if (portraitUrl) URL.revokeObjectURL(portraitUrl);
    if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    portraitUrl = URL.createObjectURL(blob);
    thumbUrl = URL.createObjectURL(snapshot);
    portraitImg.src = portraitUrl;
    thumbImg.src = thumbUrl;
    card.hidden = false;
  } catch {
    setNote("定妆照没有生成。页面和跟拍服务断开了。");
  } finally {
    freezeBtn.textContent = "定格，生成皮克斯定妆照";
    freezeBtn.disabled = !latestCrop;
    if (gotFrame) setStatus(statusEl.textContent.startsWith("跟拍中") ? statusEl.textContent : "跟拍中");
  }
});

retryBtn.addEventListener("click", openCamera);
openCamera();
