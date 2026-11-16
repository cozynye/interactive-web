# 상태머신 지도

이 앱에서 "지금 어떤 상태인가"를 가지고 있는 곳을 전부 모은 문서다. 명시적으로 고친 것과 일부러 그대로 둔 것을 나눠 적었고, 그대로 둔 것은 어떤 변수가 상태 노릇을 하는지 적어 두었다. 상태를 건드리는 코드를 고치기 전에 여기서 해당 항목을 먼저 확인한다.

## 명시적으로 만든 것

### 애니메이션 재생 상태 (`src/lib/runState.ts`, `src/lib/ticker.ts`)

홈의 불꽃 미리보기, 아스키 무대, 도넛이 모두 같은 상태머신을 쓴다.

```
입력: reducedMotion, onscreen, pageVisible

still    움직임 줄이기가 켜져 있다. 정지 장면 한 장만 그린다.
paused   화면 밖이거나 탭이 가려졌다. 시간도 흐르지 않는다.
playing  그리는 중.

reducedMotion        → still
!onscreen 또는 !pageVisible → paused
그 밖                 → playing
```

상태는 입력 세 개로만 정해지고(`runStateOf`), `createTicker`가 입력을 지켜보다가 루프를 켜고 끈다. 지금 상태는 해당 요소의 `data-state` 속성에 적힌다. 전에는 컴포넌트 세 개가 `raf`, `visible`, `still` 변수로 같은 일을 각자 했고, 움직임 줄이기 설정은 처음 한 번만 읽었으며, 도넛은 화면 밖에서도 루프가 돌았다.

### 불꽃놀이 화면 (`src/features/fire/FirePage.tsx`)

| 상태 | 값 | 바깥에서 읽는 곳 |
|---|---|---|
| 열린 패널 | `yarn` / `sky` / 없음 | `.fire-page[data-panel]` |
| 땅 글씨 | 있음 / 없음 (쏘아 올리기 버튼이 보이는 조건) | `.fire-page[data-ground]` |
| 안내 문구 | 보임 → 사라짐 (되돌아가지 않는다) | `.fire-page[data-hint]` |
| 토스트 | 숨김 → 보임 → 숨김 | `useToast` 훅, `.toast.on` |

토스트는 `useToast`가 타이머 하나로 관리한다. 보이는 중에 다시 띄우면 시간을 처음부터 다시 센다.

### 장미의 한 주기 (`src/features/ascii/stage/rose.ts`)

`grow`(0~2.4초) → `bloom`(2.4~10.4초) → `full` → `fade`(마지막 1.4초) 순서로 28초마다 되풀이한다. 경계는 파일 위쪽 상수에 있고 `rosePhase()`가 이름을 돌려준다.

### 경로

`/` ↔ `/fire`, `/` ↔ `/ascii` ↔ `/ascii/<slug>`. 모든 화면에 돌아가는 길이 있다(불꽃놀이의 "홈" 버튼, 아스키 작품의 "아스키 목록" 버튼, 그 밖은 상단 내비게이션).

## 그대로 둔 것

`src/features/fire/knitFireEngine.ts`는 다른 프로젝트에서 옮겨 온 2,100줄짜리 엔진이고 자동 테스트가 없다. 안의 상태머신을 열거형으로 다시 짜면 원본과 벌어져서 원본의 수정 사항을 가져오기 어려워지므로, 구조는 두고 어떤 변수가 상태인지만 적는다.

| 상태머신 | 상태 | 상태를 담은 변수 |
|---|---|---|
| 엔진 수명 | 시작 전 → 도는 중 → 정리됨 | `raf`, `destroyed` |
| 자동 발사 | 쏘는 중 / 쉬는 중 / 꺼짐 | `nextAuto`, `quietUntil`, `S.amount`, `document.hidden` |
| 화면 청소 | 평소 → 차례가 됨(자동 발사 멈춤) → 비움 | `cleanAt`(-1이면 평소), `lastClean`, `launchCount` |
| 글자 발사 간격 | 쏠 수 있음 / 0.25초 대기 | `lastLaunch` |
| 누르고 있기 | 뗌 → 누름 → 0.32초 뒤 연발 | `hold`(null이면 뗌), `holdTimer` |
| 소리 | 없음 → 만들어짐 → 재생 가능 | `AC`, `AC.state`, `S.sound` |
| 입자 | `free` / `fly`(날아감 → 머무름 → 풀림) / `gather` | `Part.mode`, `age`·`dur`·`hold` |
| 한글 조합 중 엔터 | 조합 중이면 30ms 뒤에 쏜다 | `e.isComposing` |

엔진에서 바꾼 것은 한 가지다. 전에는 로고 이미지가 로드되거나 실패해야 시작했기 때문에 응답이 오지 않으면 화면이 빈 채로 멈췄다. 지금은 기다리지 않고 시작하고, 로고가 준비되기 전의 로고 불꽃은 하트로 대신한다(이 대체 동작은 원래 있던 것이다).

설정값(실, 하늘, 불꽃 양, 소리)은 엔진의 `S`, React의 `settings`, `localStorage` 세 곳에 있고 `FirePage`의 핸들러가 엔진과 React를 같이 고쳐서 맞춘다. 설정 항목을 늘릴 때는 세 곳을 모두 고쳐야 한다.

아스키 장면 안의 입자(불꽃 탄, 불티, 붓 자국, 별똥별)는 `life`가 0이 되면 사라지거나 다시 시작하는 단순한 수명 주기라서 따로 이름을 붙이지 않았다.
