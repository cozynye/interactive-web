@AGENTS.md

# web-playground

폭죽, 아스키 아트처럼 화면에서 움직이는 효과를 경로별로 모아 두는 Next.js 사이트.

## 스택

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- 패키지 매니저는 pnpm
- 스타일은 CSS Modules. 불꽃놀이만 원본 구조를 유지하려고 `.fire-page` 아래에 묶은 일반 CSS를 쓴다.
- 글꼴은 `pretendard` 패키지(자체 호스팅)

## 실행

```
pnpm install
pnpm dev      # http://localhost:3939
pnpm build
pnpm lint
```

## 구조

```
src/
├── app/                  # 경로
│   ├── page.tsx          # 홈: 효과별 타일
│   ├── fire/             # /fire  (FireLoader가 클라이언트에서만 불러온다)
│   └── ascii/            # /ascii 목록, /ascii/<slug> 개별 작품
├── components/           # 여러 경로가 같이 쓰는 것 (SiteNav, 홈 타일용 FirePreview)
└── features/
    ├── fire/             # 불꽃놀이 엔진과 화면
    └── ascii/            # 아스키 작품 계산식, 컴포넌트, 목록(asciiList.ts)
```

## 규칙

- 새 효과는 `src/app/<경로>/`에 페이지를 만들고 홈(`src/app/page.tsx`)에 타일을 추가한다.
- 아스키 작품은 `src/features/ascii/asciiList.ts`에 한 줄 추가하고 `src/app/ascii/<slug>/page.tsx`를 만든다. 목록 카드의 미리보기는 `src/app/ascii/page.tsx`의 `PREVIEWS`에 등록한다.
- `src/features/fire/`는 다른 프로젝트에서 옮겨 온 코드라 린트 규칙 일부를 풀어 두었다(`eslint.config.mjs`). 엔진은 React와 분리된 `createKnitFire()` 하나로 동작하고, `window`·`localStorage`에 의존해서 서버에서 그리지 않는다.
- 계속 도는 애니메이션은 화면 밖에서 멈추고 `prefers-reduced-motion`에서는 정지 장면만 보여 준다.
