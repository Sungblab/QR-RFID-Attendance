const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendanceSettings = sequelize.define('AttendanceSettings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '07:00:00',
      comment: '출결 시작 시간'
    },
    late_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '08:00:00',
      comment: '지각 처리 시작 시간'
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '09:00:00',
      comment: '출결 마감 시간'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '설정 활성화 상태'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '설정을 생성한 관리자 ID'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '설정을 마지막으로 수정한 관리자 ID'
    }
  }, {
    tableName: 'attendance_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['is_active']
      }
    ]
  });

  AttendanceSettings.associate = function(models) {
    AttendanceSettings.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    AttendanceSettings.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
  };

  return AttendanceSettings;
};