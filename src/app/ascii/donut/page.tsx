import type { Metadata } from 'next';

import AsciiDonut from '@/features/ascii/AsciiDonut';
import AsciiRoom from '@/features/ascii/AsciiRoom';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: '도넛',
  description: '글자 열두 개로 음영을 넣은 도넛이 두 축으로 돈다.',
};

export default function Donut() {
  return (
    <AsciiRoom>
      <AsciiDonut cols={80} rows={30} className={styles.art} />
    </AsciiRoom>
  );
}
