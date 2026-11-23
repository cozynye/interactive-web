import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '기사',
  description: '모닥불 앞에 앉은 기사의 스카프와 망토가 바람 세기를 따라 날린다.',
};

export default function Knight() {
  return (
    <AsciiRoom>
      <AsciiStage name="knight" />
    </AsciiRoom>
  );
}
