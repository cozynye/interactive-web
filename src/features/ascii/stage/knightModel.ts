// 창을 세워 쥔 중세 기사의 입체 모형. 거리 함수로 빚은 덩어리를 한 번만 훑어서(레이마칭) 밝기와 재질을 구워 두고,
// 장면은 매 프레임 그 그림을 글자로 옮기기만 한다.

export const CLOTH = 0;
export const STEEL = 1;
export const BAND = 2;
// 투구의 눈구멍
export const SLIT = 3;
export const LEATHER = 4;
export const ROCK = 5;
export const MAIL = 6;

// 구운 그림이 담는 범위 (모형 단위: 땅이 0, 앉은 기사의 투구 꼭대기가 1.9쯤, 창끝이 3.35쯤)
export const X0 = -1.45;
export const X1 = 1.15;
export const Y0 = -0.04;
export const Y1 = 3.4;
// 다 구운 그림의 크기. 일어서는 중간 자세는 잠깐만 보여서 가로세로 절반으로 굽는다.
const BW = 220;
const BH = 182;

const ALBEDO = [0.7, 1, 0.9, 0.1, 0.36, 0.3, 0.5];

type V = [number, number, number];

const ell = (x: number, y: number, z: number, c: V, r: V) => (Math.hypot((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]) - 1) * Math.min(r[0], r[1], r[2]);

// 두 점을 잇는 막대. 굵기가 r0에서 r1로 바뀐다.
function rod(x: number, y: number, z: number, a: V, b: V, r0: number, r1 = r0) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const vz = b[2] - a[2];
  const h = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy + (z - a[2]) * vz) / (vx * vx + vy * vy + vz * vz)));
  return Math.hypot(x - a[0] - vx * h, y - a[1] - vy * h, z - a[2] - vz * h) - (r0 + (r1 - r0) * h);
}

const box = (x: number, y: number, z: number, c: V, b: V) => {
  const dx = Math.abs(x - c[0]) - b[0];
  const dy = Math.abs(y - c[1]) - b[1];
  const dz = Math.abs(z - c[2]) - b[2];
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0);
};

// 두 덩어리를 이음매 없이 잇는다
const melt = (a: number, b: number, k: number) => {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b + (a - b) * h - k * h * (1 - h);
};

// 창은 기사의 오른손(화면에서는 왼쪽)이 세워 쥐고, 자세가 바뀌어도 제자리에 꽂혀 있다
const LANCE: V = [-0.74, 0, 0.36];
// 윗몸이 도는 축(엉덩이). 윗몸의 덩어리는 앉은 자세의 좌표로 빚어 두고, 일어설 때는 이 점을 옮기고 앞으로 숙여서 통째로 움직인다.
const PIVOT: V = [0, 0.56, 0.06];

const mix = (a: V, b: V, k: number): V => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// 길이가 len인 뼈 둘로 a와 b를 이을 때 가운데 마디(무릎, 팔꿈치)의 자리. f 쪽으로 꺾인다.
function bend(a: V, b: V, len: number, f: V): V {
  const v: V = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const d2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2] || 1;
  const h = Math.sqrt(Math.max(0, len * len - d2 / 4));
  const k = (f[0] * v[0] + f[1] * v[1] + f[2] * v[2]) / d2;
  const p: V = [f[0] - v[0] * k, f[1] - v[1] * k, f[2] - v[2] * k];
  const pl = Math.hypot(p[0], p[1], p[2]) || 1;
  return [(a[0] + b[0]) / 2 + (p[0] / pl) * h, (a[1] + b[1]) / 2 + (p[1] / pl) * h, (a[2] + b[2]) / 2 + (p[2] / pl) * h];
}

// 지금 굽는 자세. pose는 0(앉음)에서 1(섬)까지다.
let pose = 0;
let DY = 0;
let DZ = 0;
let CA = 1;
let SA = 0;
let SH_R: V = [0, 0, 0];
let EL_R: V = [0, 0, 0];
let HAND_R: V = [0, 0, 0];
let SH_L: V = [0, 0, 0];
let EL_L: V = [0, 0, 0];
let HAND_L: V = [0, 0, 0];
let HIP_R: V = [0, 0, 0];
let HIP_L: V = [0, 0, 0];
let KNEE_R: V = [0, 0, 0];
let ANKLE_R: V = [0, 0, 0];
let TOE_R: V = [0, 0, 0];
let KNEE_L: V = [0, 0, 0];
let ANKLE_L: V = [0, 0, 0];
let TOE_L: V = [0, 0, 0];

// 윗몸 좌표의 점이 지금 자세에서 놓이는 자리
const lift = (p: V): V => {
  const y = p[1] - PIVOT[1];
  const z = p[2] - PIVOT[2];
  return [p[0], PIVOT[1] + DY + y * CA - z * SA, PIVOT[2] + DZ + z * CA + y * SA];
};

// 자세를 정한다. 일어설 때는 엉덩이가 발 위로 올라가며 윗몸을 앞으로 숙였다가 펴고, 오른손은 창대를 타고 올라가며, 무릎에 얹었던 왼손은 옆으로 내려간다.
function setPose(s: number) {
  pose = s;
  DY = 0.58 * s;
  DZ = 0.36 * s + 0.1 * Math.sin(Math.PI * s);
  const lean = 0.4 * Math.sin(Math.PI * s);
  CA = Math.cos(lean);
  SA = Math.sin(lean);
  SH_R = lift([-0.37, 1.27, 0.02]);
  SH_L = lift([0.37, 1.27, 0.02]);
  HIP_R = lift([-0.17, 0.56, 0.06]);
  HIP_L = lift([0.17, 0.56, 0.06]);
  ANKLE_R = mix([-0.4, 0.12, 0.66], [-0.22, 0.12, 0.5], s);
  ANKLE_L = mix([0.38, 0.12, 0.74], [0.2, 0.12, 0.44], s);
  TOE_R = [ANKLE_R[0] - 0.1 + 0.05 * s, 0.05, ANKLE_R[2] + 0.28];
  TOE_L = [ANKLE_L[0] + 0.07 - 0.03 * s, 0.05, ANKLE_L[2] + 0.29];
  KNEE_R = bend(HIP_R, ANKLE_R, 0.53, [-0.05, 1, 0.8]);
  KNEE_L = bend(HIP_L, ANKLE_L, 0.53, [0.05, 1, 0.8]);
  HAND_R = [LANCE[0] + 0.01, 1.37 + 0.25 * s, LANCE[2] - 0.01];
  HAND_L = mix([0.36, 0.79, 0.56], lift([0.5, 0.72, 0.12]), s);
  EL_R = bend(SH_R, HAND_R, 0.42, [-0.15, -1, 0]);
  EL_L = bend(SH_L, HAND_L, 0.42, mix([0.8, -0.4, -0.4], [0.6, -0.3, -0.8], s));
}

let mat = 0;

// 모형 좌표의 한 점에서 겉면까지의 거리. 가장 가까운 덩어리의 재질을 mat에 남긴다.
function model(x: number, y: number, z: number) {
  // 기사와 창에서 멀리 떨어진 점은 대강의 거리만 돌려준다
  const far = Math.hypot(x, y - 1.3, z) - 2;
  const bx = Math.abs(x - LANCE[0]);
  const bz = Math.abs(z - LANCE[2]);
  const pole = Math.max(Math.hypot(bx, bz) - 0.16, y - 3.38);
  if (far > 0.3 && pole > 0.3) return Math.min(far, pole);
  // 좌우가 같은 덩어리는 한쪽만 재서 쓴다
  const sx = Math.abs(x);
  // 윗몸 좌표 (앉은 자세 기준)
  const ly = PIVOT[1] + (y - PIVOT[1] - DY) * CA + (z - PIVOT[2] - DZ) * SA;
  const lz = PIVOT[2] + (z - PIVOT[2] - DZ) * CA - (y - PIVOT[1] - DY) * SA;

  // 망토: 등 뒤로 늘어진다. 앉아 있을 때는 바위를 덮고 바닥에 깔리고, 일어서면 종아리까지 내려온다.
  const pleat = 0.02 * Math.sin(x * 21 + Math.sin(ly * 3) * 1.4) * Math.min(1, Math.max(0, (1.3 - ly) * 1.2));
  const heap = 1 - 0.5 * pose;
  let d = melt(ell(x, ly, lz, [0.06, 0.95 - 0.28 * pose, -0.22], [0.42, 0.5 + 0.3 * pose, 0.1]), ell(x, y, z, [0.22, 0.3 * heap, -0.38], [0.72 * heap, 0.36 * heap, 0.3 * heap]), 0.14) + pleat;
  mat = CLOTH;
  const take = (v: number, m: number) => {
    if (v < d) {
      d = v;
      mat = m;
    }
  };

  // 겉옷: 사슬 옷 위에 걸친 소매 없는 천. 가슴에 붉은 십자가 있고, 허리띠 아래로 치마처럼 퍼져 무릎 사이로 내려온다.
  const fold = 0.006 * Math.sin(x * 40 + Math.sin(ly * 9));
  const coat = Math.min(ell(x, ly, lz, [0, 1.1, 0.03], [0.3, 0.27, 0.2]) + fold, ell(x, ly, lz, [0, 0.72, 0.04], [0.31, 0.2, 0.23]) + fold);
  const cross = lz > 0 && ((sx < 0.04 && ly > 0.93 && ly < 1.33) || (Math.abs(ly - 1.2) < 0.04 && sx < 0.14));
  take(coat, cross ? BAND : CLOTH);
  const lap = mix([0, 0.4, 0.34], [0, 0.3, 0.16], pose);
  take(ell(x, ly, lz, lap, [0.17 + 0.03 * pose, 0.36 + 0.04 * pose, 0.07]) + 0.012 * Math.sin(x * 34), CLOTH);
  take(ell(x, ly, lz, [0, 0.875, 0.03], [0.3, 0.035, 0.215]), LEATHER);
  take(box(x, ly, lz, [0, 0.875, 0.24], [0.04, 0.035, 0.012]) - 0.006, STEEL);

  // 쇠사슬 옷: 목에서 어깨로 드리운 두건 자락, 위팔, 엉덩이와 허벅지
  let mail = melt(rod(x, ly, lz, [0, 1.3, 0], [0, 1.46, 0], 0.15, 0.13), ell(x, ly, lz, [0, 1.4, 0.01], [0.24, 0.09, 0.2]), 0.04);
  mail = Math.min(mail, rod(x, y, z, SH_R, EL_R, 0.095), rod(x, y, z, SH_L, EL_L, 0.095));
  mail = Math.min(mail, ell(x, ly, lz, [0, 0.6, 0.04], [0.3, 0.14, 0.2]));
  mail = Math.min(mail, rod(x, y, z, HIP_R, KNEE_R, 0.15, 0.125), rod(x, y, z, HIP_L, KNEE_L, 0.15, 0.125));
  take(mail, MAIL);

  // 투구: 머리를 통째로 덮는 통투구. 위가 평평하고, 눈구멍이 가로로 길게 났으며, 눈구멍 위의 테와 얼굴 가운데의 세로 덧쇠가 십자를 이룬다.
  if (Math.hypot(x, ly - 1.65, lz) - 0.55 < d) {
    const front = lz > 0 ? 1 : 0;
    const brace = 0.016 * front * Math.max(Math.exp(-Math.pow(x / 0.03, 2)) * (ly < 1.86 ? 1 : 0), Math.exp(-Math.pow((ly - 1.755) / 0.022, 2)));
    const helm = Math.max(ell(x, ly, lz, [0, 1.62, 0], [0.215, 0.36, 0.225]), ly - 1.9, 1.38 - ly) - 0.012 - brace;
    const slit = front && Math.abs(ly - 1.7) < 0.028 && sx > 0.035 && sx < 0.17;
    take(slit ? helm + 0.02 : helm, slit ? SLIT : STEEL);
    // 정수리의 테와 숨구멍 줄
    take(Math.max(Math.hypot(Math.hypot(x, lz) - 0.19, ly - 1.9) - 0.02, 0), STEEL);
  }

  // 어깨 가리개 두 겹, 팔꿈치, 팔뚝, 손목이 벌어진 장갑
  take(ell(sx, ly, lz, [0.37, 1.34, 0.02], [0.2, 0.125, 0.2]), STEEL);
  take(ell(sx, ly, lz, [0.46, 1.24, 0.03], [0.15, 0.1, 0.18]), STEEL);
  take(Math.min(ell(x, y, z, EL_R, [0.11, 0.11, 0.11]), ell(x, y, z, EL_L, [0.11, 0.11, 0.11])), STEEL);
  take(Math.min(rod(x, y, z, EL_R, HAND_R, 0.085, 0.07), rod(x, y, z, EL_L, HAND_L, 0.085, 0.07)), STEEL);
  const cuff = (e: V, h: V) => rod(x, y, z, mix(e, h, 0.72), mix(e, h, 0.86), 0.1, 0.075);
  take(Math.min(cuff(EL_R, HAND_R), cuff(EL_L, HAND_L)), STEEL);
  // 창대를 감싸 쥔 손과 무릎에 얹은 손. 손가락 마디가 골로 보인다.
  const knuckle = (v: number, at: number) => v + 0.012 * Math.sin(at * 70);
  take(knuckle(ell(x, y, z, [HAND_R[0], HAND_R[1] + 0.02, HAND_R[2] + 0.02], [0.08, 0.1, 0.085]), y), STEEL);
  take(knuckle(ell(x, y, z, [HAND_L[0], HAND_L[1], HAND_L[2] + 0.04 * (1 - pose)], [0.1 - 0.03 * pose, 0.06 + 0.04 * pose, 0.12 - 0.04 * pose]), x), STEEL);

  // 허리에 찬 검: 칼집은 뒤로 비스듬히 내려가고 자루와 가로대가 앞으로 나와 있다
  take(rod(x, ly, lz, [0.31, 0.82, 0.1], [0.56, 0.3, -0.3], 0.036, 0.028), LEATHER);
  take(rod(x, ly, lz, [0.31, 0.82, 0.1], [0.24, 0.98, 0.2], 0.022), LEATHER);
  take(Math.min(ell(x, ly, lz, [0.23, 1, 0.21], [0.035, 0.035, 0.035]), box(x, ly, lz, [0.3, 0.84, 0.11], [0.02, 0.02, 0.09]) - 0.008), STEEL);

  // 다리: 사슬 위에 덧댄 허벅지 판과 가죽끈, 가운데가 선 무릎 가리개와 옆날개, 종아리가 불룩한 정강이 판, 마디진 쇠신과 박차
  for (const [hip, knee, ankle, toe, side] of y - PIVOT[1] - DY - 0.3 > d
    ? []
    : ([
        [HIP_R, KNEE_R, ANKLE_R, TOE_R, -1],
        [HIP_L, KNEE_L, ANKLE_L, TOE_L, 1],
      ] as [V, V, V, V, number][])) {
    // 무릎이 꺾여 나온 쪽이 다리의 앞이다
    const fx = knee[0] - (hip[0] + ankle[0]) / 2;
    const fy = knee[1] - (hip[1] + ankle[1]) / 2;
    const fz = knee[2] - (hip[2] + ankle[2]) / 2 + 0.2;
    const fl = Math.hypot(fx, fy, fz);
    const nx = (fx / fl) * 0.04;
    const ny = (fy / fl) * 0.04;
    const nz = (fz / fl) * 0.04;
    // 허벅지 판은 앞쪽 반만 덮어서 뒤와 안쪽으로는 사슬이 보인다. 판은 두 장이 겹쳐 있고 가운데를 가죽끈이 감는다.
    take(rod(x - nx, y - ny, z - nz, mix(hip, knee, 0.34), mix(hip, knee, 0.62), 0.135, 0.13), STEEL);
    take(rod(x - nx * 0.8, y - ny * 0.8, z - nz * 0.8, mix(hip, knee, 0.6), mix(hip, knee, 0.9), 0.142, 0.125), STEEL);
    take(rod(x, y, z, mix(hip, knee, 0.47), mix(hip, knee, 0.52), 0.162), LEATHER);
    // 무릎: 둥근 덮개의 가운데에 능선이 서고, 위아래로 좁은 판이 한 장씩 물리며, 바깥쪽에 부채꼴 날개가 달렸다
    const crest = 0.016 * Math.exp(-Math.pow((x - knee[0]) / 0.035, 2));
    take(ell(x, y, z, [knee[0] + nx * 0.5, knee[1] + ny * 0.5, knee[2] + nz * 0.5], [0.135, 0.135, 0.135]) - crest, STEEL);
    take(ell(x, y, z, [knee[0] + side * 0.135, knee[1], knee[2] - 0.02], [0.03, 0.12, 0.11]), STEEL);
    take(ell(x, y, z, mix(knee, hip, 0.22), [0.14, 0.06, 0.14]), STEEL);
    take(ell(x, y, z, [knee[0], knee[1] - 0.12, knee[2] + 0.04], [0.12, 0.05, 0.11]), STEEL);
    const top: V = [knee[0], knee[1] - 0.14, knee[2]];
    const shin = rod(x, y, z, top, ankle, 0.1, 0.07);
    // 종아리는 뒤로 불룩하고, 정강이 앞쪽에는 세로로 날이 서 있다
    const calf = ell(x, y, z, [top[0] + (ankle[0] - top[0]) * 0.3, top[1] + (ankle[1] - top[1]) * 0.3, top[2] + (ankle[2] - top[2]) * 0.3 - 0.045], [0.095, 0.15, 0.1]);
    const t = Math.max(0, Math.min(1, (top[1] - y) / (top[1] - ankle[1])));
    const cx = top[0] + (ankle[0] - top[0]) * t;
    const cz = top[2] + (ankle[2] - top[2]) * t;
    take(melt(shin, calf, 0.04) - 0.018 * Math.exp(-Math.pow((x - cx) / 0.03, 2)) * (z > cz ? 1 : 0), STEEL);
    // 정강이 판을 조이는 가죽끈 둘과 발목 위의 테
    take(Math.min(rod(x, y, z, mix(top, ankle, 0.2), mix(top, ankle, 0.26), 0.116), rod(x, y, z, mix(top, ankle, 0.62), mix(top, ankle, 0.68), 0.094)), LEATHER);
    take(ell(x, y, z, [ankle[0], ankle[1] + 0.07, ankle[2]], [0.095, 0.03, 0.095]), STEEL);
    take(ell(x, y, z, [ankle[0], 0.15, ankle[2]], [0.1, 0.07, 0.1]), STEEL);
    // 쇠신: 발등을 덮은 판이 마디마디 겹치고 끝이 뾰족하다. 뒤꿈치에는 박차가 달렸다.
    const along = Math.max(0, Math.min(1, (z - ankle[2]) / (toe[2] - ankle[2])));
    take(rod(x, y, z, [ankle[0], 0.09, ankle[2]], toe, 0.095, 0.04) + 0.009 * Math.sin(along * 22), STEEL);
    take(rod(x, y, z, toe, [toe[0] + side * 0.02, 0.04, toe[2] + 0.1], 0.04, 0.008), STEEL);
    take(rod(x, y, z, [ankle[0], 0.11, ankle[2] - 0.08], [ankle[0], 0.14, ankle[2] - 0.2], 0.02, 0.012), STEEL);
    take(ell(x, y, z, [ankle[0], 0.145, ankle[2] - 0.22], [0.012, 0.04, 0.04]), STEEL);
  }

  // 창: 땅에 꽂아 세운 긴 나무 자루, 손 위의 깔때기 모양 손막이, 자루 끝의 쇠 촉
  if (pole < d) {
    take(Math.max(Math.hypot(bx, bz) - 0.026, y - 3.06, -y - 0.05), LEATHER);
    take(rod(x, y, z, [LANCE[0], 1.2, LANCE[2]], [LANCE[0], 1.72, LANCE[2]], 0.034) + 0.005 * Math.sin(y * 110), LEATHER);
    take(rod(x, y, z, [LANCE[0], 1.78, LANCE[2]], [LANCE[0], 1.98, LANCE[2]], 0.13, 0.035), STEEL);
    take(ell(x, y, z, [LANCE[0], 3.05, LANCE[2]], [0.045, 0.05, 0.045]), STEEL);
    take(rod(x, y, z, [LANCE[0], 3.06, LANCE[2]], [LANCE[0], 3.34, LANCE[2]], 0.045, 0.004), STEEL);
  }

  // 바위에 기대 놓은 방패: 위가 둥글고 아래가 뾰족한 연 모양이고, 쇠테를 두르고 붉은 십자를 그렸다
  const tz = z + (y - 0.45) * 0.4;
  const tall = y > 0.5 ? 0.36 : 0.5;
  const rim = Math.hypot((x - 0.8) / (0.27 * (y > 0.5 ? 1 : 1 - (0.5 - y) * 1.3)), (y - 0.5) / tall);
  if (Math.abs(tz - 0.36) < 0.4 && rim < 1.4) {
    const plate = Math.max((rim - 1) * 0.24, Math.abs(tz - 0.36) - 0.022 + 0.03 * rim * rim);
    const sign = tz > 0.36 && rim < 0.86 && (Math.abs(x - 0.8) < 0.04 || Math.abs(y - 0.58) < 0.045);
    take(plate, sign ? BAND : rim > 0.88 ? STEEL : CLOTH);
    take(ell(x, y, tz, [0.8, 0.58, 0.39], [0.05, 0.05, 0.035]), STEEL);
  }

  // 걸터앉은 바위: 덩어리 셋을 겹치고 겉을 울퉁불퉁하게 깎는다
  const rough = 0.025 * Math.sin(x * 9 + 1) * Math.sin(y * 13) * Math.sin(z * 8 + 2);
  take(Math.min(ell(x, y, z, [0, 0.2, -0.1], [0.5, 0.3, 0.4]), ell(x, y, z, [0.42, 0.1, 0.1], [0.3, 0.17, 0.28]), ell(x, y, z, [-0.4, 0.07, -0.25], [0.26, 0.13, 0.22])) + rough, ROCK);
  return d;
}

// 보는 자리: 조금 위에서 내려다보고, 기사는 화면 왼쪽으로 몸을 틀고 있다
const YAW = 0.5;
const PITCH = 0.14;
const CY = Math.cos(YAW);
const SY = Math.sin(YAW);
const CP = Math.cos(PITCH);
const SP = Math.sin(PITCH);

function scene(x: number, y: number, z: number) {
  const y1 = (y - 1) * CP + z * SP + 1;
  const z1 = -(y - 1) * SP + z * CP;
  return model(x * CY + z1 * SY, y1, -x * SY + z1 * CY);
}

// 빛은 왼쪽 위 앞에서 온다
const L: V = [-0.46, 0.44, 0.77];

export interface Baked {
  // 그림의 크기
  w: number;
  h: number;
  lum: Float32Array;
  // 재질 번호. 빈 곳은 255
  mat: Uint8Array;
  // 화면에서 본 깊이. 클수록 앞이다. 장면이 덩어리의 가장자리를 찾는 데 쓴다.
  far: Float32Array;
  // 위에서부터 다 구워진 줄 수
  rows: number;
}

// 모형의 한 점이 화면에서 놓이는 자리 (x, y)
const project = (p: V): [number, number] => {
  const z1 = p[0] * SY + p[2] * CY;
  return [p[0] * CY - p[2] * SY, 1 + (p[1] - 1) * CP - z1 * SP];
};
// 창대가 화면에서 놓이는 x와, 깃발을 매단 자리, 창끝
export const LANCE_X = project(LANCE)[0];
export const PENNON = project([LANCE[0], 2.96, LANCE[2]]);
export const TIP = project([LANCE[0], 3.3, LANCE[2]]);

// 구워 두는 자세: 앉음(0)에서 섬(6)까지 일곱 장. 가운데 다섯 장은 일어서는 동안 잠깐씩만 보인다.
export const POSES = 7;
const cache: (Baked | null)[] = Array.from({ length: POSES }, () => null);

// 굽는 데 1초 넘게 걸려서 한 번에 다 하면 화면이 멈춘다. budget(밀리초)만큼만 위에서부터 굽고 돌아오며, 다 구워질 때까지 부를 때마다 이어서 굽는다.
// budget을 주지 않으면 끝까지 굽는다.
export function bakeKnight(index: number, budget = Infinity): Baked {
  const half = index > 0 && index < POSES - 1 ? 2 : 1;
  const w = Math.round(BW / half);
  const h = Math.round(BH / half);
  const baked = (cache[index] ??= { w, h, lum: new Float32Array(w * h), mat: new Uint8Array(w * h).fill(255), far: new Float32Array(w * h).fill(-9), rows: 0 });
  if (baked.rows >= h) return baked;
  setPose(index / (POSES - 1));
  const { lum, far, mat: mats } = baked;
  const until = performance.now() + budget;
  for (let j = baked.rows; j < h && performance.now() < until; baked.rows = ++j)
    for (let i = 0; i < w; i++) {
      const x = X0 + ((i + 0.5) / w) * (X1 - X0);
      const y = Y1 - ((j + 0.5) / h) * (Y1 - Y0);
      let z = 2.4;
      let hit = false;
      for (let k = 0; k < 70 && z > -1.8; k++) {
        const d = scene(x, y, z);
        if (d < 0.003) {
          hit = true;
          break;
        }
        z -= d * 0.8;
      }
      if (!hit) continue;
      const m = mat;
      const e = 0.004;
      let nx = scene(x + e, y, z) - scene(x - e, y, z);
      let ny = scene(x, y + e, z) - scene(x, y - e, z);
      let nz = scene(x, y, z + e) - scene(x, y, z - e);
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      // 그림자: 빛 쪽으로 걸어가며 가려진 정도를 본다
      let shade = 1;
      for (let s = 0.03; s < 1.4;) {
        const d = scene(x + L[0] * s, y + L[1] * s, z + L[2] * s);
        if (d < 0.002) {
          shade = 0;
          break;
        }
        shade = Math.min(shade, (10 * d) / s);
        s += Math.max(0.02, d);
      }
      // 틈새는 어둡다
      let ao = 0;
      for (let k = 1; k <= 4; k++) ao += Math.max(0, k * 0.035 - scene(x + nx * k * 0.035, y + ny * k * 0.035, z + nz * k * 0.035));
      const open = Math.max(0, 1 - ao * 5);
      // 그림자 안도 완전히 꺼지지는 않는다
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) * (0.28 + 0.72 * shade);
      // 반대쪽에서 살짝 받치는 빛과 가장자리의 빛
      const fill = Math.max(0, nx * 0.7 + ny * 0.2 + nz * 0.4) * 0.16;
      const rim = Math.pow(1 - Math.max(0, nz), 3) * 0.2 * Math.max(0, ny + 0.4);
      const hx = L[0];
      const hy = L[1];
      const hz = L[2] + 1;
      const spec = m === STEEL ? Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / Math.hypot(hx, hy, hz)), 26) * 0.7 * shade : 0;
      mats[j * w + i] = m;
      far[j * w + i] = z;
      lum[j * w + i] = Math.pow(Math.min(1, ALBEDO[m] * (0.13 * open + 0.9 * diff + fill * open + rim) + spec), 0.85);
    }
  return baked;
}
