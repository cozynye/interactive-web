import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '남산',
  description: '능선 세 겹의 남산과 불 켜진 동네 너머로 타워를 바라보는 두 사람.',
};

export default function Namsan() {
  return (
    <AsciiRoom>
      <AsciiStage name="namsan" />
    </AsciiRoom>
  );
}
