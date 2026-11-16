import type { Metadata } from 'next';
import Link from 'next/link';

import AsciiDonut from '@/features/ascii/AsciiDonut';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: '도넛',
  description: '글자 열두 개로 음영을 넣은 도넛이 두 축으로 돈다.',
};

export default function Donut() {
  return (
    <main className={styles.room}>
      <Link href="/ascii" className={styles.back}>
        아스키 목록
      </Link>
      <AsciiDonut cols={80} rows={30} className={styles.art} />
    </main>
  );
}
