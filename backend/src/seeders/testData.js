// backend/src/seeders/testData.js
require('dotenv').config()
const { sequelize, Agency, User, Shipment, Bag, Parcel } = require('../models')
const { ROLES } = require('../constants')

async function seed() {
  // ← Plus de sync ici — le serveur le fait au démarrage
  console.log('🌱 Création des données de test...')

  // ── Agences ──────────────────────────────────────────
  const [paris] = await Agency.findOrCreate({
    where:    { city: 'Paris' },
    defaults: { name: 'Agence Paris', country: 'FR', city: 'Paris', phone: '+33 1 00 00 00 00' },
  })
  const [dakar] = await Agency.findOrCreate({
    where:    { city: 'Dakar' },
    defaults: { name: 'Agence Dakar', country: 'SN', city: 'Dakar', phone: '+221 33 00 00 00' },
  })
  await Agency.findOrCreate({
    where:    { city: 'Abidjan' },
    defaults: { name: 'Agence Abidjan', country: 'CI', city: 'Abidjan' },
  })
  console.log('✅ Agences créées')

  // ── Users ─────────────────────────────────────────────
  await User.findOrCreate({
    where:    { email: 'admin@colistrack.com' },
    defaults: { name: 'Admin ColisTrack', passwordHash: 'admin1234', role: ROLES.ADMIN, isActive: true },
  })

  const [agentFR] = await User.findOrCreate({
    where:    { email: 'agent.fr@colistrack.com' },
    defaults: { name: 'Amadou Martin', passwordHash: 'agent1234', role: ROLES.AGENT_FR, agencyId: paris.id, isActive: true },
  })

  await User.findOrCreate({
    where:    { email: 'agent.af@colistrack.com' },
    defaults: { name: 'Fatou Ndiaye', passwordHash: 'agent1234', role: ROLES.AGENT_AF, agencyId: dakar.id, isActive: true },
  })

  const [client1] = await User.findOrCreate({
    where:    { email: 'mamadou@test.com' },
    defaults: { name: 'Mamadou Diallo', passwordHash: 'client1234', role: ROLES.CLIENT, phone: '+33 6 11 22 33 44', isActive: true },
  })

  const [client2] = await User.findOrCreate({
    where:    { email: 'aicha@test.com' },
    defaults: { name: 'Aïcha Koné', passwordHash: 'client1234', role: ROLES.CLIENT, phone: '+33 7 55 66 77 88', isActive: true },
  })
  console.log('✅ Users créés')

  // ── Shipment ──────────────────────────────────────────
  let shipment = await Shipment.findOne({
    where: { originAgencyId: paris.id, destinationAgencyId: dakar.id, status: 'preparing' },
  })

  if (!shipment) {
    const count = await Shipment.count()
    const year  = new Date().getFullYear()
    shipment = await Shipment.create({
      reference:           `SHP-${year}-${String(count + 1).padStart(5, '0')}`,
      originAgencyId:      paris.id,
      destinationAgencyId: dakar.id,
      departureDate:       new Date(),
      createdBy:           agentFR.id,
      status:              'preparing',
    })
  }
  console.log('✅ Envoi créé :', shipment.reference)

  // ── Bag ───────────────────────────────────────────────
  let bag = await Bag.findOne({ where: { shipmentId: shipment.id } })

  if (!bag) {
    const count = await Bag.count()
    const year  = new Date().getFullYear()
    bag = await Bag.create({
      barcode:    `BAG-${year}-${String(count + 1).padStart(5, '0')}`,
      shipmentId: shipment.id,
      status:     'open',
    })
  }
  console.log('✅ Sac créé :', bag.barcode)

  // ── Parcels ───────────────────────────────────────────
  const parcelsData = [
    { senderId: client1.id, recipientName: 'Fatou Diallo',   recipientEmail: 'fatou.diallo@email.com', recipientPhone: '+221 77 111 22 33', description: 'Vêtements et chaussures', weight: 2.4 },
    { senderId: client2.id, recipientName: 'Ibrahim Koné',   recipientEmail: 'ibrahim.kone@email.com', recipientPhone: '+221 77 444 55 66', description: 'Médicaments',             weight: 1.2 },
    { senderId: client1.id, recipientName: 'Boubacar Sy',    recipientEmail: 'boubacar@email.com',     recipientPhone: '+221 77 777 88 99', description: 'Électronique',            weight: 3.5 },
  ]

  for (const data of parcelsData) {
    const existing = await Parcel.findOne({
      where: { senderId: data.senderId, recipientEmail: data.recipientEmail },
    })
    if (!existing) {
      const count = await Parcel.count()
      const year  = new Date().getFullYear()
      await Parcel.create({
        ...data,
        bagId:   bag.id,
        barcode: `COL-${year}-${String(count + 1).padStart(5, '0')}`,
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