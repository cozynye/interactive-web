import { rng } from '../ascii/stage/grid';

// 사진 없이도 해 볼 수 있게 그려 두는 예시 그림: 띠무늬 행성과 고리, 작은 달
export function makeSample() {
  const W = 960;
  const H = 600;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  const rand = rng(7);
  const cx = W * 0.5;
  const cy = H * 0.52;
  const R = 190;
  const tilt = -0.32;

  ctx.fillStyle = '#04050c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#dfe6ff';
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.35 + rand() * 0.65;
    const s = rand() < 0.15 ? 4 : 2;
    ctx.fillRect(rand() * W, rand() * H, s, s);
  }
  ctx.globalAlpha = 1;

  // 고리는 행성 뒤쪽 반을 먼저, 앞쪽 반을 나중에 그려서 행성을 두른다
  const ring = (from: number, to: number) => {
    const bands = [
      { r: 1.5, w: 16, color: '#b9a37c' },
      { r: 1.72, w: 26, color: '#e8d3a2' },
      { r: 1.98, w: 12, color: '#8f7d63' },
    ];
    for (const band of bands) {
      ctx.strokeStyle = band.color;
      ctx.lineWidth = band.w;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * band.r, R * band.r * 0.27, tilt, from, to);
      ctx.stroke();
    }
  };
  ring(Math.PI, Math.PI * 2);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  const stripes = ['#e9c58c', '#c9783f', '#f1dcae', '#a8552c', '#e3b574', '#7d3f26', '#ecd2a0', '#b9683a'];
  let y = -R;
  for (let i = 0; y < R; i++) {
    const h = 26 + rand() * 44;
    ctx.fillStyle = stripes[i % stripes.length];
    ctx.fillRect(-R, y, R * 2, h + 1);
    y += h;
  }
  ctx.restore();
  // 빛은 왼쪽 위에서 온다. 반대쪽은 어둡게 덮는다.
  const shade = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.1, cx, cy, R * 1.05);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0.15)');
  shade.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
  ctx.fill();

  ring(0, Math.PI);

  const mx = W * 0.84;
  const my = H * 0.2;
  const moon = ctx.createRadialGradient(mx - 14, my - 14, 4, mx, my, 40);
  moon.addColorStop(0, '#f4f6ff');
  moon.addColorStop(0.6, '#9aa3c4');
  moon.addColorStop(1, '#1a1d30');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, 38, 0, Math.PI * 2);
  ctx.fill();
  return cv;
}
