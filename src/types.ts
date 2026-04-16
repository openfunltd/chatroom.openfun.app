// ============================================================
// Shared types
// ============================================================

export interface UserInfo {
  userId: string
  username: string
  meta: Record<string, unknown>
}

export interface HistoryEntry {
  userId: string
  username: string
  timestamp: string
  payload: unknown
}

export interface RoomInfo {
  name: string
  memberCount: number
  hasPassword: boolean
  createdAt: string
  members: UserInfo[]
}

// ============================================================
// Client → Server messages
// ============================================================

export interface JoinMessage {
  type: 'join'
  room: string
  username: string
  password?: string
  meta?: Record<string, unknown>
}

export interface SayMessage {
  type: 'say'
  payload: unknown
}

export interface SetMetaMessage {
  type: 'set-meta'
  meta: Record<string, unknown>
}

export type ClientMessage = JoinMessage | SayMessage | SetMetaMessage

// ============================================================
// Server → Client messages
// ============================================================

export interface JoinedMessage {
  type: 'joined'
  userId: string
  room: string
  members: UserInfo[]
  history: HistoryEntry[]
}

export interface UserJoinedMessage {
  type: 'user-joined'
  userId: string
  username: string
  meta: Record<string, unknown>
  timestamp: string
}

export interface UserLeftMessage {
  type: 'user-left'
  userId: string
  username: string
  timestamp: string
}

export interface SayBroadcast {
  type: 'say'
  userId: string
  username: string
  timestamp: string
  payload: unknown
}

export interface MetaUpdatedMessage {
  type: 'meta-updated'
  userId: string
  username: string
  meta: Record<string, unknown>
  timestamp: string
}

export type ErrorCode =
  | 'INVALID_ROOM_NAME'
  | 'WRONG_PASSWORD'
  | 'NOT_IN_ROOM'
  | 'ALREADY_JOINED'
  | 'INVALID_MESSAGE'
  | 'USERNAME_REQUIRED'

export interface ErrorMessage {
  type: 'error'
  code: ErrorCode
  message: string
}

export type ServerMessage =
  | JoinedMessage
  | UserJoinedMessage
  | UserLeftMessage
  | SayBroadcast
  | MetaUpdatedMessage
  | ErrorMessage

// ============================================================
// Type guards
// ============================================================

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObject(parsed)) return null

  const { type } = parsed
  if (type === 'join') {
    if (typeof parsed.room !== 'string') return null
    if (typeof parsed.username !== 'string') return null
    return {
      type: 'join',
      room: parsed.room,
      username: parsed.username,
      password: typeof parsed.password === 'string' ? parsed.password : undefined,
      meta: isObject(parsed.meta) ? parsed.meta : undefined,
    }
  }

  if (type === 'say') {
    if (!('payload' in parsed)) return null
    return { type: 'say', payload: parsed.payload }
  }

  if (type === 'set-meta') {
    if (!isObject(parsed.meta)) return null
    return { type: 'set-meta', meta: parsed.meta }
  }

  return null
}
