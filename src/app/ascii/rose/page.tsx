import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '장미',
  description: '줄기가 자라고 봉오리가 8초에 걸쳐 벌어진다.',
};

export default function Rose() {
  return (
    <AsciiRoom>
      <AsciiStage name="rose" />
    </AsciiRoom>
  );
}
