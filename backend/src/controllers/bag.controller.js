// src/controllers/bag.controller.js
const { Bag, Parcel, Shipment, Notification } = require('../models')
const { BAG_STATUS, NOTIF_TYPE,
        NOTIF_CHANNEL, NOTIF_STATUS } = require('../constants')
const { generateCode } = require('../services/codeGenerator.service')
const { generateQRCode } = require('../services/qrcode.service')
const { sendBulkAlertEmail } = require('../services/email.service')

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

    // Génération du code unique
    const qrcode = await generateCode('bag')

    // Création du sac
    const bag = await Bag.create({ shipmentId, qrcode })

    // Génération du QR code (image)
    const qrCodeUrl = await generateQRCode(bag.qrcode, 'bag')
    await bag.update({ qrCodeUrl })

    const createdBag = await Bag.findByPk(bag.id, { include: INCLUDE_FULL })
    res.status(201).json(createdBag)
  } catch (err) {
    next(err)
  }
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

    const notifications = []
    const errors = []

    // Pour chaque colis, envoyer les alertes
    for (const parcel of bag.parcels) {
      // Envoi à l'expéditeur si email
      if (parcel.sender?.email) {
        try {
          await sendBulkAlertEmail({
            to: parcel.sender.email,
            parcelCode: parcel.qrcode,
            message: message,
            senderName: parcel.sender.name,
            recipientName: parcel.recipientName,
            date: new Date(),
          })
          notifications.push({
            parcelId: parcel.id,
            userId: parcel.sender.id,
            recipientEmail: parcel.sender.email,
            channel: NOTIF_CHANNEL.EMAIL,
            type: NOTIF_TYPE.BULK_ALERT,
            status: NOTIF_STATUS.SENT,
            sentAt: new Date(),
          })
        } catch (err) {
          console.error(`Erreur envoi alerte à ${parcel.sender.email}:`, err)
          errors.push({ email: parcel.sender.email, error: err.message })
          notifications.push({
            parcelId: parcel.id,
            userId: parcel.sender.id,
            recipientEmail: parcel.sender.email,
            channel: NOTIF_CHANNEL.EMAIL,
            type: NOTIF_TYPE.BULK_ALERT,
            status: NOTIF_STATUS.FAILED,
            errorMessage: err.message,
          })
        }
      }

      // Envoi au destinataire si email
      if (parcel.recipientEmail) {
        try {
          await sendBulkAlertEmail({
            to: parcel.recipientEmail,
            parcelCode: parcel.qrcode,
            message: message,
            senderName: parcel.sender?.name || 'Expéditeur',
            recipientName: parcel.recipientName,
            date: new Date(),
          })
          notifications.push({
            parcelId: parcel.id,
            recipientEmail: parcel.recipientEmail,
            channel: NOTIF_CHANNEL.EMAIL,
            type: NOTIF_TYPE.BULK_ALERT,
            status: NOTIF_STATUS.SENT,
            sentAt: new Date(),
          })
        } catch (err) {
          console.error(`Erreur envoi alerte à ${parcel.recipientEmail}:`, err)
          errors.push({ email: parcel.recipientEmail, error: err.message })
          notifications.push({
            parcelId: parcel.id,
            recipientEmail: parcel.recipientEmail,
            channel: NOTIF_CHANNEL.EMAIL,
            type: NOTIF_TYPE.BULK_ALERT,
            status: NOTIF_STATUS.FAILED,
            errorMessage: err.message,
          })
        }
      }

      // SMS (à implémenter plus tard)
      // ...
    }

    // Sauvegarder toutes les notifications en base
    if (notifications.length) {
      await Notification.bulkCreate(notifications)
    }

    if (errors.length) {
      return res.status(207).json({
        message: `Alerte envoyée partiellement. ${notifications.length - errors.length} succès, ${errors.length} échecs.`,
        errors,
      })
    }

    res.json({ message: `Alerte envoyée à ${notifications.length} destinataire(s).` })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getById, create, close, sendAlert }