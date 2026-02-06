import EventEmitter from 'events'
import {
  AnomalyDetectionConfig,
  AnomalyEvent,
  AnomalySeverity,
  AnomalyType,
  StreamStatistics,
  DetectionResult
} from '../types/detection.types'

const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  enabled: true,
  frameRateThreshold: 10,
  frameRateThresholdDuration: 3000,
  blackScreenThreshold: 5,
  blackScreenThresholdDuration: 2000,
  freezeThreshold: 5000,
  freezeThresholdDuration: 2000,
  audioSilenceThreshold: -60,
  audioSilenceThresholdDuration: 5000,
  bitrateLowThreshold: 100,
  bitrateHighThreshold: 10000
}

export class AnomalyDetector extends EventEmitter {
  private config: AnomalyDetectionConfig
  private statistics: Map<string, StreamStatistics>
  private activeAnomalies: Map<string, AnomalyEvent>
  private detectionInterval?: NodeJS.Timeout
  private analysisInterval?: NodeJS.Timeout

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.statistics = new Map()
    this.activeAnomalies = new Map()
  }

  updateConfig(config: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...config }
    this.emit('config-updated', this.config)
  }

  getConfig(): AnomalyDetectionConfig {
    return { ...this.config }
  }

  registerSource(sourceId: string): void {
    if (!this.statistics.has(sourceId)) {
      this.statistics.set(sourceId, {
        sourceId,
        frameRate: 0,
        bitrate: 0,
        audioLevel: 0,
        lastFrameTime: Date.now(),
        consecutiveFrameLossCount: 0,
        consecutiveBlackFrameCount: 0,
        consecutiveFreezeFrameCount: 0,
        consecutiveAudioSilenceCount: 0,
        videoBlack: false,
        videoFrozen: false,
        audioSilent: false
      })
    }
  }

  unregisterSource(sourceId: string): void {
    const stats = this.statistics.get(sourceId)
    if (stats) {
      this.resolveSourceAnomalies(sourceId)
      this.statistics.delete(sourceId)
    }
  }

  processFrame(sourceId: string, frame: {
    data: Buffer
    timestamp: number
    width?: number
    height?: number
    audioLevel?: number
  }): void {
    if (!this.config.enabled) return

    const stats = this.statistics.get(sourceId)
    if (!stats) return

    const now = Date.now()
    const frameInterval = now - stats.lastFrameTime

    stats.lastFrameTime = now

    if (frame.audioLevel !== undefined) {
      stats.audioLevel = frame.audioLevel
      this.detectAudioAnomalies(sourceId, stats)
    }

    if (frame.data && frame.width && frame.height) {
      this.detectVideoAnomalies(sourceId, stats, {
        data: frame.data,
        width: frame.width,
        height: frame.height
      })
    }

    this.updateFrameRate(sourceId, stats, frameInterval)
  }

  processBitrate(sourceId: string, bitrate: number): void {
    if (!this.config.enabled) return

    const stats = this.statistics.get(sourceId)
    if (!stats) return

    stats.bitrate = bitrate
    this.detectBitrateAnomalies(sourceId, stats)
  }

  detectAll(): Map<string, DetectionResult> {
    const results = new Map<string, DetectionResult>()

    for (const [sourceId, stats] of this.statistics.entries()) {
      const result: DetectionResult = {
        hasAnomaly: false,
        anomalies: [],
        statistics: { ...stats }
      }

      this.detectLowFrameRate(sourceId, stats, result)
      this.detectVideoFreeze(sourceId, stats, result)

      if (result.anomalies.length > 0) {
        result.hasAnomaly = true
      }

      results.set(sourceId, result)
    }

    return results
  }

  private updateFrameRate(sourceId: string, stats: StreamStatistics, frameInterval: number): void {
    if (frameInterval > 10000) {
      stats.consecutiveFrameLossCount++
    } else {
      stats.consecutiveFrameLossCount = 0
    }

    if (stats.consecutiveFrameLossCount >= 10) {
      this.createAnomaly(sourceId, 'frame_loss', 'medium', '检测到连续丢帧')
      stats.consecutiveFrameLossCount = 0
    }

    stats.frameRate = Math.round(1000 / frameInterval)
  }

  private detectVideoAnomalies(
    sourceId: string,
    stats: StreamStatistics,
    frame: { data: Buffer; width: number; height: number }
  ): void {
    const isBlackScreen = this.detectBlackScreen(frame)
    const isFrozenScreen = this.detectFrozenScreen(stats)

    if (isBlackScreen) {
      stats.consecutiveBlackFrameCount++
      if (stats.consecutiveBlackFrameCount >= this.config.blackScreenThreshold) {
        if (!stats.videoBlack) {
          stats.videoBlack = true
          this.createAnomaly(
            sourceId,
            'video_black',
            'high',
            `检测到黑屏持续超过 ${this.config.blackScreenThresholdDuration / 1000} 秒`,
            { threshold: this.config.blackScreenThresholdDuration }
          )
        }
      }
    } else {
      stats.consecutiveBlackFrameCount = 0
      if (stats.videoBlack) {
        stats.videoBlack = false
        this.resolveAnomalyByType(sourceId, 'video_black')
      }
    }

    if (isFrozenScreen) {
      stats.consecutiveFreezeFrameCount++
      if (stats.consecutiveFreezeFrameCount >= 30) {
        if (!stats.videoFrozen) {
          stats.videoFrozen = true
          this.createAnomaly(
            sourceId,
            'video_freeze',
            'high',
            `检测到画面冻结持续超过 ${this.config.freezeThreshold / 1000} 秒`,
            { threshold: this.config.freezeThresholdDuration }
          )
        }
      }
    } else {
      stats.consecutiveFreezeFrameCount = 0
      if (stats.videoFrozen) {
        stats.videoFrozen = false
        this.resolveAnomalyByType(sourceId, 'video_freeze')
      }
    }
  }

  private detectBlackScreen(frame: { data: Buffer; width: number; height: number }): boolean {
    const { data } = frame
    const sampleSize = Math.min(data.length, 10000)
    let sum = 0

    for (let i = 0; i < sampleSize; i += 3) {
      sum += data[i] + data[i + 1] + data[i + 2]
    }

    const avgBrightness = sum / (sampleSize / 3)
    return avgBrightness < 10
  }

  private detectFrozenScreen(stats: StreamStatistics): boolean {
    const now = Date.now()
    const freezeTime = now - stats.lastFrameTime
    return freezeTime > this.config.freezeThreshold
  }

  private detectAudioAnomalies(sourceId: string, stats: StreamStatistics): void {
    const isSilent = stats.audioLevel < this.config.audioSilenceThreshold

    if (isSilent) {
      stats.consecutiveAudioSilenceCount++
      if (stats.consecutiveAudioSilenceCount >= 50) {
        if (!stats.audioSilent) {
          stats.audioSilent = true
          this.createAnomaly(
            sourceId,
            'audio_missing',
            'medium',
            `检测到音频静音持续超过 ${this.config.audioSilenceThresholdDuration / 1000} 秒`,
            { threshold: this.config.audioSilenceThresholdDuration }
          )
        }
      }
    } else {
      stats.consecutiveAudioSilenceCount = 0
      if (stats.audioSilent) {
        stats.audioSilent = false
        this.resolveAnomalyByType(sourceId, 'audio_missing')
      }
    }
  }

  private detectBitrateAnomalies(sourceId: string, stats: StreamStatistics): void {
    const { bitrateLowThreshold, bitrateHighThreshold } = this.config

    if (stats.bitrate > 0 && stats.bitrate < bitrateLowThreshold) {
      const anomalyId = this.findActiveAnomalyId(sourceId, 'low_bitrate')
      if (!anomalyId) {
        this.createAnomaly(
          sourceId,
          'low_bitrate',
          'low',
          `码率过低: ${stats.bitrate} kbps (阈值: ${bitrateLowThreshold} kbps)`
        )
      }
    } else {
      this.resolveAnomalyByType(sourceId, 'low_bitrate')
    }

    if (stats.bitrate > bitrateHighThreshold) {
      const anomalyId = this.findActiveAnomalyId(sourceId, 'high_bitrate')
      if (!anomalyId) {
        this.createAnomaly(
          sourceId,
          'high_bitrate',
          'low',
          `码率过高: ${stats.bitrate} kbps (阈值: ${bitrateHighThreshold} kbps)`
        )
      }
    } else {
      this.resolveAnomalyByType(sourceId, 'high_bitrate')
    }
  }

  private detectLowFrameRate(
    sourceId: string,
    stats: StreamStatistics,
    result: DetectionResult
  ): void {
    if (stats.frameRate > 0 && stats.frameRate < this.config.frameRateThreshold) {
      const anomalyId = this.findActiveAnomalyId(sourceId, 'low_frame_rate')
      if (!anomalyId) {
        const anomaly = this.createAnomaly(
          sourceId,
          'low_frame_rate',
          'medium',
          `帧率过低: ${stats.frameRate} fps (阈值: ${this.config.frameRateThreshold} fps)`
        )
        result.anomalies.push(anomaly)
      }
    } else {
      this.resolveAnomalyByType(sourceId, 'low_frame_rate')
    }
  }

  private detectVideoFreeze(
    sourceId: string,
    stats: StreamStatistics,
    result: DetectionResult
  ): void {
    if (stats.videoFrozen) {
      const anomalyId = this.findActiveAnomalyId(sourceId, 'video_freeze')
      if (anomalyId) {
        const anomaly = this.activeAnomalies.get(anomalyId)
        if (anomaly) {
          result.anomalies.push(anomaly)
        }
      }
    }
  }

  private createAnomaly(
    sourceId: string,
    type: AnomalyType,
    baseSeverity: AnomalySeverity,
    message: string,
    metadata?: Record<string, any>
  ): AnomalyEvent {
    const id = `${sourceId}-${type}-${Date.now()}`
    const stats = this.statistics.get(sourceId)

    const anomaly: AnomalyEvent = {
      id,
      sourceId,
      sourceName: stats?.sourceId || sourceId,
      type,
      severity: baseSeverity,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata
    }

    this.activeAnomalies.set(id, anomaly)
    this.emit('anomaly-detected', anomaly)

    return anomaly
  }

  private resolveAnomalyByType(sourceId: string, type: AnomalyType): void {
    for (const [id, anomaly] of this.activeAnomalies.entries()) {
      if (anomaly.sourceId === sourceId && anomaly.type === type && !anomaly.resolved) {
        this.resolveAnomaly(id)
      }
    }
  }

  private resolveSourceAnomalies(sourceId: string): void {
    for (const [id, anomaly] of this.activeAnomalies.entries()) {
      if (anomaly.sourceId === sourceId && !anomaly.resolved) {
        this.resolveAnomaly(id)
      }
    }
  }

  private resolveAnomaly(anomalyId: string): void {
    const anomaly = this.activeAnomalies.get(anomalyId)
    if (anomaly && !anomaly.resolved) {
      anomaly.resolved = true
      anomaly.resolvedAt = Date.now()
      if (anomaly.timestamp) {
        anomaly.duration = anomaly.resolvedAt - anomaly.timestamp
      }
      this.emit('anomaly-resolved', anomaly)
      this.activeAnomalies.delete(anomalyId)
    }
  }

  private findActiveAnomalyId(sourceId: string, type: AnomalyType): string | undefined {
    for (const [id, anomaly] of this.activeAnomalies.entries()) {
      if (anomaly.sourceId === sourceId && anomaly.type === type && !anomaly.resolved) {
        return id
      }
    }
    return undefined
  }

  getStatistics(sourceId: string): StreamStatistics | undefined {
    return this.statistics.get(sourceId)
  }

  getAllStatistics(): Map<string, StreamStatistics> {
    return new Map(this.statistics)
  }

  getActiveAnomalies(): AnomalyEvent[] {
    return Array.from(this.activeAnomalies.values())
      .filter(a => !a.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  startDetection(interval: number = 1000): void {
    this.stopDetection()

    this.detectionInterval = setInterval(() => {
      const results = this.detectAll()
      for (const [sourceId, result] of results.entries()) {
        if (result.hasAnomaly) {
          this.emit('source-anomaly', { sourceId, result })
        }
      }
    }, interval)
  }

  stopDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = undefined
    }
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = undefined
    }
  }

  isRunning(): boolean {
    return this.detectionInterval !== undefined
  }

  dispose(): void {
    this.stopDetection()
    this.removeAllListeners()
    this.statistics.clear()
    this.activeAnomalies.clear()
  }
}
