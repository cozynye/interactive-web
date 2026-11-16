import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '별이 빛나는 밤',
  description: '고흐의 그림을 붓 자국 3,200개가 소용돌이를 따라 떠도는 흐름으로 옮겼다.',
};

export default function StarryNight() {
  return (
    <AsciiRoom>
      <AsciiStage name="starryNight" />
    </AsciiRoom>
  );
}
