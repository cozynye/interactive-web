import Link from 'next/link';

import FirePreview from '@/components/FirePreview';
import SiteNav from '@/components/SiteNav';
import AsciiDonut from '@/features/ascii/AsciiDonut';

import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <section className={styles.intro}>
          <h1 className={styles.headline}>화면에서 움직이는 것들.</h1>
          <p className={styles.lede}>
            폭죽을 쏘고, 글자로 그림을 그린다. 하나씩 만들어 여기에 모은다.
          </p>
        </section>

        <div className={styles.tiles}>
          <section className={`${styles.tile} ${styles.night}`}>
            <FirePreview className={styles.sky} />
            <div className={styles.copy}>
              <h2 className={styles.title}>불꽃놀이</h2>
              <p className={styles.sub}>
                하늘을 누르면 뜨개질한 폭죽이 올라간다.
                <br />
                글자를 쓰면 글자 모양으로 터진다.
              </p>
              <Link href="/fire" className={styles.pill}>
                불꽃놀이 열기
              </Link>
            </div>
          </section>

          <section className={`${styles.tile} ${styles.day}`}>
            <div className={styles.copy}>
              <h2 className={styles.title}>아스키</h2>
              <p className={styles.sub}>글자만으로 그린 그림과 움직임.</p>
              <Link href="/ascii" className={styles.pill}>
                아스키 목록 보기
              </Link>
            </div>
            <div className={styles.stage}>
              <AsciiDonut cols={48} rows={20} className={styles.donut} />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
