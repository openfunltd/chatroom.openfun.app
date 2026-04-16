import { v4 as uuidv4 } from 'uuid'
import type WebSocket from 'ws'
import type { ServerMessage, UserInfo } from '../types.js'

export class User {
  readonly userId: string
  username: string
  meta: Record<string, unknown>
  readonly ws: WebSocket
  roomName: string | null = null

  constructor(ws: WebSocket) {
    this.userId = uuidv4()
    this.username = ''
    this.meta = {}
    this.ws = ws
  }

  send(msg: ServerMessage): void {
    try {
      if (this.ws.readyState === this.ws.OPEN) {
        this.ws.send(JSON.stringify(msg))
      }
    } catch {
      // Socket already closed — ignore
    }
  }

  toInfo(): UserInfo {
    return {
      userId: this.userId,
      username: this.username,
      meta: { ...this.meta },
    }
  }
}
