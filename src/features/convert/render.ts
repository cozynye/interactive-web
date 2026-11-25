import { ASPECT, Glyphs, normalize, rowsFor, stretch, SX, SY, toGlyphs } from './shape';

const FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
// 글자 모양을 잴 때 쓰는 칸 크기(px). 세로는 구역 셋으로 나누어떨어지게 잡는다.
const PROBE_W = 30;
const PROBE_H = SY * Math.round((PROBE_W * ASPECT) / SY);
// 내보내는 그림의 가로 폭 한도(px)와 칸 폭의 범위(px)
const MAX_W = 2400;
const CELL = [6, 16];

export interface Art {
  cols: number;
  rows: number;
  ch: Uint16Array;
  // 칸마다 원본의 평균 색(0~255)과 잉크 양(0~1)
  rgb: Uint8Array;
  ink: Float32Array;
}

export interface Look {
  // 원본 색을 입힐지, 한 가지 색으로 쓸지
  color: boolean;
  // 밝은 바탕에 어두운 글자로 쓸지
  light: boolean;
}

let measured: Glyphs | null = null;

// 찍을 수 있는 아스키 글자 95개를 실제 글꼴로 그려 보고 구역마다 잉크가 얼마나 놓이는지 잰다.
// 글꼴마다 모양이 달라서 미리 적어 둔 표를 쓰지 않고 그 브라우저에서 한 번 잰다.
function glyphs() {
  if (measured) return measured;
  const cv = document.createElement('canvas');
  cv.width = PROBE_W;
  cv.height = PROBE_H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.font = `${PROBE_W / 0.6}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const codes: number[] = [];
  for (let c = 32; c < 127; c++) codes.push(c);
  const raw = new Float32Array(codes.length * SX * SY);
  const rw = PROBE_W / SX;
  const rh = PROBE_H / SY;
  codes.forEach((c, g) => {
    ctx.clearRect(0, 0, PROBE_W, PROBE_H);
    ctx.fillText(String.fromCharCode(c), PROBE_W / 2, PROBE_H / 2);
    const px = ctx.getImageData(0, 0, PROBE_W, PROBE_H).data;
    for (let y = 0; y < PROBE_H; y++)
      for (let x = 0; x < PROBE_W; x++)
        raw[g * SX * SY + Math.floor(y / rh) * SX + Math.floor(x / rw)] += px[(y * PROBE_W + x) * 4 + 3];
  });
  measured = normalize(codes, raw);
  return measured;
}

// 그림을 가로 cols칸의 글자 그림으로 옮긴다. w와 h는 원본 크기(px)다.
export function toArt(src: CanvasImageSource, w: number, h: number, cols: number, sharp: number, light: boolean): Art | null {
  const set = glyphs();
  const rows = rowsFor(w, h, cols);
  const cv = document.createElement('canvas');
  cv.width = cols * SX;
  cv.height = rows * SY;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!set || !ctx) return null;
  // 투명한 곳은 바탕색으로 채워서 글자가 놓이지 않게 한다
  ctx.fillStyle = light ? '#fff' : '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  const px = ctx.getImageData(0, 0, cv.width, cv.height).data;

  const lum = new Float32Array(cv.width * cv.height);
  for (let i = 0; i < lum.length; i++) {
    const l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    // 밝은 바탕에서는 어두운 곳에 잉크를 놓는다
    lum[i] = light ? 1 - l : l;
  }
  stretch(lum);

  const rgb = new Uint8Array(cols * rows * 3);
  const ink = new Float32Array(cols * rows);
  const n = SX * SY;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sl = 0;
      for (let y = 0; y < SY; y++)
        for (let x = 0; x < SX; x++) {
          const i = (r * SY + y) * cv.width + c * SX + x;
          sr += px[i * 4];
          sg += px[i * 4 + 1];
          sb += px[i * 4 + 2];
          sl += lum[i];
        }
      const k = r * cols + c;
      rgb[k * 3] = sr / n;
      rgb[k * 3 + 1] = sg / n;
      rgb[k * 3 + 2] = sb / n;
      ink[k] = sl / n;
    }
  return { cols, rows, ch: toGlyphs(lum, cols, rows, set, sharp), rgb, ink };
}

// 글자 그림을 캔버스에 그린다. 캔버스 크기는 여기서 정하고, 이 캔버스를 그대로 PNG로 내보낸다.
export function paint(cv: HTMLCanvasElement, art: Art, look: Look) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const { cols, rows, ch, rgb, ink } = art;
  const cellW = Math.max(CELL[0], Math.min(CELL[1], Math.floor(MAX_W / cols)));
  const cellH = cellW * ASPECT;
  cv.width = cols * cellW;
  cv.height = Math.round(rows * cellH);
  ctx.fillStyle = look.light ? '#fff' : '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = `${cellW / 0.6}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = look.light ? '#1d1d1f' : '#f5f5f7';
  const inks = new Map<number, string>();
  for (let i = 0; i < ch.length; i++) {
    if (ch[i] === 32) continue;
    if (look.color) {
      let r = rgb[i * 3];
      let g = rgb[i * 3 + 1];
      let b = rgb[i * 3 + 2];
      if (look.light) {
        // 흰 바탕에서 묻히지 않게 조금 누른다
        r *= 0.85;
        g *= 0.85;
        b *= 0.85;
      } else {
        // 어두운 칸은 글자가 이미 성기므로 색까지 어두우면 안 보인다. 색조는 살리고 밝기의 바닥을 둔다.
        const k = ((0.45 + 0.55 * ink[i]) * 255) / Math.max(r, g, b, 1);
        r *= k;
        g *= k;
        b *= k;
      }
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let style = inks.get(key);
      if (!style) {
        style = `rgb(${(key >> 10) << 3},${((key >> 5) & 31) << 3},${(key & 31) << 3})`;
        inks.set(key, style);
      }
      ctx.fillStyle = style;
    }
    ctx.fillText(String.fromCharCode(ch[i]), ((i % cols) + 0.5) * cellW, (Math.floor(i / cols) + 0.5) * cellH);
  }
}
