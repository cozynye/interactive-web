import { Grid, hash, lit, RAMP, tone } from './grid';

// 그늘, 중간, 빛 받는 곳의 색
export type Palette = number[][];

// 세 단계 색 사이를 밝기(0~1)로 이어서 out에 담는다
export function shade(pal: Palette, v: number, out: number[]) {
  const a = v < 0.5 ? pal[0] : pal[1];
  const b = v < 0.5 ? pal[1] : pal[2];
  const k = v < 0.5 ? v * 2 : v * 2 - 1;
  for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * k;
  return out;
}

// 덩어리를 그릴 자리. 덩어리의 좌표는 x 오른쪽, y 아래이고 (ox, oy) 칸이 원점이며 좌표 1이 s줄이다.
export interface Spot {
  g: Grid;
  ox: number;
  oy: number;
  s: number;
}

export interface Look {
  pal: Palette;
  z: number;
  // 칸을 얼마나 밝게 그릴지(0~1). 등장 연출에 쓴다.
  show?: (x: number, y: number) => number;
  // 글자를 64단계(TONES)로 쓸지. 털이나 천처럼 결이 있어야 하는 면에 쓰고, 아니면 15단계(RAMP)로 매끈하게 그린다.
  fine?: boolean;
}

const rgb = [0, 0, 0];

// 높이 함수(0이면 빈 곳)가 만드는 덩어리를 돋을새김처럼 찍는다.
// 높이의 기울기로 면이 받는 빛을 구해서 밝기에 맞는 글자와 색을 넣으므로, 덩어리를 겹치면 이음매에 저절로 골이 진다.
export function relief(p: Spot, box: number[], at: (x: number, y: number) => number, look: Look) {
  const { g, ox, oy, s } = p;
  const ax = s * g.aspect;
  const e = 1 / s;
  const c1 = Math.min(g.cols - 1, Math.ceil(ox + box[2] * ax));
  const r1 = Math.min(g.rows - 1, Math.ceil(oy + box[3] * s));
  for (let r = Math.max(0, Math.floor(oy + box[1] * s)); r <= r1; r++)
    for (let c = Math.max(0, Math.floor(ox + box[0] * ax)); c <= c1; c++) {
      const x = (c - ox) / ax;
      const y = (r - oy) / s;
      const h = at(x, y);
      if (h <= 0) continue;
      const a = look.show ? look.show(x, y) : 1;
      if (a <= 0) continue;
      const v = Math.min(1, 0.26 + 0.8 * lit(h, at(x + e, y), at(x, y + e), e) + (hash(c * 1.3, r * 2.1) - 0.5) * (look.fine ? 0.14 : 0.05));
      shade(look.pal, v, rgb);
      g.put(c, r, look.z - h * 0.01, (0.4 + 0.6 * v) * a, rgb[0], rgb[1], rgb[2], look.fine ? tone(v, 12) : RAMP.charCodeAt(Math.max(2, Math.round(v * (RAMP.length - 1)))));
    }
}
