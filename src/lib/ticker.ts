import { RunInputs, RunState, runStateOf } from './runState';

interface TickerOptions {
  // 초당 그릴 장 수. 생략하면 화면 주사율을 따른다.
  fps?: number;
  // t: playing 상태로 흐른 시간(초), dt: 직전 프레임과의 간격(초)
  frame: (t: number, dt: number) => void;
  // still 상태에 들어설 때마다 불린다. 정지 장면을 그린다.
  still?: () => void;
}

export interface Ticker {
  state: () => RunState;
  dispose: () => void;
}

// 요소 하나의 애니메이션을 돌린다. 화면에 보이는지, 탭이 떠 있는지, 움직임 줄이기 설정을 지켜보다가
// 상태가 바뀌면 루프를 켜고 끄며, 지금 상태를 요소의 data-state 속성에 적어 둔다.
export function createTicker(el: HTMLElement, opts: TickerOptions): Ticker {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const inputs: RunInputs = {
    reducedMotion: motion.matches,
    onscreen: true,
    pageVisible: !document.hidden,
  };
  const gap = opts.fps ? 1000 / opts.fps : 0;
  let state: RunState | null = null;
  let raf = 0;
  let last = 0;
  let t = 0;

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    // 주사율이 높은 화면에서도 fps를 넘지 않게 건너뛴다 (타이머 오차 1ms 허용)
    if (now - last < gap - 1) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    t += dt;
    opts.frame(t, dt);
  };

  const sync = () => {
    const next = runStateOf(inputs);
    if (next === state) return;
    state = next;
    el.dataset.state = next;
    cancelAnimationFrame(raf);
    raf = 0;
    if (next === 'playing') {
      // 멈춰 있던 시간은 흐르지 않은 것으로 친다
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else if (next === 'still') opts.still?.();
  };

  const io = new IntersectionObserver((entries) => {
    inputs.onscreen = entries[entries.length - 1].isIntersecting;
    sync();
  });
  io.observe(el);
  const onVisibility = () => {
    inputs.pageVisible = !document.hidden;
    sync();
  };
  const onMotion = () => {
    inputs.reducedMotion = motion.matches;
    sync();
  };
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', onMotion);
  sync();

  return {
    state: () => state as RunState,
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      delete el.dataset.state;
    },
  };
}
