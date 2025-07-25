// Arduino RFID 리더기 연결 설정
module.exports = {
  // 시리얼 포트 설정
  serialPort: {
    port: process.env.ARDUINO_PORT || 'COM3', // Windows의 경우 COM3, Linux/Mac의 경우 /dev/ttyUSB0
    baudRate: 9600,
    autoOpen: false,
    parser: 'readline'
  },

  // RFID 리더기 설정
  rfidReader: {
    enabled: process.env.RFID_ENABLED === 'true',
    heartbeatInterval: 5000, // 5초마다 하트비트
    reconnectDelay: 3000,    // 연결 끊김 시 3초 후 재연결 시도
    maxReconnectAttempts: 10
  },

  // 개발 모드 설정
  development: {
    mockMode: false, // Mock 모드 완전 비활성화
    mockCardIds: [],
    mockDelay: 1000
  },

  // 로깅 설정
  logging: {
    enabled: true,
    level: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.LOG_TO_FILE === 'true',
    logPath: './logs/arduino.log'
  }
};