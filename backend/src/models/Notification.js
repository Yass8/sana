// src/models/Notification.js
const { DataTypes } = require('sequelize')
const { enumType }  = require('./utils')

const CHANNELS = ['email', 'sms']
const TYPES    = ['status_update', 'issue', 'bulk_alert']
const STATUSES = ['pending', 'sent', 'failed']

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    parcelId:       { type: DataTypes.UUID,        allowNull: false, field: 'parcel_id'      },
    userId:         { type: DataTypes.UUID,        allowNull: true,  field: 'user_id'        },
    recipientEmail: { type: DataTypes.STRING(150), allowNull: true,  field: 'recipient_email'},
    recipientPhone: { type: DataTypes.STRING(20),  allowNull: true,  field: 'recipient_phone'},
    errorMessage:   { type: DataTypes.TEXT,        allowNull: true,  field: 'error_message'  },
    sentAt:         { type: DataTypes.DATE,        allowNull: true,  field: 'sent_at'        },
    channel:  { ...enumType(CHANNELS), allowNull: false },
    type:     { ...enumType(TYPES),    allowNull: false },
    status:   { ...enumType(STATUSES), allowNull: false, defaultValue: 'pending' },
  }, {
    tableName:  'notifications',
    timestamps: true,
    updatedAt:  false,
  })

  Notification.associate = (models) => {
    Notification.belongsTo(models.Parcel, { foreignKey: 'parcelId', as: 'parcel' })
    Notification.belongsTo(models.User,   { foreignKey: 'userId',   as: 'user'   })
  }

  return Notification
}