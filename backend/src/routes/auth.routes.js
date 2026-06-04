// src/routes/auth.routes.js
const router              = require('express').Router()
const { register, login,
        me, logout, forgotPassword, resetPassword }      = require('../controllers/auth.controller')
const { authenticate }    = require('../middlewares/auth.middleware')

router.post('/register', register)
router.post('/login',    login)
router.get( '/me',       authenticate, me)
router.post('/logout',   authenticate, logout)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword) // pas besoin d'authentification, on vérifie le token dans le controller

module.exports = router