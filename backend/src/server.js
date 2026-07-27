const app = require('./app')
const env = require('./config/env')

const port = process.env.PORT || env.port

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
