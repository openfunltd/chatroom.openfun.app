import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import type { HistoryEntry, RoomInfo, ServerMessage, UserInfo } from '../types.js'
import { User } from '../user/User.js'
import { MessageHistory } from './MessageHistory.js'

export class Room {
  readonly name: string
  private readonly passwordHash: string | null
  private readonly members: Map<string, User> = new Map()
  private readonly history: MessageHistory
  readonly createdAt: Date = new Date()

  constructor(name: string, password?: string) {
    this.name = name
    this.passwordHash = password ? bcrypt.hashSync(password, 1) : null
    this.history = new MessageHistory(config.MAX_HISTORY)
  }

  checkPassword(password?: string): boolean {
    if (this.passwordHash === null) return true
    if (!password) return false
    return bcrypt.compareSync(password, this.passwordHash)
  }

  get hasPassword(): boolean {
    return this.passwordHash !== null
  }

  addMember(user: User): void {
    this.members.set(user.userId, user)
    user.roomName = this.name
  }

  removeMember(userId: string): void {
    const user = this.members.get(userId)
    if (user) {
      user.roomName = null
      this.members.delete(userId)
    }
  }

  getMember(userId: string): User | undefined {
    return this.members.get(userId)
  }

  getMemberList(): UserInfo[] {
    return Array.from(this.members.values()).map((u) => u.toInfo())
  }

  broadcast(msg: ServerMessage, excludeUserId?: string): void {
    for (const user of this.members.values()) {
      if (user.userId !== excludeUserId) {
        user.send(msg)
      }
    }
  }

  broadcastAll(msg: ServerMessage): void {
    for (const user of this.members.values()) {
      user.send(msg)
    }
  }

  pushHistory(entry: HistoryEntry): void {
    this.history.push(entry)
  }

  getHistory(): HistoryEntry[] {
    return this.history.getAll()
  }

  isEmpty(): boolean {
    return this.members.size === 0
  }

  toInfo(): RoomInfo {
    return {
      name: this.name,
      memberCount: this.members.size,
      hasPassword: this.hasPassword,
      createdAt: this.createdAt.toISOString(),
      members: this.getMemberList(),
    }
  }
}
