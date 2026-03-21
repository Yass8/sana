// src/middlewares/errorHandler.js

// Middleware d'erreur global — à brancher en dernier dans app.js
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.message}`)

  // Erreur de validation Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Données invalides.',
      errors:  err.errors.map(e => ({ field: e.path, message: e.message })),
    })
  }

  // Contrainte unique violée (email déjà utilisé etc.)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: 'Cette valeur existe déjà.',
      field:   err.errors[0]?.path,
    })
  }

  // Erreur générique
  const status  = err.status ?? 500
  const message = err.status ? err.message : 'Erreur serveur interne.'
  res.status(status).json({ message })
}

module.exports = errorHandler