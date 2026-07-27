const env = require('../config/env')

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500
  const payload = {
    message: err.message || 'Doslo je do greske na serveru.',
  }

  if (env.debugErrors) {
    payload.name = err.name
    payload.code = err.code
    payload.stack = err.stack
  }

  res.status(statusCode).json(payload)
}

module.exports = errorHandler
