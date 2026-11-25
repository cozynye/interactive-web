'use client';

import { useEffect, useRef } from 'react';

import { paint, toArt } from './render';
import { makeSample } from './sample';

// 홈 타일에 넣는 시연: 예시 그림을 한 번 바꿔서 보여 준다. 움직이지 않는다.
function ConvertPreview({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const sample = makeSample();
    const art = toArt(sample, sample.width, sample.height, 110, 2, false);
    if (art) paint(cv, art, { color: true, light: false });
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

export default ConvertPreview;
