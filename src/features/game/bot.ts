import { Game, Input, NO_INPUT, sizeOf, UPGRADES, zoneAt } from './engine';

// 사람 대신 조종하는 간단한 규칙. 홈 타일의 시연과 균형을 재는 테스트가 쓴다.
// 칼이 닿는 거리에서 적을 상대하다가 너무 붙으면 물러나고, 구슬 쪽으로 끌리고, 붉은 범위에서는 빠져나온다. 단계가 오르면 무기를 먼저 고른다.
export function pilot(game: Game): Input {
  const p = game.player;
  const b = game.boss;
  if (game.phase === 'levelup') {
    const at = game.choices.findIndex((id) => UPGRADES[id].weapon);
    return { ...NO_INPUT, pick: (at < 0 ? 0 : at) + 1 };
  }
  if (game.phase !== 'fight') return { ...NO_INPUT, start: true };
  let mx = 0;
  let my = 0;
  let crowd = 0;
  let near = 99;
  for (const e of game.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.max(0.5, Math.hypot(dx, dy) - sizeOf(e));
    if (d < near) near = d;
    // 칼이 닿는 거리 안쪽으로 들어온 적에게서만 물러난다
    if (d > 5) continue;
    mx += dx / (d * d * d);
    my += dy / (d * d * d);
    if (d < 2.5) crowd++;
  }
  // 가까운 구슬 쪽으로 조금 끌린다
  let best = 18;
  let gem = null;
  for (const m of game.gems) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < best) {
      best = d;
      gem = m;
    }
  }
  if (gem) {
    mx += ((gem.x - p.x) / best) * 0.06;
    my += ((gem.y - p.y) / best) * 0.06;
  }
  if (b.here) {
    // 용과는 12쯤 떨어진 채 옆으로 돈다
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    mx += (-dy / d) * 0.08 + (dx / d) * (12 - d) * 0.03;
    my += (dx / d) * 0.08 + (dy / d) * (12 - d) * 0.03;
  }
  let dash = crowd >= 4;
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
  const len = Math.hypot(mx, my);
  // 둘레가 비어 있으면 천천히 한쪽으로 걷는다
  if (len < 0.004) return { ...NO_INPUT, mx: Math.cos(game.t * 0.3), my: Math.sin(game.t * 0.3), dash };
  return { ...NO_INPUT, mx: mx / len, my: my / len, dash };
}
