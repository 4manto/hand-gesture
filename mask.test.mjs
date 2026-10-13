import assert from "node:assert/strict";
import { maskSmoother } from "./mask.js";

const near = (a, b) => Math.abs(a - b) < 1e-6;

// 一様なマスクは変わらない(端の処理で値が漏れない)
const s = maskSmoother(0.5, 2);
assert.ok(s(new Float32Array(20).fill(1), 5, 4).every(v => near(v, 1)));

// 時間方向: 1 → 0 に変わると、1フレーム目は ema の分だけ残る
assert.ok(s(new Float32Array(20).fill(0), 5, 4).every(v => near(v, 0.5)));
s.reset();
assert.ok(s(new Float32Array(20).fill(0), 5, 4).every(v => near(v, 0)));

// 空間方向: 左半分 1・右半分 0 の段差が、境目でなだらかになり左右対称
const w = 8, h = 3, step = new Float32Array(w * h).map((_, i) => (i % w) < 4 ? 1 : 0);
const row = [...maskSmoother(0, 1)(step, w, h).slice(w, 2 * w)];
assert.ok(near(row[0], 1) && near(row[7], 0));
assert.ok(near(row[3], 2 / 3) && near(row[4], 1 / 3));
assert.ok(near(row[3] + row[4], 1));
console.log("ok");
