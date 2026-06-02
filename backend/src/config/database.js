// src/config/database.js
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './sana.sqlite',
  logging: false,
  dialectOptions: {
    foreign_keys: 'ON', 
  },
});

module.exports = sequelize