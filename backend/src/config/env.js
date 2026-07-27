const dotenv = require('dotenv')

dotenv.config()

const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

const env = {
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-offers',
  port: process.env.PORT || 5000,
  clientUrl: clientUrls[0],
  clientUrls,
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  debugErrors: process.env.DEBUG_ERRORS === 'true',
  dnsServers: (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),
}

module.exports = env
