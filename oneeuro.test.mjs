// node oneeuro.test.mjs
import assert from "node:assert";
import { oneEuro } from "./oneeuro.js";

// 静止+ノイズ → 出力の揺れが入力より小さい
let s = {}, inMax = 0, outMax = 0;
for (let i = 0; i < 300; i++) {
  const n = Math.sin(i * 7.3) * 0.01;
  const y = oneEuro(s, 0.5 + n, i * 33);
  if (i > 30) { inMax = Math.max(inMax, Math.abs(n)); outMax = Math.max(outMax, Math.abs(y - 0.5)); }
}
assert(outMax < inMax / 2, `jitter not reduced: ${outMax} vs ${inMax}`);

// 大きく移動 → 最終的に追従する
s = {};
let y;
for (let i = 0; i < 60; i++) y = oneEuro(s, i < 10 ? 0 : 1, i * 33);
assert(Math.abs(y - 1) < 0.01, `did not converge: ${y}`);
console.log("ok");
