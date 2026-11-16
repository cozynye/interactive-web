'use client';

import { useEffect, useRef } from 'react';

import { YARNS } from '@/features/fire/knitFire.constant';
import { createTicker, Ticker } from '@/lib/ticker';

// 코 하나 크기 (불꽃놀이 본편과 같은 격자)
const CW = 7;
const CH = 6;
const PALETTES = YARNS.filter((y) => y.c && y.c.length > 1).map(
  (y) => y.c as string[]
);

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hex: string;
}
interface Rocket {
  x: number;
  y: number;
  vy: number;
  ty: number;
  pal: string[];
}

// 홈 타일에 깔리는 작은 불꽃놀이. 본편 엔진과 달리 입력을 받지 않고 혼자 쏜다.
function FirePreview({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return undefined;

    let W = 0;
    let H = 0;
    let cols = 0;
    let rows = 0;
    // 칸마다 남은 밝기와 실 색
    let heat = new Float32Array(0);
    let tint: string[] = [];
    let sparks: Spark[] = [];
    let rockets: Rocket[] = [];
    let nextLaunch = 0;
    let ticker: Ticker | null = null;

    const stamp = (x: number, y: number, hex: string, v: number) => {
      const c = Math.floor(x / CW);
      const r = Math.floor(y / CH);
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const i = r * cols + c;
      if (v < heat[i]) return;
      heat[i] = v;
      tint[i] = hex;
    };

    const burst = (x: number, y: number, pal: string[]) => {
      const power = Math.min(W, H) * 0.36;
      const n = 90;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.06;
        const sp = power * (0.35 + 0.65 * Math.sqrt(Math.random()));
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          hex: pal[i % pal.length],
        });
      }
    };

    const launch = () => {
      rockets.push({
        x: W * (0.14 + Math.random() * 0.72),
        y: H,
        vy: -H * (0.9 + Math.random() * 0.25),
        // 위쪽 글자를 가리지 않게 타일 아래 절반에서 터뜨린다
        ty: H * (0.52 + Math.random() * 0.22),
        pal: PALETTES[Math.floor(Math.random() * PALETTES.length)],
      });
    };

    const step = (dt: number) => {
      for (let i = 0; i < heat.length; i++)
        if (heat[i] > 0) heat[i] = Math.max(0, heat[i] - dt * 0.55);
      rockets = rockets.filter((r) => {
        r.y += r.vy * dt;
        stamp(r.x, r.y, '#f4ecdc', 0.7);
        if (r.y > r.ty) return true;
        burst(r.x, r.y, r.pal);
        return false;
      });
      const drag = 1 - 1.6 * dt;
      sparks = sparks.filter((s) => {
        s.vx *= drag;
        s.vy = s.vy * drag + 120 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt * 0.75;
        stamp(s.x, s.y, s.hex, s.life);
        return s.life > 0;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < heat.length; i++) {
        if (heat[i] < 0.04) continue;
        const x = (i % cols) * CW;
        const y = Math.floor(i / cols) * CH;
        ctx.globalAlpha = Math.min(1, heat[i] * 1.2);
        ctx.strokeStyle = tint[i];
        // V자 코 하나
        ctx.beginPath();
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + CW / 2, y + CH);
        ctx.lineTo(x + CW - 1, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    // 움직임 줄이기: 터진 직후의 한 장면만 그려 둔다
    const drawStill = () => {
      sparks = [];
      [0.24, 0.52, 0.78].forEach((fx, i) =>
        burst(W * fx, H * (0.66 - (i % 2) * 0.1), PALETTES[i % PALETTES.length])
      );
      for (let i = 0; i < 26; i++) step(1 / 30);
      draw();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CW);
      rows = Math.ceil(H / CH);
      heat = new Float32Array(cols * rows);
      tint = new Array<string>(cols * rows).fill('');
      if (ticker?.state() === 'still') drawStill();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    ticker = createTicker(cv, {
      frame: (t, dt) => {
        if (t > nextLaunch) {
          launch();
          nextLaunch = t + 0.5 + Math.random() * 0.7;
        }
        step(Math.min(0.05, dt));
        draw();
      },
      still: drawStill,
    });

    return () => {
      ticker?.dispose();
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

export default FirePreview;
