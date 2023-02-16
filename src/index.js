const express = require('express')
const config = require('config')
const cors = require('cors')
const router = require('./routes/router')
const log = require('./services/logger.service')

const app = express()

const port = config.get('server.port')
const host = config.get('server.host')

app.use(cors()).use(express.json()).use(router)
app.listen(port, () => {
    log.info(`Store Creator listening at https://${host}:${port}`)
})

module.exports = app
