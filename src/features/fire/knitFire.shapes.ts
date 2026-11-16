// 모양 불꽃 실루엣 — 100×100 칸에 채워 그리면 엔진이 외곽선만 코 격자로 옮긴다.
// 안쪽 선은 구멍(destination-out)으로 뚫어야 외곽선으로 남는다.
type Drawer = (g: CanvasRenderingContext2D) => void;

function ellipse(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot = 0
) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fill();
}

function polygon(g: CanvasRenderingContext2D, points: number[][]) {
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}

// 좌우 대칭 짝
const mirror = (points: number[][]) => points.map(([x, y]) => [100 - x, y]);

function holes(g: CanvasRenderingContext2D, draw: () => void) {
  g.globalCompositeOperation = 'destination-out';
  draw();
  g.globalCompositeOperation = 'source-over';
}

// 선 하나 (끝이 둥근 굵은 획)
function stroke(
  g: CanvasRenderingContext2D,
  points: number[][],
  width: number
) {
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}

// 꼭짓점이 n개인 별
function star(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  outer: number,
  inner: number,
  n = 5
) {
  polygon(
    g,
    Array.from({ length: n * 2 }, (_, i) => {
      const a = (i * Math.PI) / n - Math.PI / 2;
      const r = i % 2 ? inner : outer;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r];
    })
  );
}

// 일본의 모양 불꽃(型物)에서 자주 쏘는 것들과 밤하늘에 어울리는 것들
export const SHAPE_DRAWERS: Record<string, Drawer> = {
  saturn: (g) => {
    ellipse(g, 50, 50, 48, 15, -0.38);
    holes(g, () => {
      ellipse(g, 50, 50, 41, 8.5, -0.38);
      ellipse(g, 50, 50, 28, 28);
    });
    ellipse(g, 50, 50, 22, 22);
  },
  moon: (g) => {
    ellipse(g, 44, 52, 40, 40);
    holes(g, () => ellipse(g, 62, 42, 34, 34));
    star(g, 74, 34, 13, 5.5);
  },
  smile: (g) => {
    ellipse(g, 50, 50, 44, 44);
    holes(g, () => {
      ellipse(g, 35, 40, 5.5, 8);
      ellipse(g, 65, 40, 5.5, 8);
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(50, 52, 25, Math.PI * 0.18, Math.PI * 0.82);
      g.stroke();
    });
  },
  butterfly: (g) => {
    ellipse(g, 28, 34, 22, 27, -0.55);
    ellipse(g, 72, 34, 22, 27, 0.55);
    ellipse(g, 32, 72, 17, 19, 0.5);
    ellipse(g, 68, 72, 17, 19, -0.5);
    holes(g, () => {
      ellipse(g, 27, 33, 8, 11, -0.55);
      ellipse(g, 73, 33, 8, 11, 0.55);
    });
    // 몸통 둘레를 한 번 파내서 날개와 떨어뜨린다
    holes(g, () => ellipse(g, 50, 54, 10, 31));
    ellipse(g, 50, 54, 4.5, 27);
    stroke(g, [[50, 30], [40, 8]], 4);
    stroke(g, [[50, 30], [60, 8]], 4);
  },
  flower: (g) => {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.26;
      ellipse(g, 50 + Math.cos(a) * 27, 50 + Math.sin(a) * 27, 19, 14, a);
    }
    holes(g, () => ellipse(g, 50, 50, 11, 11));
  },
  clover: (g) => {
    ellipse(g, 33, 28, 19, 19);
    ellipse(g, 67, 28, 19, 19);
    ellipse(g, 33, 60, 19, 19);
    ellipse(g, 67, 60, 19, 19);
    ellipse(g, 50, 44, 9, 9);
    stroke(g, [[50, 46], [54, 76], [64, 96]], 6);
  },
  note: (g) => {
    ellipse(g, 26, 78, 15, 11, -0.4);
    ellipse(g, 70, 68, 15, 11, -0.4);
    g.fillRect(34, 22, 7, 56);
    g.fillRect(78, 12, 7, 56);
    polygon(g, [
      [34, 22],
      [85, 10],
      [85, 26],
      [34, 38],
    ]);
  },
  crown: (g) => {
    polygon(g, [
      [10, 84],
      [10, 32],
      [31, 56],
      [50, 20],
      [69, 56],
      [90, 32],
      [90, 84],
    ]);
    ellipse(g, 10, 26, 7, 7);
    ellipse(g, 50, 14, 7, 7);
    ellipse(g, 90, 26, 7, 7);
    holes(g, () => g.fillRect(19, 68, 62, 6));
  },
  bolt: (g) => {
    polygon(g, [
      [62, 3],
      [20, 56],
      [45, 56],
      [34, 97],
      [82, 40],
      [56, 40],
      [72, 3],
    ]);
  },
  snowflake: (g) => {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 2;
      const at = (r: number, d = 0) => [
        50 + Math.cos(a + d) * r,
        50 + Math.sin(a + d) * r,
      ];
      stroke(g, [[50, 50], at(46)], 5);
      stroke(g, [at(42, -0.36), at(27), at(42, 0.36)], 5);
    }
  },
  gem: (g) => {
    polygon(g, [
      [50, 96],
      [5, 38],
      [25, 10],
      [75, 10],
      [95, 38],
    ]);
    holes(g, () => {
      stroke(g, [[14, 38], [86, 38]], 5);
    });
  },
  umbrella: (g) => {
    g.beginPath();
    g.arc(50, 52, 45, Math.PI, 0);
    g.closePath();
    g.fill();
    holes(g, () => {
      ellipse(g, 20, 54, 15, 11);
      ellipse(g, 50, 54, 15, 11);
      ellipse(g, 80, 54, 15, 11);
    });
    stroke(g, [[50, 44], [50, 84]], 5);
    g.beginPath();
    g.arc(41, 84, 9, 0, Math.PI);
    g.stroke();
  },
  rocket: (g) => {
    ellipse(g, 50, 42, 18, 38);
    polygon(g, [
      [35, 54],
      [14, 86],
      [40, 76],
    ]);
    polygon(g, mirror([
      [35, 54],
      [14, 86],
      [40, 76],
    ]));
    polygon(g, [
      [42, 78],
      [50, 99],
      [58, 78],
    ]);
    holes(g, () => ellipse(g, 50, 34, 7.5, 7.5));
  },
  mushroom: (g) => {
    g.beginPath();
    g.ellipse(50, 50, 44, 38, 0, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillRect(35, 50, 30, 32);
    ellipse(g, 50, 82, 15, 11);
    holes(g, () => {
      ellipse(g, 30, 36, 7, 7);
      ellipse(g, 54, 26, 8, 8);
      ellipse(g, 73, 39, 6, 6);
    });
  },
  plane: (g) => {
    polygon(g, [
      [4, 46],
      [96, 8],
      [62, 94],
      [46, 60],
    ]);
    holes(g, () => stroke(g, [[88, 14], [47, 58]], 4));
  },
  cherry: (g) => {
    ellipse(g, 30, 74, 19, 19);
    ellipse(g, 70, 78, 19, 19);
    stroke(g, [[30, 58], [40, 30], [58, 12]], 5);
    stroke(g, [[70, 62], [66, 34], [58, 12]], 5);
    ellipse(g, 76, 16, 17, 8, -0.3);
  },
  ghost: (g) => {
    g.beginPath();
    g.arc(50, 44, 34, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillRect(16, 44, 68, 40);
    ellipse(g, 27.5, 84, 11.5, 10);
    ellipse(g, 50, 84, 11.5, 10);
    ellipse(g, 72.5, 84, 11.5, 10);
    holes(g, () => {
      ellipse(g, 38, 44, 5.5, 8.5);
      ellipse(g, 62, 44, 5.5, 8.5);
    });
  },
  icecream: (g) => {
    polygon(g, [
      [27, 50],
      [73, 50],
      [50, 98],
    ]);
    ellipse(g, 50, 32, 27, 27);
    holes(g, () => stroke(g, [[26, 50], [74, 50]], 4));
  },
  sun: (g) => {
    star(g, 50, 50, 48, 30, 10);
    holes(g, () => ellipse(g, 50, 50, 21, 21));
    ellipse(g, 50, 50, 14, 14);
  },
  balloon: (g) => {
    ellipse(g, 50, 36, 28, 33);
    polygon(g, [
      [50, 66],
      [43, 76],
      [57, 76],
    ]);
    stroke(g, [[50, 76], [44, 84], [54, 91], [48, 99]], 4);
  },
};

export const SHAPE_TYPES = Object.keys(SHAPE_DRAWERS);

// 땅에 서 있는 불꽃지기 (코 하나 = 글자 하나)
export const KEEPER_ICON_COLORS: Record<string, string> = {
  N: '#f4ecdc', // 방울
  H: '#c8453a', // 털모자
  R: '#f4ecdc', // 모자 단
  X: '#4a342a', // 머리
  S: '#f2c9a0', // 피부
  E: '#1c1a18', // 눈
  C: '#f0a39a', // 볼
  M: '#c8564e', // 입
  B: '#e9b949', // 목도리
  J: '#3f7a5c', // 외투
  P: '#3a3f52', // 바지
  K: '#1c1a18', // 신발
};

export const KEEPER_ICON = [
  '.......NN.......',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '..RRRRRRRRRRRR..',
  '..XSSSSSSSSSSX..',
  '..XSSESSSSESSX..',
  '..SSSESSSSESSS..',
  '..SCSSSSSSSSCS..',
  '...SSSSMMSSSS...',
  '...BBBBBBBBBB...',
  '..JJJBBBJJJJJJ..',
  '.JJJJJBBJJJJJJJ.',
  '.JJJJJBBJJJJJJJ.',
  '.JJSJJJJJJJJSJJ.',
  '.SSJJJJJJJJJJSS.',
  '...JJJJJJJJJJ...',
  '...JJJJJJJJJJ...',
  '....PPP..PPP....',
  '....PPP..PPP....',
  '...KKKK..KKKK...',
];
