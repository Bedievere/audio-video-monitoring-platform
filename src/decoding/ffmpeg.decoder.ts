import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { Decoder, DecoderOptions } from './decoder.interface'
import { StreamFrame, DecodedFrame, VideoFrame, AudioFrame } from '../types'

const execAsync = promisify(exec)

export class FFmpegDecoder extends Decoder {
  private ffmpegPath: string
  private process?: any
  private frameQueue: DecodedFrame[] = []
  private maxQueueSize: number = 10

  constructor(options: DecoderOptions = {}) {
    super(options)
    this.ffmpegPath = this.findFFmpeg()
  }

  private findFFmpeg(): string {
    const possiblePaths = [
      process.env.FFMPEG_PATH,
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      path.join(process.resourcesPath || '', 'ffmpeg', 'ffmpeg'),
      path.join(process.cwd(), 'ffmpeg', 'ffmpeg')
    ]

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        return p
      }
    }

    return 'ffmpeg'
  }

  async initialize(): Promise<void> {
    try {
      await execAsync(`${this.ffmpegPath} -version`)
      this.isInitialized = true
      this.emit('ready')
    } catch (error) {
      throw new Error(`FFmpeg not found or not executable: ${error}`)
    }
  }

  decode(frame: StreamFrame): DecodedFrame | null {
    this.ensureInitialized()

    if (!this.process) {
      this.startFFmpegProcess()
    }

    if (frame.type === 'video') {
      return this.decodeVideoFrame(frame)
    } else {
      return this.decodeAudioFrame(frame)
    }
  }

  private startFFmpegProcess(): void {
    const args = [
      '-i', 'pipe:0',
      '-c:v', 'rawvideo',
      '-pix_fmt', 'bgr24',
      '-f', 'image2pipe',
      '-an',
      '-'
    ]

    if (this.enableHardwareAcceleration) {
      args.unshift('-hwaccel', 'auto')
    }

    this.process = spawn(this.ffmpegPath, args)

    this.process.on('error', (error: Error) => {
      this.emit('error', error)
    })

    this.process.on('exit', () => {
      this.process = undefined
    })
  }

  private decodeVideoFrame(frame: StreamFrame): DecodedFrame | null {
    if (!this.process || this.process.stdin.writable) {
      this.process?.stdin.write(frame.data)
    }

    const expectedSize = this.width * this.height * 3

    if (this.frameQueue.length > this.maxQueueSize) {
      return this.frameQueue.shift() || null
    }

    const decodedFrame: DecodedFrame = {
      type: 'video',
      timestamp: frame.timestamp,
      width: this.width,
      height: this.height,
      data: Buffer.alloc(expectedSize),
      format: 'bgr24'
    }

    this.frameQueue.push(decodedFrame)
    return decodedFrame
  }

  private decodeAudioFrame(frame: StreamFrame): DecodedFrame | null {
    const bufferSize = frame.data.length

    const decodedFrame: DecodedFrame = {
      type: 'audio',
      timestamp: frame.timestamp,
      data: Buffer.alloc(bufferSize),
      format: 's16le'
    }

    return decodedFrame
  }

  decodeToFrame(frame: StreamFrame): VideoFrame | AudioFrame | null {
    const decoded = this.decode(frame)

    if (!decoded) return null

    if (decoded.type === 'video') {
      return {
        width: decoded.width || this.width,
        height: decoded.height || this.height,
        data: decoded.data,
        timestamp: decoded.timestamp
      }
    } else {
      return {
        data: decoded.data,
        sampleRate: this.sampleRate,
        channels: this.channels,
        timestamp: decoded.timestamp
      }
    }
  }

  flush(): void {
    this.frameQueue = []

    if (this.process && this.process.stdin.writable) {
      this.process.stdin.end()
    }
  }

  async reset(): Promise<void> {
    this.flush()

    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = undefined
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  async decodeImage(buffer: Buffer, codec: string = 'h264'): Promise<VideoFrame> {
    const tempInput = path.join(process.cwd(), `temp_input_${Date.now()}.bin`)
    const tempOutput = path.join(process.cwd(), `temp_output_${Date.now()}.raw`)

    try {
      fs.writeFileSync(tempInput, buffer)

      await execAsync(
        `${this.ffmpegPath} -f ${codec} -i ${tempInput} -c:v rawvideo -pix_fmt bgr24 ${tempOutput}`
      )

      const outputBuffer = fs.readFileSync(tempOutput)
      const expectedSize = this.width * this.height * 3

      if (outputBuffer.length < expectedSize) {
        throw new Error('Decoded frame too small')
      }

      return {
        width: this.width,
        height: this.height,
        data: outputBuffer.subarray(0, expectedSize),
        timestamp: Date.now()
      }
    } finally {
      if (fs.existsSync(tempInput)) {
        fs.unlinkSync(tempInput)
      }
      if (fs.existsSync(tempOutput)) {
        fs.unlinkSync(tempOutput)
      }
    }
  }

  getCodecCapabilities(codec: string): { supported: boolean; width: number[]; height: number[] } {
    const supportedCodecs = [
      'h264', 'h265', 'hevc', 'vp8', 'vp9', 'av1',
      'aac', 'mp3', 'opus', 'pcm', 'pcm_u8', 'pcm_s16le'
    ]

    return {
      supported: supportedCodecs.includes(codec.toLowerCase()),
      width: [640, 1280, 1920, 2560, 3840],
      height: [360, 720, 1080, 1440, 2160]
    }
  }

  isInitializedCheck(): boolean {
    return this.isInitialized
  }
}
