require('dotenv').config();
const { sequelize, User, Agency } = require('../models');

async function run() {
  await sequelize.sync();
  console.log('✅ Tables synchronisées.');

  // Récupération des agences existantes (elles doivent avoir été créées avant)
  const paris = await Agency.findOne({ where: { name: 'Agence Paris' } });
  if (!paris) throw new Error("L'agence Paris n'existe pas. Lancez d'abord seedAgencies.js");

  const moroni = await Agency.findOne({ where: { name: 'Agence Moroni' } });
  if (!moroni) throw new Error("L'agence Moroni n'existe pas. Lancez d'abord seedAgencies.js");

  const users = [
    {
      name: 'Admin Système',
      email: 'admin@sanaservice.com',
      passwordHash: 'Admin123!',
      role: 'admin',
      agencyId: paris.id,          // UUID dynamique
    },
    {
      name: 'Agent France',
      email: 'agent.fr@sanaservice.com',
      passwordHash: 'Agent123!',
      role: 'agent_fr',
      agencyId: paris.id,          // UUID dynamique
    },
    {
      name: 'Agent Comores',
      email: 'agent.km@sanaservice.com',
      passwordHash: 'Agent123!',
      role: 'agent_af',
      agencyId: moroni.id,         // UUID dynamique
    },
    {
      name: 'Client Test',
      email: 'client@test.com',
      passwordHash: 'Client123!',
      role: 'client',
      agencyId: null,
    },
  ];

  console.log('👤 Création des utilisateurs...');
  for (const data of users) {
    const exists = await User.findOne({ where: { email: data.email } });
    if (!exists) {
      // User.create() déclenche le hook beforeCreate (hashage du mdp)
      const user = await User.create(data);
      console.log(`  ✅ Créé : ${user.name} (${user.role})`);
    } else {
      console.log(`  ⚠️ Existe déjà : ${exists.name} (${exists.role})`);
    }
  }

  console.log('🎉 Utilisateurs prêts.');
  await sequelize.close();
}

run().catch(err => {
  console.error('❌ Erreur seed utilisateurs :', err);
  process.exit(1);
});