// src/controllers/parcel.controller.js
const { Parcel, Bag, TrackingEvent,
        Notification, User, Agency, sequelize } = require('../models')
const { PARCEL_STATUS, NOTIF_TYPE,
        NOTIF_CHANNEL, NOTIF_STATUS,
        ROLES, canTransition } = require('../constants')
const { generateQRCode, deleteQRCode } = require('../services/qrcode.service')
const { Op } = require('sequelize')
const { generateCode } = require('../services/codeGenerator.service')
const { sendStatusEmail } = require('../services/email.service');


// IDs des agences fixes (à remplacer si besoin)
const DEFAULT_ORIGIN_AGENCY_ID = '69ab1a3a-0989-485b-851b-a7430a6e38e0';
const DEFAULT_DESTINATION_AGENCY_ID = 'bf0ff001-79b5-4aef-bcce-3038aac4165b';

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
    if (bagId !== undefined) {
      where.bagId = bagId === 'null' ? null : bagId;
    }
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
    const { bagId, senderId, recipientName, recipientPhone, description, weight } = req.body

    if (!senderId || !recipientName) {
      return res.status(400).json({ message: 'senderId et recipientName sont requis.' })
    }

    const sender = await User.findByPk(senderId, { attributes: ['id', 'name', 'email', 'phone'] })
    if (!sender) {
      return res.status(404).json({ message: 'Expéditeur introuvable.' })
    }

    let bag = null
    if (bagId) {
      bag = await Bag.findByPk(bagId)
      if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
      if (bag.status !== 'ouvert') {
        return res.status(400).json({ message: 'Ce sac est fermé. Impossible d’ajouter un colis.' })
      }
    }

    let parcel
    await sequelize.transaction(async (t) => {
      const qrcode = await generateCode('parcel')

      parcel = await Parcel.create({
        bagId: bagId || null,
        senderId,
        recipientName,
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

      await Notification.create({
        parcelId: parcel.id,
        userId: senderId,
        recipientEmail: sender.email,
        channel: NOTIF_CHANNEL.EMAIL,
        type: NOTIF_TYPE.STATUS_UPDATE,
        status: NOTIF_STATUS.PENDING,
      }, { transaction: t })

      if (bag) {
        const allParcels = await Parcel.findAll({
          where: { bagId },
          attributes: ['weight'],
          transaction: t,
        })
        const totalWeight = allParcels.reduce((sum, p) => {
          const w = p.weight ? parseFloat(p.weight) : 0
          return sum + w
        }, 0)
        await bag.update({ weight: totalWeight }, { transaction: t })
      }
    })
    // Génération QR code
    const qrcodeUrl = await generateQRCode(parcel.qrcode, 'parcel')
    await parcel.update({ qrcodeUrl })

    // Déterminer les agences d'origine et de destination pour l'email
    let originAgency = null
    let destinationAgency = null
    let bagCode = ""

    if (bag) {
      // Si le colis est dans un sac, on récupère les agences du sac
      const sac = await Bag.findByPk(bag.id, {
        include: [
          { association: 'originAgency', attributes: ['name','city','address','phone'] },
          { association: 'destinationAgency', attributes: ['name','city','address','phone'] },
        ]
      })
      originAgency = sac?.originAgency ?? null
      destinationAgency = sac?.destinationAgency ?? null
      bagCode = sac?.qrcode ?? null
    } else {
      // Colis individuel : on utilise les agences fixes
      const [origin, destination] = await Promise.all([
        Agency.findByPk(DEFAULT_ORIGIN_AGENCY_ID, { attributes: ['name','city','address','phone'] }),
        Agency.findByPk(DEFAULT_DESTINATION_AGENCY_ID, { attributes: ['name','city','address','phone'] })
      ])
      originAgency = origin
      destinationAgency = destination
    }

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
        origin: originAgency ? {
          city: originAgency.city,
          adresse: originAgency.address,
          phone: originAgency.phone
        } : null,
        destination: destinationAgency ? {
          city: destinationAgency.city,
          adresse: destinationAgency.address,
          phone: destinationAgency.phone
        } : null,
        colis: { weight: parcel.weight, description: parcel.description },
        bagCode: bagCode
      })

      await Notification.update(
        { status: NOTIF_STATUS.SENT, sentAt: new Date() },
        { where: { parcelId: parcel.id, userId: senderId, type: NOTIF_TYPE.STATUS_UPDATE } }
      )
    } catch (emailErr) {
      console.error('Erreur envoi email:', emailErr)
      await Notification.update(
        { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
        { where: { parcelId: parcel.id, userId: senderId, type: NOTIF_TYPE.STATUS_UPDATE } }
      )
    }

    res.status(201).json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) {
    next(err)
  }
}

// ─── PATCH /api/parcels/:id/status ────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { status, notes, location } = req.body

    const parcel = await Parcel.findByPk(req.params.id, {
      include: [
        { association: 'sender', attributes: ['id','name','email','phone'] },
      ],
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    let nextStatus

    if (parcel.bagId) {
      // Colis dans un sac : seules certaines transitions individuelles sont permises
      const isIssueReport = status === PARCEL_STATUS.ISSUE
      const isCollectionConfirm = status === PARCEL_STATUS.COLLECTED && 
                                  parcel.status === PARCEL_STATUS.ARRIVED_DESTINATION &&
                                  (req.user.role === ROLES.AGENT_AF || req.user.role === ROLES.ADMIN)
      
      if (!isIssueReport && !isCollectionConfirm) {
        return res.status(403).json({
          message: 'Les transitions de statut individuelles ne sont pas autorisées pour un colis en sac. Modifiez le statut via le sac (page Sacs).',
        })
      }
      nextStatus = isIssueReport ? PARCEL_STATUS.ISSUE : PARCEL_STATUS.COLLECTED
    } else {
      // Colis individuel : transitions autorisées
      const allowedTransitions = {
        [PARCEL_STATUS.RECEIVED]: [PARCEL_STATUS.DEPARTED_AIRPORT, PARCEL_STATUS.ISSUE],
        [PARCEL_STATUS.DEPARTED_AIRPORT]: [PARCEL_STATUS.ARRIVED_DESTINATION, PARCEL_STATUS.ISSUE],
        [PARCEL_STATUS.ARRIVED_DESTINATION]: [PARCEL_STATUS.COLLECTED, PARCEL_STATUS.ISSUE],
        [PARCEL_STATUS.COLLECTED]: [],
        [PARCEL_STATUS.ISSUE]: [],
      }
      const allowed = allowedTransitions[parcel.status] || []
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: `Transition non autorisée de ${parcel.status} à ${status}.` })
      }
      // Seuls les rôles autorisés peuvent confirmer le retrait
      if (status === PARCEL_STATUS.COLLECTED && !['agent_af', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Seul un agent AF ou admin peut confirmer le retrait.' })
      }
      nextStatus = status
    }

    // Transaction : mise à jour + événement + notification
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
        channel:        NOTIF_CHANNEL.EMAIL,
        type:           NOTIF_TYPE.STATUS_UPDATE,
        status:         NOTIF_STATUS.PENDING,
      }, { transaction: t })
    })

    // Envoi de l'email avec les agences appropriées
    let originAgency = null
    let destinationAgency = null

    if (!parcel.bagId) {
      // Colis individuel : agences fixes
      const [origin, destination] = await Promise.all([
        Agency.findByPk(DEFAULT_ORIGIN_AGENCY_ID, { attributes: ['name','city','address','phone'] }),
        Agency.findByPk(DEFAULT_DESTINATION_AGENCY_ID, { attributes: ['name','city','address','phone'] })
      ])
      originAgency = origin
      destinationAgency = destination
    } else {
      // Pour un colis en sac, on pourrait récupérer les agences du sac si besoin (pour l'email)
      // Ici on laisse null, l'email de collecte/issue n'en a pas forcément besoin
    }

    try {
      await sendStatusEmail({
        to: parcel.sender.email,
        parcelCode: parcel.qrcode,
        status: nextStatus,
        recipientName: parcel.recipientName,
        senderName: parcel.sender.name,
        notes: notes || '',
        date: new Date(),
        origin: originAgency ? {
          city: originAgency.city,
          adresse: originAgency.address,
          phone: originAgency.phone
        } : null,
        destination: destinationAgency ? {
          city: destinationAgency.city,
          adresse: destinationAgency.address,
          phone: destinationAgency.phone
        } : null,
        colis: { weight: parcel.weight, description: parcel.description }
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

    res.status(201).json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
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
    await deleteQRCode(parcel.qrcode)

    res.json({ message: 'Colis supprimé avec succès.' })
  } catch (err) { next(err) }
}

// ─── PUT /api/parcels/:id ─────────────────────────────
const update = async (req, res, next) => {
  try {
    const { description, weight, recipientName, recipientPhone } = req.body
    
    const parcel = await Parcel.findByPk(req.params.id)
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })
    if (parcel.status === PARCEL_STATUS.COLLECTED) {
      return res.status(400).json({ message: 'Impossible de modifier un colis déjà collecté.' })
    }
    
    await parcel.update({
      description,
      weight,
      recipientName,
      recipientPhone
    })

    res.json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) {
    next(err)
  }
}


module.exports = { getAll, trackByQRCode, getById, create, updateStatus, getQRCode, deleteParcel, update }