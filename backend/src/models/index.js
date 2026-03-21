// src/models/index.js
const sequelize = require('../config/database')

const models = {
  Agency:        require('./Agency')(sequelize),
  User:          require('./User')(sequelize),
  Shipment:      require('./Shipment')(sequelize),
  Bag:           require('./Bag')(sequelize),
  Parcel:        require('./Parcel')(sequelize),
  TrackingEvent: require('./TrackingEvent')(sequelize),
  Notification:  require('./Notification')(sequelize),
}

Object.values(models).forEach(model => {
  if (model.associate) model.associate(models)
})

module.exports = { sequelize, ...models }