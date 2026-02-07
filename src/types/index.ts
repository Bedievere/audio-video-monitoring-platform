export interface AudioSource {
  id: string
  name: string
  url: string
  protocol: 'RTSP' | 'RTMP' | 'SRT' | 'HTTP'
  format?: 'MP4' | 'HLS' | 'DASH'
  status: 'connected' | 'disconnected' | 'error'
  createdAt: Date
  updatedAt: Date
}

export interface StreamFrame {
  type: 'video' | 'audio'
  timestamp: number
  data: Buffer
  codec: string
  keyFrame?: boolean
}

export interface StreamInfo {
  videoCodec: string
  audioCodec: string
  width: number
  height: number
  frameRate: number
  sampleRate: number
  channels: number
}

export interface DecodedFrame {
  type: 'video' | 'audio'
  timestamp: number
  width?: number
  height?: number
  data: Buffer
  format: string
}

export interface VideoFrame {
  width: number
  height: number
  data: Buffer
  timestamp: number
}

export interface AudioFrame {
  data: Buffer
  sampleRate: number
  channels: number
  timestamp: number
}

export type AnomalyType =
  | 'black_screen'
  | 'snow_screen'
  | 'static_screen'
  | 'audio_loss'
  | 'low_volume'
  | 'high_volume'
  | 'signal_loss'

export interface AnomalyEvent {
  id: string
  type: AnomalyType
  sourceId: string
  sourceName: string
  startTime: Date
  endTime?: Date
  duration?: number
  details: Record<string, any>
  recordingFilePath?: string
  createdAt: Date
  updatedAt: Date
}

export interface AlertConfig {
  email: {
    enabled: boolean
    smtpHost: string
    smtpPort: number
    username: string
    password: string
    to: string[]
  }
  instantMessage: {
    enabled: boolean
    type: 'wechat' | 'dingtalk'
    webhookUrl: string
  }
  sound: {
    enabled: boolean
    volume: number
    filePath: string
  }
}

export interface DetectionConfig {
  blackScreenThreshold: number
  snowScreenThreshold: number
  staticScreenTimeout: number
  audioLossTimeout: number
  lowVolumeThreshold: number
  highVolumeThreshold: number
  signalLossTimeout: number | { network: number; http: number }
}

export interface RecordingConfig {
  enabled: boolean
  preRecordDuration: number
  postRecordDuration: number
  storagePath: string
  maxRetentionDays: number
}

export interface RecordingFile {
  id: string
  anomalyId: string
  sourceId: string
  sourceName: string
  anomalyType: string
  filePath: string
  startTime: Date
  endTime: Date
  duration: number
  fileSize: number
}

export interface SystemConfig {
  sources: AudioSource[]
  alert: AlertConfig
  detection: DetectionConfig
  recording: RecordingConfig
  alertFrequency: {
    emailInterval: number
    instantMessageInterval: number
  }
}

export interface AnomalyFilter {
  sourceId?: string
  startDate?: Date
  endDate?: Date
  type?: AnomalyType
}

declare global {
  interface Window {
    electronAPI: {
      sources: {
        getAll: () => Promise<AudioSource[]>
        getById: (id: string) => Promise<AudioSource | null>
        add: (source: Partial<AudioSource>) => Promise<void>
        update: (id: string, source: Partial<AudioSource>) => Promise<void>
        delete: (id: string) => Promise<void>
        updateStatus: (id: string, status: AudioSource['status']) => Promise<void>
      }
      anomalies: {
        getAll: (filters?: AnomalyFilter) => Promise<AnomalyEvent[]>
        record: (anomaly: Partial<AnomalyEvent>) => Promise<void>
        update: (id: string, updates: Partial<AnomalyEvent>) => Promise<void>
        exportToCSV: (anomalies: AnomalyEvent[]) => Promise<string>
      }
      config: {
        get: () => Promise<SystemConfig>
        update: (config: Partial<SystemConfig>) => Promise<void>
        save: () => Promise<void>
        load: () => Promise<void>
      }
      recordings: {
        getByAnomaly: (anomalyId: string) => Promise<RecordingFile[]>
        download: (recordingId: string) => Promise<Buffer>
        cleanup: () => Promise<void>
      }
      alerts: {
        sendTest: (alert: any) => Promise<void>
      }
      monitoring: {
        start: (sourceId: string) => Promise<void>
        stop: (sourceId: string) => Promise<void>
        getStatus: (sourceId: string) => Promise<any>
      }
      stream: {
        onFrame: (callback: (data: { sourceId: string; frame: StreamFrame }) => void) => () => void
        onInfo: (callback: (data: { sourceId: string; info: StreamInfo }) => void) => () => void
        onError: (callback: (data: { sourceId: string; error: string }) => void) => () => void
        onConnected: (callback: (data: { sourceId: string }) => void) => () => void
        onDisconnected: (callback: (data: { sourceId: string }) => void) => () => void
      }
    }
  }
}
