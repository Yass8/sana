// src/controllers/parcel.controller.js
const { Parcel, Bag, TrackingEvent,
        Notification, sequelize }     = require('../models')
const { PARCEL_STATUS, NOTIF_TYPE,
        NOTIF_CHANNEL, NOTIF_STATUS,
        canTransition }               = require('../constants')
const { generateBarcode }             = require('../services/barcode.service') // ← nouveau
const { Op }                          = require('sequelize')

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
      { barcode:       { [Op.like]: `%${search}%` } },
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

// ─── GET /api/parcels/track/:barcode ─────────────────
const trackByBarcode = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({
      where:   { barcode: req.params.barcode },
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
    const {
      bagId, senderId,
      recipientName, recipientEmail, recipientPhone,
      description, weight,
    } = req.body

    if (!bagId || !senderId || !recipientName) {
      return res.status(400).json({ message: 'bagId, senderId et recipientName requis.' })
    }

    const bag = await Bag.findByPk(bagId)
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
    if (bag.status !== 'open') {
      return res.status(400).json({ message: 'Ce sac est fermé.' })
    }

    const parcel = await sequelize.transaction(async (t) => {

      // 1. Génère le barcode string
      const count   = await Parcel.count({ transaction: t })
      const year    = new Date().getFullYear()
      const barcode = `COL-${year}-${String(count + 1).padStart(5, '0')}`

      // 2. Crée le colis
      const p = await Parcel.create({
        bagId, senderId,
        recipientName,
        recipientEmail: recipientEmail ?? null,
        recipientPhone: recipientPhone ?? null,
        description:    description    ?? null,
        weight:         weight         ?? null,
        barcode,
        status: PARCEL_STATUS.RECEIVED,
      }, { transaction: t })

      // 3. Tracking event initial
      await TrackingEvent.create({
        parcelId:   p.id,
        agentId:    req.user.id,
        status:     PARCEL_STATUS.RECEIVED,
        occurredAt: new Date(),
        notes:      'Colis réceptionné en agence.',
      }, { transaction: t })

      // 4. Notification pending
      await Notification.create({
        parcelId:       p.id,
        userId:         senderId,
        recipientEmail: recipientEmail ?? null,
        channel:        NOTIF_CHANNEL.EMAIL,
        type:           NOTIF_TYPE.STATUS_UPDATE,
        status:         NOTIF_STATUS.PENDING,
      }, { transaction: t })

      return p
    })

    // 5. Génère le PNG code-barres APRÈS la transaction
    const barcodeUrl = await generateBarcode(parcel.barcode, 'parcel')
    await parcel.update({ barcodeUrl })

    res.status(201).json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) { next(err) }
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

// ─── GET /api/parcels/:id/barcode ────────────────────
const getBarcode = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByPk(req.params.id, {
      attributes: ['id', 'barcode', 'barcodeUrl'],
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    // Régénère si manquant
    if (!parcel.barcodeUrl) {
      const url = await generateBarcode(parcel.barcode, 'parcel')
      await parcel.update({ barcodeUrl: url })
      return res.json({ barcode: parcel.barcode, url })
    }

    res.json({ barcode: parcel.barcode, url: parcel.barcodeUrl })
  } catch (err) { next(err) }
}

module.exports = { getAll, trackByBarcode, getById, create, updateStatus, getBarcode }