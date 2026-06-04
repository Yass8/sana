// src/config/database.js
const path = require('path');
const { Sequelize } = require('sequelize');

const storagePath = path.resolve(__dirname, '..', 'sanadb.sqlite'); // ajuste selon l'emplacement voulu

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false,
  dialectOptions: { foreign_keys: 'ON' },
});

module.exports = sequelize;


// src/config/database.js
// const { Sequelize } = require('sequelize')
// require('dotenv').config()

// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST,
//     dialect: process.env.DB_DIALECT || 'mysql',
//     logging: false,
//   }
// )

// module.exports = sequelize
