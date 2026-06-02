// src/controllers/bag.controller.js
const { Bag, Parcel, Agency, TrackingEvent, Notification, User, sequelize } = require('../models')
const { BAG_STATUS, PARCEL_STATUS, NOTIF_TYPE,
        NOTIF_CHANNEL, NOTIF_STATUS } = require('../constants')
const { generateCode } = require('../services/codeGenerator.service')
const { generateQRCode, deleteQRCode } = require('../services/qrcode.service')
const { sendStatusEmail, sendBulkAlertEmail } = require('../services/email.service')

const INCLUDE_FULL = [
  {
    association: 'originAgency',
    attributes: ['id','name','city'],
  },
  {
    association: 'destinationAgency',
    attributes: ['id','name','city'],
  },
  {
    association: 'parcels',
    include: [{ association: 'sender', attributes: ['id','name','email','phone'] }],
  },
]

const getAll = async (req, res, next) => {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = status

    const bags = await Bag.findAll({
      where,
      include: [
        { association: 'originAgency', attributes: ['id','name','city'] },
        { association: 'destinationAgency', attributes: ['id','name','city'] },
        { association: 'parcels', attributes: ['id'] },
      ],
      order: [['createdAt', 'DESC']],
    })

    // Ajoute manuellement _count.parcels pour que le front l'affiche
    const result = bags.map(bag => {
      const json = bag.toJSON()
      json.countColis = { parcels: bag.parcels?.length ?? 0 }
      return json
    })

    res.json(result)
  } catch (err) { next(err) }
}

const getById = async (req, res, next) => {
  try {
    const bag = await Bag.findByPk(req.params.id, { include: INCLUDE_FULL })
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
    res.json(bag)
  } catch (err) { next(err) }
}

const trackByQRCode = async (req, res, next) => {
  try {
    const bag = await Bag.findOne({
      where: { qrcode: req.params.qrcode },
      include: INCLUDE_FULL,
    })
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
    res.json(bag)
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const { originAgencyId, destinationAgencyId, departureDate, weight } = req.body;
    if (!originAgencyId || !destinationAgencyId) {
      return res.status(400).json({ message: 'originAgencyId et destinationAgencyId requis.' });
    }

    const originAgency = await Agency.findByPk(originAgencyId);
    const destinationAgency = await Agency.findByPk(destinationAgencyId);
    if (!originAgency || !destinationAgency) {
      return res.status(404).json({ message: 'Agence d\'origine ou de destination introuvable.' });
    }

    // Génération du code unique
    const qrcode = await generateCode('bag');

    // Création du sac – plus besoin de référence
    const bag = await Bag.create({
      originAgencyId,
      destinationAgencyId,
      departureDate,
      weight,
      qrcode,
    });

    // Génération du QR code (image)
    const qrcodeUrl = await generateQRCode(bag.qrcode, 'bag');
    await bag.update({ qrcodeUrl });

    const createdBag = await Bag.findByPk(bag.id, { include: INCLUDE_FULL });
    res.status(201).json(createdBag);
  } catch (err) {
    next(err);
  }
};

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

const updateStatus = async (req, res, next) => {
  try {
    const { action } = req.body
    const bag = await Bag.findByPk(req.params.id, {
      include: [
        { association: 'originAgency', attributes: ['name','city','address','phone'] },
        { association: 'destinationAgency',  attributes: ['name','city','address','phone']},
        { association: 'parcels', include: [{ association: 'sender' }] }],
    })
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })

    const actionToBagStatus = {
      airport: BAG_STATUS.IN_TRANSIT,
      destination: BAG_STATUS.ARRIVED,
      issue: BAG_STATUS.ISSUE,
    }

    const actionToParcelStatus = {
      airport: PARCEL_STATUS.DEPARTED_AIRPORT,
      destination: PARCEL_STATUS.ARRIVED_DESTINATION,
      issue: PARCEL_STATUS.ISSUE,
    }

    if (!action || !actionToBagStatus[action]) {
      return res.status(400).json({ message: 'Action invalide (airport|destination|issue).' })
    }

    if (action === 'airport' && bag.status !== BAG_STATUS.CLOSED) {
      return res.status(400).json({ message: 'Le sac doit être fermé avant de partir à l\'aéroport.' })
    }

    if (action === 'destination' && bag.status !== BAG_STATUS.IN_TRANSIT) {
      return res.status(400).json({ message: 'Le sac doit être en transit avant de confirmer l\'arrivée.' })
    }

    const targetBagStatus = actionToBagStatus[action]
    const targetParcelStatus = actionToParcelStatus[action]

    const updatableParcelStatus = {
      [PARCEL_STATUS.DEPARTED_AIRPORT]:    [PARCEL_STATUS.RECEIVED],
      [PARCEL_STATUS.ARRIVED_DESTINATION]: [PARCEL_STATUS.RECEIVED, PARCEL_STATUS.DEPARTED_AIRPORT],
      [PARCEL_STATUS.ISSUE]:               [PARCEL_STATUS.RECEIVED, PARCEL_STATUS.DEPARTED_AIRPORT, PARCEL_STATUS.ARRIVED_DESTINATION],
    }[targetParcelStatus] || []

    const eligibleParcels = bag.parcels.filter((p) => updatableParcelStatus.includes(p.status))

    // destination 
    const destinationName = bag.destinationAgency?.name || 'Destination inconnue'

    await Bag.sequelize.transaction(async (t) => {
      await bag.update({ status: targetBagStatus }, { transaction: t })

      for (const parcel of eligibleParcels) {
        await parcel.update({ status: targetParcelStatus }, { transaction: t })

        await TrackingEvent.create({
          parcelId:   parcel.id,
          agentId:    req.user.id,
          status:     targetParcelStatus,
          location:   null,
          notes:      `Mise à jour groupée via sac (${action}).`,
          occurredAt: new Date(),
        }, { transaction: t })

        const notifications = []

        if (parcel.sender?.email) {
          notifications.push({
            parcelId:       parcel.id,
            userId:         parcel.senderId,
            recipientEmail: parcel.sender.email,
            channel:        NOTIF_CHANNEL.EMAIL,
            type:           NOTIF_TYPE.STATUS_UPDATE,
            status:         NOTIF_STATUS.PENDING,
          })
        }

        if (parcel.recipientEmail) {
          notifications.push({
            parcelId:       parcel.id,
            recipientEmail: parcel.recipientEmail,
            channel:        NOTIF_CHANNEL.EMAIL,
            type:           NOTIF_TYPE.STATUS_UPDATE,
            status:         NOTIF_STATUS.PENDING,
          })
        }

        if (notifications.length) {
          await Notification.bulkCreate(notifications, { transaction: t })
        }
      }
    })

    // Envoi des emails (hors transaction)
    for (const parcel of eligibleParcels) {
      if (parcel.sender?.email) {
        try {
          await sendStatusEmail({
            to: parcel.sender.email,
            parcelCode: parcel.qrcode,
            status: targetParcelStatus,
            recipientName: parcel.recipientName,
            senderName: parcel.sender.name,
            notes: `Mise à jour via sac (${action}).`,
            date: new Date(),
            origin: bag.originAgency ? { city: bag.originAgency.city, address: bag.originAgency.address, phone: bag.originAgency.phone } : null,
            destination: bag.destinationAgency ? { city: bag.destinationAgency.city, address: bag.destinationAgency.address, phone: bag.destinationAgency.phone } : null,
            colis: { weight: parcel.weight, description: parcel.description }           
          })
          
          await Notification.update(
            { status: NOTIF_STATUS.SENT, sentAt: new Date() },
            {
              where: {
                parcelId: parcel.id,
                userId: parcel.senderId,
                type: NOTIF_TYPE.STATUS_UPDATE,
              },
            }
          )
        } catch (emailErr) {
          await Notification.update(
            { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
            {
              where: {
                parcelId: parcel.id,
                userId: parcel.senderId,
                type: NOTIF_TYPE.STATUS_UPDATE,
              },
            }
          )
        }
      }

      if (parcel.recipientEmail) {
        try {
          await sendStatusEmail({
            to: parcel.recipientEmail,
            parcelCode: parcel.qrcode,
            status: targetParcelStatus,
            recipientName: parcel.recipientName,
            senderName: parcel.sender?.name || 'Expéditeur',
            notes: `Mise à jour via sac (${action}).`,
            date: new Date(),
            origin: bag.originAgency ? { city: bag.originAgency.city, address: bag.originAgency.address, phone: bag.originAgency.phone } : null,
            destination: bag.destinationAgency ? { city: bag.destinationAgency.city, address: bag.destinationAgency.address, phone: bag.destinationAgency.phone } : null,
            colis: { weight: parcel.weight, description: parcel.description },
          })
          await Notification.update(
            { status: NOTIF_STATUS.SENT, sentAt: new Date() },
            {
              where: {
                parcelId: parcel.id,
                recipientEmail: parcel.recipientEmail,
                type: NOTIF_TYPE.STATUS_UPDATE,
              },
            }
          )
        } catch (emailErr) {
          await Notification.update(
            { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
            {
              where: {
                parcelId: parcel.id,
                recipientEmail: parcel.recipientEmail,
                type: NOTIF_TYPE.STATUS_UPDATE,
              },
            }
          )
        }
      }
    }

    const updatedBag = await Bag.findByPk(bag.id, {
      include: [
        { association: 'originAgency',      attributes: ['id','name','city'] },
        { association: 'destinationAgency', attributes: ['id','name','city'] },
        { association: 'parcels', include: [{ association: 'sender', attributes: ['id','name','email','phone'] }] },
      ],
    })

    res.json({ message: `${eligibleParcels.length} colis mis à jour en ${targetParcelStatus}.`, bag: updatedBag })
  } catch (err) {
    next(err)
  }
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

const deleteBag = async (req, res, next) => {
  try {
    const bag = await Bag.findByPk(req.params.id, {
      include: [{ association: 'parcels', attributes: ['qrcode'] }],
    })
    if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })

    const parcelQrcodes = bag.parcels?.map(p => p.qrcode) ?? []

    await sequelize.transaction(async (t) => {
      await Parcel.destroy({ where: { bagId: bag.id }, transaction: t })
      await bag.destroy({ transaction: t })
    })

    await deleteQRCode(bag.qrcode)
    if (parcelQrcodes.length > 0) {
      await Promise.all(parcelQrcodes.map(code => deleteQRCode(code)))
    }

    res.json({ message: 'Sac supprimé avec succès.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getById, create, close, updateStatus, sendAlert, trackByQRCode, deleteBag }