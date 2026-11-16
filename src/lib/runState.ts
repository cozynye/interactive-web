// 화면에서 계속 도는 애니메이션이 가질 수 있는 상태.
//   still   — 움직임 줄이기 설정이 켜져 있다. 정지 장면 한 장만 보여 준다.
//   paused  — 화면 밖으로 밀려났거나 탭이 가려졌다. 시간도 멈춘다.
//   playing — 그리는 중.
export type RunState = 'still' | 'paused' | 'playing';

export interface RunInputs {
  reducedMotion: boolean;
  onscreen: boolean;
  pageVisible: boolean;
}

// 입력 세 가지로 상태가 하나로 정해진다. 움직임 줄이기가 가장 먼저다.
export function runStateOf(i: RunInputs): RunState {
  if (i.reducedMotion) return 'still';
  if (!i.onscreen || !i.pageVisible) return 'paused';
  return 'playing';
}
