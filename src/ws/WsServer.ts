import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { config } from '../config.js'
import { WsHandler } from './WsHandler.js'

export function createWsServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: config.WS_PATH })

  wss.on('connection', (ws) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ws as any).isAlive = true
    ws.on('pong', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(ws as any).isAlive = true
    })
    new WsHandler(ws)
  })

  // Heartbeat: terminate dead connections every 30 seconds
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(ws as any).isAlive) {
        ws.terminate()
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(ws as any).isAlive = false
      ws.ping()
    })
  }, 30_000)

  wss.on('close', () => clearInterval(heartbeat))

  return wss
}
