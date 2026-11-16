import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '블랙홀',
  description: '그림자를 두른 빛의 고리와 그 둘레를 도는 가스 원반.',
};

export default function Blackhole() {
  return (
    <AsciiRoom>
      <AsciiStage name="blackhole" />
    </AsciiRoom>
  );
}
