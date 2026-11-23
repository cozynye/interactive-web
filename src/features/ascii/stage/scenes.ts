import { createDragonDemo } from '../../game/demo';
import { createBigbang } from './bigbang';
import { createBlackhole } from './blackhole';
import { createCapybara } from './capybara';
import { createFireworks } from './fireworks';
import { createGalaxy } from './galaxy';
import { Scene } from './grid';
import { createKnight } from './knight';
import { createNamsan } from './namsan';
import { createRose } from './rose';
import { createSigil } from './sigil';
import { createStarryNight } from './starryNight';
import { createTree } from './tree';
import { createZed } from './zed';

// 무대에 올릴 수 있는 장면 전부. 새 장면은 여기에 등록한다.
export const SCENES = {
  namsan: createNamsan,
  blackhole: createBlackhole,
  galaxy: createGalaxy,
  starryNight: createStarryNight,
  tree: createTree,
  fireworks: createFireworks,
  rose: createRose,
  bigbang: createBigbang,
  zed: createZed,
  knight: createKnight,
  sigil: createSigil,
  capybara: createCapybara,
  // 작품은 아니고, 홈 타일에 띄우는 게임 시연이다
  dragon: createDragonDemo,
} satisfies Record<string, () => Scene>;

export type SceneName = keyof typeof SCENES;
