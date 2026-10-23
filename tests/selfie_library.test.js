"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sandbox = { console, Date, Math, isFinite, crypto };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../docs/selfie/library.js"), "utf8"), sandbox);
const L = sandbox.SelfieLibrary;

function memory() {
  const map = new Map();
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, String(value)) };
}

const preset = L.PRESETS[0];
assert.equal(preset.name, "蜡笔手账");
assert.equal(preset.prompt.startsWith("把这张照片画成可爱、混乱的儿童蜡笔涂鸦。"), true);
assert.equal(preset.prompt.endsWith("不要干净线稿。"), true);

const store = memory();
const added = L.addStyle([], "  夜市  ", preset.prompt, "user-1");
L.writeStyles(store, added.styles);
assert.equal(JSON.stringify(L.readStyles(store)), JSON.stringify([{ id: "user-1", name: "夜市", prompt: preset.prompt }]));
assert.throws(() => L.updateStyle(added.styles, preset.id, "改", "字"), /不能修改/);
assert.throws(() => L.removeStyle(added.styles, preset.id), /不能删除/);
assert.throws(() => L.addStyle([], "", "有提示词"), /名称/);
const updated = L.updateStyle(added.styles, "user-1", "夜市灯", "只要灯光");
assert.equal(L.removeStyle(updated, "user-1").length, 0);
store.setItem(L.STYLE_KEY, JSON.stringify([{ id: preset.id, name: "冒充", prompt: "不要覆盖内置" }, { id: "ok", name: "手账", prompt: "保留" }]));
assert.equal(JSON.stringify(L.readStyles(store).map((item) => item.id)), JSON.stringify(["ok"]));

const session = memory();
const beats = memory();
const first = L.touchSession(session, beats, 1000, 15000);
const again = L.touchSession(session, beats, 2000, 15000);
assert.equal(again.id, first.id);
assert.equal(again.dead.length, 0);
const reopened = L.touchSession(memory(), beats, 20000, 15000);
assert.notEqual(reopened.id, first.id);
assert.equal(JSON.stringify(reopened.dead), JSON.stringify([first.id]));
const homeAndBack = L.touchSession(session, beats, 40000, 15000);
assert.equal(homeAndBack.id, first.id);
assert.equal(homeAndBack.dead.includes(first.id), false);

assert.equal(JSON.stringify(L.frameSize(1920, 1080, 1024)), JSON.stringify({ width: 1024, height: 576 }));
assert.equal(JSON.stringify(L.frameSize(800, 600, 1024)), JSON.stringify({ width: 800, height: 600 }));
assert.equal(L.frameSize(0, 480, 1024), null);
const calls = [];
const ctx = {
  setTransform() { calls.push(["setTransform"]); },
  clearRect() { calls.push(["clearRect"]); },
  translate(x, y) { calls.push(["translate", x, y]); },
  scale(x, y) { calls.push(["scale", x, y]); },
  drawImage(source, x, y, w, h) { calls.push(["drawImage", source, x, y, w, h]); }
};
L.drawMirroredFrame(ctx, "video", 320, 240);
assert.equal(JSON.stringify(calls[2]), JSON.stringify(["translate", 320, 0]));
assert.equal(JSON.stringify(calls[3]), JSON.stringify(["scale", -1, 1]));
assert.equal(JSON.stringify(calls[4]), JSON.stringify(["drawImage", "video", 0, 0, 320, 240]));
console.log("selfie library ok");


// Every selectable preset must produce a valid request, including supplied long prompts.
assert.equal(L.PRESETS.length, 24);
assert.equal(new Set(L.PRESETS.map(s => s.id)).size, 24);
assert.ok(L.PRESETS.some(s => s.id === L.DEFAULT_STYLE));
for (const s of L.PRESETS) {
  assert.ok(s.name && s.category && s.note);
  assert.ok(L.buildPrompt(s.prompt, true).length <= 4000);
  assert.ok(L.buildPrompt(s.prompt, true).includes("嘴唇闭合"));
}
assert.ok(!L.buildPrompt("自由构图", false).includes("嘴唇闭合"));
assert.throws(() => L.buildPrompt("x".repeat(4000), true), /过长/);
for (const mime of ["jpeg", "png", "webp"]) assert.ok(L.imageDataURL(`data:image/${mime};base64,AAAA`));
assert.ok(!L.imageDataURL("https://example.com/a.png"));
assert.ok(!L.imageDataURL("data:image/svg+xml;base64,AAAA"));
