const { DataTypes } = require('sequelize');
const { enumType } = require('./utils');

const STATUSES = ['ouvert', 'fermé', 'en_transit', 'arrivé', 'issue'];

module.exports = (sequelize) => {
  const Bag = sequelize.define('Bag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    qrcode: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    weight: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    originAgencyId: { type: DataTypes.UUID, allowNull: false, field: 'origin_agency_id' },
    destinationAgencyId: { type: DataTypes.UUID, allowNull: false, field: 'destination_agency_id' },
    departureDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'departure_date' },
    arrivalDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'arrival_date' },
    qrcodeUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'qrcode_url' },
    status: {
      ...enumType(STATUSES),
      allowNull: false,
      defaultValue: 'ouvert',
    },
  }, {
    tableName: 'bags',
    timestamps: true,
  });

  Bag.associate = (models) => {
    Bag.belongsTo(models.Agency, { foreignKey: 'originAgencyId', as: 'originAgency' })
    Bag.belongsTo(models.Agency, { foreignKey: 'destinationAgencyId', as: 'destinationAgency' })
    Bag.hasMany(models.Parcel, { foreignKey: 'bagId', as: 'parcels' })
  };

  return Bag;
};