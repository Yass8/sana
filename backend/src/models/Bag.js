const { DataTypes } = require('sequelize');
const { enumType } = require('./utils');

const STATUSES = ['open', 'closed', 'in_transit', 'arrived', 'issue'];

module.exports = (sequelize) => {
  const Bag = sequelize.define('Bag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    qrcode: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    weight: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    shipmentId: { type: DataTypes.UUID, allowNull: false, field: 'shipment_id' },
    qrcodeUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'qrcode_url' },
    status: {
      ...enumType(STATUSES),
      allowNull: false,
      defaultValue: 'open',
    },
  }, {
    tableName: 'bags',
    timestamps: true,
  });

  Bag.associate = (models) => {
    Bag.belongsTo(models.Shipment, { foreignKey: 'shipmentId', as: 'shipment' });
    Bag.hasMany(models.Parcel, { foreignKey: 'bagId', as: 'parcels' });
  };

  return Bag;
};