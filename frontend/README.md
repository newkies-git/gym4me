# Gym4me Frontend

Vue 3 기반 헬스장·PT 관리 웹 앱 클라이언트입니다.

## 기술 스택

- **Vue 3** (Composition API)
- **Vite 7** · **TypeScript**
- **Vue Router 5** · **Pinia**
- **vue-i18n** (한/영)
- **Chart.js** · **vue-chartjs**
- **Firebase** (Auth, Firestore)
- **PWA**: vite-plugin-pwa

스타일은 전역 CSS(`src/index.css`)와 Berry 테마 변수·테마 프리셋 8종을 사용합니다.

## 요구 사항

- Node.js 18+
- npm

## 설치 및 실행

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

## 스크립트

| 명령 | 설명 |
| :--- | :--- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (vue-tsc + vite build) |
| `npm run preview` | 빌드 결과물 미리보기 |
| `npm run type-check` | 타입 검사만 수행 (vue-tsc --noEmit) |
| `npm run test:unit` | 단위 테스트 (Vitest) |
| `npm run init:admin` | 초기 Site Admin 계정 생성 (환경 변수 필요) |

## 환경 변수

Firebase 설정을 위해 `.env`에 다음 변수를 설정합니다.

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

`init:admin` 사용 시 Admin 이메일/비밀번호 등 추가 변수는 `init_admin.mjs`를 참고하세요.

## 소스 구조 (요약)

```
src/
├── App.vue              # 루트 레이아웃, GNB, 테마
├── main.ts
├── index.css            # 전역·테마 변수
├── router/              # 라우트 정의, 가드
├── stores/              # Pinia (auth, schedule, class, client, profile, theme, ui)
├── views/               # 페이지 뷰 (Auth, Home, Calendar, Courses, Profile 등)
├── components/          # home, courses, calendar, profile, gym, ui
├── layouts/             # AdminLayout
├── services/            # firebaseService, courseService, toolService
├── composables/         # useGnb, useSimulatePurchase
├── theme/               # 테마 정의 (themes.ts)
├── i18n/                # ko, en
├── firebase/            # config
├── types/               # 공통 타입
├── constants/
└── utils/
```

## 관련 문서

- 프로젝트 전체: [../README.md](../README.md)
- 기능 명세·요구사항 대비: [../FUNCTIONS.md](../FUNCTIONS.md)
- 할 일: [../TO-DO.md](../TO-DO.md)
- 모바일 배포: [../Deployment_Mobile.md](../Deployment_Mobile.md)
