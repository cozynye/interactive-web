import { code, dome, Grid, hash, lit, RAMP } from '../ascii/stage/grid';
import { shade } from '../ascii/stage/relief';
import { AURA, BOLT, BOLT_TIME, BOSS_AT, BOSS_HP, Enemy, Game, ORBIT, ROAR, SLASH_TIME, SWORD, turn, UpgradeId, WEAPONS, ZONE_FLASH, zoneAt } from './engine';

// 색은 역할마다 하나씩이다: 땅은 어두운 풀빛, 용은 보라, 위험은 빨강, 플레이어는 흰색과 자홍 망토, 금빛은 주울 것과 우두머리, 경험치와 마법은 파랑, 무리는 종류마다 한 가지 색.
const GRASS = [70, 128, 92];
const DRY = [124, 142, 96];
const STONE = [140, 148, 170];
const DANGER = [255, 64, 56];
const BLAST = [255, 214, 140];
const IVORY = [255, 246, 226];
const SCARF = [222, 48, 108];
const MANA = [130, 184, 255];
const GOLD = [255, 214, 96];
const HEAL = [130, 230, 140];
const EMBER = [255, 138, 60];
const STEEL = [214, 232, 255];
// 무리의 색: 구울, 박쥐, 해골, 돌거인
const MOB = [
  [142, 170, 104],
  [214, 136, 226],
  [232, 222, 206],
  [150, 170, 210],
];
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
const VIEW = 36;
const MIN_WIDE = 26;
// 그림자가 떨어지는 방향 (빛은 왼쪽 위에서 온다)
const SHADOW = [1.3, 1.5];

export interface View {
  // 카메라가 보는 세계 좌표
  x: number;
  y: number;
  // 지금 용 쪽으로 당겨 보고 있는 정도 (0이면 플레이어가 한가운데다)
  pull: number;
  // 플레이어를 화면 위쪽으로 올려 보는 정도. 시작 화면에서는 아래에 안내가 깔려서 올려 본다.
  lift: number;
}

// 칸에 맞추지 않고 그리는 글자 하나. x, y는 격자 칸 좌표이고 소수여도 된다.
export interface Glyph {
  x: number;
  y: number;
  ch: number;
  lum: number;
  r: number;
  g: number;
  b: number;
}

// 게임 화면은 세 겹으로 그린다: 칸에 맞춘 세계(풀, 용, 무기 효과), 칸 사이로 매끄럽게 움직이는 글자(주인공, 무리, 구슬, 숫자), 화면에 붙박인 HUD.
// 홈 타일의 시연처럼 겹을 주지 않으면 모두 한 격자에 그린다.
export interface Layers {
  sprites: Glyph[];
  hud: Grid;
}

// 세계 길이 1이 차지하는 줄 수. 좁은 화면에서는 가로가 모자라지 않게 줄인다.
const zoom = (g: Grid) => Math.min(g.rows / VIEW, g.cols / (g.aspect * MIN_WIDE));

// 카메라는 플레이어를 한가운데에 두고 늦지 않게 따라간다. 용이 있으면 용 쪽으로 pull만큼 천천히 당겨 본다.
export function follow(view: View, game: Game, pull: number, dt: number) {
  const { player: p, boss: b } = game;
  view.pull += ((b.here && game.phase !== 'won' ? pull : 0) - view.pull) * (1 - Math.exp(-dt * 2.5));
  view.lift += ((game.phase === 'title' ? 7 : 0) - view.lift) * (1 - Math.exp(-dt * 4));
  view.x = p.x + (b.x - p.x) * view.pull;
  view.y = p.y + (b.y - p.y) * view.pull + view.lift;
}

// 카메라를 칸 단위로 맞춘 사본. 맞추지 않으면 움직일 때 풀이 떨린다.
function snap(g: Grid, view: View): View {
  const z = zoom(g);
  return { x: Math.round(view.x * z * g.aspect) / (z * g.aspect), y: Math.round(view.y * z) / z, pull: view.pull, lift: view.lift };
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
  // 칸에 맞추지 않은 자리 (매끄럽게 움직이는 글자가 쓴다)
  fx: (wx: number) => number;
  fy: (wy: number) => number;
  // 매끄럽게 움직이는 글자를 모으는 곳과 HUD를 그릴 격자. 겹을 주지 않았으면 out은 null이고 hud는 g와 같다.
  out: Glyph[] | null;
  hud: Grid;
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
  const alive = b.here && game.phase !== 'won';
  for (let r = 0; r < rows; r++) {
    const wy = view.y + (r - rows / 2) / z;
    const ir = Math.round(wy * z);
    for (let c = 0; c < cols; c++) {
      const wx = view.x + (c - cols / 2) / ax;
      const ic = Math.round(wx * ax);
      const h = hash(ic, ir);
      // 화면 가장자리로 갈수록 어둡다
      const dim = 1 - 0.9 * ((c / cols - 0.5) ** 2 + (r / rows - 0.5) ** 2);
      let lum = 0;
      let ch = 0;
      let col = GRASS;
      const toP = Math.hypot(wx - p.x, wy - p.y);
      const bx = wx - b.x;
      const by = wy - b.y;
      // 용의 그림자가 떨어진 자리에는 풀을 그리지 않는다
      const shadow = alive && Math.abs(bx) < 21 && Math.abs(by) < 21 && dragonAt((bx - SHADOW[0]) * cf + (by - SHADOW[1]) * sf, -(bx - SHADOW[0]) * sf + (by - SHADOW[1]) * cf, pose) > 0;
      // 풀: 무더기로 모여 나고, 키 큰 풀만 바람 물결을 따라 눕는다. 플레이어가 선 자리는 비워서 몸이 풀에 묻히지 않는다.
      const patch = Math.sin(ic * 0.05 + Math.sin(ir * 0.11) * 2) + Math.sin(ir * 0.09 - ic * 0.03);
      if (!shadow && toP > 2.3 && h > 0.8 - 0.13 * patch) {
        const tall = h > 0.965;
        const sway = Math.sin(ic * 0.08 + ir * 0.15 - t * 1.7) + 0.5 * Math.sin(ic * 0.021 - t * 0.6);
        ch = code(h > 0.996 ? '*' : tall ? (sway > 0.5 ? '/' : sway < -0.6 ? '\\' : '|') : h > 0.86 ? '"' : h > 0.8 ? "'" : ',');
        lum = (0.12 + 0.1 * (h - 0.8) * 5 + 0.03 * sway + 0.16 * Math.exp(-((toP / 9) ** 2))) * dim;
        col = h > 0.996 || patch > 0.9 ? DRY : GRASS;
      }
      // 벌판에 드문드문 박힌 돌. 걸을 때 얼마나 움직였는지 가늠하게 해 준다.
      const gx = Math.floor(wx / 14);
      const gy = Math.floor(wy / 9);
      const rock = hash(gx, gy);
      if (!shadow && rock > 0.6) {
        const dc = ic - Math.round((gx + 0.2 + 0.6 * hash(rock, 1)) * 14 * ax);
        const dr = ir - Math.round((gy + 0.2 + 0.6 * hash(rock, 2)) * 9 * z);
        const art = dr === 0 ? '(__)' : dr === -1 ? ' __ ' : '';
        if (dc >= 0 && dc < art.length && art[dc] !== ' ') {
          ch = code(art[dc]);
          lum = 0.3 * dim;
          col = STONE;
        }
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
  if (!b.here) return;
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

// 글자 그림을 좌우로 뒤집을 때 바꿔 써야 하는 글자
const MIRROR: Record<string, string> = { '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[', d: 'b', b: 'd' };

// 글자 하나를 (c, r)에 놓는다. 겹이 있으면 칸 사이에 그대로 놓고, 없으면 가까운 칸에 넣는다.
function dot(k: Cam, c: number, r: number, z: number, lum: number, col: number[], ch: number) {
  if (k.out) k.out.push({ x: c, y: r, ch, lum, r: col[0], g: col[1], b: col[2] });
  else k.g.put(c, r, z, lum, col[0], col[1], col[2], ch);
}

// 세계에 붙은 짧은 글귀 (피해 숫자, 체력 막대)
function label(k: Cam, c: number, r: number, s: string, lum: number, col: number[]) {
  if (k.out) {
    for (let i = 0; i < s.length; i++) if (s[i] !== ' ') k.out.push({ x: c + i, y: r, ch: s.charCodeAt(i), lum, r: col[0], g: col[1], b: col[2] });
  } else k.g.text(Math.round(c), Math.round(r), s, lum, col[0], col[1], col[2]);
}

// 글자 그림 한 장을 찍는다. (c0, r0)은 발이 놓이는 가운데 칸이고, tint는 글자마다 색을 고르는 기호다.
function stamp(k: Cam, c0: number, r0: number, rows: string[], tint: string[] | null, flip: boolean, z: number, lum: number, ink: (key: string) => number[]) {
  const mid = 4;
  for (let i = 0; i < rows.length; i++)
    for (let j = 0; j < rows[i].length; j++) {
      const ch = rows[i][j];
      if (ch === ' ') continue;
      const off = j - (tint ? mid : (rows[i].length - 1) / 2);
      dot(k, c0 + Math.round(flip ? -off : off), r0 - (rows.length - 1 - i), z, lum, ink(tint ? tint[i][j] : 'i'), code(flip ? (MIRROR[ch] ?? ch) : ch));
    }
}

// 주인공: 깃 달린 투구, 뒤로 날리는 붉은 망토, 어깨판과 문장 달린 겉옷, 세워 든 검. 오른쪽을 보는 그림이고 왼쪽을 볼 때는 뒤집는다.
// 가운데 칸은 왼쪽에서 다섯 번째(몸통)다.
const HERO = ['   ,^.  |', '  ~(o)] |', ' ~~/#\\==+', ' ~{|H|)  ', '   /_\\   ', '   / \\   '];
const HERO_TINT = ['   ggg  s', '  riiii s', ' rriiiiig', ' rririii ', '   igi   ', '   i i   '];
// 벨 때는 검을 앞으로 뻗는다
const HERO_SWING = ['   ,^.      ', '  ~(o)]     ', ' ~~/#\\==+---', ' ~{|H|)     ', '   /_\\      ', '   / \\      '];
const HERO_SWING_TINT = ['   ggg      ', '  riiii     ', ' rriiiiigsss', ' rririii    ', '   igi      ', '   i i      '];
// 걸을 때 번갈아 나오는 다리와, 바람에 따라 바뀌는 망토 자락(머리 뒤, 어깨 뒤, 등 뒤)
const LEGS = ['   / \\   ', '   |\\    ', '   | |   ', '   /|    '];
const CAPES = [
  ['  ~', ' ~~', ' ~'],
  ['  -', ' ~-', ' -'],
  ['  ~', ' -~', ' ='],
  ['  =', ' ~~', ' ~'],
];

function heroRows(t: number, moving: boolean, swing: boolean) {
  const rows = [...(swing ? HERO_SWING : HERO)];
  // 달릴 때는 망토가 빠르게, 서 있을 때는 천천히 펄럭인다
  const cape = CAPES[Math.abs(Math.floor(t * (moving ? 9 : 3))) % CAPES.length];
  for (let i = 0; i < 3; i++) rows[i + 1] = cape[i] + rows[i + 1].slice(cape[i].length);
  if (moving) rows[5] = LEGS[Math.abs(Math.floor(t * 10)) % LEGS.length] + rows[5].slice(9);
  // 서 있을 때는 숨을 쉬며 깃이 까딱인다
  else if (Math.sin(t * 2.2) > 0.6) rows[0] = rows[0].replace(',^.', '.^,');
  return rows;
}

// 무리의 글자 그림. 종류마다 두 장을 번갈아 보여 준다.
const MOBS = [
  [
    [',o,', '(%)', '/ \\'],
    [',o,', '(%)', '| |'],
  ],
  [['\\^o^/'], ['/vov\\']],
  [
    [' @ ', '-#-', '/ \\'],
    [' @ ', '\\#/', '| |'],
  ],
  [
    [' ___ ', '[o_o]', '(###)', ' d b '],
    [' ___ ', '[o_o]', '(###)', ' b d '],
  ],
];
const ELITE = [
  [' \\W/ ', ' (@) ', '/[#]\\', ' / \\ '],
  [' \\W/ ', ' (@) ', '\\[#]/', ' | | '],
];
const WHITE = [255, 255, 255];

function mobs(k: Cam) {
  const { g, game, t, fx, fy } = k;
  const { cols, rows } = g;
  // 구슬: 경험치는 파란 별, 큰 것은 금빛, 고기는 초록, 상자는 금빛 궤짝이다. 무리보다 먼저 그려서 발밑에 깔린다.
  for (const m of game.gems) {
    const c = fx(m.x);
    const r = fy(m.y);
    if (c < -2 || c > cols + 2 || r < -2 || r > rows + 2) continue;
    if (m.xp < 0) {
      label(k, c - 1, r, '[=]', 1, GOLD);
      if (Math.sin(t * 6) > 0) label(k, c - 1, r - 1, '\\|/', 0.8, GOLD);
      continue;
    }
    const col = m.xp === 0 ? HEAL : m.xp >= 5 ? GOLD : MANA;
    const twinkle = 0.85 + 0.15 * Math.sin(t * 5 + m.x * 3 + m.y);
    dot(k, c, r, 3, twinkle, col, code(m.xp === 0 ? '&' : m.xp >= 2 ? '*' : '+'));
  }
  // 아래쪽에 있는 것이 위쪽 것을 가리도록 위에서부터 그린다
  seen.length = 0;
  for (const e of game.enemies) {
    const c = fx(e.x);
    const r = fy(e.y);
    if (c > -4 && c < cols + 4 && r > -1 && r < rows + 5) seen.push(e);
  }
  seen.sort((a, b) => a.y - b.y);
  for (const e of seen) {
    const c = fx(e.x);
    const r = fy(e.y);
    // 저마다 다른 박자로 걷는다
    const frame = Math.abs(Math.floor(t * (e.kind === 1 ? 9 : 4) + e.max * 0.37 + e.kind)) % 2;
    const art = (e.elite ? ELITE : MOBS[e.kind])[frame];
    const col = e.flash > 0 ? WHITE : e.elite ? GOLD : MOB[e.kind];
    // 박쥐는 한 줄 떠서 난다. 무리는 주인공보다 어둡게 그려서 주인공이 먼저 눈에 들어오고, 한 줄짜리 박쥐만 조금 밝다.
    stamp(k, c, r + (e.kind === 1 ? -1 : 1), art, null, false, 2 - r / rows, e.flash > 0 ? 1 : e.elite || e.kind === 1 ? 0.85 : 0.66, () => col);
    if (e.elite) {
      const n = Math.round((Math.max(0, e.hp) / e.max) * 7);
      label(k, c - 3, r - 4, '='.repeat(n) + '.'.repeat(7 - n), 0.9, GOLD);
    }
  }
}
// 이번 프레임에 화면에 든 적 (매 프레임 새로 만들지 않고 돌려쓴다)
const seen: Enemy[] = [];

function hero(k: Cam, ghosts: Ghost[]) {
  const { g, game, t, sx, sy, fx, fy } = k;
  const p = game.player;
  const pc = fx(p.x);
  const pr = fy(p.y) + 3;
  // 맞으면 몸 전체가 아니라 흰 부분만 붉게 깜박여서 형체가 남는다
  const sting = p.hurt > 0 && Math.sin(t * 40) > 0;
  const ink = (key: string) => (key === 'r' ? SCARF : key === 'g' ? GOLD : key === 's' ? STEEL : sting ? DANGER : IVORY);
  // 발이 놓이는 줄 (그림은 6줄이고 몸의 가운데가 플레이어의 자리다)
  for (const gh of ghosts) stamp(k, fx(gh.x), fy(gh.y) + 3, HERO, HERO_TINT, gh.flip, -4.5, gh.life * 1.6, () => MANA);
  if (game.phase !== 'lost' || game.since < 0.6) {
    // 무적인 동안에는 깜박인다
    const blink = p.safe > 0 && p.dash <= 0 && Math.sin(t * 50) > 0;
    const swing = game.slashes.length > 0;
    // 벨 때는 베는 쪽을 본다
    const flip = swing ? Math.cos(game.slashes[0].ang) < 0 : p.side < 0;
    stamp(k, pc, pr, heroRows(t, p.moving, swing), swing ? HERO_SWING_TINT : HERO_TINT, flip, -5, blink ? 0.45 : 1, ink);
    // 다쳤으면 발밑에 체력 막대가 보인다
    if (p.hp < p.maxHp && game.phase === 'fight') {
      const n = Math.max(0, Math.round((p.hp / p.maxHp) * 7));
      label(k, pc - 3, pr + 1, '='.repeat(n), 0.9, DANGER);
      label(k, pc - 3 + n, pr + 1, '-'.repeat(7 - n), 0.35, STONE);
    }
  }

  // 룬의 고리: 둘레에 글자가 천천히 돌고, 피해를 주는 순간 밝아진다
  if (p.lv.aura) {
    const rad = AURA.r[p.lv.aura - 1];
    const beat = Math.max(0, 1 - (AURA.every - Math.max(0, p.cd.aura)) * 5);
    const n = Math.round(rad * 9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.4;
      g.add(sx(p.x + Math.cos(a) * rad), sy(p.y + Math.sin(a) * rad), 0.22 + 0.5 * beat, MANA[0], MANA[1], MANA[2], code(i % 4 ? ':' : 'XYVT'[(i >> 2) % 4]));
    }
  }
  // 도는 칼날: 칼날마다 지나온 자리에 꼬리가 남는다
  if (p.lv.orbit) {
    const lv = p.lv.orbit - 1;
    for (let i = 0; i < ORBIT.count[lv]; i++) {
      const a = p.orbit + (i / ORBIT.count[lv]) * Math.PI * 2;
      for (let j = 0; j < 9; j++) {
        const b = a - j * 0.09;
        g.add(sx(p.x + Math.cos(b) * ORBIT.r[lv]), sy(p.y + Math.sin(b) * ORBIT.r[lv]), j ? 0.5 * (1 - j / 9) : 1, STEEL[0], STEEL[1], STEEL[2], code(j ? stroke(b + Math.PI / 2) : 'X'));
      }
    }
  }
  // 베는 궤적: 초승달 모양이 한쪽 끝에서 다른 쪽 끝으로 지나간다
  for (const s of game.slashes) {
    const e = s.t / (SLASH_TIME - 0.02);
    for (let i = 0; i <= 44; i++) {
      const u = i / 44;
      if (u > e + 0.1) break;
      const a = s.ang - SWORD.half + 2 * SWORD.half * u;
      const fade = Math.max(0, 1 - (e - u) * 1.6);
      for (let rad = s.range * 0.78 + 0.9 * Math.sin(u * Math.PI); rad <= s.range; rad += 0.5)
        g.add(sx(s.x + Math.cos(a) * rad), sy(s.y + Math.sin(a) * rad), fade * (0.5 + 0.5 * (rad / s.range)), IVORY[0], IVORY[1], IVORY[2], code(stroke(a + Math.PI / 2)));
    }
  }
  // 낙뢰: 하늘에서 꺾이며 내려와 떨어진 자리에 고리가 번진다
  for (const s of game.strikes) {
    const e = s.t / BOLT_TIME;
    const c = sx(s.x);
    const r = Math.round(sy(s.y));
    let x = c;
    for (let y = r; y >= 0 && e < 0.7; y--) {
      const bend = Math.round(hash(y, Math.floor(s.x * 7)) * 3) - 1;
      g.put(x, y, -4, 1 - e, 255, 250, 200, code(bend > 0 ? '/' : bend < 0 ? '\\' : '|'));
      x += bend;
    }
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      g.add(sx(s.x + Math.cos(a) * BOLT.r * e), sy(s.y + Math.sin(a) * BOLT.r * e), 1 - e, GOLD[0], GOLD[1], GOLD[2], code('*'));
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
}

const bar = (v: number, max: number, width: number, on: string, off: string) => {
  const n = Math.round((Math.max(0, Math.min(max, v)) / max) * width);
  return on.repeat(n) + off.repeat(width - n);
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// 글귀를 쓰기 전에 그 자리의 그림을 지운다 (빈칸은 칸을 비운다)
const wipe = (g: Grid, x: number, y: number, width: number) => g.text(x, y, ' '.repeat(Math.max(0, width)), 0, 0, 0, 0);

// 화면 글자판은 영문만 쓴다 (한글은 칸 폭이 달라 줄이 어긋난다)
const LABEL: Record<UpgradeId, string> = { sword: 'SWORD', wave: 'WAVE', orbit: 'BLADES', bolt: 'BOLT', aura: 'RUNE', might: 'MIGHT', haste: 'HASTE', boots: 'BOOTS', magnet: 'MAGNET', heart: 'HEART' };

// 세계에 붙어 움직이는 글귀: 떠오르는 숫자와 화면 밖의 용을 가리키는 화살표
function floats(k: Cam) {
  const { game, z, fx, fy } = k;
  const p = game.player;
  const b = game.boss;
  for (const f of game.texts) {
    const col = f.kind === 1 ? GOLD : f.kind === 2 ? DANGER : f.kind === 3 ? HEAL : f.kind === 4 ? EMBER : STEEL;
    const s = f.kind === 1 ? `${f.s}!` : f.s;
    label(k, fx(f.x) - s.length / 2, fy(f.y) - f.t * 4 * z, s, 1 - f.t * 0.8, col);
  }
  const bc = fx(b.x);
  const br = fy(b.y);
  if (b.here && game.phase === 'fight' && (bc < 0 || bc >= k.g.cols || br < 5 || br >= k.g.rows - 3)) {
    const a = Math.atan2(b.y - p.y, b.x - p.x);
    const arrow = Math.abs(turn(a, 0)) < 0.8 ? '>' : Math.abs(turn(a, Math.PI)) < 0.8 ? '<' : Math.sin(a) > 0 ? 'v' : '^';
    label(k, fx(p.x) + Math.cos(a) * 12, fy(p.y) + Math.sin(a) * 7, arrow, 0.9, DANGER);
  }
}

function hud(k: Cam) {
  const { hud: g, game } = k;
  const { cols, rows } = g;
  const p = game.player;
  const b = game.boss;
  // 시작 화면과 결과 화면에서는 안내가 대신 보여 준다
  if (game.phase === 'title' || game.phase === 'won' || game.phase === 'lost') return;

  // 맨 위: 경험치 막대가 화면을 가로지르고(오른쪽 끝은 홈 버튼 자리라 비운다), 그 아래에 처치 수, 시계, 용이 오기까지 남은 시간이 있다
  for (let r = 0; r < 3; r++) wipe(g, 0, r, cols);
  const level = ` LV ${p.level} `;
  g.text(0, 0, level, 1, IVORY[0], IVORY[1], IVORY[2]);
  g.text(level.length, 0, bar(p.xp, p.next, cols - level.length - 10, '=', '.'), 0.85, MANA[0], MANA[1], MANA[2]);
  g.text(2, 1, `KILLS ${p.kills}`, 0.85, STONE[0], STONE[1], STONE[2]);
  const now = clock(game.t);
  g.text(Math.round((cols - now.length) / 2), 1, now, 1, IVORY[0], IVORY[1], IVORY[2]);
  if (!b.here) {
    const left = `DRAGON ${clock(Math.max(0, BOSS_AT - game.t))}`;
    const soon = BOSS_AT - game.t < 30 ? DANGER : STONE;
    g.text(Math.round(cols / 2) + 6, 1, left, soon === DANGER ? 0.95 : 0.85, soon[0], soon[1], soon[2]);
  } else {
    // 용이 나타나면 이름과 체력이 그 아래에 뜬다
    const wide = Math.min(72, cols - 12);
    const x0 = Math.round((cols - wide) / 2);
    const hot = b.enraged ? EMBER : DANGER;
    for (let r = 3; r < 6; r++) wipe(g, x0 - 3, r, wide + 6);
    g.text(x0, 3, b.enraged ? 'DRAGON  enraged' : 'DRAGON', 0.9, hot[0], hot[1] + 50, hot[2] + 50);
    const left = `${Math.ceil(b.hp)} / ${BOSS_HP}`;
    g.text(x0 + wide - left.length, 3, left, 0.7, STONE[0], STONE[1], STONE[2]);
    g.text(x0 - 1, 4, `[${bar(b.hp, BOSS_HP, wide, '#', '.')}]`, 0.95, hot[0], hot[1], hot[2]);
  }

  // 왼쪽 아래: 가진 무기와 능력의 단계
  const owned = (Object.keys(LABEL) as UpgradeId[]).filter((id) => p.lv[id] > 0);
  owned.forEach((id, i) => {
    const y = rows - 3 - owned.length + i;
    const weapon = (WEAPONS as UpgradeId[]).includes(id);
    const col = weapon ? GOLD : MANA;
    wipe(g, 0, y, 15);
    g.text(1, y, LABEL[id].padEnd(7) + bar(p.lv[id], 5, 5, '*', '.'), weapon ? 0.95 : 0.8, col[0], col[1], col[2]);
  });
  // 아래: 체력과 구르기
  const meter = Math.min(40, cols - 34);
  const hp = `HP [${bar(p.hp, p.maxHp, meter, '|', '.')}] ${Math.ceil(p.hp)}/${p.maxHp}`;
  const roll = p.dashCd > 0 ? `[roll ${p.dashCd.toFixed(1)}]` : '[SPACE roll]';
  const x1 = Math.max(1, Math.round((cols - hp.length - roll.length - 2) / 2));
  wipe(g, x1 - 2, rows - 2, hp.length + roll.length + 6);
  wipe(g, x1 - 2, rows - 1, hp.length + roll.length + 6);
  const life = p.hp < p.maxHp * 0.35 ? DANGER : HEAL;
  g.text(x1, rows - 2, hp, 0.95, life[0], life[1], life[2]);
  const ready = p.dashCd <= 0 ? IVORY : STONE;
  g.text(x1 + hp.length + 2, rows - 2, roll, p.dashCd <= 0 ? 0.9 : 0.4, ready[0], ready[1], ready[2]);
}

// 구른 자리에 남는 잔상
interface Ghost {
  x: number;
  y: number;
  life: number;
  flip: boolean;
}

// 게임 상태를 글자 격자로 옮기는 화가. 잔상처럼 그림에만 필요한 것은 여기서 기억한다.
export function createPainter() {
  let ghosts: Ghost[] = [];
  let lastT = 0;

  // 세계를 칸에 맞춰 그린 뒤, 카메라가 칸에서 벗어난 만큼(칸 단위)을 돌려준다. 렌더러가 그만큼 밀어서 그리면 화면이 매끄럽게 흐른다.
  return function paint(g: Grid, game: Game, view: View, t: number, layers?: Layers) {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const z = zoom(g);
    const ax = z * g.aspect;
    const b = game.boss;
    const p = game.player;
    if (p.dash > 0) ghosts.push({ x: p.x, y: p.y, life: 0.25, flip: p.side < 0 });
    ghosts = ghosts.filter((gh) => (gh.life -= dt) > 0);
    const shot = snap(g, view);
    // 겹이 없으면 매끄럽게 움직이는 글자도 칸에 맞춘 카메라로 그린다
    const eye = layers ? view : shot;
    const k: Cam = {
      g,
      game,
      view: shot,
      t,
      z,
      ax,
      sx: (wx) => g.cols / 2 + (wx - shot.x) * ax,
      sy: (wy) => g.rows / 2 + (wy - shot.y) * z,
      fx: (wx) => g.cols / 2 + (wx - eye.x) * ax,
      fy: (wy) => g.rows / 2 + (wy - eye.y) * z,
      out: layers?.sprites ?? null,
      hud: layers?.hud ?? g,
      // 공격을 준비하면 날개를 펴고, 포효할 때는 떤다
      pose: { flap: 1.2 * Math.sin(t * 2.4) + (b.casting > 0 ? 1.8 : 0) + (b.roar > 0 ? 2 * Math.sin(t * 18) : 0), sway: Math.sin(t * 1.3) * 0.5, t },
    };
    ground(k);
    dragon(k);
    mobs(k);
    hero(k, ghosts);
    floats(k);
    hud(k);
    return { x: (view.x - shot.x) * ax, y: (view.y - shot.y) * z };
  };
}
