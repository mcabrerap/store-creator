const express = require('express')

const app = express()

const uploadRoute = require('./upload.route')

app.use('/api/store-creator/upload', uploadRoute)

module.exports = app
