import { code, Grid, hash, rng, Scene, smooth } from './grid';

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
// 꽃잎 곡면을 나누는 칸 수 (감기는 방향 × 꽃잎 폭). 칸 사이가 비면 윤곽선이 잘못 그어지므로 넉넉히 둔다.
const NT = 1300;
const NX = 44;
const GROUND = -0.86;
const HEAD = 0.14;
const TILT = 0.5;
// 몸통 조각 번호: 줄기, 잎 두 장, 그 뒤로 꽃잎 한 장마다 하나씩
const STEM = 1;
const LEAF = 2;
const PETAL = 10;
// 빛: 위·앞에서 오는 주광과, 주광과 시선의 중간 방향(반짝임이 맺히는 쪽)
const KEY = [0.3, 0.72, -0.62];
const HALF = [0.167, 0.4, -0.9];
const GREEN = [70, 206, 100];
const WHITE = [255, 244, 248];
// 이슬이 맺히기 시작하는 때(주기 안의 초), 매달려 있는 시간, 떨어지는 가속도
const DROP_AT = [13, 15.6, 18.3, 21.2];
const HANG = 1.4;
const FALL = 1.7;
const DROP = [196, 224, 255];

// 줄기는 살짝 휜다
const stemX = (s: number) => 0.07 * Math.sin(s * 2.6);

// 줄기가 자라고 봉오리가 벌어지는 장미. 꽃잎은 하나의 나선 곡면이고,
// 꽃잎마다 조각 번호가 달라서 겹치는 자리에 윤곽선이 생긴다.
export function createRose(): Scene {
  const rand = rng(21);
  const dust = Array.from({ length: 170 }, () => ({
    a: rand() * TAU,
    r: 0.25 + rand() * 0.55,
    y: rand() * 0.9 - 0.15,
    ph: rand() * TAU,
    ch: code('+.*.'[Math.floor(rand() * 4)]),
  }));
  // 바깥 꽃잎에 맺힌 이슬 (곡면 위의 자리와 반짝이는 박자)
  const dew = Array.from({ length: 40 }, () => ({
    i: Math.floor(rand() * NT * 0.5),
    j: Math.floor(NX * (0.45 + rand() * 0.5)),
    ph: rand() * 30,
    f: 2.2 + rand() * 1.6,
  }));
  const mesh = new Float32Array(NT * (NX + 1) * 3);
  // 떨어지는 이슬: 매달린 곡면 위의 자리(at)와 떨어지기 시작한 위치
  const drops = DROP_AT.map(() => ({ at: -1, x: 0, y: 0, z: 0 }));
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);

  return {
    frame(g: Grid, t: number) {
      const { cols, rows, unit: u, aspect } = g;
      g.gap = 0.012;
      const cx = cols / 2;
      const cy = rows / 2;
      const tt = t % LOOP;
      const grow = smooth(tt / GROW);
      const bloom = smooth((tt - BLOOM_AT) / BLOOM);
      const fade = smooth((LOOP - tt) / FADE);
      // 사라지는 동안에는 몸통 처리를 끄고 밝기 그대로 어두워지게 둔다
      const solid = fade > 0.999;
      const sway = 0.02 * Math.sin(t * 0.8) + 0.008 * Math.sin(t * 0.31 + 1);
      const sx = (x: number, y: number, z: number) => cx + (x + sway * (y - GROUND)) * u * (CAM / (CAM + z)) * aspect;
      const sy = (y: number, z: number) => cy - y * u * (CAM / (CAM + z));
      const plot = (x: number, y: number, z: number, lum: number, c: number[], ch = 0, part = 0) =>
        g.put(sx(x, y, z), sy(y, z), z, lum * fade, c[0], c[1], c[2], ch, solid ? part : 0);

      // 줄기: 땅에서부터 자라고, 자라는 끝에서 빛이 난다
      for (let i = 0; i < 360; i++) {
        const s = i / 360;
        if (s > grow) break;
        const y = GROUND + s * (HEAD - GROUND);
        for (let k = -1; k <= 1; k++) plot(stemX(s) + k * 0.011, y, Math.abs(k) * 0.01, 0.5 - 0.14 * k, GREEN, 0, STEM);
      }
      if (grow < 0.995 && grow > 0.01) {
        const y = GROUND + grow * (HEAD - GROUND);
        g.rays(sx(stemX(grow), y, -0.02), sy(y, -0.02), 3 + Math.round(2 * Math.sin(t * 9)), WHITE[0], WHITE[1], WHITE[2]);
        // 끝에서 튀어 떨어지는 불티
        for (let k = 0; k < 46; k++) {
          const born = (k / 46) * GROW;
          const age = tt - born;
          if (age < 0 || age > 0.9) continue;
          const s0 = smooth(born / GROW);
          const vx = (((k * 37) % 17) / 17 - 0.5) * 0.7;
          const py = GROUND + s0 * (HEAD - GROUND) + 0.35 * age - 1.3 * age * age;
          if (py < GROUND) continue;
          plot(stemX(s0) + vx * age, py, -0.03, 1 - age / 0.9, [255, 214, 150], code(age < 0.3 ? '*' : age < 0.6 ? '+' : '.'));
        }
      }
      // 잎 두 장: 가운데 잎맥이 밝다
      [[0.34, -1], [0.58, 1]].forEach(([at, side], k) => {
        const open = smooth((tt - 1.1 - k * 0.5) / 1.3);
        for (let i = 0; i < 90; i++) {
          const a = i / 90;
          if (a > open) break;
          const w = 0.085 * Math.pow(Math.sin(PI * a), 0.8);
          for (let j = -12; j <= 12; j++) {
            const b = j / 12;
            plot(
              stemX(at) + side * a * 0.32,
              GROUND + at * (HEAD - GROUND) + a * 0.22 - a * a * 0.1 + b * w,
              -0.02 + Math.abs(b) * 0.03,
              0.3 + 0.5 * (1 - Math.abs(b)),
              GREEN,
              0,
              LEAF + k
            );
          }
        }
      });

      if (grow > 0.98) {
        const spin = t * 0.32;
        const size = 0.5 * (0.68 + 0.32 * bloom);
        const hx = stemX(1);
        // 꽃 둘레를 천천히 도는 보조광
        const rx = Math.cos(t * 0.5);
        const rz = Math.sin(t * 0.5);
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
          const petal = PETAL + Math.floor((3.6 * ((i / NT) * 20 * PI + 4 * PI)) / TAU);
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
            // 꽃잎은 얇아서 앞뒤 구분 없이 빛을 받는다
            const lit = Math.abs(nx * KEY[0] + ny * KEY[1] + nz * KEY[2]) / len;
            const spec = Math.pow(Math.abs(nx * HALF[0] + ny * HALF[1] + nz * HALF[2]) / len, 22);
            const rim = Math.pow(Math.abs(nx * rx + nz * rz) / len, 8);
            // 꽃 한가운데는 조금 어둡게 해서 깊이를 준다
            const lum = (0.3 + 0.6 * lit + 0.45 * spec + 0.25 * rim) * (1 - 0.26 * heart);
            const tip = Math.min(1, lum * lum + spec);
            // 점이 수만 개라 plot을 거치지 않고 바로 찍는다
            const py = HEAD + mesh[o + 1];
            const pz = mesh[o + 2];
            const f = (CAM / (CAM + pz)) * u;
            g.put(cx + (hx + mesh[o] + sway * (py - GROUND)) * f * aspect, cy - py * f, pz, lum * fade, 255, 34 + 110 * tip, 64 + 100 * tip, 0, solid ? petal : 0);
          }
        }
        // 이슬: 다 핀 뒤에 반짝이고, 가장 밝은 순간에는 빛살이 뻗는다
        if (bloom > 0.85 && solid)
          for (const d of dew) {
            const tw = Math.pow(Math.max(0, Math.sin(t * d.f + d.ph)), 8);
            if (tw < 0.4) continue;
            const o = (d.i * (NX + 1) + d.j) * 3;
            const x = hx + mesh[o];
            const y = HEAD + mesh[o + 1];
            const z = mesh[o + 2] - 0.004;
            const px = Math.round(sx(x, y, z));
            const py = Math.round(sy(y, z));
            // 다른 꽃잎에 가려진 이슬은 그리지 않는다
            if (px < 0 || px >= cols || py < 0 || py >= rows || g.z[py * cols + px] < z - 0.01) continue;
            if (tw > 0.9) g.rays(px, py, 2 + Math.round(3 * tw), WHITE[0], WHITE[1], WHITE[2]);
            else plot(x, y, z, 0.6 + 0.5 * tw, WHITE, code('*'));
          }
      }

      if (tt < 1) for (const d of drops) d.at = -1;
      if (grow > 0.98 && solid)
        DROP_AT.forEach((t0, k) => {
          const tau = tt - t0;
          if (tau < 0) return;
          const d = drops[k];
          if (d.at < 0) {
            // 지금 가장 낮게 늘어진 이슬 자리 가운데 하나를 고른다
            const low = [...dew].sort((a, b) => mesh[(a.i * (NX + 1) + a.j) * 3 + 1] - mesh[(b.i * (NX + 1) + b.j) * 3 + 1])[k];
            d.at = (low.i * (NX + 1) + low.j) * 3;
          }
          if (tau < HANG) {
            // 꽃잎 끝에 매달려 점점 커진다
            d.x = stemX(1) + mesh[d.at];
            d.y = HEAD + mesh[d.at + 1] - 0.012;
            d.z = mesh[d.at + 2] - 0.02;
            const big = tau / HANG;
            plot(d.x, d.y, d.z, 0.8 + 0.5 * big, DROP, code(big > 0.5 ? '0' : 'o'));
            if (big > 0.6) plot(d.x, d.y - 0.03, d.z, 0.7, DROP, code('.'));
            return;
          }
          const fall = tau - HANG;
          const y = d.y - 0.5 * FALL * fall * fall;
          if (y > GROUND + 0.02) {
            // 떨어지는 동안에는 위로 꼬리가 남는다
            for (let j = 0; j < 4; j++) plot(d.x, y + j * 0.025 * Math.min(FALL * fall, 1.2), d.z, 1.2 - 0.28 * j, DROP, code(j ? '|' : '*'));
            return;
          }
          const w = fall - Math.sqrt((2 * (d.y - GROUND)) / FALL);
          if (w > 0.7) return;
          // 바닥에 닿으면 여덟 갈래로 튄다
          if (w < 0.12) g.rays(sx(d.x, GROUND, d.z), sy(GROUND, d.z), 3, DROP[0], DROP[1], DROP[2]);
          for (let j = 0; j < 8; j++) {
            const a = j * 0.785 + k;
            const sp = 0.25 + 0.35 * hash(j, k);
            const py = GROUND + 0.02 + 0.9 * sp * w - 0.5 * FALL * w * w;
            if (py >= GROUND) plot(d.x + Math.cos(a) * sp * w, py, d.z + Math.sin(a) * sp * w * 0.5, 0.9 * (1 - w / 0.7), DROP, code('.'));
          }
        });

      // 꽃 둘레에 떠다니는 반짝이
      for (const d of dust) {
        const tw = Math.pow(Math.max(0, Math.sin(t * 1.7 + d.ph)), 3) * bloom;
        if (tw < 0.05) continue;
        const a = d.a + t * 0.1;
        plot(Math.cos(a) * d.r, HEAD + d.y + 0.04 * Math.sin(t * 0.5 + d.ph), Math.sin(a) * d.r, 0.85 * tw, [255, 222, 232], d.ch);
      }

      g.text(1, 1, `${rosePhase(tt)} ${Math.round(bloom * 100)}%`, 0.6 * fade, 255, 120, 150);
    },
  };
}
