// src/controllers/dashboard.controller.js
const { Parcel, Bag, Notification, sequelize } = require('../models')
const { Op }                                   = require('sequelize')

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

module.exports = { getStats, getNotifStats }