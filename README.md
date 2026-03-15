# Gym4me

헬스장 관리, 트레이너-회원 매칭, PT 일정 및 운동 기록 관리를 위한 플랫폼입니다.

## 1. 개요

- **Frontend**: Vue 3, Vite 7, TypeScript, Pinia, Vue Router, vue-i18n, Chart.js, Firebase
- **스타일**: 전역 CSS (`index.css`), Berry 테마 변수, 테마 프리셋 8종
- **Backend/DB**: Firebase (Authentication, Firestore)
- **배포**: Vercel (Frontend), 참고 문서 `Deployment_Mobile.md`

## 2. 사용자 역할 및 권한

| 역할 (Role)   | 레벨 (Lvl) | 설명 |
| :---          | :---:      | :--- |
| **SITE_ADMIN** | 100 | 시스템 전체 관리, 매니저/직원 관리, 감사 로그 |
| **MANAGER**    | 20  | 지점(Gym) 관리, 트레이너 채용·관리, 지점 회원 |
| **TRAINER**    | 10  | 클라이언트/클래스/강좌 관리, 일정 예약, PT 세션 완료 |
| **MEMBER**     | 5   | 개인 일정, 운동 기록, 수강권·바디 프로필 |
| **OBSERVER**   | 1   | 가입 초기·승인 대기, 기능 제한 |

## 3. 라우트 (사이트 구조)

| 경로 | 인증 | 권한 | 설명 |
| :--- | :---: | :--- | :--- |
| `/` | - | - | 랜딩(Home). 로그인 시 `/home` 리다이렉트 |
| `/auth` | - | - | 로그인·회원가입 |
| `/terms` | - | - | 이용약관 |
| `/privacy` | - | - | 개인정보처리방침 |
| `/complete-profile` | 필수 | Member/Observer | 최초 로그인 시 추가정보(이름, 전화, Gym) |
| `/home` | 필수 | - | 역할별 홈(진입 기본). SiteAdminHome / ManagerHome / TrainerHome / MemberHome |
| `/dashboard` | 필수 | - | `/home`으로 리다이렉트 (추후 분석용 예약) |
| `/calendar` | 필수 | - | 일정(개인/클래스/강좌) 조회·등록 |
| `/courses` | 필수 | - | 강좌 목록·생성·수정·삭제 |
| `/profile` | 필수 | - | 신체 프로필(바디) |
| `/user-info` | 필수 | - | 계정 설정(프로필·비밀번호) |
| `/settings` | - | - | `/user-info` 리다이렉트 |
| `/tool-usage` | 필수 | - | 기구 사용법 영상·이미지 |
| `/trainer-profile` | 필수 | Trainer+ | 트레이너 소개·전문분야 |
| `/manage-trainers` | 필수 | Manager+ | 트레이너 관리 |
| `/manage-gym` | 필수 | Manager+ | Gym 관리 |
| `/gym/members` | 필수 | Manager+ | 지점 회원 |
| `/admin` | 필수 | SiteAdmin | 매니저/직원 관리. 자식: `managers`, `staff` |

## 4. Firestore 컬렉션

| 컬렉션 | 용도 |
| :--- | :--- |
| **users** | 이메일, 역할, 레벨, 소속 Gym, 수강권·만료일, 프로필 완료 여부 등 |
| **gyms** | 지점명, 위치, 전화, 매니저 이메일 |
| **classes** | 트레이너 그룹 수업(GymClass), 참여 회원 |
| **schedules** | 캘린더 이벤트(개인PT/클래스, 상태, 서명, 운동 기록) |
| **workoutLogs** | 세션별 운동 상세(종목, 세트, 무게, 횟수) |
| **bodyProfiles** | 회원 신체 데이터(체중, 체지방 등) |
| **ticketHistory** | 수강권 차감·충전 이력 |
| **trainerProfiles** | 트레이너 소개·전문분야·경력 |
| **profileHistory** | 트레이너 프로필 변경 이력 |
| **adminAuditLogs** | 관리자 작업 이력 |
| **toolUsage** | 기구 사용법 영상·이미지 |
| **courses** | 강좌(강사, Gym, 일정, 참석자) |
| **courseApplications** | 강좌 참석 신청 |

## 5. Pinia 스토어

| 스토어 | 용도 |
| :--- | :--- |
| **auth** | 로그인 상태, 사용자 정보·권한(lvl), needsMemberProfile |
| **scheduleStore** | 일정 캐시·CRUD, 강좌→캘린더 이벤트 병합 |
| **classStore** | 클래스·참여자 |
| **clientStore** | 트레이너 담당 회원·수강권 |
| **profileStore** | 바디/트레이너 프로필 |
| **themeStore** | 테마 프리셋 선택·localStorage |
| **uiStore** | 토스트·로딩 |

## 6. 실행 방법

```bash
cd frontend
npm install
npm run dev
```

- **빌드**: `npm run build`
- **테스트**: `npm run test:unit`
- **관리자 초기화**: `npm run init:admin` (환경 변수 참고)
- 환경 변수: Firebase용 `VITE_*` 등 `.env` 참고

## 7. 관련 문서

- **FUNCTIONS.md**: 구현 기능 상세 및 요구사항 대비 비교
- **TO-DO.md**: 향후 구현·보완 할 일
- **Deployment_Mobile.md**: 모바일 배포 가이드
