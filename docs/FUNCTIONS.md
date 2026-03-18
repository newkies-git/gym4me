# Gym4me 기능 명세 및 구현 상태

## 1. 구현된 주요 기능

### 1.1 사용자 관리 (Authentication)

- **회원가입/로그인**: 이메일 기반 Firebase Auth
- **회원가입**: 비밀번호 확인, 이용약관·개인정보 동의 체크, 가입 후 알림
- **로그인**: ID 기억(선택), 로그인 성공 시 권한별 홈(`/home`) 이동
- **최초 로그인(트레이니)**: `complete-profile`에서 이름·전화·Gym 필수 입력 후 `/home` 이동
- **권한(RBAC)**: SITE_ADMIN(100), MANAGER(20), TRAINER(10), MEMBER(5), OBSERVER(1)

### 1.2 홈 (`/home`) 역할별 뷰

- **SITE_ADMIN(Home)**: StatCard 2, Gym 관리·매니저 관리 링크
- **ManagerHome**: StatCard 2, 트레이너 관리·지점 트레이니 링크
- **TrainerHome**: TraineeManager(담당 트레이니)·ClassManager(그룹 클래스)
- **TraineeHome**: 잔여 세션·만료일·다가오는 세션 StatCard, 과거 운동 검색(PastExerciseSearch), 캘린더·바디 프로필 링크
- **Observer**: 안내 배너, 테스트 수강권 구매(시뮬레이션)

### 1.3 일정 관리 (Calendar)

- **개인/클래스/강좌**: Individual PT, Class, Courses 구분 표시
- **강좌 연동**: `courseService`·`scheduleStore`에서 강좌를 캘린더 이벤트로 병합
- **상태**: PENDING, APPROVED, COMPLETED, CANCELLED, REJECTED
- **세션 완료**: 디지털 서명(SignaturePad), 수강권 차감, `ticketHistory` 기록

### 1.4 강좌 (Courses)

- **CRUD**: 트레이너 이상 생성·수정·삭제
- **Gym·참석자**: Gym 선택, 해당 Gym 트레이니/옵저버 다중 선택
- **신청**: 트레이니가 강좌별 참석 신청(`courseApplications`), 트레이너 승인

### 1.5 트레이니/클래스 (Trainer)

- **TraineeManager**: 담당 트레이니 목록, 이메일 검색 등록, 수강권·만료일 수정, 캘린더·프로필 링크
- **ClassManager**: 클래스 생성·초대·트레이니 관리, 클래스별 캘린더 뷰

### 1.6 운동 기록 및 신체 데이터

- **세션 로그**: 일정별 운동 종목·세트·횟수·무게 기록
- **바디 프로필**: 체중·체지방 등, Chart.js 시각화
- **과거 운동 검색**: 트레이니 홈에서 키워드 검색 후 “오늘 반복 추가”

### 1.7 Gym·트레이너·직원 관리

- **Gym 관리**: 지점 등록·수정·삭제, PRIMARY/VICE 매니저
- **트레이너 관리**: 역할 부여, 소속 Gym 지정
- **지점 트레이니**: 해당 Gym 트레이니 목록·수강권 조정 (`/gym/trainees`, GymTraineeView)
- **매니저/직원 관리**(SITE_ADMIN): AdminLayout 하위 managers, staff

### 1.8 기타

- **기구 사용법**(Tool Usage): 영상·이미지 CRUD, 권한별 공개/비공개
- **트레이너 프로필**: 소개·전문분야·경력 편집, profileHistory
- **테마**: 8종 프리셋, localStorage 저장
- **i18n**: 한국어/영어
- **GNB**: 로그인 시 소속 Gym명 표시, 타이틀 클릭 시 SITE_ADMIN → `/manage-gym`, 그 외 → `/home`
- **이용약관/개인정보**: `/terms`, `/privacy` (profile 하위 뷰)

---

## 2. 요구사항 대비 구현 상태

| 메뉴/기능        | 요구사항               | 현재 구현                    | 보완 사항 |
| :---             | :---                   | :---                         | :---      |
| **Schedule**     | 2주 단위, 주간 이동, 승인/거절(사유) | 1주 단위, 승인 위주          | 2주 보기·이동, 거절 시 사유 입력 |
| **Training Class / 강좌** | 트레이너 등록, 일정 반영 | 클래스·강좌 구현, 캘린더 반영 | 2주 일정 시각화 |
| **Training**     | 전자서명 확인          | SignaturePad 연동            | -         |
| **MyProfile/바디** | 트레이너/트레이니 등록, 이력 | 바디 프로필·이력             | 명칭 통일(MyProfile/InBody) |
| **Tool Usage**   | 기구 사용법·개인 운동  | 구현됨(영상/사진, 권한별)    | -         |
| **Trainer Profile** | 경력·수상·공개      | 소개·전문분야·경력           | 수상 이력 등 상세 확장 |
| **Trainee(지점)** | 지점 트레이니·이용권 관리 | 트레이니 목록·횟수·만료일 (`/gym/trainees`) | 지점 전체 뷰·알림 |
| **Manager**      | 리스트 추출, 메일/푸시 | 리스트 위주                  | 메일/푸시 알림 기능 |
| **Gym**          | 이름·위치·전화·로고·매니저 | 구현됨                       | 로고·사진 업로드 |
| **MyInfo**       | 비밀번호·닉네임 변경   | UserInfoView                 | -         |

---

## 3. 상세 차이 (Gaps)

- **캘린더**: 2주 보기·주간 이동, 거절(Reject) 및 거절 사유·알림
- **매니저 알림**: 잔여 N회 이하 트레이니 추출, 푸시/메일 발송
- **트레이너 프로필**: 수상 이력 등 정형 필드·공개 UI 확장
- **경로**: 역할별 홈 `/home`, 분석용 `/dashboard` 예약

자세한 할 일은 **TO-DO.md** 참고.
