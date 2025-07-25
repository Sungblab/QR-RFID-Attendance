const express = require('express');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../../config/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 사용자명
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *     responses:
 *       200:
 *         description: 로그인 성공
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 입력값 검증
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '사용자명과 비밀번호는 필수입니다.'
      });
    }

    // 사용자 찾기
    const user = await User.findOne({ where: { username } });
    if (!user) {
      logger.warn(`로그인 실패 - 존재하지 않는 사용자: ${username}`);
      return res.status(401).json({
        success: false,
        message: '사용자명 또는 비밀번호가 잘못되었습니다.'
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn(`로그인 실패 - 잘못된 비밀번호: ${username}`);
      return res.status(401).json({
        success: false,
        message: '사용자명 또는 비밀번호가 잘못되었습니다.'
      });
    }

    // 관리자/교사의 경우 승인 상태 확인
    if (['admin', 'teacher'].includes(user.role) && user.status !== 'approved') {
      let message = '계정이 승인되지 않았습니다.';
      if (user.status === 'pending') {
        message = '계정 승인 대기 중입니다. 관리자에게 문의하세요.';
      } else if (user.status === 'rejected') {
        message = '계정이 거부되었습니다. 관리자에게 문의하세요.';
      }
      
      logger.warn(`로그인 실패 - 미승인 계정: ${username} (상태: ${user.status})`);
      return res.status(403).json({
        success: false,
        message,
        code: 'ACCOUNT_NOT_APPROVED'
      });
    }

    // JWT 토큰 생성
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Refresh Token 생성
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Refresh Token을 데이터베이스에 저장
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    try {
      // 기존 Refresh Token 삭제 (테이블이 없어도 에러를 무시)
      await RefreshToken.destroy({ where: { user_id: user.id } });
    } catch (error) {
      // RefreshToken 테이블이 존재하지 않는 경우 무시
      logger.warn(`RefreshToken 삭제 실패 (무시됨): ${error.message}`);
    }

    try {
      // 새 Refresh Token 저장
      await RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        expires_at: expiresAt
      });
    } catch (error) {
      // RefreshToken 저장 실패 시 로그만 남기고 로그인은 계속 진행
      logger.warn(`RefreshToken 저장 실패: ${error.message}`);
    }

    logger.info(`사용자 로그인 성공: ${user.username} (${user.role})`);

    res.json({
      success: true,
      message: '로그인에 성공했습니다.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('로그인 처리 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: 사용자 회원가입
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - name
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 description: 사용자명
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *               name:
 *                 type: string
 *                 description: 실명
 *               role:
 *                 type: string
 *                 enum: [admin, teacher, student]
 *                 description: 사용자 역할
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 *       409:
 *         description: 중복된 사용자명
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    // 입력값 검증
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: '모든 필드는 필수입니다.'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다.'
      });
    }

    // 역할 검증
    if (!['admin', 'teacher', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '올바른 역할을 선택해주세요.'
      });
    }

    // 중복 사용자 확인
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 존재하는 사용자명입니다.'
      });
    }

    // 새 사용자 생성
    const newUser = await User.create({
      username,
      password,
      name,
      role
    });

    logger.info(`새 사용자 등록: ${newUser.username} (${newUser.role})`);

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          role: newUser.role
        }
      }
    });

  } catch (error) {
    logger.error('회원가입 처리 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Access Token 갱신
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh Token
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *       401:
 *         description: 유효하지 않은 토큰
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh Token이 필요합니다.'
      });
    }

    // Refresh Token 검증
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 Refresh Token입니다.'
      });
    }

    // 데이터베이스에서 Refresh Token 확인
    const storedToken = await RefreshToken.findOne({
      where: { 
        token: refreshToken,
        user_id: decoded.userId
      },
      include: [{ model: User }]
    });

    if (!storedToken || new Date() > storedToken.expires_at) {
      if (storedToken) {
        await storedToken.destroy();
      }
      return res.status(401).json({
        success: false,
        message: '만료되거나 유효하지 않은 Refresh Token입니다.'
      });
    }

    const user = storedToken.User;

    // 새로운 Access Token 생성
    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`Access Token 갱신: ${user.username}`);

    res.json({
      success: true,
      message: 'Access Token이 갱신되었습니다.',
      data: {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      }
    });

  } catch (error) {
    logger.error('토큰 갱신 처리 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: 사용자 로그아웃
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh Token
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       401:
 *         description: 인증 실패
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Refresh Token 삭제
      await RefreshToken.destroy({ where: { token: refreshToken } });
    }

    logger.info('사용자 로그아웃');

    res.json({
      success: true,
      message: '로그아웃되었습니다.'
    });

  } catch (error) {
    logger.error('로그아웃 처리 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: 현재 로그인된 사용자 정보 조회
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: 인증 실패
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // authenticateToken 미들웨어에서 이미 사용자 정보를 확인했으므로
    // req.user에서 사용자 정보를 바로 반환
    res.json({
      success: true,
      message: '사용자 정보 조회 성공',
      data: {
        user: req.user  // authenticateToken 미들웨어에서 설정한 전체 사용자 정보 반환
      }
    });

  } catch (error) {
    logger.error('사용자 정보 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

module.exports = router;