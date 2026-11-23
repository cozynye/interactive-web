import { code, Grid, hash, Scene, smooth, tone } from './grid';
import { bakeKnight, BAND, BLADE_X, BH, BW, CLOTH, FACE, LEATHER, MAIL, ROCK, STEEL, X0, X1, Y0, Y1 } from './knightModel';

const TAU = Math.PI * 2;
// 색은 흰 빛 하나와 눈을 가린 띠의 빨강 하나만 쓴다
const IVORY = [244, 240, 232];
const SHADE = [150, 158, 178];
const RED = [232, 40, 44];

// 재질마다 글자 묶음이 다르다(어두운 쪽 → 밝은 쪽). 쇠는 기호, 천은 세로로 선 글자, 사슬은 둥근 글자, 바위는 거친 글자라서 밝기가 같아도 재질이 갈린다.
// 글자는 재질과 형태를 맡고 밝기는 색이 맡는다.
const RAMPS: string[] = [];
RAMPS[CLOTH] = '.,:;!i|1tfLEB';
RAMPS[STEEL] = '.:-=+*%#@';
RAMPS[BAND] = '=+*%#@';
RAMPS[FACE] = '.:;=+ox';
RAMPS[LEATHER] = '.-~=zZ';
RAMPS[ROCK] = '.,:;^?%&';
RAMPS[MAIL] = '.:coO0Q8';
// 사슬은 한 칸 건너 다른 글자를 써서 고리가 엮인 것처럼 보인다
const LINKS = '.:<xX%&#';
// 앞뒤 덩어리의 깊이 차이가 이보다 크면 가장자리로 본다 (모형 단위)
const RIM = 0.06;

// 처음 한 번 펼쳐지는 순서(초): 풀밭이 깔림 → 기사가 위에서 아래로 드러남 → 검에 빛이 흐름 → 바람이 불어 띠가 풀림
const BODY = [1.2, 4.6];
const GLINT_AT = 4.9;
const WIND_AT = 5.6;

export function knightPhase(t: number) {
  return t < BODY[0] ? 'ground' : t < BODY[1] ? 'body' : t < WIND_AT ? 'glint' : 'wind';
}

// 바람 세기(0.4~1.3쯤). 주기가 맞물리지 않는 물결을 섞어서 같은 돌풍이 되풀이되지 않는다.
const gustAt = (t: number) => 0.85 + 0.25 * Math.sin(t * 0.37) + 0.14 * Math.sin(t * 0.91 + 1) + 0.08 * Math.sin(t * 2.3);

interface Ribbon {
  // 뿌리 자리와 길이·반폭(모형 단위)
  x: number;
  y: number;
  len: number;
  width: number;
  amp: number;
  ph: number;
  z: number;
}

// 오른쪽으로 날리는 천 한 가닥. 가운데 선을 물결치는 곡선으로 잡고, 칸마다 가장 가까운 마디를 찾아 길이 방향(a)과 폭 방향(q)으로 음영을 넣는다.
function ribbon(g: Grid, ox: number, oy: number, u: number, rb: Ribbon, t: number, gust: number, grow: number) {
  if (grow <= 0) return;
  const ax = u * g.aspect;
  const N = 26;
  const px = new Float32Array(N + 1);
  const py = new Float32Array(N + 1);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= N; i++) {
    const a = i / N;
    // 바람이 약해지면 끝이 처진다
    const sag = rb.len * a * a * (0.6 - 0.45 * gust);
    const d =
      rb.amp * gust * (Math.pow(a, 1.3) * Math.sin(TAU * (1.4 * a - t * 0.62) + rb.ph) + 0.35 * a * a * Math.sin(TAU * (2.9 * a - t * 1.15) + 1.7 * rb.ph));
    px[i] = rb.x + rb.len * a * grow * (0.9 + 0.08 * gust);
    py[i] = rb.y + sag + d - rb.len * a * 0.1;
    minX = Math.min(minX, px[i]);
    maxX = Math.max(maxX, px[i]);
    minY = Math.min(minY, py[i]);
    maxY = Math.max(maxY, py[i]);
  }
  for (let r = Math.floor(oy + (minY - rb.width) * u); r <= oy + (maxY + rb.width) * u; r++)
    for (let c = Math.floor(ox + (minX - 0.05) * ax); c <= ox + (maxX + 0.05) * ax; c++) {
      const x = (c - ox) / ax;
      const y = (r - oy) / u;
      let best = Infinity;
      let a = 0;
      for (let i = 0; i < N; i++) {
        const vx = px[i + 1] - px[i];
        const vy = py[i + 1] - py[i];
        const k = Math.max(0, Math.min(1, ((x - px[i]) * vx + (y - py[i]) * vy) / (vx * vx + vy * vy || 1)));
        const d = Math.hypot(x - px[i] - vx * k, y - py[i] - vy * k);
        if (d >= best) continue;
        best = d;
        a = (i + k) / N;
      }
      // 꼬이면서 폭이 좁아졌다 넓어지고, 끝으로 갈수록 가늘어진다
      const twist = 0.72 + 0.28 * Math.sin(TAU * (1.7 * a - t * 0.62) + rb.ph + 1);
      const half = rb.width * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 1.2 * a + 0.2))) * twist * (1 - 0.35 * a);
      const e = best / half;
      if (e > 1) continue;
      // 해진 끝은 올이 풀려 듬성듬성하다
      if (a > 0.8 && hash(c, r) < (a - 0.8) * 4.5) continue;
      const crest = 0.5 + 0.5 * Math.cos(TAU * (1.4 * a - t * 0.62) + rb.ph + Math.PI / 2);
      const lum = (0.78 + 0.3 * crest) * (1 - 0.25 * smooth((e - 0.6) / 0.4));
      g.put(c, r, rb.z, lum, 255, RED[1] + 70 * crest * crest, RED[2] + 40 * crest * crest, tone(lum + (hash(c * 3.1, r * 1.7) - 0.5) * 0.2, 46));
    }
}

// 검을 세워 쥐고 앉은 기사. 눈을 가린 붉은 띠와 옷자락이 바람 세기를 따라 날린다.
// 입체 모형을 한 번 구워서 밝기를 글자로 옮기므로 갑옷과 천의 굴곡이 명암으로 보인다.
export function createKnight(): Scene {
  let baked = bakeKnight(0);
  let letters = 0;
  let pick = new Int32Array(0);

  return {
    // 명암이 글자로 읽히려면 칸이 잘아야 한다
    cell: 4,
    trail: 0.3,
    frame(g: Grid, t: number) {
      const { cols, rows, aspect } = g;
      // 모형 단위 1이 차지하는 줄 수: 기사가 화면 높이를 거의 채운다
      const u = Math.min(rows * 0.405, cols / (3.3 * aspect));
      const ax = u * aspect;
      const gy = Math.round(rows * 0.5 + u * 0.97);
      const ox = cols * 0.5 - 0.1 * ax;
      const wind = smooth((t - WIND_AT) / 2.5);
      const gust = gustAt(t) * (0.2 + 0.8 * wind);
      const breath = Math.sin(t * 1.1);

      // 풀밭: 바람 쪽으로 누운 빗금이 물결친다. 기사 발치는 그림자로 어둡다.
      const horizon = gy - Math.round(u * 0.34);
      const laid = smooth(t / 1.6);
      for (let r = horizon; r < rows; r++) {
        const depth = (r - horizon) / (rows - horizon);
        for (let c = 0; c < cols; c++) {
          if (Math.abs(c - cols / 2) > laid * cols) continue;
          // 빗금 한 줄을 따라가면 값이 같다
          const lane = c + r * aspect * 0.9;
          const run = Math.sin(lane * 0.21 + Math.sin(lane * 0.043) * 3) + Math.sin(lane * 0.057 - r * 0.31 + t * (0.6 + gust)) + Math.sin(c * 0.012 + r * 0.4 - t * 0.9 * gust);
          const grain = hash(c, r);
          if (run + grain * 1.6 < 0.2 + (1 - depth) * 1.2) continue;
          const shadow = 1 - 0.75 * Math.exp(-Math.pow((c - ox - 0.1 * ax) / (1.1 * ax), 2) - Math.pow((r - gy) / (0.2 * u), 2));
          g.put(c, r, 6, (0.1 + 0.2 * depth + 0.06 * run) * shadow * laid, SHADE[0], SHADE[1], SHADE[2], code(grain > 0.9 ? ',' : run > 1.6 ? '/' : grain > 0.5 ? '/' : "'"));
        }
      }

      // 기사: 구워 둔 그림을 칸마다 읽어 글자로 옮긴다. 위에서 아래로 드러난다.
      // 모형은 프레임마다 조금씩 나눠 굽는다. 드러나는 줄보다 굽는 줄이 앞서간다.
      if (baked.rows < BH) baked = bakeKnight(7);
      const line = Y1 - ((t - BODY[0]) / (BODY[1] - BODY[0])) * (Y1 - Y0 + 0.3);
      // 검의 날을 따라 가끔 빛이 흐른다
      const glint = ((t - GLINT_AT) / 5.5) % 1;
      const c0 = Math.max(0, Math.floor(ox + X0 * ax));
      const c1 = Math.min(cols - 1, Math.ceil(ox + X1 * ax));
      const r0 = Math.max(0, Math.floor(gy - Y1 * u));
      const r1 = Math.min(rows - 1, Math.floor(gy - Y0 * u));
      const w = c1 - c0 + 3;
      // 먼저 칸마다 구운 그림의 어느 점을 읽을지 정해 둔다. 가장자리를 찾으려면 옆 칸이 무엇인지 알아야 한다.
      if (pick.length < w * (r1 - r0 + 3)) pick = new Int32Array(w * (r1 - r0 + 3));
      pick.fill(-1);
      for (let r = r0; r <= r1 && t > BODY[0]; r++) {
        const y = (gy - r) / u;
        if (y > Y1 || y < Y0 || y < line) continue;
        // 숨을 쉬면 윗몸이 아주 조금 오르내린다
        const by = y - breath * 0.006 * smooth((y - 0.7) / 0.8);
        const j = Math.floor(((Y1 - by) / (Y1 - Y0)) * BH);
        if (j < 0 || j >= BH) continue;
        // 아직 굽지 않은 줄을 그려야 하면 거기까지는 기다렸다가 그린다
        if (j >= baked.rows) baked = bakeKnight();
        for (let c = c0; c <= c1; c++) {
          const x = (c - ox) / ax;
          // 오른쪽 아래로 늘어진 옷자락은 바람에 밀린다
          const flap = gust * 0.035 * smooth((x - 0.15) / 0.5) * smooth((0.9 - y) / 0.6) * (Math.sin(y * 13 - t * 3.3) + 0.6);
          let i = Math.floor(((x - flap - X0) / (X1 - X0)) * BW);
          if (i < 0 || i >= BW) continue;
          if (baked.mat[j * BW + i] !== CLOTH && flap) i = Math.min(BW - 1, Math.max(0, Math.floor(((x - X0) / (X1 - X0)) * BW)));
          const m = baked.mat[j * BW + i];
          // 해진 옷단
          if (m === 255 || (m === CLOTH && y < 0.2 && hash(c, 5) > 0.35 + y * 3)) continue;
          pick[(r - r0 + 1) * w + c - c0 + 1] = j * BW + i;
        }
      }
      // 옆 칸이 비었거나 훨씬 뒤에 있으면 1
      const behind = (at: number, z: number) => (pick[at] < 0 || z - baked.far[pick[at]] > RIM ? 1 : 0);
      for (let r = r0; r <= r1; r++) {
        const y = (gy - r) / u;
        const shown = smooth((y - line) / 0.16);
        for (let c = c0; c <= c1; c++) {
          const at = (r - r0 + 1) * w + c - c0 + 1;
          const k = pick[at];
          if (k < 0) continue;
          const x = (c - ox) / ax;
          const m = baked.mat[k];
          let l = baked.lum[k];
          // 검날 가운데에는 홈이 파여 있어서 양쪽 날만 밝다
          if (m === STEEL && y < 1.2 && Math.abs(x - BLADE_X) < 0.5 / ax) l *= 0.4;
          if (m === STEEL && glint > 0 && glint < 0.2 && x < -0.55) l += Math.exp(-Math.pow((y - glint * 8) / 0.07, 2)) * 0.8;
          // 그려지는 줄은 하얗게 빛난다
          const edge = y - line < 0.05 ? 1 : 0;
          // 띠는 그늘에서도 붉게 보인다
          if (m === BAND) l = 0.6 + 0.4 * l;
          // 챙 그늘에 든 얼굴도 코와 턱은 알아볼 수 있게 한다
          if (m === FACE) l = 0.3 + 0.7 * l;
          let v = Math.min(1, Math.max(0, l * 1.15 + edge));
          // 글자: 재질의 글자 묶음에서 밝기에 맞는 것을 고른다. 단계의 경계는 칸마다 조금씩 흩어서 띠가 지지 않게 한다.
          const ramp = m === MAIL && (c + r) % 2 ? LINKS : RAMPS[m];
          let ch = ramp.charCodeAt(Math.max(0, Math.min(ramp.length - 1, Math.floor((v + (hash(c * 1.3, r * 2.1) - 0.5) / ramp.length) * ramp.length))));
          // 가장자리: 덩어리의 끝에서는 선이 달리는 방향의 글자를 밝게 긋는다. 팔과 몸통, 판과 판이 선으로 갈라진다.
          const z = baked.far[k];
          const left = behind(at - 1, z);
          const right = behind(at + 1, z);
          const up = behind(at - w, z);
          const down = behind(at + w, z);
          const gx = right - left;
          const gyy = down - up;
          if (gx || gyy) {
            ch = code(gx && gyy ? (gx * gyy > 0 ? '/' : '\\') : gx ? '|' : gyy > 0 ? '_' : '-');
            v = Math.min(1, Math.max(v, 0.5) + 0.22);
          } else if (!left && !up) {
            // 재질이 바뀌는 자리에도 가는 선을 넣는다 (가슴판과 허리띠, 사슬과 어깨판)
            const side = pick[at + 1] >= 0 && baked.mat[pick[at + 1]] !== m;
            const under = pick[at + w] >= 0 && baked.mat[pick[at + w]] !== m;
            if (m !== BAND && (side || under)) ch = code(side && under ? '/' : side ? '|' : '_');
          }
          const red = m === BAND;
          // 그늘은 푸르스름하게, 빛 받는 면은 따뜻한 흰색으로
          const k2 = red ? 0 : v;
          g.put(c, r, 2, (0.26 + 0.8 * v) * shown, red ? RED[0] : SHADE[0] + (IVORY[0] - SHADE[0]) * k2, red ? RED[1] + 60 * v : SHADE[1] + (IVORY[1] - SHADE[1]) * k2, red ? RED[2] + 40 * v : SHADE[2] + (IVORY[2] - SHADE[2]) * k2, ch);
        }
      }
      if (t > GLINT_AT && t < GLINT_AT + 0.5) g.rays(ox - 0.83 * ax, gy - 1.3 * u, Math.round(9 * (1 - (t - GLINT_AT) / 0.5)), IVORY[0], IVORY[1], IVORY[2]);

      // 띠의 두 가닥: 머리 뒤 매듭에서 풀려 나와 바람에 날린다
      const out = smooth((t - WIND_AT + 0.4) / 2);
      const hy = gy - 1.6 * u;
      ribbon(g, ox, hy, u, { x: 0.12, y: 0.0, len: 1.3, width: 0.12, amp: 0.16, ph: 0, z: 1.5 }, t, gust, out);
      ribbon(g, ox, hy, u, { x: 0.12, y: 0.03, len: 1, width: 0.085, amp: 0.13, ph: 2.1, z: 1.4 }, t, gust, out);

      // 띠 끝에서 뜯겨 나가는 실오라기와 바람에 실린 먼지
      let threads = 0;
      for (let i = 0; i < 70 && wind > 0; i++) {
        const sp = (0.08 + hash(i, 101) * 0.1) * (0.4 + gust);
        const p = (hash(i, 102) + t * sp) % 1;
        const red = i % 5 === 0;
        const y = red ? hy + (hash(i, 103) - 0.4) * u * 0.9 + p * u * 0.5 : rows * hash(i, 103);
        const x = red ? ox + (1.2 + p * 2.2) * ax : p * (cols + 20) - 10;
        if (red) threads++;
        g.add(x, y + Math.sin(p * 12 + i) * 1.5, (red ? 0.7 : 0.16) * Math.sin(p * Math.PI) * wind, red ? RED[0] : SHADE[0], red ? RED[1] : SHADE[1], red ? RED[2] : SHADE[2], code(red ? '~-`'[i % 3] : '.'));
      }

      g.text(1, 1, `knight · ${knightPhase(t)}`, 0.5, 140, 150, 175);
      g.text(1, 2, `wind ${gust.toFixed(2)}   threads ${threads}`, 0.6, RED[0], RED[1] + 40, RED[2] + 40);
      g.text(1, 3, `letters ${letters.toLocaleString('en-US')}`, 0.5, 140, 150, 175);
      letters = 0;
      for (let i = 0; i < g.lum.length; i++) if (g.lum[i] > 0) letters++;
    },
  };
}
