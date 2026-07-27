const dns = require('dns')
const mongoose = require('mongoose')
const env = require('./env')
const Offer = require('../models/Offer')

async function dropLegacyUniqueOfferNumberIndex() {
  try {
    await Offer.collection.dropIndex('unique_offer_number')
    console.log('Dropped legacy unique_offer_number index')
  } catch (error) {
    if (error.codeName !== 'IndexNotFound' && error.code !== 27) {
      throw error
    }
  }
}

async function connectDb() {
  if (env.dnsServers.length > 0) {
    dns.setServers(env.dnsServers)
  }

  await mongoose.connect(env.mongoUri)
  await dropLegacyUniqueOfferNumberIndex()
  console.log(`MongoDB connected: ${mongoose.connection.name}`)
}

module.exports = connectDb
