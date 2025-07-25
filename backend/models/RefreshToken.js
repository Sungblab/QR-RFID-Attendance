const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * @swagger
 * components:
 *   schemas:
 *     RefreshToken:
 *       type: object
 *       required:
 *         - user_id
 *         - token
 *         - expires_at
 *       properties:
 *         id:
 *           type: integer
 *           description: 토큰 고유 ID
 *         user_id:
 *           type: integer
 *           description: 사용자 ID
 *         token:
 *           type: string
 *           description: Refresh Token
 *         expires_at:
 *           type: string
 *           format: date-time
 *           description: 만료 시간
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  indexes: [
    {
      fields: ['token']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = RefreshToken;