import { describe, expect, it } from 'vitest';

import { donutFrame } from '../../donut';
import { Grid } from '../grid';
import { rosePhase } from '../rose';
import { SCENES } from '../scenes';

// 장면을 화면 없이 돌려 본다: 격자 크기 두 가지로 12초씩
const SIZES = [
  [150, 60],
  [56, 60],
];

describe.each(Object.entries(SCENES))('장면 %s', (_name, create) => {
  it.each(SIZES)('%i×%i 격자에서 12초 동안 멀쩡한 값만 쓴다', (cols, rows) => {
    const g = new Grid();
    g.resize(cols, rows, 1.87);
    const scene = create();
    let lit = 0;
    let broken = 0;
    for (let i = 0; i < 360; i++) {
      g.clear();
      scene.frame(g, (i + 1) / 30, 1 / 30);
      for (let k = 0; k < g.lum.length; k++) {
        if (!Number.isFinite(g.lum[k])) broken++;
        else if (g.lum[k] > 0.02) lit++;
      }
      for (let k = 0; k < g.rgb.length; k++)
        if (!Number.isFinite(g.rgb[k])) broken++;
    }
    expect(broken).toBe(0);
    // 한 프레임에 평균 스무 칸은 켜져 있어야 빈 화면이 아니다
    expect(lit / 360).toBeGreaterThan(20);
  });

  it('도중에 격자 크기가 바뀌어도 이어서 돈다', () => {
    const g = new Grid();
    const scene = create();
    g.resize(120, 50, 1.87);
    for (let i = 0; i < 60; i++) scene.frame(g, (i + 1) / 30, 1 / 30);
    g.resize(60, 30, 1.87);
    expect(() => {
      for (let i = 60; i < 120; i++) {
        g.clear();
        scene.frame(g, (i + 1) / 30, 1 / 30);
      }
    }).not.toThrow();
  });
});

describe('장미의 단계', () => {
  it('자람 → 핌 → 활짝 → 사라짐 순서로 넘어간다', () => {
    expect([0, 2, 5, 12, 27.5].map(rosePhase)).toEqual([
      'grow',
      'grow',
      'bloom',
      'full',
      'fade',
    ]);
  });
});

describe('donutFrame', () => {
  it('요청한 크기의 글자판을 돌려준다', () => {
    const lines = donutFrame(0.4, 0.2, 48, 20).split('\n');
    expect(lines).toHaveLength(20);
    expect(lines.every((l) => l.length === 48)).toBe(true);
    expect(lines.join('').trim().length).toBeGreaterThan(100);
  });
});
