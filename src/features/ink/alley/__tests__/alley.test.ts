import { describe, expect, it } from 'vitest';

import { palette } from '../../lib/daynight';
import { gait } from '../../lib/gait';
import { arc, clock, moonAt, period, sunAt, tauOf } from '../kit';

describe('골목의 시각', () => {
  it('하루 중 시각을 오전·오후로 적는다', () => {
    expect(clock(0)).toBe('오전 12:00');
    expect(clock(0.5)).toBe('오후 12:00');
    expect(clock(0.66)).toBe('오후 3:50');
    expect(clock(1.25)).toBe('오전 6:00');
  });

  it('때의 이름은 밤, 새벽, 아침, 낮, 저녁 순서로 돈다', () => {
    expect([0, 0.22, 0.3, 0.5, 0.75, 0.9].map(period)).toEqual(['밤', '새벽', '아침', '낮', '저녁', '밤']);
  });

  it('해와 달은 번갈아 뜨고, 끌어 놓은 자리는 같은 시각으로 되돌아온다', () => {
    for (let i = 0; i < 100; i++) {
      const tau = i / 100;
      const sun = sunAt(tau);
      const moon = moonAt(tau);
      expect(sun === null).not.toBe(moon === null);
      if (sun !== null) expect(tauOf('sun', sun)).toBeCloseTo(tau, 6);
      if (moon !== null) expect(tauOf('moon', moon)).toBeCloseTo(tau, 6);
    }
  });

  it('해는 한낮에 가장 높고 뜨고 질 때는 지붕 아래로 내려간다', () => {
    expect(arc(0.5)[1]).toBeLessThan(arc(0.1)[1]);
    expect(arc(0)[1]).toBeGreaterThan(212);
    expect(arc(1)[1]).toBeGreaterThan(212);
  });

  it('낮에는 종이가 밝고 먹이 어둡고, 밤에는 뒤집힌다', () => {
    const lum = (c: number[]) => c[0] + c[1] + c[2];
    const day = palette(0.5);
    const night = palette(0);
    expect(lum(day.paper)).toBeGreaterThan(lum(day.ink));
    expect(lum(night.paper)).toBeLessThan(lum(night.ink));
    expect(night.lamp).toBeGreaterThan(0.9);
    expect(day.lamp).toBeLessThan(0.1);
  });
});

describe.each(['walk', 'shuffle'] as const)('걸음 %s', (kind) => {
  const g = gait({ kind });

  it('디딘 발은 몸이 나아가는 만큼 뒤로 밀려서 땅 위에서 제자리에 있다', () => {
    // 발이 평평하게 닿아 있는 구간(뒤꿈치가 들리기 전)에서 본다
    const dt = 0.002;
    for (let phase = 0.02; phase < g.duty - 0.16; phase += 0.03) {
      const a = g.pose(phase).feet[0];
      const b = g.pose(phase + dt).feet[0];
      expect(a.stance && b.stance).toBe(true);
      const moved = g.speed * g.period * dt;
      expect(b.ankle[0] + moved).toBeCloseTo(a.ankle[0], 4);
      expect(b.ankle[1]).toBeCloseTo(a.ankle[1], 6);
    }
  });

  it('멈춰 서면 두 발이 땅에 모인다', () => {
    const p = g.pose(0.3, 0);
    for (const foot of p.feet) {
      expect(foot.ankle[1]).toBeCloseTo(g.ankleY, 6);
      expect(Math.abs(foot.ankle[0] - 40)).toBeLessThanOrEqual(2);
    }
  });
});
