// src/controllers/shipment.controller.js
const { Shipment, Bag, Parcel, Agency, User } = require('../models')
const { ROLES, SHIPMENT_STATUS }              = require('../constants')

const INCLUDE_FULL = [
  { association: 'originAgency',      attributes: ['id','name','city','country'] },
  { association: 'destinationAgency', attributes: ['id','name','city','country'] },
  { association: 'creator',           attributes: ['id','name'] },
  { association: 'bags', include: [{ association: 'parcels', attributes: ['id','qrcode','status'] }] },
]

const getAll = async (req, res, next) => {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = status

    const shipments = await Shipment.findAll({
      where,
      include: [
        { association: 'originAgency',      attributes: ['id','name','city','country'] },
        { association: 'destinationAgency', attributes: ['id','name','city','country'] },
      ],
      order: [['createdAt', 'DESC']],
    })
    res.json(shipments)
  } catch (err) { next(err) }
}

const getById = async (req, res, next) => {
  try {
    const shipment = await Shipment.findByPk(req.params.id, { include: INCLUDE_FULL })
    if (!shipment) return res.status(404).json({ message: 'Envoi introuvable.' })
    res.json(shipment)
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const { originAgencyId, destinationAgencyId, departureDate, notes } = req.body

    if (!originAgencyId || !destinationAgencyId || !departureDate) {
      return res.status(400).json({ message: 'Agences et date de départ requis.' })
    }

    const [origin, destination] = await Promise.all([
      Agency.findByPk(originAgencyId),
      Agency.findByPk(destinationAgencyId),
    ])
    if (!origin)      return res.status(404).json({ message: 'Agence d\'origine introuvable.' })
    if (!destination) return res.status(404).json({ message: 'Agence de destination introuvable.' })

    const shipment = await Shipment.create({
      originAgencyId,
      destinationAgencyId,
      departureDate,
      notes:     notes ?? null,
      createdBy: req.user.id,
    })

    res.status(201).json(await Shipment.findByPk(shipment.id, { include: INCLUDE_FULL }))
  } catch (err) { next(err) }
}

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const validStatuses = Object.values(SHIPMENT_STATUS)

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Statut invalide. Valeurs : ${validStatuses.join(', ')}` })
    }

    const shipment = await Shipment.findByPk(req.params.id, { include: [{ association: 'bags' }] })
    if (!shipment) return res.status(404).json({ message: 'Envoi introuvable.' })

    // Mise à jour en cascade sur les sacs
    const bagStatus = status === SHIPMENT_STATUS.IN_TRANSIT ? 'in_transit'
                    : status === SHIPMENT_STATUS.ARRIVED    ? 'arrived'
                    : null

    await shipment.update({
      status,
      arrivalDate: status === SHIPMENT_STATUS.ARRIVED ? new Date() : shipment.arrivalDate,
    })

    if (bagStatus) {
      await Bag.update({ status: bagStatus }, {
        where: { shipmentId: shipment.id },
      })
    }

    res.json(await Shipment.findByPk(shipment.id, { include: INCLUDE_FULL }))
  } catch (err) { next(err) }
}

module.exports = { getAll, getById, create, updateStatus }