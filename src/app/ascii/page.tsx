import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import SiteNav from '@/components/SiteNav';
import AsciiDonut from '@/features/ascii/AsciiDonut';
import { ASCII_LIST } from '@/features/ascii/asciiList';
import AsciiStage from '@/features/ascii/stage/AsciiStage';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: '아스키',
  description: '글자만으로 그린 그림과 움직임 목록.',
};

// 카드에 넣는 작은 미리보기. 없는 항목은 이름만 보인다.
const PREVIEWS: Record<string, ReactNode> = {
  zed: <AsciiStage name="zed" />,
  blackhole: <AsciiStage name="blackhole" />,
  namsan: <AsciiStage name="namsan" />,
  'starry-night': <AsciiStage name="starryNight" />,
  galaxy: <AsciiStage name="galaxy" />,
  tree: <AsciiStage name="tree" />,
  fireworks: <AsciiStage name="fireworks" />,
  rose: <AsciiStage name="rose" />,
  bigbang: <AsciiStage name="bigbang" />,
  donut: <AsciiDonut cols={48} rows={18} className={styles.art} />,
};

export default function AsciiIndex() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.headline}>아스키</h1>
        <p className={styles.lede}>
          글자만으로 그린 그림과 움직임. 눌러서 크게 본다.
        </p>
        <ul className={styles.grid}>
          {ASCII_LIST.map((item) => (
            <li key={item.slug}>
              <Link href={`/ascii/${item.slug}`} className={styles.card}>
                <div className={styles.preview}>{PREVIEWS[item.slug]}</div>
                <h2 className={styles.name}>{item.name}</h2>
                <p className={styles.desc}>{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
