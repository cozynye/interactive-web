// 앉은 기사의 입체 모형. 거리 함수로 빚은 덩어리를 한 번만 훑어서(레이마칭) 밝기와 재질을 구워 두고,
// 장면은 매 프레임 그 그림을 글자로 옮기기만 한다.

export const CLOTH = 0;
export const STEEL = 1;
export const BAND = 2;
export const FACE = 3;
export const LEATHER = 4;
export const ROCK = 5;
export const MAIL = 6;

// 구운 그림이 담는 범위 (모형 단위: 땅이 0, 모자 꼭대기가 2쯤)
export const X0 = -1.3;
export const X1 = 1.15;
export const Y0 = -0.04;
export const Y1 = 2.08;
export const BW = 208;
export const BH = 112;

const ALBEDO = [0.7, 1, 0.9, 0.62, 0.36, 0.3, 0.5];

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

// 자세: 어깨, 팔꿈치, 손, 엉덩이, 무릎, 발목, 발끝 (기사의 오른손이 검을 세워 쥔다. 화면에서는 왼쪽이다.)
const SWORD: V = [-0.74, 0, 0.36];
const SH_R: V = [-0.37, 1.27, 0.02];
const EL_R: V = [-0.6, 0.98, 0.18];
const HAND_R: V = [-0.73, 1.37, 0.35];
const SH_L: V = [0.37, 1.27, 0.02];
const EL_L: V = [0.54, 0.95, 0.2];
const HAND_L: V = [0.36, 0.79, 0.56];
const HIP_R: V = [-0.17, 0.56, 0.06];
const HIP_L: V = [0.17, 0.56, 0.06];
const KNEE_R: V = [-0.3, 0.62, 0.58];
const ANKLE_R: V = [-0.4, 0.12, 0.66];
const TOE_R: V = [-0.5, 0.05, 0.94];
const KNEE_L: V = [0.32, 0.64, 0.6];
const ANKLE_L: V = [0.38, 0.12, 0.74];
const TOE_L: V = [0.45, 0.05, 1.03];

let mat = 0;

// 모형 좌표의 한 점에서 겉면까지의 거리. 가장 가까운 덩어리의 재질을 mat에 남긴다.
function model(x: number, y: number, z: number) {
  // 화면 밖에서 멀리 떨어진 점은 대강의 거리만 돌려준다
  const far = Math.hypot(x, y - 1, z) - 1.75;
  if (far > 0.3) return far;
  // 좌우가 같은 덩어리는 한쪽만 재서 쓴다
  const sx = Math.abs(x);

  // 천: 등 뒤로 늘어져 바위를 덮고 바닥에 깔리는 망토와, 허리에서 무릎 사이로 내려오는 앞자락
  const pleat = 0.02 * Math.sin(x * 21 + Math.sin(y * 3) * 1.4) * Math.min(1, Math.max(0, (1.3 - y) * 1.2));
  let cloth = melt(ell(x, y, z, [0.06, 0.95, -0.22], [0.42, 0.5, 0.1]), ell(x, y, z, [0.22, 0.3, -0.38], [0.72, 0.36, 0.3]), 0.14) + pleat;
  const lap = 0.012 * Math.sin(x * 34);
  cloth = Math.min(cloth, ell(x, y, z, [0, 0.4, 0.34], [0.17, 0.36, 0.07]) + lap);
  let d = cloth;
  mat = CLOTH;
  const take = (v: number, m: number) => {
    if (v < d) {
      d = v;
      mat = m;
    }
  };

  // 쇠사슬 옷: 목과 머리를 감싼 두건, 위팔, 허벅지 안쪽
  let mail = ell(x, y, z, [0, 1.6, -0.02], [0.19, 0.21, 0.19]);
  mail = Math.min(mail, rod(x, y, z, [0, 1.3, 0], [0, 1.46, 0], 0.15, 0.13));
  mail = Math.min(mail, rod(x, y, z, SH_R, EL_R, 0.095), rod(x, y, z, SH_L, EL_L, 0.095));
  mail = Math.min(mail, ell(x, y, z, [0, 0.6, 0.04], [0.3, 0.14, 0.2]));
  take(mail, MAIL);

  // 머리 둘레가 아니면 투구는 재지 않는다
  const head = Math.hypot(x, y - 1.8, z) - 0.5 < d;
  // 투구: 챙이 넓고 끝이 조금 처진 쇠모자. 정수리에 앞뒤로 능선이 있다.
  const hy = y + 0.12 * z + 0.25 * (x * x + z * z);
  if (head) take(ell(x, hy, z, [0, 1.8, 0.01], [0.39, 0.028, 0.39]), STEEL);
  if (head) take(ell(x, y + 0.12 * z, z, [0, 1.86, 0], [0.225, 0.17, 0.225]), STEEL);
  if (head) take(ell(x, y + 0.12 * z, z, [0, 1.9, 0], [0.028, 0.16, 0.22]), STEEL);
  if (head) take(Math.hypot(Math.hypot(x, z) - 0.225, y + 0.12 * z - 1.8) - 0.022, STEEL);

  // 가슴판: 가운데가 솟고 허리에서 잘록하다. 아래로 허리 가리개 세 겹이 이어진다.
  const ridge = 0.03 * Math.exp(-x * x * 70) * Math.max(0, z);
  take(ell(x, y, z, [0, 1.1, 0.03], [0.3, 0.25, 0.2]) - ridge, STEEL);
  take(ell(x, y, z, [0, 1.36, 0.01], [0.2, 0.06, 0.18]), STEEL);
  for (let k = 0; k < 3; k++) take(ell(x, y, z, [0, 0.8 - k * 0.075, 0.03], [0.29 + k * 0.022, 0.05, 0.215 + k * 0.02]), STEEL);
  take(ell(x, y, z, [0, 0.875, 0.03], [0.285, 0.032, 0.21]), LEATHER);
  take(box(x, y, z, [0, 0.875, 0.235], [0.04, 0.035, 0.012]) - 0.006, STEEL);

  // 어깨 가리개 세 겹, 팔꿈치, 팔뚝, 손목이 벌어진 장갑
  take(ell(sx, y, z, [0.37, 1.34, 0.02], [0.2, 0.125, 0.2]), STEEL);
  take(ell(sx, y, z, [0.45, 1.25, 0.03], [0.155, 0.1, 0.18]), STEEL);
  take(ell(sx, y, z, [0.5, 1.16, 0.04], [0.125, 0.09, 0.155]), STEEL);
  take(Math.min(ell(x, y, z, EL_R, [0.11, 0.11, 0.11]), ell(x, y, z, EL_L, [0.11, 0.11, 0.11])), STEEL);
  take(Math.min(rod(x, y, z, EL_R, HAND_R, 0.085, 0.07), rod(x, y, z, EL_L, HAND_L, 0.085, 0.07)), STEEL);
  const cuff = (e: V, h: V) => {
    const m: V = [e[0] + (h[0] - e[0]) * 0.72, e[1] + (h[1] - e[1]) * 0.72, e[2] + (h[2] - e[2]) * 0.72];
    return rod(x, y, z, m, [e[0] + (h[0] - e[0]) * 0.86, e[1] + (h[1] - e[1]) * 0.86, e[2] + (h[2] - e[2]) * 0.86], 0.1, 0.075);
  };
  take(Math.min(cuff(EL_R, HAND_R), cuff(EL_L, HAND_L)), STEEL);
  // 자루를 감싸 쥔 손과 무릎에 얹은 손. 손가락 마디가 골로 보인다.
  const knuckle = (v: number, at: number) => v + 0.012 * Math.sin(at * 70);
  take(knuckle(ell(x, y, z, [HAND_R[0] + 0.01, HAND_R[1] + 0.02, HAND_R[2] + 0.02], [0.08, 0.1, 0.085]), y), STEEL);
  take(knuckle(ell(x, y, z, [HAND_L[0], HAND_L[1], HAND_L[2] + 0.04], [0.1, 0.06, 0.12]), x), STEEL);

  // 다리: 허벅지 판, 날개 달린 무릎 가리개, 가운데가 선 정강이 판, 끝이 뾰족한 쇠신
  take(Math.min(rod(x, y, z, HIP_R, KNEE_R, 0.15, 0.125), rod(x, y, z, HIP_L, KNEE_L, 0.15, 0.125)), STEEL);
  for (const [knee, ankle, toe, side] of y - 0.82 > d
    ? []
    : ([
        [KNEE_R, ANKLE_R, TOE_R, -1],
        [KNEE_L, ANKLE_L, TOE_L, 1],
      ] as [V, V, V, number][])) {
    take(ell(x, y, z, [knee[0], knee[1], knee[2] + 0.02], [0.135, 0.135, 0.135]), STEEL);
    take(ell(x, y, z, [knee[0] + side * 0.13, knee[1], knee[2] - 0.02], [0.03, 0.11, 0.1]), STEEL);
    take(ell(x, y, z, [knee[0], knee[1] - 0.12, knee[2] + 0.04], [0.12, 0.05, 0.11]), STEEL);
    const shin = rod(x, y, z, [knee[0], knee[1] - 0.14, knee[2]], ankle, 0.105, 0.075);
    // 정강이 앞쪽에 세로로 선 날
    const t = Math.max(0, Math.min(1, (knee[1] - 0.14 - y) / (knee[1] - 0.14 - ankle[1])));
    const cx = knee[0] + (ankle[0] - knee[0]) * t;
    take(shin - 0.018 * Math.exp(-Math.pow((x - cx) / 0.03, 2)) * (z > knee[2] ? 1 : 0), STEEL);
    take(rod(x, y, z, [ankle[0], 0.09, ankle[2]], toe, 0.095, 0.045), STEEL);
    take(ell(x, y, z, [ankle[0], 0.15, ankle[2]], [0.1, 0.07, 0.1]), STEEL);
  }

  // 검: 끝으로 갈수록 좁아지는 날, 끝이 굵은 가로대, 감은 자루, 둥근 자루 끝
  const bx = Math.abs(x - SWORD[0]);
  const near = Math.hypot(bx, z - SWORD[2]) - 0.27 < d;
  if (near) {
    const bz = Math.abs(z - SWORD[2]);
    const wide = 0.05 - 0.018 * Math.max(0, (0.5 - y) / 0.5);
    take(Math.max(bx - wide, bz - 0.012 + (bx / wide) * 0.008, y - 1.26, -y - 0.05), STEEL);
    take(box(x, y, z, [SWORD[0], 1.265, SWORD[2]], [0.19, 0.022, 0.028]) - 0.01, STEEL);
    take(Math.min(ell(x, y, z, [SWORD[0] - 0.2, 1.265, SWORD[2]], [0.042, 0.042, 0.042]), ell(x, y, z, [SWORD[0] + 0.2, 1.265, SWORD[2]], [0.042, 0.042, 0.042])), STEEL);
    take(ell(x, y, z, [SWORD[0], 1.6, SWORD[2]], [0.06, 0.06, 0.04]), STEEL);
    take(rod(x, y, z, [SWORD[0], 1.28, SWORD[2]], [SWORD[0], 1.56, SWORD[2]], 0.028) + 0.006 * Math.sin(y * 110), LEATHER);
  }

  // 얼굴: 두건 사이로 드러난 코와 입, 턱
  take(ell(x, y, z, [0, 1.57, 0.07], [0.135, 0.17, 0.15]), FACE);
  take(ell(x, y, z, [0, 1.55, 0.21], [0.028, 0.05, 0.04]), FACE);
  // 눈을 가린 띠
  take(Math.max(Math.abs(Math.hypot(x, z + 0.02) - 0.2) - 0.022, Math.abs(y - 1.64) - 0.055) - 0.008, BAND);

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
  lum: Float32Array;
  // 재질 번호. 빈 곳은 255
  mat: Uint8Array;
  // 화면에서 본 깊이. 클수록 앞이다. 장면이 덩어리의 가장자리를 찾는 데 쓴다.
  far: Float32Array;
  // 위에서부터 다 구워진 줄 수
  rows: number;
}

// 검날의 가운데가 화면에서 놓이는 x
export const BLADE_X = SWORD[0] * CY - SWORD[2] * SY;

let cache: Baked | null = null;

// 굽는 데 1초 넘게 걸려서 한 번에 다 하면 화면이 멈춘다. budget(밀리초)만큼만 위에서부터 굽고 돌아오며, 다 구워질 때까지 부를 때마다 이어서 굽는다.
// budget을 주지 않으면 끝까지 굽는다.
export function bakeKnight(budget = Infinity): Baked {
  cache ??= { lum: new Float32Array(BW * BH), mat: new Uint8Array(BW * BH).fill(255), far: new Float32Array(BW * BH).fill(-9), rows: 0 };
  const { lum, far, mat: mats } = cache;
  const until = performance.now() + budget;
  for (let j = cache.rows; j < BH && performance.now() < until; cache.rows = ++j)
    for (let i = 0; i < BW; i++) {
      const x = X0 + ((i + 0.5) / BW) * (X1 - X0);
      const y = Y1 - ((j + 0.5) / BH) * (Y1 - Y0);
      let z = 2.2;
      let hit = false;
      for (let k = 0; k < 70 && z > -1.6; k++) {
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
      mats[j * BW + i] = m;
      far[j * BW + i] = z;
      lum[j * BW + i] = Math.pow(Math.min(1, ALBEDO[m] * (0.13 * open + 0.9 * diff + fill * open + rim) + spec), 0.85);
    }
  return cache;
}
