import type { ChatChannel } from './protocol'

export const TYPING_EXPIRE_MS = 4000

export interface TypingScope {
  roomId: string
  playerId: string
  channel: ChatChannel
  groupId?: string
}

export class TypingPresence {
  private entries = new Map<string, {
    scope: TypingScope
    sources: Map<string, ReturnType<typeof setTimeout>>
  }>()

  constructor(private emit: (scope: TypingScope, typing: boolean) => void) {}

  update(socketId: string, scope: TypingScope, typing: boolean): void {
    const key = JSON.stringify([scope.roomId, scope.playerId, scope.channel, scope.groupId])
    let entry = this.entries.get(key)
    const previous = entry?.sources.get(socketId)
    if (previous) clearTimeout(previous)
    if (!typing) {
      if (!entry || !entry.sources.delete(socketId)) return
      if (!entry.sources.size) {
        this.entries.delete(key)
        this.emit(entry.scope, false)
      }
      return
    }
    if (!entry) {
      entry = { scope, sources: new Map() }
      this.entries.set(key, entry)
    }
    const timer = setTimeout(() => this.update(socketId, scope, false), TYPING_EXPIRE_MS)
    timer.unref()
    entry.sources.set(socketId, timer)
    this.emit(scope, true)
  }

  clearSocket(socketId: string): void {
    for (const entry of this.entries.values()) {
      if (entry.sources.has(socketId)) this.update(socketId, entry.scope, false)
    }
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      for (const timer of entry.sources.values()) clearTimeout(timer)
    }
    this.entries.clear()
  }
}
