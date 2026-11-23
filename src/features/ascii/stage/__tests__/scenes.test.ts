import { describe, expect, it } from 'vitest';

import { donutFrame } from '../../donut';
import { blackholePhase } from '../blackhole';
import { orangesOn } from '../capybara';
import { dome, Grid, lit, tone, TONES } from '../grid';
import { knightPhase } from '../knight';
import { rosePhase } from '../rose';
import { SCENES } from '../scenes';
import { sigilPhase } from '../sigil';
import { zedPhase } from '../zed';

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
      g.finish((i + 1) / 30);
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

describe('몸통 마무리', () => {
  it('가장자리는 윤곽선 글자, 안쪽은 묶음 글자가 된다', () => {
    const g = new Grid();
    g.resize(20, 10, 1.87);
    g.clear();
    for (let r = 2; r < 8; r++)
      for (let c = 4; c < 16; c++) g.put(c, r, 1, 0.5, 255, 0, 0, 0, 1);
    g.finish(0);
    const at = (c: number, r: number) => String.fromCharCode(g.ch[r * 20 + c]);
    expect(at(4, 4)).toBe('|');
    expect(at(10, 2)).toBe('-');
    expect(at(10, 7)).toBe('_');
    expect('|/\\-_+').not.toContain(at(10, 4));
    expect(g.lum[4 * 20 + 4]).toBeGreaterThanOrEqual(0.85);
    // 몸통이 아닌 칸은 그대로다
    expect(g.ch[0]).toBe(0);
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

describe('블랙홀의 단계', () => {
  it('원 → 빛 → 원반 → 흐름 순서로 넘어가고 되돌아가지 않는다', () => {
    expect([0, 1, 3, 6, 7.8, 60].map(blackholePhase)).toEqual(['ring', 'ring', 'glow', 'disk', 'flow', 'flow']);
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

describe('제드 맞대결의 단계', () => {
  it('밀기 → 표식 → 주고받기 → 추격 → 끝 순서로 가고 18초마다 되풀이한다', () => {
    expect([0, 3.2, 5, 8, 9, 18.5].map(zedPhase)).toEqual(['push', 'mark', 'trade', 'chase', 'after', 'push']);
  });
});

describe('새 장면의 단계', () => {
  it('마법진은 방울 → 마법진 → 솟음 → 떠 있음 순서로 넘어가고 되돌아가지 않는다', () => {
    expect([0, 2, 6, 9, 60].map(sigilPhase)).toEqual(['drop', 'circle', 'rise', 'hover', 'hover']);
  });

  it('기사는 땅 → 몸 → 검의 빛 → 바람 순서로 넘어간다', () => {
    expect([0, 3, 5, 8].map(knightPhase)).toEqual(['ground', 'body', 'glint', 'wind']);
  });

  it('귤은 9초마다 하나씩 셋까지 쌓였다가 재채기에 다 떨어진다', () => {
    expect([0, 6, 15, 24, 32, 36, 40].map(orangesOn)).toEqual([0, 1, 2, 3, 0, 0, 1]);
  });
});

describe('명암 도구', () => {
  it('왼쪽 위를 보는 비탈이 평평한 면보다 밝고, 오른쪽 아래를 보는 비탈은 어둡다', () => {
    const flat = lit(1, 1, 1, 1);
    expect(lit(1, 2, 2, 1)).toBeGreaterThan(flat);
    expect(lit(1, 0, 0, 1)).toBeLessThan(flat);
  });

  it('밝기는 범위를 벗어나도 글자 줄 안에서 고른다', () => {
    expect(tone(-1)).toBe(TONES.charCodeAt(1));
    expect(tone(2)).toBe(TONES.charCodeAt(TONES.length - 1));
    expect(tone(0, 0)).toBe(32);
  });

  it('둥근 덩어리는 가운데가 가장 높고 가장자리 밖은 0이다', () => {
    expect([0, 0.75, 1, 4].map(dome)).toEqual([1, 0.5, 0, 0]);
  });
});
