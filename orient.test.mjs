// node orient.test.mjs
import assert from "node:assert";
import { bodyFacing, palmNormal, armSides, toward, applyCalibration, calib, fingerBends } from "./orient.js";

const P = (x, y, z, visibility = 1) => ({ x, y, z, visibility });
// カメラに正面を向いた人(本人の左肩は画像右 = +x)。肘を前に曲げて前腕を上げる
function person(front = true) {
  const s = front ? 1 : -1;
  const p = Array.from({ length: 33 }, () => P(0, 0, 0));
  p[0] = p[2] = p[5] = P(0, -0.6, -0.1);
  p[11] = P(0.2 * s, -0.5, 0); p[12] = P(-0.2 * s, -0.5, 0);
  p[23] = P(0.1 * s, 0, 0);   p[24] = P(-0.1 * s, 0, 0);
  for (const [sh, el, wr] of [[11, 13, 15], [12, 14, 16]]) {
    p[el] = P(p[sh].x, -0.2, 0);          // 肘は肩の真下
    p[wr] = P(p[sh].x, -0.2, -0.25 * s);  // 前腕は体の前方へ
  }
  return p;
}

// 右手: 手のひらをカメラに向け指を上へ(親指側=人差し指の付け根は画像+x)
const w = P(0, 0, 0);
assert.equal(toward(palmNormal(w, P(0.03, -0.08, 0), P(-0.03, -0.08, 0), "Right", "hand"), "p", "b"), "p");
assert.equal(toward(palmNormal(w, P(-0.03, -0.08, 0), P(0.03, -0.08, 0), "Right", "hand"), "p", "b"), "b");
// 左手: 鏡写し
assert.equal(toward(palmNormal(w, P(-0.03, -0.08, 0), P(0.03, -0.08, 0), "Left", "hand"), "p", "b"), "p");

assert.match(bodyFacing(person(true), true), /^正面/);
assert.match(bodyFacing(person(false), false), /^背面/);
// 背面だがモデルが左右を取り違えた場合(=正面の形)でも、顔が見えなければ背面
const turned = person(true);
turned[0] = turned[2] = turned[5] = P(0, -0.6, 0, 0.1);
assert.match(bodyFacing(turned, false), /^背面/);
assert.match(bodyFacing(turned, null), /^正面/); // 顔処理OFFなら補正しない

// 肘を前に曲げている → 上腕の前(内側)がカメラ側
assert.equal(armSides(person(true), "Left", P(0, 0, -1)).upper, "内側");
assert.equal(armSides(person(true), "Left", P(0, 0, -1)).fore, "内側");
assert.equal(armSides(person(true), "Left", P(0, 0, 1)).palm, "手の甲");

// キャリブレーション: 手のひらを見せているのに逆向きの値が出る → 符号反転
applyCalibration({ "hand:Right": [-0.8, -0.7, -0.9, -0.8, -0.6], "body": [0.1, -0.1, 0, 0.05, 0] });
assert.equal(calib["hand:Right"], -1);
assert.equal(calib.body, undefined); // 曖昧なら変更しない
assert.equal(toward(palmNormal(w, P(0.03, -0.08, 0), P(-0.03, -0.08, 0), "Right", "hand"), "p", "b"), "b");
// 指: 全部まっすぐ → curl 0 / 人差し指だけ各関節90°曲げ → 人差し指の curl が高い
const hand = Array.from({ length: 21 }, (_, i) => P(0, -i * 0.01, 0));
for (const f of fingerBends(hand)) assert(f.curl < 0.01, `${f.name} not straight`);
// 人差し指 0→5→6→7→8: 付け根で前へ、第二関節で下へ、第一関節で後ろへ
hand[0] = P(0, 0, 0); hand[5] = P(0, -0.1, 0); hand[6] = P(0, -0.1, -0.04);
hand[7] = P(0, -0.07, -0.04); hand[8] = P(0, -0.07, -0.01);
const idx = fingerBends(hand)[1];
assert.deepEqual(idx.deg.map(Math.round), [90, 90, 90]);
assert(idx.curl > 0.9, `curl ${idx.curl}`);

console.log("ok");
