import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './AsciiRoom.module.css';

// 작품 하나를 화면 가득 보여 주는 검은 방. 왼쪽 위에 목록으로 돌아가는 버튼이 있다.
// note는 화면 아래에 작게 적는 글(출처, 고지)이다.
function AsciiRoom({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <main className={styles.room}>
      {children}
      {note && <p className={styles.note}>{note}</p>}
      <Link href="/ascii" className={styles.back}>
        아스키 목록
      </Link>
    </main>
  );
}

export default AsciiRoom;
