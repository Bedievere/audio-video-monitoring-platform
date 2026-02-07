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
      conditions.push('start_time >= ?')
      params.push(filters.startDate.toISOString())
    }

    if (filters?.endDate) {
      conditions.push('start_time <= ?')
      params.push(filters.endDate.toISOString())
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY start_time DESC'

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
    const now = new Date().toISOString()
    const stmt = db.prepare(`
      INSERT INTO anomaly_records (id, source_id, source_name, type, start_time, end_time, duration, recording_file_path, details, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const startTime = anomaly.startTime || new Date()
    stmt.run(
      anomaly.id,
      anomaly.sourceId,
      anomaly.sourceName,
      anomaly.type,
      startTime.toISOString(),
      anomaly.endTime?.toISOString() || null,
      anomaly.duration || null,
      anomaly.recordingFilePath || null,
      JSON.stringify(anomaly.details || {}),
      now,
      now
    )
  }

  async update(id: string, updates: Partial<AnomalyEvent>): Promise<void> {
    const now = new Date().toISOString()
    const fields: string[] = []
    const params: any[] = []

    if (updates.endTime !== undefined) {
      fields.push('end_time = ?')
      params.push(updates.endTime.toISOString())
    }

    if (updates.duration !== undefined) {
      fields.push('duration = ?')
      params.push(updates.duration)
    }

    if (updates.recordingFilePath !== undefined) {
      fields.push('recording_file_path = ?')
      params.push(updates.recordingFilePath)
    }

    if (updates.details !== undefined) {
      fields.push('details = ?')
      params.push(JSON.stringify(updates.details))
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
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      duration: row.duration,
      recordingFilePath: row.recording_file_path,
      details: row.details ? JSON.parse(row.details) : {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}

export const anomalyRepository = AnomalyRepository.getInstance()
