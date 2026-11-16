'use client';

import { useEffect, useRef } from 'react';

import { createTicker } from '@/lib/ticker';

import { donutFrame } from './donut';

interface AsciiDonutProps {
  cols?: number;
  rows?: number;
  className?: string;
}

function AsciiDonut({ cols = 80, rows = 22, className }: AsciiDonutProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return undefined;
    const ticker = createTicker(pre, {
      fps: 30,
      // 처음 그려 둔 정면 장면에서 이어서 돈다
      frame: (t) => {
        pre.textContent = donutFrame(t * 1.2, t * 0.6, cols, rows);
      },
      still: () => {
        pre.textContent = donutFrame(0, 0, cols, rows);
      },
    });
    return ticker.dispose;
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
