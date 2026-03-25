// backend/src/seeders/testData.js
require('dotenv').config()
const { sequelize, Agency, User, Shipment, Bag, Parcel } = require('../models')
const { ROLES } = require('../constants')
const { generateCode } = require('../services/codeGenerator.service')  // ← import

async function seed() {
  console.log('🌱 Création des données de test...')

  // Agences (inchangé)
  const [paris] = await Agency.findOrCreate({
    where:    { city: 'Paris' },
    defaults: { name: 'Agence Paris', country: 'FR', city: 'Paris', phone: '+33 1 00 00 00 00' },
  })
  const [moroni] = await Agency.findOrCreate({
    where:    { city: 'Moroni' },
    defaults: { name: 'Agence Moroni', country: 'KM', city: 'Moroni', phone: '+269 411 11 11' },
  })
  await Agency.findOrCreate({
    where:    { city: 'Abidjan' },
    defaults: { name: 'Agence Abidjan', country: 'CI', city: 'Abidjan' },
  })
  console.log('✅ Agences créées')

  // Users (inchangé)
  await User.findOrCreate({
    where:    { email: 'admin@colistrack.com' },
    defaults: { name: 'Admin ColisTrack', passwordHash: 'admin1234', role: ROLES.ADMIN, isActive: true },
  })

  const [agentFR] = await User.findOrCreate({
    where:    { email: 'agent.fr@colistrack.com' },
    defaults: { name: 'Amadou Martin', passwordHash: 'agent1234', role: ROLES.AGENT_FR, agencyId: paris.id, isActive: true },
  })

  await User.findOrCreate({
    where:    { email: 'agent.km@colistrack.com' },
    defaults: { name: 'Fatima Yssf', passwordHash: 'agent1234', role: ROLES.AGENT_AF, agencyId: moroni.id, isActive: true },
  })

  const [client1] = await User.findOrCreate({
    where:    { email: 'aliyassir859@gmail.com' },
    defaults: { name: 'Ali YASSIR', passwordHash: 'client1234', role: ROLES.CLIENT, phone: '+33 6 11 22 33 44', isActive: true },
  })

  // const [client2] = await User.findOrCreate({
  //   where:    { email: 'aicha@test.com' },
  //   defaults: { name: 'Aïcha Koné', passwordHash: 'client1234', role: ROLES.CLIENT, phone: '+33 7 55 66 77 88', isActive: true },
  // })
  console.log('✅ Users créés')

  // Shipment (inchangé)
  let shipment = await Shipment.findOne({
    where: { originAgencyId: paris.id, destinationAgencyId: moroni.id, status: 'preparing' },
  })

  if (!shipment) {
    const count = await Shipment.count()
    const year  = new Date().getFullYear()
    shipment = await Shipment.create({
      reference:           `SHP-${year}-${String(count + 1).padStart(5, '0')}`,
      originAgencyId:      paris.id,
      destinationAgencyId: moroni.id,
      departureDate:       new Date(),
      createdBy:           agentFR.id,
      status:              'preparing',
    })
  }
  console.log('✅ Envoi créé :', shipment.reference)

  // Bag – génération du code via service
  let bag = await Bag.findOne({ where: { shipmentId: shipment.id } })
  if (!bag) {
    const qrcode = await generateCode('bag')   // ← nouveau code
    bag = await Bag.create({
      qrcode,
      shipmentId: shipment.id,
      status:     'open',
    })
  }
  console.log('✅ Sac créé :', bag.qrcode)

  // Parcels – génération de chaque code via service
  const parcelsData = [
    // { senderId: client1.id, recipientName: 'Fatou Diallo',   recipientEmail: 'fatou.diallo@email.com', recipientPhone: '+221 77 111 22 33', description: 'Vêtements et chaussures', weight: 2.4 },
    // { senderId: client2.id, recipientName: 'Ibrahim Koné',   recipientEmail: 'ibrahim.kone@email.com', recipientPhone: '+221 77 444 55 66', description: 'Médicaments',             weight: 1.2 },
    // { senderId: client1.id, recipientName: 'Boubacar Sy',    recipientEmail: 'boubacar@email.com',     recipientPhone: '+221 77 777 88 99', description: 'Électronique',            weight: 3.5 },
    { senderId: client1.id, recipientName: 'Med Moussa',    recipientEmail: 'aliyassir131@outlook.fr',     recipientPhone: '+269 321 11 11', description: 'Téléphone',            weight: 3.5 },
  ]

  for (const data of parcelsData) {
    const existing = await Parcel.findOne({
      where: { senderId: data.senderId, recipientEmail: data.recipientEmail },
    })
    if (!existing) {
      const qrcode = await generateCode('parcel')   // ← nouveau code
      await Parcel.create({
        ...data,
        bagId:   bag.id,
        qrcode,
        status:  'received',
      })
    }
  }
  console.log('✅ Colis créés')

  console.log('\n📋 Comptes de test :')
  console.log('   Admin    → admin@colistrack.com    / admin1234')
  console.log('   Agent FR → agent.fr@colistrack.com / agent1234')
  console.log('   Agent AF → agent.af@colistrack.com / agent1234')
  console.log('   Client   → mamadou@test.com        / client1234')
  console.log('   Client   → aicha@test.com          / client1234')

  await sequelize.close()
}

seed().catch(console.error)