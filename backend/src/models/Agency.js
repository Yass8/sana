// src/models/Agency.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Agency = sequelize.define('Agency', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    name:    { type: DataTypes.STRING(100), allowNull: false },
    country: { type: DataTypes.STRING(50),   allowNull: false },
    city:    { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.TEXT,        allowNull: true  },
    phone:   { type: DataTypes.STRING(20),  allowNull: true  },
    email:   { type: DataTypes.STRING(150), allowNull: true  },
  }, {
    tableName:  'agencies',
    timestamps: true,
    updatedAt:  false,
  })

  Agency.associate = (models) => {
    Agency.hasMany(models.User,     { foreignKey: 'agencyId',             as: 'users'             })
  }

  return Agency
}