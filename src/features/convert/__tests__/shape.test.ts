import { describe, expect, it } from 'vitest';

import { ASPECT, normalize, rowsFor, stretch, SX, SY, toGlyphs, toText } from '../shape';

const code = (s: string) => s.charCodeAt(0);

// 구역 순서: 왼쪽 위, 오른쪽 위, 왼쪽 가운데, 오른쪽 가운데, 왼쪽 아래, 오른쪽 아래
const SET = normalize(
  [code(' '), code('#'), code('['), code(']'), code('^'), code('_'), code('+')],
  new Float32Array([
    0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1,
    1, 0, 1, 0, 1, 0,
    0, 1, 0, 1, 0, 1,
    1, 1, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 1,
    0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
  ])
);

// 칸 하나짜리 밝기 그림
const cell = (...v: number[]) => new Float32Array(v);

describe('글자 모양 맞추기', () => {
  it('구역별로 가장 진한 글자가 1이 되게 맞춘다', () => {
    const g = normalize([65, 66], new Float32Array([2, 0, 4, 1, 0, 8, 1, 0, 2, 4, 0, 2]));
    expect(Array.from(g.shapes)).toEqual([1, 0, 1, 0.25, 0, 1, 0.5, 0, 0.5, 1, 0, 0.25]);
  });

  it('빈 칸은 빈칸으로, 꽉 찬 칸은 가장 진한 글자로 옮긴다', () => {
    expect(toGlyphs(cell(0, 0, 0, 0, 0, 0), 1, 1, SET)[0]).toBe(code(' '));
    expect(toGlyphs(cell(1, 1, 1, 1, 1, 1), 1, 1, SET)[0]).toBe(code('#'));
  });

  it('밝기가 같아도 잉크가 놓인 자리에 따라 다른 글자를 고른다', () => {
    expect(toGlyphs(cell(1, 0, 1, 0, 1, 0), 1, 1, SET)[0]).toBe(code('['));
    expect(toGlyphs(cell(0, 1, 0, 1, 0, 1), 1, 1, SET)[0]).toBe(code(']'));
    expect(toGlyphs(cell(1, 1, 0, 0, 0, 0), 1, 1, SET)[0]).toBe(code('^'));
    expect(toGlyphs(cell(0, 0, 0, 0, 1, 1), 1, 1, SET)[0]).toBe(code('_'));
  });

  it('선명도를 올리면 흐린 경계가 선 글자로 떨어진다', () => {
    const soft = cell(0.7, 0.4, 0.7, 0.4, 0.7, 0.4);
    expect(toGlyphs(soft, 1, 1, SET, 1)[0]).toBe(code('+'));
    expect(toGlyphs(soft, 1, 1, SET, 3)[0]).toBe(code('['));
  });

  it('칸마다 제 구역만 읽는다', () => {
    // 가로 2칸 × 세로 1칸: 왼쪽 칸은 꽉 차고 오른쪽 칸은 비었다
    const lum = new Float32Array(2 * SX * SY);
    for (let y = 0; y < SY; y++) for (let x = 0; x < SX; x++) lum[y * 2 * SX + x] = 1;
    expect(Array.from(toGlyphs(lum, 2, 1, SET))).toEqual([code('#'), code(' ')]);
  });
});

describe('밝기 펴기', () => {
  it('좁은 범위의 밝기를 0~1로 편다', () => {
    const lum = new Float32Array(1000);
    for (let i = 0; i < lum.length; i++) lum[i] = 0.4 + (0.2 * i) / (lum.length - 1);
    stretch(lum);
    expect(lum[0]).toBeCloseTo(0, 2);
    expect(lum[lum.length - 1]).toBeCloseTo(1, 2);
    expect(lum[500]).toBeGreaterThan(0.4);
    expect(lum[500]).toBeLessThan(0.6);
  });

  it('한 가지 밝기뿐인 그림은 그대로 둔다', () => {
    const lum = new Float32Array(100).fill(0.5);
    stretch(lum);
    expect(Array.from(lum).every((v) => v === 0.5)).toBe(true);
  });
});

describe('크기와 글자 내보내기', () => {
  it('칸이 세로로 긴 만큼 줄 수를 줄여 그림 비율을 지킨다', () => {
    expect(rowsFor(1000, 1000, 100)).toBe(Math.round(100 / ASPECT));
    expect(rowsFor(2000, 1000, 100)).toBe(Math.round(50 / ASPECT));
    expect(rowsFor(4000, 10, 40)).toBe(1);
  });

  it('줄 끝의 빈칸을 떼고 줄바꿈으로 잇는다', () => {
    const ch = Uint16Array.from('ab   c  '.split('').map(code));
    expect(toText(ch, 4)).toBe('ab\n c');
  });
});
