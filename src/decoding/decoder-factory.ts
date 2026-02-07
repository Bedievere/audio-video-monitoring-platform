import { Decoder, DecoderFactory, DecoderOptions } from './decoder.interface'
import { FFmpegDecoder } from './ffmpeg.decoder'
import { StreamFrame, DecodedFrame } from '../types'

export class SimpleH264Decoder extends Decoder {
  constructor(options: DecoderOptions = {}) {
    super(options)
  }

  async initialize(codec: string): Promise<void> {
    if (codec.toLowerCase() !== 'h264') {
      throw new Error(`SimpleH264Decoder only supports H264, got ${codec}`)
    }
    this.isInitialized = true
    this.emit('ready')
  }

  decode(frame: StreamFrame): DecodedFrame | null {
    this.ensureInitialized()

    if (frame.codec !== 'H264' && frame.codec !== 'h264') {
      return null
    }

    return {
      type: frame.type,
      timestamp: frame.timestamp,
      width: this.width,
      height: this.height,
      data: frame.data,
      format: 'h264'
    }
  }

  flush(): void {
  }

  async reset(): Promise<void> {
  }
}

export class MockDecoder extends Decoder {
  constructor(options: DecoderOptions = {}) {
    super(options)
  }

  async initialize(): Promise<void> {
    this.isInitialized = true
    this.emit('ready')
  }

  decode(frame: StreamFrame): DecodedFrame | null {
    this.ensureInitialized()

    if (frame.type === 'video') {
      const frameSize = this.width * this.height * 3
      const mockData = Buffer.alloc(frameSize)

      for (let i = 0; i < frameSize; i += 3) {
        mockData[i] = Math.floor(Math.random() * 128)
        mockData[i + 1] = Math.floor(Math.random() * 128)
        mockData[i + 2] = Math.floor(Math.random() * 128)
      }

      return {
        type: 'video',
        timestamp: frame.timestamp,
        width: this.width,
        height: this.height,
        data: mockData,
        format: 'rgb24'
      }
    } else {
      const sampleSize = this.sampleRate / 10
      const mockData = Buffer.alloc(sampleSize * this.channels * 2)

      return {
        type: 'audio',
        timestamp: frame.timestamp,
        data: mockData,
        format: 's16le'
      }
    }
  }

  flush(): void {
  }

  async reset(): Promise<void> {
  }
}

export class DecoderFactoryImpl implements DecoderFactory {
  private options: DecoderOptions

  constructor(options: DecoderOptions = {}) {
    this.options = options
  }

  create(codec: string): Decoder {
    const normalizedCodec = codec.toLowerCase()

    switch (normalizedCodec) {
      case 'h264':
      case 'h265':
      case 'aac':
      case 'mp3':
      case 'pcm':
        return new FFmpegDecoder(this.options)
      default:
        return new FFmpegDecoder(this.options)
    }
  }

  static create(codec: string, options?: DecoderOptions): Decoder {
    const factory = new DecoderFactoryImpl(options)
    return factory.create(codec)
  }
}

export function createDecoder(codec: string, options?: DecoderOptions): Decoder {
  return DecoderFactoryImpl.create(codec, options)
}
