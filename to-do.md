# Gym4me TO-DO

## 1. UI 개선

- [x] **캘린더 2주 보기**: 2주(14일) 그리드·기간 라벨 구현됨 (`CalendarView.vue`)
- [x] **캘린더 네비게이션**: 이전/다음 주 이동·오늘 버튼 구현됨
- [ ] **거절(Reject) 시 Trainee 알림**: 일정 거절 시 사유 입력·상태 저장·UI 표시는 구현됨. 거절 시 회원(Trainee)에게 메일/푸시 알림 미구현
- [ ] **로딩/에러 일관성**: 주요 뷰에서 로딩·에러 상태 표시 방식 통일 (일부만 `loading`/에러 메시지 사용)

## 2. 기능 추가

- [ ] **매니저 알림**: 잔여 N회 이하 회원 리스트, 메일/푸시 발송 (FCM 또는 EmailJS)
- [ ] **트레이너 프로필 확장**: 수상 이력 등 정형 필드 및 공개 UI
- [ ] **Gym 정보**: 지점 로고·사진 업로드

## 3. 모델/데이터

- [ ] **users**: 트레이너 경력·수상 상세 필드 보완
- [ ] **명칭**: 바디 프로필 ↔ MyProfile/InBody 통일

## 4. 분석/대시보드

- [ ] **/dashboard 전용**: 통계·분석 화면 (현재는 `/home` 리다이렉트)

## 5. 보안·가드

- [ ] **비밀번호 변경 의무**: 초기 관리자 비밀번호 변경 전 메뉴 제한 유지 확인
- [ ] **권한 없는 경로**: `/home` 리다이렉트 동작 확인
- [ ] **Firestore 규칙**: `bodyProfiles`, `trainerProfiles`, `profileHistory`, `toolUsage` 컬렉션에 대한 읽기/쓰기 규칙 명시 (현재 catch-all만 있어 클라이언트 쓰기가 거부될 수 있음)

## 6. 품질·운영

- [ ] **환경 변수 검증**: 앱 기동 시 필수 `VITE_FIREBASE_*` 등 누락 시 경고 또는 실패 처리
- [ ] **단위 테스트 확대**: `firebaseService`, `AuthView`, `HomeView` 외 서비스·스토어·핵심 컴포넌트 테스트 추가
- [ ] **에러 처리 일원화**: API/스토어 실패 시 `extractErrorMessage`·`uiStore.showToast` 등으로 사용자 메시지 통일
- [ ] **PWA**: 오프라인/캐시 전략 정리 및 필요 시 workbox 옵션 조정

## 7. 접근성·UX

- [ ] **접근성(a11y)**: 주요 폼·버튼에 `aria-label`/`aria-describedby`, 포커스 순서 점검
- [ ] **반응형**: 작은 화면에서 테이블·GNB 메뉴 동작 검토

## 8. 아키텍처·구조 개선 (도메인/기능 중심 + 책임 분리)

Vue 공식 권장(컴포넌트 = 독립·재사용 단위, Composition API + composable로 로직 캡슐화, TypeScript 병행)에 맞춘 개선 방향. 상세는 **docs/ARCHITECTURE.md** 참고.

- [x] **서비스 레이어 도메인 분리 (1차)**: `services/core/`(access, audit, utils), `services/domain/scheduleService.ts` 추가, `firebaseService`는 schedule·core 재사용 및 re-export. 나머지 gym/user/profile 등은 추후 분리
- [x] **Composable 추출**: useCalendarPeriod, useGymManagement, useCourseList, useEventDetails 적용 완료
- [x] **뷰 책임 정리 (일부)** (CalendarView, GymManagement): 무거운 뷰(GymManagement, CourseListView, EventDetailsModal)는 “표시 + composable 호출” 수준으로 줄이고, 비즈니스 로직·상태는 composable 또는 스토어로 이전
- [x] **도메인 폴더·타입 분리** (composables/calendar, composables/gym, types/*.ts): 현재 `views/` + `components/{home,courses,calendar,profile,gym,ui}` 유지하되, 도메인별 `composables/`, `types/` 분리(예: `composables/calendar/useCalendarPeriod.ts`, `types/schedule.ts`)로 확장성 확보
- [x] **서비스 분리 확대**: `domain/gymService`, `domain/profileService`, `domain/classService`, `domain/userService`, `core/userUtils` 추가. `firebaseService`는 재export 배럴로 전환
- [x] **타입·시그니처 보강**: 도메인별 `types/*.ts` 분리 완료. 서비스에 `ManagerType`, `CreateStaffPayload`, `SearchUserResult`, `AppUser` 등 명시 타입 적용. (추가: 서비스 반환 타입·composable 시그니처 지속 보강)
