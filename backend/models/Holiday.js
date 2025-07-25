const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Holiday = sequelize.define('Holiday', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
      comment: '휴일 날짜 (YYYY-MM-DD)'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '휴일명'
    },
    type: {
      type: DataTypes.ENUM('national', 'school', 'weekend'),
      allowNull: false,
      defaultValue: 'school',
      comment: '휴일 유형 (national: 국가공휴일, school: 학교휴일, weekend: 주말)'
    },
    source: {
      type: DataTypes.ENUM('manual', 'neis', 'system'),
      allowNull: false,
      defaultValue: 'manual',
      comment: '등록 출처 (manual: 수동등록, neis: NEIS연동, system: 시스템자동)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '활성화 상태'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '등록한 관리자 ID'
    }
  }, {
    tableName: 'holidays',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  Holiday.associate = function(models) {
    Holiday.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return Holiday;
};