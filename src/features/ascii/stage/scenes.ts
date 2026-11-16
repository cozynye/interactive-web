import { createBigbang } from './bigbang';
import { createFireworks } from './fireworks';
import { createGalaxy } from './galaxy';
import { Scene } from './grid';
import { createNamsan } from './namsan';
import { createRose } from './rose';
import { createStarryNight } from './starryNight';
import { createTree } from './tree';

// 무대에 올릴 수 있는 장면 전부. 새 장면은 여기에 등록한다.
export const SCENES = {
  namsan: createNamsan,
  galaxy: createGalaxy,
  starryNight: createStarryNight,
  tree: createTree,
  fireworks: createFireworks,
  rose: createRose,
  bigbang: createBigbang,
} satisfies Record<string, () => Scene>;

export type SceneName = keyof typeof SCENES;
