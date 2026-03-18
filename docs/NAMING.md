## 의미있는 Naming 가이드 (UI/i18n · Components · CSS)

이 문서의 목적은 “사람이 요청/리뷰/QA를 할 때” 화면 요소를 정확히 지칭할 수 있도록, **일관된 이름 체계**를 제공하는 것입니다.

---

## 1) i18n 키 네이밍

### 1.1 기본 원칙
- **UI에 노출되는 텍스트는 하드코딩 금지**(예외: 날짜/숫자 포맷, N 값 등)
- 키는 “문구”가 아니라 **의미(역할)**로 짓는다.
  - Good: `auth.resetPasswordLink` (문구가 바뀌어도 의미 유지)
  - Bad: `auth.forgotYourPasswordQuestion` (문구에 종속)

### 1.2 네임스페이스 규칙
- **도메인(페이지/기능) 단위** 네임스페이스를 사용한다.
  - 예: `auth.*`, `courses.*`, `gymTrainee.*`, `staffMgt.*`, `dashboard.*`
- 공통 액션/라벨은 `common.*`로 통일한다.
  - 예: `common.close`, `common.save`, `common.cancel`, `common.loading`

### 1.3 하위 그룹(권장)
단일 네임스페이스가 비대해지면 **역할별 하위 그룹**으로 분리한다.
- 예: `courses.detail.*`, `courses.actions.*`, `courses.toast.*`
- 예: `auth.login.*`, `auth.signup.*`, `auth.reset.*`

### 1.4 동기화
- `frontend/src/i18n/ko.ts`와 `frontend/src/i18n/en.ts`의 **키는 1:1로 유지**한다.
- 신규 키 추가 시 **두 파일에 동시에** 추가한다.

---

## 2) 컴포넌트/파일/props/slots 네이밍

### 2.1 파일/컴포넌트명
- View: `SomethingView.vue`
- 도메인 컴포넌트: `DomainThingCard`, `DomainThingList`, `DomainThingModal`
- Base 컴포넌트: `BaseXxx` (레이아웃/상태/입력 UI 등 공통)

### 2.2 props / emits
- Boolean 상태: `isOpen`, `isLoading`, `isDisabled`
- 선택 상태: `selectedGymId`, `activeTab`
- 컬렉션: `items`, `options`
- v-model: `v-model:isOpen` 처럼 `update:*` 규칙을 따른다.

### 2.3 slots
역할 기반 슬롯 이름을 쓴다.
- `header`, `toolbar`, `item`, `empty`, `loading`, `error`, `footer`

---

## 3) CSS 클래스 네이밍 (BEM-lite + prefix)

### 3.1 기본 원칙
- `scoped`를 유지한다.
- 클래스명은 **컴포넌트 prefix** + BEM-lite를 사용한다.

### 3.2 예시
- Block: `courseDetail`
- Element: `courseDetail__meta`, `courseDetail__tag`
- Modifier: `courseDetail__tag--warn`

### 3.3 적용 전략
- 대규모 일괄 변경 대신, **건드리는 파일부터 점진 적용**한다.
- 템플릿/스타일을 함께 변경하고 **미사용 CSS를 제거**한다.

