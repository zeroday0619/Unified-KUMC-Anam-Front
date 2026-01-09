# KUMC Anam Medical Portal

고려대학교 안암병원 진료 정보 포털 - FastAPI 백엔드 + 반응형 프론트엔드

## 주요 기능

### 인증
- KUMC 계정 로그인
- JWT 기반 세션 관리

### 사용자 정보
- 환자 기본 정보 조회
- 연락처 및 주소 정보

### 예약 내역
- 진료 예약 조회 (오늘 이후)
- 예약 상태 확인 (대기/수납완료)
- 담당의 사진 및 진료실 위치 표시
- **진료과 필터링**

### 진단검사 결과
- 검사 결과 조회
- 정상/비정상 수치 표시
- 참고치 비교
- 검사 카테고리별 그룹화
- **처방과 필터링**

### 처방 내역
- 외래/입원 처방 조회
- 약품명, 용량, 복용법 표시
- 날짜별 그룹화
- **간편 조회** (3개월/6개월/12개월/24개월)
- **진료과 필터링**

### 외래 진료 내역
- 진료 이력 조회
- 진료과별 통계 요약
- **진료과 필터링**

### 입퇴원 내역
- 입원/퇴원 기록 조회
- **진료과 필터링**

### 수납 내역
- 진료비 수납 내역 조회
- 총액/본인부담금 표시
- 수납 상세 내역 (영수증)
- **진료과 필터링**

### UI/UX
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 다크/라이트 테마 지원
- 실시간 알림 메시지

## 설치 및 실행

### 요구 사항

- Python 3.14+
- [uv](https://github.com/astral-sh/uv) (권장) 또는 pip

### 설치

```bash
# uv 사용 (권장)
uv sync

# 또는 pip 사용
pip install -e .
```

### 환경 설정

```bash
# 환경 변수 파일 생성
cp .env.example .env

# .env 파일을 열고 SECRET_KEY를 안전한 값으로 변경
```

### 실행

```bash
# 개발 서버 실행 (기본 포트 8000)
uv run fastapi dev app/main.py --port 8000

# 또는
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 접속

- **웹 UI**: http://localhost:8000
- **API 문서 (Swagger)**: http://localhost:8000/docs
- **API 문서 (ReDoc)**: http://localhost:8000/redoc

## 프로젝트 구조

```
Unified-KUMC-Anam-Front/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI 앱 엔트리포인트
│   ├── routes.py         # API 라우트
│   ├── schemas.py        # Pydantic 모델
│   ├── security.py       # JWT 인증
│   ├── config.py         # 설정
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css # 스타일시트 (테마, 반응형)
│   │   └── js/
│   │       └── app.js    # 프론트엔드 JavaScript
│   └── templates/
│       ├── index.html    # 로그인 페이지
│       └── dashboard.html # 대시보드
├── pyproject.toml
├── .env.example
└── README.md
```

## API 엔드포인트

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/user/info` | 사용자 정보 |
| POST | `/api/reservations` | 예약 내역 |
| POST | `/api/lab-tests` | 진단검사 결과 |
| POST | `/api/medications` | 처방 내역 |
| POST | `/api/outpatient-history` | 외래 진료 |
| POST | `/api/hospitalization-history` | 입퇴원 내역 |
| POST | `/api/payments` | 수납 내역 |
| POST | `/api/payments/detail` | 수납 상세 |

## 주요 기능 상세

### 진료과 필터링
모든 조회 화면에서 데이터를 불러온 후 진료과별로 필터링할 수 있습니다.
- 드롭다운에 진료과별 데이터 개수 표시
- 실시간 필터링 (API 재호출 없음)
- 전체/특정 진료과 선택 가능

### 처방 내역 간편 조회
처방 내역 화면에서 빠르게 기간을 설정할 수 있습니다.
- 3개월 / 6개월 / 12개월 / 24개월 버튼
- 클릭 시 자동으로 날짜 설정 및 조회

### 테마 지원
- 시스템 설정 자동 감지
- 수동 테마 전환 (헤더 토글 버튼)
- 설정 로컬 저장

## 기술 스택

- **Backend**: FastAPI, Python 3.14+
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (CSS Variables)
- **Template**: Jinja2
- **Authentication**: JWT (python-jose)
- **KUMC API**: [kumc](https://pypi.org/project/kumc/) (anamSDK)

## 주의사항
**Disclaimer**: 본 프로젝트는 연구 목적으로 개발되었으며, 사용으로 인해 발생하는 어떠한 문제에 대해서도 개발자는 책임을 지지 않습니다.
## 라이선스
MIT License

본 프로젝트는 KUMC SDK ([kumc](https://pypi.org/project/kumc/))를 사용합니다.
