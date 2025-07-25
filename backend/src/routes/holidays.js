const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const axios = require('axios');
const { Holiday, User } = require('../../models');
const { authenticateToken: requireAuth, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/v1/holidays:
 *   get:
 *     summary: 휴일 목록 조회
 *     description: 휴일 목록을 조회합니다 (월별 필터링 가능)
 *     tags:
 *       - Holiday
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: "연도 (기본값: 현재 연도)"
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: 월 (1-12, 지정시 해당 월만 조회)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [national, school, weekend]
 *         description: 휴일 유형
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: 활성화 상태
 *     responses:
 *       200:
 *         description: 휴일 목록 조회 성공
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
 *                       id:
 *                         type: integer
 *                       date:
 *                         type: string
 *                         format: date
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [national, school, weekend]
 *                       source:
 *                         type: string
 *                         enum: [manual, neis, system]
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */
// 휴일 목록 조회
router.get('/', requireAuth, async (req, res) => {
  try {
    const { year, month, type, is_active } = req.query;
    
    // 현재 연도가 기본값
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    let whereClause = {
      is_active: is_active !== undefined ? is_active === 'true' : true
    };

    // 타입 필터
    if (type) {
      whereClause.type = type;
    }

    // 날짜 범위 필터
    if (month) {
      const targetMonth = parseInt(month);
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0);
      
      whereClause.date = {
        [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      };
    } else {
      // 연도만 지정된 경우
      const startDate = new Date(targetYear, 0, 1);
      const endDate = new Date(targetYear, 11, 31);
      
      whereClause.date = {
        [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      };
    }

    const holidays = await Holiday.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'role'],
        required: false
      }],
      order: [['date', 'ASC']]
    });

    // 주말 자동 생성 (weekend 타입이 요청되었고, 해당 월에 주말이 없는 경우)
    if ((!type || type === 'weekend') && month) {
      const targetMonth = parseInt(month);
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const existingWeekends = holidays.filter(h => h.type === 'weekend');
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(targetYear, targetMonth - 1, day);
        const dateString = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        
        if ((dayOfWeek === 0 || dayOfWeek === 6) && !existingWeekends.find(h => h.date === dateString)) {
          // 주말 휴일이 DB에 없으면 동적으로 추가 (실제 DB에 저장하지 않고 응답에만 포함)
          holidays.push({
            id: `weekend-${dateString}`,
            date: dateString,
            name: dayOfWeek === 0 ? '일요일' : '토요일',
            type: 'weekend',
            source: 'system',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            creator: null
          });
        }
      }
    }

    // 날짜 순으로 다시 정렬
    holidays.sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      data: holidays
    });

  } catch (error) {
    console.error('휴일 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴일 목록 조회 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/holidays:
 *   post:
 *     summary: 휴일 등록
 *     description: 새로운 휴일을 등록합니다 (관리자/교사만 가능)
 *     tags:
 *       - Holiday
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - name
 *               - type
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 휴일 날짜 (YYYY-MM-DD)
 *                 example: "2025-12-25"
 *               name:
 *                 type: string
 *                 description: 휴일명
 *                 example: "크리스마스"
 *               type:
 *                 type: string
 *                 enum: [national, school]
 *                 description: 휴일 유형
 *                 example: "national"
 *     responses:
 *       201:
 *         description: 휴일 등록 성공
 *       400:
 *         description: 잘못된 요청 (필수 값 누락, 중복 날짜 등)
 *       403:
 *         description: 권한 없음
 */
// 휴일 등록 (관리자/교사만 가능)
router.post('/', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { date, name, type } = req.body;
    const userId = req.user.id;

    // 필수 값 검증
    if (!date || !name || !type) {
      return res.status(400).json({
        success: false,
        message: '날짜, 휴일명, 유형을 모두 입력해주세요'
      });
    }

    // 유형 검증
    if (!['national', 'school'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '휴일 유형은 national 또는 school이어야 합니다'
      });
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: '날짜 형식이 잘못되었습니다 (YYYY-MM-DD)'
      });
    }

    // 중복 날짜 체크
    const existingHoliday = await Holiday.findOne({
      where: { date }
    });

    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        message: '이미 등록된 날짜입니다',
        existing: {
          id: existingHoliday.id,
          name: existingHoliday.name,
          type: existingHoliday.type
        }
      });
    }

    // 휴일 생성
    const holiday = await Holiday.create({
      date,
      name,
      type,
      source: 'manual',
      created_by: userId,
      is_active: true
    });

    // 생성된 휴일 정보 반환 (생성자 정보 포함)
    const createdHoliday = await Holiday.findByPk(holiday.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'role']
      }]
    });

    return res.status(201).json({
      success: true,
      data: createdHoliday,
      message: '휴일이 성공적으로 등록되었습니다'
    });

  } catch (error) {
    console.error('휴일 등록 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴일 등록 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/holidays/{holidayId}:
 *   put:
 *     summary: 휴일 수정
 *     description: 기존 휴일 정보를 수정합니다 (관리자/교사만 가능, manual 소스만 수정 가능)
 *     tags:
 *       - Holiday
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: holidayId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 휴일 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 휴일명
 *               type:
 *                 type: string
 *                 enum: [national, school]
 *                 description: 휴일 유형
 *               is_active:
 *                 type: boolean
 *                 description: 활성화 상태
 *     responses:
 *       200:
 *         description: 휴일 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 휴일을 찾을 수 없음
 */
// 휴일 수정 (관리자/교사만 가능)
router.put('/:holidayId', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { holidayId } = req.params;
    const { name, type, is_active } = req.body;

    const holiday = await Holiday.findByPk(holidayId);
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: '휴일을 찾을 수 없습니다'
      });
    }

    // 모든 소스 수정 가능하도록 변경
    // if (holiday.source !== 'manual') {
    //   return res.status(400).json({
    //     success: false,
    //     message: `${holiday.source === 'neis' ? 'NEIS' : '시스템'}에서 생성된 휴일은 수정할 수 없습니다`
    //   });
    // }

    // 업데이트할 데이터 준비
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined && ['national', 'school'].includes(type)) updateData.type = type;
    if (is_active !== undefined) updateData.is_active = is_active;

    // 수정사항이 없는 경우
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 내용이 없습니다'
      });
    }

    await holiday.update(updateData);

    // 수정된 휴일 정보 반환
    const updatedHoliday = await Holiday.findByPk(holidayId, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'role']
      }]
    });

    return res.json({
      success: true,
      data: updatedHoliday,
      message: '휴일이 성공적으로 수정되었습니다'
    });

  } catch (error) {
    console.error('휴일 수정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴일 수정 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/holidays/{holidayId}:
 *   delete:
 *     summary: 휴일 삭제
 *     description: 휴일을 삭제합니다 (관리자/교사만 가능, manual 소스만 삭제 가능)
 *     tags:
 *       - Holiday
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: holidayId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 휴일 ID
 *     responses:
 *       200:
 *         description: 휴일 삭제 성공
 *       400:
 *         description: 삭제할 수 없는 휴일
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 휴일을 찾을 수 없음
 */
// 휴일 삭제 (관리자/교사만 가능)
router.delete('/:holidayId', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { holidayId } = req.params;

    const holiday = await Holiday.findByPk(holidayId);
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: '휴일을 찾을 수 없습니다'
      });
    }

    // 모든 소스 삭제 가능하도록 변경
    // if (holiday.source !== 'manual') {
    //   return res.status(400).json({
    //     success: false,
    //     message: `${holiday.source === 'neis' ? 'NEIS' : '시스템'}에서 생성된 휴일은 삭제할 수 없습니다`
    //   });
    // }

    await holiday.destroy();

    return res.json({
      success: true,
      message: '휴일이 성공적으로 삭제되었습니다',
      deleted: {
        id: holiday.id,
        date: holiday.date,
        name: holiday.name
      }
    });

  } catch (error) {
    console.error('휴일 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴일 삭제 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/holidays/check/{date}:
 *   get:
 *     summary: 특정 날짜 휴일 여부 확인
 *     description: 특정 날짜가 휴일인지 확인합니다 (QR 리더기에서 사용)
 *     tags:
 *       - Holiday
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 확인할 날짜 (YYYY-MM-DD)
 *         example: "2025-12-25"
 *     responses:
 *       200:
 *         description: 휴일 여부 확인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 is_holiday:
 *                   type: boolean
 *                 holiday:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string 
 *                     source:
 *                       type: string
 */
// 특정 날짜 휴일 여부 확인 (공개 API - 인증 불필요)
router.get('/check/:date', async (req, res) => {
  try {
    const { date } = req.params;

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: '날짜 형식이 잘못되었습니다 (YYYY-MM-DD)'
      });
    }

    // DB에서 휴일 조회
    let holiday = await Holiday.findOne({
      where: { 
        date,
        is_active: true
      }
    });

    // DB에 없으면 주말인지 확인
    if (!holiday) {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // 주말인 경우 가상의 휴일 객체 생성
        holiday = {
          name: dayOfWeek === 0 ? '일요일' : '토요일',
          type: 'weekend',
          source: 'system'
        };
      }
    }

    return res.json({
      success: true,
      is_holiday: !!holiday,
      holiday: holiday ? {
        name: holiday.name,
        type: holiday.type,
        source: holiday.source
      } : null
    });

  } catch (error) {
    console.error('휴일 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '휴일 확인 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/holidays/sync-neis:
 *   post:
 *     summary: NEIS 학사일정 동기화
 *     description: NEIS API에서 학사일정을 가져와 휴일로 등록합니다 (관리자만 가능)
 *     tags:
 *       - Holiday
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - month
 *             properties:
 *               year:
 *                 type: integer
 *                 description: 연도
 *                 example: 2025
 *               month:
 *                 type: integer
 *                 description: 월 (1-12)
 *                 example: 3
 *     responses:
 *       200:
 *         description: NEIS 동기화 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     fetched:
 *                       type: integer
 *                       description: NEIS에서 가져온 항목 수
 *                     created:
 *                       type: integer
 *                       description: 새로 생성된 휴일 수
 *                     skipped:
 *                       type: integer
 *                       description: 이미 존재하여 건너뛴 휴일 수
 *                     weekends:
 *                       type: integer
 *                       description: 추가된 주말 수
 *       400:
 *         description: 잘못된 요청
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
// NEIS 학사일정 동기화 (관리자만 가능)
router.post('/sync-neis', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { year, month } = req.body;
    const userId = req.user.id;

    // 필수 값 검증
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: '연도와 월을 입력해주세요'
      });
    }

    // 유효한 연도/월 검증
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 1 || year > currentYear + 2) {
      return res.status(400).json({
        success: false,
        message: '유효한 연도를 입력해주세요'
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: '월은 1-12 사이의 값이어야 합니다'
      });
    }

    // NEIS API 설정
    const NEIS_API_KEY = process.env.NEIS_API_KEY;
    const SCHOOL_CODE = process.env.SCHOOL_CODE || '8490065'; // 완도고등학교
    const OFFICE_CODE = process.env.OFFICE_CODE || 'Q10'; // 전라남도교육청

    if (!NEIS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'NEIS API 키가 설정되지 않았습니다'
      });
    }

    // 날짜 범위 설정
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const fromDate = `${year}${String(month).padStart(2, '0')}01`;
    const toDate = `${year}${String(month).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}`;

    // NEIS API 호출
    const neisUrl = 'https://open.neis.go.kr/hub/SchoolSchedule';
    const params = {
      KEY: NEIS_API_KEY,
      Type: 'json',
      ATPT_OFCDC_SC_CODE: OFFICE_CODE,
      SD_SCHUL_CODE: SCHOOL_CODE,
      AA_FROM_YMD: fromDate,
      AA_TO_YMD: toDate
    };
    const response = await axios.get(neisUrl, { params });
    
    let stats = {
      fetched: 0,
      created: 0,
      skipped: 0,
      weekends: 0
    };

    // NEIS 응답 처리
    if (response.data && response.data.SchoolSchedule) {
      const schedules = response.data.SchoolSchedule[1]?.row || [];
      stats.fetched = schedules.length;

      // 휴일로 등록할 이벤트 유형
      const holidayEventTypes = [
        '공휴일',
        '방학',
        '휴업일',
        '재량휴업일',
        '창립기념일',
        '명절',
        '연휴',
        '대체공휴일',
        '임시공휴일',
        '하계방학',
        '동계방학',
        '봄방학',
        '가을방학'
      ];

      for (const schedule of schedules) {
        const eventName = schedule.EVENT_NM;
        const dateStr = schedule.AA_YMD; // YYYYMMDD 형식
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        
        // 휴일 유형인지 확인
        const isHoliday = holidayEventTypes.some(type => eventName.includes(type));
        
        if (isHoliday) {
          // 이미 존재하는지 확인
          const existing = await Holiday.findOne({
            where: { date: formattedDate }
          });

          if (!existing) {
            // 휴일 유형 결정
            let holidayType = 'school';
            if (eventName.includes('공휴일') || eventName.includes('명절') || 
                eventName.includes('현충일') || eventName.includes('광복절') || 
                eventName.includes('개천절') || eventName.includes('한글날') ||
                eventName.includes('크리스마스') || eventName.includes('신정') ||
                eventName.includes('설날') || eventName.includes('추석') ||
                eventName.includes('부처님오신날') || eventName.includes('어린이날')) {
              holidayType = 'national';
            }

            await Holiday.create({
              date: formattedDate,
              name: eventName,
              type: holidayType,
              source: 'neis',
              created_by: userId,
              is_active: true
            });
            stats.created++;
          } else {
            stats.skipped++;
          }
        }
      }
    }

    // 주말 자동 등록
    const daysInMonth = endDate.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 일요일(0), 토요일(6)
        const existing = await Holiday.findOne({
          where: { date: dateString }
        });

        if (!existing) {
          await Holiday.create({
            date: dateString,
            name: dayOfWeek === 0 ? '일요일' : '토요일',
            type: 'weekend',
            source: 'system',
            created_by: userId,
            is_active: true
          });
          stats.weekends++;
        }
      }
    }

    return res.json({
      success: true,
      message: 'NEIS 학사일정이 성공적으로 동기화되었습니다',
      stats
    });

  } catch (error) {
    console.error('NEIS 동기화 오류:', error);
    
    // NEIS API 오류 처리
    if (error.response) {
      return res.status(500).json({
        success: false,
        message: 'NEIS API 호출 중 오류가 발생했습니다',
        error: error.response.data?.RESULT?.MESSAGE || error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'NEIS 동기화 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/holidays/schedule:
 *   get:
 *     summary: NEIS 학사일정 조회 (미리보기)
 *     description: NEIS API에서 학사일정을 조회합니다 (실제로 등록하지는 않음)
 *     tags:
 *       - Holiday
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: 연도
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *         description: 월 (1-12)
 *     responses:
 *       200:
 *         description: 학사일정 조회 성공
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
 *                       date:
 *                         type: string
 *                         format: date
 *                       name:
 *                         type: string
 *                       isHoliday:
 *                         type: boolean
 *                       type:
 *                         type: string
 *                         enum: [national, school, weekend]
 *                       alreadyRegistered:
 *                         type: boolean
 */
// NEIS 학사일정 미리보기
router.get('/schedule', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { year, month } = req.query;

    // 필수 값 검증
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: '연도와 월을 입력해주세요'
      });
    }

    // NEIS API 설정
    const NEIS_API_KEY = process.env.NEIS_API_KEY;
    const SCHOOL_CODE = process.env.SCHOOL_CODE || '8490065';
    const OFFICE_CODE = process.env.OFFICE_CODE || 'Q10';

    if (!NEIS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'NEIS API 키가 설정되지 않았습니다'
      });
    }

    // 날짜 범위 설정
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const fromDate = `${year}${String(month).padStart(2, '0')}01`;
    const toDate = `${year}${String(month).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}`;

    // NEIS API 호출
    const neisUrl = 'https://open.neis.go.kr/hub/SchoolSchedule';
    const params = {
      KEY: NEIS_API_KEY,
      Type: 'json',
      ATPT_OFCDC_SC_CODE: OFFICE_CODE,
      SD_SCHUL_CODE: SCHOOL_CODE,
      AA_FROM_YMD: fromDate,
      AA_TO_YMD: toDate
    };

    const response = await axios.get(neisUrl, { params });
    
    const schedules = [];
    
    // NEIS 응답 처리
    if (response.data && response.data.SchoolSchedule) {
      const neisSchedules = response.data.SchoolSchedule[1]?.row || [];

      // 휴일로 등록할 이벤트 유형
      const holidayEventTypes = [
        '공휴일',
        '방학',
        '휴업일',
        '재량휴업일',
        '창립기념일',
        '명절',
        '연휴',
        '대체공휴일',
        '임시공휴일',
        '하계방학',
        '동계방학',
        '봄방학',
        '가을방학'
      ];

      for (const schedule of neisSchedules) {
        const eventName = schedule.EVENT_NM;
        const dateStr = schedule.AA_YMD;
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        
        // 휴일 유형인지 확인
        const isHoliday = holidayEventTypes.some(type => eventName.includes(type));
        
        // 휴일 유형 결정
        let holidayType = null;
        if (isHoliday) {
          holidayType = 'school';
          if (eventName.includes('공휴일') || eventName.includes('명절') || 
              eventName.includes('현충일') || eventName.includes('광복절') || 
              eventName.includes('개천절') || eventName.includes('한글날') ||
              eventName.includes('크리스마스') || eventName.includes('신정') ||
              eventName.includes('설날') || eventName.includes('추석') ||
              eventName.includes('부처님오신날') || eventName.includes('어린이날')) {
            holidayType = 'national';
          }
        }

        // 이미 등록되어 있는지 확인
        const existing = await Holiday.findOne({
          where: { date: formattedDate }
        });

        schedules.push({
          date: formattedDate,
          name: eventName,
          isHoliday,
          type: holidayType,
          alreadyRegistered: !!existing
        });
      }
    }

    // 주말 정보 추가
    const daysInMonth = endDate.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const existing = await Holiday.findOne({
          where: { date: dateString }
        });

        // 이미 추가된 일정이 아닌 경우만 추가
        if (!schedules.find(s => s.date === dateString)) {
          schedules.push({
            date: dateString,
            name: dayOfWeek === 0 ? '일요일' : '토요일',
            isHoliday: true,
            type: 'weekend',
            alreadyRegistered: !!existing
          });
        }
      }
    }

    // 날짜순 정렬
    schedules.sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      data: schedules
    });

  } catch (error) {
    console.error('NEIS 학사일정 조회 오류:', error);
    
    if (error.response) {
      return res.status(500).json({
        success: false,
        message: 'NEIS API 호출 중 오류가 발생했습니다',
        error: error.response.data?.RESULT?.MESSAGE || error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: '학사일정 조회 중 오류가 발생했습니다',
      error: error.message
    });
  }
});

module.exports = router;