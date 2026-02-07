import { StreamParser } from './parser.interface'
import { StreamFrame } from '../types'

export class RTSPParser extends StreamParser {
  private socket?: any
  private sessionId?: string
  private cseq: number = 1
  private rtspUrl: URL

  constructor(options: { url: string; timeout?: number; reconnectInterval?: number; maxReconnectAttempts?: number }) {
    super(options)
    this.rtspUrl = new URL(options.url.replace('rtsp://', 'http://'))
  }

  async connect(): Promise<void> {
    try {
      const net = await import('net')
      const tls = await import('tls')

      const isSecure = this.url.startsWith('rtsps://')
      const portNum = isSecure ? 322 : 554
      const port = this.rtspUrl.port || String(portNum)

      const connectOptions = {
        host: this.rtspUrl.hostname,
        port: parseInt(port, 10),
        timeout: this.timeout
      }

      if (isSecure) {
        this.socket = tls.connect(connectOptions)
      } else {
        this.socket = net.connect(connectOptions)
      }

      this.socket.on('connect', () => {
        this.sendDESCRIBE()
      })

      this.socket.on('data', (data: Buffer) => {
        this.handleResponse(data)
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
    if (this.sessionId && this.isConnected) {
      this.sendTEARDOWN()
    }
    if (this.socket) {
      this.socket.destroy()
      this.socket = undefined
    }
    this.sessionId = undefined
    this.isConnected = false
    this.emit('disconnected')
  }

  private sendDESCRIBE(): void {
    const request = this.buildRequest('DESCRIBE')
    this.sendRequest(request)
  }

  private sendSETUP(_controlUrl: string): void {
    const request = this.buildRequest('SETUP', {
      Transport: 'RTP/AVP;unicast;client_port=5000-5001'
    })
    this.sendRequest(request)
  }

  private sendTEARDOWN(): void {
    const request = this.buildRequest('TEARDOWN')
    this.sendRequest(request)
  }

  private buildRequest(
    method: string,
    headers: Record<string, string> = {}
  ): string {
    const path = this.rtspUrl.pathname || '/'
    const baseHeaders: Record<string, string> = {
      'CSeq': String(this.cseq++),
      'User-Agent': 'AudioVideoMonitor/1.0'
    }

    if (this.sessionId) {
      baseHeaders['Session'] = this.sessionId
    }

    const allHeaders = { ...baseHeaders, ...headers }
    const headerLines = Object.entries(allHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\r\n')

    return `${method} ${path} RTSP/1.0\r\n${headerLines}\r\n\r\n`
  }

  private sendRequest(request: string): void {
    if (this.socket) {
      this.socket.write(request)
    }
  }

  private handleResponse(data: Buffer): void {
    const response = data.toString('utf-8')
    const lines = response.split('\r\n')

    if (lines.length === 0) return

    const statusLine = lines[0]
    const parts = statusLine.split(' ')
    const statusCode = parts[1]

    if (statusCode === '200') {
      for (const line of lines) {
        if (line.startsWith('Session:')) {
          this.sessionId = line.split(':')[1].trim()
        }
      }

      if (!this.isConnected) {
        this.isConnected = true
        this.reconnectCount = 0
        this.emit('connected')
        this.sendSETUP(this.rtspUrl.pathname || '/')
      }
    }
  }

  parse(buffer: Buffer): StreamFrame | null {
    if (buffer.length < 12) return null

    const firstByte = buffer[0]
    const version = (firstByte >> 6) & 0x03

    if (version !== 2) return null

    const padding = (firstByte >> 5) & 0x01
    const extension = (firstByte >> 4) & 0x01
    const csrcCount = firstByte & 0x0F
    const marker = (buffer[1] >> 7) & 0x01
    const payloadType = buffer[1] & 0x7F

    let offset = 12 + csrcCount * 4

    if (extension) {
      if (offset + 4 > buffer.length) return null
      const extensionLength = buffer.readUInt16BE(offset + 2)
      offset += 4 + extensionLength * 4
    }

    if (padding) {
      const paddingLength = buffer[offset - 1]
      offset -= paddingLength
    }

    if (offset >= buffer.length) return null

    const payload = buffer.subarray(offset)
    const timestamp = buffer.readUInt32BE(4)

    return {
      type: this.isVideoPayloadType(payloadType) ? 'video' : 'audio',
      timestamp,
      data: payload,
      codec: this.getCodecName(payloadType),
      keyFrame: marker === 1
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
      9: 'G722'
    }
    return commonPayloadTypes[pt] || `PT${pt}`
  }
}
