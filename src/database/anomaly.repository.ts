import db from './index'
import { AnomalyEvent, AnomalyFilter } from '../types'

export class AnomalyRepository {
  private static instance: AnomalyRepository

  static getInstance(): AnomalyRepository {
    if (!AnomalyRepository.instance) {
      AnomalyRepository.instance = new AnomalyRepository()
    }
    return AnomalyRepository.instance
  }

  async findAll(filters?: AnomalyFilter): Promise<AnomalyEvent[]> {
    let query = 'SELECT * FROM anomaly_records'
    const conditions: string[] = []
    const params: any[] = []

    if (filters?.sourceId) {
      conditions.push('source_id = ?')
      params.push(filters.sourceId)
    }
    if (filters?.type) {
      conditions.push('type = ?')
      params.push(filters.type)
    }
    if (filters?.startDate) {
      conditions.push('timestamp >= ?')
      params.push(filters.startDate.getTime())
    }
    if (filters?.endDate) {
      conditions.push('timestamp <= ?')
      params.push(filters.endDate.getTime())
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY timestamp DESC'

    const stmt = db.prepare(query)
    const rows = stmt.all(...params) as any[]
    return rows.map(this.mapToAnomalyEvent)
  }

  async findById(id: string): Promise<AnomalyEvent | null> {
    const stmt = db.prepare('SELECT * FROM anomaly_records WHERE id = ?')
    const row = stmt.get(id) as any | undefined
    return row ? this.mapToAnomalyEvent(row) : null
  }

  async create(anomaly: Partial<AnomalyEvent>): Promise<void> {
    const now = Date.now()
    const stmt = db.prepare(`
      INSERT INTO anomaly_records (id, source_id, source_name, type, timestamp, resolved, resolved_at, duration, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      anomaly.id,
      anomaly.sourceId,
      anomaly.sourceName,
      anomaly.type,
      anomaly.timestamp || now,
      anomaly.resolved ? 1 : 0,
      anomaly.resolved ? anomaly.resolvedAt : null,
      anomaly.duration || null,
      JSON.stringify(anomaly.metadata || {})
    )
  }

  async update(id: string, updates: Partial<AnomalyEvent>): Promise<void> {
    const now = Date.now()
    const fields: string[] = []
    const params: any[] = []

    if (updates.resolved !== undefined) {
      fields.push('resolved = ?')
      params.push(updates.resolved ? 1 : 0)
    }
    if (updates.resolvedAt !== undefined) {
      fields.push('resolved_at = ?')
      params.push(updates.resolvedAt)
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?')
      params.push(updates.duration)
    }

    if (fields.length > 0) {
      params.push(now, id)
      const stmt = db.prepare(`
        UPDATE anomaly_records
        SET ${fields.join(', ')}, updated_at = ?
        WHERE id = ?
      `)
      stmt.run(...params)
    }
  }

  async delete(id: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM anomaly_records WHERE id = ?')
    stmt.run(id)
  }

  private mapToAnomalyEvent(row: any): AnomalyEvent {
    return {
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      type: row.type,
      severity: this.inferSeverity(row.type),
      message: this.inferMessage(row),
      timestamp: row.timestamp,
      duration: row.duration,
      resolved: row.resolved === 1,
      resolvedAt: row.resolved_at || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }
  }

  private inferSeverity(type: string): 'low' | 'medium' | 'high' | 'critical' {
    if (['video_black', 'video_freeze', 'audio_missing', 'low_frame_rate'].includes(type)) {
      return 'high'
    }
    if (['stream_interrupted', 'low_bitrate', 'high_bitrate', 'frame_loss'].includes(type)) {
      return 'low'
    }
    if (['connection_failed', 'timeout'].includes(type)) {
      return 'critical'
    }
    return 'medium'
  }

  private inferMessage(type: string): string {
    const messages: Record<string, string> = {
      stream_interrupted: '流中断',
      frame_loss: '检测到丢帧',
      audio_missing: '检测到音频静音',
      video_black: '检测到画面黑屏',
      video_freeze: '检测到画面冻结',
      low_frame_rate: '帧率过低',
      high_bitrate: '码率过高',
      low_bitrate: '码率过低',
      connection_failed: '连接失败',
      timeout: '连接超时'
    }
    return messages[type] || `${type} - 检测到异常`
  }
}

export const anomalyRepository = AnomalyRepository.getInstance()
