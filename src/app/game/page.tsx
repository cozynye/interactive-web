import type { Metadata } from 'next';

import GameStage from '@/features/game/GameStage';

export const metadata: Metadata = {
  title: '글자 평원의 용',
  description: '글자로 그린 벌판에서 몰려오는 무리를 베며 버티는 생존 게임. 구슬을 모아 무기를 올리고 3분 뒤에 오는 용을 쓰러뜨린다.',
};

export default function Game() {
  return <GameStage />;
}
