// src/routes/bag.routes.js
const router         = require('express').Router()
const ctrl           = require('../controllers/bag.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { ROLES }      = require('../constants')

const agentsAndAdmin = authorize(ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN)
const frAndAdmin     = authorize(ROLES.AGENT_FR, ROLES.ADMIN)

router.get(   '/',           authenticate, agentsAndAdmin, ctrl.getAll)
router.get(   '/track/:qrcode', authenticate, agentsAndAdmin, ctrl.trackByQRCode)
router.get(   '/:id',        authenticate, agentsAndAdmin, ctrl.getById)
router.post(  '/',           authenticate, frAndAdmin,     ctrl.create)
router.patch( '/:id/close',  authenticate, frAndAdmin,     ctrl.close)
router.patch( '/:id/status', authenticate, agentsAndAdmin, ctrl.updateStatus)
router.patch('/:id/add-parcels', authenticate, frAndAdmin, ctrl.addParcels)
router.post(  '/:id/alert',  authenticate, frAndAdmin,     ctrl.sendAlert)
router.delete('/:id',        authenticate, frAndAdmin,     ctrl.deleteBag)

module.exports = router