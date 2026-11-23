'use client';

import Link from 'next/link';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

import { Grid } from '../ascii/stage/grid';
import { Action, createControls } from './controls';
import { createPainter, follow, Glyph, View } from './draw';
import { BOSS_HP, createGame, MAX_LEVEL, Phase, step, UpgradeId, UPGRADES } from './engine';
import styles from './GameStage.module.css';
import { createInk } from './ink';

const GUIDE = [
  ['WASD', '이동. 공격은 저절로 나간다'],
  ['Space', '구르기. 구르는 동안은 맞지 않는다'],
  ['1, 2, 3', '단계가 오르면 무기나 능력을 고른다'],
];

interface Result {
  time: number;
  level: number;
  kills: number;
  // 용의 남은 체력(%). 용을 만나기 전이면 -1이다.
  boss: number;
}

interface Choice {
  id: UpgradeId;
  // 고르면 되는 단계
  level: number;
}

// 글자로 그리는 생존 게임. 게임 상태는 React 밖에 두고, 화면에 얹는 안내만 React가 그린다.
function GameStage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('title');
  const [result, setResult] = useState<Result>({ time: 0, level: 1, kills: 0, boss: -1 });
  const [choices, setChoices] = useState<Choice[]>([]);
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
    const hud = new Grid();
    const sprites: Glyph[] = [];
    const view: View = { x: 0, y: 0, pull: 0, lift: 0 };
    const controls = createControls(pad);
    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    pressRef.current = controls.press;

    const resize = () => ink.fit(grid, hud, wrap.clientWidth, wrap.clientHeight);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let shown: Phase = 'title';
    let offers = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!grid.cols) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt;
      controls.tick(dt);
      step(game, controls.read, dt);
      if (game.phase !== shown || game.offers !== offers) {
        shown = game.phase;
        offers = game.offers;
        wrap.dataset.phase = shown;
        setPhase(shown);
        setChoices(game.choices.map((id) => ({ id, level: game.player.lv[id] + 1 })));
        setResult({ time: game.t, level: game.player.level, kills: game.player.kills, boss: game.boss.here ? Math.ceil((game.boss.hp / BOSS_HP) * 100) : -1 });
      }
      follow(view, game, 0.25, dt);
      grid.clear();
      hud.clear();
      sprites.length = 0;
      const slip = paint(grid, game, view, clock, { sprites, hud });
      ink.draw(grid, slip.x, slip.y, sprites, hud);
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
  const tap = (a: Action) => {
    pressRef.current(a, true);
    pressRef.current(a, false);
  };
  const stats = [
    [phase === 'won' ? '걸린 시간' : '버틴 시간', `${Math.floor(result.time / 60)}:${String(Math.floor(result.time % 60)).padStart(2, '0')}`],
    ['단계', String(result.level)],
    ['벤 수', String(result.kills)],
  ];
  if (phase === 'lost' && result.boss >= 0) stats.push(['용의 남은 체력', `${result.boss}%`]);
  const over = phase === 'title' || phase === 'won' || phase === 'lost';

  return (
    <main ref={wrapRef} className={styles.room}>
      <canvas ref={canvasRef} className={styles.ink} />
      <canvas ref={glowRef} className={styles.glow} />
      <div ref={padRef} className={styles.pad} />
      <div className={styles.buttons}>
        <button type="button" data-action="dash" onPointerDown={down} onPointerUp={up} onPointerLeave={up}>
          구르기
        </button>
      </div>

      {phase === 'levelup' && (
        <div className={styles.shade}>
          <div className={styles.picker}>
            <h2 className={styles.rise}>무엇을 올릴까</h2>
            <div className={styles.cards}>
              {choices.map((c, i) => (
                <button key={c.id} type="button" className={styles.card} onClick={() => tap(`pick${i + 1}` as Action)}>
                  <span className={styles.hint}>{i + 1}</span>
                  <span className={styles.kind} data-weapon={UPGRADES[c.id].weapon}>
                    {UPGRADES[c.id].weapon ? '무기' : '능력'}
                  </span>
                  <strong className={styles.name}>{UPGRADES[c.id].name}</strong>
                  <span className={styles.pips} aria-label={`${c.level}단계`}>
                    <b>{'*'.repeat(c.level - 1)}</b>
                    <em>*</em>
                    {'.'.repeat(MAX_LEVEL - c.level)}
                  </span>
                  <span className={styles.what}>{UPGRADES[c.id].text[c.level - 1]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {over && (
        <div className={styles.veil}>
          <div className={styles.panel}>
            {phase === 'title' && (
              <>
                <h1 className={styles.title}>글자 평원의 용</h1>
                <p className={styles.lede}>사방에서 몰려오는 무리를 베며 3분을 버티면 용이 온다. 떨어진 구슬을 모아 단계를 올리고, 그때마다 무기나 능력을 하나 골라 강해진다.</p>
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
            {(phase === 'won' || phase === 'lost') && (
              <>
                <h1 className={styles.title}>{phase === 'won' ? '용을 쓰러뜨렸다' : '쓰러졌다'}</h1>
                <dl className={styles.stats}>
                  {stats.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <div className={styles.go}>
              <button type="button" className={styles.start} onClick={() => tap('start')}>
                {phase === 'title' ? '시작' : '다시 하기'}
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
