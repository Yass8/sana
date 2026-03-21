// src/server.js
require('dotenv').config()
const app           = require('./app')
const { sequelize } = require('./models')

const PORT = process.env.PORT ?? 3000

async function start() {
  try {
    await sequelize.authenticate()
    console.log('✅ Connexion SQLite OK')

    // force: false = crée les tables si elles n'existent pas, ne touche pas aux existantes
    await sequelize.sync({ force: false })
    console.log('✅ Tables synchronisées')

    app.listen(PORT, () => {
      console.log(`🚀 http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('❌ Erreur démarrage :', err)
    process.exit(1)
  }
}

start()