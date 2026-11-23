import { Grid, RAMP } from '../ascii/stage/grid';
import type { Glyph } from './draw';

const FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
// 칸 하나의 폭(px)과 가로 칸 수의 범위. 좁은 화면에서도 56칸은 확보하고, 넓은 화면에서는 220칸에서 멈춘다.
// 글자 그림(주인공, 무리)이 읽혀야 해서 아스키 작품보다 칸이 크다.
const CELL = 7;
const COLS = [56, 220];
const ATLAS = 2048;

// 글자 격자를 캔버스에 찍는 붓. 매 프레임 글자를 새로 쓰면 느려서,
// (글자, 색) 조합을 글자 판에 한 번만 그려 두고 다음부터는 복사한다.
export function createInk(cv: HTMLCanvasElement, glow: HTMLCanvasElement) {
  const ctx = cv.getContext('2d');
  const gctx = glow.getContext('2d');
  const atlas = document.createElement('canvas');
  const actx = atlas.getContext('2d');
  if (!ctx || !gctx || !actx) return null;
  atlas.width = ATLAS;
  atlas.height = ATLAS;

  const slots = new Map<number, number>();
  let dpr = 1;
  let cellW = 0;
  let cellH = 0;
  let top = 0;
  let slotW = 1;
  let slotH = 1;
  let perRow = 1;
  let room = 1;

  // 색은 채널마다 32단계로 줄여서 조합 수를 묶어 둔다
  const glyph = (ch: number, key: number) => {
    const id = ch * 32768 + key;
    let slot = slots.get(id);
    if (slot !== undefined) return slot;
    // 판이 다 차면 비우고 처음부터 다시 채운다
    if (slots.size >= room) {
      actx.clearRect(0, 0, ATLAS, ATLAS);
      slots.clear();
    }
    slot = slots.size;
    slots.set(id, slot);
    actx.font = `${(cellW / 0.6) * dpr}px ${FONT}`;
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';
    actx.fillStyle = `rgb(${(key >> 10) << 3},${((key >> 5) & 31) << 3},${(key & 31) << 3})`;
    actx.fillText(String.fromCharCode(ch), (slot % perRow) * slotW + slotW / 2, Math.floor(slot / perRow) * slotH + slotH / 2);
    return slot;
  };

  return {
    // 화면 크기에 맞춰 격자와 캔버스를 다시 잡는다
    // 세계 격자는 사방으로 한 칸씩 더 잡는다. 칸 사이로 밀어서 그려도 가장자리가 비지 않는다.
    fit(grid: Grid, hud: Grid, W: number, H: number) {
      if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cols = Math.max(COLS[0], Math.min(COLS[1], Math.round(W / CELL)));
      cellW = W / cols;
      cellH = (cellW / 0.6) * 1.12;
      const rows = Math.max(12, Math.floor(H / cellH));
      top = (H - rows * cellH) / 2;
      grid.resize(cols + 2, rows + 2, cellH / cellW);
      hud.resize(cols, rows, cellH / cellW);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      glow.width = Math.round(cv.width / 3);
      glow.height = Math.round(cv.height / 3);
      slotW = Math.ceil(cellW * dpr) + 2;
      slotH = Math.ceil(cellH * dpr) + 2;
      perRow = Math.floor(ATLAS / slotW);
      room = perRow * Math.floor(ATLAS / slotH);
      actx.clearRect(0, 0, ATLAS, ATLAS);
      slots.clear();
    },
    // 세계를 (fx, fy)칸만큼 밀어서 그리고, 그 위에 칸 사이의 글자들과 붙박인 HUD를 얹는다
    draw(grid: Grid, fx: number, fy: number, sprites: Glyph[], hud: Grid) {
      const { cols, lum, rgb, ch } = grid;
      const w = cellW * dpr;
      const h = cellH * dpr;
      const y0 = top * dpr;
      const blit = (c: number, key: number, x: number, y: number) => {
        const slot = glyph(c, key);
        ctx.drawImage(atlas, (slot % perRow) * slotW, Math.floor(slot / perRow) * slotH, slotW, slotH, Math.round(x) - 1, Math.round(y) - 1, slotW, slotH);
      };
      const tint = (r: number, g: number, b: number, l: number) => {
        const k = 0.3 + 0.7 * l;
        return (((r * k) >> 3) << 10) | (((g * k) >> 3) << 5) | ((b * k) >> 3);
      };
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < lum.length; i++) {
        if (lum[i] <= 0.02) continue;
        const l = lum[i] > 1 ? 1 : lum[i];
        const c = ch[i] || RAMP.charCodeAt(Math.round(l * (RAMP.length - 1)));
        if (c === 32) continue;
        blit(c, tint(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], l), ((i % cols) - 1 - fx) * w, y0 + (Math.floor(i / cols) - 1 - fy) * h);
      }
      // 움직이는 글자는 제 칸의 밑그림을 지우고 얹는다. 지우지 않으면 풀이나 다른 글자와 겹쳐 읽을 수 없다.
      for (const s of sprites) {
        if (s.lum <= 0.02) continue;
        ctx.clearRect(Math.round((s.x - 1) * w), Math.round(y0 + (s.y - 1) * h), Math.ceil(w), Math.ceil(h));
        blit(s.ch, tint(s.r, s.g, s.b, Math.min(1, s.lum)), (s.x - 1) * w, y0 + (s.y - 1) * h);
      }
      // HUD가 쓴 칸은 밑그림을 지우고 그 위에 쓴다
      for (let i = 0; i < hud.lum.length; i++) {
        if (hud.z[i] === Infinity) continue;
        const x = (i % hud.cols) * w;
        const y = y0 + Math.floor(i / hud.cols) * h;
        ctx.clearRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
        if (hud.lum[i] > 0.02 && hud.ch[i] !== 32) blit(hud.ch[i], tint(hud.rgb[i * 3], hud.rgb[i * 3 + 1], hud.rgb[i * 3 + 2], Math.min(1, hud.lum[i])), x, y);
      }
      // 번짐: 같은 그림을 작게 줄여 흐리게 겹친다
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.drawImage(cv, 0, 0, glow.width, glow.height);
    },
  };
}
