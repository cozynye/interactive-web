import { code, Grid, hash, rng, Scene } from './grid';

const TAU = Math.PI * 2;
const BASE = -0.72;
const TOP = 0.6;
const CAM = 3.4;

// 점 종류
const LEAF = 0;
const LIGHT = 1;
const SOLID = 2; // 장식 공·선물·줄기: 법선으로 음영
const STAR = 3; // 꼭대기 별: 돌지 않고 늘 정면

interface Point {
  kind: number;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  r: number;
  g: number;
  b: number;
  ch: number;
  seed: number;
}

// 색은 초록·금색·상아색 셋으로 묶는다
const LIGHT_COLORS = [
  [255, 214, 110],
  [255, 244, 220],
];
const GIFT_COLORS = [
  [236, 226, 204],
  [240, 196, 96],
  [236, 226, 204],
  [240, 196, 96],
  [236, 226, 204],
];

// 높이 h(0 바닥 ~ 1 꼭대기)에서의 반지름. 여섯 단으로 층이 진다.
function radius(h: number) {
  const tier = (h * 6) % 1;
  return 0.02 + 0.52 * Math.pow(1 - h, 0.92) * (1 - 0.3 * tier);
}

function build() {
  const rand = rng(7);
  const pts: Point[] = [];
  const push = (
    kind: number,
    x: number,
    y: number,
    z: number,
    n: number[],
    c: number[],
    ch = 0
  ) =>
    pts.push({
      kind,
      x,
      y,
      z,
      nx: n[0],
      ny: n[1],
      nz: n[2],
      r: c[0],
      g: c[1],
      b: c[2],
      ch,
      seed: rand(),
    });

  // 잎: 아래쪽이 넓으니 아래에 점을 더 많이 둔다
  for (let i = 0; i < 9000; i++) {
    const h = 1 - Math.sqrt(rand());
    const a = rand() * TAU;
    const r = radius(h) * (0.5 + 0.5 * Math.sqrt(rand()));
    const shade = 0.75 + rand() * 0.5;
    push(
      LEAF,
      Math.cos(a) * r,
      BASE + h * (TOP - BASE),
      Math.sin(a) * r,
      [Math.cos(a) * 0.87, 0.5, Math.sin(a) * 0.87],
      [36 * shade, 176 * shade, 78 * shade]
    );
  }
  // 줄기
  for (let i = 0; i < 220; i++) {
    const a = rand() * TAU;
    push(
      SOLID,
      Math.cos(a) * 0.05,
      BASE - rand() * 0.13,
      Math.sin(a) * 0.05,
      [Math.cos(a), 0, Math.sin(a)],
      [150, 96, 58],
      code('#')
    );
  }
  // 나선으로 감은 전구
  const lights = 170;
  for (let i = 0; i < lights; i++) {
    const h = (i / lights) * 0.96;
    const a = h * TAU * 7.5;
    const r = radius(h) * 1.03;
    push(
      LIGHT,
      Math.cos(a) * r,
      BASE + h * (TOP - BASE),
      Math.sin(a) * r,
      [0, 0, 0],
      LIGHT_COLORS[i % LIGHT_COLORS.length]
    );
  }
  // 장식 공
  for (let k = 0; k < 14; k++) {
    const h = 0.06 + (k / 14) * 0.8;
    const a = k * 2.4;
    const r = radius(h) * 0.98;
    const c = k % 2 ? [255, 208, 96] : [244, 234, 212];
    for (let i = 0; i < 110; i++) {
      const u = rand() * 2 - 1;
      const th = rand() * TAU;
      const s = Math.sqrt(1 - u * u);
      const n = [s * Math.cos(th), u, s * Math.sin(th)];
      push(
        SOLID,
        Math.cos(a) * r + n[0] * 0.052,
        BASE + h * (TOP - BASE) + n[1] * 0.052,
        Math.sin(a) * r + n[2] * 0.052,
        n,
        c,
        code('%')
      );
    }
  }
  // 바닥에 둘러 놓은 선물 상자
  GIFT_COLORS.forEach((c, k) => {
    const a = 0.5 + k * (TAU / GIFT_COLORS.length);
    const dist = 0.66 + (k % 2) * 0.12;
    const s = 0.085 + (k % 3) * 0.02;
    const ox = Math.cos(a) * dist;
    const oz = Math.sin(a) * dist;
    for (let i = 0; i < 560; i++) {
      // 여섯 면 중 하나를 골라 그 위의 점을 찍는다 (바닥면은 뺀다)
      const face = Math.floor(rand() * 5);
      const u = rand() * 2 - 1;
      const v = rand() * 2 - 1;
      let p = [u, 1, v];
      let n = [0, 1, 0];
      if (face === 1) [p, n] = [[1, u, v], [1, 0, 0]];
      if (face === 2) [p, n] = [[-1, u, v], [-1, 0, 0]];
      if (face === 3) [p, n] = [[u, v, 1], [0, 0, 1]];
      if (face === 4) [p, n] = [[u, v, -1], [0, 0, -1]];
      const ribbon = Math.abs(p[0]) < 0.2 || Math.abs(p[2]) < 0.2;
      push(
        SOLID,
        ox + p[0] * s,
        BASE - 0.13 + (p[1] + 1) * s,
        oz + p[2] * s,
        n,
        ribbon ? [36, 150, 78] : c,
        code(ribbon ? '=' : '%')
      );
    }
  });
  // 꼭대기 별 (다섯 갈래)
  for (let i = 0; i < 340; i++) {
    const th = rand() * TAU;
    const spike = Math.pow(Math.abs(Math.cos(2.5 * (th - Math.PI / 2))), 2.2);
    const r = Math.sqrt(rand()) * (0.03 + 0.07 * spike);
    push(
      STAR,
      Math.cos(th) * r,
      TOP + 0.07 + Math.sin(th) * r,
      0,
      [0, 0, 0],
      [255, 226, 92],
      code(i % 3 ? '%' : '*')
    );
  }
  return { pts, lights };
}

interface Flake {
  x: number;
  y: number;
  z: number;
  v: number;
  ch: number;
}

// 글자로 만든 트리가 돈다. 전구가 깜박이고 눈이 내린다.
export function createTree(): Scene {
  const { pts, lights } = build();
  const rand = rng(3);
  const flakes: Flake[] = Array.from({ length: 240 }, () => ({
    x: rand() * 4 - 2,
    y: rand() * 2.4 - 1.2,
    z: rand() * 3 - 1.2,
    v: 0.08 + rand() * 0.16,
    ch: code('.*+.'[Math.floor(rand() * 4)]),
  }));
  let letters = 0;

  return {
    frame(g: Grid, t: number, dt: number) {
      const { cols, rows, aspect } = g;
      // 선물과 바닥까지 들어오게 조금 줄이고 위로 올린다
      const u = g.unit * 0.9;
      const cx = cols / 2;
      const cy = rows * 0.47;
      const spin = t * 0.5;
      const ca = Math.cos(spin);
      const sa = Math.sin(spin);

      // 바닥: 아래로 갈수록 넓어지는 끊어진 가로줄
      const floor = Math.round(cy - (BASE - 0.1) * u);
      for (let r = floor; r < rows; r++) {
        const half = cols * (0.22 + (r - floor) * 0.05);
        for (let c = Math.max(0, Math.floor(cx - half)); c < cx + half; c++)
          if (hash(c, r) > 0.22)
            g.put(c, r, 90, 0.2, 150, 160, 190, code('-'));
      }

      for (const p of pts) {
        const still = p.kind === STAR;
        const x = still ? p.x : p.x * ca + p.z * sa;
        const z = still ? 0 : -p.x * sa + p.z * ca;
        const f = CAM / (CAM + z);
        const sx = cx + x * u * f * aspect;
        const sy = cy - p.y * u * f;
        if (p.kind === LIGHT) {
          const tw = 0.5 + 0.5 * Math.sin(t * 3.2 + p.seed * 40);
          g.put(sx, sy, z - 0.03, 0.5 + 0.5 * tw, p.r, p.g, p.b, code(tw > 0.6 ? '@' : 'o'));
          continue;
        }
        if (still) {
          g.put(sx, sy, -5, 0.85 + 0.15 * Math.sin(t * 4 + p.seed * 9), p.r, p.g, p.b, p.ch);
          continue;
        }
        // 오른쪽 위 앞에서 비추는 빛
        const nx = p.nx * ca + p.nz * sa;
        const nz = -p.nx * sa + p.nz * ca;
        const lit = Math.max(0, nx * 0.4 + p.ny * 0.5 - nz * 0.75);
        const lum = p.kind === LEAF ? 0.2 + 0.72 * lit : 0.42 + 0.58 * lit;
        g.put(sx, sy, z, lum, p.r, p.g, p.b, p.ch);
      }

      // 별에서 뻗는 점선 빛줄기
      const sy0 = cy - (TOP + 0.07) * u;
      const reach = u * (0.2 + 0.05 * Math.sin(t * 2));
      for (const deg of [-90, -58, -122, 0, 180]) {
        const a = (deg * Math.PI) / 180;
        const ch = deg === -90 ? '|' : deg === -58 ? '/' : deg === -122 ? '\\' : '-';
        for (let d = u * 0.12; d < reach; d += 1) {
          if (Math.floor(d + t * 6) % 2) continue;
          g.put(cx + Math.cos(a) * d * aspect, sy0 + Math.sin(a) * d, -4, 0.75, 255, 214, 96, code(ch));
        }
      }

      for (const fl of flakes) {
        fl.y -= fl.v * dt;
        if (fl.y < -1.2) fl.y = 1.2;
        const f = CAM / (CAM + fl.z);
        const drift = Math.sin(t * 0.6 + fl.z * 5) * 0.04;
        g.put(cx + (fl.x + drift) * u * f * aspect, cy - fl.y * u * f, fl.z, 0.28 + 0.3 * f, 214, 224, 255, fl.ch);
      }

      // 정보 표시는 지난 프레임에 켜진 칸 수를 쓴다
      const deg = (((spin * 180) / Math.PI) % 360).toFixed(1);
      g.text(1, 1, `rotation ${deg}°`, 0.5, 140, 150, 175);
      g.text(1, 2, `lights ${lights}`, 0.6, 255, 214, 96);
      g.text(1, 3, `letters ${letters.toLocaleString('en-US')}`, 0.5, 140, 150, 175);
      letters = 0;
      for (let i = 0; i < g.lum.length; i++) if (g.lum[i] > 0) letters++;
    },
  };
}
