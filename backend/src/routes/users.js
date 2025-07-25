const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const crypto = require('crypto');
const { User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logger = require('../../config/logger');

const router = express.Router();

// Multer 설정 (메모리 저장)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다.'), false);
    }
  }
});

// RFID 카드 ID 생성 함수 (RFIDManagement.tsx와 동일한 로직)
const generateSecureRFIDCode = () => {
  // 4바이트 (32비트) 랜덤 데이터 생성 - RC522 RFID UID 크기
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  
  // 16진수 문자열로 변환 (대문자)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0').toUpperCase()).join('');
};


/**
 * @swagger
 * components:
 *   schemas:
 *     AdminInput:
 *       type: object
 *       required:
 *         - name
 *         - username
 *         - password
 *         - role
 *       properties:
 *         name:
 *           type: string
 *           description: 실명
 *         username:
 *           type: string
 *           description: 사용자명
 *         password:
 *           type: string
 *           description: 비밀번호
 *         role:
 *           type: string
 *           enum: [admin, teacher]
 *           description: 사용자 역할
 */

/**
 * @swagger
 * /users/admins:
 *   get:
 *     summary: 관리자/교사 목록 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 관리자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 */
router.get('/admins', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const admins = await User.findAll({
      where: {
        role: ['admin', 'teacher']
      },
      attributes: ['id', 'name', 'username', 'role', 'status', 'createdAt', 'updatedAt'],
      order: [['role', 'ASC'], ['name', 'ASC']]
    });

    logger.info(`관리자 목록 조회: ${admins.length}명`, {
      userId: req.user.id,
      userRole: req.user.role
    });

    res.json({
      success: true,
      message: '관리자 목록을 성공적으로 조회했습니다.',
      data: admins
    });
  } catch (error) {
    logger.error('관리자 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '관리자 목록을 조회하는 중 오류가 발생했습니다.',
      code: 'ADMINS_FETCH_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/admins/{id}:
 *   get:
 *     summary: 특정 관리자 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 관리자 조회 성공
 *       404:
 *         description: 관리자를 찾을 수 없음
 */
router.get('/admins/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({
      where: {
        id,
        role: ['admin', 'teacher']
      },
      attributes: ['id', 'name', 'username', 'role', 'createdAt', 'updatedAt']
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '관리자를 찾을 수 없습니다.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    logger.info(`관리자 조회: ${admin.name} (${admin.username})`, {
      userId: req.user.id,
      userRole: req.user.role
    });

    res.json({
      success: true,
      message: '관리자 정보를 성공적으로 조회했습니다.',
      data: admin
    });
  } catch (error) {
    logger.error('관리자 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '관리자 정보를 조회하는 중 오류가 발생했습니다.',
      code: 'ADMIN_FETCH_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/admins:
 *   post:
 *     summary: 새 관리자/교사 생성
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminInput'
 *     responses:
 *       201:
 *         description: 관리자 생성 성공
 *       400:
 *         description: 필수 필드 누락 또는 유효하지 않은 역할
 *       409:
 *         description: 중복된 사용자명
 */
router.post('/admins', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    // 필수 필드 검증
    if (!name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: '모든 필수 필드를 입력해주세요.',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 역할 검증
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 역할입니다.',
        code: 'INVALID_ROLE'
      });
    }

    // 사용자명 중복 검사
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 사용자명입니다.',
        code: 'DUPLICATE_USERNAME'
      });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await User.create({
      name,
      username,
      password: hashedPassword,
      role,
      status: 'pending'
    });

    // 응답에서 비밀번호 제외
    const adminData = {
      id: newAdmin.id,
      name: newAdmin.name,
      username: newAdmin.username,
      role: newAdmin.role,
      status: newAdmin.status,
      createdAt: newAdmin.createdAt,
      updatedAt: newAdmin.updatedAt
    };

    logger.info(`새 ${role === 'admin' ? '관리자' : '교사'} 생성: ${newAdmin.name} (${newAdmin.username})`, {
      userId: req.user.id,
      userRole: req.user.role,
      createdUserId: newAdmin.id
    });

    res.status(201).json({
      success: true,
      message: `${role === 'admin' ? '관리자' : '교사'}가 성공적으로 생성되었습니다.`,
      data: adminData
    });
  } catch (error) {
    logger.error('관리자 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '관리자를 생성하는 중 오류가 발생했습니다.',
      code: 'ADMIN_CREATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/admins/{id}:
 *   put:
 *     summary: 관리자 정보 수정
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, teacher]
 *     responses:
 *       200:
 *         description: 관리자 정보 수정 성공
 *       403:
 *         description: 자신의 역할 변경 불가
 *       404:
 *         description: 관리자를 찾을 수 없음
 */
router.put('/admins/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, role, password, status } = req.body;

    const admin = await User.findOne({
      where: {
        id,
        role: ['admin', 'teacher']
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '관리자를 찾을 수 없습니다.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // 자기 자신의 역할 변경 방지
    if (req.user.id === parseInt(id) && role && role !== admin.role) {
      return res.status(403).json({
        success: false,
        message: '자신의 역할을 변경할 수 없습니다.',
        code: 'CANNOT_CHANGE_OWN_ROLE'
      });
    }

    // 사용자명 중복 검사 (자신 제외)
    if (username && username !== admin.username) {
      const existingUser = await User.findOne({ 
        where: { username, id: { [require('sequelize').Op.ne]: id } }
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 사용자명입니다.',
          code: 'DUPLICATE_USERNAME'
        });
      }
    }

    // 역할 검증
    if (role && !['admin', 'teacher'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 역할입니다.',
        code: 'INVALID_ROLE'
      });
    }

    // 상태 검증
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상태입니다.',
        code: 'INVALID_STATUS'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (password) {
      updateData.password = password; // User 모델의 beforeUpdate hook에서 해싱됨
    }

    await admin.update(updateData);

    // 응답 데이터 (비밀번호 제외)
    const adminData = {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      role: admin.role,
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    };

    logger.info(`관리자 정보 수정: ${admin.name} (${admin.username})`, {
      userId: req.user.id,
      userRole: req.user.role,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: '관리자 정보가 성공적으로 수정되었습니다.',
      data: adminData
    });
  } catch (error) {
    logger.error('관리자 정보 수정 실패:', error);
    res.status(500).json({
      success: false,
      message: '관리자 정보를 수정하는 중 오류가 발생했습니다.',
      code: 'ADMIN_UPDATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/admins/bulk-delete:
 *   post:
 *     summary: 관리자 일괄 삭제
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 삭제할 관리자 ID 목록
 *     responses:
 *       200:
 *         description: 관리자 일괄 삭제 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/admins/bulk-delete', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '삭제할 관리자 ID 목록이 필요합니다.',
        code: 'INVALID_IDS'
      });
    }

    // 자기 자신이 포함되어 있는지 확인
    if (ids.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '자신의 계정은 삭제할 수 없습니다.',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // 삭제할 관리자들의 정보를 먼저 조회
    const adminsToDelete = await User.findAll({
      where: {
        id: ids,
        role: ['admin', 'teacher']
      },
      attributes: ['id', 'name', 'username', 'role']
    });

    if (adminsToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        message: '삭제할 관리자를 찾을 수 없습니다.',
        code: 'ADMINS_NOT_FOUND'
      });
    }

    // 관리자들 삭제
    const deletedCount = await User.destroy({
      where: {
        id: ids,
        role: ['admin', 'teacher']
      }
    });

    logger.info(`관리자 일괄 삭제: ${deletedCount}명`, {
      userId: req.user.id,
      userRole: req.user.role,
      deletedIds: ids,
      deletedAdmins: adminsToDelete.map(a => ({
        id: a.id,
        name: a.name,
        username: a.username,
        role: a.role
      }))
    });

    res.json({
      success: true,
      message: `${deletedCount}명의 관리자가 삭제되었습니다.`,
      data: {
        deletedCount,
        requestedCount: ids.length
      }
    });
  } catch (error) {
    logger.error('관리자 일괄 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '관리자 일괄 삭제 중 오류가 발생했습니다.',
      code: 'BULK_DELETE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/admins/{id}:
 *   delete:
 *     summary: 관리자 삭제
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 관리자 삭제 성공
 *       403:
 *         description: 자신의 계정 삭제 불가
 *       404:
 *         description: 관리자를 찾을 수 없음
 */
router.delete('/admins/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // 자기 자신 삭제 방지
    if (req.user.id === parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: '자신의 계정을 삭제할 수 없습니다.',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    const admin = await User.findOne({
      where: {
        id,
        role: ['admin', 'teacher']
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '관리자를 찾을 수 없습니다.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    const adminInfo = { name: admin.name, username: admin.username, role: admin.role };
    await admin.destroy();

    logger.info(`관리자 삭제: ${adminInfo.name} (${adminInfo.username})`, {
      userId: req.user.id,
      userRole: req.user.role,
      deletedUserId: id
    });

    res.json({
      success: true,
      message: '관리자가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    logger.error('관리자 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '관리자를 삭제하는 중 오류가 발생했습니다.',
      code: 'ADMIN_DELETE_ERROR'
    });
  }
});

// ==================== 학생 관련 API ====================

// ==================== Excel 관련 API ====================

/**
 * @swagger
 * /users/students/template:
 *   get:
 *     summary: 학생 등록용 Excel 템플릿 다운로드
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel 템플릿 파일
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/students/template', async (req, res) => {
  try {
    // 템플릿 데이터 생성
    const templateData = [
      {
        '학번': '1101',
        '이름': '홍길동',
        '학년': 1,
        '반': 1,
        '번호': 1,
        '비밀번호': '선택사항 (기본값: 학번)'
      },
      {
        '학번': '1102',
        '이름': '김철수',
        '학년': 1,
        '반': 1,
        '번호': 2,
        '비밀번호': ''
      }
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { width: 12 }, // 학번
      { width: 10 }, // 이름
      { width: 8 },  // 학년
      { width: 8 },  // 반
      { width: 8 },  // 번호
      { width: 25 }  // 비밀번호
    ];

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, '학생목록');

    // 주의사항 워크시트 추가
    const instructionData = [
      { '항목': '학번', '설명': '중복되지 않는 고유한 학번을 입력하세요', '예시': '20240001' },
      { '항목': '이름', '설명': '학생의 실명을 입력하세요', '예시': '홍길동' },
      { '항목': '학년', '설명': '1, 2, 3 중 하나를 입력하세요', '예시': '1' },
      { '항목': '반', '설명': '1~20 사이의 숫자를 입력하세요', '예시': '1' },
      { '항목': '번호', '설명': '1~50 사이의 숫자를 입력하세요', '예시': '1' },
      { '항목': '비밀번호', '설명': '비어있으면 학번이 기본 비밀번호가 됩니다', '예시': 'password123' },
      { '항목': 'RFID', '설명': 'RFID 카드 ID는 자동으로 생성됩니다', '예시': '자동생성' }
    ];

    const instructionWs = XLSX.utils.json_to_sheet(instructionData);
    instructionWs['!cols'] = [
      { width: 10 }, // 항목
      { width: 40 }, // 설명
      { width: 15 }  // 예시
    ];
    XLSX.utils.book_append_sheet(wb, instructionWs, '입력가이드');

    // Excel 파일을 버퍼로 변환
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 파일명 설정 (한국 시간)
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const filename = `학생등록_템플릿_${koreaTime.toISOString().slice(0, 10)}.xlsx`;

    logger.info('Excel 템플릿 다운로드');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('Excel 템플릿 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Excel 템플릿을 생성하는 중 오류가 발생했습니다.',
      code: 'TEMPLATE_GENERATION_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students/export:
 *   get:
 *     summary: 학생 목록 Excel 다운로드
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *         description: 특정 학년만 필터링
 *       - in: query
 *         name: class
 *         schema:
 *           type: integer
 *         description: 특정 반만 필터링
 *     responses:
 *       200:
 *         description: Excel 파일
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/students/export', async (req, res) => {
  try {
    const { grade, class: classNum } = req.query;

    // 필터 조건 구성
    const whereClause = { role: 'student' };
    if (grade) whereClause.grade = parseInt(grade);
    if (classNum) whereClause.class = parseInt(classNum);

    // 학생 데이터 조회
    const students = await User.findAll({
      where: whereClause,
      attributes: [
        'student_id', 'name', 'grade', 'class', 'number', 
        'rfid_card_id', 'createdAt', 'updatedAt'
      ],
      order: [['grade', 'ASC'], ['class', 'ASC'], ['number', 'ASC'], ['name', 'ASC']]
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: '조건에 맞는 학생이 없습니다.',
        code: 'NO_STUDENTS_FOUND'
      });
    }

    // Excel 데이터 변환
    const excelData = students.map(student => ({
      '학번': student.student_id,
      '이름': student.name,
      '학년': student.grade,
      '반': student.class,
      '번호': student.number,
      'RFID 카드 ID': student.rfid_card_id || '미등록',
      '등록일': new Date(student.createdAt).toLocaleDateString('ko-KR'),
      '수정일': new Date(student.updatedAt).toLocaleDateString('ko-KR')
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { width: 12 }, // 학번
      { width: 10 }, // 이름
      { width: 8 },  // 학년
      { width: 8 },  // 반
      { width: 8 },  // 번호
      { width: 15 }, // RFID 카드 ID
      { width: 12 }, // 등록일
      { width: 12 }  // 수정일
    ];

    // 워크시트를 워크북에 추가
    const sheetName = grade && classNum ? `${grade}학년_${classNum}반` : 
                     grade ? `${grade}학년` : 
                     classNum ? `${classNum}반` : '전체학생';
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
    const filename = `학생목록${filterStr}_${dateStr}.xlsx`;

    logger.info(`학생 목록 Excel 다운로드: ${students.length}명`, {
      filters: { grade, class: classNum }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('학생 목록 Excel 내보내기 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생 목록을 내보내는 중 오류가 발생했습니다.',
      code: 'EXPORT_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students/bulk:
 *   post:
 *     summary: 학생 일괄 등록 (Excel 업로드)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel 파일 (.xlsx)
 *     responses:
 *       200:
 *         description: 일괄 등록 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRows:
 *                       type: integer
 *                       description: 전체 처리 행 수
 *                     successCount:
 *                       type: integer
 *                       description: 성공한 행 수
 *                     failureCount:
 *                       type: integer
 *                       description: 실패한 행 수
 *                     duplicateCount:
 *                       type: integer
 *                       description: 중복된 행 수
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                           student_id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           error:
 *                             type: string
 *       400:
 *         description: 잘못된 파일 형식
 */
router.post('/students/bulk', authenticateToken, authorizeRoles(['admin', 'teacher']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '파일이 업로드되지 않았습니다.',
        code: 'NO_FILE_UPLOADED'
      });
    }

    // Excel 파일 읽기
    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel 파일에 데이터가 없습니다.',
        code: 'EMPTY_FILE'
      });
    }

    // 결과 추적
    const results = {
      totalRows: jsonData.length,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errors: []
    };

    // 트랜잭션 시작
    const transaction = await require('../../models').sequelize.transaction();

    try {
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2; // Excel은 1부터 시작, 헤더 제외

        try {
          // 필수 필드 검증
          const student_id = row['학번']?.toString().trim();
          const name = row['이름']?.toString().trim();
          const grade = parseInt(row['학년']);
          const classNum = parseInt(row['반']);
          const number = row['번호'] ? parseInt(row['번호']) : null;
          const password = row['비밀번호']?.toString().trim();

          if (!student_id || !name || !grade || !classNum) {
            results.errors.push({
              row: rowNumber,
              student_id: student_id || '없음',
              name: name || '없음',
              error: '필수 필드가 누락되었습니다 (학번, 이름, 학년, 반)'
            });
            results.failureCount++;
            continue;
          }

          // 유효성 검사
          if (grade < 1 || grade > 3) {
            results.errors.push({
              row: rowNumber,
              student_id,
              name,
              error: '학년은 1-3 사이여야 합니다'
            });
            results.failureCount++;
            continue;
          }

          if (classNum < 1 || classNum > 20) {
            results.errors.push({
              row: rowNumber,
              student_id,
              name,
              error: '반은 1-20 사이여야 합니다'
            });
            results.failureCount++;
            continue;
          }

          if (number && (number < 1 || number > 50)) {
            results.errors.push({
              row: rowNumber,
              student_id,
              name,
              error: '번호는 1-50 사이여야 합니다'
            });
            results.failureCount++;
            continue;
          }

          // 중복 검사
          const existingStudent = await User.findOne({
            where: { student_id, role: 'student' },
            transaction
          });

          if (existingStudent) {
            results.errors.push({
              row: rowNumber,
              student_id,
              name,
              error: '이미 등록된 학번입니다'
            });
            results.duplicateCount++;
            continue;
          }

          // RFID 코드 생성
          let rfid_card_id = generateSecureRFIDCode();
          
          // RFID 중복 확인 (매우 드물지만 가능)
          let retries = 0;
          while (retries < 5) {
            const existingRfid = await User.findOne({
              where: { rfid_card_id },
              transaction
            });
            if (!existingRfid) break;
            rfid_card_id = generateSecureRFIDCode();
            retries++;
          }

          // 학생 생성
          await User.create({
            username: student_id,
            student_id,
            name,
            grade,
            class: classNum,
            number,
            password: password || student_id,
            rfid_card_id,
            role: 'student'
          }, { transaction });

          results.successCount++;
        } catch (error) {
          results.errors.push({
            row: rowNumber,
            student_id: row['학번'] || '없음',
            name: row['이름'] || '없음',
            error: error.message || '처리 중 오류 발생'
          });
          results.failureCount++;
        }
      }

      // 트랜잭션 커밋
      await transaction.commit();

      logger.info(`학생 일괄 등록 완료: 성공 ${results.successCount}명, 실패 ${results.failureCount}명, 중복 ${results.duplicateCount}명`, {
        userId: req.user.id,
        userRole: req.user.role,
        results
      });

      res.json({
        success: true,
        message: `전체 ${results.totalRows}명 중 ${results.successCount}명 등록 완료`,
        data: results
      });

    } catch (error) {
      // 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    logger.error('학생 일괄 등록 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생 일괄 등록 중 오류가 발생했습니다.',
      code: 'BULK_IMPORT_ERROR',
      error: error.message
    });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     StudentInput:
 *       type: object
 *       required:
 *         - student_id
 *         - name
 *         - grade
 *         - class
 *       properties:
 *         student_id:
 *           type: string
 *           description: 학번
 *         name:
 *           type: string
 *           description: 학생 이름
 *         grade:
 *           type: integer
 *           minimum: 1
 *           maximum: 3
 *           description: 학년
 *         class:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           description: 반
 *         number:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           description: 번호
 *         password:
 *           type: string
 *           description: 비밀번호
 *         rfid_card_id:
 *           type: string
 *           description: RFID 카드 ID
 */

/**
 * @swagger
 * /users/students:
 *   get:
 *     summary: 모든 학생 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 학생 목록 조회 성공
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
 *                     $ref: '#/components/schemas/User'
 */
router.get('/students', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: { exclude: ['password'] },
      order: [['grade', 'ASC'], ['class', 'ASC'], ['number', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    logger.error('학생 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생 목록을 조회하는 중 오류가 발생했습니다.',
      code: 'STUDENT_FETCH_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students/{id}:
 *   get:
 *     summary: 특정 학생 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 학생 ID
 *     responses:
 *       200:
 *         description: 학생 조회 성공
 *       404:
 *         description: 학생을 찾을 수 없음
 */
router.get('/students/:id', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const student = await User.findOne({
      where: { id, role: 'student' },
      attributes: { exclude: ['password'] }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다.',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    logger.error('학생 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생을 조회하는 중 오류가 발생했습니다.',
      code: 'STUDENT_FETCH_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students:
 *   post:
 *     summary: 새 학생 생성
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudentInput'
 *     responses:
 *       201:
 *         description: 학생 생성 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       409:
 *         description: 학번 또는 RFID 카드 ID 중복
 */
router.post('/students', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { student_id, name, grade, class: classNum, number, password, rfid_card_id } = req.body;

    // 필수 필드 검증
    if (!student_id || !name || !grade || !classNum || !number) {
      return res.status(400).json({
        success: false,
        message: '학번, 이름, 학년, 반, 번호는 필수 항목입니다.',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 학번 중복 검사
    const existingStudentNumber = await User.findOne({
      where: { student_id, role: 'student' }
    });
    if (existingStudentNumber) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 학번입니다.',
        code: 'DUPLICATE_student_id'
      });
    }

    // RFID 카드 중복 검사
    if (rfid_card_id) {
      const existingRfid = await User.findOne({
        where: { rfid_card_id }
      });
      if (existingRfid) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 RFID 카드 ID입니다.',
          code: 'DUPLICATE_RFID_CARD'
        });
      }
    }

    // 비밀번호 검증
    if (password && password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다.',
        code: 'INVALID_PASSWORD_LENGTH'
      });
    }

    const student = await User.create({
      username: student_id, // 학번을 username으로 사용
      student_id,
      name,
      grade,
      class: classNum,
      number,
      password: password || student_id, // 기본 비밀번호는 학번
      rfid_card_id,
      role: 'student'
    });

    logger.info(`새 학생 생성: ${name} (${student_id})`, {
      userId: req.user.id,
      userRole: req.user.role,
      createdStudentId: student.id
    });

    const studentData = student.toJSON();
    delete studentData.password;

    res.status(201).json({
      success: true,
      data: studentData
    });
  } catch (error) {
    logger.error('학생 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생을 생성하는 중 오류가 발생했습니다.',
      code: 'STUDENT_CREATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students/{id}:
 *   put:
 *     summary: 학생 정보 수정
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 학생 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               grade:
 *                 type: integer
 *               class:
 *                 type: integer
 *               rfid_card_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: 학생 정보 수정 성공
 *       404:
 *         description: 학생을 찾을 수 없음
 */
router.put('/students/:id', authenticateToken, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, class: classNum, number, rfid_card_id } = req.body;

    const student = await User.findOne({
      where: { id, role: 'student' }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다.',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // RFID 카드 중복 검사 (자신 제외)
    if (rfid_card_id && rfid_card_id !== student.rfid_card_id) {
      const existingRfid = await User.findOne({
        where: { 
          rfid_card_id,
          id: { [require('sequelize').Op.ne]: id }
        }
      });
      if (existingRfid) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 RFID 카드 ID입니다.',
          code: 'DUPLICATE_RFID_CARD'
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (grade) updateData.grade = grade;
    if (classNum) updateData.class = classNum;
    if (number) updateData.number = number;
    if (rfid_card_id !== undefined) updateData.rfid_card_id = rfid_card_id;

    await student.update(updateData);

    logger.info(`학생 정보 수정: ${student.name} (${student.student_id})`, {
      userId: req.user.id,
      userRole: req.user.role,
      updatedStudentId: id,
      changes: updateData
    });

    const studentData = student.toJSON();
    delete studentData.password;

    res.json({
      success: true,
      data: studentData
    });
  } catch (error) {
    logger.error('학생 정보 수정 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생 정보를 수정하는 중 오류가 발생했습니다.',
      code: 'STUDENT_UPDATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students/bulk-delete:
 *   post:
 *     summary: 학생 일괄 삭제
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 삭제할 학생 ID 목록
 *     responses:
 *       200:
 *         description: 학생 일괄 삭제 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/students/bulk-delete', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '삭제할 학생 ID 목록이 필요합니다.',
        code: 'INVALID_IDS'
      });
    }

    // 삭제할 학생들의 정보를 먼저 조회
    const studentsToDelete = await User.findAll({
      where: {
        id: ids,
        role: 'student'
      },
      attributes: ['id', 'name', 'student_id']
    });

    if (studentsToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        message: '삭제할 학생을 찾을 수 없습니다.',
        code: 'STUDENTS_NOT_FOUND'
      });
    }

    // 학생들 삭제
    const deletedCount = await User.destroy({
      where: {
        id: ids,
        role: 'student'
      }
    });

    logger.info(`학생 일괄 삭제: ${deletedCount}명`, {
      userId: req.user.id,
      userRole: req.user.role,
      deletedIds: ids,
      deletedStudents: studentsToDelete.map(s => ({
        id: s.id,
        name: s.name,
        student_id: s.student_id
      }))
    });

    res.json({
      success: true,
      message: `${deletedCount}명의 학생이 삭제되었습니다.`,
      data: {
        deletedCount,
        requestedCount: ids.length
      }
    });
  } catch (error) {
    logger.error('학생 일괄 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생 일괄 삭제 중 오류가 발생했습니다.',
      code: 'BULK_DELETE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students/{id}:
 *   delete:
 *     summary: 학생 삭제
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 학생 ID
 *     responses:
 *       200:
 *         description: 학생 삭제 성공
 *       404:
 *         description: 학생을 찾을 수 없음
 */
router.delete('/students/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findOne({
      where: { id, role: 'student' }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다.',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    const studentInfo = { 
      name: student.name, 
      student_id: student.student_id,
      grade: student.grade,
      class: student.class
    };
    
    await student.destroy();

    logger.info(`학생 삭제: ${studentInfo.name} (${studentInfo.student_id})`, {
      userId: req.user.id,
      userRole: req.user.role,
      deletedStudentId: id
    });

    res.json({
      success: true,
      message: '학생이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    logger.error('학생 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '학생을 삭제하는 중 오류가 발생했습니다.',
      code: 'STUDENT_DELETE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/students/{id}/change-password:
 *   put:
 *     summary: 학생 비밀번호 변경
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 학생 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 현재 비밀번호 (학생 본인인 경우 필수)
 *               newPassword:
 *                 type: string
 *                 description: 새 비밀번호
 *             required:
 *               - newPassword
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 학생을 찾을 수 없음
 */
router.put('/students/:id/change-password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const { user } = req;

    // 새 비밀번호 검증
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 최소 6자 이상이어야 합니다.',
        code: 'INVALID_NEW_PASSWORD'
      });
    }

    const student = await User.findOne({
      where: { id, role: 'student' }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다.',
        code: 'STUDENT_NOT_FOUND'
      });
    }

    // 권한 검사
    const isAdmin = user.role === 'admin';
    const isTeacher = user.role === 'teacher';
    const isStudentSelf = user.role === 'student' && user.id === parseInt(id);

    if (!isAdmin && !isTeacher && !isStudentSelf) {
      return res.status(403).json({
        success: false,
        message: '비밀번호를 변경할 권한이 없습니다.',
        code: 'PERMISSION_DENIED'
      });
    }

    // 학생 본인이 변경하는 경우 현재 비밀번호 확인
    if (isStudentSelf && student.password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: '현재 비밀번호를 입력해주세요.',
          code: 'CURRENT_PASSWORD_REQUIRED'
        });
      }

      const isCurrentPasswordValid = await student.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '현재 비밀번호가 올바르지 않습니다.',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }
    }

    // 비밀번호 업데이트
    await student.update({ password: newPassword });

    logger.info(`학생 비밀번호 변경: ${student.name} (${student.student_id})`, {
      userId: user.id,
      userRole: user.role,
      changedBy: isStudentSelf ? 'self' : 'admin/teacher'
    });

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
  } catch (error) {
    logger.error('학생 비밀번호 변경 실패:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호를 변경하는 중 오류가 발생했습니다.',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/admins/{id}/change-password:
 *   put:
 *     summary: 관리자 비밀번호 변경
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 관리자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: 새 비밀번호
 *             required:
 *               - newPassword
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 관리자를 찾을 수 없음
 */
router.put('/admins/:id/change-password', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // 새 비밀번호 검증
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 최소 6자 이상이어야 합니다.',
        code: 'INVALID_NEW_PASSWORD'
      });
    }

    const admin = await User.findOne({
      where: { 
        id, 
        role: ['admin', 'teacher'] 
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '관리자를 찾을 수 없습니다.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // 비밀번호 업데이트
    await admin.update({ password: newPassword });

    logger.info(`관리자 비밀번호 변경: ${admin.name} (${admin.username})`, {
      userId: req.user.id,
      userRole: req.user.role,
      targetUserId: id
    });

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
  } catch (error) {
    logger.error('관리자 비밀번호 변경 실패:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호를 변경하는 중 오류가 발생했습니다.',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});


/**
 * @swagger
 * /users/admins/{id}/approve:
 *   put:
 *     summary: 관리자/교사 계정 승인
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 관리자 ID
 *     responses:
 *       200:
 *         description: 계정 승인 성공
 *       404:
 *         description: 관리자를 찾을 수 없음
 */
router.put('/admins/:id/approve', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({
      where: {
        id,
        role: ['admin', 'teacher']
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '관리자를 찾을 수 없습니다.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    await admin.update({ status: 'approved' });

    logger.info(`관리자 계정 승인: ${admin.name} (${admin.username})`, {
      userId: req.user.id,
      userRole: req.user.role,
      targetId: id
    });

    res.json({
      success: true,
      message: '계정이 성공적으로 승인되었습니다.',
      data: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        role: admin.role,
        status: admin.status,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });
  } catch (error) {
    logger.error('관리자 계정 승인 실패:', error);
    res.status(500).json({
      success: false,
      message: '계정 승인 중 오류가 발생했습니다.',
      code: 'APPROVE_ERROR'
    });
  }
});

/**
 * @swagger
 * /users/admins/{id}/reject:
 *   put:
 *     summary: 관리자/교사 계정 거부
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 관리자 ID
 *     responses:
 *       200:
 *         description: 계정 거부 성공
 *       404:
 *         description: 관리자를 찾을 수 없음
 */
router.put('/admins/:id/reject', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({
      where: {
        id,
        role: ['admin', 'teacher']
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '관리자를 찾을 수 없습니다.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    await admin.update({ status: 'rejected' });

    logger.info(`관리자 계정 거부: ${admin.name} (${admin.username})`, {
      userId: req.user.id,
      userRole: req.user.role,
      targetId: id
    });

    res.json({
      success: true,
      message: '계정이 거부되었습니다.',
      data: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        role: admin.role,
        status: admin.status,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });
  } catch (error) {
    logger.error('관리자 계정 거부 실패:', error);
    res.status(500).json({
      success: false,
      message: '계정 거부 중 오류가 발생했습니다.',
      code: 'REJECT_ERROR'
    });
  }
});

module.exports = router;