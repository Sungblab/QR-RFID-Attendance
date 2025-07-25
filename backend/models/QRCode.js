const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QRCode = sequelize.define('QRCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    qr_token: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'QR코드 고유 토큰'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'QR코드 활성화 상태'
    }
  }, {
    tableName: 'qr_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['qr_token']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  return QRCode;
};