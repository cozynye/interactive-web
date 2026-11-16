import { code, Grid, rng, Scene } from './grid';

const TAU = Math.PI * 2;
const COLORS = [
  [255, 236, 204],
  [255, 236, 204],
  [255, 236, 204],
  [255, 236, 204],
  [255, 204, 104],
  [150, 184, 255],
];

interface Star {
  a: number;
  r: number;
  v: number;
  c: number[];
  bright: number;
}

// 한 점에서 별빛이 사방으로 뻗어 나간다. 멀어질수록 빨라지고 꼬리가 길어진다.
export function createBigbang(): Scene {
  const rand = rng(42);
  const spawn = (r: number): Star => ({
    a: rand() * TAU,
    r,
    v: 0.5 + rand() * 0.9,
    c: COLORS[Math.floor(rand() * COLORS.length)],
    bright: 0.45 + rand() * 0.55,
  });
  const stars = Array.from({ length: 1500 }, () => spawn(0.03 + Math.pow(rand(), 2) * 1.8));
  // 한가운데에서 들끓는 빛
  const core = Array.from({ length: 1100 }, () => ({
    a: rand() * TAU,
    r: Math.abs(rand() + rand() + rand() - 1.5) * 0.22,
    ph: rand() * TAU,
    sp: 2 + rand() * 6,
  }));

  return {
    frame(g: Grid, t: number, dt: number) {
      const { cols, rows, unit: u, aspect } = g;
      const cx = cols / 2;
      const cy = rows / 2;
      // 화면 모서리까지의 거리
      const far = Math.hypot(cols / (2 * aspect), rows / 2) / u + 0.1;
      const turn = t * 0.03;
      const pulse = 1 + 0.25 * Math.sin(t * 0.7);

      for (const s of stars) {
        s.r += (s.r * 1.1 + 0.03) * s.v * pulse * dt;
        if (s.r > far) Object.assign(s, spawn(0.03 + rand() * 0.08));
        const ca = Math.cos(s.a + turn) * u * aspect;
        const sa = Math.sin(s.a + turn) * u;
        const tail = Math.min(26, 4 + Math.floor(s.r * 18));
        const near = Math.min(1, s.r * 2 + 0.2);
        for (let k = 0; k < tail; k++) {
          const r = s.r * (1 - k * 0.018);
          const lum = (1 - k / tail) * s.bright * near;
          const ch = k === 0 ? (s.bright > 0.85 ? '*' : '+') : k < 3 ? ':' : '.';
          g.add(cx + ca * r, cy + sa * r, lum * (k ? 0.5 : 0.9), s.c[0], s.c[1], s.c[2], code(ch));
        }
      }

      const swell = 1 + 0.12 * Math.sin(t * 1.3);
      for (const p of core) {
        const lum = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * p.sp + p.ph), 2);
        const r = p.r * swell;
        g.add(cx + Math.cos(p.a + t * 0.2) * r * u * aspect, cy + Math.sin(p.a + t * 0.2) * r * u, lum * 0.6, 255, 228, 196);
      }

      g.text(1, 1, `stars ${stars.length}`, 0.5, 140, 150, 175);
    },
  };
}
