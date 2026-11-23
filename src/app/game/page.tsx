import type { Metadata } from 'next';

import GameStage from '@/features/game/GameStage';

export const metadata: Metadata = {
  title: '글자 평원의 용',
  description: '글자로 그린 풀밭에서 용 한 마리와 싸우는 보스전. 붉게 차오르는 바닥을 피하고 틈이 날 때 벤다.',
};

export default function Game() {
  return <GameStage />;
}
