// src/routes/shipment.routes.js
const router         = require('express').Router()
const ctrl           = require('../controllers/shipment.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { ROLES }      = require('../constants')

const agentsAndAdmin = authorize(ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN)
const frAndAdmin     = authorize(ROLES.AGENT_FR, ROLES.ADMIN)

router.get(   '/',           authenticate, agentsAndAdmin, ctrl.getAll)
router.get(   '/:id',        authenticate, agentsAndAdmin, ctrl.getById)
router.post(  '/',           authenticate, frAndAdmin,     ctrl.create)
router.patch( '/:id/status', authenticate, agentsAndAdmin, ctrl.updateStatus)

module.exports = router