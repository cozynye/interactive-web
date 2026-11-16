import { code, Grid, hash, rng, Scene, smooth } from './grid';

const TAU = Math.PI * 2;
// [바깥 색, 안쪽 색]
// 금색·상아색·옅은 분홍 셋만 쓴다
const PALETTES = [
  [[255, 200, 96], [255, 244, 208]],
  [[255, 244, 224], [255, 210, 120]],
  [[255, 158, 176], [255, 232, 228]],
];
const SHORE = '=*@0+%-:';
const WINDOWS = 'o#=+';

interface Shell {
  x: number;
  y: number;
  y0: number;
  ty: number;
  age: number;
  rise: number;
  pal: number[][];
}
interface Spark {
  x: number;
  y: number;
  // 직전 위치 (꼬리)
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: number[];
  seed: number;
}

// 강 건너 도시 위로 터지는 불꽃놀이. 수평선 아래에는 물에 비친 모습이 일렁인다.
// 처음 3초 동안 도시의 창과 강변에 불이 들어오고 나서 쏘기 시작한다.
export function createFireworks(): Scene {
  const rand = rng(11);
  let shells: Shell[] = [];
  let sparks: Spark[] = [];
  // 도시에 불이 다 들어온 뒤에 첫 발을 쏜다
  let next = 3;
  let launched = 0;
  // 칸 수가 바뀌면 건물을 다시 세운다
  let builtFor = '';
  let roof: number[] = [];

  const skyline = (cols: number, rows: number) => {
    const r = rng(5);
    roof = [];
    while (roof.length < cols) {
      const w = 2 + Math.floor(r() * 6);
      const h = 1 + Math.floor(r() * r() * rows * 0.2);
      // 건물 사이 틈
      const gap = r() < 0.25 ? 1 : 0;
      for (let k = 0; k < w; k++) roof.push(h);
      for (let k = 0; k < gap; k++) roof.push(0);
    }
  };

  const burst = (s: Shell, g: Grid) => {
    const reach = g.rows * (0.15 + rand() * 0.1);
    const ring = rand() < 0.25;
    const n = 380 + Math.floor(rand() * 220);
    const drag = 2.2;
    for (let i = 0; i < n; i++) {
      const a = rand() * TAU;
      const k = ring ? 0.92 + rand() * 0.08 : Math.sqrt(rand());
      const v = reach * drag * (0.25 + 0.75 * k);
      const max = 1.5 + rand() * 0.9;
      sparks.push({
        x: s.x,
        y: s.y,
        px: s.x,
        py: s.y,
        vx: Math.cos(a) * v * g.aspect,
        vy: Math.sin(a) * v,
        life: max,
        max,
        c: k > 0.6 ? s.pal[0] : s.pal[1],
        seed: rand() * 100,
      });
    }
  };

  return {
    frame(g: Grid, t: number, dt: number) {
      const { cols, rows } = g;
      const hz = Math.floor(rows * 0.64);
      if (builtFor !== `${cols}x${rows}`) {
        builtFor = `${cols}x${rows}`;
        skyline(cols, rows);
      }

      const sky = smooth(t / 2);
      // 창문은 무작위 순서로 하나씩 켜지고, 강변 불빛은 왼쪽에서 오른쪽으로 이어진다
      const windows = smooth(t / 2.8) * 1.02;
      const shoreTo = (t / 2) * cols;

      // 하늘의 별
      for (let i = 0; i < cols * 0.9; i++) {
        const c = Math.floor(hash(i, 1) * cols);
        const r = Math.floor(hash(i, 2) * hz * 0.9);
        g.put(c, r, 9, (0.12 + 0.14 * hash(i, Math.floor(t * 1.5))) * sky, 170, 185, 230, code('.'));
      }

      // 건물과 창문 불빛
      for (let c = 0; c < cols; c++) {
        for (let k = 1; k <= roof[c]; k++) {
          const r = hz - k;
          const w = hash(c * 3.1, r * 7.7);
          if (w < 0.22 && hash(c * 5.3, r * 1.9) < windows) {
            const flick = 0.75 + 0.25 * Math.sin(t * (0.6 + w * 9) + c);
            const warm = hash(c, r) < 0.75;
            g.put(c, r, 5, (0.5 + w * 2) * flick, 255, warm ? 206 : 236, warm ? 120 : 200, code(WINDOWS[Math.floor(w * 25) % WINDOWS.length]));
          } else g.put(c, r, 5, 0.3, 96, 122, 190, code(w < 0.6 ? ':' : '.'));
        }
        // 강변을 따라 늘어선 불빛
        if (c > shoreTo) continue;
        const s = hash(c, 77);
        g.put(c, hz, 4, 0.5 + 0.45 * hash(c, Math.floor(t * 3 + s * 9)), 255, 214, 110, code(SHORE[Math.floor(s * SHORE.length)]));
      }

      // 쏘아 올리기
      if (t >= next) {
        next = t + 0.35 + rand() * 0.75;
        launched++;
        shells.push({
          x: cols * (0.1 + rand() * 0.8),
          y: hz - 1,
          y0: hz - 1,
          ty: rows * (0.1 + rand() * 0.26),
          age: 0,
          rise: 0.8 + rand() * 0.3,
          pal: PALETTES[Math.floor(rand() * PALETTES.length)],
        });
      }
      shells = shells.filter((s) => {
        s.age += dt;
        const k = Math.min(1, s.age / s.rise);
        // 올라갈수록 느려진다
        s.y = s.y0 + (s.ty - s.y0) * (1 - (1 - k) * (1 - k));
        g.add(s.x, s.y, 0.7, 255, 236, 200, code('|'));
        g.add(s.x, s.y + 1, 0.3, 255, 200, 140, code(':'));
        if (k < 1) return true;
        burst(s, g);
        return false;
      });

      const drag = Math.max(0, 1 - 2.2 * dt);
      sparks = sparks.filter((p) => {
        p.vx *= drag;
        p.vy = p.vy * drag + 3.2 * dt;
        const ox = p.x;
        const oy = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0 || p.y >= hz) return false;
        const k = p.life / p.max;
        // 꺼지기 직전에는 반짝거린다
        const tw = k < 0.4 ? 0.55 + 0.45 * Math.sin(t * 24 + p.seed) : 1;
        const lum = Math.pow(k, 1.2) * tw;
        g.add(p.x, p.y, lum, p.c[0], p.c[1], p.c[2]);
        g.add(ox, oy, lum * 0.55, p.c[0], p.c[1], p.c[2]);
        g.add(p.px, p.py, lum * 0.3, p.c[0], p.c[1], p.c[2]);
        p.px = ox;
        p.py = oy;
        return true;
      });

      // 물에 비친 모습: 수평선 위를 뒤집어 눌러 담고 가로로 흔든다
      const depth = rows - hz - 1;
      for (let r = hz + 1; r < rows; r++) {
        const d = r - hz;
        const src = hz - 1 - Math.floor((d - 1) * 1.5);
        if (src < 0) break;
        const fade = 0.55 * (1 - (d / depth) * 0.6);
        for (let c = 0; c < cols; c++) {
          if (hash(c + Math.floor(t * 5) * 0.37, r) < 0.42) continue;
          const sx = c + Math.round(Math.sin(r * 0.9 + t * 1.8 + c * 0.06) * d * 0.14);
          if (sx < 0 || sx >= cols) continue;
          const i = src * cols + sx;
          const lum = Math.min(1, g.lum[i]) * fade;
          if (lum < 0.06) continue;
          const ch = lum > 0.42 ? '#' : lum > 0.26 ? '=' : lum > 0.14 ? '-' : ':';
          g.put(c, r, 3, lum, g.rgb[i * 3], g.rgb[i * 3 + 1], g.rgb[i * 3 + 2], code(ch));
        }
      }

      g.text(1, 1, `shells ${launched}`, 0.6, 255, 214, 110);
      g.text(1, 2, `sparks ${sparks.length.toLocaleString('en-US')}`, 0.5, 140, 150, 175);
    },
  };
}
