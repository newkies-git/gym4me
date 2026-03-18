# 역할 분리 변경 목록: System Admin vs Supervisor

## 목표
- **현재**: `SITE_ADMIN` = 기술(시스템/권한) + 업무(GYM 운영 총괄) 결합
- **변경 후**:
  - **System Admin** (`SITE_ADMIN`): 기술·운영, **Supervisor 계정 생성만** 관여
  - **Supervisor** (`SUPERVISOR`, 신규): 업무 최상위, **전체 GYM 운영** (정책, 총괄, 최종 승인)

---

## 1. 역할·타입 정의

| 항목 | 파일 | 현재 | 변경 |
|------|------|------|------|
| 역할 상수/타입 | `frontend/src/types/user.ts` 등 | `role: string` | `UserRole` 타입에 `'SUPERVISOR'` 추가 (선택) |
| Supervisor 레벨 | 정책 결정 | - | `SUPERVISOR` 전용 `lvl` 정의 (예: 90. Manager 20, SiteAdmin 100 사이) |
| auth getter | `frontend/src/stores/auth.ts` | `isSiteAdmin` (lvl≥100 \|\| role===SITE_ADMIN) | `isSupervisor` 추가 (role===SUPERVISOR \|\| lvl≥90). `isSiteAdmin`는 **유지** (System Admin만) |

---

## 2. 라우팅·가드

| 항목 | 파일 | 현재 | 변경 |
|------|------|------|------|
| /admin (managers, staff) | `frontend/src/router/routes.ts` | `meta.requiresSiteAdmin: true` | `requiresSupervisor: true` 로 변경. System Admin은 접근 불가. |
| 가드 로직 | `frontend/src/router/guard.ts` | `requiresSiteAdmin` → `isSiteAdmin` | `requiresSupervisor` 신규: `isSupervisor` 체크 |
| 가드 로직 | `frontend/src/router/guard.ts` | `requiresManager` → `isManager \|\| isSiteAdmin` | `isManager \|\| isSupervisor` 로 변경 (isSiteAdmin 제거) |
| Supervisor 전용 진입점 | `routes.ts` | 없음 | System Admin 전용 경로 추가 (예: `/admin/supervisors`) → **Supervisor 계정 생성** UI만 노출 |

---

## 3. 대시보드

| 항목 | 파일 | 현재 | 변경 |
|------|------|------|------|
| 역할별 홈 | `frontend/src/views/DashboardView.vue` | `isSiteAdmin` → `<SiteAdminHome />` | `isSupervisor` → `<SupervisorHome />`(기존 SiteAdminHome 내용), `isSiteAdmin && !isSupervisor` → `<SystemAdminHome />`(Supervisor 생성 링크/안내만) |
| 대시보드 컴포넌트 | `frontend/src/components/home/` | `SiteAdminHome.vue` | `SupervisorHome.vue`로 이름/용도 변경 또는 복제 후, **SystemAdminHome.vue** 신규 (최소 UI: “Supervisor 생성” 이동 버튼 등) |
| subtitle | `DashboardView.vue` | `siteAdminDashboard` | `supervisorDashboard` / `systemAdminDashboard` 분리 |

---

## 4. 네비게이션 (SideDrawer, GNB)

| 항목 | 파일 | 현재 | 변경 |
|------|------|------|------|
| manage-gym 링크 | `frontend/src/layouts/components/SideDrawer.vue` | `isSiteAdmin` | `isSupervisor` |
| admin/staff 링크 | 동일 | `isSiteAdmin` | `isSupervisor` |
| trainer-profile 제외 조건 | 동일 | `!auth.isSiteAdmin` | `!auth.isSupervisor` (또는 역할 정책에 맞게 유지) |
| manager 링크 (manage-trainers) | 동일 | `MANAGER && !isSiteAdmin` | `MANAGER && !isSupervisor` |
| gym/members 링크 | 동일 | Trainer \|\| Manager \|\| SiteAdmin | Trainer \|\| Manager \|\| **Supervisor** |
| System Admin 전용 메뉴 | 동일 | 없음 | “Supervisor 생성” 또는 “시스템 관리” → `/admin/supervisors` (requiresSiteAdmin) |
| 기본 홈 경로 | `frontend/src/composables/useGnb.ts` | `isSiteAdmin ? '/manage-gym'` | `isSupervisor ? '/manage-gym'`. Site Admin은 `/home` 또는 `/admin/supervisors` |

---

## 5. 뷰별 isSiteAdmin → 역할 분리

| 뷰/ composable | 파일 | 현재 | 변경 |
|----------------|------|------|------|
| GYM 필터 / 전체 회원 | `GymMemberView.vue` | `auth.isSiteAdmin` | `auth.isSupervisor` |
| showActions / canManageCredit | 동일 | Trainer \|\| Manager \|\| SiteAdmin | Trainer \|\| Manager \|\| **Supervisor** |
| 회원 목록 로드 (전체/GYM별) | 동일 | isSiteAdmin 분기 | isSupervisor 분기 |
| 홈 경로 | `useGnb.ts` | isSiteAdmin | isSupervisor |
| gymsToCount / managerEmail | `useGymManagement.ts` | auth.isSiteAdmin | auth.isSupervisor |
| 캘린더 client/class | `CalendarView.vue` | trainer \|\| siteAdmin | trainer \|\| **supervisor** |
| BodyProfile 요청자 | `BodyProfileView.vue` | trainer \|\| siteAdmin | trainer \|\| **supervisor** |
| 트레이너 관리 (GYM 필터, promote 등) | `TrainerManagement.vue` | auth.isSiteAdmin | auth.isSupervisor |
| GYM 관리 | `GymManagement.vue` | isSiteAdmin 분기 | isSupervisor 분기 |
| 코스 관리 권한 | `useCourseList.ts` (canManage) | isTrainer \|\| isSiteAdmin | isTrainer \|\| **isSupervisor** |

---

## 6. 접근 제어 (서비스 레이어)

| 항목 | 파일 | 현재 | 변경 |
|------|------|------|------|
| “전체 데이터 접근” 판별 | `frontend/src/services/core/access.ts` | `isSiteAdminActor(actor)` (lvl≥100 \|\| SITE_ADMIN) | **isSupervisorActor(actor)** 신규 (role===SUPERVISOR \|\| lvl≥90). **데이터 접근**은 Supervisor만 허용하도록 정책 변경. |
| 사용자/클래스 접근 | `access.ts` (assertCanAccessUserData, assertCanAccessClassData) | isSiteAdminActor 통과 | isSiteAdminActor → **isSupervisorActor** 로 변경 (System Admin은 일반 데이터 접근 불가) |
| 스케줄 접근 | `scheduleService.ts` | isSiteAdminActor | isSupervisorActor |
| “Supervisor 계정 생성” 권한 | 신규 또는 기존 API | 없음 | **System Admin(isSiteAdminActor)만** 호출 가능하도록 체크 추가 |

---

## 7. 초기 계정·부트스트랩

| 항목 | 파일 | 현재 | 변경 |
|------|------|------|------|
| 최초 계정 역할 | `AuthView.vue` | 부트스트랩 시 `role: 'SITE_ADMIN', lvl: 100` | **유지** (최초 1인은 System Admin) |
| init 스크립트 | `frontend/init_admin.mjs` | SITE_ADMIN(lvl 100) 생성 | **유지** (System Admin 생성). 필요 시 `init_supervisor.mjs` 또는 “Supervisor 생성” UI에서만 SUPERVISOR 생성. |

---

## 8. Supervisor 계정 생성

| 항목 | 파일/위치 | 현재 | 변경 |
|------|------------|------|------|
| 생성 API | `userService.ts` 등 | createStaffAccount(MANAGER \| SUB_MANAGER \| TRAINER) | **createSupervisorAccount** 또는 createStaffAccount에 `role: 'SUPERVISOR'`, `lvl: 90` 추가. 호출 권한: **isSiteAdminActor(actor)만** 허용. |
| UI | 신규 뷰 | 없음 | **System Admin 전용** “Supervisor 생성” 페이지 (예: `/admin/supervisors`). 이메일/비밀번호 입력 후 SUPERVISOR 계정 생성. |
| 라우트 | `routes.ts` | /admin 자식: managers, staff | /admin 자식에 `supervisors` 추가, `meta.requiresSiteAdmin: true` (Supervisor는 접근 불가). 또는 `/system/supervisors` 등 별도 경로. |

---

## 9. i18n

| 키 | 파일 | 현재 | 변경 |
|----|------|------|------|
| 대시보드 제목 | `ko.ts`, `en.ts` | siteAdminDashboard | **supervisorDashboard** (Supervisor용), **systemAdminDashboard** (System Admin용, 예: “시스템 관리” / “Supervisor 생성”) |
| 역할 라벨 | `UserInfoView.vue`, i18n | role.siteAdmin | **role.supervisor** 추가. role.siteAdmin은 “시스템 관리자” 등으로 유지. |

---

## 10. 기타

| 항목 | 파일 | 변경 |
|------|------|------|
| UserInfoView 역할 표시 | `UserInfoView.vue` | `SITE_ADMIN` 케이스 유지, `SUPERVISOR` 케이스 추가 |
| StaffManagement 접근 권한 | 라우트/가드 | **requiresSupervisor**만 통과 (Manager 생성 등은 Supervisor 업무). System Admin은 이 경로 접근 불가. |
| ManagerManagement 접근 권한 | 라우트/가드 | 동일 (Supervisor 또는 기존 정책 유지) |
| GymManagement 프로필 뱃지 | `GymManagement.vue` | `.site_admin` 등 클래스명/역할 표시를 **supervisor** 반영하도록 정리 |

---

## 구현 순서 제안

1. **역할·auth**: `SUPERVISOR` 상수, `lvl` 값, `isSupervisor` getter 추가.
2. **access**: `isSupervisorActor` 추가, 데이터 접근은 `isSupervisorActor` 기준으로 변경; Supervisor 생성 API는 `isSiteAdminActor`만 허용.
3. **라우트/가드**: `requiresSupervisor` 추가, `/admin` 은 Supervisor 전용으로, `/admin/supervisors`(또는 동일)는 Site Admin 전용으로 분리.
4. **대시보드·네비**: SupervisorHome/SystemAdminHome 분리, SideDrawer·useGnb에서 isSiteAdmin → isSupervisor (업무 메뉴) / isSiteAdmin (시스템 메뉴만) 반영.
5. **뷰 일괄**: GymMemberView, useGymManagement, CalendarView, BodyProfileView, TrainerManagement, GymManagement, useCourseList 등에서 isSiteAdmin → isSupervisor 변경.
6. **Supervisor 생성**: createSupervisorAccount(또는 createStaff 확장), System Admin 전용 페이지 및 라우트 추가.
7. **i18n·역할 라벨**: supervisorDashboard, systemAdminDashboard, role.supervisor 추가 및 기존 키 정리.

이 목록대로 적용하면, System Admin은 “Supervisor 계정 생성”에만 관여하고, GYM 운영·정책·승인은 전부 Supervisor 역할로 이전할 수 있습니다.
