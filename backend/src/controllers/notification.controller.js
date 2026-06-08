// src/controllers/notification.controller.js
const { Notification, Parcel, User } = require('../models')
const { NOTIF_STATUS, NOTIF_CHANNEL,
        NOTIF_TYPE }                 = require('../constants')
const { Op }                         = require('sequelize')
const { sendBulkAlertEmail, sendStatusEmail, sendBulkCustomEmail } = require('../services/email.service')

const getAll = async (req, res, next) => {
  try {
    const { status, channel, search } = req.query
    const where = {}
    if (status)  where.status  = status
    if (channel) where.channel = channel
    if (search)  where[Op.or]  = [
      { recipientEmail: { [Op.like]: `%${search}%` } },
    ]

    const notifications = await Notification.findAll({
      where,
      include: [
        { association: 'parcel', attributes: ['id','qrcode'] },
        { association: 'user',   attributes: ['id','name']    },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    })
    res.json(notifications)
  } catch (err) { next(err) }
}

const retry = async (req, res, next) => {
  try {
    const notif = await Notification.findByPk(req.params.id, {
      include: [{ association: 'parcel', attributes: ['id','qrcode','recipientName','senderId'] }]
    })
    if (!notif) return res.status(404).json({ message: 'Notification introuvable.' })
    if (notif.status !== NOTIF_STATUS.FAILED) {
      return res.status(400).json({ message: 'Seules les notifications échouées peuvent être relancées.' })
    }

    // Récupérer les infos supplémentaires nécessaires
    const parcel = notif.parcel
    if (!parcel) return res.status(400).json({ message: 'Colis associé introuvable.' })

    // Déterminer le type et le destinataire
    let emailSent = false
    if (notif.type === NOTIF_TYPE.STATUS_UPDATE) {
      // Récupérer l'expéditeur si nécessaire
      const sender = await User.findByPk(parcel.senderId, { attributes: ['name', 'email'] })
      const to = notif.userId ? sender.email : notif.recipientEmail
      if (!to) throw new Error('Aucun destinataire valide')

      await sendStatusEmail({
        to,
        parcelCode: parcel.qrcode,
        status: parcel.status, // statut actuel du colis (peut être différent de celui de la notification)
        recipientName: parcel.recipientName,
        senderName: sender.name,
        notes: '',
        date: new Date(),
      })
      emailSent = true
    } else if (notif.type === NOTIF_TYPE.BULK_ALERT) {
      const to = notif.userId ? (await User.findByPk(notif.userId)).email : notif.recipientEmail
      if (!to) throw new Error('Aucun destinataire valide')

      await sendBulkAlertEmail({
        to,
        parcelCode: parcel.qrcode,
        message: 'Message d’alerte (relance)',
        senderName: (await User.findByPk(parcel.senderId)).name,
        recipientName: parcel.recipientName,
        date: new Date(),
      })
      emailSent = true
    }

    if (emailSent) {
      await notif.update({ status: NOTIF_STATUS.SENT, sentAt: new Date(), errorMessage: null })
    } else {
      throw new Error('Type de notification non supporté')
    }

    res.json(notif)
  } catch (err) {
    // Mettre à jour la notification avec l'erreur
    await notif.update({ errorMessage: err.message })
    next(err)
  }
}

const bulk = async (req, res, next) => {
  try {
    const { userIds, channel, message } = req.body
    if (!userIds?.length || !channel || !message) {
      return res.status(400).json({ message: 'userIds, channel et message requis.' })
    }

    const users = await User.findAll({ where: { id: userIds } })
    const parcels = await Parcel.findAll({ where: { senderId: userIds } })

    const notifications = []
    for (const parcel of parcels) {
      const user = users.find(u => u.id === parcel.senderId)
      if (!user) continue
      if (channel === NOTIF_CHANNEL.EMAIL && user.email) {
        notifications.push({
          parcelId: parcel.id, userId: user.id,
          recipientEmail: user.email,
          channel: NOTIF_CHANNEL.EMAIL,
          type: NOTIF_TYPE.BULK_ALERT,
          status: NOTIF_STATUS.SENT,
          sentAt: new Date(),
        })
      }
    }

    await Notification.bulkCreate(notifications)
    res.json({ message: `${notifications.length} notification(s) envoyée(s).` })
  } catch (err) { next(err) }
}

const sendBulk = async (req, res, next) => {
  try {
    const { userIds, channel, message } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Liste des destinataires requise.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message requis.' });
    }

    // Récupérer les utilisateurs (clients uniquement pour l'instant)
    const users = await User.findAll({
      where: { id: userIds, role: 'client', isActive: true },
      attributes: ['id', 'name', 'email'],
    });

    if (users.length === 0) {
      return res.status(404).json({ message: 'Aucun client trouvé parmi les IDs fournis.' });
    }

    const errors = [];
    let successCount = 0;

    for (const user of users) {
      if (channel === 'email' || channel === 'both') {
        try {
          await sendBulkCustomEmail({
            to: user.email,
            name: user.name,
            message: message,
          });
          successCount++;
        } catch (err) {
          console.error(`Erreur envoi à ${user.email}:`, err);
          errors.push({ email: user.email, error: err.message });
        }
      }
      // SMS à implémenter plus tard
    }

    res.json({
      message: `${successCount} email(s) envoyé(s) sur ${users.length} destinataire(s).`,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    next(err);
  }
};


module.exports = { getAll, retry, bulk, sendBulk }