// src/controllers/agency.controller.js
const { Agency } = require('../models')

const getAll = async (req, res, next) => {
  try {
    const agencies = await Agency.findAll({
      order: [['name', 'ASC']],
    })
    res.json(agencies)
  } catch (err) { next(err) }
}

const getById = async (req, res, next) => {
  try {
    const agency = await Agency.findByPk(req.params.id, {
      include: [{ association: 'users', attributes: ['id', 'name', 'role'] }],
    })
    if (!agency) return res.status(404).json({ message: 'Agence introuvable.' })
    res.json(agency)
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const { name, country, city, address, phone, email } = req.body
    if (!name || !country || !city) {
      return res.status(400).json({ message: 'Nom, pays et ville requis.' })
    }
    const agency = await Agency.create({ name, country, city, address, phone, email })
    res.status(201).json(agency)
  } catch (err) { next(err) }
}

const update = async (req, res, next) => {
  try {
    const agency = await Agency.findByPk(req.params.id)
    if (!agency) return res.status(404).json({ message: 'Agence introuvable.' })
    await agency.update(req.body)
    res.json(agency)
  } catch (err) { next(err) }
}

module.exports = { getAll, getById, create, update }