import db from './index'
import { AudioSource } from '../types'

export class AudioSourceRepository {
  private static instance: AudioSourceRepository

  static getInstance(): AudioSourceRepository {
    if (!AudioSourceRepository.instance) {
      AudioSourceRepository.instance = new AudioSourceRepository()
    }
    return AudioSourceRepository.instance
  }

  async findAll(): Promise<AudioSource[]> {
    const stmt = db.prepare('SELECT * FROM audio_sources ORDER BY created_at DESC')
    const rows = stmt.all() as any[]
    return rows.map(this.mapToAudioSource)
  }

  async findById(id: string): Promise<AudioSource | null> {
    const stmt = db.prepare('SELECT * FROM audio_sources WHERE id = ?')
    const row = stmt.get(id) as any | undefined
    return row ? this.mapToAudioSource(row) : null
  }

  async create(source: Partial<AudioSource>): Promise<void> {
    const now = new Date().toISOString()
    const stmt = db.prepare(`
      INSERT INTO audio_sources (id, name, url, protocol, format, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      source.id,
      source.name,
      source.url,
      source.protocol,
      source.format || null,
      source.status || 'disconnected',
      now,
      now
    )
  }

  async update(id: string, source: Partial<AudioSource>): Promise<void> {
    const now = new Date().toISOString()
    const stmt = db.prepare(`
      UPDATE audio_sources
      SET name = ?, url = ?, protocol = ?, format = ?, status = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(source.name, source.url, source.protocol, source.format, source.status, now, id)
  }

  async delete(id: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM audio_sources WHERE id = ?')
    stmt.run(id)
  }

  async updateStatus(id: string, status: AudioSource['status']): Promise<void> {
    const now = new Date().toISOString()
    const stmt = db.prepare('UPDATE audio_sources SET status = ?, updated_at = ? WHERE id = ?')
    stmt.run(status, now, id)
  }

  private mapToAudioSource(row: any): AudioSource {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      protocol: row.protocol,
      format: row.format,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}

export const audioSourceRepository = AudioSourceRepository.getInstance()
