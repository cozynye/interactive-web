import { code, Grid, hash, Scene, smooth } from './grid';
import { ZED_DATA, ZED_EYES, ZED_FOOT, ZED_H, ZED_W } from './zedSprite';

// 한 편의 길이(초). 끝나면 어두워졌다가 처음부터 다시 돈다.
const LOOP = 18;
// 사건이 일어나는 시각. 실제 교전은 3초 남짓이라 알아볼 수 있게 늘려 놓았다.
const AT = {
  shot1: 1,
  shot2: 1.9,
  ignite: 3,
  ryuR: 3.5,
  fakerR: 3.7,
  appear: 4.5,
  qss: 4.9,
  fakerW: 5.3,
  ryuW: 5.5,
  ryuQ: 5.9,
  swap: 6.1,
  botrk: 6.8,
  fakerQ: 7.3,
  ryuFlash: 7.8,
  fakerFlash: 8.2,
  slash: 8.6,
  kill: 8.8,
  line: 9.8,
  credit: 11.5,
  fade: 16.6,
};

export function zedPhase(t: number) {
  const tt = t % LOOP;
  return tt < AT.ignite ? 'push' : tt < AT.appear ? 'mark' : tt < AT.ryuFlash ? 'trade' : tt < AT.kill ? 'chase' : 'after';
}

const RED = [236, 64, 72];
const STEEL = [150, 176, 230];
const BLUE = [84, 150, 255];
const SHADOW = [128, 100, 200];
const IVORY = [255, 240, 214];
const GOLD = [255, 214, 110];
const GREEN = [130, 226, 160];

// [시각, 가로, 깊이]. 같은 시각이 두 번 나오면 그 자리에서 순간이동한다.
type Key = [number, number, number];
const FAKER: Key[] = [
  [0, 0.05, -0.05],
  [1, 0.18, -0.05],
  [1.9, 0.12, -0.05],
  [3, -0.25, -0.05],
  [AT.fakerR, -0.25, -0.05],
  [AT.fakerR, 0.42, 0],
  [AT.swap, 0.42, 0],
  [AT.swap, 0.1, 0.42],
  [AT.botrk, 0.1, 0.42],
  [AT.ryuFlash, -0.15, 0.15],
  [AT.fakerFlash, -0.2, 0.1],
  [AT.fakerFlash, -0.42, -0.12],
  [LOOP, -0.42, -0.12],
];
const RYU: Key[] = [
  [0, 1.25, 0.1],
  [1.8, 1.25, 0.1],
  [3, 0.25, 0],
  [AT.ryuR, 0.25, 0],
  [AT.ryuR, -0.4, -0.05],
  [7, -0.4, -0.05],
  [AT.ryuFlash, -0.5, -0.1],
  [AT.ryuFlash, -0.72, -0.2],
  [LOOP, -0.74, -0.22],
];
// 남겨 둔 그림자: [가로, 깊이, 생긴 때, 사라지는 때]
const SHADES = [
  [0.25, 0, AT.ryuR, 6.8],
  [-0.25, -0.05, AT.fakerR, 5.6],
  [0.1, 0.42, AT.fakerW + 0.25, AT.swap],
  [0.42, 0, AT.swap, 7.4],
  [0.05, -0.1, AT.ryuW + 0.25, 7.2],
];
// 체력이 바뀌는 때: [시각, 남은 비율]
const FAKER_HP = [
  [0, 0.62],
  [AT.shot1 + 0.35, 0.46],
  [AT.shot2 + 0.35, 0.31],
  [AT.appear, 0.24],
  [AT.botrk + 0.3, 0.27],
];
const RYU_HP = [
  [0, 0.85],
  [AT.appear, 0.74],
  [AT.botrk + 0.3, 0.6],
  [AT.fakerQ + 0.25, 0.4],
  [AT.slash + 0.1, 0.16],
  [AT.kill, 0],
];
const LOG: [number, number, string][] = [
  [AT.shot1 + 0.35, 2, 'turret hits Faker'],
  [AT.ignite, 1, 'Ryu    ignite'],
  [AT.ryuR, 1, 'Ryu    R  death mark'],
  [AT.fakerR, 0, 'Faker  R  death mark'],
  [AT.qss, 0, 'Faker  quicksilver sash'],
  [AT.fakerW, 0, 'Faker  W  living shadow'],
  [AT.ryuQ, 1, 'Ryu    W Q  razor shuriken'],
  [AT.swap, 0, 'Faker  W  swap'],
  [AT.botrk, 0, 'Faker  blade of the ruined king'],
  [AT.ryuFlash, 1, 'Ryu    flash'],
  [AT.fakerFlash, 0, 'Faker  flash'],
  [AT.slash, 0, 'Faker  E  shadow slash'],
];

function where(path: Key[], t: number) {
  let i = 0;
  while (i < path.length - 2 && path[i + 1][0] <= t) i++;
  const a = path[i];
  const b = path[i + 1];
  const k = b[0] > a[0] ? smooth((t - a[0]) / (b[0] - a[0])) : 1;
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function level(steps: number[][], t: number) {
  let v = steps[0][1];
  for (const s of steps) if (s[0] <= t) v = s[1];
  return v;
}

// 칸마다 [빨강, 초록, 파랑, 덮인 정도]가 들어 있는 제드 그림
const PIX = Uint8Array.from(atob(ZED_DATA), (ch) => ch.charCodeAt(0));

// 2013년 결승 5세트의 제드 맞대결을 다시 연출한 장면. 중계 화면을 옮긴 것이 아니고,
// 알려진 순서(표식, 정화, 그림자 바꾸기, 점멸, 마무리)를 따라 위치와 시간을 새로 짰다.
// 제드의 모습은 인게임 모델 그림을 글자 칸으로 줄인 zedSprite.ts에서 가져온다.
export function createZed(): Scene {
  return {
    cell: 5,
    trail: 0.3,
    frame(g: Grid, t: number) {
      const { cols, rows, aspect } = g;
      const tt = t % LOOP;
      const fade = 1 - smooth((tt - AT.fade) / 1.2);
      const solid = fade > 0.999;
      const cx = cols / 2;
      const gy = rows * 0.66;
      // 가로 1이 차지하는 칸 수, 깊이 1이 차지하는 줄 수, 사람 키(줄)
      const span = Math.min(cols * 0.44, g.unit * aspect * 1.6);
      const dv = g.unit * 0.5;
      const s = Math.max(9, Math.min(g.unit * 0.95, (span / aspect) * 0.72));
      const sx = (x: number) => cx + x * span;
      const sy = (d: number) => gy - d * dv;
      const since = (at: number) => tt - at;
      const pulse = (at: number, len: number) => (tt >= at && tt < at + len ? 1 - (tt - at) / len : 0);

      // 선분의 a~b 구간에 빛을 얹는다
      const streak = (x0: number, y0: number, x1: number, y1: number, a: number, b: number, lum: number, c: number[], ch = '') => {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))) + 1;
        const flat = Math.abs(dx) / aspect > 2 * Math.abs(dy);
        const glyph = code(ch || (flat ? '=' : Math.abs(dy) > (2 * Math.abs(dx)) / aspect ? '|' : dx * dy > 0 ? '\\' : '/'));
        for (let i = Math.max(0, Math.floor(a * n)); i <= Math.min(n, b * n); i++)
          g.add(x0 + (dx * i) / n, y0 + (dy * i) / n, lum, c[0], c[1], c[2], glyph);
      };

      // 사람 하나를 그린다. ghost면 윤곽 없는 그림자, alpha가 1보다 작으면 흩어진다.
      const figure = (x: number, d: number, dir: number, c: number[], base: number, o: { white?: number; ghost?: boolean; alpha?: number }) => {
        const X = sx(x);
        const Y = sy(d);
        // 그림 한 칸이 화면에서 차지하는 칸 수
        const k = s / ZED_H;
        const half = Math.ceil(ZED_W * 0.6 * k);
        const alpha = (o.alpha ?? 1) * fade;
        const white = o.white ?? 0;
        for (let r = Math.floor(Y - s); r <= Math.ceil(Y); r++)
          for (let cc = Math.round(X) - half; cc <= Math.round(X) + half; cc++) {
            // dir이 -1이면 좌우를 뒤집는다
            const ix = Math.floor(((cc - X) / k) * dir + ZED_FOOT);
            const iy = Math.floor(ZED_H - 0.5 - (Y - r) / k);
            if (ix < 0 || ix >= ZED_W || iy < 0 || iy >= ZED_H) continue;
            const j = (iy * ZED_W + ix) * 4;
            if (!PIX[j + 3]) continue;
            const eye = ZED_EYES.some((e) => e[0] === ix && e[1] === iy);
            if (o.ghost) {
              const w = hash(cc, r + Math.floor(t * 7));
              if (eye) g.put(cc, r, d + 0.1, 0.9 * alpha, 255, 70, 60, code('='));
              else if (w < 0.5 * alpha + 0.05) g.put(cc, r, d + 0.2, (0.2 + 0.22 * w) * alpha, SHADOW[0], SHADOW[1], SHADOW[2], code(':;%#x'[Math.floor(w * 5)]));
              continue;
            }
            if (alpha < 1 && hash(cc, r) > alpha) continue;
            const a = alpha < 1 ? alpha : 1;
            if (eye) {
              g.put(cc, r, d - 1, 1, 255, 70, 60, code('='));
              continue;
            }
            const pr = PIX[j];
            const pg = PIX[j + 1];
            const pb = PIX[j + 2];
            const L = (0.3 * pr + 0.59 * pg + 0.11 * pb) / 255;
            // 붉은 천, 밝은 쇠(칼날과 갑옷), 어두운 몸으로 나눠 조각 경계에 윤곽이 생기게 한다
            const piece = pr > 1.3 * pg && pr > 1.15 * pb && pr > 34 ? 2 : L > 0.3 ? 1 : 3;
            // 어두운 칸도 색이 보이도록 가장 센 채널을 끌어올린다. 천은 편 색으로 바꾼다.
            const lift = (150 + 105 * L) / Math.max(pr, pg, pb, 1);
            const shade = 0.7 + 0.3 * Math.min(1, pr / 150);
            // 몸은 원본이 거의 검정이라 남보라로 물들인다
            const tr = piece === 2 ? c[0] * shade : piece === 3 ? 96 + 60 * L : Math.min(255, pr * lift);
            const tg = piece === 2 ? c[1] * shade : piece === 3 ? 92 + 60 * L : Math.min(255, pg * lift);
            const tb = piece === 2 ? c[2] * shade : piece === 3 ? 176 + 60 * L : Math.min(255, pb * lift);
            const lum = (piece === 1 ? 0.75 + 0.25 * L : piece === 2 ? 0.7 + 0.8 * L : 0.3 + 1.1 * L) * a;
            g.put(cc, r, d - (3 - piece) * 0.04, lum, tr + (255 - tr) * white, tg + (255 - tg) * white, tb + (255 - tb) * white, 0, solid && a >= 1 ? base + piece : 0);
          }
      };

      // 머리 위 이름과 체력 막대
      const bar = (x: number, d: number, name: string, hp: number, c: number[]) => {
        const w = 11;
        const n = Math.max(hp > 0 ? 1 : 0, Math.round(hp * w));
        const row = Math.round(sy(d) - s * 1.08);
        const col = Math.round(sx(x) - (w + 2) / 2);
        const tone = hp > 0.5 ? GREEN : hp > 0.25 ? GOLD : RED;
        // 얼마 남지 않으면 깜박인다
        const blink = hp < 0.25 && Math.sin(t * 14) > 0 ? 0.55 : 1;
        g.text(col + 1, row - 1, name, 0.8 * fade, c[0], c[1], c[2]);
        g.text(col, row, `[${'#'.repeat(n)}${'.'.repeat(w - n)}]`, 0.9 * blink * fade, tone[0], tone[1], tone[2]);
      };

      // 죽음의 표식: 머리 위에 뜨는 X
      const mark = (x: number, d: number, k: number) => {
        const X = Math.round(sx(x));
        const Y = Math.round(sy(d) - s * 1.08) - 3;
        const lum = (0.7 + 0.3 * Math.sin(t * 12)) * k;
        for (const [dx, dy, ch] of [[-1, -1, '\\'], [1, -1, '/'], [0, 0, 'X'], [-1, 1, '/'], [1, 1, '\\']] as [number, number, string][])
          g.put(X + dx, Y + dy, -50, lum, RED[0], RED[1], RED[2], code(ch));
      };

      // 바닥: 듬성듬성한 점과 길 가장자리
      const lane = smooth(tt / 1.2) * fade;
      for (let r = Math.floor(gy - dv * 0.75); r < Math.min(rows, gy + dv * 0.75); r++)
        for (let c = 0; c < cols; c++) {
          const w = hash(c * 1.9, r * 3.3);
          if (w > 0.955) g.put(c, r, 50, 0.13 * lane, STEEL[0], STEEL[1], STEEL[2], code(w > 0.985 ? ',' : '.'));
        }
      for (const d of [-0.62, 0.72])
        for (let c = 0; c < cols; c++)
          if (hash(c, d * 9) > 0.35) g.put(c, sy(d), 50, 0.16 * lane, STEEL[0], STEEL[1], STEEL[2], code('_'));

      const [fx, fd] = where(FAKER, tt);
      const [rx, rd] = where(RYU, tt);
      const fHp = Math.max(0.08, level(FAKER_HP, tt) - 0.03 * Math.max(0, Math.min(5, since(AT.ignite))));
      const rHp = level(RYU_HP, tt);
      const fHidden = tt >= AT.fakerR && tt < AT.appear;
      const rHidden = tt >= AT.ryuR && tt < AT.appear;
      const dead = smooth(since(AT.kill) / 1.3);
      const chest = 0.55 * s;

      // 포탑: 빛나는 구슬을 얹은 기둥과 사거리 테두리
      const tx = sx(0.86);
      const ty = sy(0.3);
      const th = Math.round(s * 0.95);
      for (let k = 0; k < th; k++) {
        const wide = k < 2 || k > th - 3 ? 2 : 1;
        for (let dx = -wide; dx <= wide; dx++)
          g.put(tx + dx, ty - k, 0.3, (Math.abs(dx) === wide ? 0.5 : 0.28) * lane, STEEL[0], STEEL[1], STEEL[2], code(Math.abs(dx) === wide ? (k < 2 ? '#' : '|') : ':'));
      }
      g.put(tx, ty - th, 0.3, (0.7 + 0.3 * Math.sin(t * 4)) * lane, 190, 220, 255, code('@'));
      const ring = lane * (1 - smooth(since(3) / 1.5));
      if (ring > 0)
        for (let a = 0; a < 6.283; a += 0.05)
          if (Math.floor(a * 20 + t * 4) % 3) g.put(tx + Math.cos(a) * 0.72 * span, ty - Math.sin(a) * 0.72 * dv, 40, 0.3 * ring, 190, 220, 255, code('.'));
      for (const at of [AT.shot1, AT.shot2]) {
        const k = since(at) / 0.35;
        if (k > 0 && k < 1) {
          const [x, d] = where(FAKER, at + 0.35);
          streak(tx, ty - th, sx(x), sy(d) - chest, Math.max(0, k - 0.25), k, 0.9, [190, 220, 255], '*');
        }
        if (pulse(at + 0.35, 0.25)) g.rays(sx(fx), sy(fd) - chest, 4, 190, 220, 255);
      }

      // 남겨 둔 그림자들
      for (const [x, d, from, to] of SHADES) {
        const k = smooth((tt - from) / 0.25) * (1 - smooth((tt - to) / 0.6));
        if (k > 0) figure(x, d, x < 0 ? 1 : -1, SHADOW, 0, { ghost: true, alpha: k });
      }

      // 표식을 찍으러 사라지는 순간: 둘 다 그림자가 되어 서로를 스쳐 지나간다
      for (const [at, from, to, c] of [[AT.ryuR, [0.25, 0], [-0.4, -0.05], STEEL], [AT.fakerR, [-0.25, -0.05], [0.42, 0], RED]] as [number, number[], number[], number[]][]) {
        const k = since(at) / (AT.appear - at);
        if (k <= 0 || k >= 1) continue;
        const head = smooth(k);
        streak(sx(from[0]), sy(from[1]) - chest, sx(to[0]), sy(to[1]) - chest, Math.max(0, head - 0.35), head, 0.8 * fade, SHADOW);
        streak(sx(from[0]), sy(from[1]) - chest, sx(to[0]), sy(to[1]) - chest, Math.max(0, head - 0.06), head, 1, c, '@');
      }
      if (pulse(AT.appear, 0.3)) {
        g.rays(sx(fx), sy(fd) - chest, 5, RED[0], RED[1], RED[2]);
        g.rays(sx(rx), sy(rd) - chest, 5, STEEL[0], STEEL[1], STEEL[2]);
      }

      // 그림자를 던지는 궤적
      for (const [at, x0, d0, x1, d1] of [[AT.fakerW, 0.42, 0, 0.1, 0.42], [AT.ryuW, -0.4, -0.05, 0.05, -0.1]]) {
        const k = since(at) / 0.25;
        if (k > 0 && k < 1.6) streak(sx(x0), sy(d0) - chest, sx(x1), sy(d1) - chest, Math.max(0, k - 0.5), Math.min(1, k), 0.6, SHADOW);
      }

      // 류의 표창 셋: 본체와 그림자 둘에서 페이커가 서 있던 자리로 날아가 그대로 지나친다
      const qk = since(AT.ryuQ) / 0.5;
      if (qk > 0 && qk < 1.25)
        for (const [x, d] of [[-0.4, -0.05], [0.05, -0.1], [0.25, 0]]) {
          const x1 = x + (0.42 - x) * 1.25;
          const d1 = d + (0 - d) * 1.25;
          streak(sx(x), sy(d) - chest, sx(x1), sy(d1) - chest, Math.max(0, qk / 1.25 - 0.2), qk / 1.25, 0.7, STEEL, '-');
          g.put(sx(x + (x1 - x) * (qk / 1.25)), sy(d + (d1 - d) * (qk / 1.25)) - chest, -40, 1, IVORY[0], IVORY[1], IVORY[2], code('+x'[Math.floor(t * 20) % 2]));
        }
      if (pulse(AT.swap + 0.25, 0.9)) g.text(Math.round(sx(0.42)) - 2, Math.round(sy(0) - s * 1.05), 'MISS', 0.8 * pulse(AT.swap + 0.25, 0.9), IVORY[0], IVORY[1], IVORY[2]);
      // 그림자와 자리를 바꾸는 순간
      if (pulse(AT.swap, 0.3)) {
        streak(sx(0.42), sy(0) - chest, sx(0.1), sy(0.42) - chest, 0, 1, 0.7 * pulse(AT.swap, 0.3), SHADOW);
        g.rays(sx(0.1), sy(0.42) - chest, 4, SHADOW[0], SHADOW[1], SHADOW[2]);
      }

      // 몰락한 왕의 검: 류에게서 빠져나온 빛이 페이커에게 흘러든다
      const bk = since(AT.botrk) / 0.6;
      if (bk > 0 && bk < 1)
        for (let i = 0; i < 14; i++) {
          const k = (bk * 1.4 + i / 14) % 1;
          g.add(sx(rx + (fx - rx) * k), sy(rd + (fd - rd) * k) - chest - Math.sin(k * 3.14) * s * 0.25, 0.9, GREEN[0], GREEN[1], GREEN[2], code('o'));
        }
      // 페이커의 표창
      const fq = since(AT.fakerQ) / 0.25;
      if (fq > 0 && fq < 1) {
        const [x0, d0] = where(FAKER, AT.fakerQ);
        streak(sx(x0), sy(d0) - chest, sx(rx), sy(rd) - chest, Math.max(0, fq - 0.3), fq, 0.9, RED, '-');
      }

      // 점멸: 떠난 자리와 닿은 자리에 금빛이 튄다
      for (const [at, path] of [[AT.ryuFlash, RYU], [AT.fakerFlash, FAKER]] as [number, Key[]][]) {
        if (!pulse(at, 0.3)) continue;
        const [x0, d0] = where(path, at - 0.01);
        const [x1, d1] = where(path, at + 0.01);
        g.rays(sx(x0), sy(d0) - chest, 4, GOLD[0], GOLD[1], GOLD[2], pulse(at, 0.3));
        g.rays(sx(x1), sy(d1) - chest, 6, GOLD[0], GOLD[1], GOLD[2]);
      }

      // 두 사람
      const fHit = Math.max(pulse(AT.shot1 + 0.35, 0.2), pulse(AT.shot2 + 0.35, 0.2), pulse(AT.appear, 0.2));
      const rHit = Math.max(pulse(AT.appear, 0.2), pulse(AT.fakerQ + 0.25, 0.2), pulse(AT.slash + 0.1, 0.25), pulse(AT.kill, 0.3));
      const cut = pulse(AT.slash, 0.5);
      if (!fHidden) {
        figure(fx, fd, rx > fx ? 1 : -1, RED, 10, { white: fHit });
        bar(fx, fd, 'Faker', fHp, RED);
        // 점화: 머리 위에서 타는 불
        if (tt >= AT.ignite && tt < AT.ignite + 5) g.put(sx(fx) + 8, sy(fd) - s * 1.08 - 1, -50, 0.9, 255, 150, 70, code('^*'[Math.floor(t * 9) % 2]));
        if (tt >= AT.appear && tt < AT.qss) mark(fx, fd, 1);
      }
      if (!rHidden && dead < 1) {
        figure(rx, rd, fx > rx ? 1 : -1, BLUE, 20, { white: rHit, alpha: 1 - dead });
        if (tt < AT.kill) {
          bar(rx, rd, 'Ryu', rHp, BLUE);
          if (tt >= AT.appear) mark(rx, rd, 1);
        }
      }
      // 쓰러진 자리에서 글자가 흩어져 떨어진다
      if (dead > 0 && dead < 1)
        for (let i = 0; i < 90; i++) {
          const px = sx(rx) + (hash(i, 1) - 0.5) * s * aspect * 0.5 * (1 + dead);
          const py = sy(rd) - hash(i, 2) * s * (1 - dead * dead);
          g.add(px, py, 0.7 * (1 - dead), STEEL[0], STEEL[1], STEEL[2], code('.:;'[i % 3]));
        }

      // 정화: 표식을 지우는 흰 고리
      const qs = since(AT.qss) / 0.45;
      if (qs > 0 && qs < 1)
        for (let a = 0; a < 6.283; a += 0.12)
          g.put(sx(fx) + Math.cos(a) * qs * s * 0.4 * aspect, sy(fd) - chest - Math.sin(a) * qs * s * 0.4, -45, 1 - qs, 255, 255, 255, code('o'));

      // 그림자 베기: 칼날이 그리는 원
      if (cut > 0)
        for (let a = 0; a < 6.283; a += 0.07) {
          const sweep = (a + (1 - cut) * 9) % 6.283;
          if (sweep > 4.2) continue;
          g.put(sx(fx) + Math.cos(a) * s * 0.5 * aspect, sy(fd) - chest - Math.sin(a) * s * 0.4, -45, cut * (0.5 + sweep / 8), IVORY[0], IVORY[1], IVORY[2], code(Math.sin(a) * Math.cos(a) > 0 ? '/' : '\\'));
        }
      // 표식이 터지며 X자로 긋는다
      const pop = pulse(AT.kill, 0.7);
      if (pop > 0) {
        const X = sx(rx);
        const Y = sy(rd) - chest;
        const reach = s * 0.55 * (1.2 - pop * 0.4);
        streak(X - reach * aspect, Y - reach, X + reach * aspect, Y + reach, 0, 1, 1.4 * pop, RED, '\\');
        streak(X + reach * aspect, Y - reach, X - reach * aspect, Y + reach, 0, 1, 1.4 * pop, RED, '/');
        if (pop > 0.5) g.rays(X, Y, 8, 255, 230, 220);
      }

      // 처치 알림과 중계 멘트
      if (tt >= AT.kill + 0.2) {
        const feed = 'Faker  >>  Ryu';
        const col = Math.round(cx - feed.length / 2);
        g.text(col, 2, 'Faker', 0.95 * fade, RED[0], RED[1], RED[2]);
        g.text(col + 7, 2, '>>', 0.8 * fade, GOLD[0], GOLD[1], GOLD[2]);
        g.text(col + 11, 2, 'Ryu', 0.6 * fade, BLUE[0], BLUE[1], BLUE[2]);
      }
      const shout = 'FAKER, WHAT WAS THAT?!'.slice(0, Math.max(0, Math.floor(since(AT.line) * 16)));
      g.text(Math.round(cx - 11), Math.round(rows * 0.16), shout, fade, IVORY[0], IVORY[1], IVORY[2]);
      if (tt >= AT.credit) {
        const note = '2013 champions summer final, game 5';
        g.text(Math.round(cx - note.length / 2), rows - 6, note, 0.45 * smooth(since(AT.credit)) * fade, 140, 150, 175);
      }

      // 왼쪽 위: 방금 쓴 기술들
      const past = LOG.filter((e) => e[0] <= tt).slice(-6);
      past.forEach((e, i) => {
        const c = e[1] === 0 ? RED : e[1] === 1 ? BLUE : [140, 150, 175];
        g.text(1, 1 + i, e[2], (i === past.length - 1 ? 0.9 : 0.4) * fade, c[0], c[1], c[2]);
      });

      if (!solid) for (let i = 0; i < g.lum.length; i++) if (g.z[i] > -Infinity) g.lum[i] *= fade;
    },
  };
}
