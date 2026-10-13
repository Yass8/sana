// src/routes/parcel.routes.js
const router = require('express').Router()
const ctrl   = require('../controllers/parcel.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { ROLES } = require('../constants')

// ───────────────────────────────────────────────────────────────
// Guards de rôles
// ───────────────────────────────────────────────────────────────
const allAgents  = authorize(ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN)
const frAndAdmin = authorize(ROLES.AGENT_FR, ROLES.ADMIN)
const allAuth    = authorize(ROLES.CLIENT, ROLES.AGENT_FR, ROLES.AGENT_AF, ROLES.ADMIN)

// ───────────────────────────────────────────────────────────────
// ROUTES PUBLIQUES (pas d'authentification)
// ───────────────────────────────────────────────────────────────
router.get('/track/:qrcode', ctrl.trackByQRCode)

// ───────────────────────────────────────────────────────────────
// ROUTES SPÉCIFIQUES (statiques — DOIVENT être déclarées AVANT /:id)
// ───────────────────────────────────────────────────────────────
router.get('/daily-history', authenticate, allAgents, ctrl.getDailyHistory)
router.post('/with-invoice', authenticate, frAndAdmin, ctrl.createWithInvoice)

// ───────────────────────────────────────────────────────────────
// ROUTES GÉNÉRIQUES
// ───────────────────────────────────────────────────────────────
router.get('/',     authenticate, allAgents,  ctrl.getAll)
router.post('/',    authenticate, frAndAdmin, ctrl.create)

// ───────────────────────────────────────────────────────────────
// ROUTES PARAMÉTRÉES (/:id — DOIVENT venir en dernier)
// ───────────────────────────────────────────────────────────────
router.get(   '/:id',         authenticate, allAuth,    ctrl.getById)
router.patch( '/:id/status',  authenticate, allAgents,  ctrl.updateStatus)
router.get(   '/:id/qrcode',  authenticate, allAuth,    ctrl.getQRCode)
router.delete('/:id',         authenticate, allAgents,  ctrl.deleteParcel)
router.put(   '/:id',         authenticate, frAndAdmin, ctrl.update)

module.exports = router