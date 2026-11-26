import type { Metadata } from 'next';
import Link from 'next/link';

import InkAlley from '@/features/ink/InkAlley';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: '한옥 골목',
  description: '펜 선으로 그린 한옥 골목. 사람들이 오가고 해가 지면 창과 청사초롱에 불이 켜진다.',
};

export default function Alley() {
  return (
    <main className={styles.room}>
      <div className={styles.frame}>
        <InkAlley />
      </div>
      <Link href="/" className={styles.back}>
        홈
      </Link>
    </main>
  );
}
