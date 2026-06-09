// src/server.js
require('dotenv').config()

// 💡 L'ASTUCE POUR VERCEL : On force l'analyseur statique à inclure le driver Postgres
try {
  require('pg')
} catch (e) {
  // On ignore l'erreur si jamais on est dans un environnement sans pg
}

const app           = require('./app')
const { sequelize } = require('./models')

const PORT = process.env.PORT ?? 3000

// Initialisation de la base de données
async function initDB() {
  try {
    await sequelize.authenticate()
    console.log('✅ Connexion DB OK')
    // src/server.js
require('dotenv').config()

// 🔍 LIGNE DE DEBUG (À enlever plus tard pour la sécurité !)
console.log("🔍 Vérification JWT_SECRET sur Vercel :", process.env.JWT_SECRET ? "Présente (OK)" : "Absente (VIDE)")

// ... (le reste de ton code)
    // force: false = crée les tables si elles n'existent pas
    await sequelize.sync({ force: false })
    console.log('✅ Tables synchronisées')
  } catch (err) {
    console.error('❌ Erreur initialisation DB :', err)
  }
}

// On lance la connexion
initDB()

// On ne lance app.listen QUE si on est en local
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur tourne au port ${PORT}`)
  })
}

module.exports = app