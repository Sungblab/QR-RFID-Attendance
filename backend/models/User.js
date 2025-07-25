const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - name
 *         - role
 *       properties:
 *         id:
 *           type: integer
 *           description: 사용자 고유 ID
 *         username:
 *           type: string
 *           description: "사용자명 (학생은 4자리 학번, 선생님은 teacher123 형태)"
 *           example: "3203"
 *         password:
 *           type: string
 *           description: "비밀번호 해시화됨"
 *         name:
 *           type: string
 *           description: 실명
 *           example: "김철수"
 *         role:
 *           type: string
 *           enum: [admin, teacher, student]
 *           description: 사용자 역할
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           description: 계정 승인 상태 (관리자/교사용)
 *         student_id:
 *           type: string
 *           description: "학번 (학생인 경우만)"
 *           example: "3203"
 *         grade:
 *           type: integer
 *           description: "학년 (학생인 경우만, 1-3)"
 *           example: 3
 *         class:
 *           type: integer
 *           description: "반 (학생인 경우만, 1-20)"
 *           example: 2
 *         number:
 *           type: integer
 *           description: "번호 (학생인 경우만, 1-50)"
 *           example: 15
 *         rfid_card_id:
 *           type: string
 *           description: "RFID 카드 ID (학생인 경우만)"
 *           example: "RFID001"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'teacher', 'student'),
    allowNull: false,
    defaultValue: 'student'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'approved'
  },
  // 학생 전용 필드들
  student_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: {
      len: [1, 20]
    }
  },
  grade: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 3
    }
  },
  class: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 20
    }
  },
  number: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 50
    }
  },
  student_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: '학번 (학생만)',
    validate: {
      len: [1, 20]
    }
  },
  rfid_card_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'RFID 카드 ID (학생만)',
    validate: {
      len: [1, 50]
    }
  },
}, {
  tableName: 'users',
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// 인스턴스 메서드
User.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;