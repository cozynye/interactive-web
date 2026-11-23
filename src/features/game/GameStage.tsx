'use client';

import Link from 'next/link';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

import { Grid } from '../ascii/stage/grid';
import { Action, createControls } from './controls';
import { createPainter, follow, snap, toWorld, View } from './draw';
import { advance, BOSS_HP, createGame, Phase } from './engine';
import styles from './GameStage.module.css';
import { createInk } from './ink';

const BUTTONS: [Action, string][] = [
  ['attack', '베기'],
  ['dash', '구르기'],
  ['wave', '검기'],
  ['spin', '회전'],
  ['potion', '물약'],
];
const GUIDE = [
  ['WASD', '이동'],
  ['마우스, J', '조준하고 베기'],
  ['Space', '구르기. 구르는 동안은 맞지 않는다'],
  ['K, L', '검기와 회전베기. MP를 쓴다'],
  ['Q', '물약 3병'],
];

interface Result {
  time: number;
  hp: number;
  boss: number;
}

// 글자로 그리는 보스전. 게임 상태는 React 밖에 두고, 화면에 얹는 안내만 React가 그린다.
function GameStage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('title');
  const [result, setResult] = useState<Result>({ time: 0, hp: 0, boss: 0 });
  // 화면 버튼이 누른 입력을 루프에 넘기는 통로
  const pressRef = useRef<(a: Action, down: boolean) => void>(() => {});

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    const glow = glowRef.current;
    const pad = padRef.current;
    const ink = cv && glow ? createInk(cv, glow) : null;
    if (!wrap || !cv || !glow || !pad || !ink) return undefined;

    const game = createGame((Date.now() % 100000) + 1);
    const paint = createPainter();
    const grid = new Grid();
    const view: View = { x: 0, y: 6, aim: null };
    const controls = createControls(cv, pad);
    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    pressRef.current = controls.press;

    const resize = () => ink.fit(grid, wrap.clientWidth, wrap.clientHeight);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let clock = 0;
    let shown: Phase = 'title';
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!grid.cols) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt;
      controls.tick(dt);
      // 마우스가 가리키는 칸을 지금 카메라로 세계 좌표로 바꿔 조준점으로 쓴다
      const mouse = controls.pointer();
      const cell = mouse && ink.toCell(mouse.x, mouse.y);
      const shot = snap(grid, view);
      shot.aim = cell ? toWorld(grid, shot, cell.x, cell.y) : null;
      acc = advance(game, () => controls.read(shot.aim), acc + dt);
      if (game.phase !== shown) {
        shown = game.phase;
        wrap.dataset.phase = shown;
        setPhase(shown);
        setResult({ time: game.t, hp: Math.ceil(game.player.hp), boss: Math.ceil((game.boss.hp / BOSS_HP) * 100) });
      }
      // 시작 화면에서는 용이 가운데 오도록 더 당겨 본다
      follow(view, game, game.phase === 'title' ? 0.6 : 0.22, dt);
      grid.clear();
      paint(grid, game, shot, clock);
      ink.draw(grid);
      // 맞거나 때릴 때 화면이 흔들린다. 움직임 줄이기가 켜져 있으면 흔들지 않는다.
      const shake = calm.matches ? 0 : game.shake * 7;
      const move = shake > 0.3 ? `translate(${((Math.random() - 0.5) * shake).toFixed(1)}px, ${((Math.random() - 0.5) * shake).toFixed(1)}px)` : '';
      cv.style.transform = move;
      glow.style.transform = move;
    };
    // 탭이 가려지면 멈추고, 돌아오면 멈춰 있던 시간은 흐르지 않은 것으로 친다
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);
    wrap.dataset.phase = 'title';
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const down = (e: React.PointerEvent<HTMLButtonElement>) => pressRef.current(e.currentTarget.dataset.action as Action, true);
  const up = (e: React.PointerEvent<HTMLButtonElement>) => pressRef.current(e.currentTarget.dataset.action as Action, false);
  const start = () => {
    pressRef.current('start', true);
    pressRef.current('start', false);
  };
  const time = `${Math.floor(result.time / 60)}분 ${Math.floor(result.time % 60)}초`;

  return (
    <main ref={wrapRef} className={styles.room}>
      <canvas ref={canvasRef} className={styles.ink} />
      <canvas ref={glowRef} className={styles.glow} />
      <div ref={padRef} className={styles.pad} />
      <div className={styles.buttons}>
        {BUTTONS.map(([action, label]) => (
          <button key={action} type="button" data-action={action} onPointerDown={down} onPointerUp={up} onPointerLeave={up}>
            {label}
          </button>
        ))}
      </div>

      {phase !== 'fight' && (
        <div className={styles.veil}>
          <div className={styles.panel}>
            {phase === 'title' && (
              <>
                <h1 className={styles.title}>글자 평원의 용</h1>
                <p className={styles.lede}>붉게 차오르는 바닥을 피하고 틈이 날 때 벤다. 용의 체력이 반으로 줄면 공격이 빨라지고 새 공격이 섞인다.</p>
                <dl className={styles.keys}>
                  {GUIDE.map(([key, what]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{what}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {phase === 'won' && (
              <>
                <h1 className={styles.title}>용을 쓰러뜨렸다</h1>
                <p className={styles.lede}>
                  {time} 걸렸고 체력 {result.hp}이 남았다.
                </p>
              </>
            )}
            {phase === 'lost' && (
              <>
                <h1 className={styles.title}>쓰러졌다</h1>
                <p className={styles.lede}>
                  {time} 버텼고 용의 체력은 {result.boss}% 남았다.
                </p>
              </>
            )}
            <div className={styles.go}>
              <button type="button" className={styles.start} onClick={start}>
                {phase === 'title' ? '싸움 시작' : '다시 싸우기'}
              </button>
              <span className={styles.hint}>Enter</span>
            </div>
          </div>
        </div>
      )}

      <Link href="/" className={styles.back}>
        홈
      </Link>
    </main>
  );
}

export default GameStage;
