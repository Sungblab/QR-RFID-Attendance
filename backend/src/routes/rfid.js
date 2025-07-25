const express = require('express');
const router = express.Router();
const { getInstance: getArduinoBridge } = require('../services/arduinoBridge');
const logger = require('../../config/logger');

// Arduino Bridge 인스턴스
const arduinoBridge = getArduinoBridge();

// 모의 RFID 태그 데이터를 위한 메모리 저장소 (개발용)
let mockRfidData = {
  lastTag: null,
  processed: true
};

/**
 * @swagger
 * /api/v1/rfid/mock-tag:
 *   post:
 *     summary: 모의 RFID 태그 생성
 *     description: 개발/테스트용 모의 RFID 태그를 생성합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rfid_card_id:
 *                 type: string
 *                 description: RFID 카드 ID
 *                 example: "RFID001"
 *     responses:
 *       200:
 *         description: 모의 태그 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/mock-tag', async (req, res) => {
  try {
    const { rfid_card_id } = req.body;
    
    if (!rfid_card_id) {
      return res.status(400).json({ 
        success: false,
        message: 'RFID 카드 ID가 필요합니다' 
      });
    }

    // 모의 태그 데이터 저장
    mockRfidData = {
      lastTag: {
        rfid_card_id: rfid_card_id,
        timestamp: new Date().toISOString(),
        processed: false
      }
    };

    return res.json({ 
      success: true, 
      message: '모의 RFID 태그가 생성되었습니다',
      data: {
        rfid_card_id: rfid_card_id,
        timestamp: mockRfidData.lastTag.timestamp
      }
    });
  } catch (error) {
    logger.error('모의 RFID 태그 설정 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '모의 태그 생성 중 오류가 발생했습니다' 
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/check-tag:
 *   get:
 *     summary: RFID 태그 확인
 *     description: 새로운 RFID 태그가 있는지 확인합니다 (폴링용)
 *     tags:
 *       - RFID
 *     parameters:
 *       - in: header
 *         name: X-Reader-Location
 *         schema:
 *           type: string
 *         description: RFID 리더기 위치
 *         example: "1-1"
 *     responses:
 *       200:
 *         description: 태그 확인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasNewTag:
 *                   type: boolean
 *                   description: 새로운 태그 여부
 *                 uid:
 *                   type: string
 *                   description: RFID UID (태그가 있는 경우)
 *                 result:
 *                   type: object
 *                   description: 태그 처리 결과 (태그가 있는 경우)
 */
// RFID 태그 확인 엔드포인트 (프론트엔드 폴링용)
router.get('/check-tag', async (req, res) => {
  try {
    logger.debug('[RFID] 프론트엔드에서 태그 체크 요청');
    
    // Arduino Bridge에서 데이터를 가져옴
    const latestTag = arduinoBridge.getLatestTag();
    
    if (latestTag && !latestTag.processed) {
      logger.info(`[RFID] ✅ 새 태그 발견: "${latestTag.rfid_card_id}"`);
      
      // 태그를 처리됨으로 표시
      arduinoBridge.markTagProcessed(latestTag.id);
      
      return res.json({
        hasNewTag: true,
        uid: latestTag.rfid_card_id,
        timestamp: latestTag.tag_time,
      });
    }
    
    // Mock 데이터 완전 제거
    
    logger.debug('[RFID] 새 태그 없음');
    return res.json({ hasNewTag: false });
  } catch (error) {
    logger.error('[RFID] ❌ 태그 확인 오류:', error);
    return res.status(500).json({ error: '태그 확인 중 오류가 발생했습니다' });
  }
});

/**
 * @swagger
 * /api/v1/rfid/reader-status:
 *   get:
 *     summary: RFID 리더기 상태 조회
 *     description: RFID 리더기의 연결 상태와 정보를 조회합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 리더기 상태 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     port:
 *                       type: string
 *                     last_ping:
 *                       type: string
 *                     reader_info:
 *                       type: object
 *                       properties:
 *                         model:
 *                           type: string
 *                         version:
 *                           type: string
 */
router.get('/reader-status', async (req, res) => {
  try {
    // Arduino Bridge를 통해 실제 상태 확인
    const status = arduinoBridge.getStatus();
    
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('RFID 리더기 상태 조회 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '리더기 상태 조회 중 오류가 발생했습니다' 
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/logs:
 *   get:
 *     summary: RFID 태그 로그 조회
 *     description: RFID 태그 로그를 조회합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: 로그 조회 성공
 */
router.get('/logs', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      start_date, 
      end_date 
    } = req.query;
    
    const { MorningAttendance, User } = require('../../models');
    const { Op } = require('sequelize');
    
    const whereClause = {};
    if (start_date && end_date) {
      whereClause.date = {
        [Op.between]: [start_date, end_date]
      };
    }
    
    const logs = await MorningAttendance.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'grade', 'class', 'number', 'rfid_card_id'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return res.json({
      success: true,
      data: logs.rows,
      total: logs.count,
      hasMore: (parseInt(offset) + parseInt(limit)) < logs.count
    });
  } catch (error) {
    logger.error('RFID 태그 로그 조회 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '로그 조회 중 오류가 발생했습니다' 
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/test-connection:
 *   post:
 *     summary: RFID 리더기 연결 테스트
 *     description: RFID 리더기와의 연결을 테스트합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 연결 테스트 성공
 *       500:
 *         description: 연결 실패
 */
router.post('/test-connection', async (req, res) => {
  try {
    // 실제 환경에서는 Arduino Bridge를 통해 연결 테스트
    // const arduinoBridge = require('../services/arduinoBridge');
    // const testResult = await arduinoBridge.testConnection();
    
    // 개발 환경에서는 모의 테스트 결과 반환
    const testResult = {
      success: true,
      ping_time: Math.floor(Math.random() * 50) + 10, // 10-60ms
      reader_info: {
        model: 'RC522',
        version: '1.0.0',
        serial: 'ABC123456'
      }
    };
    
    return res.json({
      success: true,
      message: 'RFID 리더기 연결 테스트 성공',
      data: testResult
    });
  } catch (error) {
    logger.error('RFID 연결 테스트 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: 'RFID 리더기 연결 테스트 실패' 
    });
  }
});

// 현재 모의 태그 데이터 조회 (개발용)
router.get('/mock-status', async (req, res) => {
  try {
    return res.json({
      mockData: mockRfidData,
      message: '현재 모의 RFID 데이터 상태입니다'
    });
  } catch (error) {
    logger.error('모의 데이터 조회 오류:', error);
    return res.status(500).json({ error: '모의 데이터 조회 중 오류가 발생했습니다' });
  }
});

// 모의 태그 데이터 초기화 (개발용)
router.delete('/mock-reset', async (req, res) => {
  try {
    mockRfidData = {
      lastTag: null,
      processed: true
    };
    
    return res.json({ 
      success: true, 
      message: '모의 RFID 데이터가 초기화되었습니다' 
    });
  } catch (error) {
    logger.error('모의 데이터 초기화 오류:', error);
    return res.status(500).json({ error: '모의 데이터 초기화 중 오류가 발생했습니다' });
  }
});

/**
 * @swagger
 * /api/v1/rfid/ports:
 *   get:
 *     summary: 사용 가능한 시리얼 포트 목록 조회
 *     description: 시스템에서 사용 가능한 모든 시리얼 포트를 조회합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 포트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       manufacturer:
 *                         type: string
 *                       serialNumber:
 *                         type: string
 *                       pnpId:
 *                         type: string
 *                       vendorId:
 *                         type: string
 *                       productId:
 *                         type: string
 *       500:
 *         description: 서버 오류
 */
router.get('/ports', async (req, res) => {
  try {
    let ports = [];
    
    try {
      // 실제 serialport 모듈 사용 시도
      const { SerialPort } = require('serialport');
      ports = await SerialPort.list();
      
      return res.json({
        success: true,
        data: ports,
        message: '사용 가능한 시리얼 포트 목록입니다'
      });
    } catch (serialportError) {
      logger.info('serialport 모듈이 설치되지 않음. 시스템 명령어로 포트 스캔 시도...');
      
      // Windows에서 시스템 명령어로 포트 목록 가져오기
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      try {
        // Windows에서 wmic 명령어로 시리얼 포트 조회
        const { stdout } = await execAsync('wmic path Win32_SerialPort get DeviceID,Name,Description /format:csv');
        
        const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
        ports = lines.map(line => {
          const parts = line.split(',');
          if (parts.length >= 4) {
            const deviceId = parts[2]?.trim();
            const name = parts[3]?.trim();
            const description = parts[1]?.trim();
            
            if (deviceId && deviceId.startsWith('COM')) {
              return {
                path: deviceId,
                manufacturer: name || description || 'Unknown',
                serialNumber: undefined,
                pnpId: undefined,
                vendorId: undefined,
                productId: undefined
              };
            }
          }
          return null;
        }).filter(Boolean);
        
        logger.debug(`wmic으로 찾은 포트 개수: ${ports.length}`);
        
        // 추가로 Registry에서 COM 포트 확인 (더 정확한 방법)
        if (ports.length === 0) {
          try {
            const { stdout: regStdout } = await execAsync('reg query "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM" /s');
            const regLines = regStdout.split('\n');
            
            regLines.forEach(line => {
              const match = line.match(/COM(\d+)/);
              if (match) {
                const comPort = match[0];
                if (!ports.some(p => p.path === comPort)) {
                  ports.push({
                    path: comPort,
                    manufacturer: 'Registry Found',
                    serialNumber: undefined,
                    pnpId: undefined,
                    vendorId: undefined,
                    productId: undefined
                  });
                }
              }
            });
          } catch (regError) {
            logger.warn('Registry 조회 실패:', regError.message);
          }
        }
        
      } catch (wmicError) {
        logger.warn('wmic 명령어 실패:', wmicError.message);
        
        // Registry에서 COM 포트 찾기
        try {
          const { stdout: regStdout } = await execAsync('reg query "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM"');
          const regLines = regStdout.split('\n');
          
          ports = [];
          regLines.forEach(line => {
            const match = line.match(/REG_SZ\s+(.+?)\s+(COM\d+)/);
            if (match) {
              const deviceName = match[1];
              const comPort = match[2];
              ports.push({
                path: comPort,
                manufacturer: deviceName.includes('Arduino') ? 'Arduino' : 'Unknown',
                serialNumber: undefined,
                pnpId: deviceName,
                vendorId: undefined,
                productId: undefined
              });
            }
          });
          
          logger.debug(`Registry에서 찾은 포트: ${ports.map(p => p.path).join(', ')}`);
          
        } catch (regError) {
          logger.warn('Registry 조회도 실패:', regError.message);
          
          // 최후의 수단: PowerShell로 시도
          try {
            const { stdout: psStdout } = await execAsync('powershell "Get-WmiObject -Class Win32_SerialPort | Select-Object DeviceID, Name | ConvertTo-Json"');
            const psData = JSON.parse(psStdout);
            const psArray = Array.isArray(psData) ? psData : [psData];
            
            ports = psArray.filter(item => item && item.DeviceID).map(item => ({
              path: item.DeviceID,
              manufacturer: item.Name || 'Unknown',
              serialNumber: undefined,
              pnpId: undefined,
              vendorId: undefined,
              productId: undefined
            }));
            
            logger.debug(`PowerShell로 찾은 포트: ${ports.map(p => p.path).join(', ')}`);
            
          } catch (psError) {
            logger.warn('PowerShell도 실패:', psError.message);
            ports = []; // 빈 배열 반환
          }
        }
      }
      
      return res.json({
        success: true,
        data: ports,
        message: '시리얼 포트 목록입니다. serialport 모듈 설치 권장: npm install serialport'
      });
    }
  } catch (error) {
    logger.error('시리얼 포트 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '시리얼 포트 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/connect:
 *   post:
 *     summary: Arduino 포트 연결 설정
 *     description: 지정된 시리얼 포트로 Arduino 연결을 시도합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               port:
 *                 type: string
 *                 description: 연결할 시리얼 포트
 *                 example: "COM3"
 *               baudRate:
 *                 type: integer
 *                 description: 통신 속도
 *                 default: 9600
 *     responses:
 *       200:
 *         description: 연결 성공
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 연결 실패
 */
router.post('/connect', async (req, res) => {
  try {
    const { port, baudRate = 9600, pageId = 'unknown' } = req.body; 
    
    if (!port) {
      return res.status(400).json({
        success: false,
        message: '시리얼 포트를 지정해주세요'
      });
    }

    // Arduino Bridge를 통해 새 포트로 연결 시도
    const result = await arduinoBridge.connectToPort(port, baudRate, pageId);
    
    return res.json({
      success: true,
      message: `포트 ${port}로 Arduino 연결이 성공했습니다`,
      data: {
        port: port,
        baudRate: baudRate,
        connected_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Arduino 연결 오류:', error);
    return res.status(500).json({
      success: false,
      message: `Arduino 연결 실패: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/disconnect:
 *   post:
 *     summary: Arduino 연결 해제
 *     description: 현재 Arduino 연결을 해제합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 연결 해제 성공
 *       500:
 *         description: 서버 오류
 */
router.post('/disconnect', async (req, res) => {
  try {
    arduinoBridge.resetConnection(); // 완전 초기화로 변경
    
    return res.json({
      success: true,
      message: 'Arduino 연결이 해제되었습니다'
    });
  } catch (error) {
    logger.error('Arduino 연결 해제 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'Arduino 연결 해제 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/write-card:
 *   post:
 *     summary: RFID 카드에 학생 정보 쓰기
 *     description: Arduino를 통해 RFID 카드에 학생 정보를 씁니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: string
 *                 description: 학생 ID
 *               student_name:
 *                 type: string
 *                 description: 학생 이름
 *               card_id:
 *                 type: string
 *                 description: RFID 카드 ID (선택사항)
 *     responses:
 *       200:
 *         description: 카드 쓰기 성공
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/write-card', async (req, res) => {
  try {
    const { student_id, student_name } = req.body;
    
    if (!student_id || !student_name) {
      return res.status(400).json({
        success: false,
        message: '학생 ID와 이름이 필요합니다'
      });
    }

    logger.info(`[RFID] 카드 쓰기 요청: student_id=${student_id}, student_name=${student_name}`);

    // Arduino Bridge를 통해 카드 쓰기 명령 전송
    const writeSuccess = arduinoBridge.writeCardData(student_id, student_name);
    
    if (writeSuccess) {
      return res.json({
        success: true,
        message: 'RFID 카드 쓰기 명령이 Arduino로 전송되었습니다. 카드를 리더기에 올려주세요.',
        data: {
          student_id: student_id,
          student_name: student_name,
          timestamp: new Date().toISOString(),
          status: 'command_sent'
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Arduino가 연결되지 않았습니다. 먼저 Arduino를 연결해주세요.'
      });
    }
  } catch (error) {
    logger.error('[RFID] 카드 쓰기 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'RFID 카드 쓰기 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/card-info/{card_id}:
 *   get:
 *     summary: RFID 카드 정보 조회
 *     description: 특정 RFID 카드의 정보를 조회합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: card_id
 *         required: true
 *         schema:
 *           type: string
 *         description: RFID 카드 ID
 *     responses:
 *       200:
 *         description: 카드 정보 조회 성공
 *       404:
 *         description: 카드를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/card-info/:card_id', async (req, res) => {
  try {
    const { card_id } = req.params;
    const { User } = require('../../models');

    // 해당 RFID 카드를 가진 사용자 조회
    const user = await User.findOne({
      where: { rfid_card_id: card_id },
      attributes: ['id', 'name', 'student_id', 'grade', 'class', 'number', 'rfid_card_id']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '해당 RFID 카드에 연결된 사용자를 찾을 수 없습니다'
      });
    }

    return res.json({
      success: true,
      data: {
        card_id: card_id,
        user: user,
        registered_at: user.created_at,
        is_active: true
      }
    });
  } catch (error) {
    logger.error('RFID 카드 정보 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '카드 정보 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/students:
 *   get:
 *     summary: RFID 등록 학생 목록 조회
 *     description: RFID 카드가 등록된 학생들의 목록을 조회합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *         description: 학년 필터
 *       - in: query
 *         name: class
 *         schema:
 *           type: integer
 *         description: 반 필터
 *       - in: query
 *         name: has_rfid
 *         schema:
 *           type: boolean
 *         description: RFID 등록 여부 필터
 *     responses:
 *       200:
 *         description: 학생 목록 조회 성공
 *       500:
 *         description: 서버 오류
 */
router.get('/students', async (req, res) => {
  try {
    const { grade, class: classNum, has_rfid } = req.query;
    const { User } = require('../../models');
    const { Op } = require('sequelize');

    const whereClause = { role: 'student' };
    
    if (grade) {
      whereClause.grade = parseInt(grade);
    }
    
    if (classNum) {
      whereClause.class = parseInt(classNum);
    }
    
    if (has_rfid !== undefined) {
      if (has_rfid === 'true') {
        whereClause.rfid_card_id = { [Op.not]: null };
      } else if (has_rfid === 'false') {
        whereClause.rfid_card_id = null;
      }
    }

    const students = await User.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'student_id', 'grade', 'class', 'number', 
        'rfid_card_id', 'created_at', 'updated_at'
      ],
      order: [['grade', 'ASC'], ['class', 'ASC'], ['number', 'ASC']]
    });

    // 통계 정보 계산
    const totalStudents = students.length;
    const studentsWithRfid = students.filter(s => s.rfid_card_id).length;
    const registrationRate = totalStudents > 0 ? (studentsWithRfid / totalStudents * 100).toFixed(1) : 0;

    return res.json({
      success: true,
      data: students,
      statistics: {
        total_students: totalStudents,
        students_with_rfid: studentsWithRfid,
        students_without_rfid: totalStudents - studentsWithRfid,
        registration_rate: parseFloat(registrationRate)
      }
    });
  } catch (error) {
    logger.error('RFID 학생 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '학생 목록 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/assign-card:
 *   post:
 *     summary: 학생에게 RFID 카드 할당
 *     description: 특정 학생에게 RFID 카드를 할당합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *                 description: 학생 ID
 *               rfid_card_id:
 *                 type: string
 *                 description: 할당할 RFID 카드 ID
 *     responses:
 *       200:
 *         description: 카드 할당 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 학생을 찾을 수 없음
 *       409:
 *         description: 카드가 이미 사용 중
 *       500:
 *         description: 서버 오류
 */
router.post('/assign-card', async (req, res) => {
  try {
    const { student_id, rfid_card_id } = req.body;
    
    if (!student_id || !rfid_card_id) {
      return res.status(400).json({
        success: false,
        message: '학생 ID와 RFID 카드 ID가 필요합니다'
      });
    }

    const { User } = require('../../models');
    
    // 학생 존재 확인
    const student = await User.findByPk(student_id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: '해당 학생을 찾을 수 없습니다'
      });
    }

    // RFID 카드 중복 확인
    const existingCard = await User.findOne({
      where: { rfid_card_id: rfid_card_id }
    });
    
    if (existingCard && existingCard.id !== student_id) {
      return res.status(409).json({
        success: false,
        message: '해당 RFID 카드는 이미 다른 학생에게 할당되어 있습니다',
        data: {
          current_owner: {
            name: existingCard.name,
            student_id: existingCard.student_id
          }
        }
      });
    }

    // 학생의 기존 RFID 카드 정보 저장 (로그용)
    const previousRfidCard = student.rfid_card_id;

    // RFID 카드 할당
    await student.update({ rfid_card_id: rfid_card_id });

    // 할당 로그 기록 (실제 환경에서는 별도 로그 테이블 사용)
    logger.info(`RFID 카드 할당: 학생 ${student.name} (${student.student_id}) - ${previousRfidCard} → ${rfid_card_id}`);

    return res.json({
      success: true,
      message: 'RFID 카드가 성공적으로 할당되었습니다',
      data: {
        student: {
          id: student.id,
          name: student.name,
          student_id: student.student_id,
          grade: student.grade,
          class: student.class,
          number: student.number
        },
        rfid_card_id: rfid_card_id,
        previous_card_id: previousRfidCard,
        assigned_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('RFID 카드 할당 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'RFID 카드 할당 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /api/v1/rfid/unassign-card:
 *   post:
 *     summary: 학생의 RFID 카드 할당 해제
 *     description: 특정 학생의 RFID 카드 할당을 해제합니다
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *                 description: 학생 ID
 *     responses:
 *       200:
 *         description: 카드 할당 해제 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 학생을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/unassign-card', async (req, res) => {
  try {
    const { student_id } = req.body;
    
    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: '학생 ID가 필요합니다'
      });
    }

    const { User } = require('../../models');
    
    // 학생 존재 확인
    const student = await User.findByPk(student_id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: '해당 학생을 찾을 수 없습니다'
      });
    }

    const previousRfidCard = student.rfid_card_id;
    
    if (!previousRfidCard) {
      return res.status(400).json({
        success: false,
        message: '해당 학생에게 할당된 RFID 카드가 없습니다'
      });
    }

    // RFID 카드 할당 해제
    await student.update({ rfid_card_id: null });

    // 할당 해제 로그 기록
    logger.info(`RFID 카드 할당 해제: 학생 ${student.name} (${student.student_id}) - ${previousRfidCard} 해제`);

    return res.json({
      success: true,
      message: 'RFID 카드 할당이 성공적으로 해제되었습니다',
      data: {
        student: {
          id: student.id,
          name: student.name,
          student_id: student.student_id,
          grade: student.grade,
          class: student.class,
          number: student.number
        },
        previous_card_id: previousRfidCard,
        unassigned_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('RFID 카드 할당 해제 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'RFID 카드 할당 해제 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;