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
