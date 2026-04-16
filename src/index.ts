import http from 'http'
import path from 'path'
import express from 'express'
import { config } from './config.js'
import router from './http/router.js'
import { createWsServer } from './ws/WsServer.js'

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use('/api', router)

const server = http.createServer(app)
createWsServer(server)

server.listen(config.PORT, () => {
  console.log(`Chatroom server listening on port ${config.PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${config.PORT}${config.WS_PATH}`)
  console.log(`REST API: http://localhost:${config.PORT}/api`)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
