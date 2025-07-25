require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const logger = require('./config/logger');
const { initDatabase } = require('./models');

const app = express();
const PORT = process.env.PORT || 8000;

// Trust proxy 설정 (프록시 서버 뒤에 있을 때)
app.set('trust proxy', true);

// 미들웨어
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS 설정 - 여러 프론트엔드 URL 허용
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // origin이 없는 경우 (서버 간 요청 등) 허용
    if (!origin) return callback(null, true);
    
    // 허용된 origin 목록에 있는지 확인
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('CORS 정책에 의해 차단되었습니다'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(morgan('combined', { 
  stream: { write: message => logger.http(message.trim()) }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting 
const rateLimit = require('express-rate-limit');

// 일반 API용 rate limiter (많이 완화)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // 최대 1000 요청 (기존 100에서 대폭 증가)
  message: {
    error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도하세요.',
    retryAfter: '15분'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // X-Forwarded-For 헤더 검증 비활성화
  validate: {
    xForwardedForHeader: false
  }
});

// RFID/QR 스캔용 rate limiter (더 관대)
const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 100, // 1분에 100번 스캔 가능
  message: {
    error: '스캔 요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
    retryAfter: '1분'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false
  }
});

// Rate limiter 적용
app.use('/api/', generalLimiter);
app.use('/api/v1/attendance/qr-scan', scanLimiter);
app.use('/api/v1/attendance/rfid-tag', scanLimiter);
app.use('/api/v1/rfid/check-tag', scanLimiter);

// Swagger UI (개발/스테이징 환경에서만)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
}


// API 라우터
const authRouter = require('./src/routes/auth');
const usersRouter = require('./src/routes/users');
const attendanceRouter = require('./src/routes/attendance');
const attendanceSettingsRouter = require('./src/routes/attendanceSettings');
const qrRouter = require('./src/routes/qr');
const rfidRouter = require('./src/routes/rfid');
const holidaysRouter = require('./src/routes/holidays');


// 라우트 등록 (더 구체적인 경로를 먼저 등록)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/attendance/settings', attendanceSettingsRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/qr', qrRouter);
app.use('/api/v1/rfid', rfidRouter);
app.use('/api/v1/holidays', holidaysRouter);

// 기본 라우트
app.get('/', (req, res) => {
  logger.info('기본 라우트 접근');
  const response = {
    message: '디지털 출결 관리 시스템 API 서버',
    version: '1.0.0',
    status: 'running'
  };
  
  // 개발 환경에서만 API 문서 링크 제공
  if (process.env.NODE_ENV !== 'production') {
    response.docs = '/api-docs';
  }
  
  res.json(response);
});

// 404 핸들러
app.use('*', (req, res) => {
  logger.warn(`404 - API 엔드포인트를 찾을 수 없습니다: ${req.originalUrl}`);
  res.status(404).json({
    error: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  logger.error(`서버 에러: ${err.message}`, err);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, async () => {
  logger.info(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`http://localhost:${PORT}`);
    logger.info(`API 문서: http://localhost:${PORT}/api-docs`);
  }
  
  // 데이터베이스 초기화
  try {
    await initDatabase();
    logger.info('데이터베이스가 성공적으로 초기화되었습니다.');
    
    // 초기 관리자 계정 생성
    const { createAdmin } = require('./scripts/createAdmin');
    try {
      await createAdmin();
    } catch (error) {
      logger.warn('관리자 계정 생성 확인 실패:', error.message);
    }
  } catch (error) {
    logger.error('데이터베이스 초기화 실패:', error);
  }
});