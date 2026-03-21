// src/models/Shipment.js
const { DataTypes } = require('sequelize')
const { enumType }  = require('./utils')

const STATUSES = ['preparing', 'in_transit', 'arrived', 'issue']

module.exports = (sequelize) => {
  const Shipment = sequelize.define('Shipment', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    reference:     { type: DataTypes.STRING(30),  allowNull: false, unique: true },
    departureDate: { type: DataTypes.DATEONLY,     allowNull: false, field: 'departure_date' },
    arrivalDate:   { type: DataTypes.DATEONLY,     allowNull: true,  field: 'arrival_date'   },
    status: {
      ...enumType(STATUSES),
      allowNull:    false,
      defaultValue: 'preparing',
    },
    originAgencyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      field:     'origin_agency_id',
    },
    destinationAgencyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      field:     'destination_agency_id',
    },
    createdBy: {
      type:      DataTypes.UUID,
      allowNull: false,
      field:     'created_by',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName:  'shipments',
    timestamps: true,
  })

  Shipment.beforeCreate(async (shipment) => {
    const count    = await Shipment.count()
    const year     = new Date().getFullYear()
    shipment.reference = `SHP-${year}-${String(count + 1).padStart(5, '0')}`
  })

  Shipment.associate = (models) => {
    Shipment.belongsTo(models.Agency, { foreignKey: 'originAgencyId',      as: 'originAgency'      })
    Shipment.belongsTo(models.Agency, { foreignKey: 'destinationAgencyId', as: 'destinationAgency' })
    Shipment.belongsTo(models.User,   { foreignKey: 'createdBy',           as: 'creator'           })
    Shipment.hasMany(models.Bag,      { foreignKey: 'shipmentId',          as: 'bags'              })
  }

  return Shipment
}