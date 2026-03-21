// src/models/utils.js
const { DataTypes } = require('sequelize')

// SQLite ne supporte pas ENUM nativement
// On utilise STRING + validation isIn — compatible SQLite et PostgreSQL
function enumType(values) {
  return {
    type:     DataTypes.STRING(50),
    validate: { isIn: [values] },
  }
}

module.exports = { enumType }