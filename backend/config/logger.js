const winston = require('winston');
const path = require('path');

// 로그 포맷 설정
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// 로거 생성
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  format: logFormat,
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // 파일 저장 - 일반 로그
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'app.log'),
      level: 'info'
    }),
    // 파일 저장 - 에러 로그
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error'
    })
  ]
});

module.exports = logger;