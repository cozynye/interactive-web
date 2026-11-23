// 앉은 기사의 입체 모형. 거리 함수로 빚은 덩어리를 한 번만 훑어서(레이마칭) 밝기와 재질을 구워 두고,
// 장면은 매 프레임 그 그림을 글자로 옮기기만 한다.

export const CLOTH = 0;
export const STEEL = 1;
export const BAND = 2;
export const FACE = 3;
export const LEATHER = 4;
export const ROCK = 5;

// 구운 그림이 담는 범위 (모형 단위: 땅이 0, 모자 꼭대기가 2쯤)
export const X0 = -1.3;
export const X1 = 1.15;
export const Y0 = -0.04;
export const Y1 = 2.08;
export const BW = 208;
export const BH = 112;

const ALBEDO = [0.74, 1, 0.9, 0.12, 0.45, 0.34];

type V = [number, number, number];

const ell = (x: number, y: number, z: number, c: V, r: V) =>
  (Math.hypot((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]) - 1) * Math.min(r[0], r[1], r[2]);

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

// 자세: 어깨, 팔꿈치, 손, 무릎, 발목, 발끝 (기사의 오른손이 검을 세워 쥔다. 화면에서는 왼쪽이다.)
const SWORD: V = [-0.74, 0, 0.36];
const SH_R: V = [-0.36, 1.28, 0.02];
const EL_R: V = [-0.58, 0.98, 0.2];
const HAND_R: V = [-0.73, 1.36, 0.35];
const SH_L: V = [0.36, 1.28, 0.02];
const EL_L: V = [0.52, 0.94, 0.26];
const HAND_L: V = [0.34, 0.76, 0.6];
const KNEE_R: V = [-0.3, 0.62, 0.56];
const ANKLE_R: V = [-0.4, 0.13, 0.64];
const KNEE_L: V = [0.32, 0.66, 0.6];
const ANKLE_L: V = [0.38, 0.13, 0.74];

let mat = 0;

// 모형 좌표의 한 점에서 겉면까지의 거리. 가장 가까운 덩어리의 재질을 mat에 남긴다.
function model(x: number, y: number, z: number) {
  // 천: 몸통과 바닥까지 늘어진 자락. 둘레를 따라 주름을 넣는다.
  const fold = 0.016 * Math.sin(Math.atan2(z, x) * 9 + y * 5) * Math.min(1, Math.max(0, (1.25 - y) * 1.6));
  let cloth = melt(rod(x, y, z, [0, 0.5, 0], [0, 1.3, 0], 0.42, 0.3), rod(x, y, z, [0, 0.1, -0.14], [0, 0.78, -0.05], 0.64, 0.4), 0.1);
  cloth = melt(cloth, ell(x, y, z, [0, 1.43, -0.02], [0.28, 0.14, 0.26]), 0.06) + fold;
  cloth = melt(cloth, rod(x, y, z, SH_R, EL_R, 0.115), 0.04);
  cloth = melt(cloth, rod(x, y, z, SH_L, EL_L, 0.115), 0.04);
  cloth = melt(cloth, rod(x, y, z, [-0.2, 0.52, 0.1], KNEE_R, 0.16, 0.14), 0.07);
  cloth = melt(cloth, rod(x, y, z, [0.2, 0.52, 0.1], KNEE_L, 0.16, 0.14), 0.07);
  let d = cloth;
  mat = CLOTH;
  const take = (v: number, m: number) => {
    if (v < d) {
      d = v;
      mat = m;
    }
  };

  // 강철: 챙 넓은 투구, 어깨, 팔뚝과 손, 무릎과 정강이
  const hy = y + 0.1 * z;
  take(Math.min(ell(x, hy, z, [0, 1.75, 0.02], [0.37, 0.035, 0.37]), ell(x, hy, z, [0, 1.84, 0], [0.22, 0.17, 0.22])), STEEL);
  take(Math.min(ell(x, y, z, [-0.37, 1.33, 0.03], [0.19, 0.13, 0.2]), ell(x, y, z, [0.37, 1.33, 0.03], [0.19, 0.13, 0.2])), STEEL);
  take(Math.min(rod(x, y, z, EL_R, HAND_R, 0.09, 0.075), rod(x, y, z, EL_L, HAND_L, 0.09, 0.075)), STEEL);
  take(Math.min(ell(x, y, z, HAND_R, [0.085, 0.09, 0.085]), ell(x, y, z, HAND_L, [0.1, 0.07, 0.1])), STEEL);
  take(Math.min(rod(x, y, z, KNEE_R, ANKLE_R, 0.115, 0.085), rod(x, y, z, KNEE_L, ANKLE_L, 0.115, 0.085)), STEEL);
  take(Math.min(ell(x, y, z, KNEE_R, [0.13, 0.13, 0.13]), ell(x, y, z, KNEE_L, [0.13, 0.13, 0.13])), STEEL);
  // 검: 날, 가로대, 자루 끝
  take(box(x, y, z, [SWORD[0], 0.62, SWORD[2]], [0.03, 0.63, 0.009]), STEEL);
  take(box(x, y, z, [SWORD[0], 1.26, SWORD[2]], [0.17, 0.022, 0.03]) - 0.008, STEEL);
  take(ell(x, y, z, [SWORD[0], 1.56, SWORD[2]], [0.05, 0.05, 0.05]), STEEL);

  take(rod(x, y, z, [SWORD[0], 1.27, SWORD[2]], [SWORD[0], 1.52, SWORD[2]], 0.028), LEATHER);
  take(Math.min(rod(x, y, z, [ANKLE_R[0], 0.08, ANKLE_R[2]], [-0.5, 0.06, 0.9], 0.095, 0.08), rod(x, y, z, [ANKLE_L[0], 0.08, ANKLE_L[2]], [0.45, 0.06, 1.02], 0.1, 0.085)), LEATHER);
  take(ell(x, y, z, [0, 1.6, 0.03], [0.165, 0.18, 0.165]), FACE);
  // 눈을 가린 띠
  take(Math.hypot(Math.hypot(x, z - 0.03) - 0.165, y - 1.6) - 0.06, BAND);
  take(ell(x, y, z, [0, 0.2, -0.12], [0.52, 0.26, 0.44]), ROCK);
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
}

let cache: Baked | null = null;

export function bakeKnight(): Baked {
  if (cache) return cache;
  const lum = new Float32Array(BW * BH);
  const far = new Float32Array(BW * BH).fill(-9);
  const mats = new Uint8Array(BW * BH).fill(255);
  for (let j = 0; j < BH; j++)
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
      for (let s = 0.03; s < 1.4; ) {
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
  // 앞뒤로 겹친 덩어리 사이에는 먹선을 넣는다 (팔과 몸통, 무릎과 옷자락이 갈라져 보인다)
  for (let j = 1; j < BH - 1; j++)
    for (let i = 2; i < BW - 2; i++) {
      const k = j * BW + i;
      if (mats[k] === 255) continue;
      const front = Math.max(far[k - 2], far[k + 2], far[k - BW], far[k + BW]);
      if (front - far[k] > 0.05) lum[k] *= 0.3;
    }
  cache = { lum, mat: mats };
  return cache;
}
