// 밝기 순서대로 늘어놓은 글자. 칸에 글자를 따로 정하지 않으면 밝기로 여기서 고른다.
export const RAMP = ' .,:;-~=+*xo%#@';

// 몸통 칸에 쓰는 글자 묶음, 어두움 → 밝음. 같은 밝기 안에서 글자가 조금씩 바뀌어 코드가 도는 것처럼 보인다.
const POOLS = ['.:;!il1', 'rtjcvxz=+~', 'aeonu0{}[]<>', '08B$#&%@'];

export const code = (s: string) => s.charCodeAt(0);

// 밝기 단계(0~3)와 순번으로 묶음에서 글자 하나를 고른다
export function poolChar(level: number, k: number) {
  const pool = POOLS[level < 0 ? 0 : level > 3 ? 3 : level | 0];
  return pool.charCodeAt((((k | 0) % pool.length) + pool.length) % pool.length);
}

// 0~1 난수를 돌려주는 고정 씨앗 난수 (장면 모양이 새로고침마다 같게)
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 칸 좌표로 뽑는 0~1 잡음
export function hash(a: number, b: number) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export const smooth = (x: number) => {
  const v = x < 0 ? 0 : x > 1 ? 1 : x;
  return v * v * (3 - 2 * v);
};

// 밝기를 64단계로 나눈 글자 줄, 어두움 → 밝음. 면의 굴곡을 명암으로 보여야 하는 물체는 RAMP 대신 이것을 쓴다.
export const TONES = " .'`,:;-~+<>i!l?/|()1{}[rcvunxzjftLCJUYXZO0Qoahkbdpqwm*WMB8&%$#@";

// 밝기(0~1)에 맞는 TONES 글자. floor는 가장 어두울 때 쓸 글자의 순번이고, 0이면 빈칸까지 내려간다.
export const tone = (v: number, floor = 1) => TONES.charCodeAt(Math.max(floor, Math.min(TONES.length - 1, Math.floor(v * (TONES.length - 1)))));

// 높이 차이로 면이 받는 빛(0~1)을 구한다. h는 그 자리, hx와 hy는 오른쪽과 아래로 e만큼 떨어진 자리의 높이다.
// 빛은 왼쪽 위에서 비스듬히 오고, 평평한 면은 0.62가 나온다.
export function lit(h: number, hx: number, hy: number, e: number) {
  const nx = (h - hx) / e;
  const ny = (h - hy) / e;
  return Math.max(0, (-0.5 * nx - 0.6 * ny + 0.62) / Math.hypot(nx, ny, 1));
}

// 둥근 덩어리의 높이. d는 가운데에서 0, 가장자리에서 1이 되는 값(거리의 제곱)이다.
export const dome = (d: number) => (d < 1 ? Math.sqrt(1 - d) : 0);

// 글자 칸 격자. 장면은 매 프레임 여기에 밝기·색·글자를 써 넣고, 무대가 그대로 그린다.
export class Grid {
  cols = 0;
  rows = 0;
  // 칸 세로 ÷ 가로. 가로 길이에 곱하면 화면에서 같은 길이가 된다.
  aspect = 2;
  // 세계 좌표 1이 차지하는 줄 수 (가로·세로 어느 쪽으로도 화면을 넘지 않는 값)
  unit = 1;
  lum = new Float32Array(0);
  z = new Float32Array(0);
  rgb = new Float32Array(0);
  ch = new Uint16Array(0);
  // 칸을 차지한 몸통 조각의 번호. 0이면 몸통이 아니다(빛, 먼지, 배경).
  part = new Int16Array(0);
  // 이웃 조각이 이만큼 더 멀리 있으면 그 사이에 윤곽선을 긋는다
  gap = 0.03;

  resize(cols: number, rows: number, aspect: number) {
    this.cols = cols;
    this.rows = rows;
    this.aspect = aspect;
    this.unit = Math.min(rows / 2, cols / (2 * aspect));
    const n = cols * rows;
    this.lum = new Float32Array(n);
    this.z = new Float32Array(n);
    this.rgb = new Float32Array(n * 3);
    this.ch = new Uint16Array(n);
    this.part = new Int16Array(n);
  }

  clear() {
    this.lum.fill(0);
    this.z.fill(Infinity);
    this.ch.fill(0);
    this.part.fill(0);
  }

  // 깊이를 따져서 더 가까운 점만 남긴다 (z가 작을수록 가깝다).
  // part를 주면 몸통으로 보고, finish()가 윤곽선과 속 글자를 정한다.
  put(
    x: number,
    y: number,
    z: number,
    lum: number,
    r: number,
    g: number,
    b: number,
    ch = 0,
    part = 0
  ) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= this.cols || yi < 0 || yi >= this.rows) return;
    const i = yi * this.cols + xi;
    if (z >= this.z[i]) return;
    this.part[i] = part;
    this.z[i] = z;
    this.lum[i] = lum;
    this.rgb[i * 3] = r;
    this.rgb[i * 3 + 1] = g;
    this.rgb[i * 3 + 2] = b;
    this.ch[i] = ch;
  }

  // 빛을 더한다. 깊이는 보지 않고 밝기를 쌓으며 색은 밝기 비율로 섞는다.
  add(
    x: number,
    y: number,
    lum: number,
    r: number,
    g: number,
    b: number,
    ch = 0
  ) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= this.cols || yi < 0 || yi >= this.rows) return;
    const i = yi * this.cols + xi;
    const old = this.lum[i];
    const sum = old + lum;
    if (sum <= 0) return;
    const k = lum / sum;
    const j = i * 3;
    this.rgb[j] += (r - this.rgb[j]) * k;
    this.rgb[j + 1] += (g - this.rgb[j + 1]) * k;
    this.rgb[j + 2] += (b - this.rgb[j + 2]) * k;
    this.lum[i] = sum;
    if (lum >= old) this.ch[i] = ch;
  }

  // 네 갈래로 뻗는 빛살. 가장 밝은 점에만 쓴다.
  rays(x: number, y: number, reach: number, r: number, g: number, b: number, strength = 1) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const mark = (xi: number, yi: number, lum: number, ch: string) => {
      if (xi < 0 || xi >= this.cols || yi < 0 || yi >= this.rows) return;
      const i = yi * this.cols + xi;
      if (this.lum[i] >= lum && this.z[i] !== Infinity) return;
      this.z[i] = -1e9;
      this.part[i] = 0;
      this.lum[i] = lum;
      this.rgb[i * 3] = r;
      this.rgb[i * 3 + 1] = g;
      this.rgb[i * 3 + 2] = b;
      this.ch[i] = ch.charCodeAt(0);
    };
    for (let d = 1; d <= reach; d++) {
      const fade = (1 - d / (reach + 1)) * strength;
      // 칸이 세로로 길어서 가로는 두 칸씩 간다
      mark(cx + d * 2, cy, fade, '-');
      mark(cx - d * 2, cy, fade, '-');
      mark(cx, cy + d, fade, '|');
      mark(cx, cy - d, fade, '|');
      if (d > reach / 2) continue;
      mark(cx + d, cy + d, fade * 0.7, '\\');
      mark(cx - d, cy - d, fade * 0.7, '\\');
      mark(cx - d, cy + d, fade * 0.7, '/');
      mark(cx + d, cy - d, fade * 0.7, '/');
    }
    mark(cx, cy, 2, '*');
  }

  // 장면이 다 그린 뒤 무대가 부른다. 몸통 칸마다 가장자리면 윤곽선 글자(| / \ - _)를,
  // 안쪽이면 밝기에 맞는 묶음의 글자를 넣는다. 글자를 직접 정한 칸은 건드리지 않는다.
  finish(t: number) {
    const { cols, rows, part, z, lum, ch, gap } = this;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const p = part[i];
        if (p <= 0 || ch[i]) continue;
        let gx = 0;
        let gy = 0;
        let edge = false;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const rr = r + dy;
            const cc = c + dx;
            let out = rr < 0 || rr >= rows || cc < 0 || cc >= cols;
            if (!out) {
              const j = rr * cols + cc;
              // 빈 곳과 닿았거나, 더 뒤에 있는 다른 조각과 닿았을 때
              out = part[j] <= 0 || (part[j] !== p && z[j] > z[i] + gap);
            }
            if (!out) continue;
            gx += dx;
            gy += dy;
            if (!dx || !dy) edge = true;
          }
        // 옆 칸과 글자가 줄 맞춰 되풀이되지 않게 칸마다 흩은 값
        const h = Math.floor(hash(c, r) * 9973);
        if (edge) {
          const ax = Math.abs(gx);
          const ay = Math.abs(gy);
          const line =
            ax + ay === 0 ? '+' : ax > 2 * ay ? '|' : ay > 2 * ax ? (gy > 0 ? '_' : '-') : gx * gy > 0 ? '/' : '\\';
          ch[i] = line.charCodeAt(0);
          lum[i] = Math.max(0.85, lum[i]);
        } else {
          // 칸마다 바뀌는 때가 어긋나게 한다
          ch[i] = poolChar(Math.floor(lum[i] * 3.2), h + Math.floor(t * 3 + (h % 17) / 17));
          lum[i] = Math.min(1, 0.45 + 0.6 * lum[i]);
        }
      }
  }

  // 맨 위에 덮어쓰는 글귀 (정보 표시용)
  text(
    x: number,
    y: number,
    s: string,
    lum: number,
    r: number,
    g: number,
    b: number
  ) {
    for (let k = 0; k < s.length; k++) {
      const xi = x + k;
      if (xi < 0 || xi >= this.cols || y < 0 || y >= this.rows) continue;
      const i = y * this.cols + xi;
      this.z[i] = -Infinity;
      this.part[i] = 0;
      this.lum[i] = s[k] === ' ' ? 0 : lum;
      this.rgb[i * 3] = r;
      this.rgb[i * 3 + 1] = g;
      this.rgb[i * 3 + 2] = b;
      this.ch[i] = s.charCodeAt(k);
    }
  }
}

export interface Scene {
  // 칸 하나의 폭(px). 생략하면 6이고, 작게 줄수록 글자가 촘촘해진다.
  cell?: number;
  // 앞 프레임이 남는 정도(0~1). 생략하면 0.45이고, 0이면 잔상이 없다.
  trail?: number;
  // t: 장면이 보인 뒤 흐른 시간(초), dt: 직전 프레임과의 간격(초)
  frame: (g: Grid, t: number, dt: number) => void;
}
