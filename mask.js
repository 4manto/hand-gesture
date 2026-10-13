// 人物マスクをなめらかにする。暗い部屋などでマスクの値が 0.5 付近で揺れると、輪郭がガビガビになるため
//  1. 時間方向: 前のフレームと混ぜてチラつきを抑える(ema = 前フレームの重み。大きいほど安定するが動きに遅れる)
//  2. 空間方向: 箱型ぼかし(半径 r)で階段状のギザギザを丸める。累積和なので r に関係なく O(画素数)
export function maskSmoother(ema, r) {
  let prev = null, tmp, out, col;
  const cl = (v, hi) => v < 0 ? 0 : v > hi ? hi : v;
  const fn = (m, w, h) => {
    if (!prev || prev.length !== m.length) {
      prev = Float32Array.from(m);
      tmp = new Float32Array(m.length);
      out = new Float32Array(m.length);
      col = new Float32Array(w);
    } else {
      for (let i = 0; i < m.length; i++) prev[i] = prev[i] * ema + m[i] * (1 - ema);
    }
    const inv = 1 / (2 * r + 1);
    // 横: 行ごとの累積和
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let s = 0;
      for (let k = -r; k <= r; k++) s += prev[o + cl(k, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[o + x] = s * inv;
        s += prev[o + cl(x + r + 1, w - 1)] - prev[o + cl(x - r, w - 1)];
      }
    }
    // 縦: 列ごとの和を1行ずつ更新する(メモリを順に読むので、列単位に走査するより速い)
    col.fill(0);
    for (let k = -r; k <= r; k++) {
      const o = cl(k, h - 1) * w;
      for (let x = 0; x < w; x++) col[x] += tmp[o + x];
    }
    for (let y = 0; y < h; y++) {
      const o = y * w, add = cl(y + r + 1, h - 1) * w, sub = cl(y - r, h - 1) * w;
      for (let x = 0; x < w; x++) {
        out[o + x] = col[x] * inv;
        col[x] += tmp[add + x] - tmp[sub + x];
      }
    }
    return out;
  };
  fn.reset = () => { prev = null; }; // シルエットを入れ直したとき、古いフレームを混ぜない
  return fn;
}
