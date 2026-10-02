// src/models/Invoice.js
const { DataTypes } = require('sequelize');
const { enumType } = require('./utils');

 
const STATUSES = ['draft','paid', 'partially_paid', 'overdue'];

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'number',
    },
    parcelId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'parcel_id',
    },
    status: {
      ...enumType(STATUSES),
      allowNull: false,
      defaultValue: 'draft',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    montantPaye: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'montant_paye',
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'tax_rate',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'EUR',
    },
    pdfUrl:   { type: DataTypes.STRING(255), allowNull: true, field: 'pdf_url' },
    notes:    { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'invoices',
    timestamps: true,
  });

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Parcel, { foreignKey: 'parcelId', as: 'parcel' });
  };

  return Invoice;
};