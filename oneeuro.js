// One Euro Filter: 静止時は強く平滑化、速い動きでは遅延を減らす
// 調整: ブレが気になる → MIN_CUTOFF を下げる / 動きに遅れる → BETA を上げる
export const MIN_CUTOFF = 1.0, BETA = 5, D_CUTOFF = 1.0;

const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));

export function oneEuro(s, x, t) {
  if (s.t === undefined) { s.t = t; s.x = x; s.dx = 0; return x; }
  const dt = Math.max((t - s.t) / 1000, 1e-3);
  s.dx += alpha(D_CUTOFF, dt) * ((x - s.x) / dt - s.dx);
  s.x += alpha(MIN_CUTOFF + BETA * Math.abs(s.dx), dt) * (x - s.x);
  s.t = t;
  return s.x;
}

// ランドマーク配列ごとにフィルタを持つ。そのフレームで使われなかった系列は prune() で破棄
const filters = new Map();
const used = new Set();

export function smooth(key, lm, t) {
  let f = filters.get(key);
  if (!f || f.length !== lm.length) filters.set(key, f = lm.map(() => [{}, {}, {}]));
  used.add(key);
  return lm.map((p, i) => ({
    ...p,
    x: oneEuro(f[i][0], p.x, t),
    y: oneEuro(f[i][1], p.y, t),
    z: oneEuro(f[i][2], p.z, t),
  }));
}

export function prune() {
  for (const k of filters.keys()) if (!used.has(k)) filters.delete(k);
  used.clear();
}
