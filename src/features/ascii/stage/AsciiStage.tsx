'use client';

import { useEffect, useRef } from 'react';

import { createTicker, Ticker } from '@/lib/ticker';

import styles from './AsciiStage.module.css';
import { Grid, RAMP } from './grid';
import { SceneName, SCENES } from './scenes';

const FONT =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const FPS = 30;
// 움직임 줄이기에서 보여 줄 장면까지 미리 돌리는 시간(초)
const STILL_AT = 9;

// 장면이 채운 글자 격자를 캔버스에 그리는 무대. 부모 크기를 꽉 채운다.
function AsciiStage({ name, className }: { name: SceneName; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    const glow = glowRef.current;
    const ctx = cv?.getContext('2d');
    const gctx = glow?.getContext('2d');
    if (!wrap || !cv || !glow || !ctx || !gctx) return undefined;

    const scene = SCENES[name]();
    const grid = new Grid();
    const inks = new Map<number, string>();
    let W = 0;
    let H = 0;
    let dpr = 1;
    let cellW = 0;
    let cellH = 0;
    let top = 0;
    let t = 0;
    let ticker: Ticker | null = null;

    const draw = () => {
      const { cols, lum, rgb, ch } = grid;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${cellW / 0.6}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < lum.length; i++) {
        if (lum[i] <= 0.02) continue;
        const l = lum[i] > 1 ? 1 : lum[i];
        const glyph = ch[i]
          ? String.fromCharCode(ch[i])
          : RAMP[Math.round(l * (RAMP.length - 1))];
        if (glyph === ' ') continue;
        // 어두운 칸도 색은 읽히게 밝기의 바닥을 둔다
        const k = 0.3 + 0.7 * l;
        const key =
          ((rgb[i * 3] * k) >> 3 << 10) |
          ((rgb[i * 3 + 1] * k) >> 3 << 5) |
          ((rgb[i * 3 + 2] * k) >> 3);
        let ink = inks.get(key);
        if (!ink) {
          ink = `rgb(${(key >> 10) << 3},${((key >> 5) & 31) << 3},${(key & 31) << 3})`;
          inks.set(key, ink);
        }
        ctx.fillStyle = ink;
        ctx.fillText(
          glyph,
          ((i % cols) + 0.5) * cellW,
          top + (Math.floor(i / cols) + 0.5) * cellH
        );
      }
      // 같은 그림을 흐리게 깔아 번지는 빛을 만든다 (흐림은 CSS가 맡는다)
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.drawImage(cv, 0, 0);
    };

    const step = (dt: number) => {
      t += dt;
      grid.clear();
      scene.frame(grid, t, dt);
    };

    // 정지 장면: 처음부터 STILL_AT초까지 그리지 않고 돌린 뒤 한 장만 그린다
    const renderStill = () => {
      if (!grid.cols) return;
      t = 0;
      for (let i = 0; i < STILL_AT * FPS; i++) step(1 / FPS);
      draw();
    };

    const resize = () => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // 칸 폭은 장면이 정한다(기본 6px). 좁은 화면에서도 56칸은 확보하고, 넓은 화면에서는 1200px 분량에서 멈춘다.
      const cell = scene.cell ?? 6;
      const cols = Math.max(56, Math.min(Math.round(1200 / cell), Math.round(W / cell)));
      cellW = W / cols;
      cellH = (cellW / 0.6) * 1.12;
      const rows = Math.max(8, Math.floor(H / cellH));
      top = (H - rows * cellH) / 2;
      grid.resize(cols, rows, cellH / cellW);
      for (const c of [cv, glow]) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      if (ticker?.state() === 'still') renderStill();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    ticker = createTicker(wrap, {
      fps: FPS,
      frame: (_t, dt) => {
        if (!grid.cols) return;
        step(dt);
        draw();
      },
      still: renderStill,
    });

    return () => {
      ticker?.dispose();
      ro.disconnect();
    };
  }, [name]);

  return (
    <div
      ref={wrapRef}
      className={`${styles.stage}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <canvas ref={glowRef} className={styles.glow} />
      <canvas ref={canvasRef} className={styles.ink} />
    </div>
  );
}

export default AsciiStage;
