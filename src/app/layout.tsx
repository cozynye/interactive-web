import type { Metadata } from 'next';

import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Playground', template: '%s · Playground' },
  description: '폭죽, 아스키 아트처럼 화면에서 움직이는 것들을 모아 둔 페이지.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
