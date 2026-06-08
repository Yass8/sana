// src/controllers/dashboard.controller.js
const { Parcel, Bag, Notification, sequelize } = require('../models')
const { Op }                                   = require('sequelize')
const { BAG_STATUS, PARCEL_STATUS, ROLES } = require('../constants');

const getStats = async (req, res, next) => {
  try {
    const today     = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const [todayCount, yesterdayCount, bagsInTransit,
           issues, monthDelivered] = await Promise.all([
      Parcel.count({ where: { createdAt: { [Op.gte]: today } } }),
      Parcel.count({ where: { createdAt: { [Op.between]: [yesterday, today] } } }),
      Bag.count({    where: { status: 'in_transit' } }),
      Parcel.count({ where: { status: 'issue' } }),
      Parcel.count({ where: {
        status:    'collected',
        updatedAt: { [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) },
      }}),
    ])

    res.json({
      todayCount,
      todayDiff:      todayCount - yesterdayCount,
      bagsInTransit,
      issues,
      monthDelivered,
    })
  } catch (err) { next(err) }
}

const getNotifStats = async (req, res, next) => {
  try {
    const [total, sent, pending, failed] = await Promise.all([
      Notification.count(),
      Notification.count({ where: { status: 'sent'    } }),
      Notification.count({ where: { status: 'pending' } }),
      Notification.count({ where: { status: 'failed'  } }),
    ])
    res.json({ total, sent, pending, failed })
  } catch (err) { next(err) }
}

const getQuickActions = async (req, res, next) => {
  try {
    const { role } = req.user;
    const actions = [];

    // ---------- Agent FR / Admin ----------
    if (role === ROLES.AGENT_FR || role === ROLES.ADMIN) {
      // Sacs ouverts (à fermer) ayant au moins un colis
      const bagsToClose = await Bag.findAll({
        where: { status: BAG_STATUS.OPEN },
        include: [
          { association: 'destinationAgency', attributes: ['id', 'name', 'city'] },
          {
            association: 'parcels',
            attributes: ['id'],
            required: true,   // exclut les sacs vides
          },
        ],
        order: [['createdAt', 'DESC']],
      });
      bagsToClose.forEach(bag => {
        actions.push({
          type: 'bag',
          id: bag.id,
          code: bag.qrcode,
          status: bag.status,
          label: `Sac ouvert (${bag.parcels.length} colis) → ${bag.destinationAgency?.city || '?'}`,
          actionType: 'close',
          targetUrl: `/bags/${bag.id}`,
        });
      });

      // Colis individuels reçus (prêts à partir)
      const individualParcels = await Parcel.findAll({
        where: { status: PARCEL_STATUS.RECEIVED, bagId: null },
        include: [{ association: 'sender', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
      });
      individualParcels.forEach(parcel => {
        actions.push({
          type: 'parcel',
          id: parcel.id,
          code: parcel.qrcode,
          status: parcel.status,
          label: `Colis individuel reçu → ${parcel.recipientName}`,
          actionType: 'depart_airport',
          targetUrl: `/parcels/${parcel.id}`,
        });
      });
    }

    // ---------- Agent AF / Admin ----------
    if (role === ROLES.AGENT_AF || role === ROLES.ADMIN) {
      // Sacs en transit (ayant au moins un colis)
      const bagsInTransit = await Bag.findAll({
        where: { status: BAG_STATUS.IN_TRANSIT },
        include: [
          { association: 'destinationAgency', attributes: ['id', 'name', 'city'] },
          {
            association: 'parcels',
            attributes: ['id'],
            required: true,
          },
        ],
        order: [['createdAt', 'DESC']],
      });
      bagsInTransit.forEach(bag => {
        actions.push({
          type: 'bag',
          id: bag.id,
          code: bag.qrcode,
          status: bag.status,
          label: `Sac en transit (${bag.parcels.length} colis) → ${bag.destinationAgency?.city || '?'}`,
          actionType: 'arrive_destination',
          targetUrl: `/bags/${bag.id}`,
        });
      });

      // Colis individuels en vol
      const individualParcelsInTransit = await Parcel.findAll({
        where: { status: PARCEL_STATUS.DEPARTED_AIRPORT, bagId: null },
        include: [{ association: 'sender', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
      });
      individualParcelsInTransit.forEach(parcel => {
        actions.push({
          type: 'parcel',
          id: parcel.id,
          code: parcel.qrcode,
          status: parcel.status,
          label: `Colis individuel en vol → ${parcel.recipientName}`,
          actionType: 'arrive_destination',
          targetUrl: `/parcels/${parcel.id}`,
        });
      });

      // Sacs arrivés ayant encore au moins un colis non collecté et non problématique
      const arrivedBags = await Bag.findAll({
        where: { status: BAG_STATUS.ARRIVED },
        include: [
          { association: 'destinationAgency', attributes: ['id', 'name', 'city'] },
          {
            association: 'parcels',
            attributes: ['id'],
            where: {
              status: {
                [Op.notIn]: [PARCEL_STATUS.COLLECTED, PARCEL_STATUS.ISSUE],
              },
            },
            required: true,   // exclut les sacs dont tous les colis sont collectés ou en problème
          },
        ],
        order: [['createdAt', 'DESC']],
      });
      arrivedBags.forEach(bag => {
        actions.push({
          type: 'bag',
          id: bag.id,
          code: bag.qrcode,
          status: bag.status,
          label: `Sac arrivé (${bag.parcels.length} colis restants) → ${bag.destinationAgency?.city || '?'}`,
          actionType: 'confirm_collection',
          targetUrl: `/bags/${bag.id}`,
        });
      });

      // Colis individuels arrivés (non collectés, non problématiques)
      const arrivedParcels = await Parcel.findAll({
        where: {
          status: PARCEL_STATUS.ARRIVED_DESTINATION,
          bagId: null,
          // exclure ceux déjà collectés ou problématiques (normalement déjà filtrés par le statut)
        },
        include: [{ association: 'sender', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
      });
      arrivedParcels.forEach(parcel => {
        actions.push({
          type: 'parcel',
          id: parcel.id,
          code: parcel.qrcode,
          status: parcel.status,
          label: `Colis individuel arrivé → ${parcel.recipientName}`,
          actionType: 'confirm_collection',
          targetUrl: `/parcels/${parcel.id}`,
        });
      });
    }

    res.json(actions);
  } catch (err) {
    next(err);
  }
};


module.exports = { getStats, getNotifStats, getQuickActions }