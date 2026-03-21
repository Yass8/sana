// src/routes/dashboard.routes.js
const router         = require('express').Router()
const ctrl           = require('../controllers/dashboard.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { ROLES }      = require('../constants')

const allAgents = authorize(ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN)

router.get('/stats',        authenticate, allAgents, ctrl.getStats)
router.get('/notif-stats',  authenticate, authorize(ROLES.ADMIN), ctrl.getNotifStats)

module.exports = router