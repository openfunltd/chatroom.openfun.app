import { RoomManager } from '../room/RoomManager.js'
import type { ErrorCode, ErrorMessage, JoinedMessage, MetaUpdatedMessage, SayBroadcast, UserJoinedMessage, UserLeftMessage } from '../types.js'
import { parseClientMessage } from '../types.js'
import { User } from '../user/User.js'
import type WebSocket from 'ws'

export class WsHandler {
  private readonly user: User
  private readonly roomManager: RoomManager

  constructor(ws: WebSocket) {
    this.user = new User(ws)
    this.roomManager = RoomManager.getInstance()

    ws.on('message', (data) => this.onMessage(data.toString()))
    ws.on('close', () => this.onClose())
  }

  private onMessage(raw: string): void {
    const msg = parseClientMessage(raw)
    if (msg === null) {
      this.sendError('INVALID_MESSAGE', 'Could not parse message. Ensure it is valid JSON with a known type.')
      return
    }

    switch (msg.type) {
      case 'join':
        this.handleJoin(msg.room, msg.username, msg.password, msg.meta)
        break
      case 'say':
        this.handleSay(msg.payload)
        break
      case 'set-meta':
        this.handleSetMeta(msg.meta)
        break
    }
  }

  private onClose(): void {
    if (!this.user.roomName) return
    const roomName = this.user.roomName
    const room = this.roomManager.get(roomName)
    if (!room) return

    room.removeMember(this.user.userId)

    const leftMsg: UserLeftMessage = {
      type: 'user-left',
      userId: this.user.userId,
      username: this.user.username,
      timestamp: new Date().toISOString(),
    }
    room.broadcastAll(leftMsg)
    this.roomManager.cleanupIfEmpty(roomName)
  }

  private handleJoin(
    roomName: string,
    username: string,
    password: string | undefined,
    initialMeta: Record<string, unknown> | undefined,
  ): void {
    if (this.user.roomName !== null) {
      this.sendError('ALREADY_JOINED', 'Already joined a room. Open a new connection to join a different room.')
      return
    }

    if (!username || username.trim() === '') {
      this.sendError('USERNAME_REQUIRED', 'username is required and must be a non-empty string.')
      return
    }

    const result = this.roomManager.getOrCreate(roomName, password)
    if (!result.ok) {
      this.sendError(result.code, result.message)
      return
    }

    const room = result.room
    this.user.username = username.trim()
    this.user.meta = initialMeta ?? {}
    room.addMember(this.user)

    // Send joined to this user
    const joinedMsg: JoinedMessage = {
      type: 'joined',
      userId: this.user.userId,
      room: room.name,
      members: room.getMemberList(),
      history: room.getHistory(),
    }
    this.user.send(joinedMsg)

    // Broadcast user-joined to all other members
    const userJoinedMsg: UserJoinedMessage = {
      type: 'user-joined',
      userId: this.user.userId,
      username: this.user.username,
      meta: { ...this.user.meta },
      timestamp: new Date().toISOString(),
    }
    room.broadcast(userJoinedMsg, this.user.userId)
  }

  private handleSay(payload: unknown): void {
    if (!this.user.roomName) {
      this.sendError('NOT_IN_ROOM', 'Must join a room before sending messages.')
      return
    }

    const room = this.roomManager.get(this.user.roomName)
    if (!room) return

    const timestamp = new Date().toISOString()
    room.pushHistory({
      userId: this.user.userId,
      username: this.user.username,
      timestamp,
      payload,
    })

    const sayMsg: SayBroadcast = {
      type: 'say',
      userId: this.user.userId,
      username: this.user.username,
      timestamp,
      payload,
    }
    room.broadcastAll(sayMsg)
  }

  private handleSetMeta(meta: Record<string, unknown>): void {
    if (!this.user.roomName) {
      this.sendError('NOT_IN_ROOM', 'Must join a room before updating meta.')
      return
    }

    const room = this.roomManager.get(this.user.roomName)
    if (!room) return

    // Partial merge
    this.user.meta = { ...this.user.meta, ...meta }

    // If name is updated via meta, sync username
    if (typeof meta.name === 'string' && meta.name.trim()) {
      this.user.username = meta.name.trim()
    }

    const metaUpdatedMsg: MetaUpdatedMessage = {
      type: 'meta-updated',
      userId: this.user.userId,
      username: this.user.username,
      meta: { ...this.user.meta },
      timestamp: new Date().toISOString(),
    }
    room.broadcastAll(metaUpdatedMsg)
  }

  private sendError(code: ErrorCode, message: string): void {
    const errorMsg: ErrorMessage = { type: 'error', code, message }
    this.user.send(errorMsg)
  }
}
