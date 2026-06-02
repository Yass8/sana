require('dotenv').config();
const { sequelize, Agency } = require('../models');

const agenciesData = [
  {
    name: 'Agence Paris',
    country: 'FR',
    city: 'Paris',
    address: '1 rue de Rivoli, 75001 Paris',
    phone: '+33100000001',
    email: 'paris@example.com',
  },
  {
    name: 'Agence Moroni',
    country: 'KM',
    city: 'Moroni',
    address: 'Zilimadjou, Immeuble Le Parisien',
    phone: '+2250100000002',
    email: 'moroni@example.com',
  },
];

async function run() {
  await sequelize.sync();
  console.log('✅ Tables synchronisées.');

  console.log('🏢 Création des agences...');
  const createdAgencies = [];
  for (const data of agenciesData) {
    const [agency, created] = await Agency.findOrCreate({
      where: { name: data.name },
      defaults: data,
    });
    const status = created ? '✅ Créée' : '⚠️ Existante';
    console.log(`  ${status} : ${agency.name} (${agency.country})`);
    createdAgencies.push(agency);
  }

  console.log('🎉 Agences prêtes.');
  // Affiche les UUID générés pour information
  console.log('   UUID générés :');
  createdAgencies.forEach(a => console.log(`   ${a.name} : ${a.id}`));
  await sequelize.close();
}

run().catch(err => {
  console.error('❌ Erreur seed agences :', err);
  process.exit(1);
});