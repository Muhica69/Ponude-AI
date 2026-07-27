const express = require('express')
const cors = require('cors')
const env = require('./config/env')
const authRoutes = require('./routes/auth.routes')
const offerRoutes = require('./routes/offer.routes')
const ensureDb = require('./middleware/ensureDb')
const errorHandler = require('./middleware/errorHandler')

const app = express()

function isAllowedOrigin(origin) {
  if (!origin) {
    return true
  }

  if (env.clientUrls.includes(origin)) {
    return true
  }

  try {
    const { hostname, protocol } = new URL(origin)
    return protocol === 'https:' && (hostname === 'saplast.eu' || hostname.endsWith('.saplast.eu'))
  } catch {
    return false
  }
}

app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedOrigin(origin))
  },
}))
app.use(express.json({ limit: '25mb' }))

function healthCheck(_req, res) {
  res.json({ status: 'ok' })
}

app.get('/health', healthCheck)
app.get('/', healthCheck)
app.get('/api/health', healthCheck)

app.use('/auth', ensureDb, authRoutes)
app.use('/offers', ensureDb, offerRoutes)
app.use('/api/auth', ensureDb, authRoutes)
app.use('/api/offers', ensureDb, offerRoutes)

app.use(errorHandler)

module.exports = app
