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
pnpm check    # lint + typecheck + test 를 한 번에 (고친 뒤에는 이것부터)
```

## 구조

```
src/
├── app/                  # 경로
│   ├── page.tsx          # 홈: 효과별 타일
│   ├── fire/             # /fire  (FireLoader가 클라이언트에서만 불러온다)
│   └── ascii/            # /ascii 목록, /ascii/<slug> 개별 작품
├── components/           # 여러 경로가 같이 쓰는 것 (SiteNav, 홈 타일용 FirePreview)
├── lib/                  # 재생 상태머신(runState)과 티커
└── features/
    ├── fire/             # 불꽃놀이 엔진과 화면
    ├── ascii/            # 아스키 작품 계산식, 컴포넌트, 목록(asciiList.ts)
    └── game/             # /game 보스전: 규칙(engine.ts), 그리기(draw.ts), 입력(controls.ts), 캔버스 렌더러(ink.ts), 화면(GameStage.tsx), 홈 타일 시연(demo.ts)
```

## 상태 확인

- 상태를 가진 코드를 고치기 전에 `docs/state-machines.md`를 읽는다. 어떤 변수가 상태 노릇을 하는지 정리되어 있다.
- 브라우저에서 확인할 때는 스크린샷보다 속성을 먼저 읽는다. 계속 도는 애니메이션은 요소의 `data-state`(`still`/`paused`/`playing`)에, 불꽃놀이 화면은 `.fire-page`의 `data-panel`·`data-ground`·`data-hint`에 지금 상태가 적혀 있다.
- 아스키 장면은 화면 없이 테스트가 돌린다(`src/features/ascii/stage/__tests__/scenes.test.ts`). `scenes.ts`에 등록하면 자동으로 검사 대상이 된다.
- `next build`와 `next dev`는 동시에 돌려도 되지만, `next start`가 떠 있는 채로 다시 빌드하면 파일을 못 찾는다. 다시 띄운다.

## 규칙

- 새 효과는 `src/app/<경로>/`에 페이지를 만들고 홈(`src/app/page.tsx`)에 타일을 추가한다.
- 색이 들어가는 아스키 장면은 `src/features/ascii/stage/`에 `Scene`(매 프레임 `Grid`를 채우는 함수)으로 만들고 `scenes.ts`의 `SCENES`에 등록한다. 칸 폭은 기본 6px이고 장면이 `cell`로 바꾼다. 입체로 보여야 하는 물체는 `put`에 조각 번호(`part`)를 넘기면 무대가 `Grid.finish()`에서 윤곽선과 속 글자를 넣고, 가장 밝은 점에는 `rays()`로 빛살을 그린다. 면의 굴곡을 명암으로 보여야 하는 덩어리(카피바라, 게임의 용)는 `relief.ts`의 `relief()`에 높이 함수를 넘기거나 `grid.ts`의 `lit()`·`tone()`을 직접 쓴다. 점을 뿌리기 어려운 장면(블랙홀)은 칸마다 값을 계산해 채운다. 색은 장면마다 두세 가지로 제한하고, 같은 경로를 되풀이하지 않도록 주기가 서로 다른 흔들림이나 난수 재시작을 섞는다.
- 아스키 작품은 `src/features/ascii/asciiList.ts`에 한 줄 추가하고 `src/app/ascii/<slug>/page.tsx`를 만든다. 목록 카드의 미리보기는 `src/app/ascii/page.tsx`의 `PREVIEWS`에 등록한다.
- `src/features/fire/`는 다른 프로젝트에서 옮겨 온 코드라 린트 규칙 일부를 풀어 두었다(`eslint.config.mjs`). 엔진은 React와 분리된 `createKnitFire()` 하나로 동작하고, `window`·`localStorage`에 의존해서 서버에서 그리지 않는다.
- 게임 규칙은 `src/features/game/engine.ts`의 `update()`에만 둔다. DOM을 건드리지 않는 순수한 코드라서 `__tests__/engine.test.ts`가 화면 없이 돌린다. 게임 화면은 지금 단계를 `main`의 `data-phase`(`title`/`fight`/`won`/`lost`)에 적는다. 게임만은 `createTicker`를 쓰지 않고 자체 루프를 돈다(움직임 줄이기가 켜져 있어도 게임은 해야 하기 때문이고, 그때는 화면 흔들림만 끈다).
- 계속 도는 애니메이션은 직접 `requestAnimationFrame`을 돌리지 않고 `src/lib/ticker.ts`의 `createTicker`를 쓴다. 화면 밖 정지와 `prefers-reduced-motion` 처리가 거기에 있다.
