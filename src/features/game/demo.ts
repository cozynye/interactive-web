import { Grid, Scene } from '../ascii/stage/grid';
import { createPainter, follow, snap, View } from './draw';
import { advance, createGame, Input, NO_INPUT, zoneAt } from './engine';

// 홈 타일에 띄우는 시연. 사람 대신 간단한 규칙이 조종한다: 용 둘레를 돌며 베고, 범위에 들면 빠져나오고, 못 빠져나오면 구른다.
export function createDragonDemo(): Scene {
  const game = createGame(11);
  const paint = createPainter();
  const view: View = { x: 0, y: 4, aim: null };
  let acc = 0;

  const pilot = (): Input => {
    const p = game.player;
    const b = game.boss;
    if (game.phase !== 'fight') return { ...NO_INPUT, start: true };
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    // 용에게서 7쯤 떨어진 채 옆으로 돈다
    let mx = -dy / d + (dx / d) * (7.5 - d) * 0.5;
    let my = dx / d + (dy / d) * (7.5 - d) * 0.5;
    let dash = false;
    for (const z of game.zones) {
      if (z.t < 0 || z.hit || zoneAt(z, p.x, p.y, 1.5) < 0) continue;
      // 원은 바깥으로, 고리는 안쪽으로, 부채꼴과 직선은 옆으로 피한다
      const ox = p.x - z.x;
      const oy = p.y - z.y;
      const od = Math.hypot(ox, oy) || 1;
      if (z.kind === 'circle') [mx, my] = [ox / od, oy / od];
      else if (z.kind === 'ring') [mx, my] = [-ox / od, -oy / od];
      else {
        const side = -ox * Math.sin(z.ang) + oy * Math.cos(z.ang) >= 0 ? 1 : -1;
        [mx, my] = [-Math.sin(z.ang) * side, Math.cos(z.ang) * side];
      }
      dash = z.warn - z.t < 0.22;
    }
    return { ...NO_INPUT, mx, my, attack: true, dash, wave: d > 11, spin: d < 9, potion: p.hp < 40 };
  };

  return {
    cell: 5,
    trail: 0,
    frame(g: Grid, t: number, dt: number) {
      acc = advance(game, pilot, acc + Math.min(0.1, dt));
      follow(view, game, 0.4, dt);
      paint(g, game, snap(g, view), t);
    },
  };
}
