import type { Metadata } from 'next';

import FireLoader from './FireLoader';

export const metadata: Metadata = {
  title: '불꽃놀이',
  description: '하늘을 누르면 뜨개질 코로 짠 폭죽이 올라가고, 글자를 쓰면 글자 모양으로 터진다.',
};

export default function Fire() {
  return <FireLoader />;
}
