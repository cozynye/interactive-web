import { gait } from '../lib/gait';
import { blot, el, f, INK, limb, paint, PAPER, pen, PEN, place, pt, shape, Vec } from '../lib/ink';
import { clamp, ease, lerp, pendulum, spring } from '../lib/motion';
import { COLOR, SCALE } from './kit';

export interface Walker {
  g: SVGGElement;
  x: number;
  // 발이 닿는 높이. 클수록 앞에 선 사람이라 나중에 그린다.
  y: number;
  dir: 1 | -1;
  // 밤에 어둡게 눌러 줄 색 면
  tinted: Array<[SVGElement, string]>;
  step(t: number, dt: number, wind: number): void;
  // 눌렀을 때: 걸음을 멈추고 인사한다
  greet(): void;
}

type Arm = [Vec, Vec, Vec];

const DEG = Math.PI / 180;
// 치마 밑단의 금박 줄처럼 색 면 위에 얹는 밝은 선
const TRIM = '#f2ead8';
const set = (n: Element, d: string) => n.setAttribute('d', d);

// 멈춰 서서 허리를 숙였다가 펴는 인사. 0(걷는 중)~1(다 숙임)을 돌려준다.
function bowing(down: number, hold: number, up: number) {
  let at = -1;
  return {
    start() {
      if (at < 0) at = 0;
    },
    step(dt: number) {
      if (at < 0) return 0;
      at += dt;
      if (at >= down + hold + up) {
        at = -1;
        return 0;
      }
      return at < down ? ease(at / down) : at < down + hold ? 1 : 1 - ease((at - down - hold) / up);
    },
  };
}

// 팔: 어깨에서 a만큼 앞으로 내민 위팔과 거기서 bend만큼 더 굽은 아래팔
const arm = (sh: Vec, a: number, bend: number, upperLen = 15, foreLen = 14): Arm => {
  const elbow: Vec = [sh[0] + upperLen * Math.sin(a), sh[1] + upperLen * Math.cos(a)];
  return [sh, elbow, [elbow[0] + foreLen * Math.sin(a + bend), elbow[1] + foreLen * Math.cos(a + bend)]];
};

// 아래팔이 향하는 쪽(u)과 그 옆쪽(n). 팔을 늘어뜨렸을 때 n은 등 쪽이다.
const along = ([, e, w]: Arm): [Vec, Vec] => {
  const l = Math.hypot(w[0] - e[0], w[1] - e[1]) || 1;
  const u: Vec = [(w[0] - e[0]) / l, (w[1] - e[1]) / l];
  return [u, [-u[1], u[0]]];
};

// 소매: 어깨에서 손목까지 팔을 감싸고 손목 아래로 배래가 처진다. 처진 끝은 팔 방향과 상관없이 아래로 늘어지고,
// drop은 처진 깊이, backset은 등 쪽으로 물러난 거리, lag는 흔들려 밀린 거리다.
function sleeve(node: Element, a: Arm, width: number, drop: number, backset: number, lag: number) {
  const [s, e, w] = a;
  const [, n] = along(a);
  const front: Vec = [w[0] - n[0] * width * 0.45, w[1] - n[1] * width * 0.45];
  const pouch: Vec = [w[0] - backset + lag, w[1] + drop];
  set(
    node,
    `M${f(s[0] + 2.8)} ${f(s[1] - 1.6)} Q${f(e[0] - n[0] * width * 0.5)} ${f(e[1] - n[1] * width * 0.5)} ${pt(front)} L${pt(pouch)} Q${f(e[0] + n[0] * width * 0.5 - backset * 0.5 + lag * 0.3)} ${f(e[1] + n[1] * width * 0.5 + drop * 0.5)} ${f(s[0] - 3.2)} ${f(s[1] + 0.6)}Z`
  );
  return { front, pouch };
}

const hand = (parent: Element) => el('ellipse', { rx: 1.7, ry: 2.1, fill: PAPER, stroke: INK, 'stroke-width': PEN * 0.7 }, parent);
const putHand = (node: Element, a: Arm, out = 1.6) => {
  const [u] = along(a);
  const at: Vec = [a[2][0] + u[0] * out, a[2][1] + u[1] * out];
  node.setAttribute('cx', f(at[0]));
  node.setAttribute('cy', f(at[1]));
  return at;
};

// 늘어진 끈 한 가닥: 위에서 아래로 가늘게 내려가다 끝에서 술처럼 퍼진다
const strand = (k: Vec, e: Vec, cx: number, w: number, tassel = 4) => {
  const cy = (k[1] + e[1]) / 2;
  return `M${f(k[0] - w / 2)} ${f(k[1])} Q${f(cx - w / 2)} ${f(cy)} ${f(e[0] - w / 2)} ${f(e[1])} l-0.6 ${tassel} h${f(w + 1.2)} l-0.6 ${-tassel} Q${f(cx + w / 2)} ${f(cy)} ${f(k[0] + w / 2)} ${f(k[1])}Z`;
};

// 버선과 코가 들린 신. 발목을 중심으로 pitch도만큼 기울인다.
function footwear(sock: Element, shoe: Element, ankle: Vec, pitch: number) {
  const r = pitch * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const R = (x: number, y: number) => pt([ankle[0] + x * c - y * s, ankle[1] + x * s + y * c]);
  set(sock, `M${R(-2.7, -5.6)} L${R(2.5, -5.6)} Q${R(3, -1.6)} ${R(6.6, -0.8)} L${R(6.6, 1)} L${R(-2.4, 1.2)} Q${R(-3.1, -2)} ${R(-2.7, -5.6)}Z`);
  set(shoe, `M${R(-2.9, -2.4)} Q${R(0.6, -0.4)} ${R(4.6, -1.4)} Q${R(6.8, -1.6)} ${R(7.7, -3)} Q${R(8.6, 0.5)} ${R(6.7, 1.6)} L${R(-2.2, 1.6)} Q${R(-3.3, 0.4)} ${R(-2.9, -2.4)}Z`);
}

// 갓을 쓰고 도포를 입은 사람. 부채를 들고 팔을 흔들며 걷거나 뒷짐을 지고 걷고, 누르면 서서 허리를 숙인다.
export function createSeonbi(parent: Element, x: number, y: number, dir: 1 | -1, cordColor = COLOR.blue): Walker {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  const behind = Math.random() < 0.4;
  const bearded = Math.random() < 0.5;

  const back = el('g', {}, g);
  const farHand = hand(back);
  const farSleeve = shape(back, PEN * 0.9);
  // 다리 하나: 통 넓은 바지, 버선, 신, 발목을 묶은 대님
  const legs = [0, 1].map(() => {
    const lg = el('g', {}, g);
    return { g: lg, leg: limb(lg, 7), sock: shape(lg, PEN * 0.7), shoe: blot(lg), tie: pen(lg, PEN * 0.55) };
  });
  const coat = shape(g);
  const seams = pen(g, PEN * 0.5);

  // 허리 위는 한 번만 그려 두고 묶음째 오르내리고 숙인다
  const upper = el('g', {}, g);
  el('path', { fill: PAPER, d: 'M33.6 43Q40.6 38.6 47.6 43Q48.6 54 48 68.4H32.6Q32.8 54 33.6 43Z' }, upper);
  set(pen(upper), 'M32.6 67Q32.8 54 33.6 43Q40.6 38.6 47.6 43Q48.6 54 48 67');
  limb(upper, 3.2).draw(
    [
      [41.5, 43],
      [42, 36.4],
    ],
    [0.2, 0.2]
  );
  // 깃과 동정은 목을 감아 가슴 앞에서 여며진다
  set(shape(upper, PEN * 0.7), 'M37.2 41.5L43.7 52.8L46.5 42.3L44.7 41.5L43.3 48.4L39.2 41.2Z');
  set(pen(upper, PEN * 0.45), 'M43.7 52.8Q44.6 60 44.9 67');
  // 가슴에 두른 세조대와 앞으로 늘어진 술
  const band = paint(upper, cordColor, PEN * 0.55);
  set(band, 'M33.1 55.8L47.7 56.6L47.8 58.5L33 57.7Z');
  const tassels = paint(upper, cordColor, PEN * 0.5);
  el('ellipse', { cx: 42.4, cy: 32, rx: 3.6, ry: 4.6, fill: PAPER, stroke: INK, 'stroke-width': PEN }, upper);
  // 귀밑머리와 수염
  set(blot(upper), `M38.8 29.4H41.5Q40.7 32 39.7 34.6Q38.5 32.4 38.8 29.4Z${bearded ? 'M44.9 35.3Q46.7 37.6 45.7 41.4Q44.2 38.8 43 36.5Z' : ''}`);
  // 구슬을 꿴 갓끈
  const strap = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.15, 'stroke-linecap': 'round', 'stroke-dasharray': '0.01 1.9' }, upper);
  // 갓: 넓고 얇은 양태 위에 위로 좁아지는 대우, 그 둘레의 띠
  set(blot(upper), 'M29.8 28.4Q42.4 26 55 28.4Q42.4 30.8 29.8 28.4ZM38.4 27.8L39.2 19.4Q42.4 18.2 45.6 19.4L46.4 27.8Z');
  el('path', { fill: PAPER, d: 'M38.75 26.3H46.05L45.97 25.4H38.83Z' }, upper);
  const nearHand = hand(upper);
  const fan = paint(upper, COLOR.mustard, PEN * 0.55);
  const fanCord = pen(upper, PEN * 0.45);
  const nearSleeve = shape(upper, PEN * 0.9);
  const cuffLine = pen(upper, PEN * 0.45);

  const walk = gait({ kind: 'walk', period: 1.1, stride: 22 });
  const swing = [spring(60, 9), spring(60, 9)];
  const cloth = spring(34, 5);
  const tail = spring(30, 4);
  const beads = spring(40, 3.5);
  const trail = spring(24, 5);
  const bow = bowing(0.5, 1.0, 0.6);
  let phase = Math.random();

  const me: Walker = {
    g,
    x,
    y,
    dir,
    tinted: [
      [band, cordColor],
      [tassels, cordColor],
      [fan, COLOR.mustard],
    ],
    greet: bow.start,
    step(t, dt, wind) {
      const lean = bow.step(dt);
      const go = clamp(1 - lean * 1.5, 0, 1);
      phase += (dt / walk.period) * go;
      me.x += dir * walk.speed * SCALE * dt * go;
      place(g, me.x, me.y, dir, SCALE);

      const p = walk.pose(phase, go);
      const b = p.bob;
      const push = wind * dir;
      p.feet.forEach((fo, i) => {
        const [ax, ay] = fo.ankle;
        legs[i].leg.draw([p.hip, fo.knee, fo.ankle], [0.3, 0.8]);
        footwear(legs[i].sock, legs[i].shoe, fo.ankle, fo.pitch);
        set(legs[i].tie, `M${f(ax - 2.8)} ${f(ay - 5.2)}L${f(ax + 2.6)} ${f(ay - 4.8)}M${f(ax - 2.4)} ${f(ay - 5)}l-2 2.4M${f(ax - 2.4)} ${f(ay - 5)}l-0.6 3`);
      });
      g.insertBefore(legs[p.front].g, coat);

      // 도포 자락: 앞 무릎을 감싸고 내려가서 걸음에 따라 벌어졌다 닫히고, 뒷자락은 한 박자 늦게 따라온다
      const kF = p.feet[p.front].knee;
      const aF = p.feet[p.front].ankle;
      const aR = p.feet[1 - p.front].ankle;
      const waist = 66 + b;
      const lag = trail.step(-go * 1.6 - push * 3, dt);
      const fx = Math.max(kF[0] + 3.6, 49.4);
      const hemF = Math.max(fx + 0.6, aF[0] + 1.5);
      const hemR = Math.min(29.4, aR[0] - 1) + lag;
      const mid = 85 + b * 0.5;
      // 숙일 때는 등 쪽 허리선을 윗몸 밑으로 밀어 넣어 엉덩이에 모서리가 튀어나오지 않게 한다
      set(coat, `M${f(32.6 + lean * 1.2)} ${f(waist - lean * 4)}L48 ${f(waist - lean)}Q${f(fx + 0.6)} ${f(mid)} ${f(hemF)} 104Q40 106.6 ${f(hemR)} 105Q${f(30.2 + lag * 0.3)} ${f(mid + 1)} ${f(32.6 + lean * 1.2)} ${f(waist - lean * 4)}Z`);
      // 앞섶 선, 뒤트임 선, 무릎에 잡히는 주름
      set(
        seams,
        `M44.9 ${f(waist + 1)}Q${f(fx - 2.6)} ${f(mid + 1)} ${f(hemF - 3.8)} 104.5M35.8 ${f(waist + 12)}Q${f(34.8 + lag * 0.3)} 92 ${f(hemR + 3.8)} 105.2M${f(kF[0] + 1.6)} ${f(kF[1] - 4)}q-1.8 3.4 -1 7.6M39.6 ${f(waist + 6)}Q${f((39.6 + hemF) / 2 - 2)} 90 ${f((hemF + hemR) / 2 + 1)} 105.6`
      );

      const turn = `translate(0 ${f(b)}) rotate(${f(lean * 32)} 40 66)`;
      upper.setAttribute('transform', turn);
      back.setAttribute('transform', turn);

      // 세조대 술과 갓끈은 걸음과 바람에 밀려 뒤로 날린다
      const flow = tail.step(-1.5 - go * 2.5 - push * 4.5 + Math.sin(t * 7) * 0.5 + lean * 5, dt);
      const knot: Vec = [46.2, 57.5];
      set(
        tassels,
        `M${f(knot[0] - 1.7)} ${f(knot[1] - 1.5)}h3.4v3h-3.4Z${strand(knot, [knot[0] + 0.8 + flow, knot[1] + 21], knot[0] + 1.2 + flow * 0.3, 1)}${strand([knot[0] - 0.8, knot[1]], [knot[0] - 1.6 + flow * 0.85, knot[1] + 17.5], knot[0] - 0.6 + flow * 0.25, 1)}`
      );
      const sw = beads.step(-go * 1.2 - push * 2.5 + lean * 6, dt);
      set(strap, `M45 29.9Q${f(46.4 + sw * 0.4)} 38 ${f(45.4 + sw)} 46.6`);

      // 팔: 뒷짐을 지거나 다리와 엇갈려 흔들고, 숙이는 동안에는 앞으로 모은다
      const sh: Vec = [41.5, 44];
      const reach = (p.feet[0].ankle[0] - 40) / (walk.stride / 2);
      const sway = cloth.step(-reach * 2.2 * go - push * 3, dt);
      let far: Arm;
      let near: Arm;
      if (behind) {
        const a = lerp(-0.12, 0.16, lean);
        far = arm([sh[0] - 1.5, sh[1]], a - 0.04, lerp(-0.46, 0.5, lean));
        near = arm(sh, a, lerp(-0.5, 0.55, lean));
        swing[0].step(0, dt);
      } else {
        const farA = (swing[0].step(-reach * 13 * go, dt) + lean * 6) * DEG;
        const nearA = (swing[1].step(reach * 11 * go, dt) + lean * 8) * DEG;
        far = arm([sh[0] - 1.5, sh[1]], farA, 0.22 + lean * 0.4);
        near = arm(sh, nearA, 0.14 + lean * 0.5);
      }
      putHand(farHand, far);
      sleeve(farSleeve, far, 7.6, 9, 4.6, -sway);
      const grip = putHand(nearHand, near);
      const edge = sleeve(nearSleeve, near, 7.6, 10, 5, sway);
      // 소매 부리 안쪽의 겹친 선
      set(cuffLine, `M${f(edge.front[0] - 1)} ${f(edge.front[1] - 2.6)}Q${f((edge.front[0] + edge.pouch[0]) / 2 - 0.6)} ${f((edge.front[1] + edge.pouch[1]) / 2 - 3.4)} ${f(edge.pouch[0] + 0.6)} ${f(edge.pouch[1] - 2.8)}`);

      // 접은 부채: 손에서 아래팔보다 조금 앞으로 내밀고, 끝에 선추가 달린다
      const [u] = along(near);
      const tilt = behind ? -0.5 : 0.75;
      const d: Vec = [u[0] * Math.cos(tilt) + u[1] * Math.sin(tilt), -u[0] * Math.sin(tilt) + u[1] * Math.cos(tilt)];
      const q: Vec = [-d[1], d[0]];
      const base: Vec = [grip[0] - d[0] * 2.4, grip[1] - d[1] * 2.4];
      const tip: Vec = [grip[0] + d[0] * 11.5, grip[1] + d[1] * 11.5];
      set(fan, `M${f(base[0] - q[0] * 0.6)} ${f(base[1] - q[1] * 0.6)}L${f(tip[0] - q[0] * 1.1)} ${f(tip[1] - q[1] * 1.1)}L${f(tip[0] + q[0] * 1.1)} ${f(tip[1] + q[1] * 1.1)}L${f(base[0] + q[0] * 0.6)} ${f(base[1] + q[1] * 0.6)}Z`);
      set(fanCord, `M${pt(base)}Q${f(base[0] + flow * 0.2)} ${f(base[1] + 3)} ${f(base[0] + flow * 0.5)} ${f(base[1] + 6)}m-0.7 0l0.2 2.4m0.9 -2.4l0.4 2.2`);
    },
  };
  return me;
}

// 치마저고리를 입은 사람. 치마에 가려 걸음이 짧고 낮다. 절반은 보따리를 들고 걷는다.
export function createLady(parent: Element, x: number, y: number, dir: 1 | -1, chimaColor = COLOR.red, trimColor = COLOR.blue): Walker {
  const g = el('g', { style: 'cursor:pointer' }, parent);
  const carrying = Math.random() < 0.5;
  const bundleColor = chimaColor === COLOR.mustard ? COLOR.jade : COLOR.mustard;
  const charmColor = chimaColor === COLOR.red ? COLOR.jade : COLOR.red;

  const back = el('g', {}, g);
  const farHand = hand(back);
  const farSleeve = shape(back, PEN * 0.9);
  const farCuff = paint(back, trimColor, PEN * 0.6);
  const feet = [0, 1].map(() => ({ sock: shape(g, PEN * 0.7), shoe: paint(g, trimColor, PEN * 0.6) }));
  const chima = paint(g, chimaColor);
  const pleats = pen(g, PEN * 0.36);
  const hemLine = el('path', { fill: 'none', stroke: TRIM, 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);

  const upper = el('g', {}, g);
  // 노리개: 저고리 아래로 늘어진 매듭과 술
  const charmG = el('g', { transform: 'translate(46.2 53)' }, upper);
  set(pen(charmG, PEN * 0.45), 'M0 0V4.6');
  const charmKnot = el('circle', { cy: 5.8, r: 1.5, fill: COLOR.mustard, stroke: INK, 'stroke-width': PEN * 0.5 }, charmG);
  const charmTassel = paint(charmG, charmColor, PEN * 0.5);
  set(charmTassel, 'M-1 7.4H1L1.9 17H-1.9Z');
  set(pen(charmG, PEN * 0.35), 'M-0.6 9.6L-0.9 16.6M0.6 9.6L0.9 16.6');
  // 저고리: 짧은 몸판, 색을 댄 깃과 그 안쪽의 흰 동정
  set(shape(upper), 'M34.6 43Q40.6 39 46.4 43Q47.6 48 47.2 52.6Q41 54.4 34.2 53Q34 47.4 34.6 43Z');
  limb(upper, 3).draw(
    [
      [41.1, 43.2],
      [41.6, 36.8],
    ],
    [0.2, 0.2]
  );
  const collar = paint(upper, trimColor, PEN * 0.6);
  set(collar, 'M37.2 41.7L43 50.8L46 42.2L44.3 41.3L42.8 46.6L39.2 41.3Z');
  el('path', { fill: PAPER, stroke: INK, 'stroke-width': PEN * 0.35, d: 'M39.2 41.3L42.8 46.6L43.3 44.6L40.6 40.9Z' }, upper);
  const ribbon = paint(upper, trimColor, PEN * 0.6);
  // 머리: 쪽에 달린 댕기, 얼굴, 가르마 타 넘긴 머리와 쪽, 비녀
  const daenggi = paint(upper, COLOR.red, PEN * 0.5);
  el('ellipse', { cx: 42, cy: 32.2, rx: 3.7, ry: 4.7, fill: PAPER, stroke: INK, 'stroke-width': PEN }, upper);
  set(blot(upper), 'M45.6 30.2Q44.4 26.2 40.6 26.4Q37 27.2 37.2 32Q37.2 35 38.6 37Q40.6 34.6 41.4 31.6Q43 29.8 45.6 30.2ZM33.9 35.6a2.7 2.3 0 1 0 5.4 0a2.7 2.3 0 1 0 -5.4 0');
  set(pen(upper, PEN * 0.75), 'M32.4 34.6L40 36.2');
  const pinBall = el('circle', { cx: 32, cy: 34.5, r: 1.15, fill: COLOR.mustard, stroke: INK, 'stroke-width': PEN * 0.45 }, upper);
  const nearHand = hand(upper);
  // 보따리: 보자기로 싸서 위에서 묶은 짐. 손에 매달려 걸음마다 흔들린다.
  const bundleG = el('g', { display: carrying ? 'inline' : 'none' }, upper);
  const bundle = paint(bundleG, bundleColor, PEN * 0.8);
  set(bundle, 'M-6.4 5.4Q-8 13.4 -5 15.6H5Q8 13.4 6.4 5.4Q0 2.8 -6.4 5.4ZM0 0.6L-4.2 2.2L-0.6 5L-3 0.4ZM0 0.6L4.2 2.2L0.6 5L3 0.4Z');
  set(pen(bundleG, PEN * 0.45), 'M-3.4 5.6Q-1.4 9.6 -4.6 14.4M3.2 5.6Q1.8 10 4.4 13.6M0 5Q-0.6 9 0.4 12');
  const nearSleeve = shape(upper, PEN * 0.9);
  const nearCuff = paint(upper, trimColor, PEN * 0.6);

  const walk = gait({ kind: 'shuffle' });
  const swing = [spring(50, 9), spring(50, 9)];
  const cloth = spring(34, 5);
  const tail = spring(26, 4);
  const skirt = spring(22, 5);
  const charm = pendulum(16, 1.6);
  const braid = pendulum(20, 2);
  const load = pendulum(13, 1.8);
  const bow = bowing(0.5, 0.8, 0.6);
  let phase = Math.random();

  // 끝동: 소매 부리를 두른 색 띠
  const cuff = (node: Element, a: Arm, edge: { front: Vec; pouch: Vec }) => {
    const [u] = along(a);
    const k = 3.2;
    set(node, `M${pt(edge.front)}L${pt(edge.pouch)}L${f(edge.pouch[0] - u[0] * k)} ${f(edge.pouch[1] - u[1] * k)}L${f(edge.front[0] - u[0] * k)} ${f(edge.front[1] - u[1] * k)}Z`);
  };

  const me: Walker = {
    g,
    x,
    y,
    dir,
    tinted: [
      [chima, chimaColor],
      [collar, trimColor],
      [ribbon, trimColor],
      [farCuff, trimColor],
      [nearCuff, trimColor],
      [feet[0].shoe, trimColor],
      [feet[1].shoe, trimColor],
      [daenggi, COLOR.red],
      [charmKnot, COLOR.mustard],
      [charmTassel, charmColor],
      [pinBall, COLOR.mustard],
      [bundle, bundleColor],
    ],
    greet: bow.start,
    step(t, dt, wind) {
      const lean = bow.step(dt);
      const go = clamp(1 - lean * 1.5, 0, 1);
      phase += (dt / walk.period) * go;
      me.x += dir * walk.speed * SCALE * dt * go;
      place(g, me.x, me.y, dir, SCALE);

      const p = walk.pose(phase, go);
      const b = p.bob;
      const push = wind * dir;
      p.feet.forEach((fo, i) => footwear(feet[i].sock, feet[i].shoe, [fo.ankle[0], fo.ankle[1] + 2.4], fo.pitch));

      // 치마: 가슴에서 시작해 앞 무릎과 두 발목을 따라 종 모양으로 퍼지고, 뒷자락은 늦게 따라온다
      const kF = p.feet[p.front].knee;
      const aF = p.feet[p.front].ankle;
      const aR = p.feet[1 - p.front].ankle;
      const chest = 51 + b;
      const lag = skirt.step(-go * 1.8 - push * 3.5, dt);
      const hemF = Math.max(aF[0] + 5.5, 53.4) + lag * 0.4;
      const hemR = Math.min(aR[0] - 5.5, 26.4) + lag;
      const belly = Math.max(kF[0] + 6.5, 52);
      const mid = 84 + b * 0.5;
      set(chima, `M34.4 ${f(chest)}H47C50.4 ${f(chest + 11)} ${f(belly)} ${f(mid)} ${f(hemF)} 114Q40 117.4 ${f(hemR)} 114.6C${f(hemR + 2.4)} ${f(mid + 4)} 31 ${f(chest + 13)} 34.4 ${f(chest)}Z`);
      // 주름은 치마허리에서 밑단으로 부채꼴로 퍼진다
      const lines: string[] = [];
      for (let i = 0; i < 4; i++) {
        const k = i / 3;
        const top = lerp(37, 45, k);
        const foot = lerp(hemR + 5, hemF - 4.5, k);
        const end = 108.6 - (i % 2) * 16;
        lines.push(`M${f(top)} ${f(chest + 3 + (i % 2) * 2)}Q${f(lerp(top, foot, 0.62) + (k - 0.5) * 3)} ${f(mid)} ${f(foot)} ${f(end)}`);
      }
      set(pleats, lines.join(''));
      set(hemLine, `M${f(hemR + 1.2)} 111.4Q40 114.2 ${f(hemF - 1)} 110.8`);

      const turn = `translate(0 ${f(b)}) rotate(${f(lean * 22)} 40 67)`;
      upper.setAttribute('transform', turn);
      back.setAttribute('transform', turn);

      // 고름: 고 하나와 길이가 다른 두 가닥이 치마 위로 늘어져 날린다
      const flow = tail.step(-1.5 - go * 2.5 - push * 4.5 + Math.sin(t * 6) * 0.5 + lean * 4, dt);
      const knot: Vec = [44.2, 50.4];
      set(
        ribbon,
        `M${pt(knot)}q-3.6 -0.6 -4.6 1.8q1.6 1.8 4.6 0.2Z${strand(knot, [knot[0] + 1.4 + flow, knot[1] + 21], knot[0] + 1.8 + flow * 0.3, 1.9, 0)}${strand([knot[0] - 0.6, knot[1] + 0.4], [knot[0] - 1.4 + flow * 0.8, knot[1] + 16], knot[0] + flow * 0.25, 1.7, 0)}`
      );
      const stepKick = Math.sin(phase * 4 * Math.PI) * go;
      charmG.setAttribute('transform', `translate(46.2 53) rotate(${f(charm.step(push * 1.2 + stepKick * 0.5 + go * 0.4 - lean * 2, dt) * 26)})`);
      const hang = braid.step(push * 1.4 + go * 0.6 - lean * 2.4, dt);
      set(daenggi, strand([36.2, 37.2], [35.6 - hang * 4, 45.6], 36.2 - hang * 1.2, 1.7, 0));

      // 팔은 작게 흔들고, 인사할 때는 두 손을 앞에 모은다
      const sh: Vec = [39.8, 44.4];
      const reach = (p.feet[0].ankle[0] - 40) / (walk.stride / 2);
      const sway = cloth.step(-reach * 1.4 * go - push * 2, dt);
      const farA = (swing[0].step(-reach * 8 * go, dt) + lean * 10) * DEG;
      const nearA = carrying ? (3 + lean * 4) * DEG : (swing[1].step(reach * 7 * go, dt) + lean * 12) * DEG;
      const far = arm([sh[0] + 1.4, sh[1]], farA, 0.5 + lean * 0.5, 14, 13);
      const near = arm(sh, nearA, carrying ? 0.34 : 0.5 + lean * 0.5, 14, 13);
      putHand(farHand, far);
      cuff(farCuff, far, sleeve(farSleeve, far, 5.6, 3.2, 2.2, -sway));
      const grip = putHand(nearHand, near);
      cuff(nearCuff, near, sleeve(nearSleeve, near, 5.6, 3.6, 2.4, sway));
      if (carrying) bundleG.setAttribute('transform', `translate(${f(grip[0])} ${f(grip[1] + 0.6)}) rotate(${f(load.step(stepKick * 0.9 + push * 0.8 - lean * 1.5, dt) * 24)})`);
    },
  };
  return me;
}
