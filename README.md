# 🎓 Attend Class - Smart Attendance Management System

RFID와 QR 코드를 활용한 스마트 출석 관리 시스템

## 📋 프로젝트 개요

Attend Class는 학교나 교육기관에서 사용할 수 있는 현대적인 출석 관리 시스템입니다. RFID 카드와 QR 코드를 통해 학생들의 출석을 자동으로 체크하고, 웹 대시보드를 통해 출석 현황을 실시간으로 관리할 수 있습니다.

## ✨ 주요 기능

### 👨‍🎓 학생 기능
- **QR 코드 출석**: 개인 QR 코드를 통한 간편한 출석 체크
- **RFID 카드 출석**: RFID 카드를 리더기에 태그하여 출석
- **출석 현황 조회**: 개인 출석 기록 및 통계 확인
- **프로필 관리**: 개인 정보 및 비밀번호 변경

### 👨‍🏫 관리자/교사 기능
- **실시간 출석 관리**: 실시간 출석 현황 모니터링
- **학생 관리**: 학생 등록, 수정, 삭제
- **RFID 카드 관리**: 학생 카드 등록 및 관리
- **출석 리포트**: 일별, 주별, 월별 출석 통계
- **휴일 관리**: 공휴일 및 휴무일 설정
- **출석 설정**: 출석 시간 및 규칙 설정

### 🔧 시스템 기능
- **다중 인증 방식**: RFID와 QR 코드 동시 지원
- **실시간 알림**: 출석 체크 시 즉시 알림
- **데이터 내보내기**: Excel 형태로 출석 데이터 내보내기
- **보안**: JWT 기반 인증 및 권한 관리
- **반응형 디자인**: 모바일 및 데스크톱 지원

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │     Arduino     │
│   (React + TS)  │◄──►│   (Node.js +    │◄──►│   (RFID Reader) │
│                 │    │   PostgreSQL)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ 기술 스택

### Frontend
- **Framework**: React 19.1.0 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Context API
- **Routing**: React Router DOM
- **QR Code**: html5-qrcode, @zxing/library
- **PWA**: vite-plugin-pwa

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL + Sequelize ORM
- **Authentication**: JWT + bcryptjs
- **Security**: Helmet, CORS, Rate Limiting
- **API Documentation**: Swagger
- **Serial Communication**: SerialPort (Arduino 통신)
- **File Processing**: multer, xlsx

### Hardware
- **Microcontroller**: Arduino Uno
- **RFID Module**: RC522
- **Components**: RGB LEDs, Buzzer
- **Libraries**: MFRC522, ArduinoJson

## 📦 설치 및 실행

### 사전 요구사항
- Node.js (v18 이상)
- PostgreSQL
- Arduino IDE (하드웨어 설정 시)

### 1. 프로젝트 클론
```bash
git clone https://github.com/yourusername/attend_class.git
cd attend_class
```

### 2. Backend 설정
```bash
cd backend
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 정보 등을 설정

# 데이터베이스 초기화
npm run dev
```

### 3. Frontend 설정
```bash
cd ../frontend
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 API 엔드포인트 설정

# 개발 서버 실행
npm run dev
```

### 4. Arduino 설정 (선택사항)
1. Arduino IDE에서 `arduino/RFID_Attendance_Reader.ino` 파일 열기
2. 필요한 라이브러리 설치:
   - MFRC522
   - ArduinoJson
3. 하드웨어 연결 (README 내 핀 배치도 참조)
4. 코드 업로드

## 📱 사용법

### 관리자 계정 생성
```bash
cd backend
node utils/createAdmin.js
```

### 시스템 접속
1. 웹 브라우저에서 `http://localhost:3000` 접속
2. 관리자 계정으로 로그인
3. 학생 등록 및 RFID 카드 설정
4. 출석 리더기 연결 및 테스트

## 🔧 환경 변수

### Backend (.env)
```env
# 서버 설정
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attend_class
DB_USER=postgres
DB_PASSWORD=your_password

# JWT 시크릿
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Arduino 시리얼 포트
ARDUINO_PORT=/dev/ttyUSB0
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
```

## 🤝 기여 방법

1. 프로젝트를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원 및 문의

- **Issues**: [GitHub Issues](https://github.com/yourusername/attend_class/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/attend_class/discussions)

## 🙏 감사의 말

이 프로젝트는 교육 현장의 디지털 전환을 위해 개발되었습니다. 사용해주시고 피드백을 주시는 모든 분들께 감사드립니다.

---

⭐ 이 프로젝트가 도움이 되셨다면 스타를 눌러주세요!