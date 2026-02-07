export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export type AnomalyType =
  | 'stream_interrupted'
  | 'frame_loss'
  | 'audio_missing'
  | 'video_black'
  | 'video_freeze'
  | 'low_frame_rate'
  | 'high_bitrate'
  | 'low_bitrate'
  | 'connection_failed'
  | 'timeout'

export interface AnomalyDetectionConfig {
  enabled: boolean
  frameRateThreshold: number
  frameRateThresholdDuration: number
  blackScreenThreshold: number
  blackScreenThresholdDuration: number
  freezeThreshold: number
  freezeThresholdDuration: number
  audioSilenceThreshold: number
  audioSilenceThresholdDuration: number
  bitrateLowThreshold: number
  bitrateHighThreshold: number
}

export interface AnomalyEvent {
  id: string
  sourceId: string
  sourceName: string
  type: AnomalyType
  severity: AnomalySeverity
  message: string
  timestamp: number
  duration?: number
  resolved: boolean
  resolvedAt?: number
  metadata?: Record<string, any>
}

export interface StreamStatistics {
  sourceId: string
  frameRate: number
  bitrate: number
  audioLevel: number
  lastFrameTime: number
  consecutiveFrameLossCount: number
  consecutiveBlackFrameCount: number
  consecutiveFreezeFrameCount: number
  consecutiveAudioSilenceCount: number
  videoBlack: boolean
  videoFrozen: boolean
  audioSilent: boolean
}

export interface DetectionResult {
  hasAnomaly: boolean
  anomalies: AnomalyEvent[]
  statistics: StreamStatistics
}
