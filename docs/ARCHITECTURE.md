# Gym4me Frontend — 아키텍처 및 개선 방향

## 1. 설계 원칙 (목표)

- **컴포넌트**: 독립적이고 재사용 가능한 단위로 유지.
- **로직**: Composition API 기반 **composable**로 상태·비즈니스 로직을 캡슐화해 재사용.
- **타입**: TypeScript를 Composition API와 함께 사용해 시그니처·도메인 모델을 명확히.
- **구조**: “컴포넌트 종류”만이 아니라 **도메인/기능 중심 + 책임 분리**로 설계.

---

## 2. 현재 구조 요약

| 영역 | 현재 상태 | 비고 |
|------|-----------|------|
| **views/** | 페이지 단위 뷰. 일부는 가벼움(DashboardView), 일부는 무거움(CalendarView, GymManagement, CourseListView) | 무거운 뷰에 로직·상태 집중 |
| **components/** | home / courses / calendar / profile / gym / ui 로 구분 | 기능 도메인 + UI 공통 컴포넌트 혼재 |
| **stores/** | auth, schedule, class, trainee, profile, theme, ui | 도메인별 스토어 분리 (client → trainee 용어 통일) |
| **services/** | `firebaseService.ts`(재export 배럴), `core/`(access, audit, utils, userUtils), `domain/`(schedule, gym, profile, class, user), `courseService`, `toolService` | 도메인별 서비스 분리 완료. firebaseService는 기존 호출부 호환용 re-export만 수행 |
| **composables/** | useGnb, useSimulatePurchase 2개만 존재 | 뷰/모달 내부 로직이 대부분 컴포넌트에 남아 있음 |
| **types/** | `types/index.ts` 단일 파일에 전 도메인 타입 | 도메인 증가 시 발견성·유지보수 부담 |

---

## 3. 개선 방향

### 3.1 서비스 레이어 — 도메인 분리

- **문제**: `firebaseService.ts`가 스케줄·클래스·트레이니·Gym·트레이너·매니저·스태프·프로필·바디·감사 로그 등 여러 도메인을 한 파일에 포함.
- **방향**:
  - 도메인별 서비스 파일 도입: 예) `scheduleService.ts`, `gymService.ts`, `userService.ts`(또는 trainerService / managerService / staffService), `profileService.ts`, `auditService.ts`.
  - 공통: `db`, `chunkByTen`, `writeAuditLog`, `assertCanAccessUserData` 등은 `shared/` 또는 한 개의 `firebaseCore.ts`에서 재사용.
  - 기존 `firebaseService`는 deprecated 경로로 두고, 단계적으로 뷰/스토어가 새 서비스를 사용하도록 전환.

### 3.2 Composables — 로직 캡슐화

- **원칙**: Vue 권장대로 “상태를 가진 로직”을 composable로 빼서 재사용·테스트 가능하게.
- **추출 후보**:
  - **캘린더**: `CalendarView` 내 2주 그리드·기간·네비게이션 → `useCalendarPeriod(currentPeriodStart, weekDays, weekRows, goPrevWeek, goNextWeek, goToToday, periodTitle, weekRangeText)`.
  - **Gym 관리**: `GymManagement`의 목록 로드·모달·CRUD·트레이너 모달 → `useGymManagement()` (gymsList, gym, loading, fetch, openCreateModal, handleSaveGym 등).
  - **강좌**: `CourseListView`의 목록·상세·생성·신청·승인 → `useCourseList()` / `useCourseDetail()`.
  - **일정 상세**: `EventDetailsModal`의 승인/거절/완료/기록 추가/클래스 적용 → `useEventDetails(event)` (approve, reject, complete, addRecord, applyLogsToClass 등).
- **효과**: 뷰/모달은 “표시 + composable 호출”에 가깝게 유지하고, 비즈니스 로직·에러 처리·토스트는 composable 또는 스토어에서 일원화.

### 3.3 뷰/컴포넌트 — 책임 정리

- **원칙**: 컴포넌트는 독립·재사용 단위; 무거운 “컨테이너”는 로직을 composable/스토어로 이전.
- **적용**:
  - `CalendarView`: 기간·네비는 `useCalendarPeriod`, 일정 데이터는 기존 `scheduleStore` + getter 유지. 뷰는 바인딩과 레이아웃에 집중.
  - `GymManagement`: `useGymManagement`에서 데이터·모달·CRUD 처리, 뷰는 폼·테이블·모달 마크업과 이벤트 연결만.
  - `EventDetailsModal`: 승인/거절/완료/기록 등 액션을 `useEventDetails`로 옮기고, 모달은 props/emit + composable 반환값만 사용.

### 3.4 폴더 구조 — 도메인 확장성

- **현재**: `views/`, `components/{home,courses,calendar,profile,gym,ui}`, `composables/`, `services/`, `types/` 플랫 구조.
- **방향** (점진적 적용 가능):
  - **유지**: `views/`는 라우트 단위 페이지 유지.
  - **선택**: 도메인별 하위 폴더 도입 — 예) `composables/calendar/useCalendarPeriod.ts`, `composables/gym/useGymManagement.ts`, `types/schedule.ts`, `types/user.ts` 등. 필요 시 `features/calendar/`, `features/gym/`처럼 도메인 폴더에 뷰·컴포넌트·composable·타입을 묶는 방식도 검토.
  - **공통**: `components/ui/`는 계속 공용 presentational 컴포넌트로 두고, 도메인 전용 컴포넌트는 `components/calendar/`, `components/gym/` 등 유지.

### 3.5 TypeScript

- **원칙**: Composition API와 함께 타입을 명시해 시그니처·도메인 모델을 명확히.
- **적용**:
  - 모든 composable: 반환 타입·인자 타입 명시 (제네릭 필요 시 활용).
  - 서비스 함수: 파라미터·반환 타입을 `types/` 또는 도메인별 타입 파일과 맞춤.
  - 필요 시 `types/index.ts`에서 도메인별 타입을 re-export하거나, `types/schedule.ts`, `types/user.ts` 등으로 분리 후 `types/index.ts`에서 한 곳에서 export.

---

## 4. 우선순위 제안

1. **서비스 도메인 분리**: `firebaseService` 분할로 변경 영향 범위를 도메인 단위로 축소.
2. **Composable 추출**: 캘린더 기간 → Gym 관리 → 강좌 → 일정 상세 순으로 로직을 composable로 이전.
3. **뷰/모달 가벼움 유지**: 위 composable 적용 후 뷰는 “표시 + 호출” 수준으로 정리.
4. **타입·폴더**: 도메인 서비스/타입 파일 분리와 함께 `types/` 구조 정리.

이 문서는 TO-DO.md의 “8. 아키텍처·구조 개선” 항목과 연결되며, 실제 리팩터링 시 단계별로 적용할 수 있도록 작성됨.

---

## 5. 적용 완료 요약 (서비스·타입 분리)

- **core/**  
  - `access.ts`: AccessActor, assertCanAccessUserData  
  - `audit.ts`: AuditPayload, writeAuditLog  
  - `utils.ts`: chunkByTen  
  - `userUtils.ts`: AppUser, mapUsers, isTrainerLevel, isActivePrimaryManager, demotePrimaryManagersToViceInGym  

- **domain/**  
  - `scheduleService.ts`: getSchedules, addSchedule, updateSchedule, completeSession, appendClassWorkoutLog 등  
  - `gymService.ts`: getGyms, getGymById, createGym, updateGym, deleteGym, getGymTrainees, getGymTraineesAndObservers  
  - `profileService.ts`: getTrainerProfile, updateTrainerProfile, getProfileHistory, getBodyProfiles, addBodyProfile  
  - `classService.ts`: createClass, getClassesByTrainer, addTraineeToClass, removeTraineeFromClass  
  - `userService.ts`: 트레이니/트레이너/매니저/스태프 CRUD (getTraineesByTrainer, assignTrainerToTrainee, updateTraineeSession 등), ManagerType, CreateStaffPayload, SearchUserResult 등

- **타입·시그니처**: 도메인 서비스에 명시적 반환 타입 및 인터페이스 적용. `types/`는 schedule, user (User, TraineeInfo), gym, trainer, profile, tool, course 등으로 분리되어 `types/index.ts`에서 re-export.
