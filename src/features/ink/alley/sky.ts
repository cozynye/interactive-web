import { mix, Palette, rgb, toRGB } from '../lib/daynight';
import { el, f, pen } from '../lib/ink';
import { arc, FINE, H, LINE, moonAt, sunAt, W } from './kit';

const SUNSET = toRGB('#f0a379');

// 하늘: 위아래 색이 바뀌는 바탕, 별, 해와 달, 먼 산, 구름. 해와 달은 끌 수 있게 묶음을 돌려준다.
export function createSky(layer: SVGGElement, defs: SVGDefsElement, id: string, rand: (a?: number, b?: number) => number) {
  const grad = el('linearGradient', { id: `${id}-sky`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  const top = el('stop', { offset: 0 }, grad);
  const bottom = el('stop', { offset: 1 }, grad);
  const halo = el('radialGradient', { id: `${id}-halo` }, defs);
  el('stop', { offset: 0, 'stop-color': '#ffd9a0', 'stop-opacity': 0.75 }, halo);
  el('stop', { offset: 1, 'stop-color': '#ffd9a0', 'stop-opacity': 0 }, halo);
  el('rect', { width: W, height: H, fill: `url(#${id}-sky)` }, layer);

  const stars = Array.from({ length: 70 }, () => ({
    node: el('circle', { cx: f(rand(0, W)), cy: f(rand(6, 230)), r: f(rand(0.5, 1.1)), fill: 'currentColor' }, layer),
    rate: rand(0.6, 2.2),
    shift: rand(0, 6.3),
  }));

  const grab = 'cursor:grab;touch-action:none';
  const sunG = el('g', { style: grab }, layer);
  el('circle', { r: 52, fill: `url(#${id}-halo)` }, sunG);
  const sun = el('circle', { r: 15, stroke: 'currentColor', 'stroke-width': LINE }, sunG);
  el('title', {}, sunG).textContent = '해. 끌면 시간이 바뀐다.';
  const moonG = el('g', { style: grab }, layer);
  // 끌기 쉽게 초승달 둘레를 투명한 원으로 덮는다
  el('circle', { r: 20, fill: 'transparent' }, moonG);
  el('path', { d: 'M4 -13 A13 13 0 1 0 4 13 A17 17 0 0 1 4 -13Z', fill: '#f3ead2' }, moonG);
  el('title', {}, moonG).textContent = '달. 끌면 시간이 바뀐다.';

  // 먼 산은 묽은 먹으로 두 겹
  const far = el('g', { opacity: 0.38 }, layer);
  pen(far, LINE).setAttribute('d', 'M-10 262 Q60 236 130 244 Q200 196 286 228 Q340 244 400 222 Q470 182 560 218 Q620 240 690 214 Q770 176 850 222 Q910 246 970 232');
  pen(far, FINE).setAttribute('d', 'M-10 270 Q110 250 220 258 Q330 240 450 252 Q590 232 720 250 Q850 238 970 254');

  const clouds = [
    { x: 150, y: 70, len: 86 },
    { x: 520, y: 46, len: 110 },
    { x: 800, y: 96, len: 72 },
  ].map((c) => ({ ...c, node: pen(layer, FINE * 1.3) }));

  return {
    sunG,
    moonG,
    update(P: Palette, tau: number, wind: number, t: number, dt: number) {
      top.setAttribute('stop-color', rgb(P.top));
      bottom.setAttribute('stop-color', rgb(P.bottom));
      for (const s of stars)
        s.node.setAttribute('opacity', f(P.night * (0.55 + 0.45 * Math.sin(t * s.rate + s.shift))));

      const sa = sunAt(tau);
      sunG.setAttribute('display', sa === null ? 'none' : 'inline');
      if (sa !== null) {
        const [x, y] = arc(sa);
        sunG.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
        sun.setAttribute('fill', rgb(mix(P.paper, SUNSET, P.sunset)));
      }
      const ma = moonAt(tau);
      moonG.setAttribute('display', ma === null ? 'none' : 'inline');
      if (ma !== null) {
        const [x, y] = arc(ma);
        moonG.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
      }

      for (const c of clouds) {
        c.x += (3 + wind * 7) * dt;
        if (c.x > W + 20) c.x = -c.len - 30;
        if (c.x < -c.len - 40) c.x = W + 10;
        // 끝이 말린 선 두 줄
        c.node.setAttribute(
          'd',
          `M${f(c.x)} ${c.y} h${c.len} q7 0 7 -5 q0 -4 -4 -4 M${f(c.x + c.len * 0.3)} ${c.y + 9} h${f(c.len * 0.8)} q6 0 6 -4.5 q0 -3.5 -3.5 -3.5 M${f(c.x - 12)} ${c.y + 9} q-6 0 -6 -4 q0 -3 3 -3 h${f(c.len * 0.22)}`
        );
      }
    },
  };
}
