import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '마법진',
  description: '방울이 떨어진 자리에 마법진이 그려지고 그 위로 엑스칼리버가 솟는다.',
};

export default function Sigil() {
  return (
    <AsciiRoom>
      <AsciiStage name="sigil" />
    </AsciiRoom>
  );
}
