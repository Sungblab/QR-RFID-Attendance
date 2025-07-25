const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MorningAttendance = sequelize.define('MorningAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  check_in_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'on_time, late, or absent'
  },
}, {
  tableName: 'morning_attendance',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'date']
    }
  ]
});

module.exports = MorningAttendance;