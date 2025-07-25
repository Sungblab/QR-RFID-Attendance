const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AttendanceReport = sequelize.define('AttendanceReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '출결 해당 날짜'
  },
  type: {
    type: DataTypes.ENUM('absence', 'late', 'early_leave', 'sick_leave', 'official_leave'),
    allowNull: false,
    comment: '신고 유형: absence(결석), late(지각), early_leave(조퇴), sick_leave(병결), official_leave(공결)'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '출결 사유'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '처리 상태: pending(대기중), approved(승인됨), rejected(거절됨)'
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '신고 제출 시간'
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '처리 완료 시간'
  },
  processed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '처리한 관리자/교사 ID'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '첨부파일 목록 (JSON 배열)'
  },
  admin_created: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '관리자가 직접 생성한 신고인지 여부'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '관리자 메모'
  },
  processor_response: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '처리자 답변 (승인/거절 시 학생에게 보여질 메시지)'
  }
}, {
  tableName: 'attendance_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['student_id', 'date'],
      name: 'idx_attendance_reports_student_date'
    },
    {
      fields: ['date', 'status'],
      name: 'idx_attendance_reports_date_status'
    },
    {
      fields: ['type', 'status'],
      name: 'idx_attendance_reports_type_status'
    }
  ]
});

module.exports = AttendanceReport;