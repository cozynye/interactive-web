import { code, dome, Grid, hash, Scene, smooth } from './grid';
import { Palette, relief, Spot } from './relief';

// 색은 털의 호박색, 귤의 주황, 유자의 노랑에 물의 푸른 회색만 쓴다. 덩어리마다 그늘, 중간, 빛 받는 곳의 세 단계다.
const FUR: Palette = [
  [104, 60, 28],
  [214, 146, 74],
  [255, 222, 164],
];
const ORANGE: Palette = [
  [168, 66, 12],
  [255, 140, 40],
  [255, 224, 150],
];
const YUZU: Palette = [
  [170, 122, 20],
  [255, 210, 76],
  [255, 246, 190],
];
const DARK = [70, 40, 20];
const LEAF = [104, 178, 96];
const WATER = [120, 150, 204];
const IVORY = [255, 244, 224];

// 처음 한 번 펼쳐지는 순서(초): 물이 깔리고, 카피바라가 코끝부터 그려지고, 귤이 머리에 얹히고, 유자가 하나씩 떨어진다
const DRAW = [0.8, 4];
const FIRST_ORANGE = 4.6;
const YUZU_AT = 6.4;
const STEAM_AT = 6;
const SNOW_AT = 8.5;
// 귤이 쌓였다가 떨어지는 한 주기(초). 9초마다 하나씩 셋까지 쌓이고, 다 쌓이면 고개를 조금씩 흔들기 시작해서 위의 귤부터 하나씩 굴러떨어진 뒤 쉰다.
const CYCLE = 34;
const EVERY = 9;
const FALL = 1;
const WOBBLE = 21;
// 귤마다 굴러떨어지는 시각. 아래에서 k번째 귤이 DROPS[k]에 떨어진다.
const DROPS = [27, 25.8, 24.5];

// 유자가 떠 있는 자리 (x, 물 아래로 내려간 줄 수)
const YUZUS = [
  [-27, 1.4],
  [-21, 4.2],
  [-14, 6],
  [-3, 7],
  [9, 5.6],
  [19, 2.6],
  [25, 5],
];

// 지금 머리에 얹힌 귤의 수 (떨어지는 중인 것은 뺀다)
export function orangesOn(t: number) {
  if (t < FIRST_ORANGE + FALL) return 0;
  const u = (t - FIRST_ORANGE) % CYCLE;
  let n = 0;
  for (let k = 0; k < 3; k++) if (u >= k * EVERY + FALL && u < DROPS[k]) n++;
  return n;
}

// 고개가 좌우로 흔들리는 정도. 조금씩 커지다가 마지막 귤이 떨어지면 잦아든다.
function swayAt(u: number) {
  if (u < WOBBLE) return 0;
  return smooth((u - WOBBLE) / 3.5) * (1 - smooth((u - DROPS[0]) / 1.5)) * Math.sin((u - WOBBLE) * 2.7);
}

// 가로와 세로 반지름이 다른 둥근 네모. pow가 클수록 모서리가 각진다.
const box = (x: number, y: number, rx: number, ry: number, pow: number) => Math.pow(Math.abs(x / rx), pow) + Math.pow(Math.abs(y / ry), pow);

// 유자탕에 앉은 카피바라. 머리에 귤이 하나씩 쌓이고, 다 쌓이면 고개를 흔들어 하나씩 떨어뜨린다.
// 처음에는 코끝에서 엉덩이 쪽으로 몸이 그려지고, 귤과 유자가 차례로 떨어진다.
export function createCapybara(): Scene {
  let letters = 0;

  return {
    cell: 5,
    frame(g: Grid, t: number) {
      const { cols, rows, aspect } = g;
      const s = Math.min(rows / 46, cols / (aspect * 66));
      const ax = s * aspect;
      const ox = cols / 2 + 3 * ax;
      const water = Math.round(rows * 0.62);
      const spot: Spot = { g, ox, oy: water, s };
      // 숨을 쉬며 아주 조금 오르내린다
      const bob = Math.sin(t * 0.8) * 0.25;
      const breath = 1 + 0.02 * Math.sin(t * 1.3);

      const u = t < FIRST_ORANGE ? -1 : (t - FIRST_ORANGE) % CYCLE;
      // 귤이 다 쌓이면 고개가 좌우로 흔들린다
      const hx = swayAt(u) * 0.9;
      // 귤이 얹힐 때마다 고개가 눌렸다 돌아온다
      let nod = 0;
      for (let k = 0; k < 3; k++) {
        const since = u - k * EVERY - FALL;
        if (u >= 0 && since > 0 && since < 2) nod += Math.exp(-since * 5) * Math.cos(since * 14) * 0.6;
      }
      const hy = -9.4 + bob + nod - Math.abs(hx) * 0.3;
      const twitch = (t / 6.1) % 1 < 0.04 ? 0.5 : 0;

      // 몸의 높이: 등, 어깨, 머리, 뭉툭한 주둥이, 귀를 겹친다. 물 아래는 보이지 않는다.
      const bodyAt = (x: number, y: number) =>
        y > 0.3
          ? 0
          : Math.max(
              7 * dome(box(x - 6, y + 2 - bob, 13.5, 8.6 * breath, 2.4)),
              6.4 * dome(box(x + 5.5 - hx * 0.35, y + 4.6 - bob, 7.6, 6.6, 2)),
              5.6 * dome(box(x + 11 - hx, y - hy, 6.8, 4.7, 2.6)),
              5.2 * dome(box(x + 15.4 - hx, y - hy - 1, 3.7, 3.7, 3)),
              3 * dome(box(x + 6.2 - twitch - hx, y - hy + 4.7, 1.6, 1.5, 2))
            );

      // 몸이 코끝(왼쪽)에서 엉덩이 쪽으로 그려진다
      const sweep = -20 + ((t - DRAW[0]) / (DRAW[1] - DRAW[0])) * 41;
      const shown = (x: number) => smooth((sweep - x) / 1.5);

      // 물: 가운데에서 양옆으로 깔리고, 잔물결이 지나간다
      const spread = t * cols * 0.5;
      for (let r = water; r < rows; r++) {
        const depth = (r - water) / (rows - water);
        for (let c = 0; c < cols; c++) {
          if (Math.abs(c - cols / 2) > spread) continue;
          const x = (c - ox) / ax;
          const y = (r - water) / s;
          // 몸 둘레에서 퍼져 나가는 물결
          const ring = Math.hypot((x - 2) / 17, y / 3.2);
          const wake = Math.pow(0.5 + 0.5 * Math.sin(ring * 9 - t * 1.6), 6) * Math.max(0, 1.6 - ring) * smooth((t - DRAW[1]) / 2);
          const wave = Math.sin(c * 0.21 + r * 1.3 + t * 1.1) + Math.sin(c * 0.07 - t * 0.6 + r);
          // 물에 비친 몸은 잔물결에 끊겨 보인다
          if (sweep > x && bodyAt(x + Math.sin(r * 1.7 + t * 1.3) * 0.5, -y * 1.5) > 0 && hash(c, r + Math.floor(t * 2)) > 0.4) {
            g.put(c, r, 8, 0.32 * (1 - depth), FUR[1][0], FUR[1][1], FUR[1][2], code(wave > 0 ? '=' : '-'));
            continue;
          }
          if (wave < -0.2 && wake < 0.2) continue;
          g.put(c, r, 8, (0.1 + 0.1 * (wave > 0.6 ? 1 : 0) + 0.5 * wake) * (1 - depth * 0.6), WATER[0], WATER[1], WATER[2], code(wake > 0.3 || wave > 0.6 ? '~' : '-'));
        }
      }

      relief(spot, [-20, -16, 21, 0.3], bodyAt, { pal: FUR, z: 2, fine: true, show: shown });
      // 얼굴: 눈과 콧구멍, 입은 털보다 어둡게 파서 그린다. 눈은 가끔 감기고, 귤이 얹히거나 굴러떨어질 때도 감긴다.
      const face = (x: number, y: number, ch: string, c = DARK, lum = 0.35) => {
        if (shown(x) > 0.5) g.put(ox + (x + hx) * ax, water + y * s, 1, lum, c[0], c[1], c[2], code(ch));
      };
      const blink = (t / 4.3) % 1 < 0.035 || Math.abs(nod) > 0.15 || DROPS.some((at) => u >= at && u < at + 0.35);
      // 눈: 털을 파낸 자리에 짙은 눈동자를 넣고 그 위에 빛점을 찍는다. 감으면 눈꺼풀 선만 남는다.
      const eye = blink ? ['     ', ' ___ '] : [' @@@ ', " '-' "];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) face(-11.4 + i / ax, hy - 1.9 + j / s, eye[j][i], FUR[0], 1);
      if (!blink) g.put(ox + (hx - 11.4) * ax + 2, water + (hy - 1.9) * s, 0.9, shown(-10.9), IVORY[0], IVORY[1], IVORY[2], code('o'));
      face(-18.2, hy - 0.4, ' ');
      for (let x = -18.4; x < -14.6; x += 1 / ax) face(x, hy + 3.3 + (x + 18.4) * 0.12, '_');
      face(-5.9 + twitch, hy - 4.6, ':');
      // 몸이 물에 닿는 자리의 물띠
      for (let x = -19; x < 20; x += 1 / ax)
        if (bodyAt(x, 0.2) > 0 && shown(x) > 0.5 && hash(Math.round(x * ax), Math.floor(t * 3)) > 0.35)
          g.put(ox + x * ax, water + 1, 1, 0.75, IVORY[0], IVORY[1], IVORY[2], code('~'));
      // 그려지는 끝을 따라 불티가 인다
      if (sweep > -20 && sweep < 21)
        for (let y = -16; y < 0; y += 0.5)
          if (bodyAt(sweep, y) > 0 && hash(y, Math.floor(t * 20)) > 0.4)
            g.add(ox + sweep * ax, water + y * s, 0.9, IVORY[0], IVORY[1], IVORY[2], code('*'));

      // 귤: 불티로 시작해 떨어지면서 부풀고, 머리에 닿으면 한 번 찌그러졌다 돌아온다
      const R = 2.3;
      for (let k = 0; k < 3 && u >= 0; k++) {
        const since = u - k * EVERY;
        if (since < 0) continue;
        const rest = hy - 4.6 - R * 0.85 - k * R * 1.75;
        // 흔들릴 때 위에 얹힌 귤일수록 한 박자 늦게, 더 크게 쏠린다
        const lean = (v: number) => swayAt(v) * 0.9 + swayAt(v - 0.2) * 0.6 * (k + 1);
        let x = -11 + (k % 2 ? 0.5 : -0.3) + lean(Math.min(u, DROPS[k]));
        let y = rest;
        let size = 1;
        let squash = 0;
        if (since < FALL) {
          const p = since / FALL;
          y = -40 + (rest + 40) * p * p;
          size = 0.08 + 0.92 * smooth(p * 1.3);
        } else if (u < DROPS[k]) {
          squash = Math.exp(-(since - FALL) * 6) * Math.cos((since - FALL) * 18) * 0.22;
        } else {
          // 쏠려 있던 쪽으로 굴러떨어져 물에 빠진다
          const q = u - DROPS[k];
          x += (lean(DROPS[k]) < 0 ? -1 : 1) * (3 * q + 7 * q * q);
          y = rest - 3 * q + 24 * q * q;
          if (y > 1) {
            // 빠진 자리에 물이 튄다
            const since2 = q - (3 + Math.sqrt(9 + 96 * (1 - rest))) / 48;
            if (since2 < 0.7)
              for (let i = -3; i <= 3; i++)
                g.add(ox + (x + i * (0.6 + since2 * 3)) * ax, water - (1.5 - Math.abs(i) * 0.4) * Math.sin(Math.min(1, since2 / 0.7) * Math.PI) * 3 * s, 0.8 * (1 - since2 / 0.7), IVORY[0], IVORY[1], IVORY[2], code("'"));
            continue;
          }
        }
        const rx = R * size * (1 + squash);
        const ry = R * size * (1 - squash);
        relief(spot, [x - rx, y - ry, x + rx, y + ry], (px, py) => R * dome(box(px - x, py - y, rx, ry, 2)), { pal: ORANGE, z: 0.8 - k * 0.1 });
        if (size > 0.9) {
          g.put(ox + x * ax, water + (y - ry) * s - 1, 0.5, 0.9, LEAF[0], LEAF[1], LEAF[2], code('v'));
        } else g.rays(ox + x * ax, water + y * s, 2, ORANGE[1][0], ORANGE[1][1], ORANGE[1][2]);
      }

      // 유자: 하나씩 떨어져 물에 반쯤 잠긴 채 떠다닌다
      let floating = 0;
      YUZUS.forEach(([x0, y0], i) => {
        const since = t - YUZU_AT - i * 0.45;
        if (since < 0) return;
        const p = Math.min(1, since / 0.6);
        const x = x0 + Math.sin(t * 0.23 + i * 2) * 0.8;
        const y = p < 1 ? -34 + (y0 + 34) * p * p : y0 + Math.sin(t * 1.1 + i * 1.7) * 0.22 + Math.exp(-(since - 0.6) * 3) * Math.sin((since - 0.6) * 12) * 0.8;
        if (p >= 1) floating++;
        // 떠 있는 유자는 아래쪽이 물에 잠겨 보이지 않는다
        const line = p < 1 ? Infinity : y0 + 0.75;
        relief(spot, [x - 1.8, y - 1.7, x + 1.8, y + 1.7], (px, py) => (py > line ? 0 : 1.7 * dome(box(px - x, py - y, 1.8, 1.6, 2))), { pal: YUZU, z: 0.6 - y0 * 0.01 });
        g.put(ox + (x + 0.2) * ax, water + (y - 1.6) * s - 1, 0.4, 0.85, LEAF[0], LEAF[1], LEAF[2], code('`'));
        if (p < 1) return;
        // 떨어진 직후의 물보라와 둘레의 잔물결
        const wet = Math.exp(-(since - 0.6) * 2.5);
        for (const side of [-1, 1]) {
          g.put(ox + (x + side * (2.4 + wet * 2)) * ax, water + (y0 + 0.9) * s, 0.4, 0.3 + wet * 0.6, WATER[0], WATER[1], WATER[2], code('~'));
          if (wet > 0.15) g.add(ox + (x + side * (1 + (1 - wet) * 3)) * ax, water + (y0 - wet * 3) * s, wet, IVORY[0], IVORY[1], IVORY[2], code("'"));
        }
      });

      // 김: 물 위에서 구불구불 올라가다 사라진다
      const steam = smooth((t - STEAM_AT) / 3);
      for (let i = 0; i < 46 && steam > 0; i++) {
        const p = (t * (0.05 + hash(i, 2) * 0.05) + hash(i, 1)) % 1;
        const x = (hash(i, 3) - 0.5) * 62 + Math.sin(p * 7 + i) * 1.6;
        g.add(ox + x * ax, water - p * 22 * s, 0.3 * Math.sin(p * Math.PI) * steam, IVORY[0], IVORY[1], IVORY[2], code("(~)'"[i % 4]));
      }

      // 눈
      const snow = smooth((t - SNOW_AT) / 4);
      let flakes = 0;
      for (let i = 0; i < 260 && snow > 0; i++) {
        const y = ((hash(i, 5) + t * (0.03 + hash(i, 6) * 0.04)) % 1) * water;
        const x = (hash(i, 7) * cols + Math.sin(t * 0.5 + i) * 2 + t * 1.2) % cols;
        flakes++;
        g.add(x, y, (0.16 + 0.3 * hash(i, 8)) * snow, 214, 224, 255, code(hash(i, 9) > 0.8 ? '*' : '.'));
      }

      g.text(1, 1, 'capybara · yuzu bath', 0.5, 140, 150, 175);
      g.text(1, 2, `oranges ${orangesOn(t)}   yuzu ${floating}   snow ${flakes}`, 0.6, ORANGE[1][0], ORANGE[1][1], ORANGE[1][2]);
      g.text(1, 3, `letters ${letters.toLocaleString('en-US')}`, 0.5, 140, 150, 175);
      letters = 0;
      for (let i = 0; i < g.lum.length; i++) if (g.lum[i] > 0) letters++;
    },
  };
}
