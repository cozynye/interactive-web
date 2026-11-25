import type { Metadata } from 'next';

import SiteNav from '@/components/SiteNav';
import Converter from '@/features/convert/Converter';

export const metadata: Metadata = {
  title: '사진을 글자로',
  description: '사진을 올리면 모양이 닮은 글자를 골라 글자 그림으로 바꾸고, 글자나 PNG로 내보낸다.',
};

export default function Convert() {
  return (
    <>
      <SiteNav />
      <Converter />
    </>
  );
}
