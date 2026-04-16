import { config } from '../config.js'
import type { ErrorCode, RoomInfo } from '../types.js'
import { Room } from './Room.js'

export type GetOrCreateResult =
  | { ok: true; room: Room }
  | { ok: false; code: ErrorCode; message: string }

export class RoomManager {
  private static instance: RoomManager
  private readonly rooms: Map<string, Room> = new Map()

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager()
    }
    return RoomManager.instance
  }

  getOrCreate(name: string, password?: string): GetOrCreateResult {
    const normalized = name.toLowerCase()

    if (
      !config.ROOM_NAME_PATTERN.test(normalized) ||
      normalized.length > config.ROOM_NAME_MAX_LENGTH
    ) {
      return {
        ok: false,
        code: 'INVALID_ROOM_NAME',
        message: `Room name must match [a-z0-9-]+ and be at most ${config.ROOM_NAME_MAX_LENGTH} characters.`,
      }
    }

    const existing = this.rooms.get(normalized)
    if (existing) {
      if (!existing.checkPassword(password)) {
        // Use same error whether room exists or not — prevents enumeration
        return { ok: false, code: 'WRONG_PASSWORD', message: 'Incorrect password.' }
      }
      return { ok: true, room: existing }
    }

    const room = new Room(normalized, password)
    this.rooms.set(normalized, room)
    return { ok: true, room }
  }

  get(name: string): Room | undefined {
    return this.rooms.get(name.toLowerCase())
  }

  cleanupIfEmpty(name: string): void {
    const room = this.rooms.get(name)
    if (room?.isEmpty()) {
      this.rooms.delete(name)
    }
  }

  listRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).map((r) => r.toInfo())
  }
}
