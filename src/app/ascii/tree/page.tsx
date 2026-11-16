import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '트리',
  description: '글자로 만든 트리가 돌고 전구 170개가 깜박인다.',
};

export default function Tree() {
  return (
    <AsciiRoom>
      <AsciiStage name="tree" />
    </AsciiRoom>
  );
}
