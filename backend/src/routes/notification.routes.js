// src/routes/notification.routes.js
const router         = require('express').Router()
const ctrl           = require('../controllers/notification.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { ROLES }      = require('../constants')

const isAdminOrAgentFr = authorize(ROLES.ADMIN, ROLES.AGENT_FR)

router.get( '/',          authenticate, isAdminOrAgentFr, ctrl.getAll)
router.post('/bulk',      authenticate, isAdminOrAgentFr, ctrl.sendBulk)
router.post('/:id/retry', authenticate, isAdminOrAgentFr, ctrl.retry)

module.exports = router