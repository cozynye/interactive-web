import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '카피바라',
  description: '유자탕에 앉은 카피바라의 머리에 귤이 하나씩 쌓인다.',
};

export default function Capybara() {
  return (
    <AsciiRoom>
      <AsciiStage name="capybara" />
    </AsciiRoom>
  );
}
