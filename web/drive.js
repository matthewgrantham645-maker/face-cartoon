import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17";

const video = document.querySelector("#video");
const cameraCanvas = document.querySelector("#camera");
const cameraCtx = cameraCanvas.getContext("2d");
const doodleCanvas = document.querySelector("#doodle");
const doodleCtx = doodleCanvas.getContext("2d");
const statusEl = document.querySelector("#status");
const noteEl = document.querySelector("#note");
const mirror = document.createElement("canvas");
const mirrorCtx = mirror.getContext("2d", { willReadFrequently: true });

const LEFT_EYE = [33, 133, 159, 145];
const RIGHT_EYE = [362, 263, 386, 374];
const NOSE = 1;

const sourceImage = new Image();
sourceImage.src = "/static/assets/crayon-doodle.jpg";

let landmarker = null;
let sourcePoints = null;
let smoothPoints = null;
let lastStamp = 0;

function setStatus(text) {
  statusEl.textContent = text;
}

function average(landmarks, indices, width, height) {
  let x = 0;
  let y = 0;
  indices.forEach((index) => {
    x += landmarks[index].x;
    y += landmarks[index].y;
  });
  return { x: (x / indices.length) * width, y: (y / indices.length) * height };
}

function anchors(landmarks, width, height) {
  return [
    average(landmarks, LEFT_EYE, width, height),
    average(landmarks, RIGHT_EYE, width, height),
    {
      x: landmarks[NOSE].x * width,
      y: landmarks[NOSE].y * height,
    },
  ];
}

function similarity(src, dst) {
  const srcMid = { x: (src[0].x + src[1].x) / 2, y: (src[0].y + src[1].y) / 2 };
  const dstMid = { x: (dst[0].x + dst[1].x) / 2, y: (dst[0].y + dst[1].y) / 2 };
  const srcSpan = { x: src[1].x - src[0].x, y: src[1].y - src[0].y };
  const dstSpan = { x: dst[1].x - dst[0].x, y: dst[1].y - dst[0].y };
  const srcLength = Math.hypot(srcSpan.x, srcSpan.y);
  const dstLength = Math.hypot(dstSpan.x, dstSpan.y);
  if (srcLength < 8 || dstLength < 8) return null;
  const scale = dstLength / srcLength;
  const angle = Math.atan2(dstSpan.y, dstSpan.x) - Math.atan2(srcSpan.y, srcSpan.x);
  const cos = Math.cos(angle) * scale;
  const sin = Math.sin(angle) * scale;
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: dstMid.x - (cos * srcMid.x - sin * srcMid.y),
    f: dstMid.y - (sin * srcMid.x + cos * srcMid.y),
  };
}

function smooth(points) {
  if (!smoothPoints) {
    smoothPoints = points.map((point) => ({ ...point }));
    return smoothPoints;
  }
  smoothPoints = smoothPoints.map((point, index) => ({
    x: point.x * 0.65 + points[index].x * 0.35,
    y: point.y * 0.65 + points[index].y * 0.35,
  }));
  return smoothPoints;
}

function fallbackSource(width, height) {
  return [
    { x: 0.405 * width, y: 0.485 * height },
    { x: 0.605 * width, y: 0.485 * height },
    { x: 0.505 * width, y: 0.58 * height },
  ];
}

async function createLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm",
  );
  const baseOptions = {
    modelAssetPath: "/static/assets/face_landmarker.task",
  };
  try {
    return await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { ...baseOptions, delegate: "GPU" },
      runningMode: "IMAGE",
      numFaces: 1,
    });
  } catch {
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { ...baseOptions, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 1,
    });
  }
}

function readSourcePoints() {
  const result = landmarker.detect(sourceImage);
  if (!result.faceLandmarks?.length) {
    sourcePoints = fallbackSource(sourceImage.width, sourceImage.height);
    noteEl.textContent = "涂鸦上没认出眼睛，用了预设位置。右边仍会跟着你的头转。";
    return;
  }
  sourcePoints = anchors(result.faceLandmarks[0], sourceImage.width, sourceImage.height);
}

function drawCamera(width, height) {
  if (cameraCanvas.width !== width) cameraCanvas.width = width;
  if (cameraCanvas.height !== height) cameraCanvas.height = height;
  cameraCtx.drawImage(mirror, 0, 0);
}

function drawDoodle(width, height, livePoints) {
  if (doodleCanvas.width !== width) doodleCanvas.width = width;
  if (doodleCanvas.height !== height) doodleCanvas.height = height;
  doodleCtx.setTransform(1, 0, 0, 1, 0, 0);
  doodleCtx.fillStyle = "#f4efe4";
  doodleCtx.fillRect(0, 0, width, height);
  const mapped = similarity(sourcePoints, smooth(livePoints));
  if (!mapped) return;
  doodleCtx.setTransform(mapped.a, mapped.b, mapped.c, mapped.d, mapped.e, mapped.f);
  doodleCtx.drawImage(sourceImage, 0, 0);
  doodleCtx.setTransform(1, 0, 0, 1, 0, 0);
}

function frame() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !landmarker || !sourcePoints) {
    requestAnimationFrame(frame);
    return;
  }
  if (mirror.width !== width) {
    mirror.width = width;
    mirror.height = height;
  }
  mirrorCtx.save();
  mirrorCtx.translate(width, 0);
  mirrorCtx.scale(-1, 1);
  mirrorCtx.drawImage(video, 0, 0, width, height);
  mirrorCtx.restore();
  drawCamera(width, height);

  const now = performance.now();
  if (now <= lastStamp) lastStamp = now - 1;
  const result = landmarker.detectForVideo(mirror, now);
  lastStamp = now;
  if (result.faceLandmarks?.length) {
    drawDoodle(width, height, anchors(result.faceLandmarks[0], width, height));
    setStatus("跟着动");
  } else {
    setStatus("把脸放进画面");
  }
  requestAnimationFrame(frame);
}

async function start() {
  setStatus("正在载入脸部跟踪");
  await sourceImage.decode();
  landmarker = await createLandmarker();
  readSourcePoints();
  await landmarker.setOptions({ runningMode: "VIDEO" });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  setStatus("正在对齐");
  requestAnimationFrame(frame);
}

start().catch(() => {
  setStatus("没准备好");
  noteEl.textContent = "脸部跟踪或摄像头没有打开。允许摄像头后再刷新。";
});
