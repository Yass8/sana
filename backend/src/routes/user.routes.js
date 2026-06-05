// src/routes/user.routes.js
const router          = require('express').Router()
const ctrl            = require('../controllers/user.controller')
const { authenticate,
        authorize }   = require('../middlewares/auth.middleware')
const { ROLES }       = require('../constants')

const isAdmin = authorize(ROLES.ADMIN)
const all = authorize(ROLES.ADMIN, ROLES.AGENT_FR, ROLES.AGENT_AF)

router.get(   '/',     authenticate, isAdmin, ctrl.getAll)
router.get(   '/me',   authenticate,          ctrl.getMe)
router.get(   '/:id',  authenticate, all, ctrl.getById)
router.post(  '/',     authenticate, isAdmin, ctrl.create)
router.patch( '/:id',  authenticate, all, ctrl.update)
router.delete('/:id',  authenticate, isAdmin, ctrl.deleteUser)
router.patch('/:id/desactivate',  authenticate, isAdmin, ctrl.desactivate)
router.put('/:id/update-password', authenticate, all, ctrl.updatePassword)

module.exports = router