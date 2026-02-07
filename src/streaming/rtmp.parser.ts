import { StreamParser } from './parser.interface'
import { StreamFrame, StreamInfo } from '../types'

export class RTMPParser extends StreamParser {
  private socket?: any
  private handshakeComplete: boolean = false

  constructor(options: { url: string; timeout?: number; reconnectInterval?: number; maxReconnectAttempts?: number }) {
    super(options)
  }

  async connect(): Promise<void> {
    try {
      const net = await import('net')

      const url = new URL(this.url.replace('rtmps://', 'http://'))
      const isSecure = this.url.startsWith('rtmps://')
      const defaultPort = isSecure ? 443 : 1935
      const portStr = url.port || String(defaultPort)
      const host = url.hostname

      const connectOptions = {
        host,
        port: parseInt(portStr, 10),
        timeout: this.timeout
      }

      this.socket = net.connect(connectOptions)

      this.socket.on('connect', () => {
        this.performHandshake()
      })

      this.socket.on('data', (data: Buffer) => {
        if (!this.handshakeComplete) {
          this.handleHandshakeResponse(data)
        } else {
          this.handleChunk(data)
        }
      })

      this.socket.on('error', (error: Error) => {
        this.emit('error', error)
        this.handleReconnect()
      })

      this.socket.on('close', () => {
        this.isConnected = false
        if (this.isActive) {
          this.handleReconnect()
        }
      })

    } catch (error) {
      this.emit('error', error as Error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy()
      this.socket = undefined
    }
    this.handshakeComplete = false
    this.isConnected = false
    this.emit('disconnected')
  }

  private performHandshake(): void {
    const c0 = Buffer.from([0x03])
    const c1 = this.generateHandshakeChunk()
    this.socket?.write(Buffer.concat([c0, c1]))
  }

  private generateHandshakeChunk(): Buffer {
    const chunk = Buffer.alloc(1536)
    for (let i = 0; i < 1536; i++) {
      chunk[i] = Math.floor(Math.random() * 256)
    }
    return chunk
  }

  private handleHandshakeResponse(data: Buffer): void {
    if (data.length < 1537) return

    const s0 = data[0]
    if (s0 !== 0x03) return

    const s1 = data.subarray(1, 1537)
    const c2 = Buffer.concat([Buffer.from([0x03]), s1])

    this.socket?.write(c2)
    this.handshakeComplete = true

    setTimeout(() => {
      this.sendConnect()
    }, 100)
  }

  private sendConnect(): void {
    const connectPacket = this.buildRTMPPacket({
      type: 0x14,
      streamId: 0,
      timestamp: 0,
      data: this.buildConnectCommand()
    })
    this.socket?.write(connectPacket)
  }

  private buildConnectCommand(): Buffer {
    const appName = this.extractAppName(this.url)

    const amfData: any[] = [
      'connect',
      { app: appName, flashVer: 'FMLE/3.0', type: 'nonprivate' },
      1
    ]

    return this.encodeAMF(amfData)
  }

  private buildRTMPPacket(options: {
    type: number
    streamId: number
    timestamp: number
    data: Buffer
  }): Buffer {
    const { type, streamId, timestamp = 0, data } = options

    const headerType = 0
    const chunkStreamId = 3

    const header = Buffer.alloc(12)
    header[0] = (headerType << 6) | (chunkStreamId & 0x3F)

    if (timestamp < 0xFFFFFF) {
      this.writeUInt24BE(header, timestamp, 1)
    } else {
      this.writeUInt24BE(header, 0xFFFFFF, 1)
    }

    header[4] = (data.length >> 16) & 0xFF
    header[5] = (data.length >> 8) & 0xFF
    header[6] = data.length & 0xFF

    header[7] = type

    header.writeUInt32LE(streamId, 8)

    return Buffer.concat([header, data])
  }

  private writeUInt24BE(buffer: Buffer, value: number, offset: number): void {
    buffer[offset] = (value >> 16) & 0xFF
    buffer[offset + 1] = (value >> 8) & 0xFF
    buffer[offset + 2] = value & 0xFF
  }

  private encodeAMF(data: any[]): Buffer {
    const buffers: Buffer[] = []

    for (const item of data) {
      if (typeof item === 'string') {
        const str = String(item)
        buffers.push(Buffer.from([0x02]))
        buffers.push(Buffer.alloc(2))
        buffers[buffers.length - 1].writeUInt16BE(str.length)
        buffers.push(Buffer.from(str))
      } else if (typeof item === 'number') {
        buffers.push(Buffer.from([0x00]))
        const numBuffer = Buffer.alloc(8)
        numBuffer.writeDoubleBE(item)
        buffers.push(numBuffer)
      } else if (typeof item === 'object' && item !== null) {
        buffers.push(Buffer.from([0x03]))

        const keys = Object.keys(item)
        for (const key of keys) {
          buffers.push(Buffer.alloc(2))
          buffers[buffers.length - 1].writeUInt16BE(key.length)
          buffers.push(Buffer.from(key))

          const value = item[key]
          if (typeof value === 'string') {
            buffers.push(Buffer.from([0x02]))
            buffers.push(Buffer.alloc(2))
            buffers[buffers.length - 1].writeUInt16BE(value.length)
            buffers.push(Buffer.from(value))
          } else if (typeof value === 'number') {
            buffers.push(Buffer.from([0x00]))
            const numBuffer = Buffer.alloc(8)
            numBuffer.writeDoubleBE(value)
            buffers.push(numBuffer)
          }
        }

        buffers.push(Buffer.from([0x00, 0x00, 0x09]))
      }
    }

    return Buffer.concat(buffers)
  }

  private handleChunk(data: Buffer): void {
    if (data.length < 1) return

    const chunk = this.parseChunk(data)
    if (chunk) {
      this.isConnected = true
      this.reconnectCount = 0
      this.emit('connected')

      if (chunk.type === 0x08) {
        this.emit('frame', {
          type: 'audio',
          timestamp: chunk.timestamp,
          data: chunk.data,
          codec: this.getAudioCodec(chunk.data[0])
        })
      } else if (chunk.type === 0x09) {
        this.emit('frame', {
          type: 'video',
          timestamp: chunk.timestamp,
          data: chunk.data,
          codec: 'H264',
          keyFrame: (chunk.data[0] & 0xF0) === 0x10
        })
      } else if (chunk.type === 0x12) {
        const metadata = this.parseMetadata(chunk.data)
        if (metadata) {
          this.emit('info', metadata)
        }
      }
    }
  }

  private parseChunk(data: Buffer): { type: number; timestamp: number; data: Buffer } | null {
    if (data.length < 12) return null

    let offset = 1

    if (data[0] === 0 && data.length >= 2) {
      offset = 2
    } else if (data[0] === 1 && data.length >= 3) {
      offset = 3
    }

    if (data.length < offset + 3) return null

    let timestamp = 0
    if (offset >= 11) {
      timestamp = this.readUInt24BE(data, offset - 11)
    }

    const messageType = data[offset]
    const payload = data.subarray(offset + 3)

    return {
      type: messageType,
      timestamp,
      data: payload
    }
  }

  private readUInt24BE(buffer: Buffer, offset: number): number {
    return (buffer[offset] << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2]
  }

  private parseMetadata(data: Buffer): StreamInfo | null {
    try {
      const decoded = this.decodeAMF(data)
      if (decoded && Array.isArray(decoded)) {
        const metadata = decoded[1] || {}

        return {
          videoCodec: metadata.videocodec || 'H264',
          audioCodec: metadata.audiocodec || 'AAC',
          width: metadata.width || 1920,
          height: metadata.height || 1080,
          frameRate: metadata.framerate || 30,
          sampleRate: metadata.audiosamplerate || 44100,
          channels: metadata.audiochannels || 2
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return null
  }

  private decodeAMF(_data: Buffer): unknown {
    return null
  }

  private getAudioCodec(soundFormat: number): string {
    const codecs: Record<number, string> = {
      0: 'PCM',
      1: 'ADPCM',
      2: 'MP3',
      4: 'Nellymoser',
      7: 'G.711 A-law',
      8: 'G.711 mu-law',
      10: 'AAC',
      11: 'Speex'
    }
    return codecs[soundFormat >> 4] || 'Unknown'
  }

  private extractAppName(url: string): string {
    const match = url.match(new RegExp('rtmps?:\\/\\/[^\\/]+\\/([^\\/]+)'))
    return match ? match[1] : 'live'
  }

  parse(buffer: Buffer): StreamFrame | null {
    const chunk = this.parseChunk(buffer)
    if (!chunk) return null

    if (chunk.type === 0x08) {
      return {
        type: 'audio',
        timestamp: chunk.timestamp,
        data: chunk.data,
        codec: this.getAudioCodec(chunk.data[0])
      }
    } else if (chunk.type === 0x09) {
      return {
        type: 'video',
        timestamp: chunk.timestamp,
        data: chunk.data,
        codec: 'H264',
        keyFrame: (chunk.data[0] & 0xF0) === 0x10
      }
    }

    return null
  }
}
