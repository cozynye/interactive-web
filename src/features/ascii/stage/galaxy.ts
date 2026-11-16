import { code, Grid, hash, rng, Scene, smooth } from './grid';

const TAU = Math.PI * 2;
// 색은 셋만 쓴다: 중심의 상아색, 팔의 옅은 파랑, 드문 금색
const IVORY = [255, 238, 208];
const BLUE = [150, 186, 255];
const GOLD = [255, 206, 110];
// 처음 한 번 펼쳐지는 순서(초): 한 점이 빛남 → 별이 퍼지며 팔이 풀림 → 중심이 번쩍임
const BIRTH = 1.2;
const SPREAD = 5.2;
const FLASH = 6.6;

interface Star {
  r: number;
  a: number;
  h: number;
  // 제자리에서 떠도는 주기와 위상
  f1: number;
  f2: number;
  p1: number;
  p2: number;
  lum: number;
  c: number[];
  ch: number;
}
interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

// 나선 은하. 별마다 제 박자로 떠돌고, 보는 각도도 정해진 주기 없이 기울었다 돌아온다.
// 처음에는 한 점에서 별이 퍼져 나오며 팔이 풀린다.
export function createGalaxy(): Scene {
  const rand = rng(88);
  const gauss = () => rand() + rand() + rand() - 1.5;
  const stars: Star[] = [];
  for (let i = 0; i < 7000; i++) {
    const core = rand() < 0.22;
    const r = core ? Math.abs(gauss()) * 0.16 : 0.1 + Math.pow(rand(), 0.75) * 0.95;
    // 두 갈래 팔: 바깥으로 갈수록 감긴다
    const arm = Math.floor(rand() * 2) * Math.PI;
    const a = core ? rand() * TAU : arm + Math.log(r / 0.08) * 1.9 + gauss() * (0.22 + 0.18 * r);
    const giant = !core && rand() < 0.04;
    stars.push({
      r,
      a,
      h: gauss() * (core ? 0.07 : 0.025),
      f1: 0.2 + rand() * 0.6,
      f2: 0.15 + rand() * 0.5,
      p1: rand() * TAU,
      p2: rand() * TAU,
      lum: giant ? 0.9 : core ? 0.17 : 0.08 + rand() * 0.14,
      c: giant ? GOLD : core || r < 0.3 ? IVORY : BLUE,
      ch: giant ? code('*') : 0,
    });
  }
  let meteors: Meteor[] = [];
  let next = FLASH + 1;

  return {
    frame(g: Grid, t: number, dt: number) {
      const { cols, rows, aspect } = g;
      // 원반이 어느 쪽으로 돌아도 화면 안에 들어오는 크기
      const u = g.unit * 0.8;
      const cx = cols / 2;
      const cy = rows / 2;
      // 서로 맞물리지 않는 주기를 섞어서 같은 자세가 되풀이되지 않게 한다
      const tilt = 1.02 + 0.2 * Math.sin(t * 0.11) + 0.08 * Math.sin(t * 0.29 + 1);
      const roll = 0.34 * Math.sin(t * 0.07 + 2) + 0.1 * Math.sin(t * 0.19);
      const zoom = 1.02 + 0.08 * Math.sin(t * 0.13);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      // 펼쳐지는 동안에는 작게 뭉쳐서 더 감겨 있다가 풀린다
      const open = smooth((t - BIRTH) / SPREAD);
      const turn = t * 0.1 + (1 - open) * 2.6;
      const flash = Math.exp(-Math.pow((t - FLASH) / 0.3, 2));
      const sky = smooth(t / 3);

      // 먼 배경의 별
      for (let i = 0; i < cols * 1.3; i++) {
        const c = (hash(i, 3) * cols + t * (0.15 + hash(i, 5) * 0.25)) % cols;
        const tw = 0.1 + 0.16 * Math.pow(0.5 + 0.5 * Math.sin(t * (0.5 + hash(i, 7)) + i), 2);
        g.put(c, hash(i, 4) * rows, 9, tw * sky, 170, 190, 235, code('.'));
      }

      // 태어나기 전의 한 점, 그리고 다 펼쳐진 순간의 번쩍임
      if (t < BIRTH + 0.5) g.rays(cx, cy, 1 + Math.round(3 * smooth(t / BIRTH)), IVORY[0], IVORY[1], IVORY[2]);
      if (flash > 0.2) g.rays(cx, cy, Math.round(9 * flash), IVORY[0], IVORY[1], IVORY[2]);

      for (const s of stars) {
        // 안쪽 별부터 나타난다
        const seen = smooth((t - BIRTH - s.r * 2.6) / 1.4);
        if (seen <= 0) continue;
        const r = (s.r + 0.018 * Math.sin(t * s.f1 + s.p1)) * (0.2 + 0.8 * open);
        const a = s.a + turn + (0.05 * Math.sin(t * s.f2 + s.p2)) / (s.r + 0.25);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const y = s.h + 0.008 * Math.sin(t * s.f2 * 2 + s.p1);
        // 원반을 눕히고(tilt) 화면 안에서 돌린다(roll)
        const ty = y * ct - z * st;
        const sx = x * cr - ty * sr;
        const sy = x * sr + ty * cr;
        g.add(cx + sx * u * zoom * aspect, cy - sy * u * zoom, s.lum * seen * (1 + (s.r < 0.25 ? 2 * flash : 0.6 * flash)), s.c[0], s.c[1], s.c[2], s.ch);
      }

      // 별똥별: 아무 데서나 나타나 아무 쪽으로나 지나간다
      if (t >= next) {
        next = t + 0.8 + rand() * 1.8;
        const a = rand() * TAU;
        const v = rows * (0.9 + rand() * 0.8);
        const max = 0.5 + rand() * 0.5;
        meteors.push({ x: rand() * cols, y: rand() * rows * 0.7, vx: Math.cos(a) * v * aspect, vy: Math.abs(Math.sin(a)) * v * 0.6 + 2, life: max, max });
      }
      meteors = meteors.filter((m) => {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;
        const k = m.life / m.max;
        for (let i = 0; i < 12; i++)
          g.add(m.x - m.vx * i * 0.012, m.y - m.vy * i * 0.012, k * (1 - i / 12) * 0.9, 255, 244, 224, code(i ? '-' : '*'));
        return m.life > 0;
      });

      g.text(1, 1, `stars ${stars.length.toLocaleString('en-US')}`, 0.5, 140, 150, 175);
      g.text(1, 2, `tilt ${((tilt * 180) / Math.PI).toFixed(1)}°`, 0.5, 140, 150, 175);
    },
  };
}
