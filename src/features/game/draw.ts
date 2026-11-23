import { code, dome, Grid, hash, lit, RAMP, smooth } from '../ascii/stage/grid';
import { shade } from '../ascii/stage/relief';
import { ARENA, BOSS_HP, BOSS_R, Game, MAX_HP, MAX_MP, ROAR, SLASH, SPIN, turn, WAVE, ZONE_FLASH, zoneAt } from './engine';

// 색은 역할마다 하나씩이다: 땅은 어두운 풀빛, 용은 보라, 위험은 빨강, 플레이어는 흰색과 붉은 목도리, 마력은 파랑.
const GRASS = [70, 128, 92];
const DRY = [124, 142, 96];
const STONE = [140, 148, 170];
const DANGER = [255, 64, 56];
const BLAST = [255, 214, 140];
const IVORY = [255, 246, 226];
const SCARF = [236, 44, 48];
const MANA = [130, 184, 255];
const GOLD = [255, 214, 96];
const HEAL = [130, 230, 140];
const EMBER = [255, 138, 60];
// 용의 살갗: 그늘, 중간, 빛 받는 곳
const HIDE = [
  [70, 48, 150],
  [142, 112, 240],
  [232, 220, 255],
];
const WING = [
  [62, 26, 104],
  [128, 62, 176],
  [222, 160, 240],
];
const BONE = [
  [120, 110, 130],
  [226, 216, 204],
  [255, 250, 240],
];
// 분노한 뒤의 살갗
const FURY = [
  [120, 22, 60],
  [236, 60, 90],
  [255, 196, 170],
];

// 화면 세로에 들어오는 길이와 가로에 적어도 들어와야 하는 길이(줄 단위 세계 길이)
const VIEW = 46;
const MIN_WIDE = 38;
// 그림자가 떨어지는 방향 (빛은 왼쪽 위에서 온다)
const SHADOW = [1.3, 1.5];

export interface View {
  // 카메라가 보는 세계 좌표
  x: number;
  y: number;
  // 조준점 (없으면 그리지 않는다)
  aim: { x: number; y: number } | null;
}

// 세계 길이 1이 차지하는 줄 수. 좁은 화면에서는 가로가 모자라지 않게 줄인다.
const zoom = (g: Grid) => Math.min(g.rows / VIEW, g.cols / (g.aspect * MIN_WIDE));

// 화면의 한 점이 가리키는 세계 좌표
export function toWorld(g: Grid, view: View, col: number, row: number) {
  const z = zoom(g);
  return { x: view.x + (col - g.cols / 2) / (z * g.aspect), y: view.y + (row - g.rows / 2) / z };
}

// 카메라는 플레이어를 따라가되 용 쪽으로 pull만큼 당겨 본다
export function follow(view: View, game: Game, pull: number, dt: number) {
  const { player: p, boss: b } = game;
  const k = 1 - Math.exp(-dt * 6);
  view.x += (p.x + (b.x - p.x) * pull - view.x) * k;
  view.y += (p.y + (b.y - p.y) * pull - view.y) * k;
}

// 카메라를 칸 단위로 맞춘 사본. 맞추지 않으면 움직일 때 풀이 떨린다.
export function snap(g: Grid, view: View): View {
  const z = zoom(g);
  return { x: Math.round(view.x * z * g.aspect) / (z * g.aspect), y: Math.round(view.y * z) / z, aim: view.aim };
}

// 한 프레임을 그리는 동안 함께 쓰는 값
interface Cam {
  g: Grid;
  game: Game;
  view: View;
  t: number;
  // 세계 길이 1이 차지하는 줄 수와 칸 수
  z: number;
  ax: number;
  sx: (wx: number) => number;
  sy: (wy: number) => number;
  pose: Pose;
}

// 용의 자세: 날개가 펴진 정도, 고개가 흔들린 정도, 꼬리가 흔들리는 시각
interface Pose {
  flap: number;
  sway: number;
  t: number;
}

const SKIN_HIDE = 1;
const SKIN_WING = 2;
const SKIN_BONE = 3;
// dragonAt이 방금 돌려준 자리가 어느 살갗인지
let skin = 0;

// 위에서 내려다본 용의 높이(0이면 용이 아니다). 머리 쪽이 +x이고 좌우는 대칭이다.
// 높이의 기울기로 명암을 넣기 때문에, 모양은 둥근 덩어리들의 높이를 겹쳐서 만든다.
function dragonAt(lx: number, ly: number, q: Pose) {
  skin = SKIN_HIDE;
  const ay = Math.abs(ly);
  // 목과 머리는 좌우로 천천히 흔들린다
  const hy = ly - q.sway * Math.max(0, (lx - 4) / 5);
  let h = 3.2 * dome((lx / 5.4) ** 2 + (ly / 3.2) ** 2);
  if (lx > 3 && lx < 8.6) h = Math.max(h, 2.3 * dome((hy / (1.9 - (lx - 3) * 0.1)) ** 2));
  h = Math.max(h, 2.7 * dome(((lx - 9.4) / 2.5) ** 2 + (hy / 1.75) ** 2), 2 * dome(((lx - 11.7) / 1.7) ** 2 + (hy / 1.05) ** 2));
  // 앞발과 뒷발
  h = Math.max(h, 1.1 * dome(((Math.abs(lx - 0.2) - 3.3) / 1.5) ** 2 + ((ay - 3.5) / 1.1) ** 2));
  // 꼬리: 끝으로 갈수록 가늘어지며 좌우로 휘고, 끝에 날이 달렸다
  if (lx < -4 && lx > -18.6) {
    const k = Math.min(1, (-lx - 4) / 12.5);
    const mid = Math.sin(q.t * 2 + k * 5) * k * 2.6;
    if (k < 1) h = Math.max(h, (1.9 * (1 - k) + 0.5) * dome(((ly - mid) / (1.8 * (1 - k) + 0.3)) ** 2));
    const tip = 1.1 * dome(((lx + 17) / 1.6) ** 2 + ((ly - mid) / 1.25) ** 2);
    if (tip > h) {
      h = tip;
      skin = SKIN_BONE;
    }
  }
  // 등줄기를 따라 솟은 돌기
  if (h > 0 && lx > -4 && lx < 8 && Math.abs(lx > 3.5 ? hy : ly) < 0.5) {
    const spike = Math.abs(Math.sin(lx * 2.4));
    if (spike > 0.55) {
      h += 0.9 * spike;
      skin = SKIN_BONE;
    }
  }
  // 뿔: 머리 뒤에서 바깥 뒤쪽으로 뻗으며 가늘어진다
  const u = Math.max(0, Math.min(1, ((lx - 8.3) * -2.9 + (Math.abs(hy) - 1.1) * 1.9) / 12.02));
  const horn = (3.3 - u) * dome((Math.hypot(lx - 8.3 + 2.9 * u, Math.abs(hy) - 1.1 - 1.9 * u) / (0.6 - 0.42 * u)) ** 2);
  if (horn > h) {
    h = horn;
    skin = SKIN_BONE;
  }
  if (h > 0) return h;
  // 날개: 어깨에서 손가락뼈 넷이 부채처럼 뻗고, 뼈 사이의 막은 끝이 안으로 패였다
  const wx = lx - 1.2;
  const wy = ay - 2.2;
  if (wy <= 0) return 0;
  const r = Math.hypot(wx, wy);
  const finger = (Math.atan2(wy, wx) - 1) / 0.62;
  if (finger < -0.1 || finger > 3.08) return 0;
  const len = (12 + q.flap) * (1 - 0.11 * finger);
  const web = Math.abs(Math.cos(Math.PI * finger));
  if (r > len * (0.6 + 0.4 * web ** 1.5)) return 0;
  const off = (finger - Math.round(finger)) * 0.62 * r;
  skin = SKIN_WING;
  // 막은 낮고 뼈는 솟아서, 뼈를 따라 밝은 줄이 선다
  return 0.3 + 0.25 * web + 0.8 * Math.exp(-(off * off) / 0.16) * (1 - (0.5 * r) / len);
}

function ground(k: Cam) {
  const { g, game, view, t, z, ax, pose } = k;
  const { cols, rows } = g;
  const p = game.player;
  const b = game.boss;
  const cf = Math.cos(b.face);
  const sf = Math.sin(b.face);
  const zones = game.zones.filter((zn) => zn.t >= 0);
  const alive = game.phase !== 'won';
  for (let r = 0; r < rows; r++) {
    const wy = view.y + (r - rows / 2) / z;
    const ir = Math.round(wy * z);
    for (let c = 0; c < cols; c++) {
      const wx = view.x + (c - cols / 2) / ax;
      const ic = Math.round(wx * ax);
      const d = Math.hypot(wx, wy);
      const h = hash(ic, ir);
      // 화면 가장자리로 갈수록 어둡다
      const dim = 1 - 0.9 * ((c / cols - 0.5) ** 2 + (r / rows - 0.5) ** 2);
      if (d > ARENA) {
        // 풀밭을 두른 돌과 그 바깥의 숲. 숲은 멀어질수록 어둠에 묻힌다.
        if (d < ARENA + 0.9) g.put(c, r, 8, (0.34 + 0.25 * h) * dim, STONE[0], STONE[1], STONE[2], code(h > 0.6 ? 'O' : 'o'));
        else if (d < ARENA + 16) {
          const n = Math.sin(ic * 0.31 + ir * 1.3) + Math.sin(ic * 0.11 - ir * 0.7);
          if (h > 0.55 && n > -0.9) g.put(c, r, 8, Math.max(0, 0.24 - (d - ARENA) * 0.015) * (0.6 + 0.4 * h) * dim, GRASS[0], GRASS[1], GRASS[2], code(n > 0.6 ? 'A' : '^'));
        }
        continue;
      }
      let lum = 0;
      let ch = 0;
      let col = GRASS;
      const toP = Math.hypot(wx - p.x, wy - p.y);
      const bx = wx - b.x;
      const by = wy - b.y;
      // 용의 그림자가 떨어진 자리에는 풀을 그리지 않는다
      const shadow = alive && Math.abs(bx) < 21 && Math.abs(by) < 21 && dragonAt((bx - SHADOW[0]) * cf + (by - SHADOW[1]) * sf, -(bx - SHADOW[0]) * sf + (by - SHADOW[1]) * cf, pose) > 0;
      // 풀: 무더기로 모여 나고, 키 큰 풀만 바람 물결을 따라 눕는다. 플레이어 둘레는 조금 밝다.
      const patch = Math.sin(ic * 0.05 + Math.sin(ir * 0.11) * 2) + Math.sin(ir * 0.09 - ic * 0.03);
      if (!shadow && h > 0.74 - 0.13 * patch) {
        const tall = h > 0.94;
        const sway = Math.sin(ic * 0.08 + ir * 0.15 - t * 1.7) + 0.5 * Math.sin(ic * 0.021 - t * 0.6);
        const pressed = toP < 1.7 || Math.hypot(bx, by) < BOSS_R + 1.5;
        ch = code(pressed ? '.' : h > 0.996 ? '*' : tall ? (sway > 0.5 ? '/' : sway < -0.6 ? '\\' : '|') : h > 0.86 ? '"' : h > 0.8 ? "'" : ',');
        lum = (0.14 + 0.12 * (h - 0.74) * 4 + 0.03 * sway + 0.2 * Math.exp(-((toP / 7) ** 2))) * dim;
        col = h > 0.996 ? GOLD : patch > 0.9 ? DRY : GRASS;
      }
      // 싸움터 바닥에 새겨진 고리
      if (!shadow && Math.abs(d - ARENA * 0.62) < 0.3 && (ic + ir) % 3 === 0) {
        ch = code(':');
        lum = 0.26 * dim;
        col = STONE;
      }
      // 떨어진 자리의 그을음
      for (const s of game.scorch) {
        const e = Math.hypot(wx - s.x, wy - s.y) / s.r;
        if (e > 1) continue;
        const hot = Math.max(0, 1 - s.t / 2) * (1 - e);
        lum = h > 0.5 ? 0.1 + 0.5 * hot : 0;
        ch = code(h > 0.8 ? ':' : '.');
        col = hot > 0.2 ? EMBER : STONE;
      }
      let depth = 8;
      for (const zn of zones) {
        const f = zoneAt(zn, wx, wy);
        if (f < 0) continue;
        depth = 7;
        if (zn.hit) {
          // 터지는 순간
          const e = 1 - (zn.t - zn.warn) / ZONE_FLASH;
          lum = 0.3 + 0.7 * e * (0.6 + 0.4 * h);
          ch = code('*@%#'[Math.floor(h * 4)]);
          col = BLAST;
          continue;
        }
        // 예고: 테두리가 먼저 서고, 안에서 바깥으로 차오르며, 다 차기 직전에는 깜박인다
        const prog = zn.t / zn.warn;
        const urgent = prog > 0.75 && Math.sin(t * 40) > 0 ? 0.2 : 0;
        if (f <= prog) {
          lum = 0.34 + 0.3 * prog + urgent;
          ch = code((ic + ir) % 2 ? '#' : '%');
        } else if (f > 0.94 || zoneAt(zn, wx, wy, -0.5) < 0) {
          lum = 0.5 + urgent;
          ch = code('+');
        } else if ((ic + ir * 2) % 4 === 0) {
          lum = 0.24 + urgent;
          ch = code(':');
        } else continue;
        col = DANGER;
      }
      if (lum > 0) g.put(c, r, depth, lum, col[0], col[1], col[2], ch);
    }
  }
}

function dragon(k: Cam) {
  const { g, game, view, t, z, ax, sx, sy, pose } = k;
  const { cols, rows } = g;
  const b = game.boss;
  // 쓰러지면 잿빛으로 식으면서 흩어진다
  const dead = game.phase === 'won' ? game.since / 2.6 : 0;
  if (dead >= 1) return;
  const cf = Math.cos(b.face);
  const sf = Math.sin(b.face);
  const hide = b.enraged ? FURY : HIDE;
  const pulse = b.enraged ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
  const R = 20;
  const E = 0.5;
  const rgb = [0, 0, 0];
  for (let r = Math.max(0, Math.floor(sy(b.y - R))); r <= Math.min(rows - 1, sy(b.y + R)); r++)
    for (let c = Math.max(0, Math.floor(sx(b.x - R))); c <= Math.min(cols - 1, sx(b.x + R)); c++) {
      const dx = view.x + (c - cols / 2) / ax - b.x;
      const dy = view.y + (r - rows / 2) / z - b.y;
      const lx = dx * cf + dy * sf;
      const ly = -dx * sf + dy * cf;
      const h = dragonAt(lx, ly, pose);
      if (h <= 0) continue;
      const kind = skin;
      if (dead > 0 && hash(c, r) < dead * 1.1) continue;
      // 오른쪽과 아래로 조금 떨어진 자리의 높이와 견주어 면이 어디를 보는지 안다
      const light = lit(h, dragonAt(lx + E * cf, ly - E * sf, pose), dragonAt(lx + E * sf, ly + E * cf, pose), E);
      let v = Math.min(1, 0.3 + 0.78 * light + (hash(c * 1.3, r * 2.1) - 0.5) * 0.06);
      shade(kind === SKIN_WING ? WING : kind === SKIN_BONE ? BONE : hide, v, rgb);
      // 분노하면 비늘 틈으로 불빛이 샌다
      if (b.enraged && kind === SKIN_HIDE && Math.abs(Math.sin(lx * 1.7 + Math.sin(ly * 2.3) * 1.5)) < 0.13) {
        v = 0.75 + 0.25 * pulse;
        rgb[0] = EMBER[0];
        rgb[1] = EMBER[1] + 60 * pulse;
        rgb[2] = EMBER[2];
      }
      if (b.flash > 0) {
        v = 1;
        rgb.fill(255);
      } else if (dead > 0) {
        v *= 0.6;
        rgb.fill(120);
      }
      g.put(c, r, kind === SKIN_WING ? 4.5 : 4 - h * 0.1, 0.5 + 0.5 * v, rgb[0], rgb[1], rgb[2], RAMP.charCodeAt(Math.max(2, Math.round(v * (RAMP.length - 1)))));
    }
  // 눈
  for (const side of [-1, 1]) {
    const ex = b.x + cf * 10 - sf * (side * 0.95 + pose.sway);
    const ey = b.y + sf * 10 + cf * (side * 0.95 + pose.sway);
    const col = b.enraged ? EMBER : GOLD;
    g.put(sx(ex), sy(ey), 3, 1, col[0], col[1], col[2], code(dead > 0 ? 'x' : '@'));
  }
  // 숨을 모을 때 입가에 맺히는 불빛
  if (b.casting > 0 && Math.sin(t * 30) > -0.3) g.rays(sx(b.x + cf * 13), sy(b.y + sf * 13), 2, BLAST[0], BLAST[1], BLAST[2]);
  // 포효: 고리가 퍼져 나간다
  if (b.roar > 0)
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2;
      const rad = (ROAR - b.roar) * 22;
      g.add(sx(b.x + Math.cos(a) * rad), sy(b.y + Math.sin(a) * rad), b.roar / ROAR, EMBER[0], EMBER[1], EMBER[2], code(Math.abs(Math.cos(a)) > 0.7 ? ')' : '~'));
    }
}

// 방향에 맞는 선 글자
const stroke = (a: number) => (Math.abs(Math.sin(a)) < 0.38 ? '-' : Math.abs(Math.cos(a)) < 0.38 ? '|' : Math.cos(a) * Math.sin(a) > 0 ? '\\' : '/');

function figure(g: Grid, c0: number, r0: number, lum: number, col: number[], step: boolean) {
  g.put(c0, r0 - 1, -5, lum, col[0], col[1], col[2], code('o'));
  g.put(c0 - 1, r0, -5, lum, col[0], col[1], col[2], code('/'));
  g.put(c0, r0, -5, lum, col[0], col[1], col[2], code('#'));
  g.put(c0 + 1, r0, -5, lum, col[0], col[1], col[2], code('\\'));
  g.put(c0 - (step ? 1 : 0), r0 + 1, -5, lum, col[0], col[1], col[2], code(step ? '/' : '|'));
  g.put(c0 + 1, r0 + 1, -5, lum, col[0], col[1], col[2], code(step ? '\\' : '|'));
}

function hero(k: Cam, ghosts: Ghost[]) {
  const { g, game, t, sx, sy } = k;
  const p = game.player;
  const pc = Math.round(sx(p.x));
  const pr = Math.round(sy(p.y));
  for (const gh of ghosts) figure(g, Math.round(sx(gh.x)), Math.round(sy(gh.y)), gh.life * 1.6, MANA, false);
  if (game.phase !== 'lost' || game.since < 0.6) {
    // 무적인 동안에는 깜박인다
    const blink = p.safe > 0 && p.dash <= 0 && Math.sin(t * 50) > 0;
    figure(g, pc, pr, blink ? 0.45 : 1, p.hurt > 0 ? DANGER : IVORY, p.moving && Math.sin(t * 16) > 0);
    // 목도리는 보는 쪽 반대로 날린다
    const back = Math.cos(p.face) >= 0 ? -1 : 1;
    const up = Math.sin(t * 9) > 0;
    g.put(pc + back, pr - 1, -5, 0.95, SCARF[0], SCARF[1], SCARF[2], code('~'));
    g.put(pc + back * 2, pr - 1 + (up ? 0 : -1), -5, 0.85, SCARF[0], SCARF[1], SCARF[2], code(up ? '-' : '~'));
    g.put(pc + back * 3, pr - 1 + (up ? -1 : 0), -5, 0.6, SCARF[0], SCARF[1], SCARF[2], code(up ? '~' : '-'));
    // 검은 조준하는 쪽으로 든다
    const blade = code(stroke(p.face));
    for (const n of [1, 2, 3])
      g.put(pc + Math.round(Math.cos(p.face) * (1.4 + n * 1.1)), pr + Math.round(Math.sin(p.face) * (0.6 + n * 0.7)), -5, 1, IVORY[0], IVORY[1], IVORY[2], blade);
  }
  // 베는 궤적: 초승달 모양이 한쪽 끝에서 다른 쪽 끝으로 지나간다
  if (p.slashT < 0.16) {
    const e = p.slashT / 0.16;
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      if (u > e + 0.1) break;
      const a = p.slashAng - 0.95 + 1.9 * u;
      const fade = Math.max(0, 1 - (e - u) * 1.6);
      for (let rad = 3 + 1.6 * Math.sin(u * Math.PI); rad <= SLASH.range; rad += 0.4)
        g.add(sx(p.x + Math.cos(a) * rad), sy(p.y + Math.sin(a) * rad), fade * (0.5 + 0.5 * (rad / SLASH.range)), IVORY[0], IVORY[1], IVORY[2], code(stroke(a + Math.PI / 2)));
    }
  }
  // 회전베기: 고리가 퍼져 나간다
  if (p.spinT < 0.3) {
    const rad = SPIN.r * smooth(p.spinT / 0.22);
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2 + t * 20;
      for (const off of [0, -0.8])
        g.add(sx(p.x + Math.cos(a) * (rad + off)), sy(p.y + Math.sin(a) * (rad + off)), (1 - p.spinT / 0.3) * (off ? 0.5 : 1), IVORY[0], IVORY[1], IVORY[2], code(stroke(a + Math.PI / 2)));
    }
  }
  // 검기: 날아가는 초승달과 꼬리
  for (const s of game.shots) {
    const a = Math.atan2(s.vy, s.vx);
    for (let off = -1.6; off <= 1.6; off += 0.2) {
      const bx = s.x - Math.sin(a) * off - Math.cos(a) * off * off * 0.5;
      const by = s.y + Math.cos(a) * off - Math.sin(a) * off * off * 0.5;
      g.put(sx(bx), sy(by), -4, 1, MANA[0] + 80, MANA[1] + 50, 255, code(Math.abs(Math.cos(a)) > 0.7 ? ')' : '='));
      g.add(sx(bx - Math.cos(a) * 1.5), sy(by - Math.sin(a) * 1.5), 0.4, MANA[0], MANA[1], MANA[2], code('-'));
    }
  }
  for (const s of game.sparks) {
    const e = s.life / s.max;
    const col = s.kind === 1 ? IVORY : s.kind === 2 ? STONE : BLAST;
    g.add(sx(s.x), sy(s.y), e, col[0], col[1], col[2], code(e > 0.6 ? '*' : e > 0.3 ? "'" : '.'));
  }
  if (k.view.aim && game.phase === 'fight') g.put(sx(k.view.aim.x), sy(k.view.aim.y), -6, 0.7, IVORY[0], IVORY[1], IVORY[2], code('+'));
}

const bar = (v: number, max: number, width: number, on: string, off: string) => {
  const n = Math.round((Math.max(0, v) / max) * width);
  return on.repeat(n) + off.repeat(width - n);
};

// 글귀를 쓰기 전에 그 자리의 그림을 지운다 (빈칸은 칸을 비운다)
const wipe = (g: Grid, x: number, y: number, width: number) => g.text(x, y, ' '.repeat(Math.max(0, width)), 0, 0, 0, 0);

function hud(k: Cam) {
  const { g, game, z, sx, sy } = k;
  const { cols, rows } = g;
  const p = game.player;
  const b = game.boss;
  for (const f of game.texts) {
    const col = f.kind === 1 ? GOLD : f.kind === 2 ? DANGER : f.kind === 3 ? HEAL : f.kind === 4 ? EMBER : IVORY;
    const s = f.kind === 1 ? `${f.s}!` : f.s;
    g.text(Math.round(sx(f.x) - s.length / 2), Math.round(sy(f.y) - f.t * 4 * z), s, 1 - f.t * 0.6, col[0], col[1], col[2]);
  }
  if (game.phase === 'title') return;

  // 위: 용의 이름과 체력
  const wide = Math.min(72, cols - 12);
  const x0 = Math.round((cols - wide) / 2);
  const hot = b.enraged ? EMBER : DANGER;
  for (let r = 0; r < 4; r++) wipe(g, x0 - 3, r, wide + 6);
  g.text(x0, 1, b.enraged ? 'DRAGON  enraged' : 'DRAGON', 0.9, hot[0], hot[1] + 50, hot[2] + 50);
  const left = `${Math.ceil(b.hp)} / ${BOSS_HP}`;
  g.text(x0 + wide - left.length, 1, left, 0.7, STONE[0], STONE[1], STONE[2]);
  g.text(x0 - 1, 2, `[${bar(b.hp, BOSS_HP, wide, '#', '.')}]`, 0.95, hot[0], hot[1], hot[2]);
  // 분노가 시작되는 체력 반 지점의 눈금
  if (!b.enraged) g.text(x0 + Math.round(wide / 2), 3, '^', 0.5, STONE[0], STONE[1], STONE[2]);

  // 아래: 체력, 마력, 기술. 넓은 화면에서는 가운데에, 좁은 화면에서는 왼쪽에 둔다.
  const cd = (v: number) => (v > 0 ? ` ${v.toFixed(1)}` : '');
  const slots: [string, boolean][] = [
    ['J slash', true],
    [`K wave${cd(p.waveCd)}`, p.waveCd <= 0 && p.mp >= WAVE.mp],
    [`L spin${cd(p.spinCd)}`, p.spinCd <= 0 && p.mp >= SPIN.mp],
    [`SPACE roll${cd(p.dashCd)}`, p.dashCd <= 0],
    [`Q potion x${p.potions}`, p.potions > 0],
  ];
  const span = slots.reduce((n, [label]) => n + label.length + 3, -1);
  const roomy = cols >= span + 40;
  const x1 = roomy ? Math.round((cols - span) / 2) : 1;
  const meter = roomy ? span - 12 : 20;
  for (let r = rows - 5; r < rows; r++) wipe(g, x1 - 2, r, Math.max(span, meter + 12) + 4);
  const low = p.hp < 35;
  const life = low ? DANGER : HEAL;
  g.text(x1, rows - 4, `HP [${bar(p.hp, MAX_HP, meter, '|', '.')}] ${String(Math.ceil(p.hp)).padStart(3)}`, 0.95, life[0], life[1], life[2]);
  g.text(x1, rows - 3, `MP [${bar(p.mp, MAX_MP, meter, '|', '.')}] ${String(Math.floor(p.mp)).padStart(3)}`, 0.95, MANA[0], MANA[1], MANA[2]);
  let x = x1;
  for (const [label, ready] of slots) {
    if (x + label.length + 2 > cols) break;
    const col = ready ? IVORY : STONE;
    g.text(x, rows - 2, `[${label}]`, ready ? 0.9 : 0.4, col[0], col[1], col[2]);
    x += label.length + 3;
  }
  const clock = `${Math.floor(game.t / 60)}:${String(Math.floor(game.t % 60)).padStart(2, '0')}`;
  g.text(cols - clock.length - 2, rows - 2, clock, 0.6, STONE[0], STONE[1], STONE[2]);

  // 화면 밖의 용이 어느 쪽에 있는지
  const bc = sx(b.x);
  const br = sy(b.y);
  if (bc < 0 || bc >= cols || br < 4 || br >= rows - 5) {
    const a = Math.atan2(b.y - p.y, b.x - p.x);
    const arrow = Math.abs(turn(a, 0)) < 0.8 ? '>' : Math.abs(turn(a, Math.PI)) < 0.8 ? '<' : Math.sin(a) > 0 ? 'v' : '^';
    g.text(Math.round(sx(p.x) + Math.cos(a) * 9), Math.round(sy(p.y) + Math.sin(a) * 5), arrow, 0.9, DANGER[0], DANGER[1], DANGER[2]);
  }
}

// 구른 자리에 남는 잔상
interface Ghost {
  x: number;
  y: number;
  life: number;
}

// 게임 상태를 글자 격자로 옮기는 화가. 잔상처럼 그림에만 필요한 것은 여기서 기억한다.
export function createPainter() {
  let ghosts: Ghost[] = [];
  let lastT = 0;

  return function paint(g: Grid, game: Game, view: View, t: number) {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const z = zoom(g);
    const ax = z * g.aspect;
    const b = game.boss;
    const p = game.player;
    if (p.dash > 0) ghosts.push({ x: p.x, y: p.y, life: 0.25 });
    ghosts = ghosts.filter((gh) => (gh.life -= dt) > 0);
    const k: Cam = {
      g,
      game,
      view,
      t,
      z,
      ax,
      sx: (wx) => g.cols / 2 + (wx - view.x) * ax,
      sy: (wy) => g.rows / 2 + (wy - view.y) * z,
      // 공격을 준비하면 날개를 펴고, 포효할 때는 떤다
      pose: { flap: 1.2 * Math.sin(t * 2.4) + (b.casting > 0 ? 1.8 : 0) + (b.roar > 0 ? 2 * Math.sin(t * 18) : 0), sway: Math.sin(t * 1.3) * 0.5, t },
    };
    ground(k);
    dragon(k);
    hero(k, ghosts);
    hud(k);
  };
}
