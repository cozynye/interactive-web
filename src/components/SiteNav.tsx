import Link from 'next/link';

import styles from './SiteNav.module.css';

function SiteNav() {
  return (
    <header className={styles.nav}>
      <nav className={styles.inner} aria-label="주요 메뉴">
        <Link href="/" className={styles.brand}>
          Playground
        </Link>
      </nav>
    </header>
  );
}

export default SiteNav;
