import { code, Grid, hash, rng, Scene, smooth } from './grid';

const TAU = Math.PI * 2;
// 색은 강철빛 파랑, 따뜻한 금색, 숲의 초록이 바탕이고 경광등의 빨강과 간판의 분홍만 점으로 들어간다
const STEEL = [150, 172, 226];
const WARM = [255, 214, 120];
const IVORY = [255, 242, 216];
const GREEN = [78, 138, 104];
const NEON_WARM = [255, 168, 72];

// 처음 한 번 펼쳐지는 순서(초): 타워가 아래에서 위로 그려지고, 전망대에 불이 들어오고, 경광등이 켜진 뒤 첫 불꽃이 터진다
const TOWER = [1.8, 5.4];
const LIGHT_AT = 5.7;
const BEACON_AT = 6.6;
const FIRST_SHOT = 7.3;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: number[];
  seed: number;
}

// 타워의 옆모습. v는 꼭대기 0 ~ 받침 1, 돌려주는 값은 반쪽 폭(줄 단위)과 그 높이의 부분 이름이다.
type Part = 'mast' | 'cap' | 'window' | 'skirt' | 'shaft' | 'foot';
function profile(v: number): [number, Part] {
  if (v < 0.3) return [v < 0.17 ? 0 : 0.22, 'mast'];
  if (v < 0.345) return [1.1 + ((v - 0.3) / 0.045) * 2.7, 'cap'];
  if (v < 0.405) return [4, 'window'];
  if (v < 0.47) return [3.8 - ((v - 0.405) / 0.065) * 2.3, 'skirt'];
  if (v < 0.87) return [0.95, 'shaft'];
  return [1.5 + ((v - 0.87) / 0.13) * 2.6, 'foot'];
}

// 남산타워를 바라보는 두 사람의 뒷모습. 타워 둘레로 불꽃이 터지면 윤곽이 잠깐 밝아진다.
// 처음에는 산과 타워가 차례로 그려지고 불이 켜진다.
export function createNamsan(): Scene {
  const rand = rng(1975);
  let sparks: Spark[] = [];
  let next = FIRST_SHOT;
  // 방금 터진 불꽃의 밝기 (윤곽선과 전망대가 받는 빛)
  let flash = 0;
  let letters = 0;
  // 산 아래 건물들. 화면 폭을 똑같이 나눠 서고, x는 그 가운데(화면 폭에 대한 비율), 높이는 줄 단위다. 가운데는 낮고 가장자리로 갈수록 높다.
  const towers = Array.from({ length: 26 }, (_, i) => {
    const x = (i + 0.5) / 26;
    return { x, h: 1 + Math.abs(x - 0.5) * 16 + rand() * 5, warm: rand() < 0.6 };
  });

  return {
    // 다른 장면보다 칸을 잘게 쪼갠다
    cell: 5,
    frame(g: Grid, t: number, dt: number) {
      const { cols, rows, aspect } = g;
      // 줄 수에 맞춘 배율. 가로 길이는 aspect를 곱해 칸 수로 바꾼다.
      const k = rows / 54;
      const ax = k * aspect;
      // 배경이 아주 조금 좌우로 흔들려서 앞의 두 사람과 거리감이 생긴다
      const cx = cols / 2 + (Math.sin(t * 0.13) * 0.9 + Math.sin(t * 0.31) * 0.4) * k;
      const top = Math.round(rows * 0.05);
      const base = Math.round(rows * 0.47);
      flash = Math.max(0, flash - dt * 1.6);
      const sky = smooth(t / 2);
      // 산은 타워 발치에서 양옆으로 드러난다
      const hillK = smooth((t - 0.3) / 2.6) * 1.15;
      const head = Math.min(1, Math.max(0, (t - TOWER[0]) / (TOWER[1] - TOWER[0])));
      const drawnTo = base - (base - top) * head;
      const lit = smooth((t - LIGHT_AT) / 0.9);
      const people = smooth((t - 3) / 2.5);

      // 별
      for (let i = 0; i < cols; i++) {
        const big = hash(i, 9) > 0.9;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (0.4 + hash(i, 6)) + i), 2);
        g.put(hash(i, 1) * cols, hash(i, 2) * base, 9, (big ? 0.3 + 0.4 * tw : 0.1 + 0.16 * tw) * sky, STEEL[0], STEEL[1], STEEL[2], code(big ? '+' : '.'));
      }

      // 남산: 능선 세 겹. 겹마다 윗선은 기울기에 맞는 빗금으로 긋고, 안은 나무(A)와 수풀(^)이 뭉쳐서 번갈아 나온다.
      const depth = rows * 0.4;
      const ridge = (L: number, c: number) => {
        const d = (c - cx) / (cols * 0.5);
        const bumps = Math.sin(c * 0.13) * 0.7 + L * (Math.sin((c / ax) * 0.42 + L * 2.3) * 1.1 + Math.sin((c / ax) * 1.1 + L) * 0.5);
        return base + Math.round(L * depth * 0.2 + d * d * rows * (0.1 + 0.05 * L) + bumps * k);
      };
      for (let L = 0; L < 3; L++)
        for (let c = 0; c < cols; c++) {
          const d = (c - cx) / (cols * 0.5);
          const shown = smooth((hillK - Math.abs(d)) / 0.12);
          if (shown <= 0) continue;
          const top0 = ridge(L, c);
          const slope = ridge(L, c + 1) - ridge(L, c - 1);
          const end = Math.min(rows, base + depth);
          for (let r = top0; r < end; r++) {
            const j = r - top0;
            const far = (r - base) / depth;
            const w = hash(c * 1.3, r * 2.7 + L);
            const glowK = (1 - far * 0.5) * (1 + flash * 0.4) * shown;
            if (j === 0) {
              g.put(c, r, 6 - L * 0.2, 0.5 * glowK, GREEN[0] + 40, GREEN[1] + 40, GREEN[2] + 30, code(slope < 0 ? '/' : slope > 0 ? '\\' : '^'));
              continue;
            }
            // 가로등 불빛이 드문드문 박혀 있다
            if (w > 0.994 && far < 0.7 && lit > hash(c, 3)) {
              g.put(c, r, 6 - L * 0.2, 0.75 + 0.2 * Math.sin(t * 2 + c), WARM[0], WARM[1], WARM[2], code('o'));
              continue;
            }
            const n = Math.sin((c / ax) * 0.9 + j * 1.3 + L * 1.7) + Math.sin((c / ax) * 0.23 - j * 0.7 + L);
            const tree = n > 0.45 ? 'A' : n > -0.7 ? '^' : w > 0.5 ? 'n' : '.';
            const lum = (tree === 'A' ? 0.3 + w * 0.12 : tree === '^' ? 0.2 + w * 0.08 : 0.14) * (0.8 + L * 0.12) * glowK;
            g.put(c, r, 6 - L * 0.2, lum, GREEN[0], GREEN[1], GREEN[2], code(tree));
          }
        }

      // 산허리를 도는 길의 가로등 줄과, 왼쪽 아래에서 타워 발치로 오르는 케이블카
      if (lit > 0) {
        for (let c = Math.round(cx + cols * 0.08); c < cx + cols * 0.36; c++) {
          if (c % 7 === 0) continue;
          g.put(c, ridge(1, c) + Math.round(1.5 * k), 5.5, 0.55 * lit * (0.8 + 0.2 * Math.sin(t * 1.3 + c * 0.4)), WARM[0], WARM[1] - 30, WARM[2] - 40, code('='));
        }
        const x0 = cx - cols * 0.37;
        const y0 = base + depth * 0.52;
        const x1 = cx - 5 * ax;
        const y1 = base + 1.5 * k;
        const n = Math.round((x1 - x0) / 2);
        for (let i = 0; i <= n; i++)
          g.put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 5.4, 0.3 * lit, STEEL[0], STEEL[1], STEEL[2], code(i % 9 === 0 ? '|' : '.'));
        // 케이블카 두 대가 엇갈려 오르내린다
        for (const ph of [0, Math.PI]) {
          const p = 0.5 + 0.5 * Math.sin(t * 0.11 + ph);
          const bx = Math.round(x0 + (x1 - x0) * p);
          const by = Math.round(y0 + (y1 - y0) * p) + 1;
          '[#]'.split('').forEach((ch, i) => g.put(bx - 1 + i, by, 5.3, 0.85 * lit, WARM[0], WARM[1], WARM[2], code(ch)));
        }
      }

      // 산 아래 동네: 건물이 가장자리부터 솟고 창에 불이 하나씩 켜진다
      const street = Math.round(rows * 0.84);
      towers.forEach((b, bi) => {
        const rise = smooth((t - 1.2 - (1 - Math.abs(b.x - 0.5) * 2) * 1.6) / 1.4);
        if (rise <= 0) return;
        // 건물은 틈 없이 붙어 서서 산자락을 가린다
        const bx0 = Math.round((bi / towers.length) * cols);
        const bx1 = Math.round(((bi + 1) / towers.length) * cols) - 1;
        const roof = Math.round(rows - (rows - (street - b.h * k)) * rise);
        const glass = b.warm ? NEON_WARM : IVORY;
        // 멀리 있는 건물이라 벽은 그리지 않고 지붕 선과 창의 불빛만 남긴다
        for (let r = roof; r < rows; r++)
          for (let c = bx0; c <= bx1; c++) {
            const wc = c - bx0;
            const wr = r - roof;
            if (wr === 0) {
              g.put(c, r, 5, (0.2 + 0.3 * flash) * rise, STEEL[0], STEEL[1], STEEL[2], code('_'));
              continue;
            }
            // 창은 한 칸 걸러 한 칸, 한 줄 걸러 한 줄이다
            const pane = wc % 2 === 1 && wr % 2 === 0;
            const id = hash(bi * 31 + wc, wr * 1.7);
            // 가끔 꺼지고 켜지는 창이 섞여 있다
            const live = hash(bi + wc, wr + Math.floor(t * 0.08 + id * 9)) < 0.72;
            if (pane && live && id < 0.62 && t > 3.6 + id * 5)
              g.put(c, r, 5, 0.34 + 0.4 * id + 0.08 * Math.sin(t * (0.6 + id * 2) + c), glass[0], glass[1], glass[2], code(id < 0.2 ? ':' : id < 0.45 ? '.' : "'"));
            // 불 꺼진 자리도 빈칸으로 덮어서 뒤의 산이 비치지 않게 한다
            else g.put(c, r, 5, 0, 0, 0, 0, code(' '));
          }
        // 높은 건물 옥상에는 깜박이는 항공등
        if (b.h > 11 && rise >= 1) g.put((bx0 + bx1) >> 1, roof - 1, 5, 0.3 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.2 + bi), 4), 255, 96, 96, code('*'));
      });

      // 타워: 경광등 → 첨탑 → 전망대(덮개·창·치마) → 기둥 → 받침
      if (t >= BEACON_AT) {
        g.put(cx, top, 3, 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3)), 255, 96, 96, code('*'));
        if (t < BEACON_AT + 0.5) g.rays(cx, top, 5, 255, 120, 120);
      }
      for (let r = top + 1; r <= base; r++) {
        if (r < drawnTo) continue;
        // 그려지는 끝은 하얗게 빛난다
        const tip = head < 1 && r - drawnTo < 1.5;
        const [hw, part] = profile((r - top) / (base - top));
        // 칸이 세로로 길어서 폭은 조금 덜어 낸다
        const half = Math.round(hw * ax * 0.62);
        const [above] = profile((r - 1 - top) / (base - top));
        const [below] = profile((r + 1 - top) / (base - top));
        for (let dx = -half; dx <= half; dx++) {
          const edge = Math.abs(dx) === half && half > 0;
          let ch = '|';
          let lum = 0.6;
          let c = STEEL;
          if (part === 'window') {
            // 창을 따라 빛이 한 바퀴 돈다
            const run = 0.5 + 0.5 * Math.sin((dx / ax) * 1.6 - t * 2.4);
            ch = edge ? (dx < 0 ? '[' : ']') : 'o';
            // 불은 왼쪽 창부터 차례로 들어온다
            const on = smooth((lit * 1.4 - (dx + half) / (2 * half + 1)) / 0.4);
            lum = edge ? 0.8 : 0.22 + on * (0.44 + 0.3 * run) + flash * 0.2;
            c = edge ? IVORY : on > 0.5 ? WARM : STEEL;
          } else if (part === 'cap' || part === 'skirt' || part === 'foot') {
            // 넓어지는 쪽 가장자리는 빗금, 안은 줄무늬
            const slope = above < hw ? (dx < 0 ? '/' : '\\') : below < hw ? (dx < 0 ? '\\' : '/') : '|';
            ch = edge ? slope : r % 2 ? '=' : part === 'foot' ? '#' : '-';
            lum = edge ? 0.85 : r % 2 ? 0.7 : 0.45;
            c = IVORY;
          } else if (part === 'shaft') {
            // 기둥을 타고 올라가는 불빛
            const chase = Math.pow(0.5 + 0.5 * Math.sin((r / k) * 0.9 + t * 3.2), 3) * lit;
            ch = edge ? '|' : r % 2 ? ':' : '.';
            lum = edge ? 0.6 : 0.3 + 0.65 * chase;
            c = edge ? STEEL : [STEEL[0] + 70 * chase, STEEL[1] + 50 * chase, 255];
          }
          if (tip) g.put(cx + dx, r, 3, 1, IVORY[0], IVORY[1], IVORY[2], code('*'));
          else g.put(cx + dx, r, 3, lum, c[0], c[1], c[2], code(ch));
        }
        // 전망대 둘레로 번지는 빛
        if (lit > 0 && (part === 'window' || part === 'cap' || part === 'skirt'))
          for (const s of [-1, 1])
            for (let e = 1; e <= Math.round(2 * ax); e++)
              if (hash(r, s * e) > 0.45)
                g.put(cx + s * (half + e), r, 4, (0.3 / e + 0.08) * lit, WARM[0], WARM[1], WARM[2], code(e < 2 ? ':' : '.'));
      }

      if (head > 0 && head < 1) g.rays(cx, drawnTo, 3, IVORY[0], IVORY[1], IVORY[2]);

      // 불꽃: 타워 둘레 하늘 아무 데서나 작게 터진다
      if (t >= next) {
        next = t + 0.4 + rand() * 1.3;
        flash = 1;
        const side = rand() < 0.5 ? -1 : 1;
        const bx = cx + side * cols * (0.1 + rand() * 0.32);
        const by = rows * (0.06 + rand() * 0.22);
        const c = rand() < 0.65 ? WARM : IVORY;
        const reach = rows * (0.06 + rand() * 0.07);
        const n = Math.round((180 + rand() * 140) * k);
        for (let i = 0; i < n; i++) {
          const a = rand() * TAU;
          const v = reach * 2.2 * (0.3 + 0.7 * Math.sqrt(rand()));
          const max = 1.6 + rand() * 1.4;
          sparks.push({ x: bx, y: by, vx: Math.cos(a) * v * aspect, vy: Math.sin(a) * v, life: max, max, c, seed: rand() * 100 });
        }
      }
      const drag = Math.max(0, 1 - 2.2 * dt);
      sparks = sparks.filter((p) => {
        p.vx *= drag;
        p.vy = p.vy * drag + 2.4 * k * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) return false;
        const q = p.life / p.max;
        const tw = q < 0.5 ? 0.5 + 0.5 * Math.sin(t * 20 + p.seed) : 1;
        g.add(p.x, p.y, Math.pow(q, 1.2) * tw, p.c[0], p.c[1], p.c[2]);
        return true;
      });

      // 양옆 계단: 아래로 갈수록 바깥으로 넓어지는 줄무늬
      const stairTop = Math.round(rows * 0.84);
      const stairK = smooth((t - 1) / 2);
      for (let r = stairTop; r < rows; r++) {
        const d = (r - stairTop) / k;
        const reach = (19 + d * 1.7 + (Math.floor(d / 2) % 2) * 1.5) * ax;
        const tread = Math.floor(d) % 2 === 0;
        for (let c = Math.max(0, Math.round(cols / 2 - reach)); c < Math.min(cols, cols / 2 + reach); c++)
          g.put(c, r, 1, (tread ? 0.34 + 0.1 * hash(c, r) : 0.2) * stairK, tread ? STEEL[0] : IVORY[0] * 0.7, tread ? STEEL[1] : IVORY[1] * 0.7, tread ? STEEL[2] : IVORY[2] * 0.7, code(tread ? '#' : '='));
      }

      // 두 사람: 안쪽은 비워서 뒤를 가리고 가장자리만 그린다
      const s = k * 1.3;
      const sx = s * aspect;
      const hy = rows * 0.63;
      // 그녀의 머리가 아주 천천히 그에게 기울었다 돌아온다
      const lean = 0.5 + 0.5 * Math.sin(t * 0.23);
      const inside = (c: number, r: number) => {
        const x = (c - cols / 2) / sx;
        const y = (r - hy) / s;
        // 그: 머리와 목, 어깨와 몸
        if (Math.pow((x + 5.2) / 3.2, 2) + Math.pow(y / 3.7, 2) < 1) return true;
        if (y > 2 && y < 5.4 && Math.abs(x + 5.2) < 1.7) return true;
        if (y > 4.2 && Math.pow((x + 6) / 9.4, 2) + Math.pow(Math.min(0, y - 10.5) / 6.3, 2) < 1) return true;
        // 그녀: 머리, 어깨까지 내려오는 머리카락, 어깨와 몸
        const hx = 4.8 - lean * 0.8;
        if (Math.pow((x - hx) / 3, 2) + Math.pow((y - 2.6) / 3.4, 2) < 1) return true;
        if (y > 2.6 && y < 10 && Math.abs(x - hx) < 3.3 + (y - 2.6) * 0.14) return true;
        return y > 7 && Math.pow((x - 5.6) / 8, 2) + Math.pow(Math.min(0, y - 13) / 6, 2) < 1;
      };
      const c0 = Math.floor(cols / 2 - 17 * sx);
      const c1 = Math.ceil(cols / 2 + 15 * sx);
      for (let r = Math.floor(hy - 5 * s); r < rows; r++)
        for (let c = c0; c <= c1; c++) {
          if (!inside(c, r)) continue;
          const up = !inside(c, r - 1);
          const left = !inside(c - 1, r);
          const right = !inside(c + 1, r);
          // 옆 가장자리는 두 칸 두께로 그린다
          const left2 = !left && !inside(c - 2, r);
          const right2 = !right && !inside(c + 2, r);
          if (!up && !left && !right && !left2 && !right2) {
            g.put(c, r, -10, 0, 0, 0, 0);
            continue;
          }
          const ch = up ? (left ? '/' : right ? '\\' : '_') : left || left2 ? '(' : ')';
          const inner = !up && (left2 || right2);
          // 타워 쪽 빛과 불꽃을 받는 가장자리
          g.put(c, r, -10, ((inner ? 0.3 : 0.52) + 0.4 * flash) * people, STEEL[0] + 70 * flash, STEEL[1] + 40 * flash, STEEL[2], code(ch));
        }

      g.text(1, 1, 'n seoul tower · namsan', 0.5, 140, 150, 175);
      g.text(1, 2, `sparks ${sparks.length}`, 0.6, WARM[0], WARM[1], WARM[2]);
      g.text(1, 3, `letters ${letters.toLocaleString('en-US')}`, 0.5, 140, 150, 175);
      letters = 0;
      for (let i = 0; i < g.lum.length; i++) if (g.lum[i] > 0) letters++;
    },
  };
}
