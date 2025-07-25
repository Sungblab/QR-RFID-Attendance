const logger = require('../config/logger');

/**
 * 기본 관리자 계정 생성 함수
 * @param {Object} User - User 모델 (순환 의존성 해결을 위해 파라미터로 전달)
 */
const createDefaultAdmin = async (User) => {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || '시스템 관리자';

    // 기존 관리자 계정 확인
    const existingAdmin = await User.findOne({ 
      where: { username: adminUsername } 
    });

    if (existingAdmin) {
      logger.info(`관리자 계정이 이미 존재합니다: ${adminUsername}`);
      return existingAdmin;
    }

    // 새 관리자 계정 생성
    const adminUser = await User.create({
      username: adminUsername,
      password: adminPassword,
      name: adminName,
      role: 'admin'
    });

    logger.info(`기본 관리자 계정이 생성되었습니다: ${adminUsername}`);
    return adminUser;

  } catch (error) {
    logger.error('관리자 계정 생성 중 오류:', error);
    throw error;
  }
};

module.exports = {
  createDefaultAdmin
};