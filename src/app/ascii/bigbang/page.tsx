import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '별빛',
  description: '한 점에서 별 1,500개가 꼬리를 끌며 뻗어 나간다.',
};

export default function Bigbang() {
  return (
    <AsciiRoom>
      <AsciiStage name="bigbang" />
    </AsciiRoom>
  );
}
