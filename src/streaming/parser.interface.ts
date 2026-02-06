import { EventEmitter } from 'events'
import { StreamFrame, StreamInfo } from '../types'

export interface StreamParserOptions {
  url: string
  timeout?: number
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface StreamParserEvents {
  'frame': (frame: StreamFrame) => void
  'info': (info: StreamInfo) => void
  'error': (error: Error) => void
  'connected': () => void
  'disconnected': () => void
  'end': () => void
}

export type StreamParserEventsMap = {
  [K in keyof StreamParserEvents]: StreamParserEvents[K][]
}

export abstract class StreamParser extends EventEmitter {
  protected url: string
  protected timeout: number
  protected reconnectInterval: number
  protected maxReconnectAttempts: number
  protected reconnectCount: number = 0
  protected isConnected: boolean = false
  protected isActive: boolean = false

  constructor(options: StreamParserOptions) {
    super()
    this.url = options.url
    this.timeout = options.timeout || 30000
    this.reconnectInterval = options.reconnectInterval || 5000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 3
  }

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract parse(buffer: Buffer): StreamFrame | null

  start(): Promise<void> {
    this.isActive = true
    return this.connect()
  }

  stop(): Promise<void> {
    this.isActive = false
    this.reconnectCount = 0
    return this.disconnect()
  }

  protected handleReconnect(): void {
    if (!this.isActive || this.reconnectCount >= this.maxReconnectAttempts) {
      this.emit('disconnected')
      this.isConnected = false
      return
    }

    this.reconnectCount++
    setTimeout(() => {
      if (this.isActive) {
        this.connect().catch((error) => {
          this.emit('error', error)
        })
      }
    }, this.reconnectInterval)
  }

  getStatus(): { connected: boolean; active: boolean; reconnectCount: number } {
    return {
      connected: this.isConnected,
      active: this.isActive,
      reconnectCount: this.reconnectCount
    }
  }
}
