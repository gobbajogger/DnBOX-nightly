/* SPDX-License-Identifier: GPL-3.0-only
 * Shared JS/TS reference for the Remote: AA strokes (Xiaolin Wu, 0..16
 * coverage) and a critically-damped value ease. Same laws as
 * anim/_src/ctx_aa.c and the proposed firmware patch
 * anim/renderer-aa-ease.patch against #869 94197fc8.
 *
 * Runtime UI is behind the design-approval gate; this file is the Web
 * reference, not a live deploy.
 *
 * Colours (ui_theme.h, night):
 *   face  #19252b  UI_N_FACE  RGB(16,26,31)  — use (25,42,37) on official R22 cells
 *   ink   #e0ebd6  UI_N_INK   RGB(224,235,214)
 *   white #dee7df  UI_N_WHITE RGB(222,231,223)
 * Display cadence: 16 ms (~60 fps), main_fm1.c.
 * Settle: 160 ms, omega = 4 / 0.16.
 */
"use strict";
// VENDORED 1:1 from /workspace/dnbox-mockups/anim/renderer-aa-ease.js (DnBOX Lead,
// 2026-11-16 13:45 VLAT). Only change: the GB_MAX hex-float literal, which is a
// SyntaxError in JavaScript, is written as the same exact double. Keep in sync;
// tests/product-remote/aa-ease-reference.test.mjs compares coverage buffers.

export const INK = [224, 235, 214];
export const FACE_R22 = [25, 42, 37];
export const FACE_THEME = [16, 26, 31];
export const SETTLE_S = 0.16;
export const OMEGA = 4 / SETTLE_S;
export const DT = 1 / 60;

export function easeCreate(y) {
  return { y: y, v: 0, target: y };
}

export function easeSetTarget(e, target) {
  e.target = target;
}

/** Analytic critically-damped step. y(t)=(A+B t) e^{-ωt} + target. */
export function easeStep(e, dt, omega) {
  if (omega == null) omega = OMEGA;
  if (dt == null) dt = DT;
  const A = e.y - e.target;
  const B = e.v + omega * A;
  const ex = Math.exp(-omega * dt);
  const y = (A + B * dt) * ex + e.target;
  e.v = (B - omega * (A + B * dt)) * ex;
  e.y = y;
  return y;
}

function ipart(x) { return Math.floor(x); }
function fpart(x) { return x - Math.floor(x); }
function rfpart(x) { return 1 - fpart(x); }

/** Blend ink over RGB888 with firmware-style 0..16 coverage. */
export function pxBlend(data, w, h, x, y, ink, a) {
  if (a <= 0) return;
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  if (a > 16) a = 16;
  const i = (y * w + x) * 4;
  if (a >= 16) {
    data[i] = ink[0]; data[i + 1] = ink[1]; data[i + 2] = ink[2]; data[i + 3] = 255;
    return;
  }
  const ia = 16 - a;
  data[i]     = (ink[0] * a + data[i] * ia) >> 4;
  data[i + 1] = (ink[1] * a + data[i + 1] * ia) >> 4;
  data[i + 2] = (ink[2] * a + data[i + 2] * ia) >> 4;
  data[i + 3] = 255;
}

/** Xiaolin Wu, coverage 0..16. ImageData.data is RGBA. */
export function wuLine(data, w, h, x0, y0, x1, y1, ink) {
  let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (steep) { let t = x0; x0 = y0; y0 = t; t = x1; x1 = y1; y1 = t; }
  if (x0 > x1) { let t = x0; x0 = x1; x1 = t; t = y0; y0 = y1; y1 = t; }
  const dx = x1 - x0, dy = y1 - y0;
  const grad = dx === 0 ? 1 : dy / dx;

  const plot = (x, y, a) => {
    if (steep) pxBlend(data, w, h, y, x, ink, a);
    else pxBlend(data, w, h, x, y, ink, a);
  };

  let xend = Math.floor(x0 + 0.5);
  let yend = y0 + grad * (xend - x0);
  let xgap = rfpart(x0 + 0.5);
  let xpxl1 = xend, ypxl1 = ipart(yend);
  plot(xpxl1, ypxl1,     Math.round(rfpart(yend) * xgap * 16));
  plot(xpxl1, ypxl1 + 1, Math.round(fpart(yend) * xgap * 16));
  let intery = yend + grad;

  xend = Math.floor(x1 + 0.5);
  yend = y1 + grad * (xend - x1);
  xgap = fpart(x1 + 0.5);
  let xpxl2 = xend, ypxl2 = ipart(yend);
  plot(xpxl2, ypxl2,     Math.round(rfpart(yend) * xgap * 16));
  plot(xpxl2, ypxl2 + 1, Math.round(fpart(yend) * xgap * 16));

  for (let x = xpxl1 + 1; x < xpxl2; x++) {
    plot(x, ipart(intery),     Math.round(rfpart(intery) * 16));
    plot(x, ipart(intery) + 1, Math.round(fpart(intery) * 16));
    intery += grad;
  }
}

export function strokePoly(data, w, h, pts, ink) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (![a[0], a[1], b[0], b[1]].every(Number.isFinite)) continue;
    wuLine(data, w, h, a[0], a[1], b[0], b[1], ink);
  }
}

function fit(ys, gx, gy, gw, gh) {
  let lo = Infinity, hi = -Infinity;
  for (const y of ys) { if (y < lo) lo = y; if (y > hi) hi = y; }
  if (hi - lo < 1e-6) { hi = 1; lo = -1; }
  const n = ys.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const xn = n === 1 ? 0 : i / (n - 1);
    const yn = (ys[i] - lo) / (hi - lo);
    pts.push([gx + xn * (gw - 1), gy + (1 - yn) * (gh - 1)]);
  }
  return pts;
}

/** Juno geometric mix, no blep, no *0.7; wrap prepended (official flyback). */
export function junoPoints(mix, width, gx, gy, gw, gh) {
  const N = 192;
  const w = width < 0.05 ? 0.05 : (width > 0.95 ? 0.95 : width);
  const ys = [1 * (1 - mix) + (-1) * mix];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const saw = 2 * t - 1;
    const pulse = t < w ? 1 : -1;
    ys.push(saw * (1 - mix) + pulse * mix);
  }
  return fit(ys, gx, gy, gw, gh);
}

/* ui_original_wave.h — C truncating division, not JS/Python floor. */
function truncDiv(a, b) { return a / b < 0 ? Math.ceil(a / b) : Math.floor(a / b); }
function uiOriginalSaw(p) {
  let edge = p * 64;
  if (edge > 65536) edge = 65536;
  if (edge < -65536) edge = -65536;
  return p - edge;
}
function uiOriginalWave(shape, p, width) {
  if (shape === 0) return truncDiv(65536 - 2 * (p < 0 ? -p : p), 4);
  let z = uiOriginalSaw(p);
  if (shape >= 2) {
    let q = p + 2 * width;
    if (q > 65536) q -= 131072;
    z -= uiOriginalSaw(q);
  }
  return truncDiv(z, 4);
}
function uiOriginalWidth(shape, nativeWidth) {
  if (nativeWidth < 0.01) nativeWidth = 0.01;
  if (nativeWidth > 0.99) nativeWidth = 0.99;
  return shape < 2 ? 0 : shape === 2 ? 32768 : Math.round((1 - nativeWidth) * 65536);
}
function canonical(x, n) {
  let q = Math.round(x * (n - 1));
  if (q < 0) q = 0;
  if (q >= n) q = n - 1;
  return q / (n - 1);
}

/** Chicago WAVE: program_set id 0 gains + compiled ui_original_wave mix. */
export function chicagoPoints(waveX, gx, gy, gw, gh) {
  const GB_MAX = 0x1b2235c / 2 ** 26; // = C 0x1.b2235cp-2 (JS has no hex-float literal)
  const N = 256;
  const ga = canonical(1 - waveX, 1001);
  const gb = canonical(waveX * GB_MAX, 1001);
  const gain = Math.round(ga * 32768);
  const other = Math.round(gb * 32768);
  const wa = uiOriginalWidth(1, 0.5);
  const wb = uiOriginalWidth(3, 0.5);
  const zs = [];
  for (let i = 0; i < N; i++) {
    const phase = N === 1 ? 65536 : 65536 - Math.trunc(131072 * i / (N - 1));
    const z = truncDiv(
      truncDiv(uiOriginalWave(1, phase, wa), 2) * gain +
      truncDiv(uiOriginalWave(3, phase, wb), 2) * other,
      16384);
    zs.push(z);
  }
  return fit(zs, gx, gy, gw, gh);
}

/** 909 BD DECAY: dg_tail_px + a = exp2(-9.966 * x / xe). ms = 100 * 40^(pot/127). */
export function dgTailPx(ms) {
  if (ms < 0) ms = 0;
  if (ms > 4000) ms = 4000;
  return 2 + Math.round(23 * Math.sqrt(ms / 4000));
}
export function bdDecayPoints(midi, gx, gy, gw, gh) {
  const pot = Math.max(0, Math.min(127, midi));
  const ms = 100 * Math.pow(40, pot / 127);
  const xe = dgTailPx(ms);
  const N = 96;
  const span = Math.max(2, gw * (xe / 25));
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const a = Math.pow(2, -9.966 * x);
    pts.push([gx + x * (span - 1), gy + (1 - a) * (gh - 1)]);
  }
  return pts;
}

/**
 * Paint one glyph into an ImageData. kind: 'juno-wave' | 'chicago-wave' |
 * 'juno-width' | '909-bd-decay'. value is the eased pot, 0..127.
 */
export function paintGlyph(imageData, kind, value, gx, gy, gw, gh, ink) {
  const data = imageData.data, w = imageData.width, h = imageData.height;
  const inkc = ink || INK;
  let pts;
  if (kind === "juno-wave") {
    const width = 0.1 + (64 / 127) * 0.8;
    pts = junoPoints(value / 127, width, gx, gy, gw, gh);
  } else if (kind === "chicago-wave") {
    pts = chicagoPoints(value / 127, gx, gy, gw, gh);
  } else if (kind === "juno-width") {
    pts = junoPoints(1, 0.1 + (value / 127) * 0.8, gx, gy, gw, gh);
  } else if (kind === "909-bd-decay") {
    pts = bdDecayPoints(value, gx, gy, gw, gh);
  } else {
    return;
  }
  strokePoly(data, w, h, pts, inkc);
}
