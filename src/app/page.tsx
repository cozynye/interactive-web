import Link from 'next/link';

import FirePreview from '@/components/FirePreview';
import SiteNav from '@/components/SiteNav';
import AsciiStage from '@/features/ascii/stage/AsciiStage';
import ConvertPreview from '@/features/convert/ConvertPreview';

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

          <section className={`${styles.tile} ${styles.night}`}>
            <div className={styles.copy}>
              <h2 className={styles.title}>아스키</h2>
              <p className={styles.sub}>글자만으로 그린 그림과 움직임.</p>
              <Link href="/ascii" className={styles.pill}>
                아스키 목록 보기
              </Link>
            </div>
            <div className={styles.stage}>
              <AsciiStage name="starryNight" />
            </div>
          </section>

          <section className={`${styles.tile} ${styles.night}`}>
            <div className={styles.copy}>
              <h2 className={styles.title}>아스키 게임</h2>
              <p className={styles.sub}>
                글자로 그린 벌판에서 몰려오는 무리를 베며 버틴다.
                <br />
                구슬을 모아 무기를 올리고 3분 뒤에 오는 용을 쓰러뜨린다.
              </p>
              <Link href="/game" className={styles.pill}>
                글자 평원의 용 하기
              </Link>
            </div>
            <div className={styles.stage}>
              <AsciiStage name="dragon" />
            </div>
          </section>

          <section className={`${styles.tile} ${styles.night}`}>
            <div className={styles.copy}>
              <h2 className={styles.title}>사진을 글자로</h2>
              <p className={styles.sub}>
                사진을 올리면 모양이 닮은 글자로 다시 그린다.
                <br />
                글자로 복사하거나 PNG로 저장한다.
              </p>
              <Link href="/convert" className={styles.pill}>
                사진 바꿔 보기
              </Link>
            </div>
            <div className={styles.stage}>
              <ConvertPreview className={styles.still} />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
