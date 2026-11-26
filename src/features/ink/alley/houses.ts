import { blot, el, f, paint, pen, shape, Vec } from '../lib/ink';
import { COLOR, FINE, GROUND, H, LINE, W } from './kit';

type Rand = (a?: number, b?: number) => number;

export interface Pane {
  node: SVGRectElement;
  glow: SVGCircleElement;
  // 이만큼 어두워지면(Palette.lamp) 불이 켜진다. 집마다 달라서 하나씩 켜진다.
  on: number;
}

const set = (n: Element, d: string) => n.setAttribute('d', d);
const ring = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${f(r * 2)} 0a${r} ${r} 0 1 0 ${f(-r * 2)} 0`;

// 기와지붕 한 채를 정면에서 본 모습. 처마는 가운데가 처지고 양 끝이 들린다.
// 돌려주는 함수는 처마 위의 한 점(u: 왼쪽 0 ~ 오른쪽 1)이다.
function roof(g: Element, x0: number, x1: number, eaveY: number, ridgeY: number, lift = 12) {
  const mid = (x0 + x1) / 2;
  const inset = (x1 - x0) * 0.15;
  const r0 = x0 + inset;
  const r1 = x1 - inset;
  const eave = (u: number): Vec => [
    x0 + (x1 - x0) * u,
    (1 - u) * (1 - u) * (eaveY - lift) + 2 * u * (1 - u) * (eaveY + lift * 0.55) + u * u * (eaveY - lift),
  ];
  const sideY = (eaveY + ridgeY) / 2 + 5;

  set(
    shape(g, LINE),
    `M${x0} ${eaveY - lift} Q${mid} ${eaveY + lift * 0.55} ${x1} ${eaveY - lift} Q${f(x1 - inset * 0.3)} ${f(sideY)} ${f(r1 + 3)} ${ridgeY - 2} Q${f(r1 + 4)} ${ridgeY - 8} ${f(r1 - 1)} ${ridgeY - 6} Q${mid} ${ridgeY - 3.5} ${f(r0 + 1)} ${ridgeY - 6} Q${f(r0 - 4)} ${ridgeY - 8} ${f(r0 - 3)} ${ridgeY - 2} Q${f(x0 + inset * 0.3)} ${f(sideY)} ${x0} ${eaveY - lift}Z`
  );
  // 기왓골: 용마루에서 처마로 내려오는 줄
  const n = Math.round((x1 - x0) / 6.5);
  let lines = '';
  let ends = '';
  let rafters = '';
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const tx = r0 + (r1 - r0) * u;
    const [ex, ey] = eave(u);
    lines += `M${f(tx)} ${ridgeY}Q${f((tx + ex) / 2 + (ex - tx) * 0.16)} ${f((ridgeY + ey) / 2 + 3)} ${f(ex)} ${f(ey - 1.6)}`;
    ends += ring(ex, ey - 0.2, 1.25);
    if (i % 2) rafters += ring(ex, ey + 6.2, 0.9);
  }
  set(pen(g, FINE), lines);
  // 용마루는 두 줄로 쌓고 양 끝에 망와를 얹는다
  set(pen(g, LINE), `M${f(r0 - 2)} ${ridgeY - 1}Q${mid} ${ridgeY + 1.5} ${f(r1 + 2)} ${ridgeY - 1}`);
  set(blot(g), ring(r0 - 2.4, ridgeY - 5.4, 2.3) + ring(r1 + 2.4, ridgeY - 5.4, 2.3));
  // 처마 끝의 막새와 그 아래 서까래 끝
  set(shape(g, FINE), ends);
  set(pen(g, LINE), `M${x0 + 3} ${eaveY - lift + 4.4} Q${mid} ${eaveY + lift * 0.55 + 4} ${x1 - 3} ${eaveY - lift + 4.4}`);
  set(shape(g, FINE), rafters);
  return eave;
}

// 띠살 창: 불빛이 비칠 종이를 먼저 깔고 그 위에 살을 긋는다
function lattice(g: Element, glow: Element, glowFill: string, panes: Pane[], x: number, y: number, w: number, h: number, on: number) {
  const node = el('rect', { x, y, width: w, height: h, fill: '#fff' }, g);
  panes.push({
    node,
    glow: el('circle', { cx: x + w / 2, cy: y + h / 2, r: Math.max(w, h) * 1.15, fill: glowFill, opacity: 0 }, glow),
    on,
  });
  let d = '';
  const cols = Math.round(w / 4.2);
  for (let i = 1; i < cols; i++) d += `M${f(x + (w * i) / cols)} ${y}v${h}`;
  // 가로 살은 위, 가운데, 아래에 세 줄씩 묶는다
  for (const band of [0.14, 0.5, 0.86])
    for (const k of [-1, 0, 1]) d += `M${x} ${f(y + h * band + k * 2.6)}h${w}`;
  set(pen(g, FINE), d);
  el('rect', { x, y, width: w, height: h, fill: 'none', stroke: 'currentColor', 'stroke-width': LINE }, g);
}

// 돌담: 아래는 막돌 두 켜, 위는 줄눈을 넣은 사고석, 맨 위에 기와를 얹는다
function wall(g: Element, x0: number, x1: number, top: number, rand: Rand) {
  el('rect', { x: x0, y: top, width: x1 - x0, height: GROUND - top, fill: '#fdfdfc', class: 'pp' }, g);
  const stoneTop = top + (GROUND - top) * 0.52;
  let d = '';
  for (let y = top + 9, row = 0; y < stoneTop - 2; y += 7, row++) {
    d += `M${x0} ${f(y)}H${x1}`;
    for (let x = x0 + (row % 2 ? 9 : 2); x < x1; x += 17) d += `M${f(x)} ${f(y)}v7`;
  }
  set(pen(g, FINE), d);
  let stones = '';
  const rowH = (GROUND - stoneTop) / 2;
  for (let row = 0; row < 2; row++) {
    const y = stoneTop + row * rowH;
    for (let x = x0 + (row ? -6 : 1); x < x1; ) {
      const w = rand(13, 26);
      const r = rand(2.5, 4.5);
      stones += `M${f(x + r)} ${f(y + 0.8)}h${f(w - 2 * r)}q${r} 0 ${r} ${r}v${f(rowH - 2 * r - 1.6)}q0 ${r} -${r} ${r}h-${f(w - 2 * r)}q-${r} 0 -${r} -${r}v-${f(rowH - 2 * r - 1.6)}q0 -${r} ${r} -${r}`;
      x += w + 1.4;
    }
  }
  set(pen(g, FINE * 1.2), stones);
  // 담 위의 기와
  set(shape(g, LINE), `M${x0 - 3} ${top + 3} L${x1 + 3} ${top + 3} L${x1 + 1} ${top - 3} Q${(x0 + x1) / 2} ${top - 5} ${x0 - 1} ${top - 3}Z`);
  let tiles = '';
  let tips = '';
  for (let x = x0 + 2; x < x1; x += 5.5) {
    tiles += `M${f(x + 0.6)} ${top - 3.6}L${f(x)} ${top + 3}`;
    tips += ring(x, top + 3.4, 1);
  }
  set(pen(g, FINE), tiles);
  set(shape(g, FINE), tips);
  set(pen(g, LINE), `M${x0} ${GROUND}H${x1}`);
}

// 집의 몸채: 흰 벽에 기둥과 인방
function body(g: Element, x0: number, x1: number, top: number, bottom: number, posts: number[]) {
  el('rect', { x: x0, y: top, width: x1 - x0, height: bottom - top, fill: '#fdfdfc', class: 'pp', stroke: 'currentColor', 'stroke-width': LINE }, g);
  let d = `M${x0} ${top + 9}H${x1}`;
  for (const x of posts) d += `M${x - 2.6} ${top}V${bottom}M${x + 2.6} ${top}V${bottom}`;
  set(pen(g, LINE), d);
}

// 장독: 배가 부른 독에 뚜껑
function jar(g: Element, x: number, w: number, h: number) {
  const y = GROUND;
  const node = paint(g, COLOR.jar, LINE);
  set(node, `M${f(x - w * 0.28)} ${y} Q${f(x - w * 0.62)} ${f(y - h * 0.55)} ${f(x - w * 0.3)} ${f(y - h)} L${f(x + w * 0.3)} ${f(y - h)} Q${f(x + w * 0.62)} ${f(y - h * 0.55)} ${f(x + w * 0.28)} ${y}Z`);
  const lid = paint(g, COLOR.jar, LINE);
  set(lid, `M${f(x - w * 0.42)} ${f(y - h)} Q${x} ${f(y - h - w * 0.34)} ${f(x + w * 0.42)} ${f(y - h)}Z`);
  set(pen(g, FINE), `M${f(x - w * 0.47)} ${f(y - h * 0.62)} Q${x} ${f(y - h * 0.55)} ${f(x + w * 0.47)} ${f(y - h * 0.62)}`);
  return [node, lid];
}

// 골목 한 줄을 그린다: 왼쪽 살림집과 담, 솟을대문, 길가의 찻집, 오른쪽 살림집과 담, 바닥.
// 움직이거나 불이 켜지는 것들이 붙을 자리를 돌려준다.
export function buildStreet(g: SVGGElement, lane: SVGGElement, glow: SVGGElement, glowFill: string, rand: Rand) {
  const panes: Pane[] = [];
  const tinted: Array<[SVGElement, string]> = [];

  // 왼쪽 집: 담 너머로 몸채 윗부분과 지붕이 보인다
  body(g, 26, 224, 264, 340, [60, 125, 190]);
  lattice(g, glow, glowFill, panes, 74, 286, 38, 34, 0.5);
  lattice(g, glow, glowFill, panes, 139, 286, 38, 34, 0.78);
  roof(g, 4, 246, 264, 212);
  wall(g, -10, 262, 332, rand);
  // 대문과 찻집 사이의 짧은 담
  wall(g, 378, 408, 332, rand);

  // 솟을대문
  el('rect', { x: 262, y: 280, width: 118, height: GROUND - 280, fill: '#fdfdfc', class: 'pp', stroke: 'currentColor', 'stroke-width': LINE }, g);
  const doorTop = 296;
  let planks = '';
  for (let x = 280; x < 366; x += 7.2) planks += `M${f(x)} ${doorTop}V${GROUND - 3}`;
  set(pen(g, FINE), planks);
  set(pen(g, LINE), `M272 ${doorTop}H370M272 ${GROUND - 3}H370M321 ${doorTop}V${GROUND - 3}M272 280V${GROUND}M370 280V${GROUND}M262 289H380`);
  set(pen(g, LINE), ring(313, 348, 2.4) + ring(329, 348, 2.4));
  set(blot(g), ring(313, 345.6, 0.9) + ring(329, 345.6, 0.9));
  const gate = roof(g, 246, 396, 278, 250, 9);

  // 찻집: 길에 바로 면한 세 칸
  const tea = { x0: 404, x1: 636, top: 270, sill: 382 };
  body(g, tea.x0, tea.x1, tea.top, tea.sill, [404, 482, 558, 636]);
  lattice(g, glow, glowFill, panes, 416, 292, 60, 58, 0.42);
  lattice(g, glow, glowFill, panes, 492, 292, 26, 88, 0.36);
  lattice(g, glow, glowFill, panes, 522, 292, 26, 88, 0.36);
  lattice(g, glow, glowFill, panes, 568, 292, 60, 58, 0.46);
  // 창 아래 머름
  set(pen(g, LINE), 'M412 356H478M564 356H632M434 356V382M456 356V382M586 356V382M608 356V382');
  // 기단
  el('rect', { x: 396, y: tea.sill, width: 248, height: GROUND - tea.sill, fill: '#fdfdfc', class: 'pp', stroke: 'currentColor', 'stroke-width': LINE }, g);
  let base = '';
  for (let x = 414; x < 644; x += rand(18, 30)) base += `M${f(x)} ${tea.sill}V${GROUND}`;
  set(pen(g, FINE), base);
  const teaEave = roof(g, 386, 654, 268, 214);
  // 현판
  el('rect', { x: 497, y: 271, width: 46, height: 15, fill: '#fdfdfc', class: 'pp', stroke: 'currentColor', 'stroke-width': LINE }, g);
  const sign = el('text', { x: 520, y: 282.6, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, fill: 'currentColor', style: 'font-family:serif;letter-spacing:3px' }, g);
  sign.textContent = '찻집';
  // 평상
  const bench = paint(g, COLOR.wood, LINE);
  set(bench, `M566 372H632V377H566Z`);
  tinted.push([bench, COLOR.wood]);
  set(pen(g, LINE), `M571 377V${GROUND}M627 377V${GROUND}M571 385H627`);

  // 오른쪽 집과 담, 담 앞의 장독
  body(g, 700, 930, 268, 344, [734, 815, 896]);
  lattice(g, glow, glowFill, panes, 754, 290, 40, 34, 0.62);
  lattice(g, glow, glowFill, panes, 836, 290, 40, 34, 0.9);
  roof(g, 676, 954, 266, 216);
  wall(g, 644, W + 10, 338, rand);
  for (const [x, w, h] of [
    [690, 26, 34],
    [716, 20, 24],
    [737, 15, 17],
  ])
    for (const node of jar(g, x, w, h)) tinted.push([node, COLOR.jar]);

  // 골목 바닥: 흙길에 긁힌 자국
  el('rect', { x: 0, y: GROUND, width: W, height: H - GROUND, fill: '#fdfdfc', class: 'pp' }, lane);
  let floor = `M0 ${GROUND}H${W}`;
  for (let i = 0; i < 46; i++) {
    const x = rand(0, W);
    const y = rand(GROUND + 8, H - 28);
    floor += `M${f(x)} ${f(y)}h${f(rand(8, 30))}`;
  }
  set(pen(lane, FINE), floor);
  return {
    panes,
    tinted,
    // 청사초롱을 거는 대문 처마 양 끝, 풍경을 다는 찻집 처마 끝, 고양이가 앉는 담 위
    lanterns: [gate(0.07), gate(0.93)].map(([x, y]): Vec => [x, y + 5]),
    chime: ((p: Vec): Vec => [p[0], p[1] + 5])(teaEave(0.96)),
    cat: [846, 335] as Vec,
  };
}
