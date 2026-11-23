import { Grid, RAMP } from '../ascii/stage/grid';

const FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
// 칸 하나의 폭(px)과 가로 칸 수의 범위. 좁은 화면에서도 84칸은 확보하고, 넓은 화면에서는 280칸에서 멈춘다.
const CELL = 5;
const COLS = [84, 280];
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
    fit(grid: Grid, W: number, H: number) {
      if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cols = Math.max(COLS[0], Math.min(COLS[1], Math.round(W / CELL)));
      cellW = W / cols;
      cellH = (cellW / 0.6) * 1.12;
      const rows = Math.max(12, Math.floor(H / cellH));
      top = (H - rows * cellH) / 2;
      grid.resize(cols, rows, cellH / cellW);
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
    // 화면의 한 점(px)이 몇 번째 칸인지
    toCell(clientX: number, clientY: number) {
      const box = cv.getBoundingClientRect();
      return { x: (clientX - box.left) / cellW, y: (clientY - box.top - top) / cellH };
    },
    draw(grid: Grid) {
      const { cols, lum, rgb, ch } = grid;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < lum.length; i++) {
        if (lum[i] <= 0.02) continue;
        const l = lum[i] > 1 ? 1 : lum[i];
        const c = ch[i] || RAMP.charCodeAt(Math.round(l * (RAMP.length - 1)));
        if (c === 32) continue;
        const k = 0.3 + 0.7 * l;
        const key = (((rgb[i * 3] * k) >> 3) << 10) | (((rgb[i * 3 + 1] * k) >> 3) << 5) | ((rgb[i * 3 + 2] * k) >> 3);
        const slot = glyph(c, key);
        ctx.drawImage(
          atlas,
          (slot % perRow) * slotW,
          Math.floor(slot / perRow) * slotH,
          slotW,
          slotH,
          Math.round((i % cols) * cellW * dpr) - 1,
          Math.round((top + Math.floor(i / cols) * cellH) * dpr) - 1,
          slotW,
          slotH
        );
      }
      // 번짐: 같은 그림을 작게 줄여 흐리게 겹친다
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.drawImage(cv, 0, 0, glow.width, glow.height);
    },
  };
}
