import { EventEmitter } from 'events'
import { StreamFrame, DecodedFrame, VideoFrame, AudioFrame } from '../types'

export interface DecoderOptions {
  width?: number
  height?: number
  sampleRate?: number
  channels?: number
  threadCount?: number
  enableHardwareAcceleration?: boolean
}

export interface DecoderEvents {
  'videoFrame': (frame: VideoFrame) => void
  'audioFrame': (frame: AudioFrame) => void
  'error': (error: Error) => void
  'ready': () => void
  'end': () => void
}

export declare interface Decoder {
  on<K extends keyof DecoderEvents>(event: K, listener: DecoderEvents[K]): this
  once<K extends keyof DecoderEvents>(event: K, listener: DecoderEvents[K]): this
  emit<K extends keyof DecoderEvents>(event: K, ...args: Parameters<DecoderEvents[K]>): boolean
}

export abstract class Decoder extends EventEmitter {
  protected width: number
  protected height: number
  protected sampleRate: number
  protected channels: number
  protected threadCount: number
  protected enableHardwareAcceleration: boolean
  protected isInitialized: boolean = false

  constructor(options: DecoderOptions = {}) {
    super()
    this.width = options.width || 1920
    this.height = options.height || 1080
    this.sampleRate = options.sampleRate || 48000
    this.channels = options.channels || 2
    this.threadCount = options.threadCount || 4
    this.enableHardwareAcceleration = options.enableHardwareAcceleration ?? false
  }

  abstract initialize(codec: string): Promise<void>
  abstract decode(frame: StreamFrame): DecodedFrame | null
  abstract flush(): void
  abstract reset(): Promise<void>

  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Decoder not initialized. Call initialize() first.')
    }
  }

  protected createVideoFrame(data: Buffer, timestamp: number): VideoFrame {
    return {
      width: this.width,
      height: this.height,
      data,
      timestamp
    }
  }

  protected createAudioFrame(data: Buffer, timestamp: number): AudioFrame {
    return {
      data,
      sampleRate: this.sampleRate,
      channels: this.channels,
      timestamp
    }
  }
}

export interface DecoderFactory {
  create(codec: string): Decoder
}

export interface FrameBuffer {
  push(frame: StreamFrame): void
  pop(): StreamFrame | null
  peek(): StreamFrame | null
  size(): number
  clear(): void
}

export class CircularFrameBuffer implements FrameBuffer {
  private buffer: StreamFrame[] = []
  private maxSize: number
  private writeIndex: number = 0
  private readIndex: number = 0

  constructor(maxSize: number = 30) {
    this.maxSize = maxSize
  }

  push(frame: StreamFrame): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(frame)
    } else {
      this.buffer[this.writeIndex] = frame
      this.writeIndex = (this.writeIndex + 1) % this.maxSize
      this.readIndex = this.writeIndex
    }
  }

  pop(): StreamFrame | null {
    if (this.buffer.length === 0) return null

    const frame = this.buffer[this.readIndex]
    this.readIndex = (this.readIndex + 1) % this.maxSize
    return frame
  }

  peek(): StreamFrame | null {
    if (this.buffer.length === 0) return null
    return this.buffer[this.readIndex]
  }

  size(): number {
    return this.buffer.length
  }

  clear(): void {
    this.buffer = []
    this.writeIndex = 0
    this.readIndex = 0
  }
}
