import { StreamParser } from './parser.interface'
import { StreamFrame } from '../types'

export enum HTTPStreamFormat {
  MP4 = 'MP4',
  HLS = 'HLS',
  DASH = 'DASH'
}

export class HTTPParser extends StreamParser {
  private format: HTTPStreamFormat
  private controller?: AbortController
  private reader?: ReadableStreamDefaultReader<Uint8Array>
  private baseUrl: string

  constructor(options: {
    url: string
    format: 'MP4' | 'HLS' | 'DASH'
    timeout?: number
    reconnectInterval?: number
    maxReconnectAttempts?: number
  }) {
    super(options)
    this.format = options.format as HTTPStreamFormat
    this.baseUrl = options.url
  }

  async connect(): Promise<void> {
    try {
      this.controller = new AbortController()

      switch (this.format) {
        case HTTPStreamFormat.MP4:
          await this.connectMP4()
          break
        case HTTPStreamFormat.HLS:
          await this.connectHLS()
          break
        case HTTPStreamFormat.DASH:
          await this.connectDASH()
          break
      }

      this.isConnected = true
      this.reconnectCount = 0
      this.emit('connected')

    } catch (error) {
      this.emit('error', error as Error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.isActive = false

    if (this.reader) {
      try {
        await this.reader.cancel()
      } catch {
        // Ignore cancellation errors
      }
      this.reader = undefined
    }

    if (this.controller) {
      this.controller.abort()
      this.controller = undefined
    }

    this.isConnected = false
    this.emit('disconnected')
  }

  private async connectMP4(): Promise<void> {
    const response = await fetch(this.baseUrl, {
      signal: this.controller?.signal,
      headers: {
        'Range': 'bytes=0-'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    this.reader = response.body.getReader()

    this.processMP4Stream(this.reader)
  }

  private async connectHLS(): Promise<void> {
    const manifestResponse = await fetch(this.baseUrl, {
      signal: this.controller?.signal
    })

    if (!manifestResponse.ok) {
      throw new Error(`Failed to fetch HLS manifest: ${manifestResponse.status}`)
    }

    const manifestText = await manifestResponse.text()
    const segments = this.parseHLSManifest(manifestText)

    await this.playHLSSegments(segments)
  }

  private parseHLSManifest(manifest: string): string[] {
    const segments: string[] = []
    const lines = manifest.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        const url = trimmed.startsWith('http') ? trimmed : this.resolveURL(trimmed)
        segments.push(url)
      }
    }

    return segments
  }

  private resolveURL(relativePath: string): string {
    const url = new URL(this.baseUrl)
    const pathParts = url.pathname.split('/')
    pathParts.pop()
    pathParts.push(relativePath)
    url.pathname = pathParts.join('/')
    return url.toString()
  }

  private async playHLSSegments(segments: string[]): Promise<void> {
    let currentIndex = 0

    const playNextSegment = async () => {
      if (!this.isActive || currentIndex >= segments.length) {
        return
      }

      try {
        const segmentUrl = segments[currentIndex]
        const segmentResponse = await fetch(segmentUrl, {
          signal: this.controller?.signal
        })

        if (segmentResponse.ok && segmentResponse.body) {
          const reader = segmentResponse.body.getReader()
          const chunks: Uint8Array[] = []

          while (!this.isActive) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          while (this.isActive) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
          }

          const buffer = Buffer.concat(chunks)
          this.emit('frame', {
            type: 'video',
            timestamp: Date.now(),
            data: buffer,
            codec: 'H264'
          })
        }

        currentIndex++

        if (this.isActive) {
          setTimeout(() => playNextSegment(), 33)
        }
      } catch (error) {
        this.emit('error', error as Error)
      }
    }

    playNextSegment()
  }

  private async connectDASH(): Promise<void> {
    const mpdResponse = await fetch(this.baseUrl, {
      signal: this.controller?.signal
    })

    if (!mpdResponse.ok) {
      throw new Error(`Failed to fetch DASH manifest: ${mpdResponse.status}`)
    }

    const mpdText = await mpdResponse.text()
    const segments = this.parseDASHManifest(mpdText)

    await this.playDASHSegments(segments)
  }

  private parseDASHManifest(mpd: string): string[] {
    const segments: string[] = []
    const segmentPattern = /<BaseURL>(.*?)<\/BaseURL>/g
    const initializationPattern = /<Initialization[^>]*sourceURL="([^"]+)"/g

    let match
    while ((match = segmentPattern.exec(mpd)) !== null) {
      const url = match[1]
      const fullUrl = url.startsWith('http') ? url : this.resolveURL(url)
      segments.push(fullUrl)
    }

    while ((match = initializationPattern.exec(mpd)) !== null) {
      const url = match[1]
      const fullUrl = url.startsWith('http') ? url : this.resolveURL(url)
      segments.unshift(fullUrl)
    }

    return segments
  }

  private async playDASHSegments(segments: string[]): Promise<void> {
    await this.playHLSSegments(segments)
  }

  private async processMP4Stream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const bufferChunks: Uint8Array[] = []
    let totalBytes = 0

    while (this.isActive) {
      try {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        if (value) {
          bufferChunks.push(value)
          totalBytes += value.length

          const buffer = Buffer.concat(bufferChunks)
          const frames = this.extractMP4Frames(buffer)

          for (const frame of frames) {
            this.emit('frame', frame)
          }

          bufferChunks.length = 0
          bufferChunks.push(buffer.subarray(totalBytes))
        }
      } catch (error) {
        this.emit('error', error as Error)
        break
      }
    }
  }

  private extractMP4Frames(buffer: Buffer): StreamFrame[] {
    const frames: StreamFrame[] = []
    let offset = 0

    while (offset + 8 <= buffer.length) {
      const boxSize = buffer.readUInt32BE(offset)
      const boxType = buffer.subarray(offset + 4, offset + 8).toString('ascii')

      if (boxSize < 8 || offset + boxSize > buffer.length) {
        break
      }

      if (boxType === 'mdat') {
        const mdatOffset = offset + 8
        const mdatData = buffer.subarray(mdatOffset, offset + boxSize)

        const extractedFrames = this.parseNalUnits(mdatData)
        frames.push(...extractedFrames)
      }

      offset += boxSize
    }

    return frames
  }

  private parseNalUnits(data: Buffer): StreamFrame[] {
    const frames: StreamFrame[] = []
    let offset = 0

    while (offset < data.length) {
      const nalHeader = this.findNalHeader(data, offset)
      if (nalHeader === -1) break

      const startCodeLength = data[nalHeader] === 0x00 ? 4 : 3
      const nextNalHeader = this.findNalHeader(data, nalHeader + startCodeLength)

      const nalEnd = nextNalHeader === -1 ? data.length : nextNalHeader
      const nalData = data.subarray(nalHeader + startCodeLength, nalEnd)

      if (nalData.length > 0) {
        const frame = this.parseH264NalUnit(nalData)
        if (frame) {
          frames.push(frame)
        }
      }

      offset = nalEnd
    }

    return frames
  }

  private findNalHeader(data: Buffer, offset: number): number {
    while (offset < data.length - 3) {
      if (data[offset] === 0x00 && data[offset + 1] === 0x00) {
        if (data[offset + 2] === 0x01) {
          return offset
        }
        if (data[offset + 2] === 0x00 && offset < data.length - 3 && data[offset + 3] === 0x01) {
          return offset
        }
      }
      offset++
    }
    return -1
  }

  private parseH264NalUnit(data: Buffer): StreamFrame | null {
    if (data.length === 0) return null

    const nalType = data[0] & 0x1F

    return {
      type: 'video',
      timestamp: Date.now(),
      data: data,
      codec: 'H264',
      keyFrame: nalType === 5 || nalType === 7 || nalType === 8
    }
  }

  parse(buffer: Buffer): StreamFrame | null {
    if (this.format === HTTPStreamFormat.MP4) {
      const frames = this.extractMP4Frames(buffer)
      return frames.length > 0 ? frames[0] : null
    }

    if (this.format === HTTPStreamFormat.HLS || this.format === HTTPStreamFormat.DASH) {
      return {
        type: 'video',
        timestamp: Date.now(),
        data: buffer,
        codec: 'H264'
      }
    }

    return null
  }
}
