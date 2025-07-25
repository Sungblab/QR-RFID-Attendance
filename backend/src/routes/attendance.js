const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const { 
  User, 
  MorningAttendance,
  QRCode,
  AttendanceReport,
  AttendanceSettings
} = require('../../models');
const { authenticateToken: requireAuth, requireRole } = require('../middleware/auth');
const logger = require('../../config/logger');

// 아침 등교 처리 함수 (RFID/QR 공통)
const handleMorningAttendance = async (student, timestamp, method = 'qr') => { // classroom 매개변수 제거
  try {
    // 1. 학생의 소속 교실 정보 (기록용)
    const expectedClassroom = `${student.grade}-${student.class}`;

    // 2. 중복 체크
    const today = timestamp.toISOString().split('T')[0];
    const existing = await MorningAttendance.findOne({
      where: {
        user_id: student.id,
        date: today
      }
    });

    if (existing) {
      return { 
        success: false, 
        message: '이미 등교 체크가 완료되었습니다' 
      };
    }

    // 3. 현재 활성 출결 시간 설정 조회
    const settings = await AttendanceSettings.findOne({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });

    // 기본값 사용 (설정이 없는 경우)
    const lateTime = settings ? settings.late_time : '08:00:00';
    const [lateHour, lateMinute] = lateTime.split(':').map(Number);
    
    // 현재 시간과 지각 기준 시간 비교
    const currentHour = timestamp.getHours();
    const currentMinute = timestamp.getMinutes();
    const isLate = (currentHour > lateHour) || (currentHour === lateHour && currentMinute >= lateMinute);
    
    const status = isLate ? 'late' : 'on_time';
    
    await MorningAttendance.create({
      user_id: student.id,
      date: today,
      check_in_time: timestamp.toTimeString().split(' ')[0],
      status: status,
      // classroom: classroom // 교실 구분 제거
    });

    return {
      success: true,
      type: 'morning',
      status: status,
      message: status === 'on_time' ? '정상 등교했습니다' : '지각입니다',
      student: {
        name: student.name,
        grade: student.grade,
        class: student.class,
        number: student.number
      }
    };
  } catch (error) {
    console.error('아침 등교 처리 오류:', error);
    return {
      success: false,
      message: '출결 처리 중 오류가 발생했습니다'
    };
  }
};

/**
 * @swagger
 * /api/v1/attendance/rfid-tag:
 *   post:
 *     summary: RFID 태그 처리
 *     description: RFID 카드 태그를 처리하여 아침 등교를 기록합니다
 *     tags:
 *       - Attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rfid_uid
 *               - reader_location
 *             properties:
 *               rfid_uid:
 *                 type: string
 *                 description: RFID 카드 UID
 *                 example: "RFID001"
 *               reader_location:
 *                 type: string
 *                 description: RFID 리더기 위치
 *                 example: "1-1"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: 태그 시간 (선택사항, 기본값은 현재시간)
 *     responses:
 *       200:
 *         description: 태그 처리 성공
 *       404:
 *         description: 등록되지 않은 RFID 카드
 *       500:
 *         description: 서버 오류
 */
// RFID 카드 태그 처리 (아침 등교만)
router.post('/rfid-tag', async (req, res) => {
  try {
    const { rfid_uid, reader_location, timestamp } = req.body;
    const tagTime = timestamp ? new Date(timestamp) : new Date();

    // 1. RFID로 학생 조회
    const student = await User.findOne({ 
      where: { rfid_card_id: rfid_uid, role: 'student' }
    });
    
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: '등록되지 않은 RFID 카드입니다' 
      });
    }

    // 2. 아침 등교 처리
    const result = await handleMorningAttendance(student, tagTime, 'rfid'); // reader_location 제거
    return res.json(result);

  } catch (error) {
    console.error('RFID 태그 처리 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '출결 처리 중 오류가 발생했습니다' 
    });
  }
});

/**
 * @swagger
 * /api/v1/attendance/qr-scan:
 *   post:
 *     summary: QR코드 스캔 처리
 *     description: QR코드 스캔을 처리하여 아침 등교를 기록합니다
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_id
 *               - qr_token
 *             properties:
 *               student_id:
 *                 type: string
 *                 description: 학번
 *                 example: "2024001"
 *               qr_token:
 *                 type: string
 *                 description: QR코드 토큰
 *                 example: "abc123def456"
 *     responses:
 *       200:
 *         description: 스캔 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 type:
 *                   type: string
 *                   example: "morning"
 *                 status:
 *                   type: string
 *                   enum: [on_time, late]
 *                 message:
 *                   type: string
 *                 student:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     grade:
 *                       type: integer
 *                     class:
 *                       type: integer
 *                     number:
 *                       type: integer
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 등록되지 않은 학생 또는 유효하지 않은 QR코드
 *       500:
 *         description: 서버 오류
 */
// QR코드 스캔 처리 (아침 등교만) - 관리자 리더기용
router.post('/qr-scan', async (req, res) => {
  try {
    const { student_id, qr_token } = req.body;
    const timestamp = new Date();

    // 1. 학생 조회
    const student = await User.findOne({ 
      where: { student_id: student_id, role: 'student' }
    });
    
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: '등록되지 않은 학생입니다' 
      });
    }

    // 2. 중복 체크
    const today = timestamp.toISOString().split('T')[0];
    const existing = await MorningAttendance.findOne({
      where: {
        user_id: student.id,
        date: today
      }
    });

    if (existing) {
      return res.json({ 
        success: false, 
        message: '이미 등교 체크가 완료되었습니다' 
      });
    }

    // 3. 현재 활성 출결 시간 설정 조회
    const settings = await AttendanceSettings.findOne({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });

    // 기본값 사용 (설정이 없는 경우)
    const lateTime = settings ? settings.late_time : '08:00:00';
    const [lateHour, lateMinute] = lateTime.split(':').map(Number);
    
    // 현재 시간과 지각 기준 시간 비교
    const currentHour = timestamp.getHours();
    const currentMinute = timestamp.getMinutes();
    const isLate = (currentHour > lateHour) || (currentHour === lateHour && currentMinute >= lateMinute);
    
    const status = isLate ? 'late' : 'on_time';

    // 4. 아침 등교 기록
    await MorningAttendance.create({
      user_id: student.id,
      date: today,
      check_in_time: timestamp.toTimeString().split(' ')[0],
      status: status,
      // classroom: `${student.grade}-${student.class}` // 교실 구분 제거
    });

    return res.json({
      success: true,
      type: 'morning',
      status: status,
      message: status === 'on_time' ? '정상 등교했습니다' : '지각입니다',
      student: {
        name: student.name,
        grade: student.grade,
        class: student.class,
        number: student.number
      }
    });

  } catch (error) {
    console.error('QR코드 스캔 처리 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '출결 처리 중 오류가 발생했습니다' 
    });
  }
});

/**
 * @swagger
 * /api/v1/attendance/records:
 *   get:
 *     summary: 출결 현황 조회 (관리자용)
 *     description: 전체 학생의 출결 현황을 조회합니다
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회할 날짜 (YYYY-MM-DD)
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *         description: 학년
 *       - in: query
 *         name: class
 *         schema:
 *           type: integer
 *         description: 반
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [on_time, late, absent]
 *         description: 출결 상태
 *     responses:
 *       200:
 *         description: 출결 현황 조회 성공
 *       403:
 *         description: 권한 없음
 */
// ==================== Excel 관련 API ====================

/**
 * @swagger
 * /attendance/records/export:
 *   get:
 *     summary: 출결기록 Excel 다운로드
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작 날짜
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료 날짜
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [on_time, late, absent]
 *         description: 출결 상태 필터
 *     responses:
 *       200:
 *         description: Excel 파일
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/records/export', async (req, res) => {
  try {
    const { startDate, endDate, grade, class: classNum, status } = req.query;

    // 날짜 기본값 설정 (오늘)
    const today = new Date().toISOString().split('T')[0];
    const filterStartDate = startDate || today;
    const filterEndDate = endDate || today;

    // 출결 데이터 조회 조건 구성
    const whereClause = {
      date: {
        [Op.between]: [filterStartDate, filterEndDate]
      }
    };

    if (status) {
      whereClause.status = status;
    }

    // 사용자 조건 구성
    const userWhereClause = { role: 'student' };
    if (grade) userWhereClause.grade = parseInt(grade);
    if (classNum) userWhereClause.class = parseInt(classNum);

    // 출결 데이터 조회
    const attendanceRecords = await MorningAttendance.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        where: userWhereClause,
        attributes: ['student_id', 'name', 'grade', 'class', 'number']
      }],
      order: [
        ['date', 'DESC'],
        [{ model: User, as: 'user' }, 'grade', 'ASC'],
        [{ model: User, as: 'user' }, 'class', 'ASC'],
        [{ model: User, as: 'user' }, 'number', 'ASC']
      ]
    });

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: '조건에 맞는 출결 기록이 없습니다.',
        code: 'NO_RECORDS_FOUND'
      });
    }

    // Excel 데이터 변환
    const excelData = attendanceRecords.map(record => ({
      '날짜': record.date,
      '학번': record.user.student_id,
      '이름': record.user.name,
      '학년': record.user.grade,
      '반': record.user.class,
      '번호': record.user.number,
      '출결상태': record.status === 'on_time' ? '정상' : 
                 record.status === 'late' ? '지각' : '결석',
      '체크인시간': record.check_in_time || '미체크',
      '등록일시': new Date(record.createdAt).toLocaleString('ko-KR')
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { width: 12 }, // 날짜
      { width: 12 }, // 학번
      { width: 10 }, // 이름
      { width: 8 },  // 학년
      { width: 8 },  // 반
      { width: 8 },  // 번호
      { width: 10 }, // 출결상태
      { width: 15 }, // 체크인시간
      { width: 20 }  // 등록일시
    ];

    // 워크시트 제목 설정
    const sheetName = `출결기록_${filterStartDate}${filterStartDate !== filterEndDate ? `_${filterEndDate}` : ''}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Excel 파일을 버퍼로 변환
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 파일명 설정
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const dateStr = koreaTime.toISOString().slice(0, 10);
    const filterStr = grade && classNum ? `_${grade}학년_${classNum}반` : 
                     grade ? `_${grade}학년` : 
                     classNum ? `_${classNum}반` : '';
    const periodStr = filterStartDate !== filterEndDate ? `_${filterStartDate}_${filterEndDate}` : `_${filterStartDate}`;
    const filename = `출결기록${filterStr}${periodStr}_${dateStr}.xlsx`;

    logger.info(`출결기록 Excel 다운로드: ${attendanceRecords.length}건`, {
      filters: { startDate: filterStartDate, endDate: filterEndDate, grade, class: classNum, status }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('출결기록 Excel 내보내기 실패:', error);
    res.status(500).json({
      success: false,
      message: '출결기록을 내보내는 중 오류가 발생했습니다.',
      code: 'EXPORT_ERROR'
    });
  }
});

/**
 * @swagger
 * /attendance/reports/export:
 *   get:
 *     summary: 출결신고 목록 Excel 다운로드
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작 날짜
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료 날짜
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [absence, late, early_leave, sick_leave, official_leave]
 *         description: 신고 유형 필터
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: 처리 상태 필터
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
 *     responses:
 *       200:
 *         description: Excel 파일
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/reports/export', async (req, res) => {
  try {
    const { startDate, endDate, type, status, grade, class: classNum } = req.query;

    // 기본 날짜 설정 (최근 30일)
    const today = new Date();
    const defaultStartDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEndDate = today.toISOString().split('T')[0];

    const filterStartDate = startDate || defaultStartDate;
    const filterEndDate = endDate || defaultEndDate;

    // 출결 신고 조회 조건 구성
    const whereClause = {
      date: {
        [Op.between]: [filterStartDate, filterEndDate]
      }
    };

    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    // 사용자 조건 구성
    const userWhereClause = { role: 'student' };
    if (grade) userWhereClause.grade = parseInt(grade);
    if (classNum) userWhereClause.class = parseInt(classNum);

    // 출결 신고 데이터 조회
    const reports = await AttendanceReport.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'student',
          where: userWhereClause,
          attributes: ['student_id', 'name', 'grade', 'class', 'number']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['name', 'role'],
          required: false
        }
      ],
      order: [
        ['submitted_at', 'DESC']
      ]
    });

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: '조건에 맞는 출결 신고가 없습니다.',
        code: 'NO_REPORTS_FOUND'
      });
    }

    // 신고 유형 한글 변환 함수
    const getTypeKorean = (type) => {
      const typeMap = {
        'absence': '결석',
        'late': '지각',
        'early_leave': '조퇴',
        'sick_leave': '병가',
        'official_leave': '공가'
      };
      return typeMap[type] || type;
    };

    // 처리 상태 한글 변환 함수
    const getStatusKorean = (status) => {
      const statusMap = {
        'pending': '대기중',
        'approved': '승인',
        'rejected': '거부'
      };
      return statusMap[status] || status;
    };

    // Excel 데이터 변환
    const excelData = reports.map(report => ({
      '신고일': report.date,
      '학번': report.student.student_id,
      '이름': report.student.name,
      '학년': report.student.grade,
      '반': report.student.class,
      '번호': report.student.number,
      '신고유형': getTypeKorean(report.type),
      '사유': report.reason,
      '처리상태': getStatusKorean(report.status),
      '처리자': report.processor ? `${report.processor.name} (${report.processor.role})` : '미처리',
      '처리일시': report.processed_at ? new Date(report.processed_at).toLocaleString('ko-KR') : '미처리',
      '처리응답': report.processor_response || '',
      '관리자생성': report.admin_created ? '예' : '아니오',
      '비고': report.notes || '',
      '제출일시': new Date(report.submitted_at).toLocaleString('ko-KR')
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { width: 12 }, // 신고일
      { width: 12 }, // 학번
      { width: 10 }, // 이름
      { width: 8 },  // 학년
      { width: 8 },  // 반
      { width: 8 },  // 번호
      { width: 10 }, // 신고유형
      { width: 30 }, // 사유
      { width: 10 }, // 처리상태
      { width: 15 }, // 처리자
      { width: 20 }, // 처리일시
      { width: 30 }, // 처리응답
      { width: 12 }, // 관리자생성
      { width: 20 }, // 비고
      { width: 20 }  // 제출일시
    ];

    // 워크시트 제목 설정
    const sheetName = `출결신고_${filterStartDate}${filterStartDate !== filterEndDate ? `_${filterEndDate}` : ''}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Excel 파일을 버퍼로 변환
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 파일명 설정
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const dateStr = koreaTime.toISOString().slice(0, 10);
    const filterStr = grade && classNum ? `_${grade}학년_${classNum}반` : 
                     grade ? `_${grade}학년` : 
                     classNum ? `_${classNum}반` : '';
    const periodStr = filterStartDate !== filterEndDate ? `_${filterStartDate}_${filterEndDate}` : `_${filterStartDate}`;
    const filename = `출결신고${filterStr}${periodStr}_${dateStr}.xlsx`;

    logger.info(`출결신고 Excel 다운로드: ${reports.length}건`, {
      filters: { startDate: filterStartDate, endDate: filterEndDate, type, status, grade, class: classNum }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('출결신고 Excel 내보내기 실패:', error);
    res.status(500).json({
      success: false,
      message: '출결신고 목록을 내보내는 중 오류가 발생했습니다.',
      code: 'EXPORT_ERROR'
    });
  }
});

// 출결 현황 조회 (관리자용)
router.get('/records', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { startDate, endDate, date, grade, class: classNum, status } = req.query;
    
    // 날짜 범위 설정
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        [Op.between]: [startDate, endDate]
      };
    } else if (date) {
      dateRange = date;
    } else {
      dateRange = new Date().toISOString().split('T')[0];
    }

    const userWhereClause = {};
    if (grade) userWhereClause.grade = parseInt(grade);
    if (classNum) userWhereClause.class = parseInt(classNum);
    
    // 아침 출결 기록 조회
    const attendanceWhereClause = { date: dateRange };
    if (status) attendanceWhereClause.status = status;
    
    const attendanceRecords = await MorningAttendance.findAll({
      where: attendanceWhereClause,
      include: [{
        model: User,
        as: 'user',
        where: { ...userWhereClause, role: 'student' },
        attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id']
      }],
      order: [
        ['date', 'DESC'],
        [{ model: User, as: 'user' }, 'grade', 'ASC'],
        [{ model: User, as: 'user' }, 'class', 'ASC'],
        [{ model: User, as: 'user' }, 'number', 'ASC']
      ]
    });   

    // 등교하지 않은 학생들도 포함하여 전체 목록 생성 (결석으로 처리)
    if (!status || status === 'absent') {
      const allStudents = await User.findAll({
        where: { 
          role: 'student',
          ...userWhereClause
        },
        attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id'],
        order: [['grade', 'ASC'], ['class', 'ASC'], ['number', 'ASC']]
      });

      // 날짜별로 처리
      const dates = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
      } else if (date) {
        dates.push(date);
      } else {
        dates.push(new Date().toISOString().split('T')[0]);
      }

      const allRecords = [];

      // 기존 출결 기록 추가
      const transformedAttendanceRecords = attendanceRecords.map(record => ({
        ...record.toJSON(),
        User: record.user
      }));
      allRecords.push(...transformedAttendanceRecords);

      // 각 날짜별로 결석 학생 추가
      for (const targetDate of dates) {
        const dayAttendanceRecords = attendanceRecords.filter(record => record.date === targetDate);
        const attendedStudentIds = new Set(dayAttendanceRecords.map(record => record.user_id));
        
        const absentStudents = allStudents
          .filter(student => !attendedStudentIds.has(student.id))
          .map(student => ({
            id: null,
            date: targetDate,
            check_in_time: null,
            status: 'absent',
            // classroom: `${student.grade}-${student.class}` // 교실 구분 제거,
            user: student,
            User: student
          }));
        
        allRecords.push(...absentStudents);
      }
    
      
      return res.json({
        success: true,
        data: allRecords,
        dateRange: startDate && endDate ? { startDate, endDate } : { date: dates[0] },
        summary: {
          total: allRecords.length,
          on_time: transformedAttendanceRecords.filter(r => r.status === 'on_time').length,
          late: transformedAttendanceRecords.filter(r => r.status === 'late').length,
          absent: allRecords.filter(r => r.status === 'absent').length
        }
      });
    }

    // Transform attendanceRecords to include uppercase User property
    const transformedAttendanceRecords = attendanceRecords.map(record => ({
      ...record.toJSON(),
      User: record.user
    }));
    
    return res.json({
      success: true,
      data: transformedAttendanceRecords,
      dateRange: startDate && endDate ? { startDate, endDate } : { date: date || new Date().toISOString().split('T')[0] }
    });

  } catch (error) {
    console.error('출결 현황 조회 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '출결 현황 조회 중 오류가 발생했습니다' 
    });
  }
});

/**
 * @swagger
 * /api/v1/attendance/records/{recordId}:
 *   put:
 *     summary: 출결 상태 수동 변경
 *     description: 관리자가 특정 출결 기록의 상태를 수동으로 변경합니다
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: 출결 기록 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [on_time, late, absent]
 *                 description: 변경할 출결 상태
 *                 example: "on_time"
 *               check_in_time:
 *                 type: string
 *                 format: time
 *                 description: 체크인 시간 (선택사항)
 *                 example: "08:30:00"
 *     responses:
 *       200:
 *         description: 출결 상태 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// 출결 상태 수동 변경 (관리자용)
router.put('/records/:recordId', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { recordId } = req.params;
    const { status, check_in_time } = req.body;

    if (!['on_time', 'late', 'absent'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 출결 상태입니다'
      });
    }

    let record = await MorningAttendance.findByPk(recordId);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '출결 기록을 찾을 수 없습니다'
      });
    }

    const updateData = { status };
    if (check_in_time) updateData.check_in_time = check_in_time;

    await record.update(updateData);

    // 업데이트된 기록 반환
    const updatedRecord = await MorningAttendance.findByPk(recordId, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id']
      }]
    });

    return res.json({
      success: true,
      data: updatedRecord,
      message: '출결 상태가 변경되었습니다'
    });

  } catch (error) {
    console.error('출결 상태 변경 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '출결 상태 변경 중 오류가 발생했습니다' 
    });
  }
});

/**
 * @swagger
 * /api/v1/attendance/records/my:
 *   get:
 *     summary: 내 출결 기록 조회
 *     description: 학생이 자신의 출결 기록을 조회합니다
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회 시작 날짜 (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회 종료 날짜 (YYYY-MM-DD)
 *         example: "2024-01-31"
 *     responses:
 *       200:
 *         description: 출결 기록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttendanceRecord'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// 개인 출결 조회 (학생용)
router.get('/records/my', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    const whereClause = { user_id: userId };
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    } else {
      // 기본값: 최근 30일
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereClause.date = {
        [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
      };
    }

    const attendanceRecords = await MorningAttendance.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });

    return res.json({
      success: true,
      data: attendanceRecords
    });

  } catch (error) {
    console.error('개인 출결 조회 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '출결 조회 중 오류가 발생했습니다' 
    });
  }
});

// 출결 통계 조회
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { year, month, grade, class: classNum } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    // 날짜 범위 설정
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    const whereClause = {
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    const userWhereClause = { role: 'student' };
    if (grade) userWhereClause.grade = parseInt(grade);
    if (classNum) userWhereClause.class = parseInt(classNum);

    // 출결 통계
    const stats = await MorningAttendance.findAll({
      where: whereClause,
      include: [{
        model: User,
        where: userWhereClause,
        attributes: []
      }],
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('status')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    return res.json({
      success: true,
      data: stats,
      period: { year: currentYear, month: currentMonth }
    });

  } catch (error) {
    console.error('출결 통계 조회 오류:', error);
    return res.status(500).json({ 
      success: false,
      message: '통계 조회 중 오류가 발생했습니다' 
    });
  }
});

// =========================
// 출결 신고 관련 API 엔드포인트
// =========================

/**
 * @swagger
 * /api/v1/attendance/reports:
 *   get:
 *     summary: 출결 신고 목록 조회
 *     description: 관리자/교사가 출결 신고 목록을 조회합니다
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 특정 날짜 필터
 *         example: "2024-01-15"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [late, absent, early_leave]
 *         description: 신고 유형 필터
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: 처리 상태 필터
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
 *         name: student_id
 *         schema:
 *           type: string
 *         description: 학생 ID 필터
 *     responses:
 *       200:
 *         description: 출결 신고 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttendanceReport'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// 출결 신고 목록 조회 (관리자용)
router.get('/reports', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { date, type, status, grade, class: classNum, student_id } = req.query;
    
    // 기본 조건
    const whereClause = {};
    if (date) whereClause.date = date;
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;
    if (student_id) whereClause.student_id = parseInt(student_id);

    // 학생 필터 조건
    const studentWhereClause = { role: 'student' };
    if (grade) studentWhereClause.grade = parseInt(grade);
    if (classNum) studentWhereClause.class = parseInt(classNum);

    const reports = await AttendanceReport.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'student',
          where: studentWhereClause,
          attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id']
        },
        {
          model: User,
          as: 'processor',
          required: false,
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['submitted_at', 'DESC']]
    });

    return res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    console.error('출결 신고 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '출결 신고 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 내 출결 신고 목록 조회 (학생용)
router.get('/reports/my', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;

    const reports = await AttendanceReport.findAll({
      where: { student_id: studentId },
      include: [
        {
          model: User,
          as: 'processor',
          required: false,
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['submitted_at', 'DESC']]
    });

    return res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    console.error('내 출결 신고 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '출결 신고 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 출결 신고 생성 (학생용)
router.post('/reports', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { date, type, reason, attachments } = req.body;
    const studentId = req.user.id;

    // 유효성 검사
    if (!date || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다'
      });
    }

    if (!['absence', 'late', 'early_leave', 'sick_leave', 'official_leave'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 신고 유형입니다'
      });
    }

    // 중복 신고 확인
    const existingReport = await AttendanceReport.findOne({
      where: {
        student_id: studentId,
        date: date,
        type: type
      }
    });

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: '해당 날짜에 동일한 유형의 신고가 이미 존재합니다'
      });
    }

    const report = await AttendanceReport.create({
      student_id: studentId,
      date,
      type,
      reason,
      attachments: attachments || null,
      status: 'pending',
      admin_created: false
    });

    // 생성된 신고 정보와 함께 학생 정보 반환
    const reportWithStudent = await AttendanceReport.findByPk(report.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      data: reportWithStudent,
      message: '출결 신고가 성공적으로 제출되었습니다'
    });

  } catch (error) {
    console.error('출결 신고 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '출결 신고 제출 중 오류가 발생했습니다'
    });
  }
});

// 출결 신고 생성 (관리자용)
router.post('/reports/admin', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { student_id, date, type, reason, notes } = req.body;
    const adminId = req.user.id;

    // 유효성 검사
    if (!student_id || !date || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다'
      });
    }

    if (!['absence', 'late', 'early_leave', 'sick_leave', 'official_leave'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 신고 유형입니다'
      });
    }

    // 학생 존재 여부 확인
    const student = await User.findOne({
      where: { id: student_id, role: 'student' }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '존재하지 않는 학생입니다'
      });
    }

    // 중복 신고 확인
    const existingReport = await AttendanceReport.findOne({
      where: {
        student_id: student_id,
        date: date,
        type: type
      }
    });

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: '해당 날짜에 동일한 유형의 신고가 이미 존재합니다'
      });
    }

    const report = await AttendanceReport.create({
      student_id,
      date,
      type,
      reason,
      status: 'approved', // 관리자가 직접 생성하면 자동 승인
      admin_created: true,
      processed_by: adminId,
      processed_at: new Date(),
      notes: notes || null
    });

    // 생성된 신고 정보와 함께 학생 정보 반환
    const reportWithStudent = await AttendanceReport.findByPk(report.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      data: reportWithStudent,
      message: '출결 신고가 성공적으로 처리되었습니다'
    });

  } catch (error) {
    console.error('관리자 출결 신고 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '출결 신고 처리 중 오류가 발생했습니다'
    });
  }
});

// 출결 신고 처리 (승인/거절)
router.put('/reports/:reportId/process', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, notes, processor_response } = req.body; // action: 'approve' | 'reject'
    const adminId = req.user.id;

    // 유효성 검사
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 처리 액션입니다'
      });
    }

    const report = await AttendanceReport.findByPk(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '존재하지 않는 신고입니다'
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '이미 처리된 신고입니다'
      });
    }

    // 신고 상태 업데이트
    await report.update({
      status: action === 'approve' ? 'approved' : 'rejected',
      processed_by: adminId,
      processed_at: new Date(),
      notes: notes || null,
      processor_response: processor_response || null
    });

    // 승인된 경우 morning_attendance에도 반영
    if (action === 'approve') {
      const student = await User.findByPk(report.student_id);
      if (student) {
        const expectedClassroom = `${student.grade}-${student.class}`;
        
        // 기존 출결 기록 찾기
        let attendanceRecord = await MorningAttendance.findOne({
          where: { user_id: report.student_id, date: report.date }
        });

        if (report.type === 'absence') {
          // 결석 승인 - morning_attendance에 absent 기록
          if (attendanceRecord) {
            await attendanceRecord.update({
              status: 'absent',
              check_in_time: null,
              // classroom: expectedClassroom // 교실 구분 제거
            });
          } else {
            await MorningAttendance.create({
              user_id: report.student_id,
              date: report.date,
              check_in_time: null,
              status: 'absent',
              // classroom: expectedClassroom // 교실 구분 제거
            });
          }
        }
        // 다른 신고 유형들(지각, 조퇴 등)도 필요시 추가 처리
      }
    }

    // 업데이트된 신고 정보 반환
    const updatedReport = await AttendanceReport.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    return res.json({
      success: true,
      data: updatedReport,
      message: `출결 신고가 ${action === 'approve' ? '승인' : '거절'}되었습니다`
    });

  } catch (error) {
    console.error('출결 신고 처리 오류:', error);
    return res.status(500).json({
      success: false,
      message: '출결 신고 처리 중 오류가 발생했습니다'
    });
  }
});

// 미처리 출결 목록 조회 (관리자용)
router.get('/unprocessed', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { date, grade, class: classNum } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 학생 필터 조건
    const studentWhereClause = { role: 'student' };
    if (grade) studentWhereClause.grade = parseInt(grade);
    if (classNum) studentWhereClause.class = parseInt(classNum);

    // 모든 학생 목록 조회
    const allStudents = await User.findAll({
      where: studentWhereClause,
      attributes: ['id', 'name', 'grade', 'class', 'number', 'student_id'],
      order: [['grade', 'ASC'], ['class', 'ASC'], ['number', 'ASC']]
    });

    // 해당 날짜의 출결 기록 조회
    const attendanceRecords = await MorningAttendance.findAll({
      where: { date: targetDate },
      include: [{
        model: User,
        as: 'user',
        where: studentWhereClause,
        attributes: ['id']
      }]
    });

    // 해당 날짜의 출결 신고 조회 (승인된 것들)
    const approvedReports = await AttendanceReport.findAll({
      where: { 
        date: targetDate,
        status: 'approved'
      },
      include: [{
        model: User,
        as: 'student',
        where: studentWhereClause,
        attributes: ['id']
      }]
    });

    const attendedStudentIds = new Set(attendanceRecords.map(record => record.user_id));
    const reportedStudentIds = new Set(approvedReports.map(report => report.student_id));

    // 미처리 출결 목록 생성
    const unprocessedAttendances = [];

    for (const student of allStudents) {
      const hasAttendance = attendedStudentIds.has(student.id);
      const hasApprovedReport = reportedStudentIds.has(student.id);

      if (!hasAttendance && !hasApprovedReport) {
        // 결석
        unprocessedAttendances.push({
          student,
          status: 'absent',
          morningAttendance: null,
          checkInTime: null
        });
      } else if (hasAttendance) {
        // 출석했지만 지각일 수 있음
        const attendanceRecord = attendanceRecords.find(r => r.user_id === student.id);
        if (attendanceRecord && attendanceRecord.status === 'late' && !hasApprovedReport) {
          unprocessedAttendances.push({
            student,
            status: 'late',
            morningAttendance: {
              id: attendanceRecord.id,
              date: attendanceRecord.date,
              check_in_time: attendanceRecord.check_in_time,
              status: attendanceRecord.status,
              // classroom: attendanceRecord.classroom // 교실 구분 제거
            },
            checkInTime: attendanceRecord.check_in_time
          });
        }
      }
    }

    return res.json({
      success: true,
      data: unprocessedAttendances,
      date: targetDate
    });

  } catch (error) {
    console.error('미처리 출결 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '미처리 출결 조회 중 오류가 발생했습니다'
    });
  }
});

// 출결 정정 (관리자용)
router.put('/correct/:studentId', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date, new_status, reason } = req.body; // new_status: 'on_time' | 'late' | 'absent'
    const adminId = req.user.id;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 유효성 검사
    if (!['on_time', 'late', 'absent'].includes(new_status)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 출결 상태입니다'
      });
    }

    // 학생 존재 여부 확인
    const student = await User.findOne({
      where: { id: studentId, role: 'student' }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '존재하지 않는 학생입니다'
      });
    }

    // 기존 출결 기록 찾기
    let attendanceRecord = await MorningAttendance.findOne({
      where: { user_id: studentId, date: targetDate }
    });

    if (new_status === 'absent') {
      // 결석으로 변경 - morning_attendance에 absent 상태로 기록
      const expectedClassroom = `${student.grade}-${student.class}`;
      
      if (attendanceRecord) {
        // 기존 기록을 absent로 업데이트
        await attendanceRecord.update({
          status: 'absent',
          check_in_time: null,
          // classroom: expectedClassroom // 교실 구분 제거
        });
      } else {
        // 새로운 absent 기록 생성
        attendanceRecord = await MorningAttendance.create({
          user_id: studentId,
          date: targetDate,
          check_in_time: null,
          status: 'absent',
          // classroom: expectedClassroom // 교실 구분 제거
        });
      }
    } else {
      // 출석/지각으로 변경
      const expectedClassroom = `${student.grade}-${student.class}`;
      const checkInTime = new_status === 'on_time' ? '07:50:00' : '08:10:00';

      if (attendanceRecord) {
        // 기존 기록 업데이트
        await attendanceRecord.update({
          status: new_status,
          check_in_time: checkInTime,
          // classroom: expectedClassroom // 교실 구분 제거
        });
      } else {
        // 새 기록 생성
        attendanceRecord = await MorningAttendance.create({
          user_id: studentId,
          date: targetDate,
          check_in_time: checkInTime,
          status: new_status,
          // classroom: expectedClassroom // 교실 구분 제거
        });
      }
    }

    // 정정 기록을 위한 신고 생성
    await AttendanceReport.create({
      student_id: studentId,
      date: targetDate,
      type: new_status === 'absent' ? 'absence' : (new_status === 'late' ? 'late' : 'absence'),
      reason: reason || `관리자 정정: ${new_status === 'on_time' ? '정시출석' : new_status === 'late' ? '지각' : '결석'}으로 변경`,
      status: 'approved',
      admin_created: true,
      processed_by: adminId,
      processed_at: new Date(),
      notes: '출결 정정 처리'
    });

    return res.json({
      success: true,
      message: '출결이 성공적으로 정정되었습니다',
      data: {
        student_id: studentId,
        date: targetDate,
        new_status,
        attendance_record: attendanceRecord
      }
    });

  } catch (error) {
    console.error('출결 정정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '출결 정정 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;