// src/server.js
require('dotenv').config()
const app           = require('./app')
const { sequelize } = require('./models')

const PORT = process.env.PORT ?? 3000

// Initialisation de la base de données
async function initDB() {
  try {
    await sequelize.authenticate()
    console.log('✅ Connexion DB OK')

    // force: false = crée les tables si elles n'existent pas
    await sequelize.sync({ force: false })
    console.log('✅ Tables synchronisées')
  } catch (err) {
    console.error('❌ Erreur initialisation DB :', err)
  }
}

// On lance la connexion (Vercel l'exécutera au démarrage de la fonction)
initDB()

// ⚠️ IMPORTANT : On ne lance app.listen QUE si on est en local (pas sur Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur tourne au port ${PORT}`)
  })
}

// ⚠️ TRÈS IMPORTANT POUR VERCEL : On exporte l'application Express
module.exports = app