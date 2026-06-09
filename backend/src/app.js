// src/app.js
const express      = require('express')
const cors         = require('cors')
const path         = require('path')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

// On récupère l'URL et on retire le slash de fin s'il existe
const originUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : '*';

app.use(cors({ origin: originUrl }))
app.use(express.json())

// ── Fichiers statiques — qrcodes ──────────────────
app.use('/qrcodes', express.static(
  path.join(__dirname, 'storage/qrcodes')
))

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'))
app.use('/api/users',         require('./routes/user.routes'))
app.use('/api/agencies',      require('./routes/agency.routes'))
app.use('/api/bags',          require('./routes/bag.routes'))
app.use('/api/parcels',       require('./routes/parcel.routes'))
app.use('/api/dashboard',     require('./routes/dashboard.routes'))
app.use('/api/notifications', require('./routes/notification.routes'))

// ── Health check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV })
})

// ── 404 ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} introuvable.` })
})

// ── Erreurs globales ───────────────────────────────────
app.use(errorHandler)

module.exports = app