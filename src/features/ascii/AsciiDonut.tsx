'use client';

import { useEffect, useRef } from 'react';

import { donutFrame } from './donut';

interface AsciiDonutProps {
  cols?: number;
  rows?: number;
  className?: string;
}

// 초당 30장
const FRAME_MS = 1000 / 30;

function AsciiDonut({ cols = 80, rows = 22, className }: AsciiDonutProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return undefined;
    // 움직임 줄이기를 켠 사람에게는 첫 장면만 보여 준다
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let raf = 0;
    let drawn = 0;
    let start = 0;
    let visible = true;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || now - drawn < FRAME_MS) return;
      // 처음 그려 둔 정면 장면에서 이어서 돈다
      if (!start) start = now;
      drawn = now;
      const t = (now - start) / 1000;
      pre.textContent = donutFrame(t * 1.2, t * 0.6, cols, rows);
    };
    raf = requestAnimationFrame(frame);

    // 화면 밖에 있는 동안은 계산을 쉰다
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(pre);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [cols, rows]);

  return (
    <pre
      ref={preRef}
      className={className}
      aria-hidden="true"
      // 삼각함수 끝자리가 서버와 브라우저에서 다를 수 있다
      suppressHydrationWarning
    >
      {donutFrame(0, 0, cols, rows)}
    </pre>
  );
}

export default AsciiDonut;
