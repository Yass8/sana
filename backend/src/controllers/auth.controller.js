// src/controllers/auth.controller.js
const jwt        = require('jsonwebtoken')
const { User }   = require('../models')
const { ROLES }  = require('../constants')
const { sendResetEmail } = require('../services/email.service')
const { Op } = require('sequelize')

// Génère un JWT signé
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  )
}

// ─── POST /api/auth/register ──────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe trop court (6 caractères min).' })
    }

    const existing = await User.findOne({ where: { email } })
    if (existing) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' })
    }

    const user = await User.create({
      name,
      email,
      phone:        phone ?? null,
      passwordHash: password,   // le hook beforeCreate hash automatiquement
      role:         ROLES.CLIENT,
    })

    const token = generateToken(user)

    return res.status(201).json({
      message: 'Compte créé avec succès.',
      token,
      user: user.toSafeJSON(),
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/auth/login ─────────────────────────────
const login = async (req, res, next) => {
  try {
  
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' })
    }

    // On inclut passwordHash avec le scope withPassword
    const user = await User.scope('withPassword').findOne({ where: { email } })

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Compte désactivé. Contactez un administrateur.' })
    }

    const valid = await user.checkPassword(password)
    if (!valid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
    }

    const token = generateToken(user)

    return res.json({
      token,
      user: user.toSafeJSON(),
    })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/auth/me ─────────────────────────────────
const me = async (req, res, next) => {
  try {
    // req.user est déjà attaché par le middleware authenticate
    const user = await User.findByPk(req.user.id, {
      include: [{ association: 'agency', attributes: ['id', 'name', 'city', 'country'] }],
    })
    return res.json(user.toSafeJSON())
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/auth/logout ────────────────────────────
// Côté serveur on ne fait rien (JWT stateless)
// Le client supprime simplement le token en local
const logout = (req, res) => {
  res.json({ message: 'Déconnecté avec succès.' })
}

// ─── POST /api/auth/forgot-password ─────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ where: { email }})

    // Réponse identique même si l'email n'existe pas (évite l'énumération)
    if (!user) {
      return res.json({message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' })
    }
    // Générer un token de réinitialisation (ex: UUID ou JWT avec courte durée)
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Stocker le token et sa date d'expiration dans la base de données
    user.reset_password_token = resetToken
    user.reset_password_expires = new Date(Date.now() + 3600000) // 1 heure
    await user.save()

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`
    
    await sendResetEmail({
      to: email,
      name: user.name,
      resetUrl,
    })
    
    return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' })
  } catch (err){
    next(err)
  }
}

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe trop court (6 caractères min).' })
    }

    // Vérifier le token et trouver l'utilisateur correspondant
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' })
    }

    const user = await User.findOne({
      where: {
        id: decoded.id,
        reset_password_token: token,
        reset_password_expires: { [Op.gt]: new Date() },
      }
    })

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' })
    }

    // Mettre à jour le mot de passe et supprimer le token de réinitialisation
    user.passwordHash = password // le hook beforeUpdate hash automatiquement
    user.reset_password_token = null
    user.reset_password_expires = null
    await user.save()

    return res.json({ message: 'Mot de passe réinitialisé avec succès.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login, me, logout, forgotPassword, resetPassword }