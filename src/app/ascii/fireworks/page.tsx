import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '강변 불꽃놀이',
  description: '도시 위로 터진 불꽃이 강물에 비쳐 일렁인다.',
};

export default function Fireworks() {
  return (
    <AsciiRoom>
      <AsciiStage name="fireworks" />
    </AsciiRoom>
  );
}
