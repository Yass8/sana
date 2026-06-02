// src/routes/parcel.routes.js
const router         = require('express').Router()
const ctrl           = require('../controllers/parcel.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { ROLES }      = require('../constants')

const allAgents  = authorize(ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN)
const frAndAdmin = authorize(ROLES.AGENT_FR, ROLES.ADMIN)
const allAuth    = authorize(ROLES.CLIENT, ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN)

// Route publique — sans authenticate
router.get('/track/:qrcode', ctrl.trackByQRCode)

// Routes protégées
router.get( '/',           authenticate, allAgents,  ctrl.getAll)
router.post('/',           authenticate, frAndAdmin,  ctrl.create)
router.get( '/:id',        authenticate, allAuth,     ctrl.getById)
router.patch('/:id/status',authenticate, allAgents,   ctrl.updateStatus)
router.get( '/:id/qrcode',authenticate, allAuth,     ctrl.getQRCode)
router.delete('/:id',      authenticate, allAgents,  ctrl.deleteParcel)
router.put('/:id',         authenticate, frAndAdmin, ctrl.update)

module.exports = router