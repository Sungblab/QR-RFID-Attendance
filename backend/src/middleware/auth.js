const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const logger = require('../../config/logger');

/**
 * JWT 토큰 인증 미들웨어
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access Token이 필요합니다.'
      });
    }

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 사용자 정보 확인
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자입니다.'
      });
    }

    // 요청 객체에 사용자 정보 추가 (학생인 경우 상세 정보 포함)
    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      // 학생인 경우 추가 정보 포함
      ...(user.role === 'student' && {
        student_id: user.student_id,
        grade: user.grade,
        class: user.class,
        number: user.number,
        rfid_card_id: user.rfid_card_id,
        profile_image: user.profile_image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access Token이 만료되었습니다.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 Access Token입니다.'
      });
    }

    logger.error('토큰 인증 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
};

/**
 * 역할 기반 권한 확인 미들웨어
 * @param {string[]} roles - 허용된 역할 배열
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`권한 부족 - 사용자: ${req.user.username}, 필요 권한: ${roles.join(', ')}, 현재 권한: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: '이 작업을 수행할 권한이 없습니다.'
      });
    }

    next();
  };
};

/**
 * 관리자 권한 확인 미들웨어
 */
const requireAdmin = requireRole(['admin']);

/**
 * 교사 이상 권한 확인 미들웨어
 */
const requireTeacher = requireRole(['admin', 'teacher']);

/**
 * 본인 또는 관리자 권한 확인 미들웨어
 */
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.'
    });
  }

  const targetUserId = parseInt(req.params.userId || req.params.id);
  const isOwner = req.user.id === targetUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    logger.warn(`권한 부족 - 사용자: ${req.user.username}, 요청 대상: ${targetUserId}`);
    return res.status(403).json({
      success: false,
      message: '본인의 정보만 조회할 수 있습니다.'
    });
  }

  next();
};

// authorizeRoles는 requireRole의 별칭
const authorizeRoles = requireRole;

module.exports = {
  authenticateToken,
  requireRole,
  authorizeRoles,
  requireAdmin,
  requireTeacher,
  requireSelfOrAdmin
};