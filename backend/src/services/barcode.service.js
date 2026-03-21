// src/services/barcode.service.js
const bwipjs = require('bwip-js')
const path   = require('path')
const fs     = require('fs').promises

const STORAGE_DIR = path.join(__dirname, '../storage/barcodes')

// Assure que le dossier existe
async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true })
}

/**
 * Génère un PNG code-barres et le sauvegarde localement
 * @param {string} code  — ex: COL-2026-00001
 * @param {string} type  — 'parcel' | 'bag'
 * @returns {string}     — chemin relatif accessible via /barcodes/xxx.png
 */
async function generateBarcode(code, type = 'parcel') {
  await ensureDir()

  const filename = `${code}.png`
  const filepath = path.join(STORAGE_DIR, filename)

  // Vérifie si déjà généré
  try {
    await fs.access(filepath)
    return `/barcodes/${filename}`  // déjà existant
  } catch {
    // n'existe pas encore → on le génère
  }

  // Génère le PNG avec bwip-js
  const png = await bwipjs.toBuffer({
    bcid:        'code128',     // type de code-barres
    text:        code,          // valeur encodée
    scale:       2,             // facteur d'échelle
    height:      12,            // hauteur en mm
    includetext: true,          // affiche le texte sous le code
    textxalign:  'center',
    backgroundcolor: 'ffffff',  // fond blanc
  })

  await fs.writeFile(filepath, png)

  return `/barcodes/${filename}`
}

/**
 * Supprime un code-barres du stockage
 */
async function deleteBarcode(code) {
  const filepath = path.join(STORAGE_DIR, `${code}.png`)
  try {
    await fs.unlink(filepath)
  } catch {
    // Fichier inexistant — pas grave
  }
}

/**
 * Retourne le buffer PNG d'un code-barres (pour l'afficher en base64)
 */
async function getBarcodeBuffer(code) {
  const filepath = path.join(STORAGE_DIR, `${code}.png`)
  try {
    return await fs.readFile(filepath)
  } catch {
    return null
  }
}

module.exports = { generateBarcode, deleteBarcode, getBarcodeBuffer }