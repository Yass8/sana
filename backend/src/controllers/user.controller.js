// src/controllers/user.controller.js
const { User, Agency } = require('../models')
const { ROLES }        = require('../constants')

// ─── GET /api/users ───────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query
    const where  = {}
    const { Op } = require('sequelize')

    if (role)   where.role = role
    if (search) where[Op.or] = [
      { name:  { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ]

    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ association: 'agency', attributes: ['id', 'name', 'city'] }],
      order:   [['name', 'ASC']],
      limit:   parseInt(limit),
      offset,
    })

    res.json({ count, rows, page: parseInt(page), totalPages: Math.ceil(count / limit) })
  } catch (err) { next(err) }
}

// ─── GET /api/users/me ────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ association: 'agency', attributes: ['id', 'name', 'city', 'country'] }],
    })
    res.json(user.toSafeJSON())
  } catch (err) { next(err) }
}

// ─── GET /api/users/:id ───────────────────────────────
const getById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ association: 'agency', attributes: ['id', 'name', 'city'] }],
    })
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })
    res.json(user.toSafeJSON())
  } catch (err) { next(err) }
}

// ─── POST /api/users ─────────────────────────────────
// Création d'un agent par l'admin
const create = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, agencyId } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Nom, email, mot de passe et rôle requis.' })
    }

    const validRoles = [ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN, ROLES.CLIENT]
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Rôle invalide. Valeurs : ${validRoles.join(', ')}` })
    }

    const existing = await User.findOne({ where: { email } })
    if (existing) return res.status(409).json({ message: 'Cet email est déjà utilisé.' })

    const user = await User.create({
      name, email, phone, role, agencyId: agencyId ?? null,
      passwordHash: password,
    })

    res.status(201).json(user.toSafeJSON())
  } catch (err) { next(err) }
}

// ─── PATCH /api/users/:id ─────────────────────────────
const update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })

    const { name, phone, role, agencyId, isActive } = req.body
    await user.update({ name, phone, role, agencyId, isActive })

    res.json(user.toSafeJSON())
  } catch (err) { next(err) }
}

// ─── PATCH /api/users/:id/desactivate ─────────────────────────────
// Soft delete — on désactive seulement
const desactivate = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Impossible de désactiver son propre compte.' })
    }
    await user.update({ isActive: false })
    res.json({ message: 'Compte désactivé.' })
  } catch (err) { next(err) }
}

// ─── DELETE /api/users/:id ─────────────────────────────
// Suppression définitive — à utiliser avec précaution
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Impossible de supprimer son propre compte.' })
    }
    await user.destroy()
    res.json({ message: 'Utilisateur supprimé définitivement.' })
  } catch (err) { next(err) }
}

module.exports = { getAll, getMe, getById, create, update, desactivate, deleteUser }