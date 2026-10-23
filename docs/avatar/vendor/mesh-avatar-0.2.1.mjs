// Locally patched for portrait-v11: pinned backgrounds, blink-only lids,
// original tooth-free lips and non-folding deformation. See README-mesh-avatar.md.
/*! fflate
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const te = (n, e, t) => {
  (typeof n != "number" || !Number.isFinite(n)) && t.push(`${e}: expected a finite number`);
}, Oe = (n, e, t) => {
  te(n, e, t), typeof n == "number" && n <= 0 && t.push(`${e}: must be positive`);
}, xe = (n, e, t) => {
  Oe(n, e, t), typeof n == "number" && !Number.isInteger(n) && t.push(`${e}: expected an integer`);
}, _e = (n, e, t) => {
  te(n, e, t), typeof n == "number" && !Number.isInteger(n) && t.push(`${e}: expected an integer`);
}, kt = (n, e, t) => {
  (typeof n != "string" || !n.trim()) && t.push(`${e}: expected a non-empty string`);
}, de = (n, e = 0, t = 1 / 0) => (r, a, s) => {
  if (!Array.isArray(r)) {
    s.push(`${a}: expected an array`);
    return;
  }
  (r.length < e || r.length > t) && s.push(`${a}: expected ${e}..${t} items`), r.forEach((l, m) => n(l, `${a}[${m}]`, s));
}, ge = de(te, 2, 2), ce = (n, e, t) => {
  ge(n, e, t), Array.isArray(n) && n.length === 2 && n[0] >= n[1] && t.push(`${e}: start must be less than end`);
}, se = (n, e = []) => (t, r, a) => {
  if (!t || typeof t != "object" || Array.isArray(t)) {
    a.push(`${r}: expected an object`);
    return;
  }
  const s = t;
  for (const [l, m] of Object.entries(n))
    s[l] === void 0 && e.includes(l) || m(s[l], `${r}.${l}`, a);
}, Ne = { cx: te, cy: te, rx: Oe, ry: Oe }, ye = se(Ne), $e = de(ge, 3), _t = de(ge, 2), Ke = (n, e, t) => {
  te(n, e, t), typeof n == "number" && (n < 0 || n > 1) && t.push(`${e}: must be between 0 and 1`);
}, pn = (n) => se({
  version: (e, t, r) => {
    e !== 1 && r.push(`${t}: only version 1 is supported`);
  },
  image: se({ width: xe, height: xe }),
  head: se({
    ...Ne,
    shiftX: te,
    shiftY: te,
    pivotX: te,
    pivotY: te,
    maxRoll: te,
    weightBand: ce,
    turnBand: ce
  }),
  body: se({
    pivotX: te,
    pivotY: te,
    maxRoll: te,
    breathBand: ce,
    rollBand: ce,
    chest: ye,
    shoulders: de(ye)
  }),
  face: se({
    nose: ye,
    mouth: ye,
    eyeA: ye,
    eyeB: ye,
    earL: ye,
    earR: ye,
    brow: se({ ...Ne, band: ce }),
    jaw: se({ ...Ne, band: ce })
  }),
  buns: se({ bunL: ye, bunR: ye }, ["bunL", "bunR"]),
  eyes: de(se({
    opening: $e,
    roi: $e,
    x0: te,
    x1: te,
    top: de(te, 24, 24),
    bot: de(te, 24, 24)
  }, n ? ["x0", "x1", "top", "bot"] : []), 2, 2),
  mouth: se({
    cx: te,
    cy: te,
    angle: te,
    halfLen: Oe,
    bow: te,
    area: se({ ...Ne, angle: te })
  }),
  cheeks: de(ge, 2, 2),
  strands: de(se({ name: kt, nodes: _t, sigma: Oe, k: Oe, max: Oe })),
  accessories: de(se({
    name: kt,
    pivot: ge,
    tip: ge,
    split: Ke,
    box: de(_e, 4, 4),
    color: se({ redness: Ke, minRed: te })
  })),
  hand: se({
    outline: $e,
    jaw: _t,
    jawRange: ce,
    background: $e,
    elbow: ge,
    wrist: ge,
    knuckle: ge,
    contact: ge,
    forearmShare: Ke,
    armBand: ce,
    wristBand: ce,
    handBand: ce,
    fingerXBand: ce,
    fingerYBand: ce,
    pinBand: ce
  }),
  mesh: se({
    baseCell: xe,
    fine: se({
      x0: _e,
      x1: _e,
      y0: _e,
      y1: _e,
      cell: xe
    }),
    handCell: xe,
    tasselCell: xe,
    eyeBallCell: xe,
    eyeCell: xe,
    spriteCell: xe
  }),
  view: se({ padTop: te, padSide: te, gazeCenter: ge }, ["gazeCenter"])
}, ["buns", "strands", "accessories", "hand"]);
function Gt(n, e = {}) {
  const t = [];
  if (pn(e.draft ?? !1)(n, "rig", t), t.length) return t;
  const r = n;
  if (r.portrait !== undefined && (!r.portrait || r.portrait.version !== 2 || r.portrait.teeth !== false)) t.push("rig.portrait: expected version 2 with teeth=false");
  r.eyes.forEach((a, s) => {
    const l = ["x0", "x1", "top", "bot"];
    if (!(e.draft && l.every((m) => a[m] === void 0))) {
      if (l.some((m) => a[m] === void 0)) {
        t.push(`rig.eyes[${s}]: supply all x0/x1/top/bot fields or omit all in a draft`);
        return;
      }
      a.x0 >= a.x1 && t.push(`rig.eyes[${s}].x1: must exceed x0`), a.top.some((m, b) => m > a.bot[b]) && t.push(`rig.eyes[${s}].top: must not exceed bottom curve`);
    }
  }), (r.mesh.fine.x0 >= r.mesh.fine.x1 || r.mesh.fine.y0 >= r.mesh.fine.y1) && t.push("rig.mesh.fine: rectangle must have positive area"), (r.view.padTop <= -1 || r.view.padTop >= 1 || r.view.padSide <= -0.5) && t.push("rig.view: margins must leave a positive viewport");
  for (const [a, s] of (r.strands ?? []).entries())
    s.nodes.some((l, m) => m > 0 && l[0] === s.nodes[m - 1][0] && l[1] === s.nodes[m - 1][1]) && t.push(`rig.strands[${a}].nodes: consecutive nodes must differ`);
  for (const [a, s] of (r.accessories ?? []).entries())
    (s.box[0] < 0 || s.box[1] < 0 || s.box[2] > r.image.width || s.box[3] > r.image.height) && t.push(`rig.accessories[${a}].box: rectangle must stay inside the image`), (s.split <= 0 || s.split >= 1) && t.push(`rig.accessories[${a}].split: must be strictly between 0 and 1`), s.pivot.every((l, m) => l === s.tip[m]) && t.push(`rig.accessories[${a}].tip: must differ from pivot`), (s.box[0] >= s.box[2] || s.box[1] >= s.box[3]) && t.push(`rig.accessories[${a}].box: rectangle must have positive area`);
  return t;
}
function bt(n) {
  const e = Gt(n);
  if (e.length) throw new Error(`Invalid rig:
${e.join(`
`)}`);
  return structuredClone(n);
}
const De = [
  { id: "angleX", label: "Face angle X", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleY", label: "Face angle Y", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleZ", label: "Face roll", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "bodyAngleX", label: "Body angle X", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "bodyAngleZ", label: "Body roll", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "breath", label: "Breath", min: 0, max: 1, def: 0, group: "Head and body" },
  { id: "eyeLOpen", label: "Left eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeROpen", label: "Right eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeSmile", label: "Eye smile", min: 0, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeX", label: "Gaze X", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeY", label: "Gaze Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browY", label: "Brow Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browAngle", label: "Brow angle", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "mouthOpen", label: "Mouth open", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "mouthForm", label: "Mouth form (i to o)", min: -1, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "blush", label: "Blush", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "armAngle", label: "Arm angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "handAngle", label: "Wrist angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "fingerTap", label: "Finger tap", min: 0, max: 1, def: 0, group: "Hand" }
];
function dn(n) {
  const e = { w: n.image.width, h: n.image.height }, t = (g, A, E) => E ? Math.exp(-(((g - E.cx) / E.rx) ** 2 + ((A - E.cy) / E.ry) ** 2)) : 0, r = 24, a = n.eyes;
  function s(g, A) {
    const E = Math.min(1, Math.max(0, A)) * (r - 1), k = Math.min(Math.floor(E), r - 2), N = E - k;
    return g[k] + (g[k + 1] - g[k]) * N;
  }
  function l(g, A, E, k) {
    A = Math.min(1, Math.max(0, A));
    const N = s(g.top, A), z = s(g.bot, A), F = 1 - E, j = 4 * A * (1 - A), M = s(g.bot, 0.5) - s(g.top, 0.5), R = g.top[0] + (g.top[r - 1] - g.top[0]) * A - 0.3 * M * j, W = n.portrait?.version === 2 ? Math.max(N, g.top[0] + (g.top[r - 1] - g.top[0]) * A + M * (0.10 - 0.25 * k) * j) : Math.max(N, z + 1 + (R - z - 1) * k);
    return [(W - N) * Math.max(F, -0.07), F > 0 ? (W - z) * F * (n.portrait?.version === 2 ? 1 : k) : 0];
  }
  const m = [[-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1]], b = 5;
  function d(g, A, E, k) {
    let N = 0, z = 0;
    for (const [R, W] of m) {
      const [Q, ne] = l(g, (A + R * b - g.x0) / (g.x1 - g.x0), E, k);
      N += Q * W / 9, z += ne * W / 9;
    }
    const F = Math.min(1, Math.max(0, (A - g.x0) / (g.x1 - g.x0))), j = s(g.top, F), M = s(g.bot, F);
    return { top: j, bot: M, b: 1 - E, lid: j + N, bc: M + z };
  }
  function p(g, A, E, k, N, z) {
    const F = d(g, E, N, z);
    return A === "lash" ? F.lid - (F.top - k) * (1 - 0.3 * Math.min(1, Math.max(0, F.b))) : A === "low" ? k + (F.bc - F.bot) : A === "crease" ? k + (F.lid - F.top) * 0.22 : k;
  }
  function i(g, A, E) {
    const k = Math.min(1, Math.max(0, 1 - A));
    return g === "low" ? 1 - Math.min(1, k * E * 1.2) : g === "crease" ? 1 - 0.45 * k : 1;
  }
  const u = n.mouth, S = n.cheeks, y = n.head, c = n.body, v = (g, A, E) => {
    const k = Math.min(1, Math.max(0, (E - g) / (A - g)));
    return k * k * (3 - 2 * k);
  };
  function x(g, A) {
    return 1 - v(...y.weightBand, A);
  }
  function o(g, A) {
    return 1 - v(...y.turnBand, A);
  }
  const h = n.strands ?? [];
  function T(g, A, E) {
    let k = 1 / 0, N = 0;
    const z = E.length - 1;
    for (let F = 0; F < z; F++) {
      const [j, M] = E[F], [R, W] = E[F + 1], Q = R - j, ne = W - M, ee = Math.min(1, Math.max(0, ((g - j) * Q + (A - M) * ne) / (Q * Q + ne * ne))), he = Math.hypot(g - j - Q * ee, A - M - ne * ee);
      he < k && (k = he, N = (F + ee) / z);
    }
    return [k, N];
  }
  function f(g, A, E) {
    if (E < 0.02) return [];
    const k = [];
    let N = 0;
    h.forEach((F, j) => {
      const [M, R] = T(g, A, F.nodes), W = Math.exp(-((M / F.sigma) ** 2));
      W < 0.02 || (k.push([j, W, R]), N += W);
    });
    const z = Math.max(1, N);
    return k.map(([F, j, M]) => [F, E * j / z * v(0.04, 0.55, M), M]);
  }
  function w(g, A, E = 1) {
    return {
      head: x(g, A),
      turn: o(g, A),
      strands: f(g, A, E),
      bunL: t(g, A, n.buns?.bunL),
      bunR: t(g, A, n.buns?.bunR),
      brow: t(g, A, n.face.brow) * (1 - v(...n.face.brow.band, A)),
      // chin below the mouth line drops a little when the mouth opens
      jaw: t(g, A, n.face.jaw) * v(...n.face.jaw.band, A),
      // per-feature depth for head turns (nose sticks out most, ears sit at the back)
      nose: t(g, A, n.face.nose),
      mouth: t(g, A, n.face.mouth),
      eyeA: t(g, A, n.face.eyeA),
      eyeB: t(g, A, n.face.eyeB),
      earR: t(g, A, n.face.earR),
      earL: t(g, A, n.face.earL),
      chest: t(g, A, c.chest),
      breath: 1 - v(...c.breathBand, A),
      shoulder: c.shoulders.reduce((k, N) => k + t(g, A, N), 0)
    };
  }
  function B(g, A, E, k) {
    const N = (g - y.cx) / y.rx, z = (A - y.cy) / y.ry, F = 1 - N * N - z * z;
    if (F <= 0) return [0, 0];
    const j = v(0, 0.84, F);
    return [E * y.shiftX * j, -k * y.shiftY * j];
  }
  function Y(g, A, E, k) {
    const N = Math.cos(k), z = Math.sin(k), F = g[0] - A, j = g[1] - E;
    g[0] = A + F * N - j * z, g[1] = E + F * z + j * N;
  }
  function I(g, A, E, k = A) {
    const N = B(g[0], g[1], E.angleX / 30, E.angleY / 30);
    g[0] += N[0] * k, g[1] += N[1] * k, !(A <= 0) && Y(g, y.pivotX, y.pivotY, -E.angleZ / 30 * y.maxRoll * A);
  }
  function _(g, A, E, k = 0, N = 1, z = 0) {
    const F = E.breath;
    g[1] -= F * (5 * N + 4 * z), g[0] += (g[0] - c.chest.cx) * 0.012 * F * k, g[0] += E.bodyAngleX / 10 * (7 + 9 * k), Y(g, c.pivotX, c.pivotY, -E.bodyAngleZ / 10 * c.maxRoll * (1 - v(...c.rollBand, A)));
  }
  function U(g, A, E, k, N, z) {
    const F = z;
    F[0] = g, F[1] = A;
    const j = N.gain;
    for (const [W, Q, ne] of E.strands) {
      const ee = N.strands?.[W];
      if (!ee) continue;
      const he = ne * 3, oe = Math.min(2, Math.floor(he)), ke = he - oe;
      F[0] += (ee[oe][0] + (ee[oe + 1][0] - ee[oe][0]) * ke) * Q * j, F[1] += (ee[oe][1] + (ee[oe + 1][1] - ee[oe][1]) * ke) * Q * j;
    }
    if (F[0] += (N.bunL[0] * E.bunL + N.bunR[0] * E.bunR) * j, F[1] += (N.bunL[1] * E.bunL + N.bunR[1] * E.bunR) * j, F[1] -= k.browY * 7 * E.brow, E.brow > 0.01) {
      const W = k.browAngle * 0.12 * E.brow;
      F[1] += (g - n.face.brow.cx) * Math.sin(W);
    }
    F[1] += k.mouthOpen * 3.5 * E.jaw;
    const M = k.angleX / 30, R = k.angleY / 30;
    return F[0] += M * (8 * E.nose + 5 * E.mouth) + (g - n.face.eyeA.cx) * 0.12 * M * E.eyeA - (g - n.face.eyeB.cx) * 0.12 * M * E.eyeB - M * 9 * E.earR + M * 4 * E.earL - M * 10 * (E.bunL + E.bunR), F[1] -= R * (6 * E.nose + 3 * E.mouth), F[1] += (A - n.face.eyeA.cy) * -0.06 * Math.abs(R) * E.eyeA + (A - n.face.eyeB.cy) * -0.06 * Math.abs(R) * E.eyeB, I(F, E.head, k, E.turn), _(F, A, k, E.chest, E.breath, E.shoulder), F[0] = g + (F[0] - g) * (E.portrait ?? 1) * (k.deformGain ?? 1), F[1] = A + (F[1] - A) * (E.portrait ?? 1) * (k.deformGain ?? 1), F;
  }
  const O = n.hand, C = O?.elbow ?? [0, 0], $ = O?.wrist ?? [0, 0], V = O?.knuckle ?? [0, 0], X = O?.contact ?? [0, 0], D = O?.forearmShare ?? 0;
  function H(g, A) {
    return O ? {
      arm: 1 - v(...O.armBand, A),
      wrist: 1 - v(...O.wristBand, A),
      hand: 1 - v(...O.handBand, A),
      finger: v(...O.fingerXBand, g) * (1 - v(...O.fingerYBand, A)),
      pinBottom: v(...O.pinBand, A)
    } : { arm: 0, wrist: 0, hand: 0, finger: 0, pinBottom: 0 };
  }
  const L = (g, A, E, k) => {
    const N = g[0] - A[0], z = g[1] - A[1];
    return [A[0] + N * E - z * k, A[1] + N * k + z * E];
  }, Z = (g) => Math.atan2(g[1], g[0]);
  function P(g) {
    const A = [...X];
    I(A, x(...X), g, o(...X)), _(A, X[1], g, 0, 1, 0);
    const E = [...C];
    _(E, C[1], g, 0, 0, 0);
    const N = (Z([A[0] - E[0], A[1] - E[1]]) - Z([X[0] - C[0], X[1] - C[1]])) * D, z = Math.cos(N), F = Math.sin(N), j = (ne) => {
      const ee = L(ne, C, z, F);
      return [ee[0] + E[0] - C[0], ee[1] + E[1] - C[1]];
    }, M = j($), R = j(X), W = Z([A[0] - M[0], A[1] - M[1]]) - Z([R[0] - M[0], R[1] - M[1]]), Q = Math.min(1.03, Math.max(0.97, Math.hypot(A[0] - M[0], A[1] - M[1]) / Math.hypot(R[0] - M[0], R[1] - M[1])));
    return { tr: j, w: M, b: W, k: Q };
  }
  function G(g, A, E, k, N, z) {
    let F = [g, A];
    F = L(F, V, Math.cos(k.fingerTap * 0.07 * E.finger), Math.sin(k.fingerTap * 0.07 * E.finger));
    const j = -k.handAngle / 10 * 0.045 * E.wrist, M = -k.armAngle / 10 * 0.015 * E.arm;
    F = L(F, $, Math.cos(j), Math.sin(j)), F = L(F, C, Math.cos(M), Math.sin(M)), F = N.tr(F);
    const R = N.b * E.hand, W = 1 + (N.k - 1) * E.hand;
    return F = L(F, N.w, Math.cos(R) * W, Math.sin(R) * W), F[1] += (A - F[1]) * E.pinBottom, z[0] = F[0], z[1] = F[1], z;
  }
  const J = n.accessories ?? [];
  function q(g, A, E, k) {
    const N = w(g.pivot[0], g.pivot[1]);
    return U(g.pivot[0], g.pivot[1], N, A, E, k);
  }
  return { IMG: e, EYES: a, MOUTH: u, CHEEKS: S, STRANDS: h, TASSELS: J, headWeight: x, turnWeight: o, baseWeights: w, deformBase: U, applyHead: I, applyBody: _, handWeights: H, handFrame: P, deformHand: G, eyePartY: p, eyePartAlpha: i, tasselAnchor: q };
}
function gn(n, e, t, r = !1) {
  const a = r ? Math.max(e, t) * 2 : 1, s = new Float32Array(n.length), l = Math.SQRT2;
  for (let m = 0; m < t; m++) for (let b = 0; b < e; b++) {
    const d = m * e + b;
    n[d] <= 3 || (s[d] = Math.min(
      b ? s[d - 1] + 1 : a,
      m ? s[d - e] + 1 : a,
      b && m ? s[d - e - 1] + l : a,
      m && b + 1 < e ? s[d - e + 1] + l : a
    ));
  }
  for (let m = t - 1; m >= 0; m--) for (let b = e - 1; b >= 0; b--) {
    const d = m * e + b;
    !n[d] || n[d] <= 3 || (s[d] = Math.min(
      s[d],
      b + 1 < e ? s[d + 1] + 1 : a,
      m + 1 < t ? s[d + e] + 1 : a,
      b && m + 1 < t ? s[d + e - 1] + l : a,
      b + 1 < e && m + 1 < t ? s[d + e + 1] + l : a
    ));
  }
  return s;
}
function Qe(n, e, t) {
  return Math.exp(-(((n - t.cx) / t.rx) ** 2 + ((e - t.cy) / t.ry) ** 2));
}
function yn(n, e, t) {
  const r = ((n - t.head.cx) / t.head.rx) ** 2 + ((e - t.head.cy) / t.head.ry) ** 2;
  let a = t.head.rx * 0.8 * Math.sqrt(Math.max(0, 1 - r)) + t.body.chest.rx * 0.23 * Qe(n, e, t.body.chest);
  a += t.face.nose.rx * 0.2 * Qe(n, e, t.face.nose);
  for (const [s, l] of t.cheeks) a += t.head.rx * 0.012 * Qe(n, e, { cx: s, cy: l, rx: t.head.rx * 0.3, ry: t.head.ry * 0.16 });
  return a;
}
function Ge(n, e, t, r) {
  const a = new Float32Array(n.length), s = new Float32Array(n.length), l = (m, b, d, p, i, u) => {
    for (let S = 0; S < p; S++) {
      const y = S * u;
      let c = 0, v = 0;
      for (let x = 0; x < Math.min(r, d - 1) + 1; x++)
        c += m[y + x * i], v++;
      for (let x = 0; x < d; x++) {
        b[y + x * i] = c / v;
        const o = x + r + 1, h = x - r;
        o < d && (c += m[y + o * i], v++), h >= 0 && (c -= m[y + h * i], v--);
      }
    }
  };
  return l(n, a, e, t, 1, e), l(a, s, t, e, e, 1), s;
}
function vn(n, e, t, r) {
  const a = Ge(n, t, r, 1), s = Ge(n, t, r, 6), l = new Float32Array(n.length);
  for (let d = 0; d < l.length; d++) l[d] = e[d] > 128 ? a[d] - s[d] : 0;
  const m = new Float32Array(n.length * 2), b = (d, p) => l[Math.max(0, Math.min(r - 1, p)) * t + Math.max(0, Math.min(t - 1, d))];
  for (let d = 0; d < r; d++) for (let p = 0; p < t; p++) {
    const i = d * t + p;
    e[i] <= 128 || (m[2 * i] = Math.max(-1, Math.min(1, -(b(p + 1, d) - b(p - 1, d)) * 4)), m[2 * i + 1] = Math.max(-1, Math.min(1, -(b(p, d + 1) - b(p, d - 1)) * 4)));
  }
  return m;
}
function bn(n, e, t, r, a, s = !0, l) {
  const m = !!a && r[0] === 0 && r[1] === 0 && r[2] === a.image.width && r[3] === a.image.height, b = gn(n, e, t, m), d = new Float32Array(n.length), p = r[2] / e, i = r[3] / t, u = Math.min(p, i), S = Math.min(r[2], r[3]) * 0.08;
  for (let o = 0; o < t; o++) for (let h = 0; h < e; h++) {
    const T = o * e + h;
    d[T] = (s ? Math.sqrt(b[T] * u * S) * 0.55 : 0) + (a ? yn(r[0] + (h + 0.5) * p, r[1] + (o + 0.5) * i, a) : 0);
  }
  const y = Math.max(1, Math.round(Math.min(e, t) * 0.02));
  d.set(Ge(Ge(d, e, t, y), e, t, y));
  const c = l ? vn(l, n, e, t) : null, v = new Uint8Array(e * t * 4), x = (o, h) => d[Math.max(0, Math.min(t - 1, h)) * e + Math.max(0, Math.min(e - 1, o))];
  for (let o = 0; o < t; o++) for (let h = 0; h < e; h++) {
    const T = -(x(h + 2, o) - x(h - 2, o)) / (4 * p), f = -(x(h, o + 2) - x(h, o - 2)) / (4 * i), w = Math.hypot(T, f, 1), B = (o * e + h) * 4, Y = o * e + h;
    v[B] = Math.round((T / w * 0.5 + 0.5) * 255), v[B + 1] = Math.round((f / w * 0.5 + 0.5) * 255), v[B + 2] = Math.round(((c?.[2 * Y] ?? 0) * 0.5 + 0.5) * 255), v[B + 3] = Math.round(((c?.[2 * Y + 1] ?? 0) * 0.5 + 0.5) * 255);
  }
  return v;
}
const Ft = /* @__PURE__ */ new WeakMap();
function xn(n, e, t, r) {
  const a = JSON.stringify([e, t.head, t.body.chest, t.face.nose, t.cheeks, r]), s = Ft.get(n);
  if (s?.key === a) return { ...s, computed: !1, ms: 0 };
  const l = performance.now(), m = Math.min(1, 512 / Math.max(n.width, n.height)), b = Math.max(1, Math.round(n.width * m)), d = Math.max(1, Math.round(n.height * m)), p = document.createElement("canvas");
  p.width = b, p.height = d;
  const i = p.getContext("2d", { willReadFrequently: !0 });
  i.drawImage(n, 0, 0, b, d);
  const u = i.getImageData(0, 0, b, d).data, S = new Uint8Array(b * d), y = new Float32Array(b * d);
  for (let v = 0; v < S.length; v++)
    S[v] = u[4 * v + 3], y[v] = (0.2126 * u[4 * v] + 0.7152 * u[4 * v + 1] + 0.0722 * u[4 * v + 2]) / 255;
  const c = { key: a, data: bn(S, b, d, e, t, r, r ? y : void 0), width: b, height: d };
  return Ft.set(n, c), { ...c, computed: !0, ms: performance.now() - l };
}
const Re = Object.freeze({
  enabled: !1,
  x: 0.2,
  y: 0.2,
  z: 0.45,
  color: 16777215,
  strength: 0.8,
  intensity: 0.8,
  ambient: 0.4,
  mode: "soft",
  shadow: !1,
  reach: 1.2,
  ambientColor: 15659256,
  softness: 0.45,
  specular: 0.12,
  rim: 0.3,
  detail: 0.4
}), Bt = {
  x: [0, 1],
  y: [0, 1],
  z: [0.1, 2],
  color: [0, 16777215],
  strength: [0, 1],
  intensity: [0, 2],
  ambient: [0, 1],
  reach: [0.2, 3],
  ambientColor: [0, 16777215],
  softness: [0, 1],
  specular: [0, 1],
  rim: [0, 1],
  detail: [0, 1]
}, wn = /* @__PURE__ */ new Set(["color", "ambientColor"]);
function An(n) {
  if (!n || typeof n != "object" || Array.isArray(n)) return null;
  const e = n;
  if (Object.keys(e).length !== Object.keys(Re).length || Object.keys(e).some((r) => !(r in Re)) || ![!0, !1].includes(e.enabled) || ![!0, !1].includes(e.shadow) || !["soft", "cel"].includes(e.mode)) return null;
  const t = { ...Re, enabled: e.enabled, shadow: e.shadow, mode: e.mode };
  for (const r of Object.keys(Bt)) {
    const a = e[r], [s, l] = Bt[r];
    if (typeof a != "number" || !Number.isFinite(a) || wn.has(r) && !Number.isInteger(a)) return null;
    t[r] = Math.max(s, Math.min(l, a));
  }
  return t;
}
function Sr(n) {
  return `#${n.toString(16).padStart(6, "0")}`;
}
const He = -0.1, Mn = 0.9, En = 1, Sn = 1.06;
function Tn(n, e) {
  return [(0.5 - n) * 0.12, (0.5 - e) * 0.12];
}
function On(n, e, t, r) {
  const a = n * Math.PI / 180, s = e * Math.PI / 180, l = -t / 30 * r, m = Math.cos(a), b = Math.sin(a), d = Math.cos(s), p = Math.sin(s), i = Math.cos(l), u = Math.sin(l);
  return [
    i * m,
    u * m,
    -b,
    i * b * p - u * d,
    u * b * p + i * d,
    m * p,
    i * b * d + u * p,
    u * b * d - i * p,
    m * d
  ];
}
class Rn {
  constructor(e, t) {
    this.gl = e, this.program = t(e, `#version 300 es
      out vec2 vUv;
      void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0, 1); }`, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o;
      uniform sampler2D uTex; uniform vec2 uStep; uniform vec2 uShift; uniform int uPass;
      float alphaAt(vec2 p) { if (any(lessThan(p, vec2(0))) || any(greaterThan(p, vec2(1)))) return 0.0; return texture(uTex, p).a; }
      void main() {
        if (uPass == 2) { o = texture(uTex, vUv); return; }
        vec2 p = vUv - uShift;
        float a = alphaAt(p) * 0.227027;
        a += (alphaAt(p + uStep * 1.384615) + alphaAt(p - uStep * 1.384615)) * 0.316216;
        a += (alphaAt(p + uStep * 3.230769) + alphaAt(p - uStep * 3.230769)) * 0.070270;
        o = uPass == 0 ? vec4(0, 0, 0, a) : vec4(vec3(0.035, 0.045, 0.065) * a * 0.28, a * 0.28);
      }`), this.vao = e.createVertexArray(), this.targets = [];
  }
  target(e, t) {
    const r = this.gl, a = r.createTexture(), s = r.createFramebuffer();
    if (r.bindTexture(r.TEXTURE_2D, a), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, e, t, 0, r.RGBA, r.UNSIGNED_BYTE, null), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MIN_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MAG_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_S, r.CLAMP_TO_EDGE), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_T, r.CLAMP_TO_EDGE), r.bindFramebuffer(r.FRAMEBUFFER, s), r.framebufferTexture2D(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0, r.TEXTURE_2D, a, 0), r.checkFramebufferStatus(r.FRAMEBUFFER) !== r.FRAMEBUFFER_COMPLETE) throw new Error("Shadow framebuffer unavailable");
    return { texture: a, framebuffer: s };
  }
  begin(e, t) {
    const r = this.gl;
    (this.width !== e || this.height !== t) && (this.clearTargets(), this.width = e, this.height = t, this.targets = [this.target(e, t), this.target(Math.ceil(e / 2), Math.ceil(t / 2))]), r.bindFramebuffer(r.FRAMEBUFFER, this.targets[0].framebuffer), r.viewport(0, 0, e, t), r.clearColor(0, 0, 0, 0), r.clear(r.COLOR_BUFFER_BIT);
  }
  composite(e) {
    const t = this.gl, { prog: r, u: a } = this.program, s = this.width, l = this.height;
    t.useProgram(r), t.bindVertexArray(this.vao), t.activeTexture(t.TEXTURE0), t.uniform1i(a.uTex, 0), t.disable(t.BLEND), t.bindFramebuffer(t.FRAMEBUFFER, this.targets[1].framebuffer), t.viewport(0, 0, Math.ceil(s / 2), Math.ceil(l / 2)), t.bindTexture(t.TEXTURE_2D, this.targets[0].texture), t.uniform1i(a.uPass, 0), t.uniform2f(a.uShift, 0, 0), t.uniform2f(a.uStep, 3 / s, 0), t.drawArrays(t.TRIANGLES, 0, 3), t.bindFramebuffer(t.FRAMEBUFFER, null), t.viewport(0, 0, s, l), t.clearColor(0, 0, 0, 0), t.clear(t.COLOR_BUFFER_BIT), t.enable(t.BLEND), t.bindTexture(t.TEXTURE_2D, this.targets[1].texture);
    const m = Tn(e.x, e.y);
    t.uniform1i(a.uPass, 1), t.uniform2f(a.uShift, m[0], -m[1]), t.uniform2f(a.uStep, 0, 3 / l), t.drawArrays(t.TRIANGLES, 0, 3), t.bindTexture(t.TEXTURE_2D, this.targets[0].texture), t.uniform1i(a.uPass, 2), t.drawArrays(t.TRIANGLES, 0, 3), t.bindVertexArray(null);
  }
  clearTargets() {
    for (const e of this.targets)
      this.gl.deleteTexture(e.texture), this.gl.deleteFramebuffer(e.framebuffer);
    this.targets = [];
  }
  destroy() {
    this.clearTargets(), this.gl.deleteProgram(this.program.prog), this.gl.deleteVertexArray(this.vao);
  }
}
function Ln(n, e) {
  const { IMG: t, EYES: r, MOUTH: a, CHEEKS: s } = n, l = `#version 300 es
  in vec2 aPos; in vec2 aUv;
  uniform vec2 uScale; uniform vec2 uOffset;
  out vec2 vUv;
  void main() { vUv = aUv; gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); }`, m = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 outColor;
  uniform sampler2D uTex;
  uniform vec4 uRect;        // layer rect in source px
  uniform int uFace;
  uniform float uAlpha;
  uniform vec4 uEyeBox[2];   // x0, x1, -, -
  uniform float uEyeTop[48]; // 2 eyes x EYE_N samples
  uniform float uEyeBot[48];
  uniform vec4 uEyeState[2]; // open, smile, ballX(px), ballY(px)
  uniform vec4 uMouth;       // cx, cy, angle, halfLen
  uniform vec4 uMouthState;  // open, form, bow, -
  uniform vec4 uCheeks;      // x0, y0, x1, y1
  uniform float uCheek;

  const int EYE_N = 24;
  float crv(int e, bool top, float u) {
    float f = clamp(u, 0.0, 1.0) * float(EYE_N - 1);
    int i = min(int(floor(f)), EYE_N - 2);
    float t = f - float(i);
    int k = e * EYE_N + i;
    return top ? mix(uEyeTop[k], uEyeTop[k + 1], t) : mix(uEyeBot[k], uEyeBot[k + 1], t);
  }

  // Upper lid line and lower lid line of eye e at column u, for the current open/smile state.
  // Must match eyeLids() in rig.js, which moves the lash meshes to the same lines.
  // Must match eyeLidsRaw() / eyeLids() in rig.js.
  vec2 eyeLidsRaw(int e, float u) {
    u = clamp(u, 0.0, 1.0);
    vec4 st = uEyeState[e];
    float top = crv(e, true, u), bot = crv(e, false, u);
    float b = 1.0 - st.x, smile = st.y, hump = 4.0 * u * (1.0 - u);
    float H = crv(e, false, 0.5) - crv(e, true, 0.5);
    float arc = mix(uEyeTop[e * EYE_N], uEyeTop[e * EYE_N + EYE_N - 1], u) - 0.3 * H * hump;
    float closed = ${e.portrait?.version === 2 ? "max(top, mix(uEyeTop[e * EYE_N], uEyeTop[e * EYE_N + EYE_N - 1], u) + H * (0.10 - 0.25 * smile) * hump)" : "max(top, bot + 1.0 + (arc - bot - 1.0) * smile)"};
    return vec2((closed - top) * max(b, -0.07), b > 0.0 ? (closed - bot) * b * ${e.portrait?.version === 2 ? "1.0" : "smile"} : 0.0);
  }

  vec2 eyeLids(int e, float u, float top, float bot) {
    vec4 box = uEyeBox[e];
    float du = 5.0 / (box.y - box.x);
    vec2 raw = eyeLidsRaw(e, u);
    vec2 d = (eyeLidsRaw(e, u - 2.0 * du) + 2.0 * eyeLidsRaw(e, u - du) + 3.0 * raw
            + 2.0 * eyeLidsRaw(e, u + du) + eyeLidsRaw(e, u + 2.0 * du)) / 9.0;
    // for hiding the ball take whichever closes more: the smoothed lash can sit a little
    // above the raw lid near the corners, and the gap must show lid skin, not eye white
    return vec2(top + max(d.x, raw.x), bot + min(d.y, raw.y));
  }

  vec4 texAt(vec2 p) { return texture(uTex, (p - uRect.xy) / uRect.zw); }

  // Eye white + iris layer: shown only between the lids (the lids cover it, it never squashes);
  // the iris slides inside the opening for the gaze.
  vec4 eyeBall(int e, vec2 p) {
    vec4 box = uEyeBox[e]; vec4 st = uEyeState[e];
    float u = clamp((p.x - box.x) / (box.y - box.x), 0.0, 1.0);
    float top = crv(e, true, u), bot = crv(e, false, u);
    vec2 lids = eyeLids(e, u, top, bot);
    float v = clamp((p.y - top) / max(bot - top, 1.0), 0.0, 1.0);
    float w = sqrt(4.0 * u * (1.0 - u)) * sqrt(4.0 * v * (1.0 - v));
    vec4 c = texAt(p - vec2(st.z, st.w) * w);
      // the lash covers ~2px of the ball's upper edge, so the cut can sit under it (no seam)
    return c * smoothstep(lids.x - 1.0, lids.x + 0.5, p.y) * (1.0 - smoothstep(lids.y - 0.9, lids.y + 0.6, p.y));
  }

  vec4 mouth(vec2 p, vec4 base) {
    float open = ${e.portrait?.version === 2 ? "clamp(uMouthState.x, 0.0, 1.0)" : "uMouthState.x"};
    if (open < 0.01) return base;
    vec2 d = vec2(cos(uMouth.z), sin(uMouth.z)), n = vec2(-d.y, d.x);
    vec2 r = p - uMouth.xy;
    float s = dot(r, d) / uMouth.w, t = dot(r, n);
    float form = uMouthState.y;                       // -1 wide "i" .. +1 round "o"
    float wf = ${e.portrait?.version === 2 ? "mix(0.94, 0.86, clamp(form * 0.5 + 0.5, 0.0, 1.0))" : "mix(0.78, 0.46, clamp(form * 0.5 + 0.5, 0.0, 1.0))"};
    float k = 1.0 - (s / wf) * (s / wf);
    if (k <= 0.0) return base;
    float line = uMouthState.z * (1.0 - s * s);
    float hk = ${e.portrait?.version === 2 ? "sqrt(k)" : "pow(k, mix(0.55, 0.85, clamp(form, 0.0, 1.0)))"};
    float H = ${e.portrait?.version === 2 ? "uMouth.w * 0.24" : "mix(20.0, 26.0, clamp(form, 0.0, 1.0))"};
    float up = line - 0.6 - open * ${e.portrait?.version === 2 ? "H * 0.25" : "2.5"} * hk;
    float lo = line + open * H * ${e.portrait?.version === 2 ? "0.75" : "1.0"} * hk;
    float cov = smoothstep(-0.7, 0.7, t - up) * smoothstep(-0.7, 0.7, lo - t);
    if (cov <= 0.0) return base;
    float tv = clamp((t - up) / max(lo - up, 1.0), 0.0, 1.0);
    vec3 col = mix(vec3(0.24, 0.05, 0.08), vec3(0.48, 0.15, 0.19), tv);
    float tongue = smoothstep(0.5, 0.78, tv) * (1.0 - smoothstep(0.45, 0.8, abs(s) / wf));
    col = mix(col, vec3(0.86, 0.44, 0.47), tongue * ${e.portrait?.version === 2 ? "0.25" : "0.9"});
    float teeth = ${e.portrait?.version === 2 ? "0.0" : "1.0"} * (1.0 - smoothstep(0.12, 0.22, tv)) * smoothstep(0.25, 0.45, open) * (1.0 - smoothstep(0.55, 0.85, abs(s) / wf));
    col = mix(col, vec3(0.99, 0.96, 0.94), teeth);
    float rim = 1.0 - smoothstep(0.6, 1.8, lo - t);
    col = mix(col, vec3(0.36, 0.09, 0.11), rim * 0.85);
    return vec4(mix(base.rgb, col, cov), 1.0);
  }

  void main() {
    vec2 p = uRect.xy + vUv * uRect.zw;
    vec4 c;
    if (uFace == 1) {
      c = mouth(p, texAt(p));
      float blush = exp(-dot((p - uCheeks.xy) / vec2(48.0, 22.0), (p - uCheeks.xy) / vec2(48.0, 22.0)))
                  + exp(-dot((p - uCheeks.zw) / vec2(40.0, 20.0), (p - uCheeks.zw) / vec2(40.0, 20.0)));
      c.rgb = mix(c.rgb, c.rgb * vec3(1.0, 0.62, 0.64) , clamp(blush * uCheek * 0.55, 0.0, 1.0) * c.a);
    } else if (uFace >= 2) {
      c = eyeBall(uFace - 2, p);
    } else {
      c = texAt(p);
    }
    outColor = c * uAlpha;
  }`, b = l.replace("out vec2 vUv;", "in float aHeadWeight; out float vHeadWeight; out vec2 vScreen; out vec2 vUv;").replace("vUv = aUv;", "vHeadWeight = aHeadWeight; vScreen = vec2((aPos.x * uScale.x + uOffset.x + 1.0) * 0.5, (1.0 - aPos.y * uScale.y - uOffset.y) * 0.5); vUv = aUv;"), d = m.replace("uniform sampler2D uTex;", `uniform sampler2D uTex;
    uniform sampler2D uNormal; in float vHeadWeight; in vec2 vScreen;
    uniform mat3 uHeadRotation; uniform vec3 uLight; uniform vec3 uLightColor; uniform vec3 uAmbientColor;
    uniform vec4 uLighting; uniform vec4 uSurface; uniform float uAspect; uniform int uCel;`).replace("outColor = c * uAlpha;", `
      // RG hold the smooth surface normal, BA the painting's relief (see lighting/normals.ts).
      vec4 encoded = texture(uNormal, vUv);
      vec2 base = encoded.rg * 2.0 - 1.0;
      vec3 n = vec3(base, sqrt(max(0.0, 1.0 - dot(base, base))));
      n = normalize(n + vec3((encoded.ba * 2.0 - 1.0) * uSurface.w * ${Mn.toFixed(3)}, 0.0));
      n = normalize(mix(n, uHeadRotation * n, vHeadWeight));
      vec2 toLight = (uLight.xy - vScreen) * vec2(uAspect, 1.0);
      vec3 light = normalize(vec3(toLight, uLight.z));
      float ndl = dot(n, light);
      float diffuse;
      if (uCel == 1) {
        float w = 0.01 + uSurface.x * 0.08;
        diffuse = 0.2 + 0.45 * smoothstep(${He.toFixed(3)} - w, ${He.toFixed(3)} + w, ndl) + 0.35 * smoothstep(0.55 - w, 0.55 + w, ndl);
      } else {
        float s = 0.05 + uSurface.x * 0.5;
        diffuse = smoothstep(${He.toFixed(3)} - s, ${He.toFixed(3)} + s, ndl) * (0.35 + 0.65 * max(0.0, ndl));
      }
      float reach = dot(toLight, toLight) / (uLighting.w * uLighting.w);
      float attenuation = 1.0 / (1.0 + reach);
      vec3 radiance = uLightColor * uLighting.y * attenuation;
      // A light close to the surface may brighten a little, but must not bleach painted colours.
      vec3 irradiance = min(uAmbientColor * uLighting.z + radiance * diffuse, vec3(${Sn.toFixed(3)}));
      // Painted shadows are deeper versions of the base colour, not grey: multiply by the colour
      // itself as the surface turns away from the light.
      vec3 albedo = c.rgb / max(c.a, 1e-4);
      float dark = 1.0 - clamp(dot(irradiance, vec3(0.3333)), 0.0, 1.0);
      vec3 shaded = c.rgb * mix(vec3(1.0), albedo, dark * ${En.toFixed(3)}) * irradiance;
      float specular = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * uSurface.y;
      if (uCel == 1) specular = smoothstep(0.3, 0.35, specular) * uSurface.y;
      vec2 side = length(n.xy) > 0.001 ? normalize(n.xy) : vec2(0.0);
      float rim = pow(1.0 - max(n.z, 0.0), 4.0) * smoothstep(-0.2, 0.7, dot(side, normalize(toLight + vec2(1e-4)))) * uSurface.z;
      shaded += radiance * (specular * max(0.0, ndl) + rim) * c.a;
      // Strength blends between the original painting and the relit result; alpha is unchanged.
      c.rgb = clamp(mix(c.rgb, shaded, uLighting.x), vec3(0.0), vec3(c.a));
      outColor = c * uAlpha;`), p = `#version 300 es
  in vec2 aPos; uniform vec2 uScale; uniform vec2 uOffset;
  void main() { gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); gl_PointSize = 7.0; }`, i = `#version 300 es
  precision mediump float; uniform vec4 uColor; out vec4 o; void main() { o = uColor; }`;
  function u(v, x, o) {
    const h = v.createProgram();
    for (const [w, B] of [[v.VERTEX_SHADER, x], [v.FRAGMENT_SHADER, o]]) {
      const Y = v.createShader(w);
      if (v.shaderSource(Y, B), v.compileShader(Y), !v.getShaderParameter(Y, v.COMPILE_STATUS)) throw new Error(v.getShaderInfoLog(Y));
      v.attachShader(h, Y), v.deleteShader(Y);
    }
    if (v.bindAttribLocation(h, 0, "aPos"), v.bindAttribLocation(h, 1, "aUv"), v.bindAttribLocation(h, 2, "aHeadWeight"), v.linkProgram(h), !v.getProgramParameter(h, v.LINK_STATUS)) throw new Error(v.getProgramInfoLog(h));
    const T = {}, f = v.getProgramParameter(h, v.ACTIVE_UNIFORMS);
    for (let w = 0; w < f; w++) {
      const B = v.getActiveUniform(h, w).name.replace("[0]", "");
      T[B] = v.getUniformLocation(h, B);
    }
    return { prog: h, u: T };
  }
  function S(v, x, o, h) {
    const T = [v];
    let f = v;
    for (; f < v + x - 0.5; ) {
      const w = h && f >= h.from && f < h.to ? h.cell : o;
      f = Math.min(v + x, f + w), T.push(f);
    }
    return T;
  }
  function y(v, x, o, h, T = null) {
    const [f, w, B, Y] = v, I = S(f, B, x, T && { from: T.x0, to: T.x1, cell: T.cell }), _ = S(w, Y, x, T && { from: T.y0, to: T.y1, cell: T.cell }), U = I.length - 1, O = _.length - 1, C = (U + 1) * (O + 1), $ = new Float32Array(C * 2), V = new Float32Array(C * 2);
    for (let Z = 0; Z <= O; Z++) for (let P = 0; P <= U; P++) {
      const G = Z * (U + 1) + P;
      $[G * 2] = I[P], $[G * 2 + 1] = _[Z], V[G * 2] = (I[P] - f) / B, V[G * 2 + 1] = (_[Z] - w) / Y;
    }
    const X = [], D = [], H = o.length / h, L = h === 1 ? 0 : 1;
    for (let Z = 0; Z < O; Z++) for (let P = 0; P < U; P++) {
      const G = Math.floor(I[P] - f) * L - 2, J = Math.ceil(I[P + 1] - f) * L + 2, q = Math.floor(_[Z] - w) * L - 2, g = Math.ceil(_[Z + 1] - w) * L + 2;
      let A = !1;
      for (let F = Math.max(0, q); F < Math.min(H, g) && !A; F += 1)
        for (let j = Math.max(0, G); j < Math.min(h, J); j += 1)
          if (o[F * h + j] > 3) {
            A = !0;
            break;
          }
      if (!A) continue;
      const E = Z * (U + 1) + P, k = E + 1, N = E + U + 1, z = N + 1;
      X.push(E, k, N, k, z, N), D.push(E, k, E, N, k, N), P === U - 1 && D.push(k, z), Z === O - 1 && D.push(N, z);
    }
    return { rect: v, cols: U, rows: O, rest: $, uv: V, pos: new Float32Array($), tris: new Uint32Array(X), lines: new Uint32Array(D) };
  }
  class c {
    // padTop / padSide: margin around the image, as a share of its height / width. A negative
    // padTop pushes the top of the image above the canvas (hides a cut-off top edge).
    constructor(x, { padTop: o = 0, padSide: h = 0, fit: T = "contain" } = {}) {
      this.pad = { top: o, side: h }, this.fit = T;
      const f = x.getContext("webgl2", { premultipliedAlpha: !0, antialias: !0, alpha: !0, preserveDrawingBuffer: !0 });
      if (!f) throw new Error("WebGL2 is not available");
      this.gl = f, this.canvas = x, this.main = u(f, l, m), this.line = u(f, p, i), this.layers = [], this.lighting = Re, this.lightingStats = { normalMs: 0, computedLayers: 0, cachedLayers: 0 }, f.enable(f.BLEND), f.blendFunc(f.ONE, f.ONE_MINUS_SRC_ALPHA);
    }
    texture(x) {
      const o = this.gl, h = o.createTexture();
      return o.bindTexture(o.TEXTURE_2D, h), o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0), o.texImage2D(o.TEXTURE_2D, 0, o.RGBA, o.RGBA, o.UNSIGNED_BYTE, x), o.generateMipmap(o.TEXTURE_2D), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MIN_FILTER, o.LINEAR_MIPMAP_LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MAG_FILTER, o.LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_S, o.CLAMP_TO_EDGE), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_T, o.CLAMP_TO_EDGE), h;
    }
    addLayer(x, o, h, T = {}) {
      const f = this.gl, w = f.createVertexArray();
      f.bindVertexArray(w);
      const B = f.createBuffer();
      f.bindBuffer(f.ARRAY_BUFFER, B), f.bufferData(f.ARRAY_BUFFER, h.pos, f.DYNAMIC_DRAW);
      for (const C of [this.main, this.line]) {
        const $ = f.getAttribLocation(C.prog, "aPos");
        f.enableVertexAttribArray($), f.vertexAttribPointer($, 2, f.FLOAT, !1, 0, 0);
      }
      const Y = f.createBuffer();
      f.bindBuffer(f.ARRAY_BUFFER, Y), f.bufferData(f.ARRAY_BUFFER, h.uv, f.STATIC_DRAW);
      const I = f.getAttribLocation(this.main.prog, "aUv");
      f.enableVertexAttribArray(I), f.vertexAttribPointer(I, 2, f.FLOAT, !1, 0, 0);
      const _ = f.createBuffer();
      f.bindBuffer(f.ELEMENT_ARRAY_BUFFER, _), f.bufferData(f.ELEMENT_ARRAY_BUFFER, h.tris, f.STATIC_DRAW), f.bindVertexArray(null);
      const U = f.createBuffer();
      f.bindBuffer(f.ELEMENT_ARRAY_BUFFER, U), f.bufferData(f.ELEMENT_ARRAY_BUFFER, h.lines, f.STATIC_DRAW);
      const O = { name: x, image: o, mesh: h, tex: this.texture(o), vao: w, posBuf: B, uvBuf: Y, triBuf: _, lineBuf: U, visible: !0, face: !!T.face, eyeBall: T.eyeBall, color: T.color || [1, 1, 1, 1] };
      return this.layers.push(O), O;
    }
    destroy() {
      const x = this.gl;
      for (const o of this.layers) {
        x.deleteTexture(o.tex), o.normal && x.deleteTexture(o.normal), o.headBuf && x.deleteBuffer(o.headBuf), x.deleteVertexArray(o.vao);
        for (const h of [o.posBuf, o.uvBuf, o.triBuf, o.lineBuf]) x.deleteBuffer(h);
      }
      x.deleteProgram(this.main.prog), x.deleteProgram(this.line.prog), this.lit && x.deleteProgram(this.lit.prog), this.shadow?.destroy(), this.layers.length = 0;
    }
    setLighting(x) {
      if (this.lighting = An({ ...Re, ...x }) ?? Re, !this.lighting.enabled) return;
      const o = this.gl;
      this.lit || (this.lit = u(o, b, d));
      for (const h of this.layers) {
        if (h.normal || h.overlay) continue;
        const T = xn(h.image, h.mesh.rect, e, !/^(eye|mouth)/.test(h.name));
        this.lightingStats.normalMs += T.ms, this.lightingStats[T.computed ? "computedLayers" : "cachedLayers"]++, h.normal = o.createTexture(), o.activeTexture(o.TEXTURE0), o.bindTexture(o.TEXTURE_2D, h.normal), o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), o.texImage2D(o.TEXTURE_2D, 0, o.RGBA, T.width, T.height, 0, o.RGBA, o.UNSIGNED_BYTE, T.data), o.generateMipmap(o.TEXTURE_2D), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MIN_FILTER, o.LINEAR_MIPMAP_LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_MAG_FILTER, o.LINEAR), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_S, o.CLAMP_TO_EDGE), o.texParameteri(o.TEXTURE_2D, o.TEXTURE_WRAP_T, o.CLAMP_TO_EDGE);
        const f = new Float32Array(h.mesh.rest.length / 2);
        for (let w = 0; w < f.length; w++) f[w] = n.headWeight(h.mesh.rest[w * 2], h.mesh.rest[w * 2 + 1]) * (n.portraitWeight?.(h.mesh.rest[w * 2], h.mesh.rest[w * 2 + 1]) ?? 1);
        h.headBuf = o.createBuffer(), o.bindVertexArray(h.vao), o.bindBuffer(o.ARRAY_BUFFER, h.headBuf), o.bufferData(o.ARRAY_BUFFER, f, o.STATIC_DRAW), o.enableVertexAttribArray(2), o.vertexAttribPointer(2, 1, o.FLOAT, !1, 0, 0);
      }
      o.bindVertexArray(null), this.lighting.shadow && !this.shadow && (this.shadow = new Rn(o, u));
    }
    resize() {
      const x = this.canvas, o = Math.min(window.devicePixelRatio || 1, 2), h = Math.round(x.clientWidth * o), T = Math.round(x.clientHeight * o);
      (x.width !== h || x.height !== T) && (x.width = h, x.height = T);
      const f = (this.fit === "cover" ? Math.max : Math.min)(h / (t.w * (1 + 2 * this.pad.side)), T / (t.h * (1 + this.pad.top))), w = (h - t.w * f) / 2, B = (T - t.h * f) / (this.fit === "cover" ? 2 : 1);
      this.scale = [2 * f / h, -2 * f / T], this.offset = [-1 + 2 * w / h, 1 - 2 * B / T], this.pxScale = f, this.pxOff = [w, B];
    }
    draw(x) {
      const o = this.gl;
      this.resize(), o.viewport(0, 0, this.canvas.width, this.canvas.height), o.clearColor(0, 0, 0, 0), o.clear(o.COLOR_BUFFER_BIT);
      const h = this.lighting.enabled, T = h && this.lighting.shadow;
      T && this.shadow.begin(this.canvas.width, this.canvas.height);
      const f = h ? this.lit : this.main;
      if (this.current = f, o.useProgram(f.prog), h) {
        const w = this.lighting;
        o.uniform1i(f.u.uNormal, 1), o.uniform3f(f.u.uLight, w.x, w.y, w.z), o.uniform3f(f.u.uLightColor, (w.color >> 16 & 255) / 255, (w.color >> 8 & 255) / 255, (w.color & 255) / 255), o.uniform3f(f.u.uAmbientColor, (w.ambientColor >> 16 & 255) / 255, (w.ambientColor >> 8 & 255) / 255, (w.ambientColor & 255) / 255), o.uniform4f(f.u.uLighting, w.strength, w.intensity, w.ambient, w.reach), o.uniform4f(f.u.uSurface, w.softness, w.specular, w.rim, w.detail), o.uniform1f(f.u.uAspect, this.canvas.width / this.canvas.height), o.uniform1i(f.u.uCel, w.mode === "cel" ? 1 : 0), o.uniformMatrix3fv(f.u.uHeadRotation, !1, On(x.angleX ?? 0, x.angleY ?? 0, x.angleZ ?? 0, e.head.maxRoll));
      }
      o.uniform2fv(f.u.uScale, this.scale), o.uniform2fv(f.u.uOffset, this.offset), o.uniform1i(f.u.uTex, 0), o.uniform4fv(f.u.uEyeBox, r.flatMap((w) => [w.x0, w.x1, 0, 0])), o.uniform1fv(f.u.uEyeTop, r.flatMap((w) => w.top)), o.uniform1fv(f.u.uEyeBot, r.flatMap((w) => w.bot)), o.uniform4fv(f.u.uEyeState, x.eyes), o.uniform4f(f.u.uMouth, a.cx, a.cy, a.angle, a.halfLen), o.uniform4f(f.u.uMouthState, x.mouthOpen, x.mouthForm, a.bow, 0), o.uniform4f(f.u.uCheeks, s[0][0], s[0][1], s[1][0], s[1][1]), o.uniform1f(f.u.uCheek, x.cheek), o.activeTexture(o.TEXTURE0);
      for (const w of this.layers)
        !w.visible || w.overlay || this.drawLayer(w, w.alpha ?? 1);
      if (this.original && x.originalAlpha > 0 && this.drawLayer(this.original, x.originalAlpha), T && this.shadow.composite(this.lighting), x.showMesh) {
        const w = this.line;
        o.useProgram(w.prog), o.uniform2fv(w.u.uScale, this.scale), o.uniform2fv(w.u.uOffset, this.offset);
        for (const B of this.layers)
          !B.visible || B.overlay || (o.bindVertexArray(B.vao), o.bindBuffer(o.ELEMENT_ARRAY_BUFFER, B.lineBuf), o.uniform4fv(w.u.uColor, B.color), o.drawElements(o.LINES, B.mesh.lines.length, o.UNSIGNED_INT, 0), o.bindBuffer(o.ELEMENT_ARRAY_BUFFER, B.triBuf));
        x.joints?.length && this.drawPoints(x.joints), o.bindVertexArray(null);
      }
    }
    drawLayer(x, o) {
      const h = this.gl, T = this.current;
      h.useProgram(T.prog), h.bindVertexArray(x.vao), h.bindBuffer(h.ARRAY_BUFFER, x.posBuf), h.bufferSubData(h.ARRAY_BUFFER, 0, x.mesh.pos), this.lighting.enabled && (h.activeTexture(h.TEXTURE1), h.bindTexture(h.TEXTURE_2D, x.normal), h.activeTexture(h.TEXTURE0)), h.bindTexture(h.TEXTURE_2D, x.tex), h.uniform4fv(T.u.uRect, x.mesh.rect), h.uniform1i(T.u.uFace, x.eyeBall !== void 0 ? 2 + x.eyeBall : x.face ? 1 : 0), h.uniform1f(T.u.uAlpha, o), h.drawElements(h.TRIANGLES, x.mesh.tris.length, h.UNSIGNED_INT, 0);
    }
    drawPoints(x) {
      const o = this.gl, h = this.line;
      if (!this.pointBuf) {
        this.pointBuf = o.createBuffer(), this.pointVao = o.createVertexArray(), o.bindVertexArray(this.pointVao), o.bindBuffer(o.ARRAY_BUFFER, this.pointBuf);
        const T = o.getAttribLocation(h.prog, "aPos");
        o.enableVertexAttribArray(T), o.vertexAttribPointer(T, 2, o.FLOAT, !1, 0, 0);
      }
      o.bindVertexArray(this.pointVao), o.bindBuffer(o.ARRAY_BUFFER, this.pointBuf), o.bufferData(o.ARRAY_BUFFER, new Float32Array(x.flat()), o.DYNAMIC_DRAW), o.uniform4f(h.u.uColor, 1, 0.85, 0.2, 1), o.drawArrays(o.POINTS, 0, x.length);
    }
    // canvas CSS px -> source image px
    toImage(x, o) {
      if (!this.pxOff) return null;
      const h = this.canvas.width / this.canvas.clientWidth;
      return [(x * h - this.pxOff[0]) / this.pxScale, (o * h - this.pxOff[1]) / this.pxScale];
    }
  }
  return { Renderer: c, buildGrid: y };
}
function kn(n, e) {
  const { applyHead: t, applyBody: r, TASSELS: a, tasselAnchor: s } = n, l = (e.strands ?? []).map((o) => {
    if (o.nodes.length === 4) return o;
    const h = Array.from({ length: 4 }, (T, f) => {
      const w = f / 3 * (o.nodes.length - 1), B = Math.min(o.nodes.length - 2, Math.floor(w)), Y = w - B;
      return [0, 1].map((I) => o.nodes[B][I] + (o.nodes[B + 1][I] - o.nodes[B][I]) * Y);
    });
    return { ...o, nodes: h };
  }), m = [0, 300, 200, 140], b = 0.9, d = 7, p = { stiff: 1.7, damp: 1.6, couple: 0.85, reach: 0.9, bind: 4 }, i = Math.min(6, l.filter((o) => o.name.startsWith("bang")).length), u = { freq: 0.7, zeta: 0.22, hang: 0.85, inertia: 0.32, wind: 0.03, max: 0.55, smooth: 6 }, S = (o, h) => [o[0] * Math.cos(h) - o[1] * Math.sin(h), o[0] * Math.sin(h) + o[1] * Math.cos(h)], y = (o, h) => {
    const T = Math.hypot(o[0], o[1]);
    if (T < 1e-6) return o;
    const f = h * Math.tanh(T / h) / T;
    return [o[0] * f, o[1] * f];
  }, c = Object.fromEntries(Object.entries(e.buns ?? {}).map(([o, h]) => [o, { at: [h.cx, h.cy], k: 260, c: 11, hang: 3, max: 4 }])), v = (o, h) => {
    const T = Math.hypot(o[0], o[1]);
    T > h && (o[0] *= h / T, o[1] *= h / T);
  };
  class x {
    constructor() {
      this.gain = 1, this.out = { gain: 1, bunL: [0, 0], bunR: [0, 0] }, this.hair = {};
      for (const h of Object.keys(c))
        this.hair[h] = { p: null, v: [0, 0] }, this.out[h] = [0, 0];
      this.strands = l.map(() => ({ p: null, v: [[0, 0], [0, 0], [0, 0], [0, 0]] })), this.out.strands = l.map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]), this.chains = a.map((h) => {
        const T = h.tip[0] - h.pivot[0], f = h.tip[1] - h.pivot[1], w = Math.hypot(T, f), B = [T / w, f / w];
        return { t: h, dir: B, L1: w * h.split, L2: w * (1 - h.split), pts: null, prev: null, phi: [0, 0], anchor: [0, 0] };
      }), this.time = 0;
    }
    hairAnchor(h, T) {
      const f = [h[0], h[1]];
      return t(f, 1, T), r(f, h[1], T), f;
    }
    step(h, T) {
      const f = Math.max(1, Math.ceil(T / 0.004166666666666667)), w = Math.min(T, 0.05) / f, B = -h.angleZ / 30 * e.head.maxRoll - h.bodyAngleZ / 10 * e.body.maxRoll, Y = this.gain;
      l.forEach((_, U) => {
        const O = this.strands[U], C = this.out.strands[U], $ = _.nodes.map((X) => this.hairAnchor(X, h));
        O.p || (O.p = $.map((X) => [...X]));
        const V = U * 1.7;
        for (let X = 0; X < f; X++) {
          const D = this.time + X * w;
          for (let H = 1; H < 4; H++) {
            const L = Math.hypot(_.nodes[H][0] - _.nodes[0][0], _.nodes[H][1] - _.nodes[0][1]), Z = (Math.sin(D * 1.3) * 0.5 + Math.sin(D * 3.1) * 0.3 + Math.sin(D * 4.7 + V) * 0.2) * _.max * 0.1 * H / 3, P = [O.p[H - 1][0] - $[H - 1][0], O.p[H - 1][1] - $[H - 1][1]], G = $[H][0] + P[0] * b * p.couple - Math.sin(B) * L * 0.12 + Z, J = $[H][1] + P[1] * b * p.couple, q = m[H] * _.k * p.stiff / Math.max(0.35, Y), g = d * p.damp * Math.sqrt(p.stiff) / Math.max(0.5, Math.sqrt(Y)), A = O.v[H], E = O.p[H];
            A[0] += (q * (G - E[0]) - g * A[0]) * w, A[1] += (q * (J - E[1]) - g * A[1]) * w, E[0] += A[0] * w, E[1] += A[1] * w;
          }
          O.p[0] = [...$[0]];
        }
        for (let X = 0; X < 4; X++) {
          const D = [O.p[X][0] - $[X][0], O.p[X][1] - $[X][1]];
          C[X] = y(D, Math.max(0.5, _.max * p.reach * Math.max(1, Y) * X / 3));
        }
      });
      for (const [_, U] of Object.entries(c)) {
        const O = this.hair[_], C = this.hairAnchor(U.at, h), $ = Math.sin(this.time * 1.3 + U.at[0] * 0.01) * 0.6 + Math.sin(this.time * 2.9 + U.at[1] * 0.02) * 0.4, V = C[0] - Math.sin(B) * U.hang + $ * U.max * 0.12, X = C[1];
        O.p || (O.p = [V, X]);
        const D = U.k / Math.max(0.35, Y), H = U.c / Math.max(0.5, Math.sqrt(Y));
        for (let Z = 0; Z < f; Z++)
          O.v[0] += (D * (V - O.p[0]) - H * O.v[0]) * w, O.v[1] += (D * (X - O.p[1]) - H * O.v[1]) * w, O.p[0] += O.v[0] * w, O.p[1] += O.v[1] * w;
        const L = [O.p[0] - C[0], O.p[1] - C[1]];
        v(L, U.max * Math.max(1, Y)), this.out[_] = L;
      }
      this.out.gain = 1;
      const I = this.out.strands;
      for (let _ = 0; _ < p.bind; _++) for (let U = 1; U < 4; U++) {
        const O = I.slice(0, i).map((C) => [...C[U]]);
        for (let C = 0; C < i; C++) {
          const $ = O[Math.max(0, C - 1)], V = O[Math.min(i - 1, C + 1)];
          for (const X of [0, 1]) I[C][U][X] = O[C][X] * 0.5 + ($[X] + V[X]) * 0.25;
        }
      }
      for (const _ of this.chains) {
        const U = s(_.t, h, this.out, [0, 0]);
        _.st || (_.st = { th: [0, 0], w: [0, 0], pos: [...U], vel: [0, 0], acc: [0, 0] });
        const O = _.st, C = u, $ = [(U[0] - O.pos[0]) / Math.max(T, 1e-3), (U[1] - O.pos[1]) / Math.max(T, 1e-3)], V = 1 - Math.exp(-T * C.smooth), X = [($[0] - O.vel[0]) / Math.max(T, 1e-3), ($[1] - O.vel[1]) / Math.max(T, 1e-3)];
        O.acc = [O.acc[0] + (X[0] - O.acc[0]) * V, O.acc[1] + (X[1] - O.acc[1]) * V], O.vel = [O.vel[0] + ($[0] - O.vel[0]) * V, O.vel[1] + ($[1] - O.vel[1]) * V], O.pos = [...U];
        const D = [-_.dir[1], _.dir[0]], H = -(O.acc[0] * D[0] + O.acc[1] * D[1]) / (_.L1 + _.L2) * C.inertia, L = (Math.sin(this.time * 0.9 + _.t.pivot[0]) * 0.6 + Math.sin(this.time * 0.37 + _.t.pivot[1]) * 0.4) * C.wind, Z = -B * C.hang + L, P = 2 * Math.PI * C.freq / Math.sqrt(Math.max(0.4, Y)), G = P * 1.35;
        for (let A = 0; A < f; A++) {
          const E = -P * P * (O.th[0] - Z) - 2 * C.zeta * P * O.w[0] + H;
          O.w[0] += E * w, O.th[0] += O.w[0] * w;
          const k = -G * G * (O.th[1] - O.th[0]) - 2 * C.zeta * G * O.w[1] + H * 0.4 + E * 0.5;
          O.w[1] += k * w, O.th[1] += O.w[1] * w;
        }
        O.th[0] = Math.max(-0.55, Math.min(C.max, O.th[0])), O.th[1] = Math.max(-0.55 * 1.4, Math.min(C.max * 1.4, O.th[1])), _.phi = [O.th[0], O.th[1]];
        const J = S(_.dir, O.th[0]), q = S(_.dir, O.th[1]), g = [U[0] + J[0] * _.L1, U[1] + J[1] * _.L1];
        _.pts = [[...U], g, [g[0] + q[0] * _.L2, g[1] + q[1] * _.L2]], _.anchor = U;
      }
      return this.time += T, this.out;
    }
  }
  return { Physics: x };
}
function _n(n, e) {
  const { baseWeights: t, deformBase: r, MOUTH: a } = n, s = (f, w, B) => {
    const Y = Math.min(1, Math.max(0, (B - f) / (w - f)));
    return Y * Y * (3 - 2 * Y);
  }, l = e.mouth.area, m = {
    a: { sprite: "mouth_a", ref: 0.9, width: 1 },
    aHalf: { sprite: "mouth_a_half", ref: 0.55, width: 1 },
    i: { sprite: "mouth_i", ref: 0.55, width: 1 },
    e: { sprite: "mouth_a_half", ref: 0.65, width: 1.06 },
    o: { sprite: "mouth_o", ref: 0.75, width: 1 },
    u: { sprite: "mouth_o", ref: 0.75, width: 0.78 }
  }, b = 0.16, d = ["angry", "sad"];
  function p(f, w) {
    const Y = (U, O, C) => U >= O - (w ? 0.07 : 0) && U < C + (w ? 0.07 : 0), I = [["i", -9, -0.55], ["e", -0.55, -0.2], ["a", -0.2, 0.35], ["o", 0.35, 0.75], ["u", 0.75, 9]], _ = w && I.find((U) => U[0] === w || w === "aHalf" && U[0] === "a");
    return _ && Y(f, _[1], _[2]) ? _[0] : I.find((U) => f >= U[1] && f < U[2])[0];
  }
  const i = 0.75, u = 0.3, S = 0.06, y = ["sad", "surprise"];
  function c(f, w, B = null) {
    return B && f >= u ? B : f >= i ? null : f < u ? w >= 0.5 ? "eyes_smile" : "eyes_closed" : "eyes_half";
  }
  function v(f, w, B = null) {
    if (f < b) return null;
    const Y = p(w, B);
    return Y === "a" ? f >= 0.6 ? "a" : "aHalf" : Y;
  }
  function x(f) {
    return a.cy + (f - a.cx) * Math.tan(a.angle);
  }
  function o() {
    return l.cx;
  }
  function h(f, w) {
    const B = Math.cos(-l.angle), Y = Math.sin(-l.angle), I = f - l.cx, _ = w - l.cy, U = (I * B - _ * Y) / l.rx, O = (I * Y + _ * B) / l.ry;
    return 1 - s(0.55, 0.95, Math.hypot(U, O));
  }
  function T(f, w, B, Y, I) {
    const _ = {}, U = (L) => L.startsWith("eyes_closed") || L.startsWith("eyes_smile"), O = (L) => d.some((Z) => L === `mouth_${Z}`), C = (L) => U(L) ? 1 : L.startsWith("eyes_") ? 0 : O(L) ? 2 : 3, $ = Object.entries(w.layers).sort((L, Z) => C(L[0]) - C(Z[0]));
    for (const [L, Z] of $) {
      const P = Y(Z, e.mesh.spriteCell, I(B[L]), B[L].width), G = [], J = [];
      for (let g = 0; g < P.rest.length / 2; g++) {
        const A = P.rest[g * 2], E = P.rest[g * 2 + 1];
        G.push(t(A, E, 0)), J.push(L.startsWith("mouth") ? h(A, E) : 0);
      }
      const q = f.addLayer(L, B[L], P, { color: [0.4, 1, 0.8, 0.6] });
      q.visible = !1, _[L] = { mesh: P, W: G, inner: J, layer: q };
    }
    const V = [0, 0];
    let X = null;
    const D = [0, 1].map(() => ({ cur: "open", prev: "open", t: 1 }));
    function H(L, Z, P, G, J = 1) {
      const q = L.mesh.rest, g = L.mesh.pos;
      for (let A = 0; A < L.W.length; A++) {
        let E = q[A * 2], k = q[A * 2 + 1];
        const N = L.inner[A];
        if (N > 0) {
          const z = x(E);
          k = z + (k - z) * (1 + (G - 1) * N), E = o() + (E - o()) * (1 + (J - 1) * N);
        }
        r(E, k, L.W[A], Z, P, V), g[A * 2] = V[0], g[A * 2 + 1] = V[1];
      }
    }
    return {
      /**
       * Show / hide and deform the sprites for this frame.
       * Returns which eyes are covered by a sprite, so the layered eye parts can be hidden.
       * `mood` (angry / sad / surprise) picks drawn expression eyes (sad, surprise) and closed
       * mouths (angry, sad) when the avatar has them.
       */
      update(L, Z, P = 1 / 60, G = null) {
        for (const N of Object.values(_)) N.layer.visible = !1;
        const J = [!1, !1];
        [
          [L.eyeROpen, L.eyeSmile],
          [L.eyeLOpen, L.eyeSmileL ?? L.eyeSmile]
        ].forEach(([N, z], F) => {
          const j = D[F], M = y.includes(G) && _[`eyes_${G}_${F}`] ? `eyes_${G}` : null, R = c(N, z, M) ?? "open";
          R !== j.cur && (j.prev = j.cur, j.cur = R, j.t = 0), j.t = P > 0 ? Math.min(1, j.t + P / S) : 1;
          const W = s(0, 1, j.t), Q = (ee, he) => {
            if (ee === "open" || he <= 1e-3) return;
            const oe = _[`${ee}_${F}`];
            oe && (oe.layer.visible = !0, oe.layer.alpha = he, H(oe, L, Z, 1));
          }, ne = (ee) => ee === "open" ? -1 : U(ee) ? 1 : 0;
          j.t >= 1 ? Q(j.cur, 1) : ne(j.cur) > ne(j.prev) ? (Q(j.prev, 1), Q(j.cur, W)) : (Q(j.cur, 1), Q(j.prev, 1 - W)), J[F] = j.cur !== "open" && W >= 0.999;
        });
        const g = v(L.mouthOpen, L.mouthForm, X);
        X = g;
        const A = g && m[g], E = A && _[A.sprite], k = d.includes(G) && _[`mouth_${G}`];
        if (k && (!E || L.mouthOpen < b + 0.04) && (k.layer.visible = !0, k.layer.alpha = 1, H(k, L, Z, 1)), E) {
          E.layer.visible = !0, E.layer.alpha = s(b, b + 0.04, L.mouthOpen);
          const N = Math.min(1.1, Math.max(0.5, L.mouthOpen / A.ref));
          H(E, L, Z, N, A.width);
        }
        return { eyes: J, mouth: g };
      }
    };
  }
  return { createSprites: T, mouthShape: v, eyeSprite: c };
}
const Ut = { angry: "angry", angryTalk: "angry", sad: "sad", sadTalk: "sad", surprise: "surprise", surprisedTalk: "surprise" };
function Fn(n, e) {
  return n && n !== "neutral" ? Ut[n] ?? null : (e && Ut[e]) ?? null;
}
const Bn = /* @__PURE__ */ new Set([
  "angleX",
  "angleY",
  "angleZ",
  "bodyAngleX",
  "bodyAngleZ",
  "armAngle",
  "handAngle",
  "gazeX",
  "gazeY"
]), xt = {
  nod: {
    label: "Nod",
    dur: 1.7,
    tracks: {
      angleY: [[0, 0], [0.32, -13], [0.62, 2], [0.95, -9], [1.3, 1], [1.7, 0]],
      angleZ: [[0, 0], [0.4, -2], [1, -1], [1.7, 0]],
      bodyAngleX: [[0, 0], [0.5, -1.5], [1.7, 0]],
      eyeSmile: [[0, 0], [0.3, 0.45], [1.3, 0.45], [1.7, 0]],
      eyeOpen: [[0, 1], [0.3, 0.72], [1.3, 0.72], [1.7, 1]],
      mouthOpen: [[0, 0], [0.3, 0.12], [1.3, 0.12], [1.7, 0]],
      mouthForm: [[0, 0], [0.3, -0.6], [1.7, -0.3]]
    }
  },
  tilt: {
    label: "Head tilt",
    dur: 2.6,
    tracks: {
      angleZ: [[0, 0], [0.55, 17], [2, 15], [2.6, 0]],
      angleX: [[0, 0], [0.6, 8], [2, 7], [2.6, 0]],
      angleY: [[0, 0], [0.6, 4], [2.6, 0]],
      bodyAngleZ: [[0, 0], [0.8, 3], [2, 3], [2.6, 0]],
      gazeX: [[0, 0], [0.4, 0.5], [2.1, 0.4], [2.6, 0]],
      gazeY: [[0, 0], [0.4, 0.35], [2.1, 0.3], [2.6, 0]],
      browAngle: [[0, 0], [0.5, -0.7], [2.1, -0.6], [2.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [2.1, 0.3], [2.6, 0]]
      // closed mouth: a barely open round mouth read as a squashed blob
    }
  },
  think: {
    label: "Thinking",
    dur: 3.6,
    tracks: {
      angleX: [[0, 0], [0.7, -11], [3, -9], [3.6, 0]],
      angleY: [[0, 0], [0.7, 9], [3, 8], [3.6, 0]],
      angleZ: [[0, 0], [0.8, 6], [3, 5], [3.6, 0]],
      gazeX: [[0, 0], [0.35, -0.8], [3.1, -0.7], [3.6, 0]],
      gazeY: [[0, 0], [0.35, 0.7], [3.1, 0.6], [3.6, 0]],
      handAngle: [[0, 0], [0.6, 3], [3, 3], [3.6, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.3, 0],
        [2.45, 1],
        [2.6, 0],
        [3.6, 0]
      ],
      browY: [[0, 0], [0.6, 0.25], [3, 0.2], [3.6, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3, -0.3], [3.6, 0]],
      mouthForm: [[0, 0], [0.6, 0.4], [3.6, 0]]
    }
  },
  giggle: {
    label: "Chuckle",
    dur: 2.2,
    tracks: {
      eyeOpen: [[0, 1], [0.2, 0], [1.8, 0], [2.2, 1]],
      eyeSmile: [[0, 0], [0.2, 1], [1.8, 1], [2.2, 0]],
      mouthOpen: [[0, 0], [0.2, 0.5], [0.45, 0.32], [0.7, 0.55], [0.95, 0.34], [1.2, 0.5], [1.8, 0.3], [2.1, 0]],
      mouthForm: [[0, 0], [0.2, -0.8], [2.2, -0.2]],
      blush: [[0, 0], [0.3, 0.7], [1.8, 0.7], [2.2, 0.1]],
      angleY: [[0, 0], [0.2, -5], [0.45, -1], [0.7, -6], [0.95, -2], [1.2, -5], [1.6, -2], [2.2, 0]],
      angleZ: [[0, 0], [0.3, -6], [1.8, -5], [2.2, 0]],
      bodyAngleZ: [[0, 0], [0.25, 2], [0.5, -1], [0.75, 2], [1, -1], [1.3, 1.5], [2.2, 0]],
      browY: [[0, 0], [0.3, 0.3], [1.8, 0.3], [2.2, 0]]
    }
  },
  surprise: {
    label: "Surprise",
    dur: 2,
    tracks: {
      angleY: [[0, 0], [0.12, 10], [0.5, 6], [1.5, 5], [2, 0]],
      angleX: [[0, 0], [0.12, -4], [2, 0]],
      bodyAngleX: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]],
      eyeOpen: [[0, 1], [0.1, 1.25], [1.5, 1.2], [2, 1]],
      browY: [[0, 0], [0.1, 1], [1.5, 0.9], [2, 0]],
      mouthOpen: [[0, 0], [0.12, 0.6], [1.4, 0.45], [2, 0]],
      mouthForm: [[0, 0], [0.12, 0.6], [1.5, 0.55], [2, 0]],
      // o
      armAngle: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]]
    }
  },
  shy: {
    label: "Shy",
    dur: 3.2,
    tracks: {
      angleX: [[0, 0], [0.6, 14], [2.6, 12], [3.2, 0]],
      angleY: [[0, 0], [0.6, -9], [2.6, -8], [3.2, 0]],
      angleZ: [[0, 0], [0.7, -8], [2.6, -7], [3.2, 0]],
      gazeX: [[0, 0], [0.3, 0.8], [1.6, 0.8], [1.9, -0.3], [2.2, 0.8], [2.8, 0.6], [3.2, 0]],
      gazeY: [[0, 0], [0.3, -0.5], [2.8, -0.4], [3.2, 0]],
      eyeOpen: [[0, 1], [0.5, 0.75], [2.7, 0.75], [3.2, 1]],
      eyeSmile: [[0, 0], [0.5, 0.5], [2.7, 0.5], [3.2, 0]],
      blush: [[0, 0], [0.8, 1], [2.7, 1], [3.2, 0]],
      browAngle: [[0, 0], [0.5, -0.6], [2.7, -0.5], [3.2, 0]],
      mouthForm: [[0, 0], [0.5, -0.4], [3.2, 0]],
      handAngle: [[0, 0], [0.8, 4], [2.6, 4], [3.2, 0]]
    }
  },
  no: {
    label: "Shake head",
    dur: 1.9,
    tracks: {
      angleX: [[0, 0], [0.2, 13], [0.45, -13], [0.7, 12], [0.95, -10], [1.2, 5], [1.5, 0]],
      angleY: [[0, 0], [0.2, -3], [1.3, -3], [1.9, 0]],
      bodyAngleX: [[0, 0], [0.3, 1.5], [0.6, -1.5], [0.9, 1], [1.3, 0]],
      eyeOpen: [[0, 1], [0.15, 0], [1.4, 0], [1.9, 1]],
      eyeSmile: [[0, 0], [0.15, 1], [1.4, 1], [1.9, 0]],
      // closed mouth while shaking the head
      browAngle: [[0, 0], [0.2, -0.5], [1.4, -0.5], [1.9, 0]]
    }
  },
  wink: {
    label: "Wink",
    dur: 2,
    tracks: {
      angleZ: [[0, 0], [0.35, -13], [1.5, -12], [2, 0]],
      angleX: [[0, 0], [0.35, 9], [1.5, 8], [2, 0]],
      bodyAngleZ: [[0, 0], [0.5, -2], [1.5, -2], [2, 0]],
      eyeOpenL: [[0, 1], [0.25, 1], [0.4, 0], [1.4, 0], [1.6, 1]],
      eyeSmileL: [[0, 0], [0.3, 1], [1.5, 1], [1.7, 0]],
      mouthOpen: [[0, 0], [2, 0]],
      // wink with a closed smile
      mouthForm: [[0, 0], [0.35, -0.8], [2, 0]],
      blush: [[0, 0], [0.4, 0.5], [1.6, 0.5], [2, 0]]
    }
  },
  greet: {
    label: "Greeting",
    dur: 2.6,
    tracks: {
      angleY: [[0, 0], [0.7, -18], [1.2, -17], [1.9, 2], [2.6, 0]],
      bodyAngleX: [[0, 0], [0.8, 2], [1.8, 0]],
      bodyAngleZ: [[0, 0], [0.8, 1.5], [2, 0]],
      armAngle: [[0, 0], [0.8, 3], [2, 0]],
      eyeOpen: [[0, 1], [0.5, 0], [1.4, 0], [1.8, 1]],
      eyeSmile: [[0, 0], [0.5, 1], [1.6, 1], [2.3, 0.4], [2.6, 0]],
      mouthOpen: [[0, 0], [1.6, 0], [1.8, 0.3], [2.3, 0.2], [2.6, 0]],
      mouthForm: [[0, 0], [1.6, -0.8], [2.6, -0.3]],
      blush: [[0, 0], [1.6, 0.3], [2.6, 0]]
    }
  }
}, wt = {
  lookAround: {
    label: "Look around",
    dur: 5.2,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.25, -0.85], [1.5, -0.8], [1.8, 0.1], [2.1, 0.85], [3.4, 0.8], [3.7, 0], [5.2, 0]],
      gazeY: [[0, 0], [0.25, 0.15], [1.8, 0.25], [2.1, 0.1], [3.7, 0], [5.2, 0]],
      angleX: [[0, 0], [0.7, -20], [1.6, -18], [2.5, 19], [3.5, 17], [4.4, 0], [5.2, 0]],
      angleY: [[0, 0], [0.7, 3], [1.8, 5], [2.5, 3], [4.4, 0]],
      angleZ: [[0, 0], [0.8, 4], [1.8, 0], [2.6, -4], [4.4, 0]],
      bodyAngleX: [[0, 0], [1, -4], [2.8, 4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [1, 1.5], [2.8, -1.5], [4.6, 0]],
      handAngle: [[0, 0], [1, -2], [2.8, 2], [4.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [3.6, 0.3], [4.4, 0]],
      // curious: a quick inhale, held while looking, let out at the end
      breath: [[0, 0.2], [0.6, 0.85], [3.6, 0.7], [4.6, 0], [5.2, 0.1]]
    }
  },
  glance: {
    label: "Side glance",
    dur: 4.6,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.18, 0.9], [2.6, 0.85], [2.9, 0.15], [3.2, 0], [4.6, 0]],
      gazeY: [[0, 0], [0.18, 0.4], [2.6, 0.35], [3.2, 0]],
      angleX: [[0, 0], [0.6, 13], [2.6, 11], [3.6, 0]],
      angleY: [[0, 0], [0.6, 6], [2.6, 5], [3.6, 0]],
      angleZ: [[0, 0], [0.7, -5], [2.6, -4], [3.6, 0]],
      bodyAngleX: [[0, 0], [1, 2.5], [2.8, 2], [4, 0]],
      eyeOpen: [[0, 1], [0.3, 1.06], [2.5, 1.05], [2.8, 0.85], [3.4, 1]],
      browY: [[0, 0], [0.4, 0.4], [2.5, 0.35], [3.4, 0]],
      browAngle: [[0, 0], [0.4, -0.2], [2.5, -0.2], [3.4, 0]],
      breath: [[0, 0], [0.5, 0.6], [2.6, 0.55], [3.8, 0], [4.6, 0.3]]
    }
  },
  sway: {
    label: "Sway",
    dur: 7,
    idle: !0,
    tracks: {
      bodyAngleZ: [[0, 0], [1.6, 6], [3.4, -6], [5.2, 5], [7, 0]],
      bodyAngleX: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2.5], [7, 0]],
      angleZ: [[0, 0], [1.8, -10], [3.6, 10], [5.4, -8], [7, 0]],
      angleX: [[0, 0], [1.8, 6], [3.6, -6], [5.4, 5], [7, 0]],
      angleY: [[0, 0], [0.9, 3], [1.8, 0], [2.7, 3], [3.6, 0], [4.5, 3], [5.4, 0], [7, 0]],
      armAngle: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2], [7, 0]],
      handAngle: [[0, 0], [1.8, -4], [3.6, 4], [5.4, -3], [7, 0]],
      gazeX: [[0, 0], [1.8, -0.3], [3.6, 0.3], [5.4, -0.2], [7, 0]],
      eyeOpen: [[0, 1], [0.8, 0.82], [6.2, 0.82], [7, 1]],
      eyeSmile: [[0, 0], [0.8, 0.35], [6.2, 0.35], [7, 0]],
      // slow, even breaths in time with the sway
      breath: [[0, 0], [0.9, 1], [1.8, 0], [2.7, 1], [3.6, 0], [4.5, 1], [5.4, 0], [6.3, 0.8], [7, 0]]
    }
  },
  sigh: {
    label: "Sigh",
    dur: 5.6,
    idle: !0,
    tracks: {
      breath: [[0, 0], [1.3, 1.25], [1.9, 1.25], [3.6, 0], [5.6, 0]],
      angleY: [[0, 0], [1.3, 9], [1.9, 9], [3.3, -9], [4.6, -6], [5.6, 0]],
      angleZ: [[0, 0], [1.3, -3], [3.3, 5], [5.6, 0]],
      bodyAngleX: [[0, 0], [1.3, -2.5], [3.3, 2.5], [5.6, 0]],
      bodyAngleZ: [[0, 0], [1.9, 1], [3.3, -1.5], [5.6, 0]],
      armAngle: [[0, 0], [1.3, -2.5], [3.3, 2], [5.6, 0]],
      gazeY: [[0, 0], [1.2, 0.4], [2, 0.3], [3.2, -0.4], [4.8, -0.2], [5.6, 0]],
      eyeOpen: [[0, 1], [1, 0.95], [1.9, 0.6], [3.4, 0.6], [4.6, 0.78], [5.6, 1]],
      browY: [[0, 0], [1.3, 0.35], [3.2, -0.2], [5.6, 0]],
      browAngle: [[0, 0], [1.9, -0.4], [4.6, -0.35], [5.6, 0]]
    }
  },
  doze: {
    label: "Drowsy",
    dur: 7.2,
    idle: !0,
    tracks: {
      eyeOpen: [[0, 1], [1.8, 0.78], [3.2, 0.62], [4.5, 0.55], [4.75, 1.1], [5.6, 1.05], [7.2, 1]],
      angleY: [[0, 0], [1.8, -6], [3.2, -9], [4.5, -17], [4.75, 5], [5.6, 2], [7.2, 0]],
      angleZ: [[0, 0], [2, 4], [4.5, 10], [4.75, -2], [7.2, 0]],
      angleX: [[0, 0], [4.5, -4], [4.75, 3], [5.4, -6], [6.2, 5], [7.2, 0]],
      bodyAngleZ: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      bodyAngleX: [[0, 0], [4.5, 2], [4.8, -1.5], [7.2, 0]],
      armAngle: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      handAngle: [[0, 0], [4.5, 5], [4.8, -1], [7.2, 0]],
      gazeY: [[0, 0], [4.5, -0.4], [4.75, 0.2], [7.2, 0]],
      gazeX: [[0, 0], [4.8, 0], [5.3, -0.6], [6.1, 0.6], [6.8, 0]],
      browY: [[0, 0], [4.5, -0.35], [4.75, 0.8], [5.8, 0.3], [7.2, 0]],
      // long, slow, deepening breaths; a sharp inhale on waking
      breath: [[0, 0], [1.1, 0.7], [2.6, 0], [3.8, 0.6], [4.5, 0.2], [4.8, 1.1], [6, 0.2], [7.2, 0]]
    }
  },
  stretch: {
    label: "Stretch",
    dur: 6.2,
    idle: !0,
    tracks: {
      angleZ: [[0, 0], [1.3, -22], [2.3, -21], [3.8, 20], [4.8, 19], [6.2, 0]],
      angleY: [[0, 0], [1.3, 5], [2.3, 7], [3.1, -3], [3.8, 5], [4.8, 6], [6.2, 0]],
      angleX: [[0, 0], [1.3, -5], [3.8, 5], [6.2, 0]],
      bodyAngleZ: [[0, 0], [1.3, 4], [3.8, -4], [6.2, 0]],
      bodyAngleX: [[0, 0], [1.3, -2], [3.8, 2], [6.2, 0]],
      armAngle: [[0, 0], [1.3, 2], [3.8, -2], [6.2, 0]],
      eyeOpen: [[0, 1], [0.8, 0.62], [4.9, 0.62], [5.6, 1]],
      browAngle: [[0, 0], [1, -0.3], [4.9, -0.3], [5.8, 0]],
      breath: [[0, 0], [1.3, 1.1], [2.3, 0.9], [3.1, 0.2], [3.8, 1.1], [4.8, 0.9], [6.2, 0]]
    }
  },
  lean: {
    label: "Peek",
    dur: 4.8,
    idle: !0,
    tracks: {
      bodyAngleX: [[0, 0], [0.9, 6], [3.4, 6], [4.4, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      angleX: [[0, 0], [0.9, 9], [2, 7], [2.6, 10], [3.4, 8], [4.4, 0]],
      angleY: [[0, 0], [0.9, -6], [3.4, -5], [4.4, 0]],
      angleZ: [[0, 0], [0.9, 10], [2.2, 12], [3.4, 9], [4.4, 0]],
      armAngle: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      handAngle: [[0, 0], [0.9, 3], [3.4, 3], [4.4, 0]],
      gazeY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      gazeX: [[0, 0], [1.5, 0], [1.8, -0.3], [2.3, 0.2], [2.8, 0], [4.2, 0]],
      eyeOpen: [[0, 1], [0.6, 1.1], [3.4, 1.08], [4.2, 1]],
      browY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3.4, -0.3], [4.2, 0]],
      blush: [[0, 0], [1.2, 0.25], [3.4, 0.25], [4.4, 0]],
      breath: [[0, 0], [0.8, 0.8], [3.4, 0.6], [4.4, 0], [4.8, 0.2]]
    }
  },
  hum: {
    label: "Listen",
    dur: 5.6,
    idle: !0,
    tracks: {
      angleY: [[0, 0], [0.45, -5], [0.9, 2], [1.35, -5], [1.8, 2], [2.25, -5], [2.7, 2], [3.15, -5], [3.6, 2], [4.05, -4], [4.8, 0]],
      angleZ: [[0, 0], [0.9, 8], [1.8, -8], [2.7, 8], [3.6, -8], [4.6, 0]],
      angleX: [[0, 0], [0.9, 4], [1.8, -4], [2.7, 4], [3.6, -4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [1.8, 3], [2.7, -3], [3.6, 3], [4.6, 0]],
      bodyAngleX: [[0, 0], [1.8, 2], [3.6, -2], [4.8, 0]],
      handAngle: [[0, 0], [0.9, 3], [1.8, -3], [2.7, 3], [3.6, -3], [4.6, 0]],
      fingerTap: [[0, 0], [0.45, 1], [0.9, 0], [1.35, 1], [1.8, 0], [2.25, 1], [2.7, 0], [3.15, 1], [3.6, 0], [5.6, 0]],
      gazeX: [[0, 0], [0.9, 0.3], [1.8, -0.3], [2.7, 0.3], [3.6, -0.3], [4.6, 0]],
      eyeOpen: [[0, 1], [0.4, 0.72], [4.6, 0.72], [5.3, 1]],
      eyeSmile: [[0, 0], [0.4, 0.55], [4.6, 0.55], [5.3, 0]],
      blush: [[0, 0], [0.8, 0.3], [4.6, 0.3], [5.6, 0]],
      browY: [[0, 0], [0.5, 0.25], [4.6, 0.25], [5.4, 0]],
      breath: [[0, 0], [0.9, 0.9], [1.8, 0.2], [2.7, 0.9], [3.6, 0.2], [4.6, 0.8], [5.6, 0]]
    }
  },
  tap: {
    label: "Tap",
    dur: 5,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.3, -0.6], [2.2, -0.5], [2.5, -0.1], [2.8, -0.6], [4.2, -0.5], [4.7, 0]],
      gazeY: [[0, 0], [0.3, 0.55], [4.2, 0.5], [4.7, 0]],
      angleX: [[0, 0], [0.8, -11], [2.4, -9], [3, -12], [4.2, -10], [5, 0]],
      angleY: [[0, 0], [0.8, 8], [4.2, 7], [5, 0]],
      angleZ: [[0, 0], [0.8, 6], [2.4, 4], [3, 7], [4.2, 5], [5, 0]],
      bodyAngleX: [[0, 0], [1, -2], [4.2, -2], [5, 0]],
      handAngle: [[0, 0], [0.8, 3], [4.2, 3], [5, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.6, 0],
        [2.75, 1],
        [2.9, 0],
        [3.1, 1],
        [3.25, 0],
        [5, 0]
      ],
      browY: [[0, 0], [0.6, 0.3], [4.2, 0.25], [5, 0]],
      browAngle: [[0, 0], [0.6, -0.35], [4.2, -0.3], [5, 0]],
      eyeOpen: [[0, 1], [0.6, 0.9], [4.2, 0.9], [5, 1]],
      breath: [[0, 0], [0.8, 0.7], [2.2, 0.4], [3.2, 0.8], [4.4, 0], [5, 0.2]]
    }
  },
  readNote: {
    label: "Read script",
    dur: 2.6,
    idle: !0,
    tracks: {
      // a quick look down at the notes on the desk and back to the camera
      gazeY: [[0, 0], [0.2, -0.85], [1.5, -0.8], [1.75, 0], [2.6, 0]],
      gazeX: [[0, 0], [0.2, -0.15], [1.5, -0.1], [1.75, 0]],
      angleY: [[0, 0], [0.45, -9], [1.5, -8], [2, 1], [2.6, 0]],
      angleZ: [[0, 0], [0.5, 2], [1.6, 2], [2.6, 0]],
      eyeOpen: [[0, 1], [0.3, 0.78], [1.5, 0.78], [1.75, 1]],
      breath: [[0, 0.3], [0.8, 0.5], [1.8, 0.2], [2.6, 0.4]]
    }
  },
  waiting: {
    label: "Fidget",
    dur: 6.4,
    idle: !0,
    tracks: {
      // shifts her weight, checks the viewer, looks away, shifts back
      bodyAngleZ: [[0, 0], [0.9, 5], [2.4, 4], [3.3, -5], [5.2, -4], [6.4, 0]],
      bodyAngleX: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      angleZ: [[0, 0], [1, -6], [2.4, -4], [3.4, 6], [5.2, 5], [6.4, 0]],
      angleX: [[0, 0], [1.2, -8], [2.2, 2], [3.6, 12], [5, 10], [6.2, 0]],
      angleY: [[0, 0], [1.2, -3], [2.2, 2], [3.6, -2], [6.2, 0]],
      armAngle: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      handAngle: [[0, 0], [1.2, 3], [3.4, -3], [6.4, 0]],
      fingerTap: [[0, 0], [4.2, 0], [4.35, 1], [4.5, 0], [4.7, 1], [4.85, 0], [6.4, 0]],
      gazeX: [[0, 0], [0.9, -0.7], [1.9, -0.6], [2.1, 0], [2.7, 0], [2.9, 0.8], [5, 0.7], [5.4, 0], [6.4, 0]],
      gazeY: [[0, 0], [0.9, -0.2], [2.1, 0], [2.9, 0.3], [5.4, 0]],
      eyeOpen: [[0, 1], [2, 1], [2.2, 1.06], [2.8, 1.05], [3.1, 0.85], [5.4, 0.85], [6.2, 1]],
      browAngle: [[0, 0], [0.9, -0.35], [2, -0.35], [2.3, 0], [3.1, -0.4], [5.4, -0.35], [6.4, 0]],
      browY: [[0, 0], [2.2, 0.4], [2.8, 0.35], [3.2, 0], [6.4, 0]],
      breath: [[0, 0.3], [0.9, 0.8], [2, 0.3], [2.6, 0.9], [3.4, 0.2], [4.4, 0.8], [5.6, 0], [6.4, 0.2]]
    }
  },
  spaceOut: {
    label: "Daydream",
    dur: 7.4,
    idle: !0,
    tracks: {
      // gaze drifts up and away, breaths get slow and long, one slow blink
      gazeX: [[0, 0], [1.4, -0.55], [4.8, -0.6], [5.6, 0.1], [7, 0]],
      gazeY: [[0, 0], [1.4, 0.6], [4.8, 0.55], [5.6, 0], [7, 0]],
      angleX: [[0, 0], [2, -9], [4.8, -10], [6, 2], [7.4, 0]],
      angleY: [[0, 0], [2, 7], [4.8, 8], [6, -2], [7.4, 0]],
      angleZ: [[0, 0], [2, 9], [4.8, 11], [6, 2], [7.4, 0]],
      bodyAngleZ: [[0, 0], [2.2, 3], [4.8, 3.5], [6.4, 0]],
      bodyAngleX: [[0, 0], [2.2, -2], [4.8, -2], [6.4, 0]],
      handAngle: [[0, 0], [2.2, 4], [4.8, 5], [6.4, 0]],
      armAngle: [[0, 0], [2.2, 2], [4.8, 2], [6.4, 0]],
      eyeOpen: [[0, 1], [1.4, 0.8], [3, 0.8], [3.35, 0.56], [3.8, 0.8], [4.8, 0.8], [5.6, 1.04], [6.4, 1]],
      browY: [[0, 0], [1.6, 0.15], [4.8, 0.15], [5.6, 0.35], [6.6, 0]],
      breath: [[0, 0], [1.6, 0.9], [3.4, 0], [5, 0.9], [6.2, 0.1], [7.4, 0]]
    }
  }
};
function Un(n, e) {
  if (e <= n[0][0]) return n[0][1];
  const t = n.length - 1;
  if (e >= n[t][0]) return n[t][1];
  let r = 0;
  for (; e > n[r + 1][0]; ) r++;
  const [a, s] = n[r], [l, m] = n[r + 1], b = (c) => c <= 0 || c >= t ? 0 : (n[c + 1][1] - n[c - 1][1]) / (n[c + 1][0] - n[c - 1][0]), d = l - a, p = (e - a) / d, i = b(r) * d, u = b(r + 1) * d, S = p * p, y = S * p;
  return (2 * y - 3 * S + 1) * s + (y - 2 * S + p) * i + (-2 * y + 3 * S) * m + (y - S) * u;
}
const We = {
  a: { open: 0.9, form: 0, label: "あ" },
  i: { open: 0.5, form: -0.85, label: "い" },
  u: { open: 0.4, form: 0.9, label: "う" },
  e: { open: 0.62, form: -0.4, label: "え" },
  o: { open: 0.75, form: 0.6, label: "お" },
  n: { open: 0, form: null, label: "ん" }
  // closes with the previous shape
}, Yn = {
  a: "あかさたなはまやらわがざだばぱぁ",
  i: "いきしちにひみりぎじぢびぴぃ",
  u: "うくすつぬふむゆるぐずづぶぷぅゔ",
  e: "えけせてねへめれげぜでべぺぇ",
  o: "おこそとのほもよろをごぞどぼぽぉ"
}, Vt = {};
for (const [n, e] of Object.entries(Yn)) for (const t of e) Vt[t] = n;
const In = /* @__PURE__ */ new Set([..."まみむめもばびぶべぼぱぴぷぺぽ"]), Nn = /* @__PURE__ */ new Set([..."あいうえおぁぃぅぇぉ"]), Yt = { ゃ: "a", ゅ: "u", ょ: "o" }, Xn = /* @__PURE__ */ new Set([..."、。，．,.！？!? 　…"]), jn = (n) => n.replace(/[ァ-ヶ]/g, (e) => String.fromCharCode(e.charCodeAt(0) - 96));
function Cn(n, e = 0.14) {
  const t = [];
  for (const r of jn(n)) {
    const a = t[t.length - 1];
    if (Yt[r] && a) {
      a.vowel = Yt[r];
      continue;
    }
    if (r === "ー" && a) {
      a.dur += e;
      continue;
    }
    if (r === "っ") {
      t.push({ vowel: "n", dur: e * 0.8, onset: null });
      continue;
    }
    if (r === "ん") {
      t.push({ vowel: "n", dur: e, onset: null });
      continue;
    }
    if (Xn.has(r)) {
      t.push({ vowel: "n", dur: e * 2.2, onset: null });
      continue;
    }
    const s = Vt[r];
    s && t.push({ vowel: s, dur: e, onset: In.has(r) ? "lips" : Nn.has(r) ? null : "consonant" });
  }
  return t;
}
function zn(n, e) {
  let t = 0;
  for (const r of n) {
    if (e < t + r.dur) {
      const a = (e - t) / r.dur, s = We[r.vowel], l = r.onset === "lips" ? 0.05 : r.onset === "consonant" ? 0.45 : 1, m = a < 0.35 ? l + (1 - l) * (a / 0.35) : 1;
      return { open: s.open * m, form: s.form, vowel: r.vowel };
    }
    t += r.dur;
  }
  return null;
}
const et = { ...xt, ...wt }, It = { amp: 1, stiff: 1.8 }, Pn = /^(angle|bodyAngle|armAngle|handAngle)/, $n = /* @__PURE__ */ new Set([
  "eyeOpen",
  "eyeOpenL",
  "eyeSmileL",
  "eyeSmile",
  "mouthOpen",
  "mouthForm",
  "blush",
  "browY",
  "browAngle"
]), Ze = (n, e, t) => {
  const r = Math.min(1, Math.max(0, (t - n) / (e - n)));
  return r * r * (3 - 2 * r);
};
function Nt(n, e) {
  const t = Math.floor(n), r = n - t, a = (l) => {
    const m = Math.sin((l + e * 57.3) * 127.1) * 43758.5453;
    return m - Math.floor(m);
  }, s = r * r * (3 - 2 * r);
  return (a(t) * (1 - s) + a(t + 1) * s) * 2 - 1;
}
const we = (n, e) => Nt(n, e) * 0.7 + Nt(n * 2.3, e + 9) * 0.3, me = (n, e, t) => Math.max(e, Math.min(t, n)), qt = {
  normal: { label: "Neutral", p: {} },
  smile: { label: "Smile", p: { eyeOpen: 0, eyeSmile: 1, blush: 0.35, browY: 0.2 } },
  shy: { label: "Blush", p: { eyeOpen: 0.78, eyeSmile: 0.5, blush: 1, browAngle: -0.5, browY: -0.1, glance: [0.7, 0.35] } },
  jito: { label: "Half-lidded", p: { eyeOpen: 0.5, browY: -0.5, browAngle: 0.6 } },
  surprise: { label: "Surprise", p: { eyeOpen: 1.22, browY: 1, mouthOpen: 0.6, mouthForm: 0.6 } },
  wink: { label: "Wink", p: { eyeOpenL: 0, eyeSmileL: 1, blush: 0.3 } },
  // talking faces for AITuber OnAir emotion tags: eyes stay mostly open (closed / ^^ eyes are
  // what a single image fakes worst, and they would stay shut for a whole sentence)
  happyTalk: { label: "happy", p: { eyeOpen: 0.8, eyeSmile: 0.45, blush: 0.35, browY: 0.25, mouthForm: -0.5 } },
  sadTalk: { label: "sad", p: { eyeOpen: 0.78, browAngle: -0.8, browY: -0.2, mouthForm: 0.3, glance: [0, -0.35] } },
  angryTalk: { label: "angry", p: { eyeOpen: 0.72, browAngle: 0.85, browY: -0.55, mouthForm: 0.2 } },
  surprisedTalk: { label: "surprised", p: { eyeOpen: 1.18, browY: 0.9, mouthForm: 0.9 } },
  relaxedTalk: { label: "relaxed", p: { eyeOpen: 0.82, eyeSmile: 0.35, blush: 0.15, browY: 0.1 } }
}, Xt = {
  happy: ["happyTalk", "nod"],
  sad: ["sadTalk", "sigh"],
  angry: ["angryTalk", "no"],
  surprised: ["surprisedTalk", "surprise"],
  relaxed: ["relaxedTalk", "sway"],
  neutral: ["normal", null]
}, Dn = {
  gazeX: [260, 0.9],
  gazeY: [260, 0.9],
  angleX: [55, 0.72],
  angleY: [55, 0.72],
  angleZ: [45, 0.75],
  bodyAngleX: [14, 0.9],
  bodyAngleZ: [12, 0.9],
  armAngle: [20, 0.85],
  handAngle: [30, 0.8]
};
class Hn {
  /** @param {number[]} gazeCenter */
  constructor(e) {
    this.mode = "auto", this.P = Object.fromEntries(De.map((t) => [t.id, t.def])), this.manual = { ...this.P }, this.cur = { ...this.P }, this.vel = Object.fromEntries(De.map((t) => [t.id, 0])), this.expr = "normal", this.exprMix = {}, this.t = 0, this.blink = { t: 0, start: 1.5, double: !1 }, this.gaze = { x: 0, y: 0, next: 0 }, this.tap = { next: 4, until: -1 }, this.pointer = null, this.faceCenter = [...e], this.lipOpen = null, this.lipForm = 0, this.speaking = !1, this.voice = 0, this.mouth = 0, this.vowel = "a", this.vowelForm = 0, this.syllableArmed = !0, this.voicePeak = 0, this.voiceTrough = 0, this.kana = null, this.lipHold = null, this.emotionUntil = 0, this.talkGain = 1, this.play = null, this.autoMotion = !0, this.nextAuto = 14, this.autoIdle = !0, this.nextIdle = 3, this.lastAuto = null, this.onMotion = null;
  }
  setExpression(e) {
    this.expr = e;
  }
  hasMotion(e) {
    return e in et;
  }
  // ---- speech (driven from outside, e.g. by the TTS audio analyser) ----
  setVoiceLevel(e) {
    this.voice = Math.min(1, Math.max(0, Number(e) || 0));
  }
  setSpeaking(e) {
    e !== this.speaking && (this.speaking = !!e, e || (this.emotionUntil = this.t + 1.2, this.voice = 0));
  }
  /** `playMotion: false` changes only the face (a caller that picks motions itself). */
  setEmotion(e, { playMotion: t = !0 } = {}) {
    const r = Xt[e] ?? Xt.neutral;
    this.expr = r[0], this.emotionUntil = 1 / 0, r[1] && t && this.playMotion(r[1]);
  }
  /** Mouth shapes from kana text, without audio (preview / tuning). */
  /** @param {string} text @param {{ speed?: number, loop?: boolean }} [options] */
  speakKana(e, { speed: t, loop: r = !1 } = {}) {
    this.lipHold = null;
    const a = Cn(e, t === void 0 ? 0.14 : 1 / me(Number(t) || 7, 4, 12));
    this.kana = a.length ? { moras: a, t: 0, loop: r, duration: a.reduce((s, l) => s + l.dur, 0) } : null;
  }
  holdMouth(e) {
    this.kana = null, this.lipHold = Object.hasOwn(We, e) ? e : null;
  }
  stopLipSync() {
    this.kana = null, this.lipHold = null, this.lipOpen = null, this.mouth = 0;
  }
  getLipSyncState() {
    return { active: this.kana !== null || this.lipHold !== null, open: this.P.mouthOpen, form: this.P.mouthForm };
  }
  // Mouth from the TTS loudness. A volume signal has no vowel information, so each syllable
  // (the voice dipping and rising again) gets one vowel at random, weighted towards a, and
  // keeps it until the next syllable: the drawn mouths must not change shape mid-syllable.
  // Syllables are found relative to the recent peak (not an absolute level), and the mouth
  // is scaled by where the voice sits between the recent trough and peak, so it closes in
  // the dip before each mora even when a loud voice never gets quiet.
  speechMouth(e) {
    if (this.kana || this.lipHold) {
      let i;
      if (this.lipHold ? i = We[this.lipHold] : (this.kana.t += e, this.kana.loop && (this.kana.t %= this.kana.duration), i = zn(this.kana.moras, this.kana.t)), !i)
        return this.kana = null, this.mouth > 0.01 ? [this.mouth *= 0.6, this.vowelForm] : null;
      const u = i.open > this.mouth ? 1 - Math.exp(-e * 30) : 1 - Math.exp(-e * 22);
      return this.mouth += (i.open - this.mouth) * u, i.form !== null && (this.vowelForm = i.form), [this.mouth, this.vowelForm];
    }
    const t = this.speaking ? this.voice : 0, r = 1 - Math.exp(-e * 5);
    this.voicePeak = t > this.voicePeak ? t : this.voicePeak + (t - this.voicePeak) * r, this.voiceTrough = t < this.voiceTrough ? t : this.voiceTrough + (t - this.voiceTrough) * r;
    const a = Math.max(this.voicePeak, 0.05);
    if (t < a * 0.6) this.syllableArmed = !0;
    else if (this.syllableArmed && t > a * 0.8 && t > 0.1) {
      this.syllableArmed = !1;
      const i = Math.random();
      this.vowel = i < 0.4 ? "a" : i < 0.58 ? "o" : i < 0.74 ? "e" : i < 0.88 ? "i" : "u";
    }
    const s = this.voicePeak - this.voiceTrough, l = s < a * 0.3 ? 1 : Math.max(0, (t - this.voiceTrough) / s), m = We[this.vowel ?? "a"], b = Math.min(1, Math.pow(t, 0.7) * 1.15) * Math.pow(l, 0.3), d = this.speaking ? Math.min(0.95, b) * (0.45 + 0.55 * m.open / 0.9) : 0, p = d > this.mouth ? 1 - Math.exp(-e * 40) : 1 - Math.exp(-e * 32);
    return this.mouth += (d - this.mouth) * p, this.speaking && (this.vowelForm = m.form), this.speaking || this.mouth > 0.01 ? [this.mouth, this.vowelForm] : null;
  }
  // Breathing: inhale ~40% of the cycle, a slower exhale, a short pause at the bottom,
  // and a period that drifts between ~3.2 and 4.6 s so it never looks metronomic.
  breathValue(e) {
    this.breathPhase = (this.breathPhase ?? 0) + e / (this.breathPeriod ?? 3.8), this.breathPhase >= 1 && (this.breathPhase -= 1, this.breathPeriod = 3.2 + Math.random() * 1.4);
    const t = this.breathPhase;
    return t < 0.4 ? Ze(0, 0.4, t) : t < 0.88 ? 1 - Ze(0.4, 0.88, t) : 0;
  }
  // pick one at random, never the one that just played
  playRandom(e) {
    const t = e.filter((r) => r !== this.lastAuto);
    this.playMotion(t[Math.floor(Math.random() * t.length)]);
  }
  playMotion(e) {
    this.lastAuto = e, this.play = { id: e, t: 0 }, this.onMotion?.(e);
  }
  blinkValue(e) {
    const t = this.blink;
    if (t.t += e, t.t < t.start) return 1;
    const r = (t.t - t.start) / 0.17;
    return r >= 1 ? (t.double ? (t.double = !1, t.start = t.t + 0.07) : (t.start = t.t + 1.8 + Math.random() * 4.2, t.double = Math.random() < 0.18), 1) : r < 0.45 ? 1 - r / 0.45 : (r - 0.45) / 0.55;
  }
  update(e) {
    this.t += e;
    const t = this.t, r = {};
    for (const y of De) r[y.id] = y.def;
    if (this.mode === "manual")
      Object.assign(r, this.manual);
    else if (this.mode === "auto") {
      if (r.angleX = we(t * 0.18, 1) * 10 + this.gaze.x * 11, r.angleY = we(t * 0.15, 2) * 6 - 1 + this.gaze.y * 7, r.angleZ = we(t * 0.12, 3) * 10, r.bodyAngleX = we(t * 0.1, 4) * 5, r.bodyAngleZ = we(t * 0.09, 5) * 4, r.armAngle = we(t * 0.14, 6) * 5, r.handAngle = we(t * 0.21, 7) * 5, t > this.gaze.next) {
        const y = Math.random();
        this.gaze.x = y < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.8, this.gaze.y = y < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.5, this.gaze.next = t + 0.8 + Math.random() * 2.5;
      }
      if (r.gazeX = this.gaze.x + r.angleX / 60, r.gazeY = this.gaze.y + r.angleY / 60, t > this.tap.next && (this.tap.until = t + 1.1, this.tap.next = t + 5 + Math.random() * 6), this.speaking) {
        this.nextIdle = Math.max(this.nextIdle, t + 2.5), this.nextAuto = Math.max(this.nextAuto, t + 6);
        const y = this.talkGain;
        this.talkNod = (this.talkNod ?? 0) + (this.voice * 7 * y - (this.talkNod ?? 0)) * Math.min(1, e * 6), r.angleY -= this.talkNod, r.angleX += we(t * 0.6, 11) * 5 * y, r.angleZ += we(t * 0.5, 12) * 4 * y;
      }
      !this.speaking && t > this.emotionUntil && (this.expr = "normal", this.emotionUntil = 1 / 0), this.speaking || (!this.play && this.autoMotion && t > this.nextAuto ? (this.playRandom(Object.keys(xt).filter((y) => y !== "surprise")), this.nextAuto = t + 15 + Math.random() * 10, this.nextIdle = Math.max(this.nextIdle, t + 5)) : !this.play && this.autoIdle && t > this.nextIdle && (this.playRandom(Object.keys(wt)), this.nextIdle = t + 5 + Math.random() * 5));
    } else if (this.mode === "mouse" && this.pointer) {
      const y = (this.pointer[0] - this.faceCenter[0]) / 500, c = (this.pointer[1] - this.faceCenter[1]) / 500;
      r.angleX = me(y * 30, -30, 30), r.angleY = me(-c * 30, -30, 30), r.angleZ = me(-y * c * 25, -12, 12), r.bodyAngleX = me(y * 10, -10, 10) * 0.6, r.gazeX = me(y * 1.4, -1, 1), r.gazeY = me(-c * 1.4, -1, 1), r.handAngle = me(y * 4, -5, 5);
    }
    this.mode !== "manual" && (r.breath = this.breathValue(e), t < this.tap.until && (r.fingerTap = Math.max(0, Math.sin((this.tap.until - t) * Math.PI * 3.6)) ** 2));
    let a = null, s = 0;
    if (this.play) {
      const y = et[this.play.id];
      if (this.play.t += e, this.play.t >= y.dur)
        this.play = null, this.onMotion?.(null);
      else {
        a = {};
        for (const [c, v] of Object.entries(y.tracks))
          a[c] = Un(v, this.play.t) * (y.idle && Pn.test(c) ? It.amp : 1);
        s = Ze(0, 0.15, this.play.t) * (1 - Ze(y.dur - 0.25, y.dur, this.play.t));
        for (const [c, v] of Object.entries(a))
          Bn.has(c) ? r[c] += v : c === "breath" ? r[c] += (v - r[c]) * s : $n.has(c) || (r[c] = Math.max(r[c], Math.max(0, v)));
      }
    }
    this.mode !== "manual" && (r.angleY += r.breath * 1.6);
    const l = qt[this.expr].p, m = ["eyeOpen", "eyeOpenL", "eyeSmileL", "eyeSmile", "mouthOpen", "mouthForm", "blush", "browY", "browAngle", "gx", "gy"], b = {
      eyeOpen: l.eyeOpen ?? 1,
      eyeOpenL: l.eyeOpenL ?? l.eyeOpen ?? 1,
      eyeSmileL: l.eyeSmileL ?? l.eyeSmile ?? 0,
      eyeSmile: l.eyeSmile ?? 0,
      mouthOpen: l.mouthOpen ?? 0,
      mouthForm: l.mouthForm ?? 0,
      blush: l.blush ?? 0,
      browY: l.browY ?? 0,
      browAngle: l.browAngle ?? 0,
      gx: l.glance?.[0] ?? 0,
      gy: l.glance?.[1] ?? 0
    }, d = 1 - Math.exp(-e * 9);
    for (const y of m)
      this.exprMix[y] === void 0 && (this.exprMix[y] = b[y]), this.exprMix[y] += (b[y] - this.exprMix[y]) * d;
    const p = this.exprMix, i = {};
    for (const y of De) {
      const c = y.id;
      if (this.mode === "manual" && !a) {
        i[c] = r[c], this.cur[c] = r[c], this.vel[c] = 0;
        continue;
      }
      let [v, x] = Dn[c] ?? [120, 0.95];
      a && /^angle|^body/.test(c) && (et[this.play?.id ?? ""]?.idle ? (v *= It.stiff, x = 0.8) : /^angle/.test(c) && (v *= 4.5, x = 0.75));
      const o = 2 * Math.sqrt(v) * x;
      this.vel[c] += (v * (r[c] - this.cur[c]) - o * this.vel[c]) * e, this.cur[c] += this.vel[c] * e, i[c] = this.cur[c];
    }
    let u = 1;
    if (this.mode !== "manual" ? (u = this.blinkValue(e), i.eyeROpen = p.eyeOpen * u, i.eyeLOpen = p.eyeOpenL * u, i.eyeSmile = p.eyeSmile, i.eyeSmileL = p.eyeSmileL, i.mouthOpen = p.mouthOpen, i.mouthForm = p.mouthForm, i.blush = p.blush, i.browY = p.browY + (i.angleY > 0 ? i.angleY / 60 : 0) - (1 - u) * 0.18, i.browAngle = p.browAngle, i.gazeX = me(i.gazeX + p.gx, -1, 1), i.gazeY = me(i.gazeY + p.gy, -1, 1)) : i.eyeSmileL = i.eyeSmile, a) {
      const y = (v, x) => {
        i[v] += (x - i[v]) * s;
      }, c = (v) => Math.min(1.3, Math.max(0, v));
      "eyeOpen" in a && (y("eyeROpen", c(a.eyeOpen) * u), "eyeOpenL" in a || y("eyeLOpen", c(a.eyeOpen) * u)), "eyeOpenL" in a && y("eyeLOpen", c(a.eyeOpenL) * u), "eyeSmile" in a && (y("eyeSmile", a.eyeSmile), "eyeSmileL" in a || y("eyeSmileL", a.eyeSmile)), "eyeSmileL" in a && y("eyeSmileL", a.eyeSmileL);
      for (const v of ["mouthOpen", "mouthForm", "blush", "browY", "browAngle"])
        v in a && y(v, v === "mouthOpen" || v === "blush" ? Math.max(0, a[v]) : a[v]);
    }
    const S = this.speechMouth(e);
    return S ? (this.lipOpen = S[0], this.lipForm = S[1]) : this.lipOpen !== null && !this.speaking && !this.kana && (this.lipOpen = null), this.lipOpen !== null && (i.mouthOpen = Math.max(i.mouthOpen * 0.3, this.lipOpen), i.mouthForm = me(this.lipForm, -1, 1)), this.P = i, i;
  }
}
const At = {
  neutral: "normal",
  smile: "smile",
  shy: "shy",
  surprise: "surprise",
  halfLidded: "jito",
  angry: "angryTalk",
  sad: "sadTalk",
  wink: "wink"
}, Zn = { sad: { pitch: -6, gy: -0.45 } }, Fe = (n, e, t) => Math.max(e, Math.min(t, n)), Be = Object.freeze({ eyeOpen: 1, eyeOpenL: 1, eyeSmile: 0, eyeSmileL: 0, blush: 0, browY: 0, browAngle: 0, mouthOpen: 0, gx: 0, gy: 0, pitch: 0 });
function Wn(n) {
  const e = qt[At[n]]?.p ?? {}, t = Zn[n] ?? {};
  return {
    eyeOpen: e.eyeOpen ?? 1,
    eyeOpenL: e.eyeOpenL ?? e.eyeOpen ?? 1,
    eyeSmile: e.eyeSmile ?? 0,
    eyeSmileL: e.eyeSmileL ?? e.eyeSmile ?? 0,
    blush: e.blush ?? 0,
    browY: e.browY ?? 0,
    browAngle: e.browAngle ?? 0,
    mouthOpen: e.mouthOpen ?? 0,
    gx: e.glance?.[0] ?? 0,
    gy: t.gy ?? e.glance?.[1] ?? 0,
    pitch: t.pitch ?? 0
  };
}
function Gn(n, e) {
  const t = { ...n };
  return t.eyeROpen = (n.eyeROpen ?? 1) * e.eyeOpen, t.eyeLOpen = (n.eyeLOpen ?? 1) * e.eyeOpenL, t.eyeSmile = Math.max(n.eyeSmile ?? 0, e.eyeSmile), t.eyeSmileL = Math.max(n.eyeSmileL ?? n.eyeSmile ?? 0, e.eyeSmileL), t.blush = Math.max(n.blush ?? 0, e.blush), t.browY = Fe((n.browY ?? 0) + e.browY, -1, 1), t.browAngle = Fe((n.browAngle ?? 0) + e.browAngle, -1, 1), t.mouthOpen = Math.max(n.mouthOpen ?? 0, e.mouthOpen), t.gazeX = Fe((n.gazeX ?? 0) + e.gx, -1, 1), t.gazeY = Fe((n.gazeY ?? 0) + e.gy, -1, 1), t.angleY = Fe((n.angleY ?? 0) + e.pitch, -30, 30), t;
}
class Vn {
  /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
  name = "neutral";
  mix = { ...Be };
  /** @param {string} name */
  set(e) {
    this.name = Object.hasOwn(At, e) ? (
      /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
      e
    ) : "neutral";
  }
  /** True while an expression is shown or still fading out. */
  get active() {
    return this.name !== "neutral" || Object.keys(Be).some((e) => Math.abs(this.mix[e] - Be[e]) > 1e-3);
  }
  apply(e, t) {
    if (!this.active)
      return this.mix = { ...Be }, e;
    const r = Wn(this.name), a = 1 - Math.exp(-Math.max(0, t) * 12);
    for (const s of Object.keys(Be)) this.mix[s] += (r[s] - this.mix[s]) * a;
    return Gn(e, this.mix);
  }
}
const jt = ["ball", "low", "crease", "lash"], tt = /* @__PURE__ */ new Map(), nt = /* @__PURE__ */ new Map();
async function Ct(n) {
  return nt.has(n) || nt.set(n, fetch(n).then((e) => {
    if (!e.ok) throw new Error(`failed to load ${n}`);
    return e.json();
  })), nt.get(n);
}
function zt(n) {
  if (tt.has(n)) return tt.get(n);
  const e = new Promise((t, r) => {
    const a = new Image();
    a.onload = () => t(a), a.onerror = () => r(new Error(`failed to load ${n}`)), a.src = n;
  });
  return tt.set(n, e), e;
}
function Jt(n, e) {
  const t = document.createElement("canvas");
  t.width = n.width, t.height = n.height;
  const r = t.getContext("2d");
  r.drawImage(n, 0, 0);
  const a = r.getImageData(0, 0, t.width, t.height).data, s = new Uint8Array(t.width * t.height);
  for (let l = 0; l < s.length; l++) s[l] = a[l * 4 + e];
  return s;
}
const Ue = (n) => Jt(n, 3);
function qn(n, e) {
  const [t, r] = n.t.pivot, a = n.dir, s = n.pts, l = (S, y, c) => {
    const v = Math.min(1, Math.max(0, (c - S) / (y - S)));
    return v * v * (3 - 2 * v);
  }, m = Math.cos(n.phi[0]), b = Math.sin(n.phi[0]), d = Math.cos(n.phi[1]), p = Math.sin(n.phi[1]), i = e.rest, u = e.pos;
  for (let S = 0; S < i.length; S += 2) {
    const y = i[S] - t, c = i[S + 1] - r, v = y * a[0] + c * a[1], x = s[0][0] + y * m - c * b, o = s[0][1] + y * b + c * m, h = y - a[0] * n.L1, T = c - a[1] * n.L1, f = s[1][0] + h * d - T * p, w = s[1][1] + h * p + T * d, B = l(n.L1 * 0.55, n.L1 * 1.35, v);
    u[S] = x + (f - x) * B, u[S + 1] = o + (w - o) * B;
  }
}
function portraitDeformationGain(mesh, minimum = 0.25) {
  const rest = mesh.rest, pos = mesh.pos, tris = mesh.tris;let gain = 1;
  for (let i = 0; i < tris.length; i += 3) {
    const a = tris[i] * 2, b = tris[i + 1] * 2, c = tris[i + 2] * 2;
    const bx = rest[b] - rest[a], by = rest[b + 1] - rest[a + 1], cx = rest[c] - rest[a], cy = rest[c + 1] - rest[a + 1];
    const area = bx * cy - by * cx;if (Math.abs(area) < 1e-6) continue;
    const dbx = pos[b] - pos[a] - bx, dby = pos[b + 1] - pos[a + 1] - by, dcx = pos[c] - pos[a] - cx, dcy = pos[c + 1] - pos[a + 1] - cy;
    const linear = (dbx * cy - dby * cx + bx * dcy - by * dcx) / area;
    const square = (dbx * dcy - dby * dcx) / area, constant = 1 - minimum;
    if (Math.abs(square) < 1e-10) {
      if (linear < 0) gain = Math.min(gain, -constant / linear);
    } else {
      const discriminant = linear * linear - 4 * square * constant;
      if (discriminant < 0) continue;
      const root = Math.sqrt(discriminant), r0 = (-linear - root) / (2 * square), r1 = (-linear + root) / (2 * square);
      if (r0 > 0) gain = Math.min(gain, r0);if (r1 > 0) gain = Math.min(gain, r1);
    }
  }
  return gain < 1 ? Math.max(0, gain * 0.98) : 1;
}
async function Jn(n, e) {
  if (!e.assets && e.assetsBase === void 0)
    throw new Error("createMeshAvatar requires assets or assetsBase.");
  const t = e.rig, r = dn(t), {
    IMG: a,
    EYES: s,
    baseWeights: l,
    deformBase: m,
    eyePartY: b,
    eyePartAlpha: d,
    handWeights: p,
    handFrame: i,
    deformHand: u,
    TASSELS: S
  } = r, { Renderer: y, buildGrid: c } = Ln(r, t), { Physics: v } = kn(r, t), { createSprites: x } = _n(r, t), o = (e.assetsBase ?? "").replace(/\/?$/, "/"), h = (M, R) => {
    if (e.assets) {
      if (!e.assets[M]) throw new Error(`Missing project asset: ${M}`);
      return e.assets[M];
    }
    return `${o}${M}${R === void 0 ? "" : `?b=${R}`}`;
  }, T = await Ct(h("layers.json")), f = ["base", ...t.hand ? ["hand"] : [], ...S.map((M) => M.name), ...[0, 1].flatMap((M) => jt.map((R) => `eye${M}_${R}`)), "hairmask", ...t.portrait?.version === 2 ? ["subject", "mouth_upper", "mouth_lower"] : []], w = Object.fromEntries(await Promise.all(f.map(async (M) => [M, await zt(h(`${M}.png`, T.build))]))), B = Jt(w.hairmask, 0), Y = (M, R) => B[Math.min(a.h - 1, Math.max(0, Math.round(R))) * a.w + Math.min(a.w - 1, Math.max(0, Math.round(M)))] / 255, I = new y(n, { padTop: e.padTop ?? t.view.padTop, padSide: e.padSide ?? t.view.padSide, fit: e.fit }), _ = { base: [0, 0, a.w, a.h], ...T.layers }, U = c(_.base, t.mesh.baseCell, Ue(w.base), w.base.width, t.mesh.fine), O = [];
  // Local portrait extension: background and image edges have zero motion weight.
  if (w.subject && (w.subject.width !== a.w || w.subject.height !== a.h)) throw new Error("subject.png: dimensions must match rig image");
  const subject = w.subject ? Jt(w.subject, 0) : null;
  r.portraitWeight = (px, py) => !subject ? 1 : subject[Math.min(a.h - 1, Math.max(0, Math.round(py))) * a.w + Math.min(a.w - 1, Math.max(0, Math.round(px)))] / 255;
  for (let M = 0; M < U.rest.length / 2; M++) {
    const R = U.rest[M * 2], W = U.rest[M * 2 + 1];
    O.push({ ...l(R, W, Y(R, W)), portrait: r.portraitWeight(R, W) });
  }
  I.addLayer("base", w.base, U, { face: !0 });
  const C = [];
  s.forEach((M, R) => {
    for (const W of jt) {
      const Q = `eye${R}_${W}`, ne = c(_[Q], W === "ball" ? t.mesh.eyeBallCell : t.mesh.eyeCell, Ue(w[Q]), w[Q].width), ee = [];
      for (let oe = 0; oe < ne.rest.length / 2; oe++) ee.push({...l(ne.rest[oe * 2], ne.rest[oe * 2 + 1], 0),portrait:r.portraitWeight(ne.rest[oe * 2],ne.rest[oe * 2 + 1])});
      const he = I.addLayer(Q, w[Q], ne, { eyeBall: W === "ball" ? R : void 0 });
      const closedLid = t.portrait?.blinkLid === true && W === "crease";
      C.push({ e: M, eye: R, part: closedLid ? "lash" : W, closedLid, mesh: ne, W: ee, layer: he });
    }
  });
  const portraitLips = t.portrait?.version === 2 ? ["upper", "lower"].map(part => {
    const key = `mouth_${part}`, mesh = c(_[key], t.mesh.eyeCell, Ue(w[key]), w[key].width);
    return { part, mesh, W: Array.from({length: mesh.rest.length / 2}, (_, i) => ({...l(mesh.rest[i * 2], mesh.rest[i * 2 + 1], 0),portrait:r.portraitWeight(mesh.rest[i * 2],mesh.rest[i * 2 + 1])})), layer: I.addLayer(key, w[key], mesh) };
  }) : [];
  let $ = null;
  try {
    if (t.portrait?.version !== 2) {
      const M = await Ct(h("sprites/sprites.json")), R = Object.fromEntries(await Promise.all(Object.keys(M.layers).map(async (W) => [W, await zt(h(`sprites/${W}.png`, M.build))])));
      $ = x(I, M, R, c, Ue);
    }
  } catch (M) {
    console.warn("eye / mouth sprites not loaded:", M);
  }
  const V = S.map((M) => {
    const R = c(_[M.name], t.mesh.tasselCell, Ue(w[M.name]), w[M.name].width);
    return I.addLayer(M.name, w[M.name], R);
  }), X = t.hand ? c(_.hand, t.mesh.handCell, Ue(w.hand), w.hand.width) : { rest: [], pos: [] }, D = [];
  for (let M = 0; M < X.rest.length / 2; M++) D.push(p(X.rest[M * 2], X.rest[M * 2 + 1]));
  t.hand && I.addLayer("hand", w.hand, X);
  const H = new v(), L = new Hn(t.view.gazeCenter ?? [t.head.cx, t.head.cy]), Z = /* @__PURE__ */ new Set();
  L.onMotion = (M) => {
    for (const R of Z) R(M);
  };
  let P = {}, G = 1, J = {};
  const q = new Vn(), g = [0, 0];
  function A(M) {
    const R = { ...L.update(M) };
    for (const [Q, ne] of Object.entries(P)) R[Q] = G === 1 ? ne : (R[Q] ?? 0) + (ne - (R[Q] ?? 0)) * G;
    L.lipOpen !== null && (R.mouthOpen = L.P.mouthOpen, (!e.preserveMouthForm || P.mouthForm === void 0) && (R.mouthForm = L.P.mouthForm));
    const W = q.apply(R, M);
    return J = W, W;
  }
  function E(M) {
    const R = A(M), W = H.step(R, M), Q = U.pos, ne = U.rest;
    if (t.portrait?.version === 2) R.deformGain = 1;
    for (let K = 0; K < O.length; K++)
      m(ne[K * 2], ne[K * 2 + 1], O[K], R, W, g), Q[K * 2] = g[0], Q[K * 2 + 1] = g[1];
    if (t.portrait?.version === 2) {
      R.deformGain = portraitDeformationGain(U);
      if (R.deformGain < 1) for (let i = 0; i < Q.length; i++) Q[i] = ne[i] + (Q[i] - ne[i]) * R.deformGain;
    }
    const ee = (K) => $ && t.portrait?.version !== 2 ? 1 : K;
    for (const K of C) {
      const Pe = ee(K.eye === 0 ? R.eyeROpen : R.eyeLOpen), Tt = K.eye === 0 ? R.eyeSmile : R.eyeSmileL ?? R.eyeSmile;
      const closure = Math.min(1, Math.max(0, (0.55 - Pe) / 0.40));
      K.layer.alpha = K.closedLid ? closure * closure * (3 - 2 * closure) : d(K.part, Pe, Tt);
      const Ot = K.mesh.rest, Rt = K.mesh.pos;
      for (let Se = 0; Se < K.W.length; Se++) {
        const Lt = Ot[Se * 2], mn = Ot[Se * 2 + 1];
        m(Lt, b(K.e, K.part, Lt, mn, Pe, Tt), K.W[Se], R, W, g), Rt[Se * 2] = g[0], Rt[Se * 2 + 1] = g[1];
      }
    }
    // Move original lip textures around a continuous, tooth-free aperture.
    for (const lip of portraitLips) for (let i = 0; i < lip.W.length; i++) {
      const px = lip.mesh.rest[i * 2], py = lip.mesh.rest[i * 2 + 1];
      // Match shader coordinates, width and rounded profile exactly, including tilted mouths.
      const ca = Math.cos(t.mouth.angle), sa = Math.sin(t.mouth.angle);
      const nx = ((px - t.mouth.cx) * ca + (py - t.mouth.cy) * sa) / t.mouth.halfLen;
      const form = Math.min(1, Math.max(0, R.mouthForm * 0.5 + 0.5));
      const width = 0.94 + (0.86 - 0.94) * form;
      const k = Math.max(0, 1 - (nx / width) ** 2);
      const H = t.mouth.halfLen * 0.24;
      const shift = Math.min(1, Math.max(0, R.mouthOpen)) * H * (lip.part === "upper" ? -0.25 : 0.75) * Math.sqrt(k);
      m(px - sa * shift, py + ca * shift, lip.W[i], R, W, g);
      lip.mesh.pos[i * 2] = g[0]; lip.mesh.pos[i * 2 + 1] = g[1];
    }
    const he = $?.update(R, W, M, Fn(q.name, L.mode === "manual" ? null : L.expr));
    if (he) for (const K of C) he.eyes[K.eye] && (K.layer.alpha = 0);
    const oe = X.pos, ke = X.rest, fn = i(R);
    for (let K = 0; K < D.length; K++)
      u(ke[K * 2], ke[K * 2 + 1], D[K], R, fn, g), oe[K * 2] = g[0], oe[K * 2 + 1] = g[1];
    H.chains.forEach((K, Pe) => qn(K, V[Pe].mesh));
    const ze = 7;
    I.draw({
      angleX: R.angleX,
      angleY: R.angleY,
      angleZ: R.angleZ,
      eyes: [
        ee(R.eyeROpen),
        R.eyeSmile,
        R.gazeX * ze,
        -R.gazeY * ze * 0.6,
        ee(R.eyeLOpen),
        R.eyeSmileL ?? R.eyeSmile,
        R.gazeX * ze * 0.85,
        -R.gazeY * ze * 0.6
      ],
      // with sprites the drawn mouths replace the shader-painted one
      mouthOpen: $ ? 0 : R.mouthOpen,
      mouthForm: R.mouthForm,
      cheek: R.blush,
      showMesh: !1,
      originalAlpha: 0,
      joints: []
    });
  }
  let k = 0, N = performance.now(), z = !1;
  const F = (M) => {
    const R = Math.min(0.05, (M - N) / 1e3);
    N = M, E(R), k = requestAnimationFrame(F);
  };
  return e.manual || (k = requestAnimationFrame(F)), {
    motions: [
      ...Object.entries(xt).map(([M, R]) => ({ id: M, label: R.label, idle: !1 })),
      ...Object.entries(wt).map(([M, R]) => ({ id: M, label: R.label, idle: !0 }))
    ],
    setParameters(M, R = 1) {
      P = { ...M }, G = Math.min(1, Math.max(0, Number(R) || 0));
    },
    getParameters() {
      return { ...J };
    },
    // On-demand diagnostics only: no triangle scan is added to animation frames.
    getMeshStats() {
      const area = (p, a, b, c) => (p[b * 2] - p[a * 2]) * (p[c * 2 + 1] - p[a * 2 + 1]) - (p[b * 2 + 1] - p[a * 2 + 1]) * (p[c * 2] - p[a * 2]);
      return I.layers.map(layer => {
        const mesh = layer.mesh;let flipped = 0, minAreaRatio = Infinity, maxAreaRatio = 0;
        for (let i = 0; i < mesh.tris.length; i += 3) {
          const a = mesh.tris[i], b = mesh.tris[i + 1], c = mesh.tris[i + 2], rest = area(mesh.rest, a, b, c);
          if (Math.abs(rest) < 1e-6) continue;
          const ratio = area(mesh.pos, a, b, c) / rest;
          if (ratio <= 0) flipped++;minAreaRatio = Math.min(minAreaRatio, ratio);maxAreaRatio = Math.max(maxAreaRatio, ratio);
        }
        return {name:layer.name,vertices:mesh.pos.length/2,triangles:mesh.tris.length/3,flipped,minAreaRatio:Number.isFinite(minAreaRatio)?minAreaRatio:1,maxAreaRatio};
      });
    },
    /** 0..1 loudness of the voice being played (e.g. normalised RMS). */
    setVoiceLevel(M) {
      L.setVoiceLevel(M);
    },
    /** true while TTS audio is playing: idle motions pause and the head nods along. */
    setSpeaking(M) {
      L.setSpeaking(M);
    },
    /** AITuber OnAir emotion tag: happy / sad / angry / surprised / relaxed / neutral (or null). */
    setEmotion(M, R) {
      L.setEmotion(M, R);
    },
    /** Live expression layered over tracking (see OVERLAY_EXPRESSIONS); 'neutral' clears it. */
    setExpression(M) {
      q.set(M);
    },
    getExpression() {
      return { name: q.name, active: q.active };
    },
    /** How much the head moves with the voice while speaking (1 = default, calmer below). */
    setTalkGain(M) {
      L.talkGain = Math.max(0, Number(M) || 0);
    },
    /** Play a motion or idle motion by id (see `motions`). */
    play(M) {
      L.hasMotion(M) && L.playMotion(M);
    },
    /** Move the mouth through the vowels of kana text (no audio; for previews). */
    speakKana(M, R) {
      L.speakKana(String(M ?? ""), R);
    },
    holdMouth(M) {
      L.holdMouth(M);
    },
    stopLipSync() {
      L.stopLipSync();
    },
    getLipSyncState() {
      return L.getLipSyncState();
    },
    setAutoIdle(M) {
      L.autoIdle = !!M;
    },
    setLighting(M) {
      I.setLighting(M);
    },
    getLightingStats() {
      return { ...I.lightingStats };
    },
    setAutoMotion(M) {
      L.autoMotion = !!M;
    },
    /** Hair / tassel sway multiplier (1 = default). */
    setSwayGain(M) {
      H.gain = M;
    },
    /** Called with the motion id when a motion starts and with null when it ends. */
    onMotion(M) {
      return Z.add(M), () => Z.delete(M);
    },
    /** Advance the simulation by `sec` and draw (for tests / hidden tabs). */
    advance(M, R = 60) {
      if (!z)
        if (M === 0) E(0);
        else for (let W = 0; W < Math.round(M * R); W++) E(1 / R);
    },
    /** Update motion and lip sync without drawing a hidden preview. */
    advanceParameters(M) {
      z || A(M);
    },
    destroy() {
      z || (z = !0, cancelAnimationFrame(k), Z.clear(), I.destroy());
    }
  };
}
const Tr = Object.keys(At);
async function Kn(n, e) {
  return Jn(n, { ...e, rig: bt(e.rig) });
}
function Le(n) {
  if (!n || typeof n != "object" || Array.isArray(n))
    throw new Error("avatar.json: expected an object");
  const e = n, t = [];
  e.format !== "mesh-avatar" && t.push('avatar.json.format: expected "mesh-avatar"'), e.version !== 1 && t.push(`avatar.json.version: unsupported version ${JSON.stringify(e.version) ?? "missing"} (expected 1)`), (typeof e.name != "string" || !e.name.trim()) && t.push("avatar.json.name: expected a non-empty string");
  const r = { format: "mesh-avatar", version: 1, name: e.name };
  for (const a of ["author", "license", "thumbnail", "source"])
    e[a] !== void 0 && (typeof e[a] != "string" ? t.push(`avatar.json.${a}: expected a string`) : r[a] = e[a]);
  if (e.studio !== void 0) {
    const a = e.studio;
    !a || typeof a != "object" || Array.isArray(a) || !("version" in a) || typeof a.version != "string" || !a.version.trim() ? t.push("avatar.json.studio.version: expected a non-empty string") : r.studio = { version: a.version };
  }
  if (t.length) throw new Error(t.join(`
`));
  return r;
}
function Kt(n) {
  return Le({ format: "mesh-avatar", version: 1, name: n });
}
const rt = (n) => !!n && typeof n == "object" && !Array.isArray(n), Te = (n, e) => Array.isArray(n) && n.length === e && n.every((t) => typeof t == "number" && Number.isFinite(t)), at = (n, e) => Object.hasOwn(n, e);
function Qt(n) {
  const e = [];
  function t(u, S = !0) {
    if (!at(n, u)) {
      S && e.push(`${u}: missing file`);
      return;
    }
    const y = n[u];
    if (!(y instanceof Uint8Array)) {
      e.push(`${u}: JSON bytes are required`);
      return;
    }
    let c;
    try {
      c = JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(y));
    } catch {
      e.push(`${u}: invalid UTF-8 JSON`);
      return;
    }
    if (!rt(c)) {
      e.push(`${u}: expected an object`);
      return;
    }
    return c;
  }
  function r(u, S, y = !0) {
    return u.version === 1 || y && u.version === void 0 ? !0 : (e.push(`${S}.version: unsupported version ${JSON.stringify(u.version) ?? "missing"} (expected 1)`), !1);
  }
  function a(u) {
    if (!at(n, u)) {
      e.push(`${u}: missing file`);
      return;
    }
    const S = n[u], y = S instanceof Uint8Array ? S.byteLength : S?.size;
    (!Number.isSafeInteger(y) || y <= 0) && e.push(`${u}: expected a non-empty file`);
  }
  function s(u, S, y, c) {
    if (!rt(u)) {
      e.push(`${S}.layers: expected a layer rectangle map`);
      return;
    }
    for (const [v, x] of Object.entries(u)) {
      const o = `${S}.layers.${v}`;
      if (!/^[A-Za-z0-9_-]+$/.test(v)) {
        e.push(`${o}: expected a safe layer name (letters, digits, hyphens or underscores)`);
        continue;
      }
      !Te(x, 4) || !x.every(Number.isInteger) || x[0] < 0 || x[1] < 0 || x[2] <= 0 || x[3] <= 0 ? e.push(`${o}: expected [x, y, width, height] with non-negative integer origins and positive integer dimensions`) : c && (x[0] + x[2] > c[0] || x[1] + x[3] > c[1]) && e.push(`${o}: rectangle must stay inside the image`), a(`${y}/${v}.png`);
    }
    return u;
  }
  function l(u, S) {
    (typeof u.build != "string" || !u.build.trim()) && e.push(`${S}.build: expected a non-empty string`);
  }
  const m = t("avatar.json", !1);
  if (m)
    try {
      Le(m);
    } catch (u) {
      e.push(u.message);
    }
  const b = t("rig.json");
  let d;
  if (b && r(b, "rig.json", !1)) {
    const u = Gt(b);
    e.push(...u.map((S) => `rig.json: ${S}`)), u.length || (d = b);
  }
  a("built/base.png"), a("built/hairmask.png");
  const p = t("built/layers.json");
  if (p && r(p, "built/layers.json")) {
    l(p, "built/layers.json");
    let u;
    !Te(p.size, 2) || !p.size.every((y) => Number.isInteger(y) && y > 0) ? e.push("built/layers.json.size: expected [width, height] with positive integer dimensions") : (u = p.size, d && (u[0] !== d.image.width || u[1] !== d.image.height) && e.push("built/layers.json.size: must match rig.json.image"));
    const S = s(p.layers, "built/layers.json", "built", u);
    if (d && S) {
      const y = [
        ...d.eyes.flatMap((c, v) => ["ball", "low", "crease", "lash"].map((x) => `eye${v}_${x}`)),
        ...d.hand ? ["hand"] : [],
        ...d.portrait?.version === 2 ? ["subject", "mouth_upper", "mouth_lower"] : [],
        ...(d.accessories ?? []).map((c) => c.name)
      ];
      for (const c of y) at(S, c) || e.push(`built/layers.json.layers.${c}: missing required layer`);
    }
    !Array.isArray(p.eyes) || p.eyes.length !== 2 ? e.push("built/layers.json.eyes: expected two eye curves") : p.eyes.forEach((y, c) => {
      const v = `built/layers.json.eyes[${c}]`;
      if (!rt(y)) {
        e.push(`${v}: expected an object`);
        return;
      }
      Te([y.x0, y.x1], 2) && y.x0 < y.x1 || e.push(`${v}: expected finite x0 < x1`);
      for (const o of ["top", "bot"])
        Te(y[o], 24) || e.push(`${v}.${o}: expected 24 finite numbers`);
      if (Te(y.top, 24) && Te(y.bot, 24) && y.top.some((o, h) => o > y.bot[h]) && e.push(`${v}.top: must not exceed bottom curve`), d) for (const o of ["x0", "x1", "top", "bot"]) {
        const h = y[o], T = d.eyes[c][o];
        (Array.isArray(T) ? Te(h, T.length) && h.every((w, B) => w === T[B]) : h === T) || e.push(`${v}.${o}: must match rig.json.eyes[${c}].${o}`);
      }
    });
  }
  const i = t("built/sprites/sprites.json", !1);
  return i && r(i, "built/sprites/sprites.json") && (l(i, "built/sprites/sprites.json"), s(i.layers, "built/sprites/sprites.json", "built/sprites", d ? [d.image.width, d.image.height] : void 0)), e;
}
var ae = Uint8Array, ue = Uint16Array, Mt = Int32Array, qe = new ae([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), Je = new ae([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), ct = new ae([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), en = function(n, e) {
  for (var t = new ue(31), r = 0; r < 31; ++r)
    t[r] = e += 1 << n[r - 1];
  for (var a = new Mt(t[30]), r = 1; r < 30; ++r)
    for (var s = t[r]; s < t[r + 1]; ++s)
      a[s] = s - t[r] << 5 | r;
  return { b: t, r: a };
}, tn = en(qe, 2), nn = tn.b, ut = tn.r;
nn[28] = 258, ut[258] = 28;
var rn = en(Je, 0), Qn = rn.b, Pt = rn.r, ft = new ue(32768);
for (var re = 0; re < 32768; ++re) {
  var Me = (re & 43690) >> 1 | (re & 21845) << 1;
  Me = (Me & 52428) >> 2 | (Me & 13107) << 2, Me = (Me & 61680) >> 4 | (Me & 3855) << 4, ft[re] = ((Me & 65280) >> 8 | (Me & 255) << 8) >> 1;
}
var be = (function(n, e, t) {
  for (var r = n.length, a = 0, s = new ue(e); a < r; ++a)
    n[a] && ++s[n[a] - 1];
  var l = new ue(e);
  for (a = 1; a < e; ++a)
    l[a] = l[a - 1] + s[a - 1] << 1;
  var m;
  if (t) {
    m = new ue(1 << e);
    var b = 15 - e;
    for (a = 0; a < r; ++a)
      if (n[a])
        for (var d = a << 4 | n[a], p = e - n[a], i = l[n[a] - 1]++ << p, u = i | (1 << p) - 1; i <= u; ++i)
          m[ft[i] >> b] = d;
  } else
    for (m = new ue(r), a = 0; a < r; ++a)
      n[a] && (m[a] = ft[l[n[a] - 1]++] >> 15 - n[a]);
  return m;
}), Ee = new ae(288);
for (var re = 0; re < 144; ++re)
  Ee[re] = 8;
for (var re = 144; re < 256; ++re)
  Ee[re] = 9;
for (var re = 256; re < 280; ++re)
  Ee[re] = 7;
for (var re = 280; re < 288; ++re)
  Ee[re] = 8;
var je = new ae(32);
for (var re = 0; re < 32; ++re)
  je[re] = 5;
var er = /* @__PURE__ */ be(Ee, 9, 0), tr = /* @__PURE__ */ be(Ee, 9, 1), nr = /* @__PURE__ */ be(je, 5, 0), rr = /* @__PURE__ */ be(je, 5, 1), ot = function(n) {
  for (var e = n[0], t = 1; t < n.length; ++t)
    n[t] > e && (e = n[t]);
  return e;
}, pe = function(n, e, t) {
  var r = e / 8 | 0;
  return (n[r] | n[r + 1] << 8) >> (e & 7) & t;
}, st = function(n, e) {
  var t = e / 8 | 0;
  return (n[t] | n[t + 1] << 8 | n[t + 2] << 16) >> (e & 7);
}, Et = function(n) {
  return (n + 7) / 8 | 0;
}, Ce = function(n, e, t) {
  return (e == null || e < 0) && (e = 0), (t == null || t > n.length) && (t = n.length), new ae(n.subarray(e, t));
}, ar = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], le = function(n, e, t) {
  var r = new Error(e || ar[n]);
  if (r.code = n, Error.captureStackTrace && Error.captureStackTrace(r, le), !t)
    throw r;
  return r;
}, or = function(n, e, t, r) {
  var a = n.length, s = r ? r.length : 0;
  if (!a || e.f && !e.l)
    return t || new ae(0);
  var l = !t, m = l || e.i != 2, b = e.i;
  l && (t = new ae(a * 3));
  var d = function(F) {
    var j = t.length;
    if (F > j) {
      var M = new ae(Math.max(j * 2, F));
      M.set(t), t = M;
    }
  }, p = e.f || 0, i = e.p || 0, u = e.b || 0, S = e.l, y = e.d, c = e.m, v = e.n, x = a * 8;
  do {
    if (!S) {
      p = pe(n, i, 1);
      var o = pe(n, i + 1, 3);
      if (i += 3, o)
        if (o == 1)
          S = tr, y = rr, c = 9, v = 5;
        else if (o == 2) {
          var w = pe(n, i, 31) + 257, B = pe(n, i + 10, 15) + 4, Y = w + pe(n, i + 5, 31) + 1;
          i += 14;
          for (var I = new ae(Y), _ = new ae(19), U = 0; U < B; ++U)
            _[ct[U]] = pe(n, i + U * 3, 7);
          i += B * 3;
          for (var O = ot(_), C = (1 << O) - 1, $ = be(_, O, 1), U = 0; U < Y; ) {
            var V = $[pe(n, i, C)];
            i += V & 15;
            var h = V >> 4;
            if (h < 16)
              I[U++] = h;
            else {
              var X = 0, D = 0;
              for (h == 16 ? (D = 3 + pe(n, i, 3), i += 2, X = I[U - 1]) : h == 17 ? (D = 3 + pe(n, i, 7), i += 3) : h == 18 && (D = 11 + pe(n, i, 127), i += 7); D--; )
                I[U++] = X;
            }
          }
          var H = I.subarray(0, w), L = I.subarray(w);
          c = ot(H), v = ot(L), S = be(H, c, 1), y = be(L, v, 1);
        } else
          le(1);
      else {
        var h = Et(i) + 4, T = n[h - 4] | n[h - 3] << 8, f = h + T;
        if (f > a) {
          b && le(0);
          break;
        }
        m && d(u + T), t.set(n.subarray(h, f), u), e.b = u += T, e.p = i = f * 8, e.f = p;
        continue;
      }
      if (i > x) {
        b && le(0);
        break;
      }
    }
    m && d(u + 131072);
    for (var Z = (1 << c) - 1, P = (1 << v) - 1, G = i; ; G = i) {
      var X = S[st(n, i) & Z], J = X >> 4;
      if (i += X & 15, i > x) {
        b && le(0);
        break;
      }
      if (X || le(2), J < 256)
        t[u++] = J;
      else if (J == 256) {
        G = i, S = null;
        break;
      } else {
        var q = J - 254;
        if (J > 264) {
          var U = J - 257, g = qe[U];
          q = pe(n, i, (1 << g) - 1) + nn[U], i += g;
        }
        var A = y[st(n, i) & P], E = A >> 4;
        A || le(3), i += A & 15;
        var L = Qn[E];
        if (E > 3) {
          var g = Je[E];
          L += st(n, i) & (1 << g) - 1, i += g;
        }
        if (i > x) {
          b && le(0);
          break;
        }
        m && d(u + 131072);
        var k = u + q;
        if (u < L) {
          var N = s - L, z = Math.min(L, k);
          for (N + u < 0 && le(3); u < z; ++u)
            t[u] = r[N + u];
        }
        for (; u < k; ++u)
          t[u] = t[u - L];
      }
    }
    e.l = S, e.p = G, e.b = u, e.f = p, S && (p = 1, e.m = c, e.d = y, e.n = v);
  } while (!p);
  return u != t.length && l ? Ce(t, 0, u) : t.subarray(0, u);
}, Ae = function(n, e, t) {
  t <<= e & 7;
  var r = e / 8 | 0;
  n[r] |= t, n[r + 1] |= t >> 8;
}, Ye = function(n, e, t) {
  t <<= e & 7;
  var r = e / 8 | 0;
  n[r] |= t, n[r + 1] |= t >> 8, n[r + 2] |= t >> 16;
}, it = function(n, e) {
  for (var t = [], r = 0; r < n.length; ++r)
    n[r] && t.push({ s: r, f: n[r] });
  var a = t.length, s = t.slice();
  if (!a)
    return { t: on, l: 0 };
  if (a == 1) {
    var l = new ae(t[0].s + 1);
    return l[t[0].s] = 1, { t: l, l: 1 };
  }
  t.sort(function(f, w) {
    return f.f - w.f;
  }), t.push({ s: -1, f: 25001 });
  var m = t[0], b = t[1], d = 0, p = 1, i = 2;
  for (t[0] = { s: -1, f: m.f + b.f, l: m, r: b }; p != a - 1; )
    m = t[t[d].f < t[i].f ? d++ : i++], b = t[d != p && t[d].f < t[i].f ? d++ : i++], t[p++] = { s: -1, f: m.f + b.f, l: m, r: b };
  for (var u = s[0].s, r = 1; r < a; ++r)
    s[r].s > u && (u = s[r].s);
  var S = new ue(u + 1), y = mt(t[p - 1], S, 0);
  if (y > e) {
    var r = 0, c = 0, v = y - e, x = 1 << v;
    for (s.sort(function(w, B) {
      return S[B.s] - S[w.s] || w.f - B.f;
    }); r < a; ++r) {
      var o = s[r].s;
      if (S[o] > e)
        c += x - (1 << y - S[o]), S[o] = e;
      else
        break;
    }
    for (c >>= v; c > 0; ) {
      var h = s[r].s;
      S[h] < e ? c -= 1 << e - S[h]++ - 1 : ++r;
    }
    for (; r >= 0 && c; --r) {
      var T = s[r].s;
      S[T] == e && (--S[T], ++c);
    }
    y = e;
  }
  return { t: new ae(S), l: y };
}, mt = function(n, e, t) {
  return n.s == -1 ? Math.max(mt(n.l, e, t + 1), mt(n.r, e, t + 1)) : e[n.s] = t;
}, $t = function(n) {
  for (var e = n.length; e && !n[--e]; )
    ;
  for (var t = new ue(++e), r = 0, a = n[0], s = 1, l = function(b) {
    t[r++] = b;
  }, m = 1; m <= e; ++m)
    if (n[m] == a && m != e)
      ++s;
    else {
      if (!a && s > 2) {
        for (; s > 138; s -= 138)
          l(32754);
        s > 2 && (l(s > 10 ? s - 11 << 5 | 28690 : s - 3 << 5 | 12305), s = 0);
      } else if (s > 3) {
        for (l(a), --s; s > 6; s -= 6)
          l(8304);
        s > 2 && (l(s - 3 << 5 | 8208), s = 0);
      }
      for (; s--; )
        l(a);
      s = 1, a = n[m];
    }
  return { c: t.subarray(0, r), n: e };
}, Ie = function(n, e) {
  for (var t = 0, r = 0; r < e.length; ++r)
    t += n[r] * e[r];
  return t;
}, an = function(n, e, t) {
  var r = t.length, a = Et(e + 2);
  n[a] = r & 255, n[a + 1] = r >> 8, n[a + 2] = n[a] ^ 255, n[a + 3] = n[a + 1] ^ 255;
  for (var s = 0; s < r; ++s)
    n[a + s + 4] = t[s];
  return (a + 4 + r) * 8;
}, Dt = function(n, e, t, r, a, s, l, m, b, d, p) {
  Ae(e, p++, t), ++a[256];
  for (var i = it(a, 15), u = i.t, S = i.l, y = it(s, 15), c = y.t, v = y.l, x = $t(u), o = x.c, h = x.n, T = $t(c), f = T.c, w = T.n, B = new ue(19), Y = 0; Y < o.length; ++Y)
    ++B[o[Y] & 31];
  for (var Y = 0; Y < f.length; ++Y)
    ++B[f[Y] & 31];
  for (var I = it(B, 7), _ = I.t, U = I.l, O = 19; O > 4 && !_[ct[O - 1]]; --O)
    ;
  var C = d + 5 << 3, $ = Ie(a, Ee) + Ie(s, je) + l, V = Ie(a, u) + Ie(s, c) + l + 14 + 3 * O + Ie(B, _) + 2 * B[16] + 3 * B[17] + 7 * B[18];
  if (b >= 0 && C <= $ && C <= V)
    return an(e, p, n.subarray(b, b + d));
  var X, D, H, L;
  if (Ae(e, p, 1 + (V < $)), p += 2, V < $) {
    X = be(u, S, 0), D = u, H = be(c, v, 0), L = c;
    var Z = be(_, U, 0);
    Ae(e, p, h - 257), Ae(e, p + 5, w - 1), Ae(e, p + 10, O - 4), p += 14;
    for (var Y = 0; Y < O; ++Y)
      Ae(e, p + 3 * Y, _[ct[Y]]);
    p += 3 * O;
    for (var P = [o, f], G = 0; G < 2; ++G)
      for (var J = P[G], Y = 0; Y < J.length; ++Y) {
        var q = J[Y] & 31;
        Ae(e, p, Z[q]), p += _[q], q > 15 && (Ae(e, p, J[Y] >> 5 & 127), p += J[Y] >> 12);
      }
  } else
    X = er, D = Ee, H = nr, L = je;
  for (var Y = 0; Y < m; ++Y) {
    var g = r[Y];
    if (g > 255) {
      var q = g >> 18 & 31;
      Ye(e, p, X[q + 257]), p += D[q + 257], q > 7 && (Ae(e, p, g >> 23 & 31), p += qe[q]);
      var A = g & 31;
      Ye(e, p, H[A]), p += L[A], A > 3 && (Ye(e, p, g >> 5 & 8191), p += Je[A]);
    } else
      Ye(e, p, X[g]), p += D[g];
  }
  return Ye(e, p, X[256]), p + D[256];
}, sr = /* @__PURE__ */ new Mt([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]), on = /* @__PURE__ */ new ae(0), ir = function(n, e, t, r, a, s) {
  var l = s.z || n.length, m = new ae(r + l + 5 * (1 + Math.ceil(l / 7e3)) + a), b = m.subarray(r, m.length - a), d = s.l, p = (s.r || 0) & 7;
  if (e) {
    p && (b[0] = s.r >> 3);
    for (var i = sr[e - 1], u = i >> 13, S = i & 8191, y = (1 << t) - 1, c = s.p || new ue(32768), v = s.h || new ue(y + 1), x = Math.ceil(t / 3), o = 2 * x, h = function(R) {
      return (n[R] ^ n[R + 1] << x ^ n[R + 2] << o) & y;
    }, T = new Mt(25e3), f = new ue(288), w = new ue(32), B = 0, Y = 0, I = s.i || 0, _ = 0, U = s.w || 0, O = 0; I + 2 < l; ++I) {
      var C = h(I), $ = I & 32767, V = v[C];
      if (c[$] = V, v[C] = $, U <= I) {
        var X = l - I;
        if ((B > 7e3 || _ > 24576) && (X > 423 || !d)) {
          p = Dt(n, b, 0, T, f, w, Y, _, O, I - O, p), _ = B = Y = 0, O = I;
          for (var D = 0; D < 286; ++D)
            f[D] = 0;
          for (var D = 0; D < 30; ++D)
            w[D] = 0;
        }
        var H = 2, L = 0, Z = S, P = $ - V & 32767;
        if (X > 2 && C == h(I - P))
          for (var G = Math.min(u, X) - 1, J = Math.min(32767, I), q = Math.min(258, X); P <= J && --Z && $ != V; ) {
            if (n[I + H] == n[I + H - P]) {
              for (var g = 0; g < q && n[I + g] == n[I + g - P]; ++g)
                ;
              if (g > H) {
                if (H = g, L = P, g > G)
                  break;
                for (var A = Math.min(P, g - 2), E = 0, D = 0; D < A; ++D) {
                  var k = I - P + D & 32767, N = c[k], z = k - N & 32767;
                  z > E && (E = z, V = k);
                }
              }
            }
            $ = V, V = c[$], P += $ - V & 32767;
          }
        if (L) {
          T[_++] = 268435456 | ut[H] << 18 | Pt[L];
          var F = ut[H] & 31, j = Pt[L] & 31;
          Y += qe[F] + Je[j], ++f[257 + F], ++w[j], U = I + H, ++B;
        } else
          T[_++] = n[I], ++f[n[I]];
      }
    }
    for (I = Math.max(I, U); I < l; ++I)
      T[_++] = n[I], ++f[n[I]];
    p = Dt(n, b, d, T, f, w, Y, _, O, I - O, p), d || (s.r = p & 7 | b[p / 8 | 0] << 3, p -= 7, s.h = v, s.p = c, s.i = I, s.w = U);
  } else {
    for (var I = s.w || 0; I < l + d; I += 65535) {
      var M = I + 65535;
      M >= l && (b[p / 8 | 0] = d, M = l), p = an(b, p + 1, n.subarray(I, M));
    }
    s.i = l;
  }
  return Ce(m, 0, r + Et(p) + a);
}, lr = /* @__PURE__ */ (function() {
  for (var n = new Int32Array(256), e = 0; e < 256; ++e) {
    for (var t = e, r = 9; --r; )
      t = (t & 1 && -306674912) ^ t >>> 1;
    n[e] = t;
  }
  return n;
})(), hr = function() {
  var n = -1;
  return {
    p: function(e) {
      for (var t = n, r = 0; r < e.length; ++r)
        t = lr[t & 255 ^ e[r]] ^ t >>> 8;
      n = t;
    },
    d: function() {
      return ~n;
    }
  };
}, cr = function(n, e, t, r, a) {
  if (!a && (a = { l: 1 }, e.dictionary)) {
    var s = e.dictionary.subarray(-32768), l = new ae(s.length + n.length);
    l.set(s), l.set(n, s.length), n = l, a.w = s.length;
  }
  return ir(n, e.level == null ? 6 : e.level, e.mem == null ? a.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(n.length))) * 1.5) : 20 : 12 + e.mem, t, r, a);
}, sn = function(n, e) {
  var t = {};
  for (var r in n)
    t[r] = n[r];
  for (var r in e)
    t[r] = e[r];
  return t;
}, ve = function(n, e) {
  return n[e] | n[e + 1] << 8;
}, fe = function(n, e) {
  return (n[e] | n[e + 1] << 8 | n[e + 2] << 16 | n[e + 3] << 24) >>> 0;
}, lt = function(n, e) {
  return fe(n, e) + fe(n, e + 4) * 4294967296;
}, ie = function(n, e, t) {
  for (; t; ++e)
    n[e] = t, t >>>= 8;
};
function ur(n, e) {
  return cr(n, e || {}, 0, 0);
}
function fr(n, e) {
  return or(n, { i: 2 }, e && e.out, e && e.dictionary);
}
var ln = function(n, e, t, r) {
  for (var a in n) {
    var s = n[a], l = e + a, m = r;
    Array.isArray(s) && (m = sn(r, s[1]), s = s[0]), ArrayBuffer.isView(s) ? t[l] = [s, m] : (t[l += "/"] = [new ae(0), m], ln(s, l, t, r));
  }
}, Ht = typeof TextEncoder < "u" && /* @__PURE__ */ new TextEncoder(), pt = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), mr = 0;
try {
  pt.decode(on, { stream: !0 }), mr = 1;
} catch {
}
var pr = function(n) {
  for (var e = "", t = 0; ; ) {
    var r = n[t++], a = (r > 127) + (r > 223) + (r > 239);
    if (t + a > n.length)
      return { s: e, r: Ce(n, t - 1) };
    a ? a == 3 ? (r = ((r & 15) << 18 | (n[t++] & 63) << 12 | (n[t++] & 63) << 6 | n[t++] & 63) - 65536, e += String.fromCharCode(55296 | r >> 10, 56320 | r & 1023)) : a & 1 ? e += String.fromCharCode((r & 31) << 6 | n[t++] & 63) : e += String.fromCharCode((r & 15) << 12 | (n[t++] & 63) << 6 | n[t++] & 63) : e += String.fromCharCode(r);
  }
};
function Zt(n, e) {
  var t;
  if (Ht)
    return Ht.encode(n);
  for (var r = n.length, a = new ae(n.length + (n.length >> 1)), s = 0, l = function(d) {
    a[s++] = d;
  }, t = 0; t < r; ++t) {
    if (s + 5 > a.length) {
      var m = new ae(s + 8 + (r - t << 1));
      m.set(a), a = m;
    }
    var b = n.charCodeAt(t);
    b < 128 || e ? l(b) : b < 2048 ? (l(192 | b >> 6), l(128 | b & 63)) : b > 55295 && b < 57344 ? (b = 65536 + (b & 1047552) | n.charCodeAt(++t) & 1023, l(240 | b >> 18), l(128 | b >> 12 & 63), l(128 | b >> 6 & 63), l(128 | b & 63)) : (l(224 | b >> 12), l(128 | b >> 6 & 63), l(128 | b & 63));
  }
  return Ce(a, 0, s);
}
function dr(n, e) {
  if (e) {
    for (var t = "", r = 0; r < n.length; r += 16384)
      t += String.fromCharCode.apply(null, n.subarray(r, r + 16384));
    return t;
  } else {
    if (pt)
      return pt.decode(n);
    var a = pr(n), s = a.s, t = a.r;
    return t.length && le(8), s;
  }
}
var gr = function(n, e) {
  return e + 30 + ve(n, e + 26) + ve(n, e + 28);
}, yr = function(n, e, t) {
  var r = ve(n, e + 28), a = ve(n, e + 30), s = dr(n.subarray(e + 46, e + 46 + r), !(ve(n, e + 8) & 2048)), l = e + 46 + r, m = vr(n, l, a, t, fe(n, e + 20), fe(n, e + 24), fe(n, e + 42)), b = m[0], d = m[1], p = m[2];
  return [ve(n, e + 10), b, d, s, l + a + ve(n, e + 32), p];
}, vr = function(n, e, t, r, a, s, l) {
  var m = a == 4294967295, b = s == 4294967295, d = l == 4294967295, p = e + t, i = m + b + d;
  if (r && i) {
    for (; e + 4 < p; e += 4 + ve(n, e + 2))
      if (ve(n, e) == 1)
        return [
          m ? lt(n, e + 4 + 8 * b) : a,
          b ? lt(n, e + 4) : s,
          d ? lt(n, e + 4 + 8 * (b + m)) : l,
          1
        ];
    r < 2 && le(13);
  }
  return [a, s, l, 0];
}, dt = function(n) {
  var e = 0;
  if (n)
    for (var t in n) {
      var r = n[t].length;
      r > 65535 && le(9), e += r + 4;
    }
  return e;
}, Wt = function(n, e, t, r, a, s, l, m) {
  var b = r.length, d = t.extra, p = m && m.length, i = dt(d);
  ie(n, e, l != null ? 33639248 : 67324752), e += 4, l != null && (n[e++] = 20, n[e++] = t.os), n[e] = 20, e += 2, n[e++] = t.flag << 1 | (s < 0 && 8), n[e++] = a && 8, n[e++] = t.compression & 255, n[e++] = t.compression >> 8;
  var u = new Date(t.mtime == null ? Date.now() : t.mtime), S = u.getFullYear() - 1980;
  if ((S < 0 || S > 119) && le(10), ie(n, e, S << 25 | u.getMonth() + 1 << 21 | u.getDate() << 16 | u.getHours() << 11 | u.getMinutes() << 5 | u.getSeconds() >> 1), e += 4, s != -1 && (ie(n, e, t.crc), ie(n, e + 4, s < 0 ? -s - 2 : s), ie(n, e + 8, t.size)), ie(n, e + 12, b), ie(n, e + 14, i), e += 16, l != null && (ie(n, e, p), ie(n, e + 6, t.attrs), ie(n, e + 10, l), e += 14), n.set(r, e), e += b, i)
    for (var y in d) {
      var c = d[y], v = c.length;
      ie(n, e, +y), ie(n, e + 2, v), n.set(c, e + 4), e += 4 + v;
    }
  return p && (n.set(m, e), e += p), e;
}, br = function(n, e, t, r, a) {
  ie(n, e, 101010256), ie(n, e + 8, t), ie(n, e + 10, t), ie(n, e + 12, r), ie(n, e + 16, a);
};
function xr(n, e) {
  e || (e = {});
  var t = {}, r = [];
  ln(n, "", t, e);
  var a = 0, s = 0;
  for (var l in t) {
    var m = t[l], b = m[0], d = m[1], p = d.level == 0 ? 0 : 8, i = Zt(l), u = i.length, S = d.comment, y = S && Zt(S), c = y && y.length, v = dt(d.extra);
    u > 65535 && le(11);
    var x = p ? ur(b, d) : b, o = x.length, h = hr();
    h.p(b), r.push(sn(d, {
      size: b.length,
      crc: h.d(),
      c: x,
      f: i,
      m: y,
      u: u != l.length || y && S.length != c,
      o: a,
      compression: p
    })), a += 30 + u + v + o, s += 76 + 2 * (u + v) + (c || 0) + o;
  }
  for (var T = new ae(s + 22), f = a, w = s - a, B = 0; B < r.length; ++B) {
    var i = r[B];
    Wt(T, i.o, i, i.f, i.u, i.c.length);
    var Y = 30 + i.f.length + dt(i.extra);
    T.set(i.c, i.o + Y), Wt(T, a, i, i.f, i.u, i.c.length, i.o, i.m), a += 16 + Y + (i.m ? i.m.length : 0);
  }
  return br(T, a, r.length, w, f), T;
}
function wr(n, e) {
  for (var t = {}, r = n.length - 22; fe(n, r) != 101010256; --r)
    (!r || n.length - r > 65558) && le(13);
  var a = ve(n, r + 8);
  if (!a)
    return {};
  var s = fe(n, r + 16), l = fe(n, r - 20) == 117853008;
  if (l) {
    var m = fe(n, r - 12);
    l = fe(n, m) == 101075792, l && (a = fe(n, m + 32), s = fe(n, m + 48));
  }
  for (var b = e && e.filter, d = 0; d < a; ++d) {
    var p = yr(n, s, l), i = p[0], u = p[1], S = p[2], y = p[3], c = p[4], v = p[5], x = gr(n, v);
    s = c, (!b || b({
      name: y,
      size: u,
      originalSize: S,
      compression: i
    })) && (i ? i == 8 ? t[y] = fr(n.subarray(x, x + u), { out: new ae(S) }) : le(14, "unknown compression type " + i) : t[y] = Ce(n, x, x + u));
  }
  return t;
}
const Ve = 200, gt = 64 * 1024 * 1024, yt = new TextDecoder("utf-8", { fatal: !0 });
function St(n) {
  if (!n || n.startsWith("/") || /^[A-Za-z]:/.test(n) || n.includes("\\") || n.includes("\0") || n.split("/").includes(".."))
    throw new Error(`ZIP entry ${JSON.stringify(n)}: path must be relative, without .. or backslashes`);
}
function vt(n) {
  const e = new DataView(n.buffer, n.byteOffset, n.byteLength), t = (u = "(archive)") => {
    throw new Error(`ZIP entry ${JSON.stringify(u)}: invalid or truncated ZIP`);
  }, r = (u) => u >= 0 && u + 2 <= n.length ? e.getUint16(u, !0) : t(), a = (u) => u >= 0 && u + 4 <= n.length ? e.getUint32(u, !0) : t();
  let s = n.length - 22;
  for (; s >= Math.max(0, n.length - 65557) && !(a(s) === 101010256 && s + 22 + r(s + 20) === n.length); s--)
    ;
  (s < 0 || s < n.length - 65557) && t(), (r(s + 4) || r(s + 6) || r(s + 8) !== r(s + 10)) && t();
  const l = r(s + 10), m = a(s + 16), b = m + a(s + 12);
  b !== s && t();
  const d = [], p = /* @__PURE__ */ new Set();
  let i = m;
  for (let u = 0; u < l; u++) {
    (i + 46 > b || a(i) !== 33639248) && t();
    const S = r(i + 28), y = i + 46 + S + r(i + 30) + r(i + 32);
    y > b && t();
    let c;
    try {
      c = yt.decode(n.subarray(i + 46, i + 46 + S));
    } catch {
      throw new Error("ZIP entry (invalid UTF-8 name): invalid filename");
    }
    if (St(c), u >= Ve) throw new Error(`ZIP entry ${JSON.stringify(c)}: more than ${Ve} entries`);
    if (p.has(c)) throw new Error(`ZIP entry ${JSON.stringify(c)}: duplicate entry`);
    p.add(c);
    const v = a(i + 24), x = a(i + 20), o = a(i + 42);
    if (v > gt || x > gt) throw new Error(`ZIP entry ${JSON.stringify(c)}: exceeds 64 MB`);
    if (r(i + 10) !== 0) throw new Error(`ZIP entry ${JSON.stringify(c)}: expected stored compression (method 0)`);
    if (r(i + 8) & 1) throw new Error(`ZIP entry ${JSON.stringify(c)}: encrypted entries are not supported`);
    (x !== v || o + 30 > m || a(o) !== 67324752) && t(c);
    const h = o + 30 + r(o + 26) + r(o + 28);
    (h + v > m || r(o + 8) !== 0 || r(o + 6) !== r(i + 8)) && t(c);
    let T;
    try {
      T = yt.decode(n.subarray(o + 30, o + 30 + r(o + 26)));
    } catch {
      t(c);
    }
    T !== c && t(c), d.push({ name: c, offset: o, start: h, size: v, central: i }), i = y;
  }
  return i !== b && t(), { files: d };
}
function Ar(n) {
  const e = n instanceof Uint8Array ? n : new Uint8Array(n), t = vt(e), r = wr(e, { filter: (s) => s.name !== "__proto__" }), a = /* @__PURE__ */ Object.create(null);
  for (const s of t.files) {
    const l = s.name === "__proto__" ? e.slice(s.start, s.start + s.size) : r[s.name];
    if (!(l instanceof Uint8Array) || l.length !== s.size) throw new Error(`ZIP entry ${JSON.stringify(s.name)}: invalid size`);
    a[s.name] = l;
  }
  return a;
}
function Or(n, e = {}) {
  const t = Object.hasOwn(n, "avatar.json") ? n["avatar.json"] : void 0, r = t ? Le(JSON.parse(yt.decode(t))) : Kt("Avatar"), a = t && !e.manifest ? t : new TextEncoder().encode(JSON.stringify(Le({ ...r, ...e.manifest }), null, 2) + `
`), s = /* @__PURE__ */ Object.create(null);
  s["avatar.json"] = a;
  for (const [u, S] of Object.entries(n)) u !== "avatar.json" && (s[u] = S);
  for (const [u, [S, y]] of Object.entries(s).entries()) {
    if (St(S), u >= Ve) throw new Error(`ZIP entry ${JSON.stringify(S)}: more than ${Ve} entries`);
    if (y.byteLength > gt) throw new Error(`ZIP entry ${JSON.stringify(S)}: exceeds 64 MB`);
  }
  const l = Qt(s);
  if (l.length) throw new Error(l.join(`
`));
  let m = "proto0000";
  for (let u = 0; Object.hasOwn(s, m); u++) m = `proto${String(u + 1).padStart(4, "0")}`;
  const b = Object.fromEntries(Object.entries(s).map(([u, S]) => [u === "__proto__" ? m : u, S])), d = xr(b, { level: 0 });
  if (Object.hasOwn(s, "__proto__")) {
    const u = vt(d).files.find((y) => y.name === m), S = new TextEncoder().encode("__proto__");
    d.set(S, u.offset + 30), d.set(S, u.central + 46);
  }
  const p = vt(d), i = p.files.find((u) => u.name === "avatar.json");
  if (i.offset !== 0) {
    const u = i.start + i.size - i.offset, S = new Uint8Array(d.length);
    S.set(d.subarray(i.offset, i.offset + u)), S.set(d.subarray(0, i.offset), u), S.set(d.subarray(i.offset + u), i.offset + u);
    const y = new DataView(S.buffer);
    for (const c of p.files) y.setUint32(c.central + 42, c === i ? 0 : c.offset < i.offset ? c.offset + u : c.offset, !0);
    return S;
  }
  return d;
}
const Mr = (n) => JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(n));
function Xe(n, e) {
  try {
    return Mr(n);
  } catch {
    throw new Error(`${e}: invalid UTF-8 JSON`);
  }
}
function hn(n, e) {
  return [
    "layers.json",
    "base.png",
    "hairmask.png",
    ...Object.keys(n?.layers ?? {}).map((t) => `${t}.png`),
    ...e ? ["sprites/sprites.json", ...Object.keys(e.layers ?? {}).map((t) => `sprites/${t}.png`)] : []
  ];
}
function cn(n) {
  const e = Qt(n);
  if (e.length) throw new Error(e.join(`
`));
}
function un(n) {
  return !!n && typeof n == "object" && "manifest" in n && "rig" in n && "assets" in n && "release" in n;
}
function ht(n) {
  const e = Ar(n);
  if (!Object.hasOwn(e, "avatar.json")) throw new Error("avatar.json: missing file in .mavatar archive");
  cn(e);
  const t = Le(Xe(e["avatar.json"], "avatar.json")), r = bt(Xe(e["rig.json"], "rig.json")), a = hn(
    Xe(e["built/layers.json"], "built/layers.json"),
    e["built/sprites/sprites.json"] ? Xe(e["built/sprites/sprites.json"], "built/sprites/sprites.json") : void 0
  ), s = {}, l = [], m = () => {
    l.splice(0).forEach((b) => URL.revokeObjectURL(b));
  };
  try {
    for (const b of new Set(a)) {
      const d = URL.createObjectURL(new Blob([new Uint8Array(e[`built/${b}`])], { type: b.endsWith(".json") ? "application/json" : "image/png" }));
      l.push(d), s[b] = d;
    }
  } catch (b) {
    throw m(), b;
  }
  return { manifest: t, rig: r, assets: s, release: m };
}
async function Er(n, e = {}) {
  if (un(n)) return n;
  if (n instanceof Blob) return ht(await n.arrayBuffer());
  if (n instanceof ArrayBuffer || n instanceof Uint8Array) return ht(n);
  const t = new URL(n, typeof location > "u" ? void 0 : location.href);
  if (/\.mavatar$/i.test(t.pathname)) {
    const c = await fetch(t);
    if (!c.ok) throw new Error(`.mavatar: could not load (${c.status})`);
    return ht(await c.arrayBuffer());
  }
  t.pathname.endsWith("/") || (t.pathname += "/");
  const r = (c) => {
    const v = new URL(t);
    return v.pathname += c.split("/").map(encodeURIComponent).join("/"), e.version !== void 0 && v.searchParams.set("v", String(e.version)), v.href;
  }, a = {};
  async function s(c, v = !1) {
    const x = await fetch(r(c));
    if (v && (x.status === 404 || x.ok && x.headers.get("content-type")?.includes("text/html"))) return;
    if (!x.ok) throw new Error(`${c}: could not load (${x.status})`);
    const o = new Uint8Array(await x.arrayBuffer());
    return a[c] = o, Xe(o, c);
  }
  const l = e.rigFile ?? "rig.json";
  St(l);
  const [m, b, d, p] = await Promise.all([
    s(l),
    s("built/layers.json"),
    s("avatar.json", !0),
    s("built/sprites/sprites.json", !0)
  ]);
  Array.isArray(m?.eyes) && Array.isArray(b?.eyes) && (m.eyes = m.eyes.map((c, v) => {
    if (!c || typeof c != "object") return c;
    const x = { ...c };
    for (const o of ["x0", "x1", "top", "bot"]) x[o] === void 0 && (x[o] = b.eyes[v]?.[o]);
    return x;
  })), a["rig.json"] = new TextEncoder().encode(JSON.stringify(m));
  const i = hn(b, p);
  for (const c of i) c.endsWith(".png") && (a[`built/${c}`] = { size: 1 });
  cn(a);
  const u = bt(m), S = Object.fromEntries(i.map((c) => [c, r(`built/${c}`)])), y = decodeURIComponent(t.pathname.split("/").filter(Boolean).at(-1) ?? "Avatar");
  return { manifest: d === void 0 ? Kt(y) : Le(d), rig: u, assets: S, release() {
  } };
}
async function Rr(n, e, t = {}) {
  const r = !un(e), a = await Er(e);
  try {
    const s = await Kn(n, { ...t, rig: a.rig, assets: a.assets }), l = s.destroy.bind(s);
    let m = !1;
    return Object.assign(s, { package: a, destroy() {
      if (!m) {
        m = !0;
        try {
          l();
        } finally {
          r && a.release();
        }
      }
    } });
  } catch (s) {
    throw r && a.release(), s;
  }
}
export {
  portraitDeformationGain,
  Re as DEFAULT_LIGHTING,
  Tr as LIVE_EXPRESSIONS,
  De as PARAMS,
  Sr as colorHex,
  Kn as createMeshAvatar,
  Rr as loadMeshAvatar,
  Er as openAvatar,
  Or as packAvatar,
  An as parseLighting,
  Le as parseManifest,
  bt as parseRig,
  Ar as unpackAvatar,
  Qt as validateAvatarFiles,
  Gt as validateRig
};
