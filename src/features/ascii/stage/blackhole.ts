import { code, Grid, hash, poolChar, rng, Scene, smooth } from './grid';

const TAU = Math.PI * 2;
// 그림자 반지름 (화면 높이 = 1)
const R0 = 0.11;
// 원반이 오른쪽 아래로 기운 각도
const TILT = 0.3;
const R_IN = 1.55 * R0;
const R_OUT = 5.4 * R0;
// 온도에 따른 색: 검붉은색 → 빨강 → 주황 → 호박색 → 흰 금색
const HEAT = [
  [190, 38, 12],
  [242, 78, 20],
  [255, 124, 34],
  [255, 172, 78],
  [255, 222, 168],
];
const STAR = [214, 224, 255];
// 처음 한 번 펼쳐지는 순서(초): 원이 그려짐 → 붉은 빛이 차오름 → 원반이 옆으로 퍼짐 → 번쩍인 뒤 계속 흐름
const RING_AT = 0.3;
const GLOW_AT = 2.2;
const DISK_AT = 5;
const FLASH_AT = 7.8;

type Phase = 'ring' | 'glow' | 'disk' | 'flow';
export function blackholePhase(t: number): Phase {
  if (t < GLOW_AT) return 'ring';
  if (t < DISK_AT) return 'glow';
  return t < FLASH_AT ? 'disk' : 'flow';
}

// 천천히 일렁이는 무늬 (원반이 생기기 전의 빛에 쓴다)
const ripple = (a: number, b: number, t: number) =>
  Math.sin(a + 0.9 * Math.sin(b + 1.3 * t)) * 0.5 + Math.sin(2.3 * a - b + 0.7 * t) * 0.3 + Math.sin(4.1 * a + 1.7 * b - 1.1 * t) * 0.2;

// 블랙홀. 점을 뿌리지 않고 칸마다 "여기 가스가 얼마나 뜨거운가"를 계산해서 글자와 색을 정한다.
// 처음에는 빈 화면에서 원 하나가 그려지고, 빛과 원반이 차례로 생긴 다음 번쩍이며 흐르기 시작한다.
export function createBlackhole(): Scene {
  const rand = rng(1915);
  // 첫 번쩍임은 원반이 다 펼쳐진 순간이고, 그 뒤로는 간격이 매번 다르다
  let flareAt = FLASH_AT;
  let lastFlare = -99;

  return {
    cell: 5,
    trail: 0.4,
    frame(g: Grid, t: number) {
      const { cols, rows, aspect } = g;
      // 가로를 화면 높이 단위로 잰 값. 좁은 화면에서는 원반이 들어오게 줄인다.
      const wide = cols / (rows * aspect);
      const fit = Math.max(1, 1.36 / wide);
      if (t >= flareAt) {
        lastFlare = flareAt;
        flareAt = t + 9 + rand() * 9;
      }
      const since = t - lastFlare;
      const flash = Math.exp(-Math.pow(since / 0.25, 2));
      const front = R0 + since * 0.5;
      const shockOn = since > 0 && since < 2.5;
      // 펼쳐지는 동안의 진행도
      const ringK = smooth((t - RING_AT) / 2.2);
      const diskOn = smooth((t - DISK_AT) / 2.8);
      const auraK = smooth((t - GLOW_AT) / 1.8) * (1 - 0.65 * diskOn);
      const diskK = smooth((t - DISK_AT) / 0.8) * (0.55 + 0.45 * smooth((t - FLASH_AT + 0.3) / 0.4));
      const haloK = smooth((t - DISK_AT) / 2.2);
      const cometK = smooth(t - FLASH_AT);
      // 원반이 옆으로 퍼져 나간 거리
      const span = R0 + diskOn * (R_OUT * 1.1 - R0);
      // 첫 번쩍임에 맞춰 다가가며 조금 위에서 내려다본다. 그 뒤로는 높이와 거리가 서로 다른 주기로 조금씩 바뀐다.
      const cam = smooth(smooth((t - FLASH_AT + 0.3) / 2.6));
      const inc = 0.12 + cam * (0.05 + 0.04 * Math.sin(t * 0.07) + 0.02 * Math.sin(t * 0.19 + 2));
      const zoom = (0.84 + cam * (0.22 + 0.07 * Math.sin(t * 0.11 + 1))) / fit;
      // 번쩍이기 전에는 느리게 돌다가 그 뒤로 빨라진다
      const s = Math.max(t - FLASH_AT, 0);
      const w = 0.06 * t + 0.28 * (s - 0.8 * (1 - Math.exp(-s / 0.8)));
      const cosT = Math.cos(TILT);
      const sinT = Math.sin(TILT);
      let hottest = 0;

      // 궤도를 도는 가스의 줄무늬. 안쪽 고리일수록 빨리 돈다(반지름의 -1.5제곱).
      const gas = (phi: number, rho: number) => {
        const phase = phi - Math.pow(rho / R_IN, -1.5) * w;
        const lr = Math.log(rho / R0);
        const a = 44 * lr + 0.9 * Math.sin(phase + 3 * lr);
        let s = 0.55 + 0.3 * Math.sin(a) + 0.15 * Math.sin(2.3 * a + 2 * phase) + 0.12 * Math.sin(3 * phase - 7 * lr + 0.3 * t);
        // 궤도를 타고 도는 밝은 덩어리 셋: 머리는 짧고 꼬리는 길다
        for (let k = 0; cometK > 0 && k < 3; k++) {
          const d = ((((phi - k * 2.1 - (0.95 - k * 0.15) * t + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
          const comet = d > 0 ? Math.exp(-Math.pow(d / 0.18, 2)) : Math.exp(d / 0.9);
          s += 0.9 * cometK * comet * Math.exp(-Math.pow((lr - Math.log(1.8 + k * 0.7)) / 0.07, 2));
        }
        return [s, phase, lr];
      };

      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const X = (((c + 0.5) / cols - 0.5) * wide) / zoom;
          const Y = ((r + 0.5) / rows - 0.5) / zoom;
          const rad = Math.hypot(X, Y);
          const ang = Math.atan2(Y, X);
          // 화면의 점을 기울어진 원반 위의 반지름과 각도로 되돌린다
          const u = X * cosT + Y * sinT;
          const v = -X * sinT + Y * cosT;
          const rho = Math.max(1e-4, Math.hypot(u, v / inc));
          const [streak, phase, lr] = gas(Math.atan2(v / inc, u), rho);
          const band = smooth((rho - R_IN) / (0.25 * R0)) * smooth((R_OUT - rho) / (2.2 * R0));
          // 우리 쪽으로 다가오는 편이 조금 더 밝다
          const disk = 1.5 * band * streak * (R_IN / rho) * (1 - (0.25 * u) / rho) * diskK * smooth((span - Math.abs(u)) / (0.6 * R0));

          // 원반의 뒤쪽이 중력에 휘어 그림자 위로 넘어와 보이는 고리
          const topSide = 0.5 - 0.5 * Math.sin(ang - TILT);
          const side = Math.pow(Math.abs(Math.cos(ang - TILT)), 10);
          const out = rad - 1.1 * R0;
          const width = out > 0 ? R0 * (0.2 + 0.24 * topSide + 0.45 * side) : 0.2 * R0;
          const lensRho = (1 - side) * (R_IN + Math.max(rad - R0, 0) * 2.6) + side * Math.max(rad, R_IN);
          const flow = gas(ang - TILT, lensRho)[0];
          const halo = 1.2 * Math.exp(-Math.pow(out / width, 2)) * flow * (0.5 + 0.8 * topSide) * haloK;
          // 그림자를 두르는 가는 빛의 고리. 처음에는 꼭대기에서 시작해 한 바퀴 돌며 그려진다.
          // 줄 간격이 칸 폭보다 넓어서 위아래에서는 띠를 조금 두껍게 잡아야 끊기지 않는다.
          const around = (((ang + Math.PI / 2) % TAU) + TAU) % TAU / TAU;
          const ring = (0.9 + 0.3 * smooth((t - DISK_AT) / 2)) * Math.exp(-Math.pow((rad - 1.02 * R0) / (R0 * (0.05 + 0.07 * Math.abs(Math.sin(ang)))), 2)) * smooth((ringK * 1.08 - around) / 0.08);
          // 고리 둘레에서 숨 쉬듯 부풀었다 가라앉는 붉은 빛. 원반이 생기면 원반의 줄무늬로 바뀐다.
          let aura = 0;
          if (auraK > 0) {
            const puff = (0.5 + 0.5 * ripple(2 * ang, 5 * rad - 0.45 * t, 0.35 * t)) * (1 - diskOn) + flow * diskOn;
            aura = auraK * Math.exp(-Math.pow(Math.max(rad - R0, 0) / (0.32 * R0 * (0.7 + 0.6 * puff)), 1.6)) * (0.6 + 0.4 * puff);
          }
          const shock = shockOn ? 0.9 * Math.exp(-Math.pow((rad - front) / 0.02, 2)) * Math.exp(-since / 0.5) : 0;

          const d1 = Math.min(1, Math.max(0, disk));
          const h1 = Math.min(1, Math.max(0, halo));
          // 빛과 원반과 고리가 겹치는 곳은 서로 녹아들게 섞는다
          let heat = Math.max(1 - (1 - Math.min(1, aura * 0.55)) * (1 - h1) * (1 - d1), disk, halo, ring, shock) * (1 + 1.4 * flash);
          const inside = rad < R0 * 0.97;
          // 그림자는 뒤에 있는 것을 가리고, 앞을 지나가는 원반만 보인다
          if (inside) heat = v > 0 && disk > 0.2 ? disk : 0;

          if (heat > 0.07) {
            if (heat > hottest) hottest = heat;
            const isRing = !inside && ring > 0.25 && ring >= disk && ring >= halo && ring > aura * 0.8;
            let ch: number;
            if (isRing) {
              // 고리는 도는 방향을 따라 선 글자로 그린다
              const s = (((Math.atan2(-Math.cos(ang), -Math.sin(ang)) * 180) / Math.PI) % 180 + 180) % 180;
              ch = code(s < 22.5 || s >= 157.5 ? '-' : s < 67.5 ? '/' : s < 112.5 ? '|' : '\\');
            } else {
              // 글자가 궤도를 따라 흘러가 보이도록 위상으로 순번을 민다
              ch = poolChar(Math.floor(heat * 3.6), Math.floor(hash(c, r) * 12) + Math.floor(phase * 2 + lr * 6));
            }
            const col = HEAT[heat < 0.1 ? 0 : heat < 0.2 ? 1 : heat < 0.45 ? 2 : heat < 0.75 ? 3 : 4];
            const lum = Math.min(1.3, 0.42 + 0.85 * heat) * (0.35 + 0.65 * smooth((heat - 0.07) / 0.15));
            g.put(c, r, 1, lum, col[0], col[1], col[2], ch);
          } else if (!inside) {
            const n = hash(c * 1.7, r * 2.3);
            if (n < 0.003) g.put(c, r, 9, 0.5 + 0.3 * Math.sin(0.8 * t + n * 9000), STAR[0], STAR[1], STAR[2], code(n < 0.0006 ? '+' : n < 0.0014 ? '*' : '.'));
            else if (t > 4 && n > 1 - 0.03 * Math.exp(-Math.pow((v - 0.02) / 0.09, 2))) g.put(c, r, 9, 0.28 * smooth((t - 4) / 3), 130, 72, 48, code(n > 0.995 ? ':' : ','));
          }
        }

      g.text(1, 1, `${blackholePhase(t)}  spin ${w.toFixed(2)}`, 0.5, 150, 140, 150);
      g.text(1, 2, `heat ${hottest.toFixed(2)}`, 0.6, HEAT[3][0], HEAT[3][1], HEAT[3][2]);
    },
  };
}
