import { describe, expect, it } from 'vitest';

import { pilot } from '../bot';
import { BOSS_AT, BOSS_HP, createGame, Enemy, Game, Input, KINDS, MAX_HP, needFor, NO_INPUT, STEP, step, update, Zone, zoneAt } from '../engine';

const DT = STEP;
const run = (g: Game, seconds: number, input: Partial<Input> | ((i: number) => Partial<Input>) = {}) => {
  for (let i = 0; i < seconds * 60; i++) update(g, { ...NO_INPUT, ...(typeof input === 'function' ? input(i) : input) }, DT);
};
// 무리가 저절로 나타나지 않게 붙잡아 둔 싸움
const started = () => {
  const g = createGame(1);
  update(g, { ...NO_INPUT, start: true }, DT);
  g.spawn = 999;
  g.eliteAt = 999;
  return g;
};
const circle = (x: number, y: number): Zone => ({ kind: 'circle', x, y, r: 5, r2: 0, ang: 0, half: 0, t: 0, warn: 0.5, dmg: 20, hit: false, seek: false });
const mob = (x: number, y: number, kind = 0): Enemy => ({ kind, x, y, hp: KINDS[kind].hp, max: KINDS[kind].hp, elite: false, flash: 0, kx: 0, ky: 0, orbitCd: 0 });

describe('범위 판정', () => {
  it('원, 고리, 부채꼴, 직선의 안팎을 가린다', () => {
    const base = circle(0, 0);
    expect(zoneAt(base, 3, 0)).toBeGreaterThanOrEqual(0);
    expect(zoneAt(base, 6, 0)).toBe(-1);
    const ring: Zone = { ...base, kind: 'ring', r: 10, r2: 4 };
    expect(zoneAt(ring, 2, 0)).toBe(-1);
    expect(zoneAt(ring, 7, 0)).toBeGreaterThanOrEqual(0);
    const cone: Zone = { ...base, kind: 'cone', r: 10, half: 0.5, ang: 0 };
    expect(zoneAt(cone, 5, 0)).toBeGreaterThanOrEqual(0);
    expect(zoneAt(cone, 0, 5)).toBe(-1);
    const line: Zone = { ...base, kind: 'line', r: 20, r2: 4, ang: Math.PI / 2 };
    expect(zoneAt(line, 0, 10)).toBeGreaterThanOrEqual(0);
    expect(zoneAt(line, 5, 10)).toBe(-1);
  });
});

describe('생존', () => {
  it('시작 입력이 있어야 싸움이 시작된다', () => {
    const g = createGame(1);
    run(g, 1);
    expect(g.phase).toBe('title');
    update(g, { ...NO_INPUT, start: true }, DT);
    expect(g.phase).toBe('fight');
  });

  it('검은 저절로 나가서 닿는 거리의 적을 베고, 먼 적은 베지 못한다', () => {
    const g = started();
    g.enemies.push(mob(4, 0), mob(30, 0, 3));
    run(g, 0.6);
    expect(g.player.kills).toBe(1);
    expect(g.enemies).toHaveLength(1);
    expect(g.enemies[0].hp).toBe(KINDS[3].hp);
  });

  it('쓰러진 적은 구슬을 떨구고, 구슬을 주우면 경험치가 쌓인다', () => {
    const g = started();
    g.gems.push({ x: 3, y: 0, xp: 2, pulled: false });
    run(g, 0.5);
    expect(g.gems).toHaveLength(0);
    expect(g.player.xp).toBe(2);
  });

  it('경험치가 차면 싸움이 멈추고 셋 중 하나를 골라야 이어진다', () => {
    const g = started();
    g.gems.push({ x: 1, y: 0, xp: needFor(1), pulled: false });
    run(g, 0.2);
    expect(g.phase).toBe('levelup');
    expect(g.player.level).toBe(2);
    expect(g.choices).toHaveLength(3);
    const t = g.t;
    run(g, 1);
    expect(g.t).toBe(t);
    const id = g.choices[1];
    const before = g.player.lv[id];
    update(g, { ...NO_INPUT, pick: 2 }, DT);
    expect(g.phase).toBe('fight');
    expect(g.player.lv[id]).toBe(before + 1);
  });

  it('상자를 열면 경험치와 상관없이 하나를 고른다', () => {
    const g = started();
    g.gems.push({ x: 1, y: 0, xp: -1, pulled: false });
    run(g, 0.2);
    expect(g.phase).toBe('levelup');
    expect(g.player.level).toBe(1);
  });

  it('적에게 닿으면 다치고, 구르는 동안에는 다치지 않는다', () => {
    const hit = started();
    hit.player.lv.sword = 0;
    hit.enemies.push(mob(0.5, 0, 3));
    run(hit, 0.2);
    expect(hit.player.hp).toBe(MAX_HP - KINDS[3].dmg);

    const safe = started();
    safe.player.lv.sword = 0;
    safe.zones.push({ ...circle(0, 0), r: 30 });
    run(safe, 0.4);
    // 터지기 직전에 구른다
    run(safe, 0.3, (i) => ({ dash: i === 4, mx: 1 }));
    expect(safe.player.hp).toBe(MAX_HP);
  });

  it('용은 정해진 시각에 나타나고, 체력이 반이 되면 포효하며 그동안은 피해를 받지 않는다', () => {
    const g = started();
    expect(g.boss.here).toBe(false);
    g.t = BOSS_AT;
    run(g, 0.1);
    expect(g.boss.here).toBe(true);
    // 포효가 끝난 뒤 용 곁에 서서 벤다
    g.boss.roar = 0;
    g.boss.wait = 999;
    g.boss.hp = BOSS_HP / 2 + 1;
    g.player.x = g.boss.x;
    g.player.y = g.boss.y + 7;
    run(g, 1.2);
    expect(g.boss.enraged).toBe(true);
    const hp = g.boss.hp;
    run(g, 0.3);
    expect(g.boss.hp).toBe(hp);
  });

  it('용이 쓰러지면 이기고, 내가 쓰러지면 진다. 다시 시작하면 처음 상태가 된다', () => {
    const won = started();
    won.t = BOSS_AT;
    run(won, 0.1);
    Object.assign(won.boss, { roar: 0, wait: 999, hp: 1 });
    won.player.x = won.boss.x;
    won.player.y = won.boss.y + 7;
    run(won, 1.2);
    expect(won.phase).toBe('won');

    const lost = started();
    lost.player.hp = 5;
    lost.player.lv.sword = 0;
    lost.enemies.push(mob(0.5, 0));
    run(lost, 1);
    expect(lost.phase).toBe('lost');
    run(lost, 1.5);
    update(lost, { ...NO_INPUT, start: true }, DT);
    expect(lost.phase).toBe('fight');
    expect(lost.player.hp).toBe(MAX_HP);
    expect(lost.player.level).toBe(1);
  });

  it('자동 조종으로 끝까지 가도 값이 깨지지 않고, 용을 만날 때까지 여러 단계가 오른다', () => {
    const g = createGame(2);
    let met = 0;
    for (let i = 0; i < 60 * 400 && g.phase !== 'won' && g.phase !== 'lost'; i++) {
      update(g, pilot(g), DT);
      if (g.boss.here && !met) met = g.player.level;
    }
    expect(met).toBeGreaterThan(6);
    expect(g.enemies.length).toBeLessThan(400);
    const nums = [g.player.x, g.player.y, g.player.hp, g.player.xp, g.boss.x, g.boss.y, g.boss.hp, g.boss.face, ...g.enemies.flatMap((e) => [e.x, e.y, e.hp]), ...g.zones.flatMap((z) => [z.x, z.y, z.t])];
    expect(nums.every(Number.isFinite)).toBe(true);
  });

  it('긴 프레임은 STEP을 넘지 않는 같은 길이의 틱으로 나눠 진행하고 시간을 남기지 않는다', () => {
    const g = started();
    let calls = 0;
    step(g, () => (calls++, NO_INPUT), STEP * 3.5);
    expect(calls).toBe(4);
    expect(g.t).toBeCloseTo(STEP * 3.5);
    step(g, () => (calls++, NO_INPUT), STEP / 2);
    expect(calls).toBe(5);
  });
});
