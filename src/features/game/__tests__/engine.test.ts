import { describe, expect, it } from 'vitest';

import { advance, BOSS_HP, createGame, Game, Input, MAX_HP, NO_INPUT, STEP, update, Zone, zoneAt } from '../engine';

const DT = STEP;
const run = (g: Game, seconds: number, input: Partial<Input> | ((i: number) => Partial<Input>) = {}) => {
  for (let i = 0; i < seconds * 60; i++) update(g, { ...NO_INPUT, ...(typeof input === 'function' ? input(i) : input) }, DT);
};
const started = () => {
  const g = createGame(1);
  update(g, { ...NO_INPUT, start: true }, DT);
  // 보스가 먼저 움직이지 않게 붙잡아 둔다
  g.boss.wait = 999;
  return g;
};
const circle = (x: number, y: number): Zone => ({ kind: 'circle', x, y, r: 5, r2: 0, ang: 0, half: 0, t: 0, warn: 0.5, dmg: 20, hit: false, seek: false });

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

describe('전투', () => {
  it('시작 입력이 있어야 전투가 시작된다', () => {
    const g = createGame(1);
    run(g, 1);
    expect(g.phase).toBe('title');
    update(g, { ...NO_INPUT, start: true }, DT);
    expect(g.phase).toBe('fight');
  });

  it('범위 안에 서 있으면 예고가 끝나는 순간 한 번만 맞는다', () => {
    const g = started();
    g.zones.push(circle(g.player.x, g.player.y));
    run(g, 0.4);
    expect(g.player.hp).toBe(MAX_HP);
    run(g, 0.6);
    expect(g.player.hp).toBe(MAX_HP - 20);
    expect(g.zones).toHaveLength(0);
  });

  it('구르는 동안에는 맞지 않는다', () => {
    const g = started();
    g.zones.push({ ...circle(g.player.x, g.player.y), r: 30 });
    run(g, 0.4);
    // 터지기 직전에 구른다
    run(g, 0.3, (i) => ({ dash: i === 4, mx: 1 }));
    expect(g.player.hp).toBe(MAX_HP);
  });

  it('닿는 거리에서 보스를 보고 베면 체력이 깎이고, 멀면 깎이지 않는다', () => {
    const g = started();
    run(g, 0.5, { attack: true });
    expect(g.boss.hp).toBe(BOSS_HP);
    g.player.x = g.boss.x;
    g.player.y = g.boss.y + 7;
    run(g, 0.5, { attack: true });
    expect(g.boss.hp).toBeLessThan(BOSS_HP);
  });

  it('보스 체력이 반이 되면 포효하고, 포효하는 동안은 피해를 받지 않는다', () => {
    const g = started();
    g.boss.hp = BOSS_HP / 2 + 1;
    g.player.x = g.boss.x;
    g.player.y = g.boss.y + 7;
    run(g, 0.2, { attack: true });
    expect(g.boss.enraged).toBe(true);
    const hp = g.boss.hp;
    run(g, 1, { attack: true });
    expect(g.boss.hp).toBe(hp);
  });

  it('보스가 쓰러지면 이기고, 내가 쓰러지면 진다. 다시 시작하면 처음 상태가 된다', () => {
    const won = started();
    won.boss.hp = 1;
    won.player.x = won.boss.x;
    won.player.y = won.boss.y + 7;
    run(won, 0.5, { attack: true });
    expect(won.phase).toBe('won');

    const lost = started();
    lost.player.hp = 5;
    lost.zones.push(circle(lost.player.x, lost.player.y));
    run(lost, 1);
    expect(lost.phase).toBe('lost');
    run(lost, 1.5);
    update(lost, { ...NO_INPUT, start: true }, DT);
    expect(lost.phase).toBe('fight');
    expect(lost.player.hp).toBe(MAX_HP);
    expect(lost.boss.hp).toBe(BOSS_HP);
  });

  it('아무렇게나 3분을 싸워도 값이 깨지지 않는다', () => {
    const g = createGame(3);
    run(g, 180, (i) => ({
      start: i % 600 === 0,
      mx: Math.sin(i * 0.013),
      my: Math.cos(i * 0.017),
      attack: i % 3 === 0,
      dash: i % 90 === 0,
      wave: i % 200 === 0,
      spin: i % 500 === 0,
      potion: i % 700 === 0,
    }));
    const nums = [g.player.x, g.player.y, g.player.hp, g.player.mp, g.boss.x, g.boss.y, g.boss.hp, g.boss.face, ...g.zones.flatMap((z) => [z.x, z.y, z.t])];
    expect(nums.every(Number.isFinite)).toBe(true);
  });

  it('흐른 시간을 고정 간격으로 나눠 진행하고 자투리를 남긴다', () => {
    const g = started();
    let calls = 0;
    const left = advance(g, () => (calls++, NO_INPUT), STEP * 3.5);
    expect(calls).toBe(3);
    expect(left).toBeCloseTo(STEP * 0.5);
    expect(g.t).toBeCloseTo(STEP * 3);
  });
});
