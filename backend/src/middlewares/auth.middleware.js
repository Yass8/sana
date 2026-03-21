// src/middlewares/auth.middleware.js
const jwt        = require('jsonwebtoken')
const { User }   = require('../models')

// Vérifie le JWT et attache user à req
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant.' })
    }

    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findByPk(decoded.id)
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Utilisateur introuvable ou inactif.' })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré.' })
    }
    return res.status(401).json({ message: 'Token invalide.' })
  }
}

// Vérifie que l'utilisateur a l'un des rôles autorisés
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Accès refusé. Rôles autorisés : ${roles.join(', ')}.`,
    })
  }
  next()
}

module.exports = { authenticate, authorize }