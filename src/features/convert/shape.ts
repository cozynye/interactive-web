// 칸 하나를 가로 2 × 세로 3 구역으로 나눠서 본다. 밝기 하나로 글자를 고르면 윤곽이 뭉개지기 때문에,
// 구역 여섯 곳의 밝기를 한 묶음(모양)으로 보고 잉크가 놓인 자리가 가장 닮은 글자를 찾는다.
// Alex Harri의 "ASCII characters are not pixels"(alexharri.com/blog/ascii-rendering)에 나온 방식이다.
export const SX = 2;
export const SY = 3;
const DIM = SX * SY;
// 칸 세로 ÷ 가로. 아스키 무대와 같은 비율이다.
export const ASPECT = 1.12 / 0.6;

export interface Glyphs {
  codes: number[];
  // 글자마다 구역 여섯 곳의 잉크 양(0~1)
  shapes: Float32Array;
}

// 잰 잉크 양을 구역별로 가장 진한 글자가 1이 되게 맞춘다. 글꼴의 어떤 글자도 구역을 다 채우지는 못해서,
// 맞추지 않으면 밝은 곳에서 고를 글자가 없다.
export function normalize(codes: number[], raw: Float32Array): Glyphs {
  const shapes = new Float32Array(raw.length);
  for (let d = 0; d < DIM; d++) {
    let max = 0;
    for (let i = d; i < raw.length; i += DIM) if (raw[i] > max) max = raw[i];
    if (max <= 0) continue;
    for (let i = d; i < raw.length; i += DIM) shapes[i] = raw[i] / max;
  }
  return { codes, shapes };
}

// 그림 비율을 지키는 줄 수
export const rowsFor = (w: number, h: number, cols: number) =>
  Math.max(1, Math.round((cols * h) / w / ASPECT));

// 밝기를 그림 안에서 가장 어두운 2%와 가장 밝은 2% 사이로 펴서 0~1을 다 쓰게 한다
export function stretch(lum: Float32Array) {
  const bins = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) bins[Math.min(255, Math.max(0, Math.floor(lum[i] * 255)))]++;
  const cut = lum.length * 0.02;
  let lo = 0;
  let hi = 255;
  for (let n = bins[0]; n < cut && lo < 255; n += bins[lo]) lo++;
  for (let n = bins[255]; n < cut && hi > 0; n += bins[hi]) hi--;
  // 한 가지 밝기뿐인 그림은 펼 것이 없다
  if (hi - lo < 8) return;
  const a = lo / 255;
  const k = 255 / (hi - lo);
  for (let i = 0; i < lum.length; i++) {
    const v = (lum[i] - a) * k;
    lum[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
}

// 밝기 그림(가로 cols×SX, 세로 rows×SY)을 칸마다 글자 하나로 옮긴다.
// sharp가 1보다 크면 칸 안에서 어두운 구역을 더 어둡게 눌러서 경계에 걸친 칸이 선 글자로 떨어진다.
export function toGlyphs(lum: Float32Array, cols: number, rows: number, glyphs: Glyphs, sharp = 1) {
  const { codes, shapes } = glyphs;
  const out = new Uint16Array(cols * rows);
  const v = new Float32Array(DIM);
  const w = cols * SX;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let max = 0;
      for (let y = 0; y < SY; y++)
        for (let x = 0; x < SX; x++) {
          const s = lum[(r * SY + y) * w + c * SX + x];
          v[y * SX + x] = s;
          if (s > max) max = s;
        }
      if (sharp > 1 && max > 0) for (let d = 0; d < DIM; d++) v[d] = Math.pow(v[d] / max, sharp) * max;
      let best = 0;
      let near = Infinity;
      for (let g = 0; g < codes.length; g++) {
        let dist = 0;
        for (let d = 0; d < DIM; d++) {
          const e = v[d] - shapes[g * DIM + d];
          dist += e * e;
        }
        if (dist < near) {
          near = dist;
          best = g;
        }
      }
      out[r * cols + c] = codes[best];
    }
  return out;
}

// 줄 끝의 빈칸은 떼고 줄바꿈으로 잇는다
export function toText(ch: Uint16Array, cols: number) {
  const lines: string[] = [];
  for (let i = 0; i < ch.length; i += cols)
    lines.push(String.fromCharCode(...ch.subarray(i, i + cols)).replace(/ +$/, ''));
  return lines.join('\n');
}
