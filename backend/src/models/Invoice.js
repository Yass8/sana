// src/models/Invoice.js
const { DataTypes } = require('sequelize');
const { enumType } = require('./utils');

const STATUSES          = ['draft', 'paid', 'partially_paid', 'overdue'];
const PAYMENT_MODES     = ['sender_full', 'recipient_full', 'split'];
const PAYMENT_LOCATIONS = ['origin', 'destination', 'mixed'];

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

    // ── Montants ──────────────────────────────────────────
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
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

    // ── Répartition : qui doit payer quoi ─────────────────
    paymentMode: {
      ...enumType(PAYMENT_MODES),
      allowNull: false,
      defaultValue: 'recipient_full',
      field: 'payment_mode',
    },
    paymentLocation: {
      ...enumType(PAYMENT_LOCATIONS),
      allowNull: true,
      field: 'payment_location',
    },
    senderShare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'sender_share',
    },
    recipientShare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'recipient_share',
    },

    // ── Montants réellement encaissés ─────────────────────
    senderPaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'sender_paid',
    },
    recipientPaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'recipient_paid',
    },
    // Dénormalisé = senderPaid + recipientPaid (rétro-compat front)
    montantPaye: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'montant_paye',
    },

    pdfUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'pdf_url' },
    notes:  { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'invoices',
    timestamps: true,
  });

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Parcel, { foreignKey: 'parcelId', as: 'parcel' });
    // Pas d'association payments en court terme
  };

  return Invoice;
};