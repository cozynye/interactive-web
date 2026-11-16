export interface KnitFireSky {
  id: string;
  n: string;
  c: string;
  g: string;
}

export interface KnitFireYarn {
  id: string;
  n: string;
  c: string[] | null;
}

export interface KnitFireSettings {
  sky: string;
  yarn: string;
  amount: number;
  sound: boolean;
}

export const SKIES: KnitFireSky[] = [
  { id: 'vetple', n: '벳플', c: '#012751', g: '#101c2c' },
  { id: 'night', n: '밤', c: '#1d2644', g: '#18261f' },
  { id: 'mid', n: '자정', c: '#17171d', g: '#0f1512' },
  { id: 'violet', n: '보랏빛', c: '#2a2140', g: '#1a1a26' },
  { id: 'dusk', n: '해질녘', c: '#3a2440', g: '#22202a' },
  { id: 'deep', n: '심해', c: '#102f3a', g: '#132021' },
  { id: 'wine', n: '와인', c: '#3a1622', g: '#1e1618' },
];

export const YARNS: KnitFireYarn[] = [
  { id: 'random', n: '랜덤', c: null },
  { id: 'vetple', n: '벳플', c: ['#218bfc', '#8fc7ff', '#f4ecdc'] },
  { id: 'red', n: '빨강', c: ['#e0453a'] },
  { id: 'orange', n: '주황', c: ['#ef7f34'] },
  { id: 'gold', n: '금실', c: ['#e9b949'] },
  { id: 'green', n: '초록', c: ['#3fae6c'] },
  { id: 'teal', n: '청록', c: ['#2aa7a4'] },
  { id: 'blue', n: '파랑', c: ['#4a7fe0'] },
  { id: 'purple', n: '보라', c: ['#9a6ae0'] },
  { id: 'pink', n: '분홍', c: ['#f07aa8'] },
  { id: 'cream', n: '크림', c: ['#f4ecdc'] },
  { id: 'silver', n: '은실', c: ['#cfd6e2'] },
  {
    id: 'rainbow',
    n: '무지개',
    c: ['#e0453a', '#ef8a2c', '#e8c53a', '#4caf6a', '#2f8fc2', '#7b56b8'],
  },
  { id: 'sunset', n: '노을', c: ['#e2503a', '#ef8a3d', '#f2c25a', '#ec7aa7'] },
  { id: 'sea', n: '바다', c: ['#2aa7a4', '#4a7fe0', '#9fd4dc', '#f1ece2'] },
  { id: 'candy', n: '사탕', c: ['#f28fb5', '#f6efe6', '#7fd6c0', '#f6c66e'] },
  { id: 'woods', n: '숲길', c: ['#3f9a5e', '#8fbf43', '#e0c85c', '#c47a3e'] },
  { id: 'berry', n: '베리', c: ['#c8325a', '#8a4ad0', '#f07aa8', '#f4ecdc'] },
  { id: 'spark', n: '폭죽', c: ['#f4ecdc', '#e9b949', '#e0453a'] },
];

export const KNIT_FIRE_STORAGE_KEY = 'vetplace-knitfire-v1';
export const KNIT_FIRE_LOGO_SRC = '/asset/images/vet-logo.svg';
// 불꽃 양 슬라이더 범위 (0 = 자동 꺼짐)
export const KNIT_FIRE_AMOUNT_MAX = 10;
export const KNIT_FIRE_TEXT_MAX = 40;

export function loadKnitFireSettings(): KnitFireSettings {
  const settings: KnitFireSettings = {
    sky: 'vetple',
    yarn: 'random',
    amount: 4,
    sound: true,
  };
  try {
    const saved = JSON.parse(
      localStorage.getItem(KNIT_FIRE_STORAGE_KEY) || 'null'
    );
    if (saved) Object.assign(settings, saved);
  } catch (e) {
    // 저장값을 못 읽으면 기본값으로 시작
  }
  return settings;
}
