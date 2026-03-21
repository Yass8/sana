// src/controllers/notification.controller.js
const { Notification, Parcel, User } = require('../models')
const { NOTIF_STATUS, NOTIF_CHANNEL,
        NOTIF_TYPE }                 = require('../constants')
const { Op }                         = require('sequelize')

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
        { association: 'parcel', attributes: ['id','barcode'] },
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
    const notif = await Notification.findByPk(req.params.id)
    if (!notif) return res.status(404).json({ message: 'Notification introuvable.' })
    if (notif.status !== NOTIF_STATUS.FAILED) {
      return res.status(400).json({ message: 'Seules les notifications échouées peuvent être relancées.' })
    }

    await notif.update({ status: NOTIF_STATUS.PENDING, errorMessage: null })

    // TODO: remettre dans la queue BullMQ
    // Pour l'instant on simule l'envoi
    await notif.update({ status: NOTIF_STATUS.SENT, sentAt: new Date() })

    res.json(notif)
  } catch (err) { next(err) }
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

module.exports = { getAll, retry, bulk }