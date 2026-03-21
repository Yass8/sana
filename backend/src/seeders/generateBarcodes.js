// src/seeders/generateBarcodes.js
require('dotenv').config()
const { sequelize, Parcel, Bag } = require('../models')
const { generateBarcode }        = require('../services/barcode.service')

async function run() {
  console.log('🔲 Génération des codes-barres...')

  // Colis
  const parcels = await Parcel.findAll()
  for (const parcel of parcels) {
    const url = await generateBarcode(parcel.barcode, 'parcel')
    await parcel.update({ barcodeUrl: url })
    console.log(`  ✅ ${parcel.barcode} → ${url}`)
  }

  // Sacs
  const bags = await Bag.findAll()
  for (const bag of bags) {
    const url = await generateBarcode(bag.barcode, 'bag')
    console.log(`  ✅ ${bag.barcode} → ${url}`)
  }

  console.log('✅ Tous les codes-barres générés !')
  await sequelize.close()
}

run().catch(console.error)