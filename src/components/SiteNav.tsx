import Link from 'next/link';

import styles from './SiteNav.module.css';

function SiteNav() {
  return (
    <header className={styles.nav}>
      <nav className={styles.inner} aria-label="주요 메뉴">
        <Link href="/" className={styles.brand}>
          Playground
        </Link>
        <div className={styles.links}>
          <Link href="/fire">불꽃놀이</Link>
          <Link href="/ascii">아스키</Link>
        </div>
      </nav>
    </header>
  );
}

export default SiteNav;
