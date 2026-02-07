import { promises as fs } from 'fs'
import { join } from 'path'
import { AnomalyEvent } from '../types/detection.types'

export interface RecordingConfig {
  enabled: boolean
  preRecordDuration: number
  postRecordDuration: number
  storagePath: string
  maxRetentionDays: number
}

export interface RecordingMetadata {
  id: string
  anomalyId: string
  sourceId: string
  sourceName: string
  anomalyType: string
  filePath: string
  startTime: number
  endTime: number
  duration: number
  fileSize: number
}

export class AnomalyRecorder {
  private config: RecordingConfig
  private recordings: Map<string, RecordingMetadata> = new Map()
  private circularBuffers: Map<string, Buffer[]> = new Map()
  private recordingSessions: Map<string, { startTime: number; frames: Buffer[] }> = new Map()
  private cleanupInterval?: NodeJS.Timeout

  constructor(config: Partial<RecordingConfig> = {}) {
    this.config = {
      enabled: true,
      preRecordDuration: 5000,
      postRecordDuration: 10000,
      storagePath: join(process.cwd(), 'recordings'),
      maxRetentionDays: 30,
      ...config
    }

    this.initStorageDirectory()
    this.startCleanupTask()
  }

  private async initStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storagePath, { recursive: true })
    } catch (error) {
      console.error('Failed to create recordings directory:', error)
    }
  }

  updateConfig(newConfig: Partial<RecordingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    if (newConfig.storagePath) {
      this.initStorageDirectory()
    }
  }

  getConfig(): RecordingConfig {
    return { ...this.config }
  }

  registerSource(sourceId: string): void {
    if (!this.circularBuffers.has(sourceId)) {
      this.circularBuffers.set(sourceId, [])
    }
  }

  unregisterSource(sourceId: string): void {
    this.circularBuffers.delete(sourceId)
    const session = this.recordingSessions.get(sourceId)
    if (session) {
      this.stopRecording(sourceId, 'source_unregistered')
    }
  }

  processFrame(sourceId: string, frame: { data: Buffer; timestamp: number }): void {
    if (!this.config.enabled) return

    const buffer = this.circularBuffers.get(sourceId)
    if (buffer) {
      buffer.push(frame.data)
      const maxBufferSize = Math.ceil((this.config.preRecordDuration / 1000) * 30)
      if (buffer.length > maxBufferSize) {
        buffer.shift()
      }
    }

    const session = this.recordingSessions.get(sourceId)
    if (session) {
      session.frames.push(frame.data)
      const elapsed = Date.now() - session.startTime
      if (elapsed >= this.config.postRecordDuration) {
        this.stopRecording(sourceId, 'duration_exceeded')
      }
    }
  }

  async startRecording(anomaly: AnomalyEvent): Promise<string> {
    const sourceId = anomaly.sourceId

    const buffer = this.circularBuffers.get(sourceId)
    const preRecordedFrames = buffer ? [...buffer] : []

    const sessionId = `${anomaly.id}-${Date.now()}`
    this.recordingSessions.set(sourceId, {
      startTime: Date.now(),
      frames: [...preRecordedFrames]
    })

    const fileName = this.generateFileName(anomaly)
    const filePath = join(this.config.storagePath, fileName)

    const metadata: RecordingMetadata = {
      id: sessionId,
      anomalyId: anomaly.id,
      sourceId: anomaly.sourceId,
      sourceName: anomaly.sourceName,
      anomalyType: anomaly.type,
      filePath,
      startTime: Date.now() - this.config.preRecordDuration,
      endTime: 0,
      duration: 0,
      fileSize: 0
    }

    this.recordings.set(sessionId, metadata)

    return sessionId
  }

  private generateFileName(anomaly: AnomalyEvent): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeName = anomaly.sourceName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    return `${timestamp}_${safeName}_${anomaly.type}.mp4`
  }

  async stopRecording(sourceId: string, _reason: string): Promise<void> {
    const session = this.recordingSessions.get(sourceId)
    if (!session) return

    const endTime = Date.now()
    const metadata = Array.from(this.recordings.values()).find(
      r => r.sourceId === sourceId && r.endTime === 0
    )

    if (metadata) {
      metadata.endTime = endTime
      metadata.duration = endTime - metadata.startTime

      try {
        const combinedData = Buffer.concat(session.frames)
        await fs.writeFile(metadata.filePath, combinedData)
        metadata.fileSize = combinedData.length

        console.log(`Recording saved: ${metadata.filePath}`)
      } catch (error) {
        console.error('Failed to save recording:', error)
      }
    }

    this.recordingSessions.delete(sourceId)
  }

  getRecordingsByAnomaly(anomalyId: string): RecordingMetadata[] {
    return Array.from(this.recordings.values())
      .filter(r => r.anomalyId === anomalyId)
  }

  getRecordingsBySource(sourceId: string): RecordingMetadata[] {
    return Array.from(this.recordings.values())
      .filter(r => r.sourceId === sourceId)
  }

  getAllRecordings(): RecordingMetadata[] {
    return Array.from(this.recordings.values())
      .sort((a, b) => b.startTime - a.startTime)
  }

  async deleteRecording(recordingId: string): Promise<void> {
    const metadata = this.recordings.get(recordingId)
    if (metadata) {
      try {
        await fs.unlink(metadata.filePath)
        this.recordings.delete(recordingId)
        console.log(`Recording deleted: ${recordingId}`)
      } catch (error) {
        console.error('Failed to delete recording:', error)
      }
    }
  }

  async cleanupOldRecordings(): Promise<void> {
    const cutoffDate = Date.now() - (this.config.maxRetentionDays * 24 * 60 * 60 * 1000)

    for (const [id, metadata] of this.recordings.entries()) {
      if (metadata.startTime < cutoffDate) {
        await this.deleteRecording(id)
      }
    }
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOldRecordings()
    }, 24 * 60 * 60 * 1000)
  }

  async getRecordingStats(): Promise<{
    totalRecordings: number
    totalSize: number
    oldestRecording: number | null
    newestRecording: number | null
  }> {
    const recordings = this.getAllRecordings()
    const totalSize = recordings.reduce((sum, r) => sum + r.fileSize, 0)

    return {
      totalRecordings: recordings.length,
      totalSize,
      oldestRecording: recordings.length > 0 ? recordings[recordings.length - 1].startTime : null,
      newestRecording: recordings.length > 0 ? recordings[0].startTime : null
    }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.recordingSessions.clear()
    this.circularBuffers.clear()
    this.recordings.clear()
  }
}
