const jwt = require('jsonwebtoken')
const env = require('../config/env')

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    res.status(401).json({ message: 'Prijava je obavezna.' })
    return
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret)
    next()
  } catch (_error) {
    res.status(401).json({ message: 'Sesija je istekla. Prijavi se ponovo.' })
  }
}

module.exports = requireAuth
