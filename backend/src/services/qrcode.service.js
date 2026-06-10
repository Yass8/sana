// src/services/qrcode.service.js
const QRCode = require('qrcode')
const { createClient } = require('@supabase/supabase-js')

// Initialisation du client Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET_NAME = 'qrcodes'

/**
 * Génère un QR code PNG en mémoire et l'envoie sur Supabase Storage
 * Retourne l'URL publique de l'image
 */
async function generateQRCode(code, type = 'parcel') {
  const filename = `${code}.png`

  // Base URL du front (ajoute cette variable sur Vercel, ex: https://monfront.vercel.app)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  
  const trackingUrl = type === 'parcel'
    ? `${frontendUrl}/track/${code}`
    : `${frontendUrl}/bags/${code}`

  // 1. Générer le QR Code directement sous forme de Buffer (en mémoire)
  const qrCodeBuffer = await QRCode.toBuffer(trackingUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: '#0F1923',  // couleur du QR (noir profond)
      light: '#FFFFFF', // fond blanc
    },
    errorCorrectionLevel: 'H',
  })

  // 2. Uploader le buffer sur ton bucket Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, qrCodeBuffer, {
      contentType: 'image/png',
      upsert: true // Écrase l'image si elle existe déjà (évite les doublons)
    })

  if (error) {
    throw new Error(`Erreur lors de l'upload du QR Code sur Supabase : ${error.message}`)
  }

  // 3. Récupérer et retourner l'URL publique du fichier stocké
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filename)

  return publicUrlData.publicUrl
}

/**
 * Supprime le QR Code du bucket Supabase
 */
async function deleteQRCode(code) {
  const filename = `${code}.png`
  try {
    await supabase.storage.from(BUCKET_NAME).remove([filename])
  } catch (err) {
    console.error(`Impossible de supprimer le QR code ${filename} de Supabase`, err)
  }
}

module.exports = { generateQRCode, deleteQRCode }