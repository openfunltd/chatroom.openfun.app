import type { HistoryEntry } from '../types.js'

export class MessageHistory {
  private readonly entries: (HistoryEntry | undefined)[]
  private head = 0
  private size = 0
  readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.entries = new Array(capacity)
  }

  push(entry: HistoryEntry): void {
    this.entries[this.head] = entry
    this.head = (this.head + 1) % this.capacity
    if (this.size < this.capacity) this.size++
  }

  getAll(): HistoryEntry[] {
    if (this.size === 0) return []
    if (this.size < this.capacity) {
      return this.entries.slice(0, this.size) as HistoryEntry[]
    }
    // Buffer is full: oldest entry is at this.head
    const tail = this.entries.slice(this.head) as HistoryEntry[]
    const front = this.entries.slice(0, this.head) as HistoryEntry[]
    return [...tail, ...front]
  }
}
