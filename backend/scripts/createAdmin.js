const { User } = require('../models');
const logger = require('../config/logger');

const createAdmin = async () => {
  try {
    // 기존 관리자 계정 확인
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    
    if (existingAdmin) {
      logger.info('관리자 계정이 이미 존재합니다.');
      return;
    }

    // 관리자 계정 생성 (환경변수에서 정보 가져오기)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || '관리자';
    
    const admin = await User.create({
      username: adminUsername,
      password: adminPassword,
      name: adminName,
      role: 'admin'
    });

    logger.info('관리자 계정이 생성되었습니다.');
    logger.info(`아이디: ${admin.username}`);
    logger.info(`비밀번호: ${adminPassword}`);
    logger.info('⚠️  보안을 위해 첫 로그인 후 비밀번호를 변경하세요.');

  } catch (error) {
    logger.error('관리자 계정 생성 실패:', error);
    throw error;
  }
};

module.exports = { createAdmin };

// 직접 실행할 때
if (require.main === module) {
  (async () => {
    try {
      const { initDatabase } = require('../models');
      await initDatabase();
      await createAdmin();
      process.exit(0);
    } catch (error) {
      logger.error('스크립트 실행 실패:', error);
      process.exit(1);
    }
  })();
}