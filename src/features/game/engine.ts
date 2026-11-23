import { rng } from '../ascii/stage/grid';

// 길이 단위는 글자 한 줄의 높이다. 벌판에는 끝이 없고, 적은 화면 밖에서 몰려온다.
export const BOSS_R = 4.6;
export const BOSS_HP = 8000;
export const MAX_HP = 100;
// 용이 나타나는 시각(초). 그때까지 버티며 강해져야 한다.
export const BOSS_AT = 180;

// 한 틱이 넘지 않는 길이(초). 화면이 느려도 규칙은 이보다 긴 간격으로 진행하지 않는다.
export const STEP = 1 / 60;
// 범위가 터진 뒤 번쩍이며 남는 시간과 포효가 이어지는 시간
export const ZONE_FLASH = 0.28;
export const ROAR = 1.6;
// 베기가 화면에 남는 시간
export const SLASH_TIME = 0.18;
export const BOLT_TIME = 0.3;

const SPEED = 10;
const DASH = { time: 0.16, speed: 44, safe: 0.3, cd: 1.4 };
// 맞은 뒤 잠깐은 다시 맞지 않는다
const HURT_SAFE = 0.6;
// 싸움이 끝난 뒤 다시 시작할 수 있을 때까지
const RESTART_AFTER = 1.2;
// 경험치 구슬을 끌어당기는 거리와 줍는 거리
const MAGNET = 5;
const GRAB = 1.2;
// 적은 플레이어에게서 이만큼 떨어진 화면 밖에서 나타나고, 너무 멀어지면 앞쪽으로 옮겨 온다
const SPAWN_R = 46;
const MAX_ENEMIES = 220;
const MAX_GEMS = 300;

export type Phase = 'title' | 'fight' | 'levelup' | 'won' | 'lost';
export type ZoneKind = 'circle' | 'ring' | 'cone' | 'line';
type Pattern = 'breath' | 'tail' | 'meteor' | 'charge' | 'nova' | 'cross';

export type WeaponId = 'sword' | 'wave' | 'orbit' | 'bolt' | 'aura';
export type PassiveId = 'might' | 'haste' | 'boots' | 'magnet' | 'heart';
export type UpgradeId = WeaponId | PassiveId;

export const WEAPONS: WeaponId[] = ['sword', 'wave', 'orbit', 'bolt', 'aura'];
export const MAX_LEVEL = 5;

// 무기의 단계별 수치. 배열의 n번째가 n+1단계다.
export const SWORD = { cd: 1.05, dmg: [14, 18, 22, 28, 36], range: [6, 6, 6.6, 6.6, 7.6], half: 1.05 };
export const WAVE = { cd: 1.5, dmg: [12, 15, 15, 19, 24], count: [1, 1, 2, 2, 3], pierce: [1, 2, 2, 3, 4], speed: 34, r: 1.6 };
export const ORBIT = { dmg: [7, 9, 11, 13, 16], count: [2, 3, 3, 4, 5], r: [5, 5, 6, 6, 7], turn: 3.3, again: 0.45 };
export const BOLT = { cd: 2.6, dmg: [24, 28, 36, 40, 50], count: [1, 2, 2, 3, 4], r: 3.2, reach: 24 };
export const AURA = { every: 0.5, dmg: [4, 5, 6, 8, 10], r: [4.6, 5.2, 5.8, 6.4, 7.2] };

// 단계가 오를 때마다 화면에 보여 줄 이름과 설명
export const UPGRADES: Record<UpgradeId, { name: string; weapon: boolean; text: string[] }> = {
  sword: { name: '검', weapon: true, text: ['가까운 적 쪽으로 벤다', '피해가 늘어난다', '뒤쪽으로도 한 번 더 벤다', '피해가 늘어난다', '더 멀리, 더 세게 벤다'] },
  wave: { name: '검기', weapon: true, text: ['가까운 적에게 검기를 날린다', '적을 하나 더 꿰뚫는다', '검기가 2개가 된다', '피해와 관통이 늘어난다', '검기가 3개가 된다'] },
  orbit: { name: '도는 칼날', weapon: true, text: ['칼날 2개가 둘레를 돈다', '칼날이 3개가 된다', '더 넓게 돈다', '칼날이 4개가 된다', '칼날이 5개가 되고 더 넓게 돈다'] },
  bolt: { name: '낙뢰', weapon: true, text: ['아무 적에게나 벼락이 떨어진다', '벼락이 2줄기가 된다', '피해가 늘어난다', '벼락이 3줄기가 된다', '벼락이 4줄기가 된다'] },
  aura: { name: '룬의 고리', weapon: true, text: ['둘레의 적이 계속 피해를 입고 밀려난다', '고리가 넓어진다', '고리가 넓어진다', '피해가 늘어난다', '고리가 훨씬 넓어진다'] },
  might: { name: '힘', weapon: false, text: ['모든 피해 +12%', '모든 피해 +24%', '모든 피해 +36%', '모든 피해 +48%', '모든 피해 +60%'] },
  haste: { name: '신속', weapon: false, text: ['공격 간격 -8%', '공격 간격 -16%', '공격 간격 -24%', '공격 간격 -32%', '공격 간격 -40%'] },
  boots: { name: '장화', weapon: false, text: ['이동 속도 +8%', '이동 속도 +16%', '이동 속도 +24%', '이동 속도 +32%', '이동 속도 +40%'] },
  magnet: { name: '자석', weapon: false, text: ['구슬을 40% 더 멀리서 끌어온다', '구슬을 80% 더 멀리서 끌어온다', '구슬을 120% 더 멀리서 끌어온다', '구슬을 160% 더 멀리서 끌어온다', '구슬을 200% 더 멀리서 끌어온다'] },
  heart: { name: '심장', weapon: false, text: ['최대 체력 +20, 조금씩 회복', '최대 체력 +40', '최대 체력 +60', '최대 체력 +80', '최대 체력 +100'] },
};
const ALL = Object.keys(UPGRADES) as UpgradeId[];

// 적의 종류: 느린 무리, 빠른 박쥐, 단단한 해골, 크고 느린 돌거인
export const KINDS = [
  { name: 'ghoul', hp: 10, speed: 4.2, dmg: 6, r: 0.9, xp: 1 },
  { name: 'bat', hp: 5, speed: 7, dmg: 4, r: 0.7, xp: 1 },
  { name: 'bones', hp: 26, speed: 5.4, dmg: 9, r: 0.9, xp: 2 },
  { name: 'golem', hp: 110, speed: 3, dmg: 16, r: 1.7, xp: 6 },
];

// 바닥에 미리 깔리는 공격 범위. t가 warn에 닿는 순간 한 번만 판정한다.
export interface Zone {
  kind: ZoneKind;
  x: number;
  y: number;
  // 원·부채꼴의 반지름, 고리의 바깥 반지름, 직선의 길이
  r: number;
  // 고리의 안쪽 반지름, 직선의 폭
  r2: number;
  ang: number;
  half: number;
  // 음수면 아직 나타나지 않았다
  t: number;
  warn: number;
  dmg: number;
  hit: boolean;
  // 나타나기 전까지 플레이어를 따라다니다가 나타나는 순간 자리가 정해진다
  seek: boolean;
}

export interface Enemy {
  kind: number;
  x: number;
  y: number;
  hp: number;
  max: number;
  // 한 분마다 나오는 우두머리. 크고 단단하며 큰 구슬을 떨군다.
  elite: boolean;
  flash: number;
  // 맞고 밀려나는 속도
  kx: number;
  ky: number;
  // 도는 칼날에 다시 맞을 수 있을 때까지
  orbitCd: number;
}

export interface Gem {
  x: number;
  y: number;
  // 경험치. 0이면 체력을 채우는 고기, -1이면 열자마자 하나를 올려 주는 상자다.
  xp: number;
  pulled: boolean;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  pierce: number;
  // 이미 맞힌 적 (같은 적을 두 번 맞히지 않는다)
  seen: Enemy[];
}

// 방금 벤 자리와 방금 벼락이 떨어진 자리 (그리는 데 쓴다)
export interface Slash {
  x: number;
  y: number;
  ang: number;
  range: number;
  t: number;
}

export interface Strike {
  x: number;
  y: number;
  t: number;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  // 0 불티, 1 칼빛, 2 재
  kind: number;
}

export interface FloatText {
  x: number;
  y: number;
  s: string;
  t: number;
  // 0 적이 입은 피해, 1 치명타, 2 내가 입은 피해, 3 회복, 4 안내
  kind: number;
}

export interface Scorch {
  x: number;
  y: number;
  r: number;
  t: number;
}

export interface Input {
  // 이동 방향 (-1~1)
  mx: number;
  my: number;
  dash: boolean;
  start: boolean;
  // 단계가 올랐을 때 고른 선택지(1~3). 고르지 않았으면 0이다.
  pick: number;
}

export const NO_INPUT: Input = { mx: 0, my: 0, dash: false, start: false, pick: 0 };

export interface Game {
  phase: Phase;
  // 전투가 시작된 뒤 흐른 시간
  t: number;
  // 단계가 바뀐 뒤 흐른 시간
  since: number;
  // 타격 순간 화면이 멈추는 남은 시간과 화면 흔들림 세기
  stop: number;
  shake: number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    // 걷는 방향(각도)과 마지막으로 본 좌우(-1 왼쪽, 1 오른쪽)
    face: number;
    side: number;
    moving: boolean;
    // 구르는 남은 시간과 방향
    dash: number;
    dx: number;
    dy: number;
    dashCd: number;
    // 무적 남은 시간
    safe: number;
    hurt: number;
    level: number;
    xp: number;
    next: number;
    // 무기와 능력의 단계 (0이면 아직 없다)
    lv: Record<UpgradeId, number>;
    // 무기마다 다음 공격까지 남은 시간
    cd: Record<WeaponId, number>;
    // 뒤쪽 베기가 나갈 때까지 남은 시간과 그 방향
    backIn: number;
    backAng: number;
    orbit: number;
    kills: number;
  };
  boss: {
    // 아직 나타나지 않았으면 false
    here: boolean;
    x: number;
    y: number;
    hp: number;
    face: number;
    // 다음 행동까지 남은 시간
    wait: number;
    last: Pattern | '';
    enraged: boolean;
    // 포효하는 남은 시간 (그동안은 피해를 받지 않는다)
    roar: number;
    flash: number;
    // 돌진: 출발까지 남은 시간, 달리는 남은 시간, 목적지
    chargeIn: number;
    charging: number;
    tx: number;
    ty: number;
    casting: number;
    orbitCd: number;
  };
  // 단계가 올랐을 때 고를 수 있는 것들과 지금까지 고르게 한 횟수 (화면이 선택지가 바뀐 것을 알아챈다)
  choices: UpgradeId[];
  offers: number;
  // 다음 적이 나타날 때까지 남은 시간과 다음 우두머리가 나올 시각
  spawn: number;
  eliteAt: number;
  enemies: Enemy[];
  gems: Gem[];
  zones: Zone[];
  shots: Shot[];
  slashes: Slash[];
  strikes: Strike[];
  sparks: Spark[];
  texts: FloatText[];
  scorch: Scorch[];
  rand: () => number;
}

// 다음 단계까지 필요한 경험치
// 원작처럼 단계마다 일정하게 늘어난다 (5, 11, 17, ...)
export const needFor = (level: number) => 5 + (level - 1) * 6;

export function createGame(seed = 7): Game {
  const lv = Object.fromEntries(ALL.map((id) => [id, 0])) as Record<UpgradeId, number>;
  lv.sword = 1;
  return {
    phase: 'title',
    t: 0,
    since: 0,
    stop: 0,
    shake: 0,
    player: { x: 0, y: 0, hp: MAX_HP, maxHp: MAX_HP, face: 0, side: 1, moving: false, dash: 0, dx: 1, dy: 0, dashCd: 0, safe: 0, hurt: 0, level: 1, xp: 0, next: needFor(1), lv, cd: { sword: 0.4, wave: 0.8, orbit: 0, bolt: 1, aura: 0.3 }, backIn: 0, backAng: 0, orbit: 0, kills: 0 },
    boss: { here: false, x: 0, y: -30, hp: BOSS_HP, face: Math.PI / 2, wait: 2.5, last: '', enraged: false, roar: 0, flash: 0, chargeIn: 0, charging: 0, tx: 0, ty: 0, casting: 0, orbitCd: 0 },
    choices: [],
    offers: 0,
    spawn: 0,
    eliteAt: 60,
    enemies: [],
    gems: [],
    zones: [],
    shots: [],
    slashes: [],
    strikes: [],
    sparks: [],
    texts: [],
    scorch: [],
    rand: rng(seed),
  };
}

// 두 각도의 차이 (-π~π)
export function turn(a: number, b: number) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// 범위 안에서 채워지는 방향으로 얼마나 들어와 있는지(0~1). 범위 밖이면 -1.
export function zoneAt(z: Zone, x: number, y: number, pad = 0) {
  const dx = x - z.x;
  const dy = y - z.y;
  const d = Math.hypot(dx, dy);
  if (z.kind === 'circle') return d < z.r + pad ? d / z.r : -1;
  if (z.kind === 'ring') return d > z.r2 - pad && d < z.r + pad ? (d - z.r2) / (z.r - z.r2) : -1;
  if (z.kind === 'cone') return d < z.r + pad && Math.abs(turn(Math.atan2(dy, dx), z.ang)) < z.half + pad / (d + 1) ? d / z.r : -1;
  const along = dx * Math.cos(z.ang) + dy * Math.sin(z.ang);
  const side = -dx * Math.sin(z.ang) + dy * Math.cos(z.ang);
  return along > -pad && along < z.r + pad && Math.abs(side) < z.r2 / 2 + pad ? along / z.r : -1;
}

const zone = (kind: ZoneKind, x: number, y: number, r: number, warn: number, dmg: number, more: Partial<Zone> = {}): Zone => ({
  kind,
  x,
  y,
  r,
  r2: 0,
  ang: 0,
  half: 0,
  t: 0,
  warn,
  dmg,
  hit: false,
  seek: false,
  ...more,
});

// 용의 겉면까지의 거리. 몸통뿐 아니라 목과 머리도 맞는다. 용이 없으면 아주 멀다.
export function reach(g: Game, x: number, y: number) {
  const b = g.boss;
  if (!b.here || b.hp <= 0) return 999;
  const cx = Math.cos(b.face);
  const cy = Math.sin(b.face);
  return Math.min(
    Math.hypot(x - b.x, y - b.y) - BOSS_R,
    Math.hypot(x - b.x - cx * 6, y - b.y - cy * 6) - 2.2,
    Math.hypot(x - b.x - cx * 10, y - b.y - cy * 10) - 2.6
  );
}

// 적이 얼마나 큰지 (우두머리는 더 크다)
export const sizeOf = (e: Enemy) => KINDS[e.kind].r * (e.elite ? 1.9 : 1);

function burst(g: Game, x: number, y: number, n: number, speed: number, kind: number) {
  // 불티가 너무 많으면 더 만들지 않는다
  if (g.sparks.length > 500) return;
  for (let i = 0; i < n; i++) {
    const a = g.rand() * Math.PI * 2;
    const v = speed * (0.3 + 0.7 * g.rand());
    const max = 0.3 + g.rand() * 0.5;
    g.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, kind });
  }
}

// 피해에 힘과 운을 곱한다. 치명타면 crit가 참이다.
function roll(g: Game, base: number) {
  const crit = g.rand() < 0.12;
  return { crit, dmg: Math.max(1, Math.round(base * (1 + 0.12 * g.player.lv.might) * (0.85 + 0.3 * g.rand()) * (crit ? 1.8 : 1))) };
}

function hurtBoss(g: Game, base: number, x: number, y: number) {
  const b = g.boss;
  if (!b.here || b.hp <= 0 || b.roar > 0) return;
  const { crit, dmg } = roll(g, base);
  b.hp = Math.max(0, b.hp - dmg);
  b.flash = 0.1;
  g.shake = Math.max(g.shake, crit ? 0.4 : 0.15);
  g.texts.push({ x: x + (g.rand() - 0.5) * 3, y: y - 1, s: String(dmg), t: 0, kind: crit ? 1 : 0 });
  burst(g, x, y, crit ? 10 : 4, 16, 1);
  if (b.hp <= 0) {
    g.phase = 'won';
    g.since = 0;
    g.zones = [];
    g.stop = 0.25;
    g.shake = 1.4;
    burst(g, b.x, b.y, 120, 30, 0);
    // 용이 쓰러지면 남은 무리도 함께 스러진다
    for (const e of g.enemies) burst(g, e.x, e.y, 3, 10, 2);
    g.enemies = [];
  } else if (!b.enraged && b.hp <= BOSS_HP / 2) {
    // 체력이 반이 되면 포효하고 사나워진다. 깔려 있던 범위는 걷힌다.
    b.enraged = true;
    b.roar = ROAR;
    b.wait = 2;
    b.chargeIn = 0;
    b.charging = 0;
    g.zones = [];
    g.shake = 1.2;
    g.texts.push({ x: b.x, y: b.y - 8, s: 'ENRAGED', t: 0, kind: 4 });
    burst(g, b.x, b.y, 80, 34, 0);
  }
}

// 적 하나에게 피해를 주고 (fromX, fromY)의 반대쪽으로 민다
function hurtEnemy(g: Game, e: Enemy, base: number, fromX: number, fromY: number, push: number) {
  if (e.hp <= 0) return;
  const { crit, dmg } = roll(g, base);
  e.hp -= dmg;
  e.flash = 0.12;
  const d = Math.hypot(e.x - fromX, e.y - fromY) || 1;
  const k = push / (e.elite ? 3 : KINDS[e.kind].r);
  e.kx += ((e.x - fromX) / d) * k;
  e.ky += ((e.y - fromY) / d) * k;
  // 숫자가 화면을 덮지 않게 한 번에 떠 있는 수를 제한한다
  if (g.texts.length < 36) g.texts.push({ x: e.x + (g.rand() - 0.5) * 1.5, y: e.y - 1.5, s: String(dmg), t: 0, kind: crit ? 1 : 0 });
  if (e.hp > 0) return;
  const p = g.player;
  p.kills++;
  burst(g, e.x, e.y, e.elite ? 26 : 5, e.elite ? 20 : 11, 2);
  if (e.elite) g.shake = Math.max(g.shake, 0.7);
  // 우두머리는 상자를 떨군다. 바닥에 구슬이 너무 많으면 가장 오래된 것에 합친다.
  if (g.gems.length < MAX_GEMS) g.gems.push({ x: e.x, y: e.y, xp: e.elite ? -1 : KINDS[e.kind].xp, pulled: false });
  else g.gems[0].xp += KINDS[e.kind].xp;
  // 가끔 고기를 떨군다
  if (g.rand() < 0.012) g.gems.push({ x: e.x + 1.5, y: e.y, xp: 0, pulled: false });
}

function hurtPlayer(g: Game, dmg: number, fromX: number, fromY: number, push: number) {
  const p = g.player;
  if (p.safe > 0 || g.phase !== 'fight') return false;
  p.hp = Math.max(0, p.hp - dmg);
  p.safe = HURT_SAFE;
  p.hurt = 0.35;
  g.stop = Math.max(g.stop, 0.06);
  g.shake = Math.max(g.shake, 0.8);
  g.texts.push({ x: p.x, y: p.y - 3, s: `-${dmg}`, t: 0, kind: 2 });
  // 맞은 반대쪽으로 밀려난다
  const d = Math.hypot(p.x - fromX, p.y - fromY) || 1;
  p.x += ((p.x - fromX) / d) * push;
  p.y += ((p.y - fromY) / d) * push;
  burst(g, p.x, p.y, 10, 12, 0);
  if (p.hp <= 0) {
    g.phase = 'lost';
    g.since = 0;
  }
  return true;
}

// 단계가 오르면 고를 것 셋을 뽑는다. 이미 가진 것이 조금 더 잘 나오고, 올릴 무기가 남아 있으면 첫 칸은 반드시 무기다.
function offer(g: Game) {
  const p = g.player;
  const pool = ALL.filter((id) => p.lv[id] < MAX_LEVEL);
  const picks: UpgradeId[] = [];
  while (picks.length < 3 && pool.length) {
    const first = !picks.length && pool.some((id) => UPGRADES[id].weapon);
    const weights = pool.map((id): number => (first && !UPGRADES[id].weapon ? 0 : p.lv[id] > 0 ? 1.6 : 1));
    let at = g.rand() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < pool.length - 1 && (at -= weights[i]) >= 0) i++;
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

function take(g: Game, id: UpgradeId) {
  const p = g.player;
  p.lv[id]++;
  if (id === 'heart') {
    p.maxHp += 20;
    p.hp = Math.min(p.maxHp, p.hp + 20);
  }
  g.texts.push({ x: p.x, y: p.y - 4, s: `${UPGRADES[id].name} ${p.lv[id]}`, t: 0, kind: 4 });
}

// 경험치를 얻는다. chest가 참이면 경험치와 상관없이 하나를 고르게 한다.
function gainXp(g: Game, xp: number, chest = false) {
  const p = g.player;
  p.xp += xp;
  if (g.phase !== 'fight' || (!chest && p.xp < p.next)) return;
  if (!chest) {
    p.xp -= p.next;
    p.level++;
    p.next = needFor(p.level);
  }
  g.choices = offer(g);
  // 더 올릴 것이 없으면 체력을 채운다
  if (!g.choices.length) {
    p.hp = Math.min(p.maxHp, p.hp + 30);
    return;
  }
  g.phase = 'levelup';
  g.offers++;
  g.since = 0;
  // 단계가 오르는 순간 둘레의 적이 밀려난다
  for (const e of g.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
    if (d < 12) {
      e.kx += ((e.x - p.x) / d) * 26;
      e.ky += ((e.y - p.y) / d) * 26;
    }
  }
  burst(g, p.x, p.y, 40, 26, 1);
}

// 가장 가까운 적(용 포함)의 방향. 둘레에 아무도 없으면 null이다.
function nearest(g: Game, within: number, skip: number[] = []) {
  const p = g.player;
  let best = within;
  let ang: number | null = null;
  for (const e of g.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y) - sizeOf(e);
    if (d >= best) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    if (skip.some((s) => Math.abs(turn(a, s)) < 0.35)) continue;
    best = d;
    ang = a;
  }
  const b = g.boss;
  if (b.here && b.hp > 0) {
    // 용은 몸통보다 가까운 머리를 겨눈다
    for (const k of [0, 6, 10]) {
      const x = b.x + Math.cos(b.face) * k;
      const y = b.y + Math.sin(b.face) * k;
      const d = Math.hypot(x - p.x, y - p.y) - 2.5;
      if (d < best && !skip.length) {
        best = d;
        ang = Math.atan2(y - p.y, x - p.x);
      }
    }
  }
  return ang;
}

function slash(g: Game, ang: number) {
  const p = g.player;
  const lv = p.lv.sword - 1;
  const range = SWORD.range[lv];
  g.slashes.push({ x: p.x, y: p.y, ang, range, t: 0 });
  for (const e of g.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d - sizeOf(e) < range && (d < 1.5 || Math.abs(turn(Math.atan2(e.y - p.y, e.x - p.x), ang)) < SWORD.half)) hurtEnemy(g, e, SWORD.dmg[lv], p.x, p.y, 9);
  }
  // 칼이 닿는 자리 셋 중 하나라도 용에 닿으면 맞는다
  for (const d of [1.5, range * 0.6, range]) {
    const hx = p.x + Math.cos(ang) * d;
    const hy = p.y + Math.sin(ang) * d;
    if (reach(g, hx, hy) > 1.2) continue;
    hurtBoss(g, SWORD.dmg[lv] * 1.5, hx, hy);
    break;
  }
}

// 무기는 저절로 나간다. 간격은 신속 단계만큼 줄어든다.
function tickWeapons(g: Game, dt: number) {
  const p = g.player;
  const quick = 1 - 0.08 * p.lv.haste;
  for (const id of WEAPONS) p.cd[id] -= dt;

  if (p.lv.sword && p.cd.sword <= 0) {
    p.cd.sword = SWORD.cd * quick;
    // 가까운 적이 없으면 걷는 쪽으로 벤다
    const ang = nearest(g, 11) ?? (p.side > 0 ? 0 : Math.PI);
    slash(g, ang);
    if (p.lv.sword >= 3) {
      p.backIn = 0.14;
      p.backAng = ang + Math.PI;
    }
  }
  if (p.backIn > 0 && (p.backIn -= dt) <= 0) slash(g, p.backAng);

  if (p.lv.wave && p.cd.wave <= 0) {
    const lv = p.lv.wave - 1;
    const aimed: number[] = [];
    for (let i = 0; i < WAVE.count[lv]; i++) {
      // 검기마다 다른 적을 겨누고, 겨눌 적이 모자라면 처음 방향에서 조금 벌린다
      const ang = nearest(g, 30, aimed) ?? (aimed.length ? aimed[0] + (i % 2 ? 0.3 : -0.3) * Math.ceil(i / 2) : null);
      if (ang === null) break;
      aimed.push(ang);
      g.shots.push({ x: p.x, y: p.y, vx: Math.cos(ang) * WAVE.speed, vy: Math.sin(ang) * WAVE.speed, life: 1.1, dmg: WAVE.dmg[lv], pierce: WAVE.pierce[lv], seen: [] });
    }
    // 겨눌 적이 없었으면 곧 다시 살핀다
    p.cd.wave = aimed.length ? WAVE.cd * quick : 0.2;
  }

  if (p.lv.orbit) {
    const lv = p.lv.orbit - 1;
    p.orbit += ORBIT.turn * dt;
    g.boss.orbitCd -= dt;
    for (let i = 0; i < ORBIT.count[lv]; i++) {
      const a = p.orbit + (i / ORBIT.count[lv]) * Math.PI * 2;
      const x = p.x + Math.cos(a) * ORBIT.r[lv];
      const y = p.y + Math.sin(a) * ORBIT.r[lv];
      for (const e of g.enemies)
        if (e.orbitCd <= 0 && Math.hypot(e.x - x, e.y - y) < sizeOf(e) + 1.1) {
          e.orbitCd = ORBIT.again;
          hurtEnemy(g, e, ORBIT.dmg[lv], p.x, p.y, 7);
        }
      if (g.boss.orbitCd <= 0 && reach(g, x, y) < 1) {
        g.boss.orbitCd = ORBIT.again;
        hurtBoss(g, ORBIT.dmg[lv], x, y);
      }
    }
  }

  if (p.lv.bolt && p.cd.bolt <= 0) {
    const lv = p.lv.bolt - 1;
    const near = g.enemies.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < BOLT.reach);
    const b = g.boss;
    const bossNear = b.here && b.hp > 0 && Math.hypot(b.x - p.x, b.y - p.y) < BOLT.reach + 6;
    p.cd.bolt = near.length || bossNear ? BOLT.cd * quick : 0.3;
    for (let i = 0; i < BOLT.count[lv] && (near.length || bossNear); i++) {
      // 용이 있으면 첫 줄기는 용에게 떨어진다
      const at = bossNear && (i === 0 || !near.length) ? b : near[Math.floor(g.rand() * near.length)];
      g.strikes.push({ x: at.x, y: at.y, t: 0 });
      g.scorch.push({ x: at.x, y: at.y, r: BOLT.r * 0.7, t: 0 });
      for (const e of g.enemies) if (Math.hypot(e.x - at.x, e.y - at.y) < BOLT.r + sizeOf(e)) hurtEnemy(g, e, BOLT.dmg[lv], at.x, at.y, 5);
      if (reach(g, at.x, at.y) < BOLT.r) hurtBoss(g, BOLT.dmg[lv] * 1.4, at.x, at.y);
    }
  }

  if (p.lv.aura && p.cd.aura <= 0) {
    const lv = p.lv.aura - 1;
    p.cd.aura = AURA.every * quick;
    for (const e of g.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < AURA.r[lv] + sizeOf(e)) hurtEnemy(g, e, AURA.dmg[lv], p.x, p.y, 4);
    if (reach(g, p.x, p.y) < AURA.r[lv]) {
      const b = g.boss;
      const d = Math.hypot(b.x - p.x, b.y - p.y) || 1;
      hurtBoss(g, AURA.dmg[lv], p.x + ((b.x - p.x) / d) * 3, p.y + ((b.y - p.y) / d) * 3);
    }
  }

  g.shots = g.shots.filter((s) => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    for (const e of g.enemies) {
      if (s.pierce <= 0) break;
      if (e.hp <= 0 || s.seen.includes(e) || Math.hypot(e.x - s.x, e.y - s.y) > WAVE.r + sizeOf(e)) continue;
      s.seen.push(e);
      s.pierce--;
      hurtEnemy(g, e, s.dmg, s.x - s.vx, s.y - s.vy, 8);
    }
    if (s.pierce > 0 && reach(g, s.x, s.y) < WAVE.r) {
      hurtBoss(g, s.dmg * 2, s.x, s.y);
      return false;
    }
    return s.life > 0 && s.pierce > 0;
  });
}

// 떠 있는 숫자와 불티, 그을음. 전투가 끝나도 흐른다.
function tickEffects(g: Game, dt: number) {
  const p = g.player;
  g.texts = g.texts.filter((f) => (f.t += dt) < (f.kind === 4 ? 2 : 0.7));
  g.sparks = g.sparks.filter((s) => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 1 - 3 * dt;
    s.vy *= 1 - 3 * dt;
    return (s.life -= dt) > 0;
  });
  g.scorch = g.scorch.filter((s) => (s.t += dt) < 8);
  g.slashes = g.slashes.filter((s) => (s.t += dt) < SLASH_TIME);
  g.strikes = g.strikes.filter((s) => (s.t += dt) < BOLT_TIME);
  g.boss.flash = Math.max(0, g.boss.flash - dt);
  p.hurt = Math.max(0, p.hurt - dt);
}

function tickPlayer(g: Game, input: Input, dt: number) {
  const p = g.player;
  const b = g.boss;
  p.safe = Math.max(0, p.safe - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.lv.heart) p.hp = Math.min(p.maxHp, p.hp + 0.25 * p.lv.heart * dt);
  const len = Math.hypot(input.mx, input.my);
  p.moving = len > 0.15;
  if (p.moving) {
    p.face = Math.atan2(input.my, input.mx);
    if (Math.abs(input.mx) > 0.15) p.side = Math.sign(input.mx);
  }
  if (p.dash > 0) {
    p.dash -= dt;
    p.x += p.dx * DASH.speed * dt;
    p.y += p.dy * DASH.speed * dt;
  } else {
    if (p.moving) {
      const k = Math.min(1, len) * SPEED * (1 + 0.08 * p.lv.boots);
      p.x += (input.mx / len) * k * dt;
      p.y += (input.my / len) * k * dt;
    }
    if (input.dash && p.dashCd <= 0) {
      // 움직이는 쪽으로 구르고, 서 있으면 보는 쪽으로 구른다
      p.dx = Math.cos(p.face);
      p.dy = Math.sin(p.face);
      p.dash = DASH.time;
      p.dashCd = DASH.cd;
      p.safe = Math.max(p.safe, DASH.safe);
    }
  }
  // 용의 몸은 뚫고 지나가지 못한다
  const gap = Math.hypot(p.x - b.x, p.y - b.y);
  if (b.here && gap < BOSS_R && b.charging <= 0) {
    p.x = b.x + ((p.x - b.x) / (gap || 1)) * BOSS_R;
    p.y = b.y + ((p.y - b.y) / (gap || 1)) * BOSS_R;
  }

  // 구슬: 가까이 가면 끌려오고, 닿으면 줍는다
  const pull = MAGNET * (1 + 0.4 * p.lv.magnet);
  g.gems = g.gems.filter((m) => {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < pull) m.pulled = true;
    if (m.pulled) {
      const v = Math.min(d, 32 * dt);
      m.x += ((p.x - m.x) / (d || 1)) * v;
      m.y += ((p.y - m.y) / (d || 1)) * v;
    }
    if (d > GRAB) return true;
    // 고를 것이 이미 떠 있으면 상자는 다음에 연다
    if (m.xp < 0 && g.phase !== 'fight') return true;
    if (m.xp) gainXp(g, Math.max(0, m.xp), m.xp < 0);
    else {
      p.hp = Math.min(p.maxHp, p.hp + 30);
      g.texts.push({ x: p.x, y: p.y - 3, s: '+30', t: 0, kind: 3 });
    }
    return false;
  });
}

// 지금 시각에 맞는 적의 종류를 고른다. 시간이 갈수록 단단한 것이 섞인다.
function pickKind(g: Game) {
  const r = g.rand();
  if (g.t > 135 && r < 0.1) return 3;
  if (g.t > 70 && r < 0.38) return 2;
  if (g.t > 25 && r < 0.62) return 1;
  return 0;
}

function spawnEnemy(g: Game, kind: number, elite = false, ang?: number) {
  const p = g.player;
  const k = KINDS[kind];
  // 걷고 있으면 가는 쪽에서 더 자주 나타난다
  const a = ang ?? (p.moving && g.rand() < 0.4 ? p.face + (g.rand() - 0.5) * 1.6 : g.rand() * Math.PI * 2);
  // 시간이 갈수록 같은 적도 단단해진다
  const hp = Math.round(k.hp * (1 + (g.t / 60) * 0.5) * (elite ? 12 : 1));
  g.enemies.push({ kind, x: p.x + Math.cos(a) * SPAWN_R, y: p.y + Math.sin(a) * SPAWN_R * 0.75, hp, max: hp, elite, flash: 0, kx: 0, ky: 0, orbitCd: 0 });
}

function tickEnemies(g: Game, dt: number) {
  const p = g.player;
  // 있어야 할 적의 수는 처음에는 천천히, 뒤로 갈수록 가파르게 늘어난다. 용이 오면 무리는 성겨진다.
  const k = Math.min(1, g.t / BOSS_AT);
  const want = g.boss.here ? 45 : 12 + (MAX_ENEMIES - 12) * k * k;
  g.spawn -= dt;
  if (g.spawn <= 0) {
    g.spawn = 0.7 - 0.45 * k;
    // 모자라면 한 번에 여럿을 채운다
    const n = g.enemies.length < want * 0.5 ? 3 : g.enemies.length < want ? 1 : 0;
    for (let i = 0; i < n; i++) spawnEnemy(g, pickKind(g));
  }
  // 40초마다 박쥐 떼가 한쪽에서 몰려온다
  if (!g.boss.here && Math.floor(g.t / 40) > Math.floor((g.t - dt) / 40)) {
    const from = g.rand() * Math.PI * 2;
    for (let i = 0; i < 7 + g.t / 10; i++) spawnEnemy(g, 1, false, from + (g.rand() - 0.5) * 0.7);
  }
  if (g.t >= g.eliteAt && !g.boss.here) {
    g.eliteAt += 60;
    spawnEnemy(g, 2, true);
    g.texts.push({ x: p.x, y: p.y - 6, s: 'ELITE', t: 0, kind: 4 });
  }

  for (let i = 0; i < g.enemies.length; i++) {
    const e = g.enemies[i];
    const k = KINDS[e.kind];
    const r = sizeOf(e);
    e.flash -= dt;
    e.orbitCd -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    // 너무 멀리 뒤처진 적은 플레이어 앞쪽 화면 밖으로 옮겨 온다
    if (d > SPAWN_R * 1.5) {
      const a = Math.atan2(-dy, -dx) + Math.PI + (g.rand() - 0.5);
      e.x = p.x + Math.cos(a) * SPAWN_R;
      e.y = p.y + Math.sin(a) * SPAWN_R * 0.75;
      continue;
    }
    // 박쥐는 곧장 오지 않고 출렁이며 다가온다
    const weave = e.kind === 1 ? Math.sin(g.t * 5 + i) * 0.7 : 0;
    const speed = k.speed * (e.elite ? 0.85 : 1);
    e.x += ((dx / d) * speed - (dy / d) * weave * speed + e.kx) * dt;
    e.y += ((dy / d) * speed + (dx / d) * weave * speed + e.ky) * dt;
    e.kx *= 1 - Math.min(1, 9 * dt);
    e.ky *= 1 - Math.min(1, 9 * dt);
    // 서로 겹치지 않게 밀어낸다
    for (let j = i + 1; j < g.enemies.length; j++) {
      const o = g.enemies[j];
      const ox = o.x - e.x;
      const oy = o.y - e.y;
      const need = r + sizeOf(o);
      if (Math.abs(ox) > need || Math.abs(oy) > need) continue;
      const od = Math.hypot(ox, oy) || 0.01;
      if (od >= need) continue;
      const fix = ((need - od) / od) * 0.5;
      e.x -= ox * fix;
      e.y -= oy * fix;
      o.x += ox * fix;
      o.y += oy * fix;
    }
    if (d < r + 0.9) hurtPlayer(g, Math.round(k.dmg * (e.elite ? 1.6 : 1)), e.x, e.y, 1.2);
  }
  g.enemies = g.enemies.filter((e) => e.hp > 0);
}

// 보스가 다음 공격을 골라 범위를 깐다. 같은 공격을 연달아 쓰지는 않는다.
function act(g: Game) {
  const b = g.boss;
  const p = g.player;
  const fast = b.enraged ? 0.82 : 1;
  const toP = Math.atan2(p.y - b.y, p.x - b.x);
  const dist = Math.hypot(p.x - b.x, p.y - b.y);
  const pool: Pattern[] = ['breath', 'tail', 'meteor', 'charge'];
  if (b.enraged) pool.push('nova', 'cross');
  // 가까이 붙어 있으면 꼬리치기가, 멀면 돌진이 자주 나온다
  if (dist < 9) pool.push('tail');
  if (dist > 18) pool.push('charge');
  let pick = pool[Math.floor(g.rand() * pool.length)];
  while (pick === b.last) pick = pool[Math.floor(g.rand() * pool.length)];
  b.last = pick;
  b.face = toP;
  const hx = b.x + Math.cos(toP) * 5;
  const hy = b.y + Math.sin(toP) * 5;
  let busy = 1;
  if (pick === 'breath') {
    g.zones.push(zone('cone', hx, hy, 25, 1.1 * fast, 30, { ang: toP, half: 0.52 }));
    busy = 1.1 * fast;
    if (b.enraged) {
      // 좌우로 한 번씩 더 뿜는다
      g.zones.push(zone('cone', hx, hy, 25, 0.7, 30, { ang: toP + 0.95, half: 0.5, t: -busy }));
      g.zones.push(zone('cone', hx, hy, 25, 0.7, 30, { ang: toP - 0.95, half: 0.5, t: -busy - 0.5 }));
      busy += 1.2;
    }
  } else if (pick === 'tail') {
    g.zones.push(zone('circle', b.x, b.y, 10.5, 0.8 * fast, 24));
    busy = 0.8 * fast;
  } else if (pick === 'meteor') {
    const n = b.enraged ? 7 : 4;
    for (let i = 0; i < n; i++) g.zones.push(zone('circle', p.x, p.y, 4.4, 1 * fast, 22, { t: -i * 0.42, seek: true }));
    busy = n * 0.42 + 0.6;
  } else if (pick === 'charge') {
    const len = Math.min(46, dist + 14);
    g.zones.push(zone('line', b.x, b.y, len, 0.9 * fast, 34, { ang: toP, r2: 6.5 }));
    b.chargeIn = 0.9 * fast;
    b.tx = b.x + Math.cos(toP) * (len - 3);
    b.ty = b.y + Math.sin(toP) * (len - 3);
    busy = 0.9 * fast + 0.4;
  } else if (pick === 'nova') {
    g.zones.push(zone('ring', b.x, b.y, 27, 1.3, 38, { r2: 7.5 }));
    busy = 1.3;
  } else {
    for (let k = 0; k < 2; k++)
      for (let i = 0; i < 4; i++) g.zones.push(zone('line', b.x, b.y, 40, k ? 0.75 : 1, 28, { ang: toP + (i * Math.PI) / 2 + (k * Math.PI) / 4, r2: 5, t: k ? -1 : 0 }));
    busy = 1.8;
  }
  b.casting = busy;
  b.wait = busy + (b.enraged ? 0.75 : 1.25);
}

function tickBoss(g: Game, dt: number) {
  const p = g.player;
  const b = g.boss;
  if (!b.here) {
    if (g.t < BOSS_AT) return;
    // 용이 화면 위쪽 밖에서 내려앉는다. 포효하는 동안 무리가 흩어진다.
    b.here = true;
    b.x = p.x;
    b.y = p.y - 26;
    b.roar = ROAR;
    g.shake = 1.2;
    g.texts.push({ x: p.x, y: p.y - 8, s: 'THE DRAGON', t: 0, kind: 4 });
    for (const e of g.enemies) {
      const d = Math.hypot(e.x - b.x, e.y - b.y) || 1;
      e.kx += ((e.x - b.x) / d) * 40;
      e.ky += ((e.y - b.y) / d) * 40;
    }
    return;
  }
  b.roar = Math.max(0, b.roar - dt);
  b.casting = Math.max(0, b.casting - dt);
  if (b.chargeIn > 0) {
    b.chargeIn -= dt;
    if (b.chargeIn <= 0) b.charging = 0.3;
  } else if (b.charging > 0) {
    const k = Math.min(1, dt / b.charging);
    b.x += (b.tx - b.x) * k;
    b.y += (b.ty - b.y) * k;
    b.charging -= dt;
    if (g.rand() < 0.6) burst(g, b.x, b.y, 3, 10, 2);
  } else if (b.roar <= 0) {
    if (b.casting <= 0) {
      // 쉬는 동안에는 다가오며 플레이어 쪽으로 몸을 돌린다. 멀리 달아나면 더 빨리 쫓아온다.
      const want = Math.atan2(p.y - b.y, p.x - b.x);
      const far = Math.hypot(p.x - b.x, p.y - b.y);
      b.face += Math.max(-2.4 * dt, Math.min(2.4 * dt, turn(want, b.face)));
      if (far > 13) {
        const speed = (b.enraged ? 5.5 : 4) + Math.max(0, far - 30) * 0.8;
        b.x += Math.cos(want) * speed * dt;
        b.y += Math.sin(want) * speed * dt;
      }
    }
    b.wait -= dt;
    if (b.wait <= 0) act(g);
  }
}

function tickZones(g: Game, dt: number) {
  const p = g.player;
  g.zones = g.zones.filter((z) => {
    const before = z.t;
    z.t += dt;
    if (z.seek && before < 0) {
      z.x = p.x;
      z.y = p.y;
    }
    if (z.t >= z.warn && !z.hit) {
      z.hit = true;
      g.shake = Math.max(g.shake, 0.45);
      if (z.kind === 'circle' && z.r < 6) g.scorch.push({ x: z.x, y: z.y, r: z.r, t: 0 });
      // 원과 고리는 그 가운데에서, 숨결과 돌진은 용에게서 밀려난다
      const from = z.kind === 'circle' || z.kind === 'ring' ? z : g.boss;
      if (zoneAt(z, p.x, p.y, 0.4) >= 0) hurtPlayer(g, z.dmg, from.x, from.y, 2.5);
      // 용의 공격에는 무리도 휩쓸린다
      for (const e of g.enemies) if (zoneAt(z, e.x, e.y) >= 0) hurtEnemy(g, e, z.dmg * 2, from.x, from.y, 10);
    }
    // 터진 뒤에도 잠깐 남아서 번쩍인다
    return z.t < z.warn + ZONE_FLASH;
  });
}

// 한 틱 진행한다. dt는 STEP 이하로 준다.
export function update(g: Game, input: Input, dt: number) {
  g.since += dt;
  g.shake = Math.max(0, g.shake - dt * 3.5);
  if (g.phase === 'title') {
    if (input.start) {
      g.phase = 'fight';
      g.since = 0;
    }
    return;
  }
  if (g.phase === 'levelup') {
    // 고를 때까지 싸움은 멈춰 있다. 잘못 눌리지 않게 뜬 직후에는 받지 않는다.
    const id = g.since > 0.25 ? g.choices[input.pick - 1] : undefined;
    if (!id) return;
    take(g, id);
    g.choices = [];
    g.phase = 'fight';
    g.since = 0;
    g.player.safe = Math.max(g.player.safe, 0.6);
    // 구슬을 한꺼번에 주웠으면 바로 다음 단계로 이어진다
    gainXp(g, 0);
    return;
  }
  if (g.phase !== 'fight' && g.since > RESTART_AFTER && input.start) {
    Object.assign(g, createGame(Math.floor(g.rand() * 1e6)), { phase: 'fight' });
    return;
  }
  // 타격 순간에는 잠깐 모든 것이 멈춘다
  if (g.stop > 0) {
    g.stop -= dt;
    return;
  }
  tickEffects(g, dt);
  if (g.phase !== 'fight') return;
  g.t += dt;
  tickPlayer(g, input, dt);
  if (g.phase !== 'fight') return;
  tickWeapons(g, dt);
  // 플레이어의 공격으로 싸움이 끝났으면 적은 더 움직이지 않는다
  if (g.phase !== 'fight') return;
  tickEnemies(g, dt);
  tickBoss(g, dt);
  tickZones(g, dt);
}

// 한 프레임에 흐른 시간만큼 진행한다. 프레임이 STEP보다 길면 같은 길이의 여러 틱으로 나눈다.
// 프레임 하나가 틱 하나와 맞아떨어져서, 고정 간격으로 돌릴 때처럼 어떤 프레임은 두 틱을 가고 어떤 프레임은 쉬는 일이 없다.
export function step(g: Game, input: () => Input, dt: number) {
  const n = Math.max(1, Math.ceil(dt / STEP - 0.001));
  for (let i = 0; i < n; i++) update(g, input(), dt / n);
}
