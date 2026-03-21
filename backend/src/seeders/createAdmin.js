// src/seeders/createAdmin.js
require('dotenv').config()
const { sequelize, User } = require('../models')
const { ROLES }           = require('../constants')

async function seed() {
  await sequelize.sync()

  const [admin, created] = await User.findOrCreate({
    where: { email: 'admin@colistrack.com' },
    defaults: {
      name:         'Admin ColisTrack',
      passwordHash: 'admin1234',
      role:         ROLES.ADMIN,
      isActive:     true,
    },
  })

  console.log(created
    ? '✅ Admin créé : admin@colistrack.com / admin1234'
    : '⚠️  Admin déjà existant'
  )

  await sequelize.close()
}

seed().catch(console.error)