const { sequelize } = require('../models')
const crypto = require('crypto')

/**
 * Génère un code unique pour un sac ou un colis
 * Format :
 * - bag   : SA + 5 chiffres (ex: SA12345)
 * - parcel: CL + 5 chiffres (ex: CL67890)
 *
 * La partie numérique est construite à partir de l'horodatage actuel
 * (millisecondes) mélangé à un aléa, garantissant une quasi-unicité.
 * En cas de collision improbable, on retente jusqu'à 3 fois.
 */
async function generateCode(type, maxRetries = 3) {
  const prefix = type === 'bag' ? 'SA' : 'CL'
  const model = type === 'bag' ? sequelize.models.Bag : sequelize.models.Parcel

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 1. Générer une base unique : timestamp + random
    const timestamp = Date.now() // millisecondes
    const randomPart = crypto.randomInt(1000, 9999) // 4 chiffres aléatoires
    const combined = timestamp * 10000 + randomPart // ~ 17 chiffres

    // 2. Extraire les 5 derniers chiffres (ou utiliser un hash court)
    const numeric = (combined % 100000).toString().padStart(5, '0')
    const code = `${prefix}${numeric}`

    // 3. Vérifier si ce code existe déjà en base (contrainte unique)
    const existing = await model.findOne({ where: { qrcode: code } })
    if (!existing) {
      return code // unique, on le retourne
    }
    // Sinon, on retente (probabilité infime)
  }
  // En dernier recours, on ajoute un suffixe aléatoire supplémentaire
  const fallback = `${prefix}${crypto.randomInt(100000, 999999)}`
  return fallback
}

module.exports = { generateCode }