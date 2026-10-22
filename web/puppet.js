import {
  FaceLandmarker,
  FilesetResolver,
  PoseLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17";

const video = document.querySelector("#video");
const cameraCanvas = document.querySelector("#camera");
const cameraCtx = cameraCanvas.getContext("2d");
const stage = document.querySelector("#stage");
const stageCtx = stage.getContext("2d");
const statusEl = document.querySelector("#status");
const noteEl = document.querySelector("#note");
const mirror = document.createElement("canvas");
const mirrorCtx = mirror.getContext("2d", { willReadFrequently: true });

const HEAD_PIVOT = { x: 512, y: 720 };
const BODY_PIVOT = { x: 512, y: 900 };
const EYES = [
  { x: 400, y: 508, rx: 68, ry: 44 },
  { x: 634, y: 502, rx: 70, ry: 46 },
];
const MOUTH = { x: 512, y: 652, rx: 76, ry: 84 };
const SKIN = "#faecd2";
const LIP = "#e7a08a";

const backdrop = new Image();
const head = new Image();
const body = new Image();
backdrop.src = "/static/assets/puppet/backdrop.jpg";
head.src = "/static/assets/puppet/head.png";
body.src = "/static/assets/puppet/body.png";

let faceTracker = null;
let poseTracker = null;
let rest = null;
let smooth = {};
let stamp = 0;

function setStatus(text) {
  statusEl.textContent = text;
}

function clamp(value, limit) {
  return Math.max(-limit, Math.min(limit, value));
}

function damp(key, value) {
  const previous = smooth[key];
  const next = previous === undefined ? value : previous * 0.62 + value * 0.38;
  smooth[key] = next;
  return next;
}

function blend(result, name) {
  const shapes = result.faceBlendshapes?.[0];
  if (!shapes) return 0;
  const found = shapes.categories.find((item) => item.categoryName === name);
  return found ? found.score : 0;
}

function loadImage(image) {
  return image.decode();
}

async function createFace(fileset) {
  const baseOptions = { modelAssetPath: "/static/assets/face_landmarker.task" };
  const options = {
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  };
  try {
    return await FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...baseOptions, delegate: "GPU" },
    });
  } catch {
    return FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...baseOptions, delegate: "CPU" },
    });
  }
}

async function createPose(fileset) {
  const baseOptions = { modelAssetPath: "/static/assets/pose_landmarker_lite.task" };
  const options = { runningMode: "VIDEO", numPoses: 1 };
  try {
    return await PoseLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...baseOptions, delegate: "GPU" },
    });
  } catch {
    return PoseLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...baseOptions, delegate: "CPU" },
    });
  }
}

function nextStamp() {
  const now = performance.now();
  stamp = Math.max(stamp + 1, now);
  return stamp;
}

function readMotion(face, pose) {
  const marks = face.faceLandmarks[0];
  const left = marks[33];
  const right = marks[263];
  const nose = marks[1];
  const roll = Math.atan2(right.y - left.y, right.x - left.x);
  let shoulderY = nose.y + 0.28;
  let shoulderRoll = roll;
  const poseMarks = pose?.landmarks?.[0];
  if (poseMarks) {
    const leftShoulder = poseMarks[11];
    const rightShoulder = poseMarks[12];
    shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    shoulderRoll = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x);
  }
  if (!rest) {
    rest = { x: nose.x, y: nose.y, roll, shoulderY, shoulderRoll };
  }
  const jaw = blend(face, "jawOpen");
  return {
    headX: damp("headX", clamp((nose.x - rest.x) * 240, 18)),
    headY: damp("headY", clamp((nose.y - rest.y) * 180, 12)),
    headRoll: damp("headRoll", clamp(roll - rest.roll, 0.12)),
    bodyX: damp("bodyX", clamp((nose.x - rest.x) * 90, 10)),
    bodyY: damp("bodyY", clamp((shoulderY - rest.shoulderY) * 140, 10)),
    bodyRoll: damp("bodyRoll", clamp((shoulderRoll - rest.shoulderRoll) * 0.65, 0.08)),
    blinkLeft: damp("blinkLeft", blend(face, "eyeBlinkLeft")),
    blinkRight: damp("blinkRight", blend(face, "eyeBlinkRight")),
    brow: damp("brow", blend(face, "browInnerUp")),
    mouth: damp("mouth", Math.min(jaw / 0.35, 1)),
  };
}

function drawPart(image, pivot, dx, dy, angle) {
  stageCtx.save();
  stageCtx.translate(pivot.x + dx, pivot.y + dy);
  stageCtx.rotate(angle);
  stageCtx.translate(-pivot.x, -pivot.y);
  stageCtx.drawImage(image, 0, 0);
  stageCtx.restore();
}

function drawLid(eye, blink, brow) {
  const cover = Math.max(0, Math.min(1, blink));
  if (cover < 0.04) return;
  const lift = brow * 8;
  stageCtx.save();
  stageCtx.beginPath();
  stageCtx.ellipse(eye.x, eye.y - lift, eye.rx, eye.ry, 0, 0, Math.PI * 2);
  stageCtx.clip();
  stageCtx.fillStyle = SKIN;
  stageCtx.fillRect(eye.x - eye.rx, eye.y - eye.ry - lift, eye.rx * 2, eye.ry * 1.7 * cover);
  stageCtx.fillStyle = "#2a211c";
  stageCtx.fillRect(
    eye.x - eye.rx,
    eye.y - eye.ry - lift + eye.ry * 1.7 * cover - 3,
    eye.rx * 2,
    4,
  );
  stageCtx.restore();
}

function drawMouth(open) {
  const cover = 1 - Math.max(0, Math.min(1, open));
  if (cover < 0.04) return;
  stageCtx.save();
  stageCtx.globalAlpha = cover;
  stageCtx.fillStyle = SKIN;
  stageCtx.beginPath();
  stageCtx.ellipse(MOUTH.x, MOUTH.y, MOUTH.rx, MOUTH.ry, 0, 0, Math.PI * 2);
  stageCtx.fill();
  stageCtx.globalAlpha = cover * 0.9;
  stageCtx.strokeStyle = LIP;
  stageCtx.lineWidth = 6;
  stageCtx.beginPath();
  stageCtx.ellipse(MOUTH.x, MOUTH.y + 6, MOUTH.rx * 0.55, 10, 0, 0.15, Math.PI - 0.15);
  stageCtx.stroke();
  stageCtx.restore();
}

function drawStage(motion) {
  stageCtx.setTransform(1, 0, 0, 1, 0, 0);
  stageCtx.clearRect(0, 0, 1024, 1024);
  stageCtx.drawImage(backdrop, 0, 0);
  drawPart(body, BODY_PIVOT, motion.bodyX, motion.bodyY, motion.bodyRoll);
  stageCtx.save();
  stageCtx.translate(HEAD_PIVOT.x + motion.headX, HEAD_PIVOT.y + motion.headY);
  stageCtx.rotate(motion.headRoll);
  stageCtx.translate(-HEAD_PIVOT.x, -HEAD_PIVOT.y);
  stageCtx.drawImage(head, 0, 0);
  drawLid(EYES[0], motion.blinkLeft, motion.brow);
  drawLid(EYES[1], motion.blinkRight, motion.brow);
  drawMouth(motion.mouth);
  stageCtx.restore();
}

function drawCamera(width, height) {
  if (cameraCanvas.width !== width) cameraCanvas.width = width;
  if (cameraCanvas.height !== height) cameraCanvas.height = height;
  cameraCtx.drawImage(mirror, 0, 0, width, height);
}

function frame() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !faceTracker) {
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

  const now = nextStamp();
  const face = faceTracker.detectForVideo(mirror, now);
  const pose = poseTracker ? poseTracker.detectForVideo(mirror, now) : null;
  if (face.faceLandmarks?.length) {
    drawStage(readMotion(face, pose));
    setStatus("人在跟着");
  } else {
    setStatus("把脸放进画面");
  }
  requestAnimationFrame(frame);
}

async function start() {
  setStatus("正在准备涂鸦");
  await Promise.all([loadImage(backdrop), loadImage(head), loadImage(body)]);
  drawStage({
    headX: 0, headY: 0, headRoll: 0, bodyX: 0, bodyY: 0, bodyRoll: 0,
    blinkLeft: 0, blinkRight: 0, brow: 0, mouth: 1,
  });
  setStatus("正在载入跟踪");
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm",
  );
  faceTracker = await createFace(fileset);
  try {
    poseTracker = await createPose(fileset);
  } catch {
    poseTracker = null;
    noteEl.textContent = "肩膀跟踪没载入，上半身先跟着头动。背景仍然不动。";
  }
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
  noteEl.textContent = "跟踪或摄像头没有打开。允许摄像头后再刷新。";
});
