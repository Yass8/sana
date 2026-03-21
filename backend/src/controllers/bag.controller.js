// src/controllers/bag.controller.js
const { Bag, Parcel, Shipment, Notification } = require('../models')
const { BAG_STATUS, NOTIF_TYPE,
        NOTIF_CHANNEL, NOTIF_STATUS } = require('../constants')

const INCLUDE_FULL = [
  {
    association: 'shipment',
    include: [
      { association: 'originAgency',      attributes: ['id','name','city'] },
      { association: 'destinationAgency', attributes: ['id','name','city'] },
    ],
  },
  {
    association: 'parcels',
    include: [{ association: 'sender', attributes: ['id','name','email','phone'] }],
  },
]

const getAll = async (req, res, next) => {
  try {
    const { status, shipmentId } = req.query
    const where = {}
    if (status)     where.status     = status
    if (shipmentId) where.shipmentId = shipmentId

    const bags = await Bag.findAll({
      where,
      include: [{
        association: 'shipment',
        include: [
          { association: 'originAgency',      attributes: ['id','name','city'] },
          { association: 'destinationAgency', attributes: ['id','name','city'] },
        ],
      }],
      order: [['createdAt', 'DESC']],
    })
    res.json(bags)
  } catch (err) { next(err) }
}

const getById = async (req, res, next) => {
  try {
    const bag = await Bag.findByPk(req.params.id, { include: INCLUDE_FULL })
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
    res.json(bag)
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const { shipmentId } = req.body
    if (!shipmentId) return res.status(400).json({ message: 'shipmentId requis.' })

    const shipment = await Shipment.findByPk(shipmentId)
    if (!shipment) return res.status(404).json({ message: 'Envoi introuvable.' })
    if (shipment.status !== 'preparing') {
      return res.status(400).json({ message: 'L\'envoi n\'est plus en préparation.' })
    }

    const bag = await Bag.create({ shipmentId })
    res.status(201).json(await Bag.findByPk(bag.id, { include: INCLUDE_FULL }))
  } catch (err) { next(err) }
}

const close = async (req, res, next) => {
  try {
    const bag = await Bag.findByPk(req.params.id)
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
    if (bag.status !== BAG_STATUS.OPEN) {
      return res.status(400).json({ message: 'Ce sac est déjà fermé.' })
    }
    await bag.update({ status: BAG_STATUS.CLOSED })
    res.json(bag)
  } catch (err) { next(err) }
}

// Envoi groupé à tous les clients du sac
const sendAlert = async (req, res, next) => {
  try {
    const { message } = req.body
    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message requis.' })
    }

    const bag = await Bag.findByPk(req.params.id, {
      include: [{
        association: 'parcels',
        include: [{ association: 'sender', attributes: ['id','name','email','phone'] }],
      }],
    })
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })

    // Crée une notification pending pour chaque colis
    const notifications = []
    for (const parcel of bag.parcels) {
      if (parcel.sender?.email) {
        notifications.push({
          parcelId:       parcel.id,
          userId:         parcel.sender.id,
          recipientEmail: parcel.sender.email,
          channel:        NOTIF_CHANNEL.EMAIL,
          type:           NOTIF_TYPE.BULK_ALERT,
          status:         NOTIF_STATUS.PENDING,
        })
      }
      if (parcel.recipientPhone) {
        notifications.push({
          parcelId:       parcel.id,
          recipientPhone: parcel.recipientPhone,
          channel:        NOTIF_CHANNEL.SMS,
          type:           NOTIF_TYPE.BULK_ALERT,
          status:         NOTIF_STATUS.PENDING,
        })
      }
    }

    await Notification.bulkCreate(notifications)

    // TODO: déclencher BullMQ quand on l'intégrera
    // Pour l'instant on marque directement comme sent
    await Notification.update(
      { status: NOTIF_STATUS.SENT, sentAt: new Date() },
      { where: { status: NOTIF_STATUS.PENDING, type: NOTIF_TYPE.BULK_ALERT } }
    )

    res.json({ message: `Alerte envoyée à ${notifications.length} destinataire(s).` })
  } catch (err) { next(err) }
}

module.exports = { getAll, getById, create, close, sendAlert }