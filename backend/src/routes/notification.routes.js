// src/routes/notification.routes.js
const router         = require('express').Router()
const ctrl           = require('../controllers/notification.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { ROLES }      = require('../constants')

const isAdmin = authorize(ROLES.ADMIN)

router.get( '/',          authenticate, isAdmin, ctrl.getAll)
router.post('/bulk',      authenticate, isAdmin, ctrl.bulk)
router.post('/:id/retry', authenticate, isAdmin, ctrl.retry)

module.exports = router