import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '남산',
  description: '남산타워를 바라보는 두 사람의 뒷모습 위로 불꽃이 터진다.',
};

export default function Namsan() {
  return (
    <AsciiRoom>
      <AsciiStage name="namsan" />
    </AsciiRoom>
  );
}
