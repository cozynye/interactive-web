import { applyPalette, mix, nightTint, palette, rgb, toRGB } from '../lib/daynight';
import { el, f, inkDefs } from '../lib/ink';
import { clamp, pointerWind, rnd, seeded, smooth } from '../lib/motion';
import { buildStreet } from './houses';
import { ARC, clock, COLOR, DAY, GROUND, H, period, START, tauOf, W } from './kit';
import { createLady, createSeonbi, Walker } from './people';
import { createCat, createChime, createLantern, createTree } from './props';
import { createSky } from './sky';

const WARM = toRGB(COLOR.warm);
const CHIMA = [COLOR.red, COLOR.blue, COLOR.jade, COLOR.mustard];
let serial = 0;

// 한옥 골목 장면을 svg 안에 짓는다. 노드는 여기서 한 번만 만들고 frame()은 속성만 고친다.
export function createAlley(svg: SVGSVGElement) {
  const id = `alley${serial++}`;
  const stop = new AbortController();
  const { signal } = stop;
  const rand = seeded(23);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const ink = inkDefs(svg, id);
  const glowGrad = el('radialGradient', { id: `${id}-glow` }, ink.defs);
  el('stop', { offset: 0, 'stop-color': COLOR.warm, 'stop-opacity': 0.6 }, glowGrad);
  el('stop', { offset: 1, 'stop-color': COLOR.warm, 'stop-opacity': 0 }, glowGrad);
  const glowFill = `url(#${id}-glow)`;

  // 뒤에서 앞으로: 하늘, (잉크 필터를 건 묶음: 나무, 집, 바닥, 매달린 것, 사람, 떨어지는 것), 불빛, 글자
  const skyLayer = el('g', {}, svg);
  const scene = el('g', { filter: ink.filter }, svg);
  const behind = el('g', {}, scene);
  const houses = el('g', {}, scene);
  const lane = el('g', {}, scene);
  const hung = el('g', {}, scene);
  const people = el('g', {}, scene);
  const front = el('g', { style: 'pointer-events:none' }, scene);
  const glow = el('g', { style: 'mix-blend-mode:screen;pointer-events:none' }, svg);
  const hud = el('g', { style: 'pointer-events:none;user-select:none', fill: 'currentColor' }, svg);

  const sky = createSky(skyLayer, ink.defs, id, rand);
  const street = buildStreet(houses, lane, glow, glowFill, rand);
  const tinted = street.tinted;
  const tree = createTree(behind, front, [238, 344], rand, tinted);
  const lanterns = street.lanterns.map((at) => createLantern(hung, glow, glowFill, at, tinted));
  const chime = createChime(hung, street.chime, tinted);
  const cat = createCat(hung, street.cat);
  const wind = pointerWind(svg, 0.25, signal);

  const time = el('text', { x: 18, y: 28, 'font-size': 12, style: 'font-variant-numeric:tabular-nums' }, hud);
  const hint = el('text', { x: W / 2, y: H - 12, 'text-anchor': 'middle', 'font-size': 10.5, opacity: 0.55 }, hud);
  hint.textContent = '해와 달을 끌면 시간이 바뀐다. 사람, 초롱, 풍경, 고양이, 감나무를 눌러 본다.';
  let hintLeft = 1;
  let touched = false;

  // 해와 달을 끌어서 시간을 옮긴다
  let tau = START;
  let dragging: 'sun' | 'moon' | null = null;
  const toScene = (e: PointerEvent) => {
    const m = svg.getScreenCTM();
    return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).x : 0;
  };
  const grab = (body: 'sun' | 'moon') => (e: PointerEvent) => {
    dragging = body;
    // 손가락이 이미 떨어졌으면 잡지 못하는데, 그래도 끄는 데는 지장이 없다
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {}
    e.preventDefault();
  };
  sky.sunG.addEventListener('pointerdown', grab('sun'), { signal });
  sky.moonG.addEventListener('pointerdown', grab('moon'), { signal });
  svg.addEventListener(
    'pointermove',
    (e) => {
      if (dragging) tau = tauOf(dragging, clamp((toScene(e) - ARC.x0) / ARC.span, 0.03, 0.97));
    },
    { signal }
  );
  const release = () => {
    dragging = null;
  };
  svg.addEventListener('pointerup', release, { signal });
  svg.addEventListener('pointercancel', release, { signal });
  svg.addEventListener('pointerdown', () => (touched = true), { signal });

  // 골목을 오가는 사람들. 처음부터 둘은 걷고 있고, 그 뒤로는 간격을 두고 양 끝에서 들어온다.
  const walkers: Walker[] = [];
  const enter = (x?: number) => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const at = x ?? (dir > 0 ? -30 : W + 30);
    const y = rnd(GROUND + 20, GROUND + 58);
    const w =
      Math.random() < 0.5
        ? createSeonbi(people, at, y, dir, Math.random() < 0.5 ? COLOR.blue : COLOR.red)
        : createLady(people, at, y, dir, CHIMA[Math.floor(Math.random() * CHIMA.length)], Math.random() < 0.5 ? COLOR.red : COLOR.blue);
    w.g.addEventListener('pointerdown', w.greet);
    walkers.push(w);
    // 아래쪽에 선 사람이 앞에 오도록 다시 줄 세운다
    walkers.sort((a, b) => a.y - b.y);
    for (const one of walkers) people.appendChild(one.g);
  };
  enter(rnd(160, 380));
  enter(rnd(560, 800));
  let nextEnter = rnd(3, 6);

  return {
    frame(t: number, dt: number) {
      if (!dragging) tau = (tau + dt / DAY) % 1;
      const P = palette(tau);
      applyPalette(svg, P);
      const w = wind.step(t);

      sky.update(P, tau, w, t, dt);
      tree.step(w, dt);
      for (const lantern of lanterns) lantern.step(w, smooth(0.25, 0.6, P.lamp), t, dt);
      chime.step(w, dt);
      cat.step(w, P.night, t, dt);

      // 창은 집마다 다른 어둡기에서 하나씩 켜진다
      for (const pane of street.panes) {
        const lit = smooth(pane.on - 0.12, pane.on + 0.08, P.lamp);
        pane.node.setAttribute('fill', rgb(mix(P.paper, WARM, lit * 0.9)));
        pane.glow.setAttribute('opacity', f(lit * 0.8));
      }

      nextEnter -= dt;
      if (nextEnter < 0 && walkers.length < 5) {
        enter();
        // 밤이 깊을수록 드물게 지나간다
        nextEnter = rnd(5, 10) * (1 + P.night * 1.5);
      }
      for (let i = walkers.length - 1; i >= 0; i--) {
        const one = walkers[i];
        one.step(t, dt, w);
        if (one.x < -60 || one.x > W + 60) {
          one.g.remove();
          walkers.splice(i, 1);
        } else for (const [node, colour] of one.tinted) node.setAttribute('fill', nightTint(colour, P));
      }
      for (const [node, colour] of tinted) node.setAttribute('fill', nightTint(colour, P));

      time.textContent = `${clock(tau)} · ${period(tau)}`;
      // 안내는 무엇이든 한 번 건드리면 사라진다
      if (touched && hintLeft > 0) {
        hintLeft = Math.max(0, hintLeft - dt * 1.5);
        hint.setAttribute('opacity', f(0.55 * hintLeft));
      }
      svg.dataset.period = period(tau);
      svg.dataset.walkers = String(walkers.length);
    },
    dispose() {
      stop.abort();
      svg.replaceChildren();
    },
  };
}
