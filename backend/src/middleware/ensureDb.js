const mongoose = require('mongoose')
const connectDb = require('../config/db')

let connectionPromise = null

async function ensureDb(_req, _res, next) {
  if (mongoose.connection.readyState === 1) {
    next()
    return
  }

  try {
    if (!connectionPromise) {
      connectionPromise = connectDb().catch((error) => {
        connectionPromise = null
        throw error
      })
    }

    await connectionPromise
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = ensureDb
