// src/models/Parcel.js
const { DataTypes } = require('sequelize')
const { enumType }  = require('./utils')

const STATUSES = [
  'received', 'departed_agency', 'departed_airport',
  'arrived_destination', 'collected', 'issue',
]

module.exports = (sequelize) => {
  const Parcel = sequelize.define('Parcel', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    barcode:        { type: DataTypes.STRING(50),  allowNull: false, unique: true },
    description:    { type: DataTypes.TEXT,        allowNull: true  },
    weight:         { type: DataTypes.DECIMAL(6,2),allowNull: true  },
    bagId:          { type: DataTypes.UUID,        allowNull: false, field: 'bag_id'          },
    senderId:       { type: DataTypes.UUID,        allowNull: false, field: 'sender_id'       },
    recipientName:  { type: DataTypes.STRING(100), allowNull: false, field: 'recipient_name'  },
    recipientPhone: { type: DataTypes.STRING(20),  allowNull: true,  field: 'recipient_phone' },
    recipientEmail: { type: DataTypes.STRING(150), allowNull: true,  field: 'recipient_email' },
    barcodeUrl:     { type: DataTypes.STRING(255), allowNull: true,  field: 'barcode_url'     },
    status: {
      ...enumType(STATUSES),
      allowNull:    false,
      defaultValue: 'received',
    },
  }, {
    tableName:  'parcels',
    timestamps: true,
  })

  Parcel.beforeCreate(async (parcel) => {
    const count   = await Parcel.count()
    const year    = new Date().getFullYear()
    parcel.barcode = `COL-${year}-${String(count + 1).padStart(5, '0')}`
  })

  Parcel.associate = (models) => {
    Parcel.belongsTo(models.Bag,  { foreignKey: 'bagId',    as: 'bag'    })
    Parcel.belongsTo(models.User, { foreignKey: 'senderId', as: 'sender' })
    Parcel.hasMany(models.TrackingEvent, { foreignKey: 'parcelId', as: 'trackingEvents' })
    Parcel.hasMany(models.Notification,  { foreignKey: 'parcelId', as: 'notifications'  })
  }

  return Parcel
}