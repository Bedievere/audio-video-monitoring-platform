import { StreamParser } from './parser.interface'
import { RTSPParser } from './rtsp.parser'
import { RTMPParser } from './rtmp.parser'
import { SRTParser } from './srt.parser'
import { HTTPParser } from './http.parser'
import { StreamFrame, StreamInfo, AudioSource } from '../types'

export interface StreamManagerOptions {
  onFrame?: (sourceId: string, frame: StreamFrame) => void
  onInfo?: (sourceId: string, info: StreamInfo) => void
  onError?: (sourceId: string, error: Error) => void
  onConnected?: (sourceId: string) => void
  onDisconnected?: (sourceId: string) => void
}

export class StreamManager {
  private parsers: Map<string, StreamParser> = new Map()
  private sources: Map<string, AudioSource> = new Map()
  private options: StreamManagerOptions

  constructor(options: StreamManagerOptions = {}) {
    this.options = options
  }

  addSource(source: AudioSource): void {
    this.sources.set(source.id, source)
  }

  removeSource(sourceId: string): void {
    this.stopSource(sourceId)
    this.sources.delete(sourceId)
  }

  async startSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId)
    if (!source) {
      throw new Error(`Source ${sourceId} not found`)
    }

    if (this.parsers.has(sourceId)) {
      await this.stopSource(sourceId)
    }

    const parser = this.createParser(source)
    this.setupParserEvents(sourceId, parser)
    this.parsers.set(sourceId, parser)

    await parser.start()
  }

  async stopSource(sourceId: string): Promise<void> {
    const parser = this.parsers.get(sourceId)
    if (parser) {
      await parser.stop()
      this.parsers.delete(sourceId)
    }
  }

  getStatus(sourceId: string): { connected: boolean; active: boolean; reconnectCount: number } | null {
    const parser = this.parsers.get(sourceId)
    return parser ? parser.getStatus() : null
  }

  getAllStatuses(): Map<string, { connected: boolean; active: boolean; reconnectCount: number }> {
    const statuses = new Map<string, { connected: boolean; active: boolean; reconnectCount: number }>()
    for (const [sourceId, parser] of this.parsers) {
      statuses.set(sourceId, parser.getStatus())
    }
    return statuses
  }

  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = []
    for (const sourceId of this.parsers.keys()) {
      stopPromises.push(this.stopSource(sourceId))
    }
    await Promise.all(stopPromises)
  }

  private createParser(source: AudioSource): StreamParser {
    const options = {
      url: source.url,
      timeout: 30000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 3
    }

    switch (source.protocol) {
      case 'RTSP':
        return new RTSPParser(options)
      case 'RTMP':
        return new RTMPParser(options)
      case 'SRT':
        return new SRTParser(options)
      case 'HTTP':
        return new HTTPParser({
          ...options,
          format: source.format || 'MP4'
        })
      default:
        throw new Error(`Unsupported protocol: ${source.protocol}`)
    }
  }

  private setupParserEvents(sourceId: string, parser: StreamParser): void {
    parser.on('frame', (frame: StreamFrame) => {
      this.options.onFrame?.(sourceId, frame)
    })

    parser.on('info', (info: StreamInfo) => {
      this.options.onInfo?.(sourceId, info)
    })

    parser.on('error', (error: Error) => {
      this.options.onError?.(sourceId, error)
    })

    parser.on('connected', () => {
      this.options.onConnected?.(sourceId)
    })

    parser.on('disconnected', () => {
      this.options.onDisconnected?.(sourceId)
    })
  }

  getActiveSources(): string[] {
    const activeSources: string[] = []
    for (const [sourceId, parser] of this.parsers) {
      if (parser.getStatus().active) {
        activeSources.push(sourceId)
      }
    }
    return activeSources
  }

  getConnectedSources(): string[] {
    const connectedSources: string[] = []
    for (const [sourceId, parser] of this.parsers) {
      if (parser.getStatus().connected) {
        connectedSources.push(sourceId)
      }
    }
    return connectedSources
  }
}

export const streamManager = new StreamManager()
