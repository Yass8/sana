// src/models/TrackingEvent.js
const { DataTypes } = require('sequelize')
const { enumType }  = require('./utils')

const STATUSES = [
  'received', 'departed_agency', 'departed_airport',
  'arrived_destination', 'collected', 'issue',
]

module.exports = (sequelize) => {
  const TrackingEvent = sequelize.define('TrackingEvent', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    parcelId:   { type: DataTypes.UUID,        allowNull: false, field: 'parcel_id' },
    agentId:    { type: DataTypes.UUID,        allowNull: false, field: 'agent_id'  },
    location:   { type: DataTypes.STRING(100), allowNull: true  },
    notes:      { type: DataTypes.TEXT,        allowNull: true  },
    occurredAt: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
      field:        'occurred_at',
    },
    status: {
      ...enumType(STATUSES),
      allowNull: false,
    },
  }, {
    tableName:  'tracking_events',
    timestamps: false,
  })

  TrackingEvent.associate = (models) => {
    TrackingEvent.belongsTo(models.Parcel, { foreignKey: 'parcelId', as: 'parcel' })
    TrackingEvent.belongsTo(models.User,   { foreignKey: 'agentId',  as: 'agent'  })
  }

  return TrackingEvent
}