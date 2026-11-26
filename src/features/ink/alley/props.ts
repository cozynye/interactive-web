import { blot, el, f, paint, pen, shape, Vec } from '../lib/ink';
import { pendulum, spring } from '../lib/motion';
import { COLOR, FINE, GROUND, LINE } from './kit';

type Rand = (a?: number, b?: number) => number;
type Tinted = Array<[SVGElement, string]>;

const set = (n: Element, d: string) => n.setAttribute('d', d);
const ring = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${f(r * 2)} 0a${r} ${r} 0 1 0 ${f(-r * 2)} 0`;

// 청사초롱: 푸른 몸에 위아래로 붉은 단. 처마에 매달려 바람에 흔들리고, 누르면 크게 흔들린다.
export function createLantern(parent: Element, glow: Element, glowFill: string, at: Vec, tinted: Tinted) {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  const light = el('circle', { cx: at[0], cy: at[1] + 20, r: 36, fill: glowFill, opacity: 0 }, glow);
  set(pen(g, FINE), 'M0 0V7M0 23V30M-2.2 23L-3 29M2.2 23L3 29');
  const blue = paint(g, COLOR.blue, LINE);
  set(blue, 'M-4.6 9.6Q-6.4 15 -4.6 20.4H4.6Q6.4 15 4.6 9.6Z');
  const bands = paint(g, COLOR.red, LINE);
  set(bands, 'M-4.2 7H4.2L4.6 9.6H-4.6ZM-4.6 20.4H4.6L4.2 23H-4.2Z');
  set(pen(g, FINE), 'M-2 9.6Q-2.8 15 -2 20.4M2 9.6Q2.8 15 2 20.4');
  tinted.push([blue, COLOR.blue], [bands, COLOR.red]);
  el('title', {}, g).textContent = '청사초롱';
  const sway = pendulum(9, 0.9);
  g.addEventListener('pointerdown', () => sway.kick(2.6 * (Math.random() < 0.5 ? -1 : 1)));
  return {
    step(wind: number, lamp: number, t: number, dt: number) {
      const a = sway.step(wind * 0.7, dt);
      g.setAttribute('transform', `translate(${at[0]} ${at[1]}) rotate(${f(a * 30)}) scale(1.3)`);
      // 불은 조금씩 일렁인다
      light.setAttribute('opacity', f(lamp * (0.82 + 0.18 * Math.sin(t * 7.3 + at[0]))));
      light.setAttribute('cx', f(at[0] - Math.sin(a * 0.52) * 20));
    },
  };
}

// 풍경: 처마 끝의 작은 종과 그 아래 물고기 모양 쇳조각. 물고기가 바람을 받아 종보다 크게 흔들린다.
export function createChime(parent: Element, at: Vec, tinted: Tinted) {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  el('circle', { cy: 12, r: 12, fill: 'transparent' }, g);
  set(pen(g, FINE), 'M0 0V5');
  set(shape(g, LINE), 'M-1.4 5H1.4L3.4 11.6H-3.4Z');
  const fishG = el('g', {}, g);
  set(pen(fishG, FINE), 'M0 0V7');
  const fish = paint(fishG, COLOR.mustard, FINE * 1.4);
  set(fish, 'M0 7Q3.4 9.6 0 14L2.2 17H-2.2L0 14Q-3.4 9.6 0 7Z');
  tinted.push([fish, COLOR.mustard]);
  el('title', {}, g).textContent = '풍경';
  const bell = pendulum(14, 1.4);
  const tongue = pendulum(8, 0.8);
  g.addEventListener('pointerdown', () => {
    bell.kick(1.4);
    tongue.kick(-4);
  });
  return {
    step(wind: number, dt: number) {
      const a = bell.step(wind * 0.5, dt);
      const b = tongue.step(wind * 1.6 - a * 6, dt);
      g.setAttribute('transform', `translate(${f(at[0])} ${f(at[1])}) rotate(${f(a * 26)})`);
      fishG.setAttribute('transform', `translate(0 11.6) rotate(${f(b * 30)})`);
    },
  };
}

// 담 위에 식빵처럼 앉은 고양이. 꼬리가 담 아래로 늘어져 까딱거리고, 누르면 고개를 들고 꼬리를 친다.
export function createCat(parent: Element, at: Vec) {
  const g = el('g', { style: 'cursor:pointer', transform: `translate(${at[0]} ${at[1]})` }, parent);
  const tail = pen(g, LINE * 1.9);
  set(shape(g, LINE), 'M-13 0Q-14 -8 -6 -9.4Q4 -10.4 10 -8Q14 -5 13 0Z');
  set(blot(g), 'M-9 -8.4Q-5 -10 -1 -9.6Q-2 -5 -7 -5.4ZM4 -0.4Q5 -4.6 9 -5Q11 -3 11 -0.4Z');
  const headG = el('g', {}, g);
  set(shape(headG, LINE), 'M8 -8.6Q8 -14.4 13.6 -14.4Q19 -14.4 19 -8.6Q19 -3.6 13.6 -3.6Q8 -3.6 8 -8.6Z');
  set(shape(headG, LINE), 'M9 -12.4L9.6 -17L12.6 -14.2ZM18 -12.4L17.6 -17L14.6 -14.2Z');
  set(blot(headG), 'M9.2 -12.6L9.7 -16L11.8 -14ZM15.4 -13.6Q18 -13 18.6 -10Q16 -10.4 15.4 -13.6Z');
  const eyes = pen(headG, FINE);
  el('title', {}, g).textContent = '고양이';
  const swish = pendulum(7, 0.7);
  const lift = spring(50, 9);
  let awake = 0;
  let nextFlick = 3;
  g.addEventListener('pointerdown', () => {
    awake = 2.6;
    swish.kick(3);
  });
  return {
    step(wind: number, night: number, t: number, dt: number) {
      awake = Math.max(0, awake - dt);
      nextFlick -= dt;
      if (nextFlick < 0) {
        swish.kick((Math.random() - 0.5) * 2.4);
        nextFlick = 2 + Math.random() * 4;
      }
      const a = swish.step(wind * 0.25, dt);
      // 꼬리는 담 면을 따라 내려가다 끝에서 말린다
      const tx = -13 + a * 7;
      set(tail, `M-12 -2.4Q-16.6 1 -15 8Q${f(-14 + a * 3)} 14 ${f(tx)} 17.4`);
      const up = lift.step(awake > 0 ? 1 : 0, dt);
      headG.setAttribute('transform', `translate(0 ${f(-up * 2.4)}) rotate(${f(-up * 7)} 13.6 -8)`);
      // 자는 눈은 감은 선, 깬 눈은 점. 숨은 몸통이 아주 조금 오르내린다.
      set(eyes, up > 0.5 ? ring(11.6, -9.4, 0.6) + ring(15.8, -9.4, 0.6) : 'M10.6 -9.2Q11.6 -8.2 12.6 -9.2M14.8 -9.2Q15.8 -8.2 16.8 -9.2');
      eyes.setAttribute('stroke', night > 0.5 && up > 0.5 ? COLOR.warm : 'currentColor');
      g.setAttribute('transform', `translate(${at[0]} ${f(at[1] + Math.sin(t * 1.6) * 0.18)})`);
    },
  };
}

// 담 너머의 감나무. 잎은 다 지고 감만 남았다. 누르면 가지가 흔들리고 감 하나가 골목으로 떨어진다.
export function createTree(parent: Element, front: Element, base: Vec, rand: Rand, tinted: Tinted) {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  const tips: Vec[] = [];
  const grow = (from: Vec, angle: number, len: number, width: number, depth: number) => {
    const to: Vec = [from[0] + Math.sin(angle) * len, from[1] - Math.cos(angle) * len];
    const bend = rand(-0.25, 0.25);
    const mid: Vec = [(from[0] + to[0]) / 2 + Math.cos(angle) * len * bend, (from[1] + to[1]) / 2 + Math.sin(angle) * len * bend];
    set(pen(g, width), `M${f(from[0])} ${f(from[1])}Q${f(mid[0])} ${f(mid[1])} ${f(to[0])} ${f(to[1])}`);
    if (depth === 0) {
      tips.push(to);
      return;
    }
    const kids = depth > 2 ? 2 : rand() < 0.6 ? 2 : 3;
    for (let k = 0; k < kids; k++)
      grow(to, angle + (k - (kids - 1) / 2) * rand(0.55, 0.95) + rand(-0.15, 0.15), len * rand(0.62, 0.8), Math.max(FINE, width * 0.66), depth - 1);
  };
  grow(base, 0.04, 96, 2.4, 4);

  const fruits = tips
    .filter((_, i) => i % 3 === 0)
    .map((p) => {
      const node = paint(g, COLOR.persimmon, FINE * 1.4);
      set(node, ring(p[0], p[1] + 3.2, 3.1));
      set(blot(g), `M${f(p[0] - 1.6)} ${f(p[1] + 0.4)}L${f(p[0])} ${f(p[1] + 1.4)}L${f(p[0] + 1.6)} ${f(p[1] + 0.4)}Z`);
      tinted.push([node, COLOR.persimmon]);
      return { node, at: p, back: 0 };
    });
  // 떨어지는 감은 지붕과 담 앞을 지나야 해서 맨 앞 겹에 따로 그린다
  const falling = paint(front, COLOR.persimmon, FINE * 1.4);
  falling.setAttribute('display', 'none');
  tinted.push([falling, COLOR.persimmon]);
  el('title', {}, g).textContent = '감나무';

  const sway = pendulum(12, 1.2);
  let drop: { x: number; y: number; v: number; rest: number; from: number } | null = null;
  g.addEventListener('pointerdown', () => {
    sway.kick(1.6 * (Math.random() < 0.5 ? -1 : 1));
    const ripe = fruits.map((_, i) => i).filter((i) => fruits[i].back <= 0);
    if (drop || !ripe.length) return;
    const i = ripe[Math.floor(Math.random() * ripe.length)];
    fruits[i].node.setAttribute('display', 'none');
    fruits[i].back = 24;
    drop = { x: fruits[i].at[0], y: fruits[i].at[1] + 3.2, v: 0, rest: 0, from: i };
  });

  return {
    step(wind: number, dt: number) {
      const a = sway.step(wind * 0.35, dt);
      g.setAttribute('transform', `rotate(${f(a * 2.2)} ${base[0]} ${base[1]})`);
      for (const fr of fruits) {
        if (fr.back <= 0) continue;
        fr.back -= dt;
        // 떨어진 자리에는 한참 뒤에 새 감이 달린다
        if (fr.back <= 0) fr.node.setAttribute('display', 'inline');
      }
      if (!drop) return;
      const floor = GROUND + 22;
      if (drop.y < floor) {
        drop.v += 520 * dt;
        drop.y = Math.min(floor, drop.y + drop.v * dt);
        // 바닥에 닿으면 한 번 낮게 튄다
        if (drop.y >= floor && drop.v > 90) {
          drop.v = -drop.v * 0.28;
          drop.y = floor - 0.1;
        }
      } else drop.rest += dt;
      falling.setAttribute('display', 'inline');
      set(falling, ring(drop.x, drop.y, 3.1));
      falling.setAttribute('opacity', f(Math.max(0, 1 - Math.max(0, drop.rest - 3) / 1.5)));
      if (drop.rest > 4.5) {
        falling.setAttribute('display', 'none');
        drop = null;
      }
    },
  };
}
