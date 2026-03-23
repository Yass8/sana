// src/services/barcode.service.js
const QRCode = require('qrcode')
const path   = require('path')
const fs     = require('fs').promises

const STORAGE_DIR = path.join(__dirname, '../storage/barcodes')

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true })
}

/**
 * Génère un QR code PNG et le sauvegarde localement
 * Le QR code encode l'URL de suivi public — le client peut
 * scanner et accéder directement au suivi de son colis
 */
async function generateBarcode(code, type = 'parcel') {
  await ensureDir()

  const filename = `${code}.png`
  const filepath = path.join(STORAGE_DIR, filename)

  // Déjà généré
  try {
    await fs.access(filepath)
    return `/barcodes/${filename}`
  } catch {}

  // L'URL encodée dans le QR — pointe vers le suivi public
  const trackingUrl = type === 'parcel'
    ? `http://localhost:5173/track/${code}`
    : `http://localhost:5173/bags/${code}`

  await QRCode.toFile(filepath, trackingUrl, {
    width:            300,
    margin:           2,
    color: {
      dark:  '#0F1923',  // couleur du QR (noir profond)
      light: '#FFFFFF',  // fond blanc
    },
    errorCorrectionLevel: 'M', // 15% de récupération si endommagé
  })

  return `/barcodes/${filename}`
}

async function deleteBarcode(code) {
  const filepath = path.join(STORAGE_DIR, `${code}.png`)
  try { await fs.unlink(filepath) } catch {}
}

module.exports = { generateBarcode, deleteBarcode }