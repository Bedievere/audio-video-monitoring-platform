import dgram from 'dgram'
import { StreamParser } from './parser.interface'
import { StreamFrame } from '../types'

export class SRTParser extends StreamParser {
  private socket?: dgram.Socket
  private srtUrl: URL
  private remoteHost: string
  private remotePort: number

  constructor(options: { url: string; timeout?: number; reconnectInterval?: number; maxReconnectAttempts?: number }) {
    super(options)
    this.srtUrl = new URL(options.url)
    this.remoteHost = this.srtUrl.hostname
    this.remotePort = parseInt(this.srtUrl.port || '9000', 10)
  }

  async connect(): Promise<void> {
    try {
      this.socket = dgram.createSocket('udp4')

      const handshakePackets = this.buildSRTHandshake()

      for (const packet of handshakePackets) {
        this.socket.send(packet, this.remotePort, this.remoteHost)
      }

      this.socket.on('message', (data: Buffer) => {
        this.handleSRTData(data)
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

      this.isConnected = true
      this.reconnectCount = 0
      this.emit('connected')

    } catch (error) {
      this.emit('error', error as Error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    const shutdownPacket = this.buildSRTShutdown()
    this.socket?.send(shutdownPacket, this.remotePort, this.remoteHost)

    if (this.socket) {
      this.socket.close()
      this.socket = undefined
    }

    this.isConnected = false
    this.emit('disconnected')
  }

  private buildSRTHandshake(): Buffer[] {
    const packets: Buffer[] = []

    const version = Buffer.alloc(4)
    version.writeUInt32BE(0x0103, 0)

    const flags = Buffer.alloc(4)
    flags.writeUInt32BE(0x00, 0)

    const srtSocketId = Buffer.alloc(4)
    srtSocketId.writeUInt32BE(0x12345678, 0)

    const synCookie = Buffer.alloc(4)
    synCookie.writeUInt32BE(0x00, 0)

    const peerIpAddr = Buffer.alloc(4)
    peerIpAddr.writeUInt32BE(0x00, 0)

    const packet = Buffer.concat([version, flags, srtSocketId, synCookie, peerIpAddr])
    packets.push(packet)

    return packets
  }

  private buildSRTShutdown(): Buffer {
    const buffer = Buffer.alloc(16)
    buffer.writeUInt32BE(0x02, 0)
    return buffer
  }

  private handleSRTData(data: Buffer): void {
    if (data.length < 20) return

    const controlType = data.readUInt32BE(0)

    if (controlType === 0x00) {
      this.parseSRTDataPacket(data.subarray(16))
    }
  }

  private parseSRTDataPacket(data: Buffer): void {
    const frame = this.parse(data)
    if (frame) {
      this.emit('frame', frame)
    }
  }

  private parseRTPHeader(buffer: Buffer): { timestamp: number; payloadType: number; marker: boolean } | null {
    if (buffer.length < 12) return null

    const firstByte = buffer[0]
    const version = (firstByte >> 6) & 0x03

    if (version !== 2) return null

    const marker = ((buffer[1] >> 7) & 0x01) === 1
    const payloadType = buffer[1] & 0x7F
    const timestamp = buffer.readUInt32BE(4)

    return { timestamp, payloadType, marker }
  }

  parse(buffer: Buffer): StreamFrame | null {
    const header = this.parseRTPHeader(buffer)
    if (!header) return null

    const offset = 12
    const payload = buffer.subarray(offset)

    return {
      type: this.isVideoPayloadType(header.payloadType) ? 'video' : 'audio',
      timestamp: header.timestamp,
      data: payload,
      codec: this.getCodecName(header.payloadType),
      keyFrame: header.marker
    }
  }

  private isVideoPayloadType(pt: number): boolean {
    return pt >= 96 && pt <= 127
  }

  private getCodecName(pt: number): string {
    const commonPayloadTypes: Record<number, string> = {
      96: 'H264',
      97: 'H265',
      98: 'VP8',
      99: 'VP9',
      0: 'PCMU',
      8: 'PCMA',
      9: 'G722',
      10: 'L16',
      11: 'L24'
    }
    return commonPayloadTypes[pt] || `PT${pt}`
  }
}
