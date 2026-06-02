// src/seeders/bags-seed.js
require('dotenv').config();
const { sequelize, Bag } = require('../models');
const { generateQRCode } = require('../services/qrcode.service');

// ⚠️ Remplacez ces UUID par les identifiants réels de vos agences
const ORIGIN_AGENCY_ID = 'cbc3eb22-54d3-4472-a809-20848fe305fb';
const DESTINATION_AGENCY_ID = 'e8bd1122-937e-47c6-b462-482521879366';

async function run() {
  console.log('🚀 Création de 10 sacs ouverts...');

  const bagsData = [];
  for (let i = 1; i <= 10; i++) {
    bagsData.push({
      qrcode: `BAG-OPEN-${String(i).padStart(3, '0')}`,
      weight: (Math.random() * 20 + 0.5).toFixed(2),
      originAgencyId: ORIGIN_AGENCY_ID,
      destinationAgencyId: DESTINATION_AGENCY_ID,
      departureDate: new Date().toISOString().split('T')[0],
      status: 'open',
    });
  }

  // individualHooks active le beforeCreate pour générer la référence automatique
  const bags = await Bag.bulkCreate(bagsData, { individualHooks: true });
  console.log(`✅ ${bags.length} sacs créés.`);

  // Génération des QR codes pour chaque sac
  console.log('🔲 Génération des QR codes...');
  for (const bag of bags) {
    const url = await generateQRCode(bag.qrcode, 'bag');
    await bag.update({ qrcodeUrl: url });
    console.log(`  ✅ ${bag.reference} (${bag.qrcode}) → ${url}`);
  }

  console.log('🎉 Terminé !');
  await sequelize.close();
}

run().catch((error) => {
  console.error('❌ Erreur lors du seeding :', error);
  process.exit(1);
});