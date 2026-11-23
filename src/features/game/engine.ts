import { rng } from '../ascii/stage/grid';

// 길이 단위는 글자 한 줄의 높이다. 전투는 반지름 ARENA인 둥근 풀밭 안에서 벌어진다.
export const ARENA = 34;
export const BOSS_R = 4.6;
export const BOSS_HP = 5000;
export const MAX_HP = 100;
export const MAX_MP = 100;

// 한 틱의 길이(초). 화면이 몇 장을 그리든 규칙은 이 간격으로만 진행한다.
export const STEP = 1 / 60;
export const SLASH = { range: 5.4, cd: 0.38, dmg: 26 };
export const WAVE = { speed: 36, r: 1.6, dmg: 70, mp: 20, cd: 2.5 };
export const SPIN = { r: 7.5, dmg: 110, mp: 35, cd: 7 };
// 범위가 터진 뒤 번쩍이며 남는 시간과 포효가 이어지는 시간
export const ZONE_FLASH = 0.28;
export const ROAR = 1.6;

const SPEED = 11;
const DASH = { time: 0.16, speed: 44, safe: 0.3, cd: 1 };
const POTION = { heal: 45, cd: 1, count: 3 };
const MP_REGEN = 7;
// 맞은 뒤 잠깐은 다시 맞지 않는다
const HURT_SAFE = 0.6;
// 싸움이 끝난 뒤 다시 시작할 수 있을 때까지
const RESTART_AFTER = 1.2;

export type Phase = 'title' | 'fight' | 'won' | 'lost';
export type ZoneKind = 'circle' | 'ring' | 'cone' | 'line';
type Pattern = 'breath' | 'tail' | 'meteor' | 'charge' | 'nova' | 'cross';

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

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
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
  // 0 보스가 입은 피해, 1 치명타, 2 내가 입은 피해, 3 회복, 4 안내
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
  // 조준하는 자리. 없으면 보스를 향한다.
  aim: { x: number; y: number } | null;
  attack: boolean;
  dash: boolean;
  wave: boolean;
  spin: boolean;
  potion: boolean;
  start: boolean;
}

export const NO_INPUT: Input = { mx: 0, my: 0, aim: null, attack: false, dash: false, wave: false, spin: false, potion: false, start: false };

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
    mp: number;
    face: number;
    moving: boolean;
    // 구르는 남은 시간과 방향
    dash: number;
    dx: number;
    dy: number;
    dashCd: number;
    // 무적 남은 시간
    safe: number;
    slashCd: number;
    // 방금 휘두른 뒤 흐른 시간과 그 방향 (그리는 데 쓴다)
    slashT: number;
    slashAng: number;
    waveCd: number;
    spinCd: number;
    spinT: number;
    potions: number;
    potionCd: number;
    hurt: number;
  };
  boss: {
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
  };
  zones: Zone[];
  shots: Shot[];
  sparks: Spark[];
  texts: FloatText[];
  scorch: Scorch[];
  rand: () => number;
}

export function createGame(seed = 7): Game {
  return {
    phase: 'title',
    t: 0,
    since: 0,
    stop: 0,
    shake: 0,
    player: { x: 0, y: 16, hp: MAX_HP, mp: MAX_MP, face: -Math.PI / 2, moving: false, dash: 0, dx: 0, dy: -1, dashCd: 0, safe: 0, slashCd: 0, slashT: 9, slashAng: 0, waveCd: 0, spinCd: 0, spinT: 9, potions: POTION.count, potionCd: 0, hurt: 0 },
    boss: { x: 0, y: -8, hp: BOSS_HP, face: Math.PI / 2, wait: 2, last: '', enraged: false, roar: 0, flash: 0, chargeIn: 0, charging: 0, tx: 0, ty: 0, casting: 0 },
    zones: [],
    shots: [],
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

// 용의 겉면까지의 거리. 몸통뿐 아니라 목과 머리도 맞는다.
export function reach(g: Game, x: number, y: number) {
  const b = g.boss;
  const cx = Math.cos(b.face);
  const cy = Math.sin(b.face);
  return Math.min(
    Math.hypot(x - b.x, y - b.y) - BOSS_R,
    Math.hypot(x - b.x - cx * 6, y - b.y - cy * 6) - 2.2,
    Math.hypot(x - b.x - cx * 10, y - b.y - cy * 10) - 2.6
  );
}

function burst(g: Game, x: number, y: number, n: number, speed: number, kind: number) {
  for (let i = 0; i < n; i++) {
    const a = g.rand() * Math.PI * 2;
    const v = speed * (0.3 + 0.7 * g.rand());
    const max = 0.3 + g.rand() * 0.5;
    g.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, kind });
  }
}

function hurtBoss(g: Game, base: number, x: number, y: number) {
  const b = g.boss;
  if (b.hp <= 0 || b.roar > 0) return;
  const crit = g.rand() < 0.15;
  const dmg = Math.round(base * (0.85 + 0.3 * g.rand()) * (crit ? 1.8 : 1));
  b.hp = Math.max(0, b.hp - dmg);
  b.flash = 0.1;
  g.stop = Math.max(g.stop, crit ? 0.09 : 0.045);
  g.shake = Math.max(g.shake, crit ? 0.5 : 0.25);
  g.texts.push({ x: x + (g.rand() - 0.5) * 3, y: y - 1, s: String(dmg), t: 0, kind: crit ? 1 : 0 });
  burst(g, x, y, crit ? 14 : 7, 16, 1);
  if (b.hp <= 0) {
    g.phase = 'won';
    g.since = 0;
    g.zones = [];
    g.stop = 0.25;
    g.shake = 1.4;
    burst(g, b.x, b.y, 120, 30, 0);
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

function hurtPlayer(g: Game, dmg: number, fromX: number, fromY: number) {
  const p = g.player;
  if (p.safe > 0 || g.phase !== 'fight') return false;
  p.hp = Math.max(0, p.hp - dmg);
  p.safe = HURT_SAFE;
  p.hurt = 0.35;
  g.stop = Math.max(g.stop, 0.08);
  g.shake = Math.max(g.shake, 0.9);
  g.texts.push({ x: p.x, y: p.y - 2, s: `-${dmg}`, t: 0, kind: 2 });
  // 맞은 반대쪽으로 밀려난다
  const d = Math.hypot(p.x - fromX, p.y - fromY) || 1;
  p.x += ((p.x - fromX) / d) * 2.5;
  p.y += ((p.y - fromY) / d) * 2.5;
  burst(g, p.x, p.y, 10, 12, 0);
  if (p.hp <= 0) {
    g.phase = 'lost';
    g.since = 0;
  }
  return true;
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

// 떠 있는 숫자와 불티, 그을음. 전투가 끝나도 흐른다.
function tickEffects(g: Game, dt: number) {
  const p = g.player;
  g.texts = g.texts.filter((f) => (f.t += dt) < (f.kind === 4 ? 2 : 0.9));
  g.sparks = g.sparks.filter((s) => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 1 - 3 * dt;
    s.vy *= 1 - 3 * dt;
    return (s.life -= dt) > 0;
  });
  g.scorch = g.scorch.filter((s) => (s.t += dt) < 14);
  g.boss.flash = Math.max(0, g.boss.flash - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.slashT += dt;
  p.spinT += dt;
}

function tickPlayer(g: Game, input: Input, dt: number) {
  const p = g.player;
  const b = g.boss;
  p.safe = Math.max(0, p.safe - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.slashCd = Math.max(0, p.slashCd - dt);
  p.waveCd = Math.max(0, p.waveCd - dt);
  p.spinCd = Math.max(0, p.spinCd - dt);
  p.potionCd = Math.max(0, p.potionCd - dt);
  p.mp = Math.min(MAX_MP, p.mp + MP_REGEN * dt);
  const len = Math.hypot(input.mx, input.my);
  p.moving = len > 0.15;
  const aim = input.aim ?? b;
  p.face = Math.atan2(aim.y - p.y, aim.x - p.x);
  if (p.dash > 0) {
    p.dash -= dt;
    p.x += p.dx * DASH.speed * dt;
    p.y += p.dy * DASH.speed * dt;
  } else {
    if (p.moving) {
      const k = Math.min(1, len);
      p.x += (input.mx / len) * k * SPEED * dt;
      p.y += (input.my / len) * k * SPEED * dt;
    }
    if (input.dash && p.dashCd <= 0) {
      // 움직이는 쪽으로 구르고, 서 있으면 보는 쪽으로 구른다
      p.dx = p.moving ? input.mx / len : Math.cos(p.face);
      p.dy = p.moving ? input.my / len : Math.sin(p.face);
      p.dash = DASH.time;
      p.dashCd = DASH.cd;
      p.safe = Math.max(p.safe, DASH.safe);
    }
  }
  if (input.attack && p.slashCd <= 0 && p.dash <= 0) {
    p.slashCd = SLASH.cd;
    p.slashT = 0;
    p.slashAng = p.face;
    // 보는 쪽으로 칼이 닿는 자리 셋 중 하나라도 용에 닿으면 맞는다
    for (const d of [1.5, 3.4, SLASH.range]) {
      const hx = p.x + Math.cos(p.face) * d;
      const hy = p.y + Math.sin(p.face) * d;
      if (reach(g, hx, hy) > 1.2) continue;
      hurtBoss(g, SLASH.dmg, hx, hy);
      break;
    }
  }
  if (input.wave && p.waveCd <= 0 && p.mp >= WAVE.mp) {
    p.waveCd = WAVE.cd;
    p.mp -= WAVE.mp;
    g.shots.push({ x: p.x, y: p.y, vx: Math.cos(p.face) * WAVE.speed, vy: Math.sin(p.face) * WAVE.speed, life: 1.1 });
  }
  if (input.spin && p.spinCd <= 0 && p.mp >= SPIN.mp) {
    p.spinCd = SPIN.cd;
    p.mp -= SPIN.mp;
    p.spinT = 0;
    p.safe = Math.max(p.safe, 0.25);
    const toBoss = Math.hypot(b.x - p.x, b.y - p.y) || 1;
    if (reach(g, p.x, p.y) < SPIN.r) hurtBoss(g, SPIN.dmg, p.x + ((b.x - p.x) / toBoss) * 4, p.y + ((b.y - p.y) / toBoss) * 4);
  }
  if (input.potion && p.potions > 0 && p.potionCd <= 0 && p.hp < MAX_HP) {
    p.potions--;
    p.potionCd = POTION.cd;
    p.hp = Math.min(MAX_HP, p.hp + POTION.heal);
    g.texts.push({ x: p.x, y: p.y - 2, s: `+${POTION.heal}`, t: 0, kind: 3 });
  }
  g.shots = g.shots.filter((s) => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (reach(g, s.x, s.y) < WAVE.r && b.hp > 0) {
      hurtBoss(g, WAVE.dmg, s.x, s.y);
      return false;
    }
    return s.life > 0 && Math.hypot(s.x, s.y) < ARENA + 4;
  });
  // 풀밭 밖으로는 나가지 못하고, 보스 몸은 뚫고 지나가지 못한다
  const out = Math.hypot(p.x, p.y);
  if (out > ARENA - 1) {
    p.x *= (ARENA - 1) / out;
    p.y *= (ARENA - 1) / out;
  }
  const gap = Math.hypot(p.x - b.x, p.y - b.y);
  if (gap < BOSS_R && b.charging <= 0) {
    p.x = b.x + ((p.x - b.x) / (gap || 1)) * BOSS_R;
    p.y = b.y + ((p.y - b.y) / (gap || 1)) * BOSS_R;
  }
}

function tickBoss(g: Game, dt: number) {
  const p = g.player;
  const b = g.boss;
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
      // 쉬는 동안에는 천천히 다가오며 플레이어 쪽으로 몸을 돌린다
      const want = Math.atan2(p.y - b.y, p.x - b.x);
      b.face += Math.max(-2.4 * dt, Math.min(2.4 * dt, turn(want, b.face)));
      if (Math.hypot(p.x - b.x, p.y - b.y) > 13) {
        b.x += Math.cos(want) * (b.enraged ? 5.5 : 4) * dt;
        b.y += Math.sin(want) * (b.enraged ? 5.5 : 4) * dt;
      }
    }
    b.wait -= dt;
    if (b.wait <= 0) act(g);
  }
  const far = Math.hypot(b.x, b.y);
  if (far > ARENA - BOSS_R) {
    b.x *= (ARENA - BOSS_R) / far;
    b.y *= (ARENA - BOSS_R) / far;
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
      if (zoneAt(z, p.x, p.y, 0.4) >= 0) hurtPlayer(g, z.dmg, from.x, from.y);
    }
    // 터진 뒤에도 잠깐 남아서 번쩍인다
    return z.t < z.warn + ZONE_FLASH;
  });
}

// 한 틱 진행한다. dt는 STEP으로 준다.
export function update(g: Game, input: Input, dt: number) {
  g.since += dt;
  g.shake = Math.max(0, g.shake - dt * 3.5);
  if (g.phase === 'title') {
    if (input.start || input.attack) {
      g.phase = 'fight';
      g.since = 0;
    }
    return;
  }
  if (g.phase !== 'fight' && g.since > RESTART_AFTER && (input.start || input.attack)) {
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
  // 플레이어의 공격으로 싸움이 끝났으면 용은 더 움직이지 않는다
  if (g.phase !== 'fight') return;
  tickBoss(g, dt);
  tickZones(g, dt);
}

// 흐른 시간(acc)을 STEP씩 나눠 진행하고 못 쓴 자투리를 돌려준다
export function advance(g: Game, input: () => Input, acc: number) {
  while (acc >= STEP) {
    update(g, input(), STEP);
    acc -= STEP;
  }
  return acc;
}
