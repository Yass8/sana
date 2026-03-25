// src/seeders/testEmails.js
require('dotenv').config()
const { sequelize, Parcel, User } = require('../models')
const { sendStatusEmail, sendBulkAlertEmail } = require('../services/email.service')

// Liste des statuts à tester
const STATUSES_TO_TEST = [
  'received',
  'departed_agency',
  'departed_airport',
  'arrived_destination',
  'collected',
  'issue'
]

async function testEmails() {
  console.log('📧 Test d’envoi d’emails...\n')

  // Récupérer tous les colis avec leurs expéditeurs
  const parcels = await Parcel.findAll({
    include: [{ association: 'sender', attributes: ['id', 'name', 'email'] }],
    where: {
      // On filtre pour n'utiliser que ceux qui ont au moins un email valide
      [require('sequelize').Op.or]: [
        { '$sender.email$': { [require('sequelize').Op.ne]: null } },
        { recipientEmail: { [require('sequelize').Op.ne]: null } }
      ]
    }
  })

  if (parcels.length === 0) {
    console.log('⚠️ Aucun colis avec email trouvé. Lance d’abord le seeder testData.')
    process.exit(0)
  }

  let successCount = 0
  let failCount = 0

  for (const parcel of parcels) {
    console.log(`\n🚚 Traitement du colis ${parcel.qrcode}`)

    // --- Tests des emails de changement de statut ---
    for (const status of STATUSES_TO_TEST) {
      // Envoyer à l'expéditeur s'il a un email
      if (parcel.sender?.email) {
        try {
          await sendStatusEmail({
            to: parcel.sender.email,
            parcelCode: parcel.qrcode,
            status: status,
            recipientName: parcel.recipientName,
            senderName: parcel.sender.name,
            notes: `Email de test pour le statut "${status}".`,
            date: new Date()
          })
          console.log(`  ✅ Email statut "${status}" envoyé à expéditeur ${parcel.sender.email}`)
          successCount++
        } catch (err) {
          console.error(`  ❌ Échec envoi à expéditeur ${parcel.sender.email} : ${err.message}`)
          failCount++
        }
      }

      // Envoyer au destinataire s'il a un email
      if (parcel.recipientEmail) {
        try {
          await sendStatusEmail({
            to: parcel.recipientEmail,
            parcelCode: parcel.qrcode,
            status: status,
            recipientName: parcel.recipientName,
            senderName: parcel.sender?.name || 'Expéditeur',
            notes: `Email de test pour le statut "${status}".`,
            date: new Date()
          })
          console.log(`  ✅ Email statut "${status}" envoyé à destinataire ${parcel.recipientEmail}`)
          successCount++
        } catch (err) {
          console.error(`  ❌ Échec envoi à destinataire ${parcel.recipientEmail} : ${err.message}`)
          failCount++
        }
      }
    }

    // --- Test des alertes groupées ---
    if (parcel.sender?.email) {
      try {
        await sendBulkAlertEmail({
          to: parcel.sender.email,
          parcelCode: parcel.qrcode,
          message: 'Ceci est un message d’alerte groupée de test.',
          senderName: parcel.sender.name,
          recipientName: parcel.recipientName,
          date: new Date()
        })
        console.log(`  ✅ Alerte groupée envoyée à expéditeur ${parcel.sender.email}`)
        successCount++
      } catch (err) {
        console.error(`  ❌ Échec alerte groupée expéditeur ${parcel.sender.email} : ${err.message}`)
        failCount++
      }
    }

    if (parcel.recipientEmail) {
      try {
        await sendBulkAlertEmail({
          to: parcel.recipientEmail,
          parcelCode: parcel.qrcode,
          message: 'Ceci est un message d’alerte groupée de test.',
          senderName: parcel.sender?.name || 'Expéditeur',
          recipientName: parcel.recipientName,
          date: new Date()
        })
        console.log(`  ✅ Alerte groupée envoyée à destinataire ${parcel.recipientEmail}`)
        successCount++
      } catch (err) {
        console.error(`  ❌ Échec alerte groupée destinataire ${parcel.recipientEmail} : ${err.message}`)
        failCount++
      }
    }
  }

  console.log(`\n📊 Résumé : ${successCount} succès, ${failCount} échecs`)
  await sequelize.close()
}

testEmails().catch(err => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})