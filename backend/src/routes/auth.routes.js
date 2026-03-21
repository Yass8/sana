// src/routes/auth.routes.js
const router              = require('express').Router()
const { register, login,
        me, logout }      = require('../controllers/auth.controller')
const { authenticate }    = require('../middlewares/auth.middleware')

router.post('/register', register)
router.post('/login',    login)
router.get( '/me',       authenticate, me)
router.post('/logout',   authenticate, logout)

module.exports = router