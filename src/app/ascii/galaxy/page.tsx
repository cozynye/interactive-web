import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '은하',
  description: '별 7,000개가 제각기 떠도는 나선 은하를 기울기를 바꿔 가며 본다.',
};

export default function Galaxy() {
  return (
    <AsciiRoom>
      <AsciiStage name="galaxy" />
    </AsciiRoom>
  );
}
