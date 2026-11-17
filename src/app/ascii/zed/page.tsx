import type { Metadata } from 'next';

import AsciiRoom from '@/features/ascii/AsciiRoom';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

export const metadata: Metadata = {
  title: '제드 대 제드',
  description: '2013년 결승 5세트의 제드 맞대결을 글자로 다시 연출했다.',
};

export default function Zed() {
  return (
    <AsciiRoom note="제드 대 제드 was created under Riot Games' &quot;Legal Jibber Jabber&quot; policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.">
      <AsciiStage name="zed" />
    </AsciiRoom>
  );
}
