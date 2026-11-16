// 모양 불꽃 실루엣 — 100×100 칸에 채워 그리면 엔진이 외곽선만 코 격자로 옮긴다.
// 눈·코는 구멍(destination-out)으로 뚫어야 외곽선으로 남는다.
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

export const SHAPE_DRAWERS: Record<string, Drawer> = {
  paw: (g) => {
    ellipse(g, 50, 68, 25, 21);
    ellipse(g, 19, 44, 9.5, 12.5, -0.4);
    ellipse(g, 38, 24, 10, 13.5, -0.15);
    ellipse(g, 62, 24, 10, 13.5, 0.15);
    ellipse(g, 81, 44, 9.5, 12.5, 0.4);
  },
  bone: (g) => {
    g.translate(50, 50);
    g.rotate(-0.5);
    g.fillRect(-30, -9, 60, 18);
    ellipse(g, -32, -11, 13, 13);
    ellipse(g, -32, 11, 13, 13);
    ellipse(g, 32, -11, 13, 13);
    ellipse(g, 32, 11, 13, 13);
  },
  cat: (g) => {
    ellipse(g, 50, 60, 37, 30);
    polygon(g, [
      [14, 56],
      [15, 8],
      [46, 34],
    ]);
    polygon(g, [
      [86, 56],
      [85, 8],
      [54, 34],
    ]);
    holes(g, () => {
      ellipse(g, 35, 56, 5.5, 7.5);
      ellipse(g, 65, 56, 5.5, 7.5);
      polygon(g, [
        [44, 69],
        [56, 69],
        [50, 77],
      ]);
    });
  },
  dog: (g) => {
    ellipse(g, 50, 46, 29, 30);
    ellipse(g, 50, 70, 19, 17);
    ellipse(g, 17, 50, 12, 27, 0.22);
    ellipse(g, 83, 50, 12, 27, -0.22);
    holes(g, () => {
      ellipse(g, 38, 42, 5, 6.5);
      ellipse(g, 62, 42, 5, 6.5);
      ellipse(g, 50, 64, 8, 6);
    });
  },
  wolf: (g) => {
    polygon(g, [
      [50, 96],
      [30, 74],
      [12, 58],
      [18, 40],
      [12, 6],
      [36, 26],
      [50, 22],
      [64, 26],
      [88, 6],
      [82, 40],
      [88, 58],
      [70, 74],
    ]);
    const eye = [
      [29, 45],
      [42, 50],
      [40, 57],
      [30, 53],
    ];
    holes(g, () => {
      polygon(g, eye);
      polygon(g, mirror(eye));
      ellipse(g, 50, 83, 5.5, 4.5);
    });
  },
  monkey: (g) => {
    ellipse(g, 50, 50, 30, 31);
    ellipse(g, 15, 46, 13, 14);
    ellipse(g, 85, 46, 13, 14);
    holes(g, () => {
      ellipse(g, 39, 43, 4.5, 5.5);
      ellipse(g, 61, 43, 4.5, 5.5);
      ellipse(g, 50, 65, 13, 5);
    });
  },
  elephant: (g) => {
    ellipse(g, 50, 38, 22, 25);
    ellipse(g, 19, 40, 19, 28);
    ellipse(g, 81, 40, 19, 28);
    polygon(g, [
      [42, 56],
      [58, 56],
      [58, 80],
      [72, 80],
      [72, 94],
      [46, 94],
      [42, 82],
    ]);
    holes(g, () => {
      ellipse(g, 41, 34, 3.8, 4.8);
      ellipse(g, 59, 34, 3.8, 4.8);
    });
  },
  shark: (g) => {
    polygon(g, [
      [3, 54],
      [22, 42],
      [48, 38],
      [72, 44],
      [86, 50],
      [99, 28],
      [93, 53],
      [99, 76],
      [85, 58],
      [70, 62],
      [46, 66],
      [22, 63],
    ]);
    polygon(g, [
      [42, 40],
      [58, 10],
      [66, 43],
    ]);
    polygon(g, [
      [38, 63],
      [52, 86],
      [58, 63],
    ]);
    holes(g, () => ellipse(g, 19, 50, 3.6, 3.6));
  },
  whale: (g) => {
    ellipse(g, 42, 60, 39, 24);
    polygon(g, [
      [70, 52],
      [86, 38],
      [72, 20],
      [90, 28],
      [100, 14],
      [100, 38],
      [92, 48],
      [80, 68],
    ]);
    ellipse(g, 24, 14, 4.5, 8, -0.5);
    ellipse(g, 40, 14, 4.5, 8, 0.5);
    holes(g, () => ellipse(g, 19, 58, 3.8, 3.8));
  },
  eagle: (g) => {
    const wing = [
      [45, 46],
      [30, 26],
      [0, 10],
      [4, 24],
      [11, 30],
      [8, 39],
      [19, 43],
      [17, 52],
      [29, 54],
      [30, 62],
      [44, 60],
    ];
    polygon(g, wing);
    polygon(g, mirror(wing));
    ellipse(g, 50, 56, 10, 21);
    ellipse(g, 50, 28, 9, 9);
    polygon(g, [
      [46, 34],
      [54, 34],
      [50, 44],
    ]);
    polygon(g, [
      [42, 72],
      [58, 72],
      [66, 94],
      [50, 86],
      [34, 94],
    ]);
  },
  rabbit: (g) => {
    ellipse(g, 50, 68, 27, 24);
    ellipse(g, 36, 27, 8.5, 25, -0.12);
    ellipse(g, 64, 27, 8.5, 25, 0.12);
    holes(g, () => {
      ellipse(g, 39, 63, 4.2, 5.5);
      ellipse(g, 61, 63, 4.2, 5.5);
      polygon(g, [
        [45, 73],
        [55, 73],
        [50, 80],
      ]);
    });
  },
  bear: (g) => {
    ellipse(g, 50, 58, 35, 32);
    ellipse(g, 21, 27, 14, 14);
    ellipse(g, 79, 27, 14, 14);
    holes(g, () => {
      ellipse(g, 36, 52, 4.5, 5.5);
      ellipse(g, 64, 52, 4.5, 5.5);
      ellipse(g, 50, 68, 8.5, 6.5);
    });
  },
  turtle: (g) => {
    ellipse(g, 50, 54, 26, 30);
    ellipse(g, 50, 14, 9.5, 12);
    ellipse(g, 19, 32, 8, 13, -0.8);
    ellipse(g, 81, 32, 8, 13, 0.8);
    ellipse(g, 19, 78, 8, 13, 0.8);
    ellipse(g, 81, 78, 8, 13, -0.8);
    polygon(g, [
      [45, 82],
      [55, 82],
      [50, 97],
    ]);
    holes(g, () =>
      polygon(g, [
        [50, 40],
        [62, 47],
        [62, 61],
        [50, 68],
        [38, 61],
        [38, 47],
      ])
    );
  },
  penguin: (g) => {
    ellipse(g, 50, 54, 25, 38);
    ellipse(g, 21, 58, 6.5, 21, 0.35);
    ellipse(g, 79, 58, 6.5, 21, -0.35);
    ellipse(g, 39, 94, 10, 4.5);
    ellipse(g, 61, 94, 10, 4.5);
    holes(g, () => {
      ellipse(g, 50, 66, 14, 21);
      ellipse(g, 42, 31, 3.6, 4);
      ellipse(g, 58, 31, 3.6, 4);
      polygon(g, [
        [45, 38],
        [55, 38],
        [50, 46],
      ]);
    });
  },
  owl: (g) => {
    ellipse(g, 50, 58, 29, 36);
    const tuft = [
      [23, 40],
      [22, 8],
      [44, 24],
    ];
    polygon(g, tuft);
    polygon(g, mirror(tuft));
    holes(g, () => {
      ellipse(g, 37, 44, 9.5, 9.5);
      ellipse(g, 63, 44, 9.5, 9.5);
      polygon(g, [
        [45, 56],
        [55, 56],
        [50, 65],
      ]);
    });
  },
  fish: (g) => {
    ellipse(g, 42, 50, 32, 20);
    polygon(g, [
      [68, 50],
      [96, 28],
      [96, 72],
    ]);
    polygon(g, [
      [34, 32],
      [50, 16],
      [58, 34],
    ]);
    holes(g, () => ellipse(g, 26, 45, 4, 4));
  },
};

export const SHAPE_TYPES = Object.keys(SHAPE_DRAWERS);

// 땅에 서 있는 수의사 (코 하나 = 글자 하나)
export const VET_ICON_COLORS: Record<string, string> = {
  H: '#4a342a', // 머리
  S: '#f2c9a0', // 피부
  E: '#1c1a18', // 눈
  C: '#f0a39a', // 볼
  M: '#c8564e', // 입
  W: '#f4ecdc', // 가운
  B: '#218bfc', // 수술복
  G: '#6b7480', // 청진기 줄
  T: '#cfd6e2', // 청진기 판
  P: '#2c4a78', // 바지
  K: '#1c1a18', // 신발
};

export const VET_ICON = [
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHSSSSSSSSHH..',
  '..HSSSSSSSSSSH..',
  '..HSSESSSSESSH..',
  '..SSSESSSSESSS..',
  '..SCSSSSSSSSCS..',
  '...SSSSMMSSSS...',
  '....SSSSSSSS....',
  '...WWGBBBBGWW...',
  '..WWWGWBBWGWWW..',
  '.WWWWGWWWWGWWWW.',
  '.WWSWWGWWGWWSWW.',
  '.SSWWWWTTWWWWSS.',
  '...WWWWTTWWWW...',
  '...WWWWWWWWWW...',
  '....PPP..PPP....',
  '....PPP..PPP....',
  '...KKKK..KKKK...',
];
