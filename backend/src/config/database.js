// src/config/database.js
// const path = require('path');
// const { Sequelize } = require('sequelize');

// const storagePath = path.resolve(__dirname, '..', 'sanadb.sqlite'); // ajuste selon l'emplacement voulu

// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: storagePath,
//   logging: false,
//   dialectOptions: { foreign_keys: 'ON' },
// });

// module.exports = sequelize;


const { Sequelize } = require('sequelize');
require('dotenv').config();

// Supabase utilise PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Nécessaire pour les connexions sécurisées SSL de Supabase
    }
  }
});

module.exports = sequelize;
