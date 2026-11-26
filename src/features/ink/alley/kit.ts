// 한옥 골목 장면이 같이 쓰는 치수와 색, 시각 계산. DOM을 건드리지 않는다.

export const W = 960;
export const H = 480;
// 담과 집이 서는 땅의 높이. 그 아래는 골목 바닥이다.
export const GROUND = 392;
// 인물 크기(인물 공간 95 → 장면 약 68, 담보다 머리 하나 크다)와 그에 맞춘 펜 굵기
export const SCALE = 0.72;
export const LINE = 0.9;
export const FINE = 0.46;
// 하루가 지나가는 데 걸리는 시간(초)과 처음 시각(0 자정, 0.5 정오). 오후에 시작해서 1분 안에 해가 진다.
export const DAY = 180;
export const START = 0.66;

export const COLOR = {
  red: '#b3412d',
  blue: '#2f4a7a',
  jade: '#4f7f6a',
  mustard: '#c79a3a',
  persimmon: '#d9772b',
  jar: '#5c4033',
  wood: '#8a6a4a',
  warm: '#ffc66b',
};

export type Period = '밤' | '새벽' | '아침' | '낮' | '저녁';

const wrap = (tau: number) => ((tau % 1) + 1) % 1;

// 하루 중 시각(0~1)을 "오후 3:50"처럼 적는다
export function clock(tau: number) {
  const minutes = Math.floor(wrap(tau) * 1440);
  const h = Math.floor(minutes / 60);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(minutes % 60).padStart(2, '0')}`;
}

export function period(tau: number): Period {
  const u = wrap(tau);
  if (u < 0.2 || u >= 0.8) return '밤';
  if (u < 0.27) return '새벽';
  if (u < 0.42) return '아침';
  if (u < 0.7) return '낮';
  return '저녁';
}

// 해와 달이 지나는 길. a는 뜨는 쪽 0에서 지는 쪽 1까지이고, 양 끝은 지붕 뒤로 내려간다.
export const ARC = { x0: 90, span: 780 };
export const arc = (a: number): [number, number] => [ARC.x0 + ARC.span * a, 250 - 190 * Math.sin(Math.PI * a)];

// 해는 0.25(해돋이)~0.75(해넘이) 동안, 달은 나머지 동안 떠 있다. 떠 있지 않으면 null이다.
export const sunAt = (tau: number) => {
  const u = wrap(tau);
  return u >= 0.25 && u < 0.75 ? (u - 0.25) / 0.5 : null;
};
export const moonAt = (tau: number) => {
  const u = wrap(tau);
  return u >= 0.75 || u < 0.25 ? wrap(u - 0.75) / 0.5 : null;
};
// 끌어 놓은 자리(a)를 시각으로 되돌린다
export const tauOf = (body: 'sun' | 'moon', a: number) => wrap((body === 'sun' ? 0.25 : 0.75) + a * 0.5);
