const EventEmitter = require('events');
const arduinoConfig = require('../config/arduino');
const logger = require('../../config/logger');

class ArduinoBridge extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.serialPort = null;
    this.lastHeartbeat = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.tagQueue = [];
    this.mockMode = arduinoConfig.development.mockMode;
    
    // 현재 연결된 페이지 추적
    this.currentPage = null; // 'reader' 또는 'management'
    this.connectedBy = null;
    
    logger.info(`Arduino Bridge 초기화 - 자동 연결 비활성화`);
    
    // 서버 시작 시 자동 연결하지 않음
    // Reader 페이지에서 명시적으로 연결 요청할 때만 연결
  }

  // 시리얼 연결 초기화
  async initializeSerialConnection() {
    try {
      // 사용 가능한 포트 자동 감지
      const availablePort = await this.detectArduinoPort();
      if (availablePort) {
        const baudRate = this.currentBaudRate || arduinoConfig.serialPort.baudRate;
        this.connectToPort(availablePort, baudRate);
      } else {
        logger.warn('Arduino 포트를 찾을 수 없습니다. Mock 모드로 전환합니다.');
        this.mockMode = true;
        this.isConnected = true;
        this.lastHeartbeat = new Date();
      }
    } catch (error) {
      logger.error('포트 감지 중 오류:', error);
      // 현재 연결된 포트가 있으면 그것을 사용, 없으면 기본 포트 사용
      const port = this.currentPort || arduinoConfig.serialPort.port;
      const baudRate = this.currentBaudRate || arduinoConfig.serialPort.baudRate;
      this.connectToPort(port, baudRate);
    }
  }

  // Arduino 포트 자동 감지
  async detectArduinoPort() {
    try {
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();
      
      // Arduino 관련 포트 우선 검색
      const arduinoPorts = ports.filter(port => {
        const manufacturer = (port.manufacturer || '').toLowerCase();
        const vendorId = (port.vendorId || '').toLowerCase();
        
        return manufacturer.includes('arduino') || 
               manufacturer.includes('ch340') ||
               manufacturer.includes('ch341') ||
               manufacturer.includes('ftdi') ||
               vendorId === '2341' || // Arduino VID
               vendorId === '1a86';   // CH340/CH341 VID
      });

      if (arduinoPorts.length > 0) {
        logger.info(`Arduino 포트 감지됨: ${arduinoPorts[0].path}`);
        return arduinoPorts[0].path;
      }

      // Arduino 특화 포트가 없으면 사용 가능한 모든 시리얼 포트 검사
      if (ports.length > 0) {
        logger.info(`일반 시리얼 포트 사용: ${ports[0].path}`);
        return ports[0].path;
      }

      return null;
    } catch (error) {
      logger.error('포트 목록 조회 실패:', error);
      return null;
    }
  }

  // 특정 포트로 연결 (페이지별)
  async connectToPort(port, baudRate = 9600, pageId = null) { 
    try {
      // 다른 페이지에서 이미 연결 중인 경우 해제
      if (this.isConnected && this.currentPage && this.currentPage !== pageId) {
        logger.info(`다른 페이지(${this.currentPage})에서 연결 중입니다. 기존 연결을 해제합니다.`);
        this.disconnect();
      }

      // 기존 연결이 있다면 닫기
      if (this.serialPort && this.serialPort.isOpen) {
        this.serialPort.close();
      }

      // serialport 모듈 사용 시도
      try {
        const { SerialPort } = require('serialport');
        const { ReadlineParser } = require('@serialport/parser-readline');
        
        this.serialPort = new SerialPort({
          path: port,
          baudRate: baudRate
        });
        
        const parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        this.serialPort.on('open', () => {
          logger.info(`Arduino 연결 성공: ${port} (페이지: ${pageId || 'unknown'})`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.currentPort = port;
          this.currentBaudRate = baudRate;
          this.currentPage = pageId;
          this.connectedBy = pageId;
          this.lastHeartbeat = new Date();
          this.emit('connected');
        });
        
        this.serialPort.on('error', (err) => {
          logger.error('Arduino 연결 오류:', err);
          this.handleConnectionError(err);
        });
        
        parser.on('data', (data) => {
          logger.info(`[RFID] Arduino 원본 데이터 수신: "${data}"`);
          this.handleArduinoMessage(data);
        });
        
        return { success: true, message: 'Serial connection established' };
        
      } catch (serialportError) {
        logger.warn('serialport 모듈 오류:', serialportError.message);
        // serialport 모듈이 없거나 연결 실패 시 Mock 모드로 fallback
      }

      // Mock 모드 완전 제거 - serialport 실패시 오류 발생
      logger.error('serialport 모듈 연결 실패. Mock 모드는 비활성화됨.');
      throw new Error('Arduino 연결 실패 - serialport 모듈 오류');
      
    } catch (error) {
      logger.error(`포트 ${port} 연결 실패:`, error);
      this.handleConnectionError(error);
      throw error;
    }
  }

  // Arduino 메시지 처리
  handleArduinoMessage(data) {
    const rawData = data.trim();
    
    // 빈 데이터 무시
    if (!rawData) {
      return;
    }
    
    // JSON 형태인지 확인
    if (rawData.startsWith('{') && rawData.endsWith('}')) {
      try {
        const message = JSON.parse(rawData);
        logger.debug('Arduino JSON 메시지 수신:', message);
        
        switch (message.type) {
          case 'RFID_TAG':
            logger.info(`[RFID] 🎯 JSON RFID 태그 수신: card_id="${message.card_id}"`);
            // JSON에서는 card_id 필드 사용
            const rfidEvent = {
              type: 'RFID_TAG',
              uid: message.card_id,
              timestamp: new Date().toISOString(),
              source: 'arduino_json',
              reader_id: message.reader_id
            };
            this.handleRfidTag(rfidEvent);
            break;
          case 'HEARTBEAT':
            this.handleHeartbeat(message);
            break;
          case 'SYSTEM_MESSAGE':
            this.handleSystemMessage(message);
            break;
          case 'SYSTEM_STATUS':
            this.handleSystemStatus(message);
            break;
          default:
            logger.warn('알 수 없는 메시지 타입:', message.type);
        }
      } catch (error) {
        logger.error('Arduino JSON 파싱 오류:', error.message);
        logger.error(`Raw data (length: ${rawData.length}):`, JSON.stringify(rawData));
        // 64번째 문자 주변을 보여주기
        if (rawData.length > 60) {
          const start = Math.max(0, 55);
          const end = Math.min(rawData.length, 75);
          logger.error(`Error position context (chars ${start}-${end}):`, JSON.stringify(rawData.substring(start, end)));
        }
        // 잘못된 JSON은 무시
        return;
      }
    } else {
      // 일반 텍스트 메시지 처리
      logger.debug('Arduino 텍스트 메시지:', rawData);
      
      // 특정 패턴 인식
      if (rawData.includes('RFID')) {
        // RFID 관련 메시지
        this.handleTextMessage('RFID', rawData);
      } else if (rawData.includes('연결') || rawData.includes('준비')) {
        // 연결/준비 메시지
        this.handleTextMessage('CONNECTION', rawData);
      } else if (rawData.includes('오류') || rawData.includes('ERROR')) {
        // 오류 메시지
        this.handleTextMessage('ERROR', rawData);
      } else {
        // 일반 상태 메시지
        this.handleTextMessage('STATUS', rawData);
      }
    }
  }

  // 텍스트 메시지 처리 (Arduino 단순 출력용)
  handleTextMessage(type, message) {
    logger.info(`[RFID] Arduino ${type} 메시지: "${message}"`);
    
    // "태그 번호: 1F3CE217" 형식 파싱
    if (message.includes('태그 번호:')) {
      const tagMatch = message.match(/태그 번호:\s*([A-F0-9]+)/i);
      if (tagMatch) {
        const tagId = tagMatch[1].toUpperCase();
        logger.info(`[RFID] ✅ 태그 ID 파싱 성공: "${tagId}"`);
        
        // RFID 태그 이벤트 생성
        const rfidEvent = {
          type: 'RFID_TAG',
          uid: tagId,
          timestamp: new Date().toISOString(),
          source: 'arduino_text'
        };
        
        this.handleRfidTag(rfidEvent);
        return;
      } else {
        logger.warn(`[RFID] ❌ 태그 번호 파싱 실패. 원본 메시지: "${message}"`);
      }
    }
    
    // 기타 메시지는 로그만 출력
    this.emit('message', {
      type: type,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  // RFID 태그 처리 (실제 Arduino 데이터용)
  handleRfidTag(message) {
    const tagData = {
      id: Date.now(),
      rfid_card_id: message.uid || message.card_id, // uid 우선 사용
      tag_time: new Date().toISOString(),
      reader_id: message.reader_id || 'ARDUINO',
      processed: false,
      source: message.source || 'arduino'
    };
    
    logger.info(`[RFID] 🎯 태그 큐에 추가: ID="${tagData.rfid_card_id}", 시간=${tagData.tag_time}, 소스=${tagData.source}`);
    
    this.tagQueue.push(tagData);
    this.emit('rfid_tag', tagData);
    
    logger.info(`[RFID] 📡 태그 이벤트 발생됨. 현재 큐 크기: ${this.tagQueue.length}`);
  }

  // Arduino에 카드 쓰기 명령 전송
  writeCardData(studentId, studentName) {
    const command = {
      command: "WRITE_CARD",
      student_id: studentId,
      student_name: studentName
    };
    
    if (this.serialPort && this.serialPort.isOpen) {
      const commandString = JSON.stringify(command);
      logger.info(`[RFID] 💾 카드 쓰기 명령 전송: ${commandString}`);
      this.serialPort.write(commandString + '\n');
      return true;
    } else {
      logger.error('[RFID] ❌ Arduino 연결되지 않음 - 카드 쓰기 실패');
      return false;
    }
  }

  // 하트비트 처리
  handleHeartbeat(message) {
    this.lastHeartbeat = new Date();
    this.emit('heartbeat', {
      timestamp: message.timestamp,
      reader_id: message.reader_id,
      state: message.state
    });
  }

  // 시스템 메시지 처리
  handleSystemMessage(message) {
    logger.info(`Arduino 시스템 메시지 [${message.message_type}]:`, message.message);
    this.emit('system_message', message);
  }

  // 시스템 상태 처리
  handleSystemStatus(message) {
    this.emit('system_status', message);
  }

  // 연결 오류 처리
  handleConnectionError(error) {
    this.isConnected = false;
    this.emit('connection_error', error);
    
    // 사용자가 수동으로 연결한 포트가 있는 경우에만 재연결 시도
    if (this.currentPort && this.reconnectAttempts < arduinoConfig.rfidReader.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.warn(`Arduino 재연결 시도 ${this.reconnectAttempts}/${arduinoConfig.rfidReader.maxReconnectAttempts} (포트: ${this.currentPort})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.initializeSerialConnection();
      }, arduinoConfig.rfidReader.reconnectDelay);
    } else {
      if (!this.currentPort) {
        logger.info('수동으로 연결된 포트가 없어 자동 재연결을 중단합니다.');
      } else {
        logger.error('Arduino 재연결 시도 한계 도달. 수동 재시작이 필요합니다.');
      }
    }
  }

  // Arduino에 명령 전송
  sendCommand(command) {
    if (this.mockMode) {
      logger.debug('Mock Mode - 명령 전송:', command);
      return Promise.resolve({ success: true, message: 'Mock command sent' });
    }
    
    if (!this.isConnected || !this.serialPort) {
      return Promise.reject(new Error('Arduino가 연결되지 않았습니다.'));
    }
    
    return new Promise((resolve, reject) => {
      const commandString = typeof command === 'string' ? command : JSON.stringify(command);
      
      this.serialPort.write(commandString + '\n', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve({ success: true, message: 'Command sent successfully' });
        }
      });
    });
  }

  // RFID 카드 쓰기
  async writeCard(studentData) {
    const command = {
      command: 'WRITE_CARD',
      student_id: studentData.student_id,
      student_name: studentData.student_name,
      card_id: studentData.card_id
    };
    
    return this.sendCommand(command);
  }

  // 연결 테스트
  async testConnection() {
    if (this.mockMode) {
      return {
        success: true,
        ping_time: Math.floor(Math.random() * 50) + 10,
        reader_info: {
          model: 'RC522 (Mock)',
          version: '1.0.0',
          serial: 'MOCK123456'
        }
      };
    }
    
    const command = { command: 'STATUS' };
    return this.sendCommand(command);
  }

  // 최신 태그 가져오기
  getLatestTag() {
    if (this.mockMode) {
      // 개발 모드에서는 주기적으로 모의 태그 생성
      if (Math.random() < 0.1) { // 10% 확률로 새 태그
        const mockCards = arduinoConfig.development.mockCardIds;
        const randomCard = mockCards[Math.floor(Math.random() * mockCards.length)];
        
        return {
          id: Date.now(),
          rfid_card_id: randomCard,
          tag_time: new Date().toISOString(),
          processed: false
        };
      }
      return null;
    }
    
    // 처리되지 않은 가장 오래된 태그 반환
    return this.tagQueue.find(tag => !tag.processed) || null;
  }

  // 태그 처리 완료 표시
  markTagProcessed(tagId) {
    const tag = this.tagQueue.find(t => t.id === tagId);
    if (tag) {
      tag.processed = true;
    }
  }

  // 상태 정보 가져오기
  getStatus() {
    return {
      connected: this.isConnected,
      port: this.currentPort || arduinoConfig.serialPort.port,
      baudRate: this.currentBaudRate || arduinoConfig.serialPort.baudRate,
      last_ping: this.lastHeartbeat?.toISOString() || null,
      current_page: this.currentPage,
      connected_by: this.connectedBy,
      reader_info: {
        model: this.mockMode ? 'RC522 (Mock)' : 'RC522',
        version: '1.0.0'
      },
      mock_mode: this.mockMode,
      reconnect_attempts: this.reconnectAttempts
    };
  }

  // 연결 종료
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
    }
    
    const previousPage = this.currentPage;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.currentPage = null;
    this.connectedBy = null;
    
    // 현재 포트 정보는 유지 (재연결 시 사용)
    logger.info(`Arduino 연결이 종료되었습니다. (이전 페이지: ${previousPage || 'unknown'})`);
  }

  // 완전 초기화 (포트 정보도 삭제)
  resetConnection() {
    this.disconnect();
    this.currentPort = null;
    this.currentBaudRate = null;
    this.lastHeartbeat = null;
    logger.info('Arduino 연결 정보가 초기화되었습니다.');
  }
}

// 싱글톤 인스턴스
let arduinoBridgeInstance = null;

module.exports = {
  getInstance: () => {
    if (!arduinoBridgeInstance) {
      arduinoBridgeInstance = new ArduinoBridge();
    }
    return arduinoBridgeInstance;
  },
  
  // 설정 정보 접근
  getConfig: () => arduinoConfig
};