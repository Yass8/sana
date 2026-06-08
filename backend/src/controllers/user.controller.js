// src/controllers/user.controller.js
const { User, Agency } = require('../models')
const { ROLES }        = require('../constants')
    const { Op, Sequelize } = require('sequelize')
const { sendWelcomeEmail } = require('../services/email.service')

// ─── GET /api/users ───────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query
    const where = {}

    if (role)   where.role = role
    if (search) where[Op.or] = [
      { name:  { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ]

    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { count, rows } = await User.findAndCountAll({
      where,
      // Un seul tableau include
      include: [
        { association: 'agency', attributes: ['id', 'name', 'city'] }
      ],
      //Attribut virtuel : compte les colis liés à l’utilisateur
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT COUNT(*) 
              FROM parcels 
              WHERE parcels.sender_id = "User".id
            )`),
            'parcelsCount'  
          ]
        ]
      },
      order: [['name', 'ASC']],
      limit: parseInt(limit),
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
      attributes: {
        include: [
          [Sequelize.literal(`(
            SELECT COUNT(*) FROM parcels WHERE parcels.sender_id = "User".id
          )`), 'totalParcels'],
          [Sequelize.literal(`(
            SELECT COUNT(*) FROM parcels WHERE parcels.sender_id = "User".id AND parcels.status = 'received'
          )`), 'receivedParcels'],
          [Sequelize.literal(`(
            SELECT COUNT(*) FROM parcels WHERE parcels.sender_id = "User".id AND parcels.status = 'departed_airport'
          )`), 'departedParcels'],
          [Sequelize.literal(`(
            SELECT COUNT(*) FROM parcels WHERE parcels.sender_id = "User".id AND parcels.status = 'arrived_destination'
          )`), 'arrivedParcels'],
          [Sequelize.literal(`(
            SELECT COUNT(*) FROM parcels WHERE parcels.sender_id = "User".id AND parcels.status = 'collected'
          )`), 'collectedParcels'],
          [Sequelize.literal(`(
            SELECT COUNT(*) FROM parcels WHERE parcels.sender_id = "User".id AND parcels.status = 'issue'
          )`), 'issueParcels'],
        ]
      },
    })
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })
    res.json(user.toSafeJSON())   // les nouveaux champs seront automatiquement présents
  } catch (err) { next(err) }
}

// ─── POST /api/users ─────────────────────────────────
// Création d'un agent par l'admin
const create = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, agencyId, sendMail } = req.body

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Nom, email et rôle requis.' })
    }

    const alphaNum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    const finallyPassword = password || Array.from(
      { length: 6 },
      () => alphaNum[Math.floor(Math.random() * alphaNum.length)]
    ).join('')

    const validRoles = [ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN, ROLES.CLIENT]
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Rôle invalide. Valeurs : ${validRoles.join(', ')}` })
    }

    const existing = await User.findOne({ where: { email } })
    if (existing) return res.status(409).json({ message: 'Cet email est déjà utilisé.' })

    const user = await User.create({
      name, email, phone, role, agencyId: agencyId ?? null,
      passwordHash: finallyPassword,
    })

    res.status(201).json(user.toSafeJSON())

    if (sendMail) {
      try {
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          temporaryPassword: finallyPassword, // mot de passe en clair pour le mail de bienvenue
          loginUrl: `${process.env.APP_URL}/login`,
        })
      }
      catch (err) {
        console.error('Erreur envoi email de bienvenue:', err)
      }
    }

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
    const userId = req.params.id;
    const currentUser = req.user;
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

    // 1. Récupération de l'utilisateur
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }    

    // 2. Contrôles de sécurité et de validité
    if (user.email === superAdminEmail) {
      return res.status(400).json({ message: 'Impossible de supprimer le compte super admin.' });
    }

    if (user.id === currentUser.id) {
      return res.status(400).json({ message: 'Impossible de supprimer son propre compte.' });
    }

    // 3. Exécution de la suppression
    await user.destroy();

    return res.json({ message: 'Utilisateur supprimé définitivement.' });

  } catch (err) {
    next(err);
  }
};

// update password
const updatePassword = async (req, res, next) => {
  try {
    const user = await User.scope('withPassword').findByPk(req.params.id)
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })

    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis.' })
    }

    // Vérification du mot de passe actuel
    const isValid = await user.checkPassword(currentPassword)
    if (!isValid) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect.' })
    }

    // Vérification que le nouveau est différent
    const isSame = await user.checkPassword(newPassword)
    if (isSame) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit être différent de l\'ancien.' })
    }

    // Mise à jour (le hook beforeUpdate doit hasher)
    await user.update({ passwordHash: newPassword })

    res.json({ message: 'Mot de passe mis à jour.' })

  } catch (err) { next(err) }

}

    
    

module.exports = { getAll, getMe, getById, create, update, desactivate, deleteUser, updatePassword }