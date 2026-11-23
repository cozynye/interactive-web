import { code, Grid, hash, rng, Scene, smooth, tone } from './grid';

const TAU = Math.PI * 2;
// 색은 마법진과 자루의 금색, 검날의 얼음빛 파랑, 훑고 올라가는 고리와 보석의 보라만 쓴다
const GOLD = [255, 212, 112];
const IVORY = [255, 246, 226];
const ICE = [150, 204, 255];
const VIOLET = [204, 164, 255];
const RUNES = 'XYVTZKMNWH+#<>';

// 처음 한 번 펼쳐지는 순서(초): 방울이 떨어짐 → 마법진이 바깥 고리부터 안쪽으로 그려짐 → 검이 칼끝부터 위로 솟음 → 떠서 돈다
const DROP = 1;
const CIRCLE_END = 4.9;
const RISE = [5.2, 8.2];
// 마법진을 눕혀 보는 정도 (세로 ÷ 가로)
const TILT = 0.34;

export function sigilPhase(t: number) {
  return t < DROP ? 'drop' : t < CIRCLE_END ? 'circle' : t < RISE[1] ? 'rise' : 'hover';
}

// 검의 치수(모형 단위). 칼끝이 아래를 향하고, 날의 단면은 가운데가 솟은 마름모다.
const TOP = 1.34;
const BOTTOM = -1;
const GUARD = 0.74;
const TAPER = -0.62;
const WIDE = 0.165;
const THICK = 0.05;
const BLADE = 0;
const HILT = 1;
const GRIP = 2;
const GEM = 3;

interface Point {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  kind: number;
}

type V = [number, number, number];

// 면마다 넓이에 맞춰 점을 뿌려 둔다. 면 하나는 법선이 같아서 한 가지 밝기로 칠해진다.
function build() {
  const rand = rng(12);
  const pts: Point[] = [];
  // 세모 하나. 법선은 mid에서 바깥을 보게 맞춘다.
  const tri = (p: V, q: V, r: V, mid: V, kind: number) => {
    const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(n[0], n[1], n[2]);
    if (!len) return;
    const out = (n[0] * (p[0] - mid[0]) + n[1] * (p[1] - mid[1]) + n[2] * (p[2] - mid[2]) < 0 ? -1 : 1) / len;
    for (let i = Math.ceil(len * 5200) + 30; i > 0; i--) {
      let u = rand();
      let v = rand();
      if (u + v > 1) [u, v] = [1 - u, 1 - v];
      pts.push({
        x: p[0] + e1[0] * u + e2[0] * v,
        y: p[1] + e1[1] * u + e2[1] * v,
        z: p[2] + e1[2] * u + e2[2] * v,
        nx: n[0] * out,
        ny: n[1] * out,
        nz: n[2] * out,
        kind,
      });
    }
  };
  const quad = (a: V, b: V, c: V, d: V, mid: V, kind: number) => {
    tri(a, b, c, mid, kind);
    tri(a, c, d, mid, kind);
  };
  // 마름모 단면의 기둥. 아래(y0)와 위(y1)의 반폭이 달라도 된다.
  const prism = (y0: number, y1: number, w0: number, w1: number, t0: number, t1: number, kind: number) => {
    const mid: V = [0, (y0 + y1) / 2, 0];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) quad([sx * w0, y0, 0], [0, y0, sz * t0], [0, y1, sz * t1], [sx * w1, y1, 0], mid, kind);
  };
  const box = (c: V, h: V, kind: number) => {
    for (let axis = 0; axis < 3; axis++)
      for (const side of [-1, 1]) {
        const corner = (i: number, j: number) => {
          const v: V = [c[0], c[1], c[2]];
          v[axis] += side * h[axis];
          v[(axis + 1) % 3] += i * h[(axis + 1) % 3];
          v[(axis + 2) % 3] += j * h[(axis + 2) % 3];
          return v;
        };
        quad(corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1), c, kind);
      }
  };
  // 날: 가로대에서 조금 좁아지며 내려오다가 끝에서 한 점으로 모인다
  prism(TAPER, GUARD, WIDE * 0.8, WIDE, THICK * 0.8, THICK, BLADE);
  prism(BOTTOM, TAPER, 0, WIDE * 0.8, 0, THICK * 0.8, BLADE);
  // 가로대: 가운데 덩어리에서 양쪽으로 뻗고, 끝이 아래로 꺾인다
  box([0, GUARD + 0.05, 0], [0.2, 0.075, 0.08], HILT);
  for (const side of [-1, 1]) {
    box([side * 0.4, GUARD + 0.06, 0], [0.22, 0.04, 0.05], HILT);
    box([side * 0.62, GUARD + 0.01, 0], [0.05, 0.11, 0.06], HILT);
  }
  box([0, GUARD + 0.05, 0], [0.06, 0.045, 0.095], GEM);
  // 자루와 자루 끝의 여덟 면 추
  box([0, 1.01, 0], [0.05, 0.15, 0.05], GRIP);
  box([0, 1.165, 0], [0.075, 0.012, 0.075], HILT);
  prism(1.18, 1.26, 0.11, 0.11, 0.11, 0.11, HILT);
  prism(1.26, TOP, 0.11, 0, 0.11, 0, HILT);
  return pts;
}

// 면 위에 긋는 모서리: 날의 양쪽 능선과 두 날
const EDGES: V[][] = [];
for (const sz of [-1, 1])
  EDGES.push(
    [
      [0, BOTTOM, 0],
      [0, TAPER, sz * THICK * 0.8],
    ],
    [
      [0, TAPER, sz * THICK * 0.8],
      [0, GUARD, sz * THICK],
    ]
  );
for (const sx of [-1, 1])
  EDGES.push(
    [
      [0, BOTTOM, 0],
      [sx * WIDE * 0.8, TAPER, 0],
    ],
    [
      [sx * WIDE * 0.8, TAPER, 0],
      [sx * WIDE, GUARD, 0],
    ]
  );

// 그 높이에서 검이 차지하는 반폭 (훑고 올라가는 고리가 이만큼 벌어진다)
const girth = (y: number) => (y < TAPER ? (WIDE * (y - BOTTOM)) / (TAPER - BOTTOM) : y < GUARD ? WIDE : y < GUARD + 0.13 ? 0.66 : 0.11);

// 화면에서 본 선의 기울기에 맞는 글자 (dx는 칸, dy는 줄)
function stroke(dx: number, dy: number, aspect: number) {
  const a = Math.abs(Math.atan2(dy, dx / aspect));
  const flat = a < 0.42 || a > Math.PI - 0.42;
  const up = a > 1.25 && a < Math.PI - 1.25;
  return code(flat ? '=' : up ? '|' : dx * dy > 0 ? '\\' : '/');
}

// 방울 하나가 떨어진 자리에 마법진이 그려지고, 그 위로 엑스칼리버가 칼끝을 아래로 한 채 솟아 떠서 돈다.
export function createSigil(): Scene {
  const pts = build();
  let letters = 0;
  let runes = 0;

  return {
    cell: 5,
    frame(g: Grid, t: number) {
      const { cols, rows, aspect } = g;
      const cx = cols / 2;
      const gy = rows * 0.74;
      // 마법진의 반지름(줄 단위): 화면 어느 쪽으로도 넘치지 않게
      const R = Math.min((cols * 0.44) / aspect, (rows - gy - 1) / TILT);
      const uc = Math.min(rows * 0.25, R * 0.55);
      const risen = smooth((t - RISE[1]) / 1.2);

      // 먼 별
      for (let i = 0; i < cols * 0.8; i++) {
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (0.4 + hash(i, 6)) + i), 2);
        g.put(hash(i, 1) * cols, hash(i, 2) * rows * 0.7, 9, (0.08 + 0.2 * tw) * smooth(t / 2), 170, 190, 235, code('.'));
      }

      // 방울: 꼬리를 끌며 떨어지고, 닿는 순간 빛살이 뻗는다
      if (t < DROP) {
        const y = gy * Math.pow(t / DROP, 2);
        for (let k = 0; k < 9; k++) g.add(cx, y - k, (1 - k / 9) * 0.9, ICE[0], ICE[1], ICE[2], code(k ? (k < 4 ? '|' : ':') : 'O'));
      } else if (t < DROP + 0.5) g.rays(cx, gy, Math.round(8 * (1 - (t - DROP) / 0.5)) + 1, IVORY[0], IVORY[1], IVORY[2]);

      // 마법진: 도형마다 조금씩 다른 빠르기로 돈다
      const rotRune = t * 0.12;
      const rotStar = -t * 0.07;
      const rotBox = t * 0.21;
      // 다각형의 변을 화면 좌표(가로도 줄 단위)로 바꿔 둔다. 뒤의 두 값은 그려지는 시각이다.
      const segs: number[][] = [];
      const poly = (n: number, rad: number, rot: number, skip: number, from: number, each: number) => {
        for (let i = 0; i < n; i++) {
          const a = rot + (i / n) * TAU;
          const b = rot + ((i + skip) / n) * TAU;
          segs.push([Math.cos(a) * rad * R, Math.sin(a) * rad * R * TILT, Math.cos(b) * rad * R, Math.sin(b) * rad * R * TILT, from + i * each, each]);
        }
      };
      poly(6, 0.78, rotStar, 2, 3, 0.2);
      poly(4, 0.42, rotBox, 1, 4.3, 0.12);
      poly(4, 0.42, rotBox + TAU / 8, 1, 4.5, 0.1);
      // 고리: 반지름, 그려지기 시작하는 시각, 걸리는 시간
      const rings = [
        [1, 1.3, 1.2],
        [0.93, 1.5, 1.1],
        [0.78, 2.4, 0.8],
        [0.42, 4, 0.5],
        [0.14, 4.5, 0.3],
      ];
      const seed = smooth((t - DROP) / 0.4) * (1 - smooth((t - 1.7) / 0.9));
      const pulse = t > CIRCLE_END ? (((t - CIRCLE_END) / 3.2) % 1) * 1.25 : -1;
      const half = Math.ceil(R * TILT) + 1;
      runes = 0;
      for (let r = Math.max(0, Math.floor(gy - half)); r <= Math.min(rows - 1, gy + half) && t >= DROP; r++)
        for (let c = Math.max(0, Math.floor(cx - R * aspect - 2)); c <= Math.min(cols - 1, cx + R * aspect + 2); c++) {
          const px = (c - cx) / aspect;
          const py = r - gy;
          const X = px / R;
          const Z = py / (R * TILT);
          const rho = Math.hypot(X, Z);
          if (rho > 1.06) continue;
          const th = Math.atan2(Z, X);
          // 한 바퀴 중 어디인지 (맨 위에서 시작해 시계 방향)
          const turn = (th / TAU + 1.25) % 1;
          // 줄 간격이 넓은 위아래에서는 선을 두껍게 잡아야 끊기지 않는다
          const w = 0.011 + 0.034 * Math.abs(Math.sin(th));
          let lum = 0;
          let ch = 0;
          let hot = 0;

          if (seed > 0 && rho < 0.24 * seed + 0.02) {
            lum = 0.7 * seed;
            ch = code('=');
            hot = 1;
          }
          // 닿은 자리에서 퍼지는 물결
          const wave = (t - DROP) * 0.7;
          if (wave < 1.1 && Math.abs(rho - wave) < w) lum = Math.max(lum, 0.5 * (1 - wave / 1.1));

          for (const [rad, from, dur] of rings) {
            if (Math.abs(rho - rad) > w * (rad < 0.2 ? 0.7 : 1)) continue;
            const p = (t - from) / dur;
            if (turn > p) continue;
            // 그려지는 끝은 하얗게 빛난다
            if (p < 1 && p - turn < 0.03) hot = 1;
            lum = Math.max(lum, 0.6);
            ch = stroke(-Math.sin(th) * aspect, Math.cos(th) * TILT, aspect);
          }
          // 바깥 두 고리 사이의 눈금
          if (rho > 0.93 && rho < 1 && t > 2.6 && Math.abs((((th + rotRune * 0.5) / TAU) * 72) % 1) < 0.22 && !ch) {
            lum = 0.4;
            ch = code(Math.abs(Math.sin(th)) > 0.5 ? '|' : '-');
          }
          // 글자 띠: 띠를 따라 글자가 흘러간다
          if (rho > 0.815 && rho < 0.9) {
            const arc = ((th + rotRune + TAU) * 0.86 * R * aspect) / 2.4;
            const id = Math.floor(arc);
            if (arc - id < 0.45 && turn < (t - 2) / 1.4) {
              runes++;
              lum = 0.5 + 0.35 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.4 + id * 1.9), 3);
              ch = RUNES.charCodeAt(Math.floor(hash(id, 4) * RUNES.length));
            }
          }
          // 여섯 꼭지 별과 가운데의 겹친 네모
          for (const [x0, y0, x1, y1, from, dur] of segs) {
            const vx = x1 - x0;
            const vy = y1 - y0;
            const u = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / (vx * vx + vy * vy)));
            if (Math.hypot(px - x0 - vx * u, (py - y0 - vy * u) * 1.5) > 0.5) continue;
            const p = (t - from) / dur;
            if (u > p) continue;
            if (p < 1 && p - u < 0.08) hot = 1;
            lum = Math.max(lum, 0.62);
            ch = stroke(vx * aspect, vy, aspect);
          }
          // 별의 골마다 놓인 작은 원
          for (let i = 0; i < 6; i++) {
            if (t < 3.9 + i * 0.09) continue;
            const a = rotStar + ((i + 0.5) / 6) * TAU;
            const d = Math.hypot(X - Math.cos(a) * 0.6, Z - Math.sin(a) * 0.6);
            if (Math.abs(d - 0.085) < w * 0.75) {
              lum = Math.max(lum, 0.55);
              ch = code('o');
            } else if (d < 0.02) {
              lum = 0.9;
              ch = code('*');
              hot = Math.max(hot, 0.5 + 0.5 * Math.sin(t * 2 + i));
            }
          }
          if (lum <= 0) continue;
          // 검이 선 뒤에는 빛의 물결이 안에서 바깥으로 지나간다
          const ripple = pulse >= 0 ? Math.exp(-Math.pow((rho - pulse) / 0.07, 2)) : 0;
          hot = Math.min(1, hot + ripple * 0.8 + (rho < 0.16 ? risen * (0.6 + 0.4 * Math.sin(t * 2.4)) : 0));
          g.put(c, r, 5, lum * (1 + 0.5 * hot), GOLD[0] + (IVORY[0] - GOLD[0]) * hot, GOLD[1] + (IVORY[1] - GOLD[1]) * hot, GOLD[2] + (IVORY[2] - GOLD[2]) * hot, ch);
        }

      // 마법진에서 떠오르는 글자
      const lift = smooth((t - 3.4) / 2);
      for (let i = 0; i < 44 && lift > 0; i++) {
        const p = (t * (0.06 + hash(i, 12) * 0.07) + hash(i, 11)) % 1;
        const a = hash(i, 13) * TAU + t * 0.1;
        const rad = (0.2 + 0.75 * hash(i, 14)) * R;
        g.add(cx + Math.cos(a) * rad * aspect, gy + Math.sin(a) * rad * TILT - p * uc * 1.8, 0.5 * Math.sin(p * Math.PI) * lift, GOLD[0], GOLD[1], GOLD[2], RUNES.charCodeAt(i % RUNES.length));
      }

      // 검: 고리가 훑고 올라간 높이까지만 보인다. 다 솟은 뒤에는 떠서 천천히 돈다.
      const scan = BOTTOM + (TOP - BOTTOM + 0.1) * Math.min(1, Math.max(0, (t - RISE[0]) / (RISE[1] - RISE[0])));
      if (t >= RISE[0]) {
        const spin = t * 0.5;
        const ca = Math.cos(spin);
        const sa = Math.sin(spin);
        // 칼끝이 마법진 가운데 바로 위에 뜬다
        const cy = gy - (0.3 - BOTTOM) * uc - (0.5 + 0.5 * Math.sin(t * 0.9)) * uc * 0.14 * risen;
        const flash = Math.exp(-Math.pow((t - RISE[1] - 0.15) / 0.3, 2));
        for (const p of pts) {
          if (p.y > scan) continue;
          const x = p.x * ca + p.z * sa;
          const z = -p.x * sa + p.z * ca;
          const nx = p.nx * ca + p.nz * sa;
          const nz = -p.nx * sa + p.nz * ca;
          // 왼쪽 위 앞에서 비추는 빛. 면마다 한 가지 밝기라 깎인 면이 드러난다.
          const lit = Math.max(0, -nx * 0.5 + p.ny * 0.45 - nz * 0.74);
          const edge = scan < TOP && scan - p.y < 0.06;
          // 비스듬한 빛줄기가 4초마다 한 번 겉면을 훑고 지나간다
          const sheen = 0.45 * Math.exp(-Math.pow((x + p.y * 0.6 + 1.6 - ((t * 0.8) % 3.2)) / 0.14, 2));
          const k = edge ? 1 : Math.min(1, 0.14 + 0.74 * lit + 0.05 * p.y + sheen + flash + (hash(p.x * 91, p.y * 57) - 0.5) * 0.1 + (hash(p.x * 91, p.y * 57 + Math.floor(t * 3)) > 0.985 ? 0.5 : 0));
          const base = p.kind === BLADE ? ICE : p.kind === GEM ? VIOLET : GOLD;
          // 자루는 감은 끈의 줄무늬로 어둡게, 보석은 숨 쉬듯 밝아진다
          const dim = p.kind === GRIP ? (Math.floor(p.y * 26) % 2 ? 0.5 : 0.3) : p.kind === GEM ? 0.8 + 0.2 * Math.sin(t * 2.4) : 1;
          let ch = edge ? code('#') : tone(k, p.kind === BLADE ? 2 : 14);
          // 날은 밝은 면이 하얗게 뜨고, 자루는 밝아도 금빛이 남는다
          let hue = p.kind === BLADE ? k * k : k * k * k * 0.7;
          // 날 가운데 홈에는 글자가 새겨져 있다
          const cut = p.kind === BLADE && Math.abs(p.x) < 0.028 && p.y > TAPER && p.y < GUARD - 0.08 && !edge;
          if (cut) {
            ch = RUNES.charCodeAt(Math.floor(hash(Math.floor(p.y * uc), 21) * RUNES.length));
            hue = 0;
          }
          const tint = cut ? GOLD : base;
          g.put(cx + x * uc * aspect, cy - p.y * uc, z, (0.3 + 0.7 * k) * dim, tint[0] + (IVORY[0] - tint[0]) * hue, tint[1] + (IVORY[1] - tint[1]) * hue, tint[2] + (IVORY[2] - tint[2]) * hue, ch);
        }
        // 모서리: 앞쪽에 있는 것만 면 위에 그어진다
        for (const [A, B] of EDGES) {
          const x0 = A[0] * ca + A[2] * sa;
          const z0 = -A[0] * sa + A[2] * ca;
          const x1 = B[0] * ca + B[2] * sa;
          const z1 = -B[0] * sa + B[2] * ca;
          const ch = stroke((x1 - x0) * aspect, -(B[1] - A[1]), aspect);
          const n = Math.ceil(Math.hypot((x1 - x0) * aspect, B[1] - A[1]) * uc);
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const y = A[1] + (B[1] - A[1]) * u;
            if (y > scan) continue;
            g.put(cx + (x0 + (x1 - x0) * u) * uc * aspect, cy - y * uc, z0 + (z1 - z0) * u - 0.02, 0.95, IVORY[0], IVORY[1], IVORY[2], ch === code('=') ? code('-') : ch);
          }
        }
        // 훑고 올라가는 고리
        if (scan < TOP) {
          const rad = girth(scan) + 0.28;
          for (let i = 0; i < 120; i++) {
            const a = (i / 120) * TAU;
            g.put(cx + Math.cos(a) * rad * uc * aspect, cy - scan * uc + Math.sin(a) * rad * uc * 0.3, Math.sin(a) > 0 ? -2 : 2, 0.9, VIOLET[0], VIOLET[1], VIOLET[2], code(i % 3 ? '=' : '#'));
          }
        }
        if (risen > 0.5 && flash <= 0.25) g.rays(cx, cy - (GUARD + 0.05) * uc, 2 + Math.round(1.5 * Math.sin(t * 2.4)), VIOLET[0], VIOLET[1], VIOLET[2]);
        if (flash > 0.25) g.rays(cx, cy - (GUARD + 0.045) * uc, Math.round(10 * flash), IVORY[0], IVORY[1], IVORY[2]);

        // 둘레를 도는 조각들과 위로 뻗는 빛기둥
        for (let i = 0; i < 8 && risen > 0; i++) {
          const a = t * (0.5 + (i % 3) * 0.13) + (i / 8) * TAU;
          const rad = 0.95 + 0.25 * Math.sin(i * 2.1);
          const y = 0.15 + 0.5 * Math.sin(t * 0.6 + i * 1.3);
          const sx = cx + Math.cos(a) * rad * uc * aspect;
          const sy = cy - y * uc + Math.sin(a) * rad * uc * 0.22;
          const zz = Math.sin(a) * rad;
          g.put(sx - 0.5, sy, -zz, 0.85 * risen, ICE[0], ICE[1], ICE[2], code('<'));
          g.put(sx + 0.5, sy, -zz, 0.85 * risen, ICE[0], ICE[1], ICE[2], code('>'));
          g.add(sx - Math.sign(-Math.sin(a)) * 2, sy, 0.25 * risen, ICE[0], ICE[1], ICE[2], code('-'));
        }
        for (let r = 0; r < cy - TOP * uc - 1 && risen > 0; r++)
          for (const dx of [-2, 0, 2]) {
            const w = hash(dx, r - Math.floor(t * 14));
            if (w > 0.55) g.add(cx + dx, r, (dx ? 0.14 : 0.3) * risen * w, ICE[0], ICE[1], ICE[2], code(dx ? ':' : '|'));
          }
      }

      g.text(1, 1, `summoning circle · ${sigilPhase(t)}`, 0.5, 140, 150, 175);
      g.text(1, 2, `runes ${runes}`, 0.6, GOLD[0], GOLD[1], GOLD[2]);
      g.text(1, 3, `letters ${letters.toLocaleString('en-US')}`, 0.5, 140, 150, 175);
      letters = 0;
      for (let i = 0; i < g.lum.length; i++) if (g.lum[i] > 0) letters++;
    },
  };
}
