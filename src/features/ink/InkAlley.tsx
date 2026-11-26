'use client';

import { useEffect, useRef } from 'react';

import { createTicker } from '@/lib/ticker';

import { createAlley } from './alley/scene';
import styles from './InkAlley.module.css';

// 한옥 골목 선화가 도는 카드. 부모 크기를 꽉 채우고, 비율이 다르면 양옆이나 위를 잘라 낸다.
function InkAlley({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const alley = createAlley(svg);
    const ticker = createTicker(svg as unknown as HTMLElement, {
      frame: (t, dt) => alley.frame(t, dt),
      // 움직임 줄이기에서는 오후의 한 장면만 그린다
      still: () => alley.frame(0, 0),
    });
    return () => {
      ticker.dispose();
      alley.dispose();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={`${styles.card}${className ? ` ${className}` : ''}`}
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="기와지붕과 돌담이 이어진 한옥 골목을 사람들이 오가는 선화. 해가 지면 창과 청사초롱에 불이 켜진다."
    />
  );
}

export default InkAlley;
