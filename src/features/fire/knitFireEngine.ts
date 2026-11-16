import {
  KNIT_FIRE_LOGO_SRC,
  KNIT_FIRE_STORAGE_KEY,
  KNIT_FIRE_TEXT_MAX,
  KnitFireSettings,
  SKIES,
  YARNS,
} from './knitFire.constant';
import {
  SHAPE_DRAWERS,
  SHAPE_TYPES,
  KEEPER_ICON,
  KEEPER_ICON_COLORS,
} from './knitFire.shapes';

// ───────── 기본값 ─────────
const CW = 7;
const CH = 6; // 코 하나(CSS px)
const FONT =
  '"Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR","Malgun Gothic",system-ui,sans-serif';
const YMAP = Object.fromEntries(YARNS.map((y) => [y.id, y]));
const SMAP = Object.fromEntries(SKIES.map((s) => [s.id, s]));
const SOLID = YARNS.filter((y) => y.c && y.c.length === 1);
const MULTI = YARNS.filter((y) => y.c && y.c.length > 1);
const TYPES = [
  'peony',
  'peony',
  'ring',
  'willow',
  'double',
  'heart',
  'star',
  'strobe',
  'split',
  'palm',
  'logo',
  // 그림 모양(토성·달·나비 등) 중 하나를 뽑는다
  'shape',
  'shape',
  'shape',
  'shape',
  'shape',
];
const MAX_PARTS = 4000;
// 대량 폭죽 한 번에 쏘는 발수
const MASS_COUNT = 20;
// 폰에서 동시에 날아가는 폭죽 상한 (글자 불꽃은 제외)
const PHONE_MAX_ROCKETS = 20;
// 이 폭보다 좁으면 폰 배치
const PHONE_W = 600;
// 화면 청소: 이만큼(초) 지나거나 이만큼 쏘면 쌓인 것을 비운다
const CLEAN_EVERY = 300;
const CLEAN_LAUNCHES = 300;
// 하늘이 비기를 기다리는 최대 시간(초) — 넘으면 날아가는 것까지 비운다
const CLEAN_WAIT = 12;
// 코 스프라이트 (V자 코)
const SPW = CW * 1.4;
const SPH = CH * 1.85;
const SOX = CW * 0.2;
const SOY = CH * 0.62;
const HALO = 30;
const OS = 4;

// ───────── 유틸 ─────────
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
function hexRgb(h: string) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function rgbHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}
function mix(a: string, b: string, t: number) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t
  );
}
function rgba(h: string, a: number) {
  const [r, g, b] = hexRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hstr(s: string) {
  let h = 2166136261;
  for (const ch of Array.from(s)) {
    h ^= ch.codePointAt(0) as number;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const vOf = (c: number, r: number) =>
  (((c * 73856093) ^ (r * 19349663)) >>> 0) % 4;

type PartMode = 'free' | 'fly' | 'gather';
interface Part {
  mode: PartMode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hex: string;
  age: number;
  life: number;
  drag: number;
  grav: number;
  trail: number;
  tw: number;
  hist: number[][];
  b0: number;
  stray: number;
  split?: boolean;
  didSplit?: boolean;
  thick?: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  dur: number;
  hold: number;
  ph: number;
}
interface TextLayout {
  cells: number[][];
  lines: number;
  w: number;
  h: number;
  R: number;
  n: number;
}
// 흔들리며 올라가는 길: 직선 궤적(bx, by)에 가로·세로 물결을 얹는다
interface Sway {
  bx: number;
  by: number;
  ax: number;
  fx: number;
  px: number;
  ay: number;
  fy: number;
  py: number;
}
interface Rocket {
  x: number;
  y: number;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  g: number;
  ty: number;
  type: string;
  pal: string[];
  payload?: TextLayout;
  hist: number[][];
  age: number;
  wob: number;
  hex: string;
  sway?: Sway;
}
interface Strand {
  r: Rocket;
  hex: string;
  x0: number;
  y0: number;
  t: number;
  x1: number;
  y1: number;
}
interface Stray {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hex: string;
  rot: number;
  vr: number;
  seed: number;
  len: number;
  ph: number;
}
interface GroundLayout {
  L: TextLayout;
  s: number;
  oy: number;
}

export interface KnitFireOptions {
  canvas: HTMLCanvasElement;
  textarea: HTMLTextAreaElement;
  settings: KnitFireSettings;
  // 주소로 받은 글자 — 열자마자 쏜다
  initialText?: string;
  // 땅 높이·땅 글씨 유무가 바뀔 때 (힌트·쏘아 올리기 버튼 위치용)
  onGround: (groundTop: number, hasText: boolean) => void;
  onCanvasDown: () => void;
  onHideHint: () => void;
}

export interface KnitFire {
  setYarn: (id: string) => void;
  setSky: (id: string) => void;
  setAmount: (amount: number) => void;
  setSound: (on: boolean) => void;
  sweep: () => void;
  fireText: () => void;
  fireMass: () => void;
  audio: () => void;
  destroy: () => void;
}

export function createKnitFire({
  canvas: cv,
  textarea: ta,
  settings,
  initialText,
  onGround,
  onCanvasDown,
  onHideHint,
}: KnitFireOptions): KnitFire {
  // ───────── 상태 ─────────
  const S: KnitFireSettings = { ...settings };
  function store() {
    try {
      localStorage.setItem(KNIT_FIRE_STORAGE_KEY, JSON.stringify(S));
    } catch (e) {
      // 저장 실패는 무시
    }
  }

  // ───────── 캔버스 ─────────
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
  let W = 0;
  let H = 0;
  let DPR = 1;
  let COLS = 0;
  let ROWS = 0;
  let X0 = 0;
  let Y0 = 0;
  let groundTop = 0;
  let hill: number[] = []; // hill[col] = 그 칸 땅 윗면 행
  const mk = () => {
    const c = document.createElement('canvas');
    return [c, c.getContext('2d') as CanvasRenderingContext2D] as const;
  };
  const [GC, gx] = mk(); // 땅 + 땅 글씨 (정적)
  const [PC, px] = mk(); // 땅에 쌓인 실밥
  const [BL, bx] = mk(); // 번짐(1/5)
  const [BL2, bx2] = mk(); // 더 넓은 번짐

  let sprites = new Map<string, HTMLCanvasElement>();
  function sprite(hex: string, v: number) {
    const k = hex + v;
    let s = sprites.get(k);
    if (s) return s;
    if (sprites.size > 5000) sprites = new Map();
    s = document.createElement('canvas');
    s.width = Math.ceil(SPW * DPR);
    s.height = Math.ceil(SPH * DPR);
    const g = s.getContext('2d') as CanvasRenderingContext2D;
    g.scale(DPR, DPR);
    const r = rng(hstr(hex) + v * 977 + HALO * 13);
    const base = mix(hex, r() < 0.5 ? '#000' : '#fff', r() * 0.06);
    const dark = mix(base, '#000', 0.5);
    const mid = mix(base, '#000', 0.16);
    const lite = mix(base, '#fff', 0.3);
    g.fillStyle = mix(base, '#000', 0.6);
    g.fillRect(SOX, SOY, CW, CH);
    const cx = SOX + CW / 2;
    for (const side of [-1, 1]) {
      const x1 = cx + side * CW * 0.47;
      const y1 = SOY - CH * 0.42;
      const x2 = cx + side * CW * 0.03;
      const y2 = SOY + CH * 0.98;
      const L = Math.hypot(x2 - x1, y2 - y1);
      const a = Math.atan2(y2 - y1, x2 - x1);
      const wd = CW * (0.41 + r() * 0.06);
      g.save();
      g.translate((x1 + x2) / 2, (y1 + y2) / 2);
      g.rotate(a);
      const gr = g.createLinearGradient(
        0,
        (-wd / 2) * side,
        0,
        (wd / 2) * side
      );
      gr.addColorStop(0, lite);
      gr.addColorStop(0.42, base);
      gr.addColorStop(0.8, mid);
      gr.addColorStop(1, dark);
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, 0, L / 2, wd / 2, 0, 0, 7);
      g.fill();
      g.strokeStyle = rgba(dark, 0.32);
      g.lineWidth = 0.35;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(i * L * 0.26 - wd * 0.35, -wd * 0.42);
        g.lineTo(i * L * 0.26 + wd * 0.35, wd * 0.42);
        g.stroke();
      }
      g.restore();
    }
    g.fillStyle = rgba(dark, 0.35);
    g.beginPath();
    g.ellipse(cx, SOY + CH * 0.93, CW * 0.16, CH * 0.12, 0, 0, 7);
    g.fill();
    const n = Math.round((HALO / 100) * 16);
    g.lineWidth = 0.32;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const qx = SOX + r() * CW;
      const qy = SOY - CH * 0.3 + r() * CH * 1.2;
      const a = r() * Math.PI * 2;
      const l = CW * (0.35 + r() * 0.7);
      g.strokeStyle = rgba(r() < 0.5 ? lite : base, 0.28 + r() * 0.25);
      g.beginPath();
      g.moveTo(qx, qy);
      g.quadraticCurveTo(
        qx + Math.cos(a + 0.8) * l * 0.6,
        qy + Math.sin(a + 0.8) * l * 0.6,
        qx + Math.cos(a) * l,
        qy + Math.sin(a) * l
      );
      g.stroke();
    }
    sprites.set(k, s);
    return s;
  }

  // 천 패턴
  function fabricTile(f: string, seed: number) {
    const TW = 24;
    const TH = 20;
    const t = document.createElement('canvas');
    t.width = TW * CW * DPR;
    t.height = TH * CH * DPR;
    const g = t.getContext('2d') as CanvasRenderingContext2D;
    g.scale(DPR, DPR);
    g.fillStyle = mix(f, '#000', 0.55);
    g.fillRect(0, 0, TW * CW, TH * CH);
    const r = rng(seed);
    const vars = [0, 1, 2, 3, 4, 5].map((i) =>
      mix(f, i % 2 ? '#000' : '#fff', (i >> 1) * 0.03)
    );
    const rowTone = Array.from({ length: TH }, () => r());
    for (let row = TH; row >= -1; row--)
      for (let col = -1; col <= TW; col++) {
        const rr = ((row % TH) + TH) % TH;
        const hex =
          vars[
            Math.floor(rowTone[rr] * 3) * 2 +
              ((((col * 7 + rr * 3) % 2) + 2) % 2)
          ];
        g.drawImage(
          sprite(hex, vOf(((col % TW) + TW) % TW, rr)),
          col * CW - SOX,
          row * CH - SOY,
          SPW,
          SPH
        );
      }
    for (let row = 0; row < TH; row++) {
      g.fillStyle =
        rowTone[row] < 0.5
          ? `rgba(0,0,0,${(0.5 - rowTone[row]) * 0.07})`
          : `rgba(255,255,255,${(rowTone[row] - 0.5) * 0.05})`;
      g.fillRect(0, row * CH, TW * CW, CH);
    }
    return t;
  }
  let skyPat: CanvasPattern | null = null;
  let skyHex = '#1d2644';
  let groundHex = '#18261f';
  let groundTile: HTMLCanvasElement | null = null;
  let levelCache = new Map<string, string>();
  const bodyStyle = document.body.style;
  const prevBody = {
    background: bodyStyle.background,
    overflow: bodyStyle.overflow,
    overscrollBehavior: bodyStyle.overscrollBehavior,
  };
  bodyStyle.overflow = 'hidden';
  bodyStyle.overscrollBehavior = 'none';
  function buildFabric() {
    const s = SMAP[S.sky] || SKIES[0];
    skyHex = s.c;
    groundHex = s.g;
    skyPat = ctx.createPattern(fabricTile(skyHex, hstr(s.id) + 7), 'repeat');
    groundTile = fabricTile(groundHex, hstr(s.id) + 11);
    levelCache = new Map();
    bodyStyle.background = skyHex;
  }

  // ───────── 글자 → 코 ─────────
  const rc = document.createElement('canvas');
  const rx = rc.getContext('2d', {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;
  let gCache = new Map<string, { w: number; cells: number[][] }>();
  function glyph(ch: string, R: number) {
    const key = R + ch;
    let G = gCache.get(key);
    if (G) return G;
    if (ch === ' ' || ch === '　' || ch === '\t') {
      G = { w: Math.round(R * 0.4), cells: [] };
    } else {
      const colPx = (OS * CW) / CH;
      const fs = R * OS * 0.95;
      rx.font = `800 ${fs}px ${FONT}`;
      const adv = rx.measureText(ch).width;
      const w = Math.max(2, Math.round(adv / colPx));
      rc.width = Math.ceil(w * colPx) + 2;
      rc.height = R * OS;
      rx.font = `800 ${fs}px ${FONT}`;
      rx.textBaseline = 'alphabetic';
      rx.fillStyle = '#000';
      rx.fillText(ch, (rc.width - adv) / 2, R * OS * 0.8);
      const d = rx.getImageData(0, 0, rc.width, rc.height).data;
      const cells: number[][] = [];
      for (let r = 0; r < R; r++)
        for (let c = 0; c < w; c++) {
          const xa = Math.floor(c * colPx);
          const xb = Math.floor((c + 1) * colPx);
          let s = 0;
          let n = 0;
          for (let y = r * OS; y < r * OS + OS; y++)
            for (let x = xa; x < xb; x++) {
              s += d[(y * rc.width + x) * 4 + 3];
              n++;
            }
          if (s / n > 255 * 0.42) cells.push([c, r]);
        }
      G = { w: w + 1, cells };
    }
    gCache.set(key, G);
    return G;
  }
  // 단어 단위 줄바꿈 → 칸 목록. 글자 i 의 칸에는 글자 번호를 같이 붙여 둠(색 나누기용)
  function layoutText(str: string, R: number, maxCols: number): TextLayout {
    const chs = Array.from(str);
    const words: string[][] = [];
    let cur: string[] = [];
    for (const ch of chs) {
      if (ch === ' ') {
        if (cur.length) words.push(cur);
        words.push([' ']);
        cur = [];
      } else cur.push(ch);
    }
    if (cur.length) words.push(cur);
    const lines: string[][] = [];
    let line: string[] = [];
    let lw = 0;
    const wOf = (w: string[]) => w.reduce((a, ch) => a + glyph(ch, R).w, 0);
    for (const w of words) {
      if (w[0] === ' ') {
        if (line.length) {
          line.push(' ');
          lw += glyph(' ', R).w;
        }
        continue;
      }
      const ww = wOf(w);
      if (lw + ww > maxCols && line.length) {
        while (line[line.length - 1] === ' ') line.pop();
        lines.push(line);
        line = [];
        lw = 0;
      }
      if (ww > maxCols) {
        for (const ch of w) {
          const gw = glyph(ch, R).w;
          if (lw + gw > maxCols && line.length) {
            lines.push(line);
            line = [];
            lw = 0;
          }
          line.push(ch);
          lw += gw;
        }
      } else {
        line.push(...w);
        lw += ww;
      }
    }
    while (line.length && line[line.length - 1] === ' ') line.pop();
    if (line.length) lines.push(line);
    const LH = R + 3;
    const cells: number[][] = [];
    let maxW = 0;
    let ci = 0;
    lines.forEach((ln, li) => {
      const lwid = ln.reduce((a, ch) => a + glyph(ch, R).w, 0) - 1;
      maxW = Math.max(maxW, lwid);
      let x = -lwid / 2;
      for (const ch of ln) {
        const G = glyph(ch, R);
        for (const [c, r] of G.cells)
          cells.push([Math.round(x + c), li * LH + r, ci]);
        x += G.w;
        if (ch !== ' ') ci++;
      }
    });
    const h = lines.length * LH - 3;
    for (const c of cells) c[1] -= Math.round(h / 2);
    return { cells, lines: lines.length, w: maxW, h, R, n: ci };
  }

  // 로고 무늬 (로고 알파를 코 격자로)
  const logoImg = new Image();
  let logoCells: number[][] | null = null;
  // 채워 그린 그림의 알파를 코 격자(w×h)로 읽어 외곽선 칸만 남김
  function outlineCells(
    w: number,
    h: number,
    paint: (g: CanvasRenderingContext2D, pw: number, ph: number) => void
  ) {
    try {
      const c = document.createElement('canvas');
      c.width = w * 4;
      c.height = h * 4;
      const g = c.getContext('2d') as CanvasRenderingContext2D;
      paint(g, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const out: number[][] = [];
      for (let r = 0; r < h; r++)
        for (let q = 0; q < w; q++) {
          let a = 0;
          for (let y = 0; y < 4; y++)
            for (let x = 0; x < 4; x++)
              a += d[((r * 4 + y) * c.width + q * 4 + x) * 4 + 3];
          if (a / 16 > 110) out.push([q, r]);
        }
      const set = new Set(out.map(([q, r]) => `${q},${r}`));
      const edge = out.filter(
        ([q, r]) =>
          !set.has(`${q + 1},${r}`) ||
          !set.has(`${q - 1},${r}`) ||
          !set.has(`${q},${r + 1}`) ||
          !set.has(`${q},${r - 1}`)
      );
      return edge.length ? edge.map(([q, r]) => [q - w / 2, r - h / 2]) : null;
    } catch (e) {
      return null; // 이미지 픽셀을 못 읽으면 하트로 대신
    }
  }
  function logoShape(h: number) {
    if (!logoImg.complete || !logoImg.naturalWidth) return null;
    const w = Math.round(
      (((h * logoImg.naturalWidth) / logoImg.naturalHeight) * CH) / CW
    );
    return outlineCells(w, h, (g, pw, ph) =>
      g.drawImage(logoImg, 0, 0, pw, ph)
    );
  }
  // 그림 모양 (knitFire.shapes.ts 의 실루엣)
  const shapeCache = new Map<string, number[][] | null>();
  function drawnShape(type: string) {
    if (!shapeCache.has(type)) {
      const h = 34;
      shapeCache.set(
        type,
        outlineCells(Math.round((h * CH) / CW), h, (g, pw, ph) => {
          g.scale(pw / 100, ph / 100);
          SHAPE_DRAWERS[type](g);
        })
      );
    }
    return shapeCache.get(type) || null;
  }

  // ───────── 빛나는 칸 지도 ─────────
  let litB = new Float32Array(0);
  let litH: string[] = [];
  let touched: number[] = [];
  function put(x: number, y: number, b: number, hex: string) {
    const c = Math.floor((x - X0) / CW);
    const r = Math.floor((y - Y0) / CH);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS || b <= 0.04) return;
    if (r >= hill[c]) return; // 땅 속은 안 그림
    const i = r * COLS + c;
    if (litB[i] === 0) touched.push(i);
    if (b > litB[i]) {
      litB[i] = b;
      litH[i] = hex;
    }
  }
  // 두 점 사이를 칸 간격으로 메워 찍기 (빨리 날아도 코가 끊기지 않게)
  function putLine(
    x1: number,
    y1: number,
    b1: number,
    x2: number,
    y2: number,
    b2: number,
    hex: string
  ) {
    const n = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(x2 - x1) / CW, Math.abs(y2 - y1) / CH))
    );
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      put(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, b1 + (b2 - b1) * u, hex);
    }
  }
  // 밝기 L(1–12) → 하늘색과 실색 사이
  function levelHex(hex: string, L: number) {
    const k = hex + L;
    let h = levelCache.get(k);
    if (h) return h;
    const b = L / 12;
    h =
      b <= 0.82
        ? mix(skyHex, hex, (b / 0.82) ** 0.8)
        : mix(hex, '#fff', (b - 0.82) * 1.5);
    levelCache.set(k, h);
    return h;
  }

  // ───────── 소리 (털실 불꽃이라 소리도 폭신) ─────────
  let AC: AudioContext | null = null;
  let bus: GainNode;
  let noise: AudioBuffer;
  function audio() {
    if (!S.sound) return;
    if (AC) {
      if (AC.state !== 'running') AC.resume();
      return;
    }
    try {
      const nav = navigator as any;
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch (e) {
      // audioSession 미지원
    }
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return;
    const ac: AudioContext = new C();
    AC = ac;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    bus = ac.createGain();
    bus.gain.value = 0.9;
    bus.connect(comp).connect(ac.destination);
    const n = ac.sampleRate * 2;
    noise = ac.createBuffer(1, n, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = (ac: AudioContext | null): ac is AudioContext =>
    !!ac && S.sound && ac.state === 'running';
  function nz(
    ac: AudioContext,
    t: number,
    type: BiquadFilterType,
    f: number,
    q: number,
    v: number,
    dur: number,
    f2?: number,
    att = 0.004
  ) {
    const s = ac.createBufferSource();
    s.buffer = noise;
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.setValueAtTime(f, t);
    b.Q.value = q;
    if (f2) b.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(b).connect(g).connect(bus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }
  // 슈우 — 실이 풀려 올라가는 소리
  function launchSnd() {
    if (!ok(AC)) return;
    nz(AC, AC.currentTime, 'bandpass', 700, 1.6, 0.05, 0.75, 2600, 0.12);
  }
  // 퐁 — 베개 터지듯 둔하게
  function boomSnd(k = 1) {
    if (!ok(AC)) return;
    const t = AC.currentTime + 0.01;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(rand(110, 140), t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42 * k, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.55);
    nz(AC, t, 'lowpass', 900, 0.7, 0.32 * k, 0.38, 180, 0.006);
    nz(AC, t + 0.02, 'bandpass', 1800, 1, 0.05 * k, 0.5, 500, 0.03);
  }
  // 바늘 딸깍딸깍 — 반짝임
  function crackle(dur: number, dens = 0.6, delay = 0) {
    if (!ok(AC)) return;
    const t0 = AC.currentTime + delay;
    const n = Math.round(dur * 28 * dens);
    for (let i = 0; i < n; i++) {
      const t = t0 + Math.random() * dur;
      nz(AC, t, 'bandpass', rand(2400, 4200), 5, rand(0.015, 0.045), 0.025);
    }
  }
  function tickSnd() {
    if (!ok(AC)) return;
    const t = AC.currentTime;
    nz(AC, t, 'bandpass', rand(2600, 3400), 5, 0.06, 0.03);
    nz(AC, t + 0.07, 'bandpass', rand(2200, 2900), 5, 0.04, 0.03);
  }
  function unravelSnd() {
    if (!ok(AC)) return;
    nz(AC, AC.currentTime, 'bandpass', 2600, 1.4, 0.06, 0.35, 700);
  }

  // ───────── 불꽃 ─────────
  let parts: Part[] = [];
  const rockets: Rocket[] = [];
  // 화면 청소 (clean)
  let lastClean = 0;
  let launchCount = 0;
  let cleanAt = -1; // 청소 차례가 된 시각. 아니면 -1
  const flashes: { x: number; y: number; hex: string; t: number; r: number }[] =
    [];
  const strands: Strand[] = [];
  const strays: Stray[] = [];
  const timers: { t: number; fn: () => void }[] = [];
  let T = 0;
  const later = (dt: number, fn: () => void) => timers.push({ t: T + dt, fn });
  function palette(id?: string): string[] {
    let y = YMAP[id || S.yarn];
    if (!y || !y.c) y = Math.random() < 0.45 ? pick(MULTI) : pick(SOLID);
    return y.c as string[];
  }
  function surfaceY(x: number) {
    const c = clamp(Math.floor((x - X0) / CW), 0, COLS - 1);
    return Y0 + (hill[c] || ROWS) * CH;
  }
  function addPart(o: Partial<Part> & { x: number; y: number; hex: string }) {
    parts.push({
      age: 0,
      life: 1.6,
      drag: 1.5,
      grav: 60,
      trail: 6,
      tw: 0,
      hist: [],
      mode: 'free',
      b0: 1,
      stray: 0.05,
      vx: 0,
      vy: 0,
      sx: 0,
      sy: 0,
      tx: 0,
      ty: 0,
      dur: 0,
      hold: 0,
      ph: 0,
      ...o,
    });
  }
  // 화면 크기에 맞춘 불꽃 크기
  function sc() {
    return clamp(Math.min(W, H * 0.75) / 420, 0.75, 1.7);
  }

  // 글자 불꽃: 칸마다 한 코씩 — 가운데에서 제자리로 날아가 잠시 떠 있다가 녹아 흘러내림
  function textBurst(x: number, y: number, L: TextLayout, pal: string[]) {
    const cx = X0 + Math.round((x - X0) / CW) * CW;
    const cy = Y0 + Math.round((y - Y0) / CH) * CH;
    const hold = clamp(2 + L.n * 0.08, 2.2, 3.4);
    for (const [c, r, ci] of L.cells) {
      const tx = cx + c * CW + CW / 2;
      const ty = cy + r * CH + CH / 2;
      const d = Math.hypot(tx - x, ty - y);
      addPart({
        mode: 'fly',
        sx: x,
        sy: y,
        x,
        y,
        tx,
        ty,
        dur: 0.42 + d / 900 + rand(0, 0.08),
        hold: hold + ((c + L.w / 2) / Math.max(1, L.w)) * 0.45 + rand(0, 0.12),
        hex: pal[ci % pal.length],
        trail: 4,
        ph: rand(0, 7),
        life: rand(1.3, 1.9),
        drag: 0.9,
        grav: 80,
        stray: 0.035,
      });
    }
    const S0 = sc();
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      const s = rand(250, 300) * S0;
      addPart({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        hex: pal[i % pal.length],
        life: rand(0.8, 1.1),
        drag: 2.2,
        grav: 40,
        trail: 5,
        b0: 0.8,
      });
    }
    crackle(hold + 0.8, 0.35, hold + 0.2);
  }

  function burst(
    x: number,
    y: number,
    type: string,
    pal: string[],
    payload?: TextLayout
  ) {
    const S0 = sc();
    flashes.push({
      x,
      y,
      hex: pal[Math.floor(pal.length / 2)],
      t: T,
      r: (type === 'text' ? 260 : 200) * S0,
    });
    boomSnd(
      type === 'text' || type === 'logo' ? 1.2 : type === 'willow' ? 0.8 : 1
    );
    const colAt = (a: number) =>
      pal.length === 1
        ? pal[0]
        : pal[
            Math.floor(((((a / (Math.PI * 2)) % 1) + 1) % 1) * pal.length * 2) %
              pal.length
          ];
    if (type === 'text') {
      if (payload) textBurst(x, y, payload, pal);
      return;
    }
    if (type === 'peony' || type === 'strobe' || type === 'split') {
      const n = Math.round(rand(60, 90));
      const sp = rand(200, 260) * S0;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05);
        const s = sp * rand(0.82, 1.04);
        addPart({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          hex: type === 'strobe' ? (i % 2 ? '#f4ecdc' : pal[0]) : colAt(a),
          life: rand(1.3, 1.9),
          tw: type === 'strobe' ? 1 : 0,
          split: type === 'split',
          drag: 1.7,
          grav: 55,
        });
      }
      if (type === 'strobe') crackle(1.2, 0.8);
    } else if (type === 'ring') {
      const n = 56;
      const sp = rand(190, 240) * S0;
      const tilt = rand(-1, 1);
      const sq = rand(0.35, 0.75);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const vx0 = Math.cos(a) * sp;
        const vy0 = Math.sin(a) * sp * sq;
        const ca = Math.cos(tilt);
        const sa = Math.sin(tilt);
        addPart({
          x,
          y,
          vx: vx0 * ca - vy0 * sa,
          vy: vx0 * sa + vy0 * ca,
          hex: colAt(a),
          life: rand(1.4, 1.8),
          drag: 1.6,
          grav: 40,
          trail: 4,
        });
      }
      for (let i = 0; i < 14; i++) {
        const a = rand(0, 7);
        const s = rand(20, 70) * S0;
        addPart({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          hex: pal[pal.length - 1],
          life: rand(0.8, 1.2),
          trail: 3,
        });
      }
    } else if (type === 'willow') {
      const n = 64;
      const sp = rand(170, 210) * S0;
      const g = pal.length > 1 ? pal : ['#e9b949'];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.06, 0.06);
        const s = sp * rand(0.85, 1.05);
        addPart({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          hex: g.length === 1 ? g[0] : colAt(a),
          life: rand(2.6, 3.4),
          drag: 1.25,
          grav: 95,
          trail: 18,
          b0: 0.8,
          stray: 0.12,
        });
      }
      crackle(2.4, 0.5);
    } else if (type === 'double') {
      const sp = rand(220, 260) * S0;
      const c2 = pal.length > 1 ? pal[1] : (pick(SOLID).c as string[])[0];
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const s = sp * rand(0.9, 1.03);
        addPart({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          hex: pal[0],
          life: rand(1.4, 1.8),
          drag: 1.7,
        });
      }
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        const s = sp * 0.45;
        addPart({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          hex: c2,
          life: rand(1.3, 1.6),
          drag: 1.7,
          trail: 3,
        });
      }
    } else if (type === 'palm') {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.62 + rand(-0.08, 0.08);
        const s = rand(230, 270) * S0;
        addPart({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s * 0.9,
          hex: pal[i % pal.length],
          life: rand(2.2, 2.6),
          drag: 1.1,
          grav: 110,
          trail: 22,
          b0: 0.95,
          stray: 0.35,
          thick: 1,
        });
      }
    } else {
      // 모양 불꽃: 하트·별·로고·그림 → 칸 목표로 퍼짐
      let pts: number[][] = [];
      const isDrawn = type in SHAPE_DRAWERS;
      if (type === 'logo' || isDrawn) {
        if (type === 'logo' && !logoCells) logoCells = logoShape(34);
        const cells = isDrawn ? drawnShape(type) : logoCells;
        if (cells)
          pts = cells.map(([c, r]) => [c * CW * 1.15 * S0, r * CH * 1.15 * S0]);
        else type = 'heart';
      }
      if (type === 'heart') {
        for (let i = 0; i < 64; i++) {
          const t = (i / 64) * Math.PI * 2;
          pts.push([
            16 * Math.sin(t) ** 3 * 6.2 * S0,
            -(
              13 * Math.cos(t) -
              5 * Math.cos(2 * t) -
              2 * Math.cos(3 * t) -
              Math.cos(4 * t)
            ) *
              6.2 *
              S0,
          ]);
        }
      }
      if (type === 'star') {
        for (let i = 0; i < 10; i++) {
          const a1 = -Math.PI / 2 + (i * Math.PI) / 5;
          const a2 = -Math.PI / 2 + ((i + 1) * Math.PI) / 5;
          const r1 = i % 2 ? 50 : 115;
          const r2 = i % 2 ? 115 : 50;
          for (let k = 0; k < 7; k++) {
            const u = k / 7;
            pts.push([
              (Math.cos(a1) * r1 * (1 - u) + Math.cos(a2) * r2 * u) * S0,
              (Math.sin(a1) * r1 * (1 - u) + Math.sin(a2) * r2 * u) * S0,
            ]);
          }
        }
      }
      const D = 1.9;
      const isLogo = type === 'logo';
      // 칸 그림(로고·그림)은 점이 촘촘해서 꼬리를 짧게, 덜 처지게
      const isCells = isLogo || type in SHAPE_DRAWERS;
      pts.forEach(([dx, dy]) => {
        const a = Math.atan2(dy, dx);
        addPart({
          x,
          y,
          vx: dx * D,
          vy: dy * D,
          hex: isLogo ? (pal.length > 1 ? colAt(a) : '#f4ecdc') : colAt(a),
          b0: isLogo ? 0.72 : isCells ? 0.85 : 1,
          life: rand(1.7, 2.1),
          drag: D,
          grav: isCells ? 14 : 24,
          trail: isCells ? 2 : 4,
        });
      });
      if (isLogo)
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          const s = 230 * S0;
          addPart({
            x,
            y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            hex: colAt(a),
            life: 1.2,
            drag: 1.8,
            trail: 4,
          });
        }
    }
  }

  function launch(
    x: number,
    ty: number,
    type: string,
    pal: string[],
    payload?: TextLayout,
    from?: { x: number; y: number },
    sway?: Omit<Sway, 'bx' | 'by'>
  ) {
    if (!payload && isPhone() && rockets.length >= PHONE_MAX_ROCKETS) return;
    launchCount++;
    const gy = from ? from.y : surfaceY(x) - 2;
    const x0 = from ? from.x : x;
    const dist = Math.max(60, gy - ty);
    // 흔들리는 길은 천천히 올라가야 구불구불한 자취가 보인다
    const g = sway ? 150 : 420;
    const vy = -Math.sqrt(2 * g * dist);
    const R: Rocket = {
      x: x0,
      y: gy,
      x0,
      y0: gy,
      vx: (x - x0) / (dist / (-vy / 2)),
      vy,
      g,
      ty,
      type,
      pal,
      payload,
      hist: [],
      age: 0,
      wob: rand(0, 7),
      hex: payload ? pal[0] : mix(pal[0], '#f4ecdc', 0.35),
      sway: sway && { ...sway, bx: x0, by: gy },
    };
    rockets.push(R);
    // 곧은 실은 구불구불한 길과 어긋나므로 흔들리는 로켓은 자취만 남긴다
    if (!sway)
      strands.push({ r: R, hex: R.hex, x0, y0: gy, t: -1, x1: 0, y1: 0 });
    launchSnd();
  }
  function randomTarget() {
    const top = Math.max(110, H * 0.12);
    const bot = Math.max(top + 40, groundTop - H * 0.22);
    return { x: rand(W * 0.14, W * 0.86), y: rand(top, bot) };
  }
  // y 를 비우면(null) 화면 맨 위까지 올라가 터짐
  function randomFire(
    x?: number | null,
    y?: number | null,
    opt: {
      type?: string;
      yarn?: string;
      from?: { x: number; y: number };
      sway?: Omit<Sway, 'bx' | 'by'>;
    } = {}
  ) {
    const p = randomTarget();
    if (x == null) {
      x = p.x;
      y = p.y;
    }
    let ty = y ?? 0;
    let type = opt.type || pick(TYPES);
    if (type === 'logo' && Math.random() < 0.6) type = 'peony'; // 로고는 가끔만
    if (type === 'shape') type = pick(SHAPE_TYPES);
    if (type === 'logo' || type in SHAPE_DRAWERS)
      ty = clamp(ty, Math.max(150, 140 * sc()), groundTop - 150 * sc());
    launch(x, ty, type, palette(opt.yarn), undefined, opt.from, opt.sway);
  }
  // 불꽃 양(0–10) → 한 번에 쏘는 발수 (1–9)
  function volley() {
    return S.amount <= 1 ? 1 : 1 + Math.round(8 * ((S.amount - 1) / 9) ** 1.6);
  }
  // 한 발 + 불꽃 양만큼 주변에 더 쏨
  function fireVolley(x?: number | null, y?: number | null) {
    randomFire(x, y);
    const n = volley();
    for (let i = 1; i < n; i++)
      later(i * rand(0.07, 0.14), () => {
        if (x == null || y == null) randomFire();
        else
          randomFire(
            clamp(x + rand(-170, 170) * sc(), 20, W - 20),
            clamp(y + rand(-110, 110) * sc(), 70, Math.max(70, groundTop - 60))
          );
      });
  }
  // 대량 폭죽: 불꽃지기 머리 위에서 여러 발이 제각각 다른 길로 올라감
  function fireMass() {
    const v = keeperBox();
    const from = v
      ? { x: v.x + v.w / 2, y: v.y }
      : { x: W / 2, y: groundTextY() };
    for (let i = 0; i < MASS_COUNT; i++)
      later(rand(0, 0.6), () => {
        const p = randomTarget();
        // 다섯 발 중 한 발은 곧게, 나머지는 좌우·위아래로 흔들리며
        const straight = i % 5 === 0;
        // 올라가는 동안(2~3초) 가로로 반 바퀴~두 바퀴, 세로로는 잔물결
        randomFire(straight ? from.x + rand(-40, 40) * sc() : p.x, p.y, {
          from,
          sway: straight
            ? undefined
            : {
                ax: pick([-1, 1]) * rand(40, 150) * sc(),
                fx: rand(1.2, 5),
                px: rand(0, Math.PI * 2),
                ay: rand(8, 42) * sc(),
                fy: rand(3, 7),
                py: rand(0, Math.PI * 2),
              },
        });
      });
  }

  // ───────── 땅 ─────────
  let groundText = '';
  let groundLayout: GroundLayout | null = null;
  function groundTextY() {
    return groundTop + Math.max(30, (H - groundTop) * 0.18);
  }
  const isPhone = () => W < PHONE_W;
  // 불꽃지기 자리. 큰 화면은 땅 글씨 아래 가운데(아래 112px 을 비워 두는 높이에서만),
  // 폰은 땅 왼쪽 — 키보드가 올라와 땅이 낮아져도 자리가 남는다
  function keeperBox() {
    const phone = isPhone();
    if (!phone && H <= 620) return null;
    const s = phone ? 0.52 : 0.72;
    const w = KEEPER_ICON[0].length * CW * s;
    const h = KEEPER_ICON.length * CH * s;
    return phone
      ? { s, w, h, x: 14, y: Math.min(groundTextY() - 6, H - 10 - h) }
      : { s, w, h, x: W / 2 - w / 2, y: H - 14 - h };
  }
  // 땅 글씨가 놓이는 가로 범위: 폰은 불꽃지기 오른쪽
  function textSpan() {
    const v = isPhone() && keeperBox();
    if (!v) return { cx: W / 2, w: W * 0.88 };
    const left = v.x + v.w + 10;
    return { cx: (left + W - 12) / 2, w: W - 12 - left };
  }
  function buildGround() {
    GC.width = Math.round(W * DPR);
    GC.height = Math.round(H * DPR);
    gx.setTransform(DPR, 0, 0, DPR, 0, 0);
    gx.clearRect(0, 0, W, H);
    // 언덕 모양으로 땅 천
    const pat = gx.createPattern(
      groundTile as HTMLCanvasElement,
      'repeat'
    ) as CanvasPattern;
    pat.setTransform(new DOMMatrix([1 / DPR, 0, 0, 1 / DPR, X0, Y0]));
    gx.beginPath();
    gx.moveTo(0, H);
    for (let c = 0; c < COLS; c++) {
      const y = Y0 + hill[c] * CH;
      gx.lineTo(c === 0 ? 0 : X0 + c * CW, y);
      gx.lineTo(c === COLS - 1 ? W : X0 + (c + 1) * CW, y);
    }
    gx.lineTo(W, H);
    gx.closePath();
    gx.fillStyle = pat;
    gx.fill();
    // 언덕 윗단: 코 한 줄을 또렷하게
    for (let c = 0; c < COLS; c++)
      gx.drawImage(
        sprite(mix(groundHex, '#fff', 0.06), vOf(c, hill[c])),
        X0 + c * CW - SOX,
        Y0 + hill[c] * CH - SOY,
        SPW,
        SPH
      );
    // 땅에 서 있는 불꽃지기
    const keeper = keeperBox();
    if (keeper) {
      const { s, x: ox, y: oy } = keeper;
      KEEPER_ICON.forEach((row, r) =>
        Array.from(row).forEach((ch, c) => {
          const hex = KEEPER_ICON_COLORS[ch];
          if (!hex) return;
          gx.drawImage(
            sprite(hex, vOf(c + 7, r)),
            ox + c * CW * s - SOX * s,
            oy + r * CH * s - SOY * s,
            SPW * s,
            SPH * s
          );
        })
      );
    }
    // 땅 위 글씨 (작은 게이지로 떠 둠)
    groundLayout = null;
    if (groundText.trim()) {
      const pal = (YMAP[S.yarn] && YMAP[S.yarn].c) || ['#f4ecdc'];
      const availH = Math.max(
        50,
        H - groundTextY() - (!isPhone() && H > 620 ? 112 : 24)
      );
      const { cx: textCx, w: availW } = textSpan();
      let L = layoutText(groundText, 14, Math.floor(availW / (CW * 0.78)));
      let s = 0.78;
      // 폰은 땅이 좁아 한 단계 작은 글씨부터 맞춰 본다
      const maxS = isPhone() ? 0.52 : 0.78;
      for (const cand of [0.78, 0.68, 0.6, 0.52, 0.45, 0.38, 0.32, 0.27]) {
        if (cand > maxS) continue;
        L = layoutText(groundText, 14, Math.floor(availW / (CW * cand)));
        s = cand;
        if (L.h * CH * s <= availH && L.lines <= 3) break;
      }
      const oy = groundTextY() + (L.h * CH * s) / 2;
      groundLayout = { L, s, oy };
      const cells = L.cells.slice().sort((a, b) => a[1] - b[1]);
      for (const [c, r, ci] of cells) {
        const hex = pal[ci % pal.length];
        gx.drawImage(
          sprite(hex, vOf(c + 99, r)),
          textCx + c * CW * s - SOX * s,
          oy + r * CH * s - SOY * s,
          SPW * s,
          SPH * s
        );
      }
    }
  }
  function updateFire() {
    onGround(groundTop, !!groundText.trim());
  }
  function setGround(str: string) {
    groundText = str;
    buildGround();
    updateFire();
  }

  // 글자 쏘기
  let lastLaunch = -9;
  let quietUntil = 0;
  function fitSky(str: string) {
    const top = Math.max(76, H * 0.09);
    const bot = groundTop - 50;
    const rows = Math.floor(((bot - top) / CH) * (H < 560 ? 0.95 : 0.7));
    const cols = Math.floor(COLS * 0.9);
    for (const R of [36, 32, 28, 25, 22, 20, 18, 16, 15, 14, 13, 12, 11]) {
      const L = layoutText(str, R, cols);
      if (L.h <= rows && L.w <= cols) return L;
    }
    return layoutText(str, 11, cols);
  }
  function fireText() {
    if (T - lastLaunch < 0.25) return;
    const str = ta.value.replace(/\n/g, '').trim();
    if (!str) {
      if (T - lastLaunch > 0.6) {
        fireVolley(W / 2, null);
        lastLaunch = T;
      }
      return;
    }
    lastLaunch = T;
    const pal = palette();
    // 땅에 뜬 글씨가 풀려 실뭉치로 감김
    const gl = groundLayout;
    const from = { x: textSpan().cx, y: groundTextY() };
    if (gl) {
      const step = Math.max(1, Math.floor(gl.L.cells.length / 260));
      gl.L.cells.forEach(([c, r, ci], i) => {
        if (i % step) return;
        const gx0 = from.x + (c + 0.5) * CW * gl.s;
        const gy0 = gl.oy + (r + 0.5) * CH * gl.s;
        addPart({
          mode: 'gather',
          x: gx0,
          y: gy0,
          sx: gx0,
          sy: gy0,
          tx: from.x,
          ty: from.y,
          dur: rand(0.22, 0.36),
          hex: pal[ci % pal.length],
          trail: 2,
          b0: 0.75,
        });
      });
    }
    ta.value = '';
    setGround('');
    unravelSnd();
    // 폰: 키보드를 내려서 하늘을 넓힌 뒤 글자 자리를 잡음
    const coarse = matchMedia('(pointer:coarse)').matches && H < 560;
    if (coarse) ta.blur();
    quietUntil = T + 6;
    later(coarse ? 0.55 : 0.3, () => {
      const L = fitSky(str);
      const lo = Math.max(76, H * 0.09) + (L.h * CH) / 2;
      const hi = groundTop - 50 - (L.h * CH) / 2;
      const y =
        hi < lo ? (lo + hi) / 2 : clamp((groundTop - 36) * 0.42, lo, hi);
      quietUntil = T + 1.4 + clamp(2 + L.n * 0.08, 2.2, 3.4) + 0.6;
      launch(W / 2, y, 'text', pal, L, {
        x: textSpan().cx,
        y: groundTextY(),
      });
    });
    onHideHint();
  }

  // ───────── 실밥 (꺼진 불꽃 → 실 조각이 팔랑팔랑 떨어져 언덕에 쌓임) ─────────
  function plied(
    g: CanvasRenderingContext2D,
    path: () => void,
    hex: string,
    w: number,
    a = 1
  ) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.globalAlpha = a;
    g.strokeStyle = rgba(mix(hex, '#000', 0.5), 0.5);
    g.lineWidth = w + 0.7;
    path();
    g.stroke();
    g.strokeStyle = hex;
    g.lineWidth = w;
    path();
    g.stroke();
    g.strokeStyle = rgba(mix(hex, '#fff', 0.38), 0.7);
    g.lineWidth = w * 0.34;
    g.setLineDash([1.3, 1.8]);
    path();
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  }
  function drawStray(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    hex: string,
    rot: number,
    seed: number,
    len: number,
    a: number
  ) {
    const r = rng(seed);
    const L = CW * len;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const pts = [[-L / 2, 0]];
    for (let i = 1; i <= 3; i++)
      pts.push([-L / 2 + (L * i) / 3, (r() - 0.5) * CH * 1.1]);
    const ctl: number[][] = [];
    for (let i = 1; i < pts.length; i++)
      ctl.push([(r() - 0.5) * CW * 0.6, (r() - 0.5) * CH * 0.8]);
    plied(
      g,
      () => {
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i - 1];
          const q = pts[i];
          g.quadraticCurveTo(
            p[0] + (q[0] - p[0]) * 0.5 + ctl[i - 1][0],
            p[1] + (q[1] - p[1]) * 0.5 + ctl[i - 1][1],
            q[0],
            q[1]
          );
        }
      },
      hex,
      1.2,
      a
    );
    g.restore();
  }
  let settled = 0;
  function spawnStray(x: number, y: number, hex: string) {
    if (strays.length > 55) return;
    strays.push({
      x,
      y,
      vx: rand(-12, 12),
      vy: rand(10, 30),
      hex,
      rot: rand(0, 7),
      vr: rand(-2, 2),
      seed: (Math.random() * 1e9) | 0,
      len: rand(1.6, 3),
      ph: rand(0, 7),
    });
  }
  function settle(s: Stray) {
    const y = surfaceY(s.x) + rand(-1, 7);
    drawStray(
      px,
      s.x,
      y,
      s.hex,
      rand(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI),
      s.seed,
      s.len,
      1
    );
    settled++;
    if (settled > 260) {
      px.save();
      px.globalCompositeOperation = 'destination-out';
      px.fillStyle = 'rgba(0,0,0,.35)';
      px.fillRect(0, 0, W, H);
      px.restore();
      settled = 170;
    }
  }

  // ───────── 루프 ─────────
  let last = performance.now();
  let nextAuto = 1.2;
  let stars: { x: number; y: number; f: number; p: number }[] = [];
  let raf = 0;
  let destroyed = false;

  function brightness(p: Part) {
    if (p.mode === 'fly') {
      if (p.age < p.dur) return 1;
      const h = p.age - p.dur;
      const left = p.hold - h;
      let b = 0.86 + 0.12 * Math.sin(T * 5 + p.ph);
      if (left < 0.5) b *= Math.random() < 0.5 ? 1 : 0.55; // 녹기 직전 반짝반짝
      return b;
    }
    if (p.mode === 'gather') return p.b0 * (1 - (p.age / p.dur) * 0.5);
    const u = p.age / p.life;
    let b = p.b0 * (u < 0.55 ? 1 : 1 - ((u - 0.55) / 0.45) ** 1.4);
    if (p.tw && p.age > 0.45)
      b *= Math.floor((T + p.x * 0.01) * 14 + p.y) % 3 === 0 ? 1 : 0.18;
    return b;
  }

  // 다음 코가 떠질 자리에서 코 기둥이 깜빡 (실 색)
  function drawCursor() {
    const gl = groundLayout;
    let x: number;
    let y: number;
    let s = isPhone() ? 0.45 : 0.6;
    if (gl) {
      s = gl.s;
      const lastRow = Math.max(...gl.L.cells.map((c) => c[1]));
      let mx = -1e9;
      for (const [c, r] of gl.L.cells) if (r > lastRow - 15 && c > mx) mx = c;
      x = textSpan().cx + (mx + 2) * CW * s;
      y = gl.oy + (lastRow - 13) * CH * s;
    } else {
      x = textSpan().cx - (CW * s) / 2;
      y = groundTextY();
    }
    if ((T * 1.6) % 1 >= 0.62) return;
    const hex = ((YMAP[S.yarn] && YMAP[S.yarn].c) || ['#f4ecdc'])[0];
    for (let r = 0; r < 14; r++)
      ctx.drawImage(
        sprite(hex, r % 4),
        x - SOX * s,
        y + r * CH * s - SOY * s,
        SPW * s,
        SPH * s
      );
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = skyPat as CanvasPattern;
    sky.setTransform(
      new DOMMatrix([1, 0, 0, 1, Math.round(X0 * DPR), Math.round(Y0 * DPR)])
    );
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // 터질 때 천이 환해짐
    ctx.globalCompositeOperation = 'lighter';
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const u = (T - f.t) / 0.9;
      if (u >= 1) {
        flashes.splice(i, 1);
        continue;
      }
      const r = f.r * (0.6 + 0.4 * u);
      const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      gr.addColorStop(0, rgba(f.hex, 0.26 * (1 - u) * (1 - u)));
      gr.addColorStop(1, rgba(f.hex, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 별 (희미한 크림색 코가 천천히 반짝)
    for (const s of stars)
      put(
        s.x,
        s.y,
        0.09 + 0.16 * Math.max(0, Math.sin(T * s.f + s.p)),
        '#f1e6c8'
      );
    // 불꽃 코 → 칸 지도
    for (const p of parts) {
      const b = brightness(p);
      const h = p.hist;
      if (b <= 0.03 || !h.length) continue;
      put(h[0][0], h[0][1], b, p.hex);
      if (p.thick) put(h[0][0] + CW, h[0][1], b * 0.8, p.hex);
      for (let k = 1; k < h.length; k++) {
        const b1 = b * (1 - (k - 1) / h.length) ** 1.3 * 0.85;
        const b2 = b * (1 - k / h.length) ** 1.3 * 0.85;
        putLine(h[k - 1][0], h[k - 1][1], b1, h[k][0], h[k][1], b2, p.hex);
      }
    }
    for (const R of rockets) {
      const h = R.hist;
      const b = Math.random() < 0.3 ? 0.75 : 1;
      put(h[0][0], h[0][1], b, R.hex);
      for (let k = 1; k < h.length; k++)
        putLine(
          h[k - 1][0],
          h[k - 1][1],
          0.62 * (1 - (k - 1) / h.length),
          h[k][0],
          h[k][1],
          0.62 * (1 - k / h.length),
          R.hex
        );
    }
    // 그리기: 아래 단부터 (위 코가 아래 코 머리를 덮게)
    touched.sort((a, b) => b - a);
    const bw = BL.width;
    const bh = BL.height;
    const bs = bw / W;
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.clearRect(0, 0, bw, bh);
    for (let j = 0; j < touched.length; j++) {
      const i = touched[j];
      const b = litB[i];
      const hex = litH[i];
      litB[i] = 0;
      const L = Math.min(12, Math.round(b * 12));
      if (L < 1) continue;
      const c = i % COLS;
      const r = (i - c) / COLS;
      const x = X0 + c * CW;
      const y = Y0 + r * CH;
      ctx.drawImage(
        sprite(levelHex(hex, L), vOf(c, r)),
        x - SOX,
        y - SOY,
        SPW,
        SPH
      );
      if (b > 0.42) {
        bx.fillStyle = rgba(hex, (b - 0.42) * 1.2);
        bx.fillRect((x - 1) * bs, (y - 1) * bs, (CW + 2) * bs, (CH + 2) * bs);
      }
    }
    touched.length = 0;
    // 땅 + 쌓인 실밥
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(GC, 0, 0);
    ctx.drawImage(PC, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // 로켓 실: 땅에서 불꽃까지 실이 딸려 올라갔다가 터지면 느슨하게 떨어짐
    for (let i = strands.length - 1; i >= 0; i--) {
      const s = strands[i];
      let x1: number;
      let y1: number;
      let a = 1;
      let slack = 0;
      if (s.t < 0) {
        x1 = s.r.x;
        y1 = s.r.y;
      } else {
        const u = (T - s.t) / 1.1;
        if (u >= 1) {
          strands.splice(i, 1);
          continue;
        }
        a = 1 - u;
        slack = u;
        x1 = s.x1;
        y1 = s.y1 + u * u * 140;
      }
      const mx = (s.x0 + x1) / 2 + Math.sin(T * 3 + s.y0) * 10 + slack * 30;
      const my = (s.y0 + y1) / 2 + slack * 60;
      plied(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(s.x0, s.y0);
          ctx.quadraticCurveTo(mx, my, x1, y1);
        },
        s.hex,
        1.1,
        0.55 * a
      );
    }
    for (const s of strays)
      drawStray(ctx, s.x, s.y, s.hex, s.rot, s.seed, s.len, 1);
    // 땅 글씨 커서 (실 고리가 깜빡)
    if (document.activeElement === ta) drawCursor();
    // 번짐 (저해상도 두 겹을 겹쳐 부드럽게)
    bx2.setTransform(1, 0, 0, 1, 0, 0);
    bx2.clearRect(0, 0, BL2.width, BL2.height);
    bx2.drawImage(BL, 0, 0, BL2.width, BL2.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(BL, 0, 0, cv.width, cv.height);
    ctx.globalAlpha = 0.75;
    ctx.drawImage(BL2, 0, 0, cv.width, cv.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // 오래 켜 둔 화면을 처음 상태로: 불꽃 코·실·실밥·땅에 쌓인 실밥·코 그림 캐시를 비운다.
  // 땅에 쓰던 글씨와 설정은 그대로 둔다
  function clean() {
    parts = [];
    rockets.length = 0;
    strands.length = 0;
    strays.length = 0;
    px.clearRect(0, 0, W, H);
    settled = 0;
    sprites = new Map();
    lastClean = T;
    launchCount = 0;
    cleanAt = -1;
    nextAuto = T + 0.6;
  }

  function frame(now: number) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    T += dt;
    // 예약
    for (let i = timers.length - 1; i >= 0; i--)
      if (T >= timers[i].t) {
        const f = timers[i].fn;
        timers.splice(i, 1);
        f();
      }
    // 청소: 차례가 되면 자동 불꽃을 멈추고, 하늘이 비는 틈에 비운다
    if (
      cleanAt < 0 &&
      (T - lastClean > CLEAN_EVERY || launchCount >= CLEAN_LAUNCHES)
    )
      cleanAt = T;
    if (cleanAt >= 0) {
      quietUntil = Math.max(quietUntil, T + 1);
      if ((!rockets.length && !parts.length) || T - cleanAt > CLEAN_WAIT)
        clean();
    }
    // 자동
    if (S.amount && T >= nextAuto && T >= quietUntil && !document.hidden) {
      const base = 4.2 * 0.72 ** (S.amount - 1);
      if (Math.random() < 0.07) {
        const n = Math.round(rand(4, 7));
        for (let i = 0; i < n; i++)
          later(i * rand(0.12, 0.22), () => randomFire());
      } else randomFire();
      nextAuto = T + rand(base * 0.6, base * 1.4);
    }
    // 로켓
    for (let i = rockets.length - 1; i >= 0; i--) {
      const R = rockets[i];
      R.age += dt;
      R.vy += R.g * dt;
      const w = R.sway;
      if (w) {
        // 물결은 출발점에서 0 이 되게 해서 불꽃지기 머리 위에서 시작
        w.bx += R.vx * dt;
        w.by += R.vy * dt;
        R.x = clamp(
          w.bx + w.ax * (Math.sin(R.age * w.fx + w.px) - Math.sin(w.px)),
          10,
          W - 10
        );
        R.y = w.by + w.ay * (Math.sin(R.age * w.fy + w.py) - Math.sin(w.py));
      } else {
        R.y += R.vy * dt;
        R.x += R.vx * dt + Math.sin(R.age * 13 + R.wob) * 0.25;
      }
      R.hist.unshift([R.x, R.y]);
      if (R.hist.length > (w ? 40 : 14)) R.hist.pop();
      if (R.vy > -30 || R.y <= R.ty) {
        rockets.splice(i, 1);
        burst(R.x, R.y, R.type, R.pal, R.payload);
        for (const s of strands)
          if (s.r === R) {
            s.t = T;
            s.x1 = R.x;
            s.y1 = R.y;
          }
      }
    }
    // 불꽃 코
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.mode === 'fly') {
        const u = clamp(p.age / p.dur, 0, 1);
        const e = 1 - (1 - u) ** 3;
        p.x = p.sx + (p.tx - p.sx) * e;
        p.y = p.sy + (p.ty - p.sy) * e - Math.sin(u * Math.PI) * 8;
        if (p.age > p.dur + p.hold) {
          p.mode = 'free';
          p.age = 0;
          p.vx = rand(-18, 18);
          p.vy = rand(-14, 20);
          p.hist.length = 0;
          p.trail = 6;
        }
      } else if (p.mode === 'gather') {
        const u = clamp(p.age / p.dur, 0, 1);
        const e = u * u;
        p.x = p.sx + (p.tx - p.sx) * e;
        p.y = p.sy + (p.ty - p.sy) * e - Math.sin(u * Math.PI) * 18;
        if (u >= 1) {
          parts.splice(i, 1);
          continue;
        }
      } else {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy = p.vy * k + p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.split && !p.didSplit && p.age > p.life * 0.45) {
          p.didSplit = true;
          for (let j = 0; j < 4; j++) {
            const a = (j * Math.PI) / 2 + Math.PI / 4 + rand(-0.2, 0.2);
            const s = rand(70, 95) * sc();
            addPart({
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              hex: mix(p.hex, '#fff', 0.25),
              life: rand(0.6, 0.9),
              drag: 1.8,
              grav: 60,
              trail: 3,
            });
          }
          if (Math.random() < 0.15) crackle(0.2, 0.6);
          parts.splice(i, 1);
          continue;
        }
        if (
          p.age >= p.life ||
          p.y > surfaceY(p.x) + 2 ||
          p.x < -40 ||
          p.x > W + 40
        ) {
          if (Math.random() < p.stray && p.y < surfaceY(p.x))
            spawnStray(p.x, p.y, p.hex);
          parts.splice(i, 1);
          continue;
        }
      }
      p.hist.unshift([p.x, p.y]);
      if (p.hist.length > p.trail + 1) p.hist.length = p.trail + 1;
    }
    if (parts.length > MAX_PARTS) parts.splice(0, parts.length - MAX_PARTS);
    // 실밥
    for (let i = strays.length - 1; i >= 0; i--) {
      const s = strays[i];
      s.vy = Math.min(s.vy + 40 * dt, 46);
      s.x += s.vx * dt + Math.sin(T * 2.4 + s.ph) * 0.5;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      if (s.y >= surfaceY(s.x) - 2) {
        settle(s);
        strays.splice(i, 1);
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  // ───────── 배치 ─────────
  function layout() {
    let keep: HTMLCanvasElement | null = null;
    if (PC.width) {
      keep = document.createElement('canvas');
      keep.width = PC.width;
      keep.height = PC.height;
      (keep.getContext('2d') as CanvasRenderingContext2D).drawImage(PC, 0, 0);
    }
    const oldGround = groundTop;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.visualViewport
      ? Math.round(window.visualViewport.height)
      : window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.height = `${H}px`;
    COLS = Math.ceil(W / CW) + 1;
    ROWS = Math.ceil(H / CH) + 1;
    X0 = Math.floor((W - COLS * CW) / 2);
    Y0 = 0;
    litB = new Float32Array(COLS * ROWS);
    litH = new Array(COLS * ROWS);
    touched = [];
    // 폰은 글씨가 불꽃지기 옆에 놓여 아래 자리가 덜 필요하므로 땅을 40px 낮춘다
    const gh =
      H < 560
        ? Math.max(120, H * 0.26)
        : Math.max(210, H * 0.27) - (W < PHONE_W ? 40 : 0);
    groundTop = H - gh;
    const base = Math.round(groundTop / CH);
    hill = [];
    for (let c = 0; c < COLS; c++) {
      const x = c / COLS;
      hill.push(
        base +
          Math.round(
            2.2 * Math.sin(x * 5.1 + 1.3) +
              1.4 * Math.sin(x * 13.7 + 0.4) +
              3 * (Math.abs(x - 0.5) * 2) ** 2 * -1 +
              1
          )
      );
    }
    BL.width = Math.ceil(W / 5);
    BL.height = Math.ceil(H / 5);
    BL2.width = Math.ceil(W / 18);
    BL2.height = Math.ceil(H / 18);
    PC.width = Math.round(W * DPR);
    PC.height = Math.round(H * DPR);
    px.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (keep && oldGround)
      px.drawImage(
        keep,
        0,
        0,
        keep.width,
        keep.height,
        0,
        groundTop - oldGround,
        keep.width / DPR,
        keep.height / DPR
      );
    sprites = new Map();
    levelCache = new Map();
    gCache = new Map();
    buildFabric();
    buildGround();
    updateFire();
    stars = [];
    for (let i = 0; i < Math.round((W * groundTop) / 16000); i++)
      stars.push({
        x: rand(0, W),
        y: rand(20, groundTop - 30),
        f: rand(0.4, 1.4),
        p: rand(0, 7),
      });
    ta.style.bottom = `${Math.max(10, H - groundTop - 60)}px`;
  }

  // ───────── 입력 ─────────
  const disposers: (() => void)[] = [];
  function on(
    target: EventTarget,
    type: string,
    fn: (e: any) => void,
    capture = false
  ) {
    target.addEventListener(type, fn, capture);
    disposers.push(() => target.removeEventListener(type, fn, capture));
  }
  // React 타입에 enterKeyHint 가 없어 속성으로 직접 건다
  ta.setAttribute('enterkeyhint', 'send');
  const toEnd = () => {
    try {
      const n = ta.value.length;
      ta.setSelectionRange(n, n);
    } catch (e) {
      // 선택 범위를 못 잡는 환경
    }
  };
  function focusTa() {
    ta.focus({ preventScroll: true });
    toEnd();
    audio();
  }
  on(ta, 'input', () => {
    audio();
    if (ta.value.includes('\n')) {
      ta.value = ta.value.replace(/\n/g, '');
      fireText();
      return;
    }
    if (ta.value !== groundText) {
      setGround(ta.value);
      tickSnd();
      onHideHint();
    }
  });
  on(ta, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.isComposing) fireText();
      else setTimeout(fireText, 30);
    }
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ].includes(e.key)
    )
      e.preventDefault();
  });
  on(ta, 'compositionend', () => {
    if (ta.value !== groundText) setGround(ta.value);
  });
  on(ta, 'focus', () => setTimeout(toEnd, 0));

  // 하늘 톡 = 불꽃 · 꾹 누르고 문지르면 연발 · 땅 톡 = 글자 쓰기
  let hold: { x: number; y: number; t: number; id: number } | null = null;
  on(cv, 'pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    onCanvasDown();
    audio();
    const x = e.clientX;
    const y = e.clientY;
    onHideHint();
    if (y >= surfaceY(x) - 4) {
      focusTa();
      return;
    }
    fireVolley(x, Math.max(70, y));
    hold = { x, y, t: T, id: e.pointerId };
  });
  // 터치 뒤에 따라오는 mousedown 이 입력칸 포커스를 빼앗아 키보드가 내려가지 않게
  on(cv, 'mousedown', (e: MouseEvent) => e.preventDefault());
  on(cv, 'pointermove', (e: PointerEvent) => {
    if (hold && e.pointerId === hold.id) {
      hold.x = e.clientX;
      hold.y = e.clientY;
    }
  });
  const endHold = () => {
    hold = null;
  };
  on(cv, 'pointerup', endHold);
  on(cv, 'pointercancel', endHold);
  on(cv, 'pointerleave', endHold);
  const holdTimer = setInterval(() => {
    if (hold && T - hold.t > 0.32 && hold.y < surfaceY(hold.x) - 4) {
      hold.t = T - 0.12;
      fireVolley(hold.x, Math.max(70, hold.y));
    }
  }, 60);
  on(
    window,
    'keydown',
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (
        document.activeElement !== ta &&
        !e.metaKey &&
        !e.ctrlKey &&
        e.key.length === 1 &&
        e.key !== ' '
      ) {
        focusTa();
      } else if (document.activeElement !== ta && e.key === 'Enter') {
        fireVolley();
      }
    },
    true
  );

  let rT: ReturnType<typeof setTimeout> | undefined;
  on(window, 'resize', () => {
    clearTimeout(rT);
    rT = setTimeout(layout, 100);
  });
  if (window.visualViewport)
    on(window.visualViewport, 'resize', () => {
      clearTimeout(rT);
      rT = setTimeout(layout, 60);
      window.scrollTo(0, 0);
    });
  on(document, 'visibilitychange', () => {
    if (!document.hidden) {
      last = performance.now();
      nextAuto = T + 0.6;
    }
  });

  function boot() {
    if (destroyed) return;
    layout();
    if (!matchMedia('(pointer:coarse)').matches) focusTa();
    const text = Array.from(initialText || '')
      .slice(0, KNIT_FIRE_TEXT_MAX)
      .join('')
      .trim();
    if (text) {
      ta.value = text;
      setGround(text);
      later(0.9, fireText);
    } else later(0.4, () => randomFire(W * 0.5, null, { type: 'peony' }));
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  // 로고는 로고 모양 불꽃에만 쓰인다. 이미지 응답이 늦거나 오지 않아도 화면이 멈춰 있지 않게
  // 기다리지 않고 시작하고, 그때까지 로고 불꽃은 하트로 대신한다.
  logoImg.src = KNIT_FIRE_LOGO_SRC;
  raf = requestAnimationFrame(boot);

  return {
    setYarn(id) {
      S.yarn = id;
      store();
      buildGround();
      launch(W / 2, randomTarget().y, 'peony', palette());
    },
    setSky(id) {
      S.sky = id;
      store();
      buildFabric();
      buildGround();
    },
    setAmount(amount) {
      S.amount = amount;
      store();
      nextAuto = T + 0.3;
    },
    setSound(soundOn) {
      S.sound = soundOn;
      store();
      if (S.sound) audio();
    },
    sweep() {
      px.clearRect(0, 0, W, H);
      settled = 0;
    },
    fireText,
    fireMass,
    audio,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearInterval(holdTimer);
      clearTimeout(rT);
      disposers.forEach((off) => off());
      parts = [];
      if (AC) AC.close();
      bodyStyle.background = prevBody.background;
      bodyStyle.overflow = prevBody.overflow;
      bodyStyle.overscrollBehavior = prevBody.overscrollBehavior;
    },
  };
}
