import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'

interface RecordingConfig {
  enabled: boolean
  preRecordDuration: number
  postRecordDuration: number
  storagePath: string
  maxRetentionDays: number
}

const DEFAULT_CONFIG: RecordingConfig = {
  enabled: true,
  preRecordDuration: 5000,
  postRecordDuration: 10000,
  storagePath: '',
  maxRetentionDays: 30
}

interface UseRecordingConfigReturn {
  config: RecordingConfig
  loading: boolean
  updateConfig: (newConfig: Partial<RecordingConfig>) => Promise<void>
}

export function useRecordingConfig(): UseRecordingConfigReturn {
  const [config, setConfig] = useState<RecordingConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)

  const loadConfig = useCallback(async () => {
    if (window.electronAPI?.recordings) {
      try {
        setLoading(true)
        const cfg = await window.electronAPI.recordings.getConfig()
        if (cfg && typeof cfg === 'object') {
          setConfig(cfg as RecordingConfig)
        }
      } catch (error) {
        console.error('Failed to load recording config:', error)
      } finally {
        setLoading(false)
      }
    }
  }, [])

  const updateConfig = useCallback(async (newConfig: Partial<RecordingConfig>) => {
    if (window.electronAPI?.recordings) {
      try {
        setLoading(true)
        await window.electronAPI.recordings.updateConfig(newConfig)
        setConfig({ ...config, ...newConfig })
        message.success('配置更新成功')
      } catch (error) {
        console.error('Failed to update recording config:', error)
        message.error('配置更新失败')
      } finally {
        setLoading(false)
      }
    }
  }, [config])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return {
    config,
    loading,
    updateConfig
  }
}
