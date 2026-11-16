// 밝기 순서대로 늘어놓은 글자. 칸에 글자를 따로 정하지 않으면 밝기로 여기서 고른다.
export const RAMP = ' .,:;-~=+*xo%#@';

export const code = (s: string) => s.charCodeAt(0);

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
  }

  clear() {
    this.lum.fill(0);
    this.z.fill(Infinity);
    this.ch.fill(0);
  }

  // 깊이를 따져서 더 가까운 점만 남긴다 (z가 작을수록 가깝다)
  put(
    x: number,
    y: number,
    z: number,
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
    if (z >= this.z[i]) return;
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
  // t: 장면이 보인 뒤 흐른 시간(초), dt: 직전 프레임과의 간격(초)
  frame: (g: Grid, t: number, dt: number) => void;
}
