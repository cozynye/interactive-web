import { describe, expect, it } from 'vitest';

import { runStateOf } from '../runState';

const base = { reducedMotion: false, onscreen: true, pageVisible: true };

describe('runStateOf', () => {
  it('보이는 화면에서는 playing', () => {
    expect(runStateOf(base)).toBe('playing');
  });

  it('화면 밖이거나 탭이 가려지면 paused', () => {
    expect(runStateOf({ ...base, onscreen: false })).toBe('paused');
    expect(runStateOf({ ...base, pageVisible: false })).toBe('paused');
  });

  it('움직임 줄이기는 다른 조건보다 먼저다', () => {
    expect(runStateOf({ ...base, reducedMotion: true })).toBe('still');
    expect(
      runStateOf({ reducedMotion: true, onscreen: false, pageVisible: false })
    ).toBe('still');
  });
});
