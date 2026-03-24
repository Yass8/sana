// src/seeders/generateQRCodes.js
require('dotenv').config()
const { sequelize, Parcel, Bag } = require('../models')
const { generateQRCode }        = require('../services/qrcode.service')

async function run() {
  console.log('🔲 Génération des qr-codes...')

  const parcels = await Parcel.findAll()
  for (const parcel of parcels) {
    const url = await generateQRCode(parcel.qrcode, 'parcel')
    await parcel.update({ qrcodeUrl: url })
    console.log(`  ✅ ${parcel.qrcode} → ${url}`)
  }

  const bags = await Bag.findAll()
  for (const bag of bags) {
    const url = await generateQRCode(bag.qrcode, 'bag')
    await bag.update({ qrcodeUrl: url })
    console.log(`  ✅ ${bag.qrcode} → ${url}`)
  }

  console.log('✅ Tous les qr-codes générés !')
  await sequelize.close()
}

run().catch(console.error)