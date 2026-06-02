// src/controllers/parcel.controller.js
const { Parcel, Bag, TrackingEvent,
        Notification, User, sequelize } = require('../models')
const { PARCEL_STATUS, NOTIF_TYPE,
        NOTIF_CHANNEL, NOTIF_STATUS,
        canTransition } = require('../constants')
const { generateQRCode } = require('../services/qrcode.service')
const { Op } = require('sequelize')
const { generateCode } = require('../services/codeGenerator.service')
const { sendStatusEmail } = require('../services/email.service');

const INCLUDE_FULL = [
  { association: 'sender',  attributes: ['id','name','email','phone'] },
  { association: 'bag', include: [
      { association: 'originAgency', attributes: ['id','name','city','country'] },
      { association: 'destinationAgency', attributes: ['id','name','city','country'] },
    ]},
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
        { association: 'bag', include: [
            { association: 'originAgency', attributes: ['id','name','city'] },
            { association: 'destinationAgency', attributes: ['id','name','city'] },
          ]},
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
    if (bag.status !== 'ouvert') {
      return res.status(400).json({ message: 'Ce sac est fermé.' })
    }

    // Récupérer l'expéditeur pour ses coordonnées
    const sender = await User.findByPk(senderId, { attributes: ['id', 'name', 'email', 'phone'] })

    if (!sender) {
      throw new Error('Expéditeur introuvable')
    }

    let parcel
    await sequelize.transaction(async (t) => {
      const qrcode = await generateCode('parcel')

      parcel = await Parcel.create({
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
        parcelId: parcel.id,
        agentId: req.user.id,
        status: PARCEL_STATUS.RECEIVED,
        occurredAt: new Date(),
        notes: 'Colis réceptionné en agence.',
      }, { transaction: t })

      // Notification pour l'expéditeur (email)
      await Notification.create({
        parcelId: parcel.id,
        userId: senderId,
        recipientEmail: sender.email,
        channel: NOTIF_CHANNEL.EMAIL,
        type: NOTIF_TYPE.STATUS_UPDATE,
        status: NOTIF_STATUS.PENDING,
      }, { transaction: t })

      // Optionnel : notification pour le destinataire s'il a un email
      if (recipientEmail) {
        await Notification.create({
          parcelId: parcel.id,
          recipientEmail: recipientEmail,
          channel: NOTIF_CHANNEL.EMAIL,
          type: NOTIF_TYPE.STATUS_UPDATE,
          status: NOTIF_STATUS.PENDING,
        }, { transaction: t })
      }

      // mettre à jour le poids du sac
      // Récupérer tous les colis du sac (avec le nouveau colis inclus)
      const allParcels = await Parcel.findAll({
        where: { bagId },
        attributes: ['weight'],
        transaction: t,
      })
      // Calculer la somme des poids (les poids null sont ignorés)
      const totalWeight = allParcels.reduce((sum, p) => {
        const w = p.weight ? parseFloat(p.weight) : 0
        return sum + w
      }, 0)
      // Mettre à jour le sac
      await bag.update({ weight: totalWeight }, { transaction: t })
    })

    // Génération du QR
    const qrcodeUrl = await generateQRCode(parcel.qrcode, 'parcel')
    await parcel.update({ qrcodeUrl })

    // Envoi de l'email de confirmation
    try {
      await sendStatusEmail({
        to: sender.email,
        parcelCode: parcel.qrcode,
        status: PARCEL_STATUS.RECEIVED,
        recipientName: recipientName,
        senderName: sender.name,
        notes: 'Colis réceptionné en agence.',
        date: new Date(),
      })
      // Mettre à jour la notification de l'expéditeur comme SENT
      await Notification.update(
        { status: NOTIF_STATUS.SENT, sentAt: new Date() },
        { where: { parcelId: parcel.id, userId: senderId, type: NOTIF_TYPE.STATUS_UPDATE } }
      )
    } catch (emailErr) {
      console.error('Erreur envoi email:', emailErr)
      // Marquer la notification comme FAILED
      await Notification.update(
        { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
        { where: { parcelId: parcel.id, userId: senderId, type: NOTIF_TYPE.STATUS_UPDATE } }
      )
    }

    // Si destinataire a un email, envoyer aussi
    if (recipientEmail) {
      try {
        await sendStatusEmail({
          to: recipientEmail,
          parcelCode: parcel.qrcode,
          status: PARCEL_STATUS.RECEIVED,
          recipientName: recipientName,
          senderName: sender.name,
          notes: 'Votre colis a été réceptionné en agence.',
          date: new Date(),
        })
        await Notification.update(
          { status: NOTIF_STATUS.SENT, sentAt: new Date() },
          { where: { parcelId: parcel.id, recipientEmail: recipientEmail, type: NOTIF_TYPE.STATUS_UPDATE } }
        )
      } catch (emailErr) {
        await Notification.update(
          { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
          { where: { parcelId: parcel.id, recipientEmail: recipientEmail, type: NOTIF_TYPE.STATUS_UPDATE } }
        )
      }
    }

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
      include: [
        { association: 'sender', attributes: ['id','name','email','phone'] },
      ],
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

      // Notification pour l'expéditeur
      await Notification.create({
        parcelId:       parcel.id,
        userId:         parcel.senderId,
        recipientEmail: parcel.sender?.email  ?? null,
        channel:        NOTIF_CHANNEL.EMAIL,
        type:           NOTIF_TYPE.STATUS_UPDATE,
        status:         NOTIF_STATUS.PENDING,
      }, { transaction: t })

      // Notification pour le destinataire s'il a un email
      if (parcel.recipientEmail) {
        await Notification.create({
          parcelId:       parcel.id,
          recipientEmail: parcel.recipientEmail,
          channel:        NOTIF_CHANNEL.EMAIL,
          type:           NOTIF_TYPE.STATUS_UPDATE,
          status:         NOTIF_STATUS.PENDING,
        }, { transaction: t })
      }
    })

    // Envoi des emails après la transaction
    // 1. Envoyer à l'expéditeur
    try {
      await sendStatusEmail({
        to: parcel.sender.email,
        parcelCode: parcel.qrcode,
        status: nextStatus,
        recipientName: parcel.recipientName,
        senderName: parcel.sender.name,
        notes: notes || '',
        date: new Date(),
      })
      await Notification.update(
        { status: NOTIF_STATUS.SENT, sentAt: new Date() },
        { where: { parcelId: parcel.id, userId: parcel.senderId, type: NOTIF_TYPE.STATUS_UPDATE } }
      )
    } catch (emailErr) {
      await Notification.update(
        { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
        { where: { parcelId: parcel.id, userId: parcel.senderId, type: NOTIF_TYPE.STATUS_UPDATE } }
      )
    }

    // 2. Envoyer au destinataire si email renseigné
    if (parcel.recipientEmail) {
      try {
        await sendStatusEmail({
          to: parcel.recipientEmail,
          parcelCode: parcel.qrcode,
          status: nextStatus,
          recipientName: parcel.recipientName,
          senderName: parcel.sender.name,
          notes: notes || '',
          date: new Date(),
        })
        await Notification.update(
          { status: NOTIF_STATUS.SENT, sentAt: new Date() },
          { where: { parcelId: parcel.id, recipientEmail: parcel.recipientEmail, type: NOTIF_TYPE.STATUS_UPDATE } }
        )
      } catch (emailErr) {
        await Notification.update(
          { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
          { where: { parcelId: parcel.id, recipientEmail: parcel.recipientEmail, type: NOTIF_TYPE.STATUS_UPDATE } }
        )
      }
    }

    res.json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) {
    next(err)
  }
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

// ─── DELETE /api/parcels/:id ─────────────────────────
const deleteParcel = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByPk(req.params.id)
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })
    if (parcel.status === PARCEL_STATUS.COLLECTED) {
      return res.status(400).json({ message: 'Impossible de supprimer un colis déjà collecté.' })
    }
    
    await parcel.destroy()
    res.json({ message: 'Colis supprimé avec succès.' })
  } catch (err) { next(err) }
}

// ─── PUT /api/parcels/:id ─────────────────────────────
const update = async (req, res, next) => {
  try {
    const { description, weight, recipientName, recipientEmail, recipientPhone } = req.body
    
    const parcel = await Parcel.findByPk(req.params.id)
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })
    if (parcel.status === PARCEL_STATUS.COLLECTED) {
      return res.status(400).json({ message: 'Impossible de modifier un colis déjà collecté.' })
    }
    
    await parcel.update({
      description,
      weight,
      recipientName,
      recipientEmail,
      recipientPhone
    })

    res.json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) {
    next(err)
  }
}


module.exports = { getAll, trackByQRCode, getById, create, updateStatus, getQRCode, deleteParcel, update }