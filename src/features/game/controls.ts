import type { Input } from './engine';

export type Action = 'attack' | 'dash' | 'wave' | 'spin' | 'potion' | 'start';

// 글자가 아니라 자판 위치(code)로 읽어야 한글 입력 상태에서도 움직인다
const KEYS: Record<string, Action> = {
  KeyJ: 'attack',
  Space: 'dash',
  ShiftLeft: 'dash',
  KeyK: 'wave',
  Digit1: 'wave',
  KeyL: 'spin',
  Digit2: 'spin',
  KeyQ: 'potion',
  Digit3: 'potion',
  Enter: 'start',
};
const MOVES: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
// 누른 입력은 이만큼 기억해 둔다. 쿨다운이 끝나기 직전에 눌러도 끝나자마자 나간다.
const BUFFER = 0.15;
// 조이스틱을 끝까지 민 것으로 치는 거리(px)
const STICK = 50;

interface Point {
  x: number;
  y: number;
}

// 자판, 마우스, 터치를 한 틱의 입력으로 모은다.
// field는 마우스로 조준하고 베는 곳, pad는 손가락을 대면 조이스틱이 되는 곳이다.
export function createControls(field: HTMLElement, pad: HTMLElement) {
  const held = new Set<string>();
  const holding: Partial<Record<Action, boolean>> = {};
  const pressed: Partial<Record<Action, number>> = {};
  let mouse: Point | null = null;
  let stick: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  let clock = 0;

  const press = (a: Action, down: boolean) => {
    holding[a] = down;
    if (down) pressed[a] = clock;
  };
  const onKey = (e: KeyboardEvent) => {
    const down = e.type === 'keydown';
    if (MOVES[e.code]) {
      if (down) held.add(e.code);
      else held.delete(e.code);
      e.preventDefault();
    }
    const a = KEYS[e.code];
    if (a) {
      if (!e.repeat) press(a, down);
      e.preventDefault();
    }
  };
  // 창이 초점을 잃으면 keyup이 오지 않으므로 누르고 있던 것을 모두 뗀다
  const onBlur = () => {
    held.clear();
    for (const a of Object.keys(holding) as Action[]) holding[a] = false;
  };
  const onMouseMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY };
  };
  const onMouseDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button === 0) press('attack', true);
  };
  const onMouseUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') press('attack', false);
  };
  // 손가락을 댄 자리가 조이스틱의 가운데가 된다
  const onPadDown = (e: PointerEvent) => {
    pad.setPointerCapture(e.pointerId);
    stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
  };
  const onPadMove = (e: PointerEvent) => {
    if (!stick || stick.id !== e.pointerId) return;
    const dx = (e.clientX - stick.ox) / STICK;
    const dy = (e.clientY - stick.oy) / STICK;
    const len = Math.max(1, Math.hypot(dx, dy));
    stick.x = dx / len;
    stick.y = dy / len;
  };
  const onPadUp = (e: PointerEvent) => {
    if (stick?.id === e.pointerId) stick = null;
  };

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointerup', onMouseUp);
  field.addEventListener('pointermove', onMouseMove);
  field.addEventListener('pointerdown', onMouseDown);
  pad.addEventListener('pointerdown', onPadDown);
  pad.addEventListener('pointermove', onPadMove);
  pad.addEventListener('pointerup', onPadUp);
  pad.addEventListener('pointercancel', onPadUp);

  return {
    press,
    // 입력 기억에 쓰는 시계를 흘린다
    tick(dt: number) {
      clock += dt;
    },
    // 마우스가 가리키는 화면 자리(px). 마우스를 쓴 적이 없으면 null이다.
    pointer: () => mouse,
    // aim은 조준하는 세계 좌표다
    read(aim: Point | null): Input {
      let mx = stick?.x ?? 0;
      let my = stick?.y ?? 0;
      for (const key of held) {
        mx += MOVES[key][0];
        my += MOVES[key][1];
      }
      const on = (a: Action) => Boolean(holding[a]) || clock - (pressed[a] ?? -9) < BUFFER;
      return { mx, my, aim, attack: on('attack'), dash: on('dash'), wave: on('wave'), spin: on('spin'), potion: on('potion'), start: on('start') };
    },
    dispose() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerup', onMouseUp);
      field.removeEventListener('pointermove', onMouseMove);
      field.removeEventListener('pointerdown', onMouseDown);
      pad.removeEventListener('pointerdown', onPadDown);
      pad.removeEventListener('pointermove', onPadMove);
      pad.removeEventListener('pointerup', onPadUp);
      pad.removeEventListener('pointercancel', onPadUp);
    },
  };
}
