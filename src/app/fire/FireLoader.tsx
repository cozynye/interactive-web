'use client';

import dynamic from 'next/dynamic';

// 저장된 설정(localStorage)과 캔버스에만 의존하는 화면이라 서버에서는 그리지 않는다
const FirePage = dynamic(() => import('@/features/fire/FirePage'), {
  ssr: false,
  // 코드를 받는 동안 흰 화면 대신 밤하늘 색을 깔아 둔다
  loading: () => (
    <div style={{ position: 'fixed', inset: 0, background: '#14213d' }} />
  ),
});

export default function FireLoader() {
  return <FirePage />;
}
