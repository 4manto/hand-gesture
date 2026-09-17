// 向き判定(体の正面/背面、手のひら/甲、腕の内側/外側)
// ワールド座標: x=画像右, y=下, z=カメラから遠ざかる向き。法線の z<0 ならカメラ側を向いている
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const len = a => Math.hypot(a.x, a.y, a.z) || 1;

export const SIDEWAYS = 0.35; // カメラ方向成分がこれ未満なら「横」

// キャリブレーションで決まる符号(+1/-1)。キーは body / hand:Left / pose:Left など
export const calib = {};
const signed = (key, n) => scale(n, calib[key] ?? 1);

// 法線がカメラ側を向いている度合い(-1〜1)
export const facing = n => -n.z / len(n);
export const toward = (n, yes, no) => {
  const c = facing(n);
  return c > SIDEWAYS ? yes : c < -SIDEWAYS ? no : "横";
};

// 正面方向 = (腰中心 - 肩中心) × (左肩 - 右肩)
export const bodyNormal = p =>
  signed("body", cross(sub(mid(p[23], p[24]), mid(p[11], p[12])), sub(p[11], p[12])));

export function bodyFacing(p, hasFace) {
  const n = bodyNormal(p);
  const yaw = Math.atan2(n.x, -n.z) * 180 / Math.PI;
  let s = toward(n, "正面", "背面");
  // 背を向けるとモデルが左右を取り違えて「正面」と出がちなので、顔が見えなければ背面扱い
  const faceVis = (p[0].visibility + p[2].visibility + p[5].visibility) / 3;
  // hasFace === null(顔処理OFF)のときはこの補正をしない
  if (s === "正面" && hasFace === false && faceVis < 0.5) s = "背面";
  return `${s} (${yaw | 0}°)`;
}

// 手のひらから外へ向く法線。右手と左手で外積の向きが逆になる
// src: "hand"(手モデル) か "pose"(姿勢モデルの手の点)。座標系の癖が違うので別々に補正
export function palmNormal(wrist, index, pinky, hand, src) {
  const n = cross(sub(index, wrist), sub(pinky, wrist));
  return signed(`${src}:${hand}`, scale(n, hand === "Right" ? 1 : -1));
}

export const ARM = { Left: [11, 13, 15, 19, 17], Right: [12, 14, 16, 20, 18] }; // 肩,肘,手首,人差し指,小指
export const posePalm = (p, hand) => {
  const [, , w, i, k] = ARM[hand].map(j => p[j]);
  return palmNormal(w, i, k, hand, "pose");
};

export function armSides(p, hand, palmN) {
  const [s, e, w] = ARM[hand].map(j => p[j]);
  palmN ??= posePalm(p, hand); // 手が検出できなければ姿勢モデルの手の点で代用
  const u = sub(e, s), f = sub(w, e);
  const bend = Math.acos(Math.max(-1, Math.min(1, dot(u, f) / (len(u) * len(f))))) * 180 / Math.PI;
  // 肘が曲がっていれば、前腕の方向(上腕に垂直な成分)が上腕の内側
  const upper = bend > 30 ? toward(sub(f, scale(u, dot(f, u) / len(u) ** 2)), "内側", "外側") : "?(肘が伸びている)";
  return { palm: toward(palmN, "手のひら", "手の甲"), fore: toward(palmN, "内側", "外側"), upper };
}

// 指の曲がり具合。各関節の曲げ角(0°=まっすぐ)と、握り込み率 curl(0〜1)
// 関節の並び: 手首/付け根 → 各関節 → 指先(手のランドマーク番号)
export const FINGERS = [
  ["親", [1, 2, 3, 4], 130],     // [表示名, 点の並び, 最大曲げ角合計]
  ["人", [0, 5, 6, 7, 8], 250],
  ["中", [0, 9, 10, 11, 12], 250],
  ["薬", [0, 13, 14, 15, 16], 250],
  ["小", [0, 17, 18, 19, 20], 250],
];
export function fingerBends(h) {
  return FINGERS.map(([name, idx, max]) => {
    const deg = [];
    for (let j = 1; j < idx.length - 1; j++) {
      const a = sub(h[idx[j]], h[idx[j - 1]]), b = sub(h[idx[j + 1]], h[idx[j]]);
      deg.push(Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b))))) * 180 / Math.PI);
    }
    const curl = Math.min(1, deg.reduce((s, d) => s + d, 0) / max);
    return { name, deg, curl };
  });
}

// キャリブレーション: 「正面を向き、両手のひらをカメラに向ける」姿勢のサンプルから符号を決める
// samples: { key: [facing値, ...] }。はっきりした傾向がないキーは変更しない
export function applyCalibration(samples) {
  const result = {};
  for (const [key, vals] of Object.entries(samples)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (vals.length >= 5 && Math.abs(avg) > 0.3) calib[key] = (calib[key] ?? 1) * Math.sign(avg);
    result[key] = calib[key] ?? 1;
  }
  return result;
}
