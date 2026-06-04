// src/routes/agency.routes.js
const router             = require('express').Router()
const ctrl               = require('../controllers/agency.controller')
const { authenticate,
        authorize }      = require('../middlewares/auth.middleware')
const { ROLES }          = require('../constants')

router.get( '/',    authenticate, ctrl.getAll)
router.get( '/:id', authenticate, ctrl.getById)
router.post('/',    authenticate, authorize(ROLES.ADMIN), ctrl.create)
router.patch('/:id',authenticate, authorize(ROLES.ADMIN), ctrl.update)
router.delete('/:id',authenticate, authorize(ROLES.ADMIN), ctrl.deleteAgency)

module.exports = router