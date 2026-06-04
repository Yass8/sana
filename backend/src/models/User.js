// src/models/User.js
const { DataTypes } = require('sequelize')
const bcrypt        = require('bcryptjs')
const { enumType }  = require('./utils')

const ROLES = ['client', 'agent_fr', 'agent_af', 'admin']

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    name:  { type: DataTypes.STRING(100), allowNull: false },
    email: {
      type:      DataTypes.STRING(150),
      allowNull: false,
      unique:    true,
      validate:  { isEmail: true },
    },
    phone:        { type: DataTypes.STRING(20),  allowNull: true  },
    passwordHash: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      field:     'password_hash',
    },
    role: {
      ...enumType(ROLES),
      allowNull:    false,
      defaultValue: 'client',
    },
    agencyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      field:     'agency_id',
    },
    isActive: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
      field:        'is_active',
    },
    reset_password_token: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      field:     'reset_password_token',
    },
    reset_password_expires: {
      type:      DataTypes.DATE,
      allowNull: true,
      field:     'reset_password_expires',
    },
  }, {
    tableName:  'users',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: { attributes: {} },
    },
  })

  User.beforeCreate(async (user) => {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 12)
  })

  User.beforeUpdate(async (user) => {
    if (user.changed('passwordHash')) {
      user.passwordHash = await bcrypt.hash(user.passwordHash, 12)
    }
  })

  User.prototype.checkPassword = function (plain) {
    return bcrypt.compare(plain, this.passwordHash)
  }

  User.prototype.toSafeJSON = function () {
    const { passwordHash, ...safe } = this.toJSON()
    return safe
  }

  User.associate = (models) => {
    User.belongsTo(models.Agency,       { foreignKey: 'agencyId',  as: 'agency'           })
    User.hasMany(models.Parcel,         { foreignKey: 'senderId',  as: 'parcels'           })
    User.hasMany(models.TrackingEvent,  { foreignKey: 'agentId',   as: 'trackingEvents'    })
    User.hasMany(models.Notification,   { foreignKey: 'userId',    as: 'notifications'     })
  }

  return User
}