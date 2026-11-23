import { Grid, Scene } from '../ascii/stage/grid';
import { pilot } from './bot';
import { createPainter, follow, View } from './draw';
import { createGame, step } from './engine';

// 홈 타일에 띄우는 시연. 사람 대신 간단한 규칙(bot.ts)이 조종한다.
export function createDragonDemo(): Scene {
  const game = createGame(11);
  const paint = createPainter();
  const view: View = { x: 0, y: 0, pull: 0, lift: 0 };

  return {
    cell: 7,
    trail: 0,
    frame(g: Grid, t: number, dt: number) {
      step(game, () => pilot(game), Math.min(0.1, dt));
      follow(view, game, 0.3, dt);
      paint(g, game, view, t);
    },
  };
}
