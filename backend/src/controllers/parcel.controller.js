// src/controllers/parcel.controller.js
const { Parcel, Bag, TrackingEvent,
        Notification, sequelize }     = require('../models')
const { PARCEL_STATUS, NOTIF_TYPE,
        NOTIF_CHANNEL, NOTIF_STATUS,
        canTransition }               = require('../constants')
const { generateQRCode }             = require('../services/qrcode.service')
const { Op }                          = require('sequelize')
const { generateParcelCode } = require('../services/codeGenerator.service')

const INCLUDE_FULL = [
  { association: 'sender',  attributes: ['id','name','email','phone'] },
  { association: 'bag', include: [{
      association: 'shipment', include: [
        { association: 'destinationAgency', attributes: ['id','name','city','country'] },
      ],
  }]},
  { association: 'trackingEvents', include: [
      { association: 'agent', attributes: ['id','name'] },
    ],
    order: [['occurredAt', 'DESC']],
  },
]

// ─── GET /api/parcels ─────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { status, search, bagId, page = 1, limit = 15,
            sortBy = 'createdAt', sortDir = 'DESC' } = req.query

    const where = {}
    if (status) where.status = status
    if (bagId)  where.bagId  = bagId
    if (search) where[Op.or] = [
      { qrcode:       { [Op.like]: `%${search}%` } },
      { recipientName: { [Op.like]: `%${search}%` } },
    ]

    if (req.user.role === 'client') {
      where.senderId = req.user.id
    }

    const offset = (parseInt(page) - 1) * parseInt(limit)
    const order  = [[sortBy, sortDir.toUpperCase()]]

    const { count, rows } = await Parcel.findAndCountAll({
      where,
      include: [
        { association: 'sender', attributes: ['id','name'] },
        { association: 'bag', include: [{
            association: 'shipment', include: [
              { association: 'destinationAgency', attributes: ['id','name','city'] },
            ],
        }]},
      ],
      order,
      limit:    parseInt(limit),
      offset,
      distinct: true,
    })

    res.json({ count, rows, page: parseInt(page), totalPages: Math.ceil(count / limit) })
  } catch (err) { next(err) }
}

// ─── GET /api/parcels/track/:qrcode ─────────────────
const trackByQRCode = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({
      where:   { qrcode: req.params.qrcode },
      include: INCLUDE_FULL,
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })
    res.json(parcel)
  } catch (err) { next(err) }
}

// ─── GET /api/parcels/:id ─────────────────────────────
const getById = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByPk(req.params.id, { include: INCLUDE_FULL })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    if (req.user.role === 'client' && parcel.senderId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }
    res.json(parcel)
  } catch (err) { next(err) }
}

// ─── POST /api/parcels ────────────────────────────────
const create = async (req, res, next) => {
  try {
    const { bagId, senderId, recipientName, recipientEmail, recipientPhone, description, weight } = req.body

    if (!bagId || !senderId || !recipientName) {
      return res.status(400).json({ message: 'bagId, senderId et recipientName requis.' })
    }

    const bag = await Bag.findByPk(bagId)
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
    if (bag.status !== 'open') {
      return res.status(400).json({ message: 'Ce sac est fermé.' })
    }

    const parcel = await sequelize.transaction(async (t) => {
      // Génération du code unique
      const qrcode = await generateCode('parcel')

      const p = await Parcel.create({
        bagId, senderId,
        recipientName,
        recipientEmail: recipientEmail ?? null,
        recipientPhone: recipientPhone ?? null,
        description: description ?? null,
        weight: weight ?? null,
        qrcode,
        status: PARCEL_STATUS.RECEIVED,
      }, { transaction: t })

      await TrackingEvent.create({
        parcelId: p.id,
        agentId: req.user.id,
        status: PARCEL_STATUS.RECEIVED,
        occurredAt: new Date(),
        notes: 'Colis réceptionné en agence.',
      }, { transaction: t })

      await Notification.create({
        parcelId: p.id,
        userId: senderId,
        recipientEmail: recipientEmail ?? null,
        channel: NOTIF_CHANNEL.EMAIL,
        type: NOTIF_TYPE.STATUS_UPDATE,
        status: NOTIF_STATUS.PENDING,
      }, { transaction: t })

      return p
    })

    // Génération du QR code après la transaction
    const qrCodeUrl = await generateQRCode(parcel.qrcode, 'parcel')
    await parcel.update({ qrcodeUrl })

    res.status(201).json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) {
    next(err)
  }
}

// ─── PATCH /api/parcels/:id/status ────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { notes, location } = req.body

    const parcel = await Parcel.findByPk(req.params.id, {
      include: [{ association: 'sender', attributes: ['id','email','phone'] }],
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    const nextStatus = canTransition(parcel.status, req.user.role)
    if (!nextStatus) {
      return res.status(400).json({
        message: `Transition impossible : statut "${parcel.status}" avec rôle "${req.user.role}".`,
      })
    }

    await sequelize.transaction(async (t) => {
      await parcel.update({ status: nextStatus }, { transaction: t })

      await TrackingEvent.create({
        parcelId:   parcel.id,
        agentId:    req.user.id,
        status:     nextStatus,
        location:   location ?? null,
        notes:      notes    ?? null,
        occurredAt: new Date(),
      }, { transaction: t })

      await Notification.create({
        parcelId:       parcel.id,
        userId:         parcel.senderId,
        recipientEmail: parcel.sender?.email  ?? null,
        recipientPhone: parcel.recipientPhone ?? null,
        channel:        NOTIF_CHANNEL.EMAIL,
        type:           NOTIF_TYPE.STATUS_UPDATE,
        status:         NOTIF_STATUS.PENDING,
      }, { transaction: t })
    })

    res.json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) { next(err) }
}

// ─── GET /api/parcels/:id/qrcode ────────────────────
const getQRCode = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByPk(req.params.id, {
      attributes: ['id', 'qrcode', 'qrCodeUrl'],
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    // Régénère si manquant
    if (!parcel.qrCodeUrl) {
      const url = await generateQRCode(parcel.qrcode, 'parcel')
      await parcel.update({ qrCodeUrl: url })
      return res.json({ qrcode: parcel.qrcode, url })
    }

    res.json({ qrcode: parcel.qrcode, url: parcel.qrCodeUrl })
  } catch (err) { next(err) }
}

module.exports = { getAll, trackByQRCode, getById, create, updateStatus, getQRCode }