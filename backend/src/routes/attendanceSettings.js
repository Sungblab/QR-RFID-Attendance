const express = require('express');
const { AttendanceSettings, User } = require('../../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../../config/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AttendanceSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 설정 ID
 *         start_time:
 *           type: string
 *           format: time
 *           description: 출결 시작 시간 (HH:MM:SS)
 *           example: "07:00:00"
 *         late_time:
 *           type: string
 *           format: time
 *           description: 지각 처리 시작 시간 (HH:MM:SS)
 *           example: "08:00:00"
 *         end_time:
 *           type: string
 *           format: time
 *           description: 출결 마감 시간 (HH:MM:SS)
 *           example: "09:00:00"
 *         is_active:
 *           type: boolean
 *           description: 설정 활성화 상태
 *         created_by:
 *           type: integer
 *           description: 생성자 ID
 *         updated_by:
 *           type: integer
 *           description: 수정자 ID
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/attendance/settings:
 *   get:
 *     summary: 현재 활성 출결 시간 설정 조회
 *     tags: [AttendanceSettings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AttendanceSettings'
 *       404:
 *         description: 설정을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await AttendanceSettings.findOne({
      where: { is_active: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!settings) {
      // 기본 설정이 없으면 생성
      const defaultSettings = await AttendanceSettings.create({
        start_time: '07:00:00',
        late_time: '08:00:00',
        end_time: '09:00:00',
        is_active: true,
        created_by: req.user.id
      });

      return res.json({
        success: true,
        data: defaultSettings
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('출결 시간 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '출결 시간 설정 조회에 실패했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/v1/attendance/settings:
 *   put:
 *     summary: 출결 시간 설정 업데이트
 *     tags: [AttendanceSettings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start_time
 *               - late_time
 *               - end_time
 *             properties:
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: 출결 시작 시간 (HH:MM 또는 HH:MM:SS)
 *                 example: "07:00"
 *               late_time:
 *                 type: string
 *                 format: time
 *                 description: 지각 처리 시작 시간 (HH:MM 또는 HH:MM:SS)
 *                 example: "08:00"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: 출결 마감 시간 (HH:MM 또는 HH:MM:SS)
 *                 example: "09:00"
 *     responses:
 *       200:
 *         description: 성공
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
 *                   $ref: '#/components/schemas/AttendanceSettings'
 *       400:
 *         description: 잘못된 요청
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { start_time, late_time, end_time } = req.body;

    // 입력 검증
    if (!start_time || !late_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: '출결 시작 시간, 지각 처리 시간, 출결 마감 시간은 필수입니다.'
      });
    }

    // 시간 형식 검증 및 변환 (HH:MM -> HH:MM:SS)
    const formatTime = (timeStr) => {
      if (!timeStr.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        throw new Error('올바르지 않은 시간 형식입니다. (HH:MM 또는 HH:MM:SS)');
      }
      return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    };

    const formattedStartTime = formatTime(start_time);
    const formattedLateTime = formatTime(late_time);
    const formattedEndTime = formatTime(end_time);

    // 시간 논리 검증
    if (formattedStartTime >= formattedLateTime) {
      return res.status(400).json({
        success: false,
        message: '지각 처리 시간은 출결 시작 시간보다 늦어야 합니다.'
      });
    }
    
    if (formattedLateTime >= formattedEndTime) {
      return res.status(400).json({
        success: false,
        message: '출결 마감 시간은 지각 처리 시간보다 늦어야 합니다.'
      });
    }

    // 기존 활성 설정 비활성화
    await AttendanceSettings.update(
      { is_active: false },
      { where: { is_active: true } }
    );

    // 새 설정 생성
    const newSettings = await AttendanceSettings.create({
      start_time: formattedStartTime,
      late_time: formattedLateTime,
      end_time: formattedEndTime,
      is_active: true,
      created_by: req.user.id
    });

    logger.info(`출결 시간 설정 업데이트: ${req.user.username}이 시작시간 ${formattedStartTime}, 지각시간 ${formattedLateTime}, 마감시간 ${formattedEndTime}로 설정`);

    res.json({
      success: true,
      message: '출결 시간 설정이 업데이트되었습니다.',
      data: newSettings
    });
  } catch (error) {
    logger.error('출결 시간 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message || '출결 시간 설정 업데이트에 실패했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/v1/attendance/settings/history:
 *   get:
 *     summary: 출결 시간 설정 변경 이력 조회
 *     tags: [AttendanceSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 성공
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
 *                     $ref: '#/components/schemas/AttendanceSettings'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/history', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await AttendanceSettings.findAndCountAll({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('출결 시간 설정 이력 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '출결 시간 설정 이력 조회에 실패했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/v1/attendance/settings/reset:
 *   post:
 *     summary: 출결 시간 설정을 기본값으로 재설정
 *     tags: [AttendanceSettings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 성공
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
 *                   $ref: '#/components/schemas/AttendanceSettings'
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/reset', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    // 기존 활성 설정 비활성화
    await AttendanceSettings.update(
      { is_active: false },
      { where: { is_active: true } }
    );

    // 기본값으로 새 설정 생성
    const defaultSettings = await AttendanceSettings.create({
      start_time: '07:00:00',
      late_time: '08:00:00',
      end_time: '09:00:00',
      is_active: true,
      created_by: req.user.id
    });

    logger.info(`출결 시간 설정 초기화: ${req.user.username}이 기본값으로 재설정`);

    res.json({
      success: true,
      message: '출결 시간 설정이 기본값으로 재설정되었습니다.',
      data: defaultSettings
    });
  } catch (error) {
    logger.error('출결 시간 설정 초기화 실패:', error);
    res.status(500).json({
      success: false,
      message: '출결 시간 설정 초기화에 실패했습니다.'
    });
  }
});

module.exports = router;