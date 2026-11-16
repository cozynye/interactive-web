import { code, Grid, hash, rng, Scene, smooth } from './grid';

// 색은 파랑 두 가지와 노랑, 사이프러스의 검푸른 초록만 쓴다
const DEEP = [56, 92, 186];
const LIGHT = [134, 178, 236];
const PALE = [222, 230, 242];
const YELLOW = [250, 216, 96];
const TRAIL = 9;

// 소용돌이. 위치·반지름은 하늘 크기에 대한 비율이고, glow가 있으면 달이나 별이다.
const SWIRLS = [
  { x: 0.46, y: 0.42, r: 0.15, s: 1, glow: 0 },
  { x: 0.63, y: 0.56, r: 0.11, s: -0.85, glow: 0 },
  { x: 0.88, y: 0.18, r: 0.085, s: 0.9, glow: 1 },
  { x: 0.07, y: 0.14, r: 0.045, s: 0.7, glow: 0.8 },
  { x: 0.25, y: 0.3, r: 0.05, s: -0.7, glow: 0.8 },
  { x: 0.36, y: 0.09, r: 0.04, s: 0.7, glow: 0.7 },
  { x: 0.56, y: 0.12, r: 0.05, s: -0.7, glow: 0.8 },
  { x: 0.72, y: 0.3, r: 0.045, s: 0.7, glow: 0.7 },
  { x: 0.2, y: 0.62, r: 0.04, s: 0.6, glow: 0.7 },
  { x: 0.93, y: 0.55, r: 0.04, s: -0.6, glow: 0.7 },
];

interface Stroke {
  x: number;
  y: number;
  // 지나온 자리 (붓 자국)
  hx: Float32Array;
  hy: Float32Array;
  n: number;
  life: number;
  tone: number;
}

// 고흐의 「별이 빛나는 밤」을 흐름으로 옮긴 장면. 붓 자국 하나하나가 소용돌이를 따라 떠돈다.
// 처음에는 빈 화면에 달과 별이 켜지고, 거기서부터 붓질이 번져 나간다.
export function createStarryNight(): Scene {
  const rand = rng(1889);
  // 격자 크기를 알기 전이라 자리는 비워 두고, 수명 0으로 두어 첫 프레임에 제자리를 잡게 한다
  const strokes: Stroke[] = Array.from({ length: 3200 }, () => ({
    x: 0,
    y: 0,
    hx: new Float32Array(TRAIL),
    hy: new Float32Array(TRAIL),
    n: 0,
    life: 0,
    tone: rand(),
  }));
  // 프레임마다 다시 계산하는 소용돌이의 실제 위치 (줄 단위)
  const sx = new Float32Array(SWIRLS.length);
  const sy = new Float32Array(SWIRLS.length);
  const sr = new Float32Array(SWIRLS.length);

  return {
    frame(g: Grid, t: number, dt: number) {
      const { cols, rows, aspect } = g;
      const hz = Math.floor(rows * 0.72);
      // 가로를 줄 단위로 잰 하늘의 크기
      const W = cols / aspect;
      const H = hz;

      // 소용돌이도 제자리에 있지 않고 조금씩 떠다닌다
      SWIRLS.forEach((s, i) => {
        sx[i] = (s.x + 0.02 * Math.sin(t * (0.13 + i * 0.031) + i * 2)) * W;
        sy[i] = (s.y + 0.025 * Math.sin(t * (0.17 + i * 0.023) + i)) * H;
        sr[i] = s.r * H * (1.5 + 0.2 * Math.sin(t * 0.21 + i * 1.7));
      });

      for (const p of strokes) {
        // 바람 + 소용돌이들이 끄는 힘
        let vx = 2.4;
        let vy = 0.7 * Math.sin(p.y * 0.22 + p.x * 0.09 + t * 0.3);
        let glow = 0;
        let near = Infinity;
        for (let i = 0; i < SWIRLS.length; i++) {
          const dx = p.x - sx[i];
          const dy = p.y - sy[i];
          const d2 = dx * dx + dy * dy;
          if (d2 < near) near = d2;
          const r = sr[i];
          const k = (SWIRLS[i].s * 5.5 * r) / (d2 + r * r);
          vx -= dy * k;
          vy += dx * k;
          if (SWIRLS[i].glow) glow += SWIRLS[i].glow * Math.exp(-d2 / (r * r * 1.6));
        }
        for (let k = TRAIL - 1; k > 0; k--) {
          p.hx[k] = p.hx[k - 1];
          p.hy[k] = p.hy[k - 1];
        }
        p.hx[0] = p.x;
        p.hy[0] = p.y;
        p.n = Math.min(TRAIL, p.n + 1);
        p.x += vx * dt;
        p.y += vy * dt;
        p.life -= dt;
        if (p.life <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
          // 수명이 다하면 아무 데서나 다시 시작한다
          p.x = rand() * W;
          p.y = rand() * H;
          p.life = 2 + rand() * 4;
          p.n = 1;
          p.hx[0] = p.x;
          p.hy[0] = p.y;
          continue;
        }
        // 붓 방향에 맞는 글자
        const ang = Math.abs(Math.atan2(vy, vx));
        const flat = ang < 0.4 || ang > Math.PI - 0.4;
        const up = ang > 1.2 && ang < Math.PI - 1.2;
        const ch = code(flat ? '-' : up ? '|' : vx * vy > 0 ? '\\' : '/');
        const base = p.tone < 0.55 ? DEEP : p.tone < 0.9 ? LIGHT : PALE;
        const m = Math.min(1, glow);
        const r = base[0] + (YELLOW[0] - base[0]) * m;
        const gr = base[1] + (YELLOW[1] - base[1]) * m;
        const b = base[2] + (YELLOW[2] - base[2]) * m;
        // 붓질은 달과 별, 소용돌이에서 시작해 바깥으로 번진다
        const painted = smooth((t * 0.16 + 0.04 - Math.sqrt(near) / H) / 0.12);
        if (painted <= 0) continue;
        const lum = (0.34 + 0.3 * p.tone + 0.4 * m) * Math.min(1, p.life) * painted;
        for (let k = 0; k < p.n; k++)
          g.add(p.hx[k] * aspect, p.hy[k], lum * (1 - k / TRAIL) * 0.6, r, gr, b, ch);
      }

      // 달과 별의 알맹이
      SWIRLS.forEach((s, i) => {
        if (!s.glow) return;
        // 달과 별이 하나씩 켜진다
        const pop = smooth((t - 0.1 - i * 0.12) / 0.5);
        if (pop <= 0) return;
        const rad = sr[i] * 0.38 * pop;
        if (s.glow === 1 && t > 0.4 && t < 1.1) g.rays(sx[i] * aspect, sy[i], 6, 255, 228, 130);
        for (let dy = -Math.ceil(rad); dy <= rad; dy++)
          for (let dx = -Math.ceil(rad * aspect); dx <= rad * aspect; dx++)
            if (Math.hypot(dx / aspect, dy) <= rad)
              g.put(sx[i] * aspect + dx, sy[i] + dy, 2, 0.95, 255, 228, 130, code(s.glow === 1 ? '@' : 'O'));
      });

      // 언덕과 마을: 능선이 왼쪽에서 오른쪽으로 그어지고, 땅이 채워진 뒤 창에 불이 하나씩 켜진다
      const ridgeTo = smooth((t - 2) / 2.5) * 1.02 * cols;
      const land = smooth((t - 3.5) / 2);
      for (let c = 0; c < cols; c++) {
        if (c > ridgeTo) break;
        const ridge = hz - 1 - Math.round(2.2 + 2.2 * Math.sin(c * 0.045 + 0.6) + 1.2 * Math.sin(c * 0.11));
        for (let r = ridge; r < rows; r++) {
          const w = hash(c * 1.7, r * 3.1);
          const wave = 0.2 + 0.1 * Math.sin(c * 0.3 + r * 0.9 + t * 0.6);
          g.put(c, r, 1, r === ridge ? 0.5 : wave * land, DEEP[0], DEEP[1], DEEP[2], code(r === ridge ? '_' : w < 0.5 ? '~' : '-'));
        }
        // 창문 불빛
        const house = hash(Math.floor(c / 3), 9);
        if (c > cols * 0.3 && house < 0.5 && c % 3 === 1 && t > 5.2 + house * 6) {
          const r = hz + 1 + Math.floor(house * 2 * (rows - hz - 3));
          g.put(c, r, 0.5, 0.6 + 0.3 * Math.sin(t * (0.5 + house * 3) + c), YELLOW[0], YELLOW[1], YELLOW[2], code('o'));
          g.put(c, r - 1, 0.5, 0.42, LIGHT[0], LIGHT[1], LIGHT[2], code('^'));
        }
      }
      // 교회 첨탑
      const spire = Math.round(cols * 0.58);
      for (let k = 0; k < Math.round(rows * 0.13 * smooth((t - 4) / 1.5)); k++)
        g.put(spire, hz - k, 0.4, 0.5, LIGHT[0], LIGHT[1], LIGHT[2], code(t > 5.5 && k === Math.round(rows * 0.13) - 1 ? 'A' : '|'));

      // 사이프러스: 불꽃처럼 일렁이는 검푸른 나무
      const base = cols * 0.15;
      const topRow = Math.round(rows * 0.2);
      // 사이프러스는 땅에서 위로 자란다
      const grown = rows - (rows - topRow) * smooth((t - 1.5) / 3.5);
      for (let r = Math.ceil(grown); r < rows; r++) {
        const k = (r - topRow) / (rows - topRow);
        const half = (0.6 + k * cols * 0.05) * (1 + 0.18 * Math.sin(r * 0.7 - t * 1.4));
        const lean = Math.sin(r * 0.35 - t * 0.9) * (1 - k) * 2;
        for (let c = Math.floor(base + lean - half); c <= base + lean + half; c++) {
          const w = hash(c, r + Math.floor(t * 2));
          g.put(c, r, 0, 0.3 + 0.3 * w, 24, 96, 84, code('()/\\|{}'[Math.floor(w * 7)]));
        }
      }

      // 다 그린 뒤에 서명을 한 글자씩 적는다
      const sign = 'after van Gogh, 1889'.slice(0, Math.max(0, Math.floor((t - 8.5) * 12)));
      g.text(cols - 22, rows - 2, sign, 0.45, PALE[0], PALE[1], PALE[2]);
    },
  };
}
