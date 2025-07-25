const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const MorningAttendance = require('./MorningAttendance');
const QRCode = require('./QRCode')(sequelize);
const AttendanceReport = require('./attendanceReport');
const AttendanceSettings = require('./AttendanceSettings')(sequelize);
const Holiday = require('./Holiday')(sequelize);

// 모델 간 관계 정의

// User와 RefreshToken 관계 (1:N)
User.hasMany(RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens',
  onDelete: 'CASCADE'
});
RefreshToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User'
});

// User와 MorningAttendance 관계 (1:N)
User.hasMany(MorningAttendance, {
  foreignKey: 'user_id',
  as: 'morningAttendances'
});
MorningAttendance.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User와 AttendanceReport 관계 (1:N) - 학생 기준
User.hasMany(AttendanceReport, {
  foreignKey: 'student_id',
  as: 'attendanceReports'
});
AttendanceReport.belongsTo(User, {
  foreignKey: 'student_id',
  as: 'student'
});

// User와 AttendanceReport 관계 (1:N) - 처리자 기준
User.hasMany(AttendanceReport, {
  foreignKey: 'processed_by',
  as: 'processedReports'
});
AttendanceReport.belongsTo(User, {
  foreignKey: 'processed_by',
  as: 'processor'
});

// User와 AttendanceSettings 관계 (1:N) - 생성자 기준
User.hasMany(AttendanceSettings, {
  foreignKey: 'created_by',
  as: 'createdSettings'
});
AttendanceSettings.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// User와 AttendanceSettings 관계 (1:N) - 수정자 기준
User.hasMany(AttendanceSettings, {
  foreignKey: 'updated_by',
  as: 'updatedSettings'
});
AttendanceSettings.belongsTo(User, {
  foreignKey: 'updated_by',
  as: 'updater'
});

// User와 Holiday 관계 (1:N) - 생성자 기준
User.hasMany(Holiday, {
  foreignKey: 'created_by',
  as: 'createdHolidays'
});
Holiday.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// 데이터베이스 초기화 함수
const logger = require('../config/logger');
const { createDefaultAdmin } = require('../utils/createAdmin');

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('데이터베이스 연결이 성공했습니다.');
    
    // 개발 환경에서만 테이블 동기화
    // force: true는 테이블을 재생성하므로 데이터가 삭제됨
    // 개발 환경에서도 데이터를 유지하려면 force: false 사용
    await sequelize.sync({ force: false });
    logger.info('데이터베이스 테이블이 동기화되었습니다.');

    // 기본 관리자 계정 생성
    await createDefaultAdmin(User);
    
  } catch (error) {
    logger.error('데이터베이스 연결 실패:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  RefreshToken,
  MorningAttendance,
  QRCode,
  AttendanceReport,
  AttendanceSettings,
  Holiday,
  initDatabase
};