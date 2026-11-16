import { code, Grid, rng, Scene, smooth } from './grid';

const PI = Math.PI;
const TAU = PI * 2;
const CAM = 3.4;
// 한 번 피고 지는 길이(초)와 그 안의 단계: 자람 → 핌 → 활짝 → 사라짐
const LOOP = 28;
const GROW = 2.6;
const BLOOM_AT = 2.4;
const BLOOM = 8;
const FADE = 1.4;

type Phase = 'grow' | 'bloom' | 'full' | 'fade';
export function rosePhase(tt: number): Phase {
  if (tt > LOOP - FADE) return 'fade';
  if (tt < BLOOM_AT) return 'grow';
  return tt < BLOOM_AT + BLOOM ? 'bloom' : 'full';
}
// 꽃잎 곡면을 나누는 칸 수 (감기는 방향 × 꽃잎 폭)
const NT = 720;
const NX = 40;
const GROUND = -0.86;
const HEAD = 0.14;
const TILT = 0.5;

// 줄기는 살짝 휜다
const stemX = (s: number) => 0.07 * Math.sin(s * 2.6);

// 줄기가 자라고 봉오리가 벌어지는 장미. 꽃잎은 하나의 나선 곡면이다.
export function createRose(): Scene {
  const rand = rng(21);
  const dust = Array.from({ length: 170 }, () => ({
    a: rand() * TAU,
    r: 0.25 + rand() * 0.55,
    y: rand() * 0.9 - 0.15,
    ph: rand() * TAU,
    ch: code('+.*.'[Math.floor(rand() * 4)]),
  }));
  const mesh = new Float32Array(NT * (NX + 1) * 3);
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);

  return {
    frame(g: Grid, t: number) {
      const { cols, rows, unit: u, aspect } = g;
      const cx = cols / 2;
      const cy = rows / 2;
      const tt = t % LOOP;
      const grow = smooth(tt / GROW);
      const bloom = smooth((tt - BLOOM_AT) / BLOOM);
      const fade = smooth((LOOP - tt) / FADE);
      const sway = 0.02 * Math.sin(t * 0.8);
      const plot = (x: number, y: number, z: number, lum: number, r: number, gr: number, b: number, ch = 0) => {
        const f = CAM / (CAM + z);
        const lean = sway * (y - GROUND);
        g.put(cx + (x + lean) * u * f * aspect, cy - y * u * f, z, lum * fade, r, gr, b, ch);
      };

      // 줄기: 땅에서부터 자란다
      for (let i = 0; i < 320; i++) {
        const s = i / 320;
        if (s > grow) break;
        const y = GROUND + s * (HEAD - GROUND);
        plot(stemX(s), y, 0, 0.5 + 0.2 * Math.sin(s * 30), 62, 190, 92, code('|'));
        plot(stemX(s) + 0.012, y, 0.01, 0.34, 40, 150, 70, code(':'));
      }
      // 잎 두 장: 가운데 잎맥이 밝다
      [[0.34, -1], [0.58, 1]].forEach(([at, side], k) => {
        const open = smooth((tt - 1.1 - k * 0.5) / 1.3);
        for (let i = 0; i < 60; i++) {
          const a = i / 60;
          if (a > open) break;
          const w = 0.085 * Math.pow(Math.sin(PI * a), 0.8);
          for (let j = -10; j <= 10; j++) {
            const b = j / 10;
            plot(
              stemX(at) + side * a * 0.32,
              GROUND + at * (HEAD - GROUND) + a * 0.22 - a * a * 0.1 + b * w,
              -0.02 + Math.abs(b) * 0.03,
              0.34 + 0.4 * (1 - Math.abs(b)),
              52,
              180,
              84
            );
          }
        }
      });

      if (grow > 0.98) {
        const spin = t * 0.32;
        const size = 0.5 * (0.68 + 0.32 * bloom);
        const hx = stemX(1);
        // 곡면의 점을 먼저 다 구해 두고, 이웃 점과의 차이로 면이 향한 방향을 얻는다
        for (let i = 0; i < NT; i++) {
          const th = (i / NT) * 20 * PI + 4 * PI;
          // 봉오리일 때는 꽃잎이 서 있고, 필수록 바깥으로 눕는다
          const p = (PI / 2) * Math.exp(-th / (8 * PI)) * (0.26 + 0.74 * bloom);
          const sp = Math.sin(p);
          const cp = Math.cos(p);
          // 꽃잎 끝의 굴곡 (한 바퀴에 3.6장)
          const cut = 1 - ((3.6 * th) % TAU) / PI;
          const edge = 1 - Math.pow(cut, 4) / 2 + Math.sin(15 * th) / 150;
          const ca = Math.cos(th + spin);
          const sa = Math.sin(th + spin);
          for (let j = 0; j <= NX; j++) {
            const x = j / NX;
            const curl = 2 * (x * x - x) * (x * x - x) * sp;
            const r = edge * (x * sp + curl * cp) * size;
            const h = edge * (x * cp - curl * sp) * size;
            // 꽃 안쪽이 보이게 앞으로 기울인다
            const lz = r * sa;
            const o = (i * (NX + 1) + j) * 3;
            mesh[o] = r * ca;
            mesh[o + 1] = h * ct + lz * st;
            mesh[o + 2] = -h * st + lz * ct;
          }
        }
        for (let i = 0; i < NT - 1; i++) {
          const heart = i / NT;
          for (let j = 1; j <= NX; j++) {
            const o = (i * (NX + 1) + j) * 3;
            const a = o - 3;
            const b = o + (NX + 1) * 3;
            const ux = mesh[o] - mesh[a];
            const uy = mesh[o + 1] - mesh[a + 1];
            const uz = mesh[o + 2] - mesh[a + 2];
            const vx = mesh[b] - mesh[o];
            const vy = mesh[b + 1] - mesh[o + 1];
            const vz = mesh[b + 2] - mesh[o + 2];
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;
            const len = Math.hypot(nx, ny, nz) || 1;
            // 위·앞에서 오는 빛. 꽃잎은 얇아서 앞뒤 구분 없이 받는다.
            const lit = Math.abs(nx * 0.3 + ny * 0.72 - nz * 0.62) / len;
            const rim = j === NX;
            const lum = rim
              ? 0.9 - 0.3 * heart
              : (0.14 + 0.8 * Math.pow(lit, 1.3)) * (1 - 0.3 * heart);
            const tip = rim ? 1 : lum * lum;
            plot(hx + mesh[o], HEAD + mesh[o + 1], mesh[o + 2], lum, 170 + 85 * tip, 14 + 136 * tip, 40 + 130 * tip, rim ? code('*') : 0);
          }
        }
      }

      // 꽃 둘레에 떠다니는 반짝이
      for (const d of dust) {
        const tw = Math.pow(Math.max(0, Math.sin(t * 1.7 + d.ph)), 3) * bloom;
        if (tw < 0.05) continue;
        const a = d.a + t * 0.1;
        plot(Math.cos(a) * d.r, HEAD + d.y + 0.04 * Math.sin(t * 0.5 + d.ph), Math.sin(a) * d.r, 0.85 * tw, 255, 222, 232, d.ch);
      }

      g.text(1, 1, `${rosePhase(tt)} ${Math.round(bloom * 100)}%`, 0.6 * fade, 255, 120, 150);
    },
  };
}
