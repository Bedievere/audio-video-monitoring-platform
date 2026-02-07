import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { AnomalyEvent } from '../types/detection.types'
import { RecordingMetadata } from '../components/history/RecordingsPage'

interface UseHistoryReturn {
  anomalies: AnomalyEvent[]
  recordings: RecordingMetadata[]
  loading: boolean
  loadAnomalies: () => Promise<void>
  loadRecordings: () => Promise<void>
  exportAnomalies: (anomalies: AnomalyEvent[]) => Promise<void>
  deleteRecording: (recordingId: string) => Promise<void>
  cleanupRecordings: () => Promise<void>
  stats?: {
    totalRecordings: number
    totalSize: number
    oldestRecording: number | null
    newestRecording: number | null
  }
}

export function useHistory(): UseHistoryReturn {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([])
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{
    totalRecordings: number
    totalSize: number
    oldestRecording: number | null
    newestRecording: number | null
  }>()

  const loadAnomalies = useCallback(async () => {
    if (window.electronAPI?.anomalies) {
      try {
        setLoading(true)
        const data = await window.electronAPI.anomalies.getAll()
        setAnomalies(data)
      } catch (error) {
        console.error('Failed to load anomalies:', error)
        message.error('加载异常记录失败')
      } finally {
        setLoading(false)
      }
    }
  }, [])

  const loadRecordings = useCallback(async () => {
    if (window.electronAPI?.recordings) {
      try {
        setLoading(true)
        const data = await window.electronAPI.recordings.getAll()
        setRecordings(data)

        const recordingStats = await window.electronAPI.recordings.getStats()
        setStats(recordingStats)
      } catch (error) {
        console.error('Failed to load recordings:', error)
        message.error('加载录制记录失败')
      } finally {
        setLoading(false)
      }
    }
  }, [])

  const exportAnomalies = useCallback(async (data: AnomalyEvent[]) => {
    try {
      const csv = await window.electronAPI.anomalies.exportToCSV(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `anomalies_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      console.error('Failed to export anomalies:', error)
      message.error('导出失败')
    }
  }, [])

  const deleteRecording = useCallback(async (recordingId: string) => {
    if (window.electronAPI?.recordings) {
      try {
        await window.electronAPI.recordings.delete(recordingId)
        await loadRecordings()
      } catch (error) {
        console.error('Failed to delete recording:', error)
        message.error('删除录制失败')
      }
    }
  }, [loadRecordings])

  const cleanupRecordings = useCallback(async () => {
    if (window.electronAPI?.recordings) {
      try {
        await window.electronAPI.recordings.cleanup()
        await loadRecordings()
      } catch (error) {
        console.error('Failed to cleanup recordings:', error)
        message.error('清理录制失败')
      }
    }
  }, [loadRecordings])

  useEffect(() => {
    loadAnomalies()
    loadRecordings()
  }, [loadAnomalies, loadRecordings])

  return {
    anomalies,
    recordings,
    loading,
    loadAnomalies,
    loadRecordings,
    exportAnomalies,
    deleteRecording,
    cleanupRecordings,
    stats
  }
}
