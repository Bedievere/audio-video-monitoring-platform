import { useState, useEffect, useCallback } from 'react'
import { AnomalyEvent, AnomalyDetectionConfig, StreamStatistics } from '../types/detection.types'

interface UseAnomalyDetectionReturn {
  activeAnomalies: AnomalyEvent[]
  statistics: Record<string, StreamStatistics>
  config: AnomalyDetectionConfig
  isRunning: boolean
  registerSource: (sourceId: string) => Promise<void>
  unregisterSource: (sourceId: string) => Promise<void>
  updateConfig: (config: Partial<AnomalyDetectionConfig>) => Promise<void>
  detectAll: () => Promise<Record<string, any>>
  startDetection: () => Promise<void>
  stopDetection: () => Promise<void>
}

export function useAnomalyDetection(): UseAnomalyDetectionReturn {
  const [activeAnomalies, setActiveAnomalies] = useState<AnomalyEvent[]>([])
  const [statistics, setStatistics] = useState<Record<string, StreamStatistics>>({})
  const [config, setConfig] = useState<AnomalyDetectionConfig>({
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
  })
  const [isRunning, setIsRunning] = useState(false)

  const registerSource = useCallback(async (sourceId: string) => {
    if (window.electronAPI?.anomaly) {
      await window.electronAPI.anomaly.registerSource({ sourceId, sourceName: sourceId })
    }
  }, [])

  const unregisterSource = useCallback(async (sourceId: string) => {
    if (window.electronAPI?.anomaly) {
      await window.electronAPI.anomaly.unregisterSource({ sourceId })
    }
  }, [])

  const updateConfig = useCallback(async (newConfig: Partial<AnomalyDetectionConfig>) => {
    if (window.electronAPI?.anomaly) {
      const result = await window.electronAPI.anomaly.updateConfig(newConfig)
      if (result && typeof result === 'object' && 'config' in result) {
        setConfig((result as any).config as AnomalyDetectionConfig)
      }
    }
  }, [])

  const detectAll = useCallback(async () => {
    if (window.electronAPI?.anomaly) {
      const results = await window.electronAPI.anomaly.detectAll()
      const stats: Record<string, StreamStatistics> = {}
      for (const [key, value] of Object.entries(results)) {
        if (value && typeof value === 'object' && 'statistics' in value) {
          stats[key] = (value as any).statistics
        }
      }
      setStatistics(stats)
      return results
    }
    return {}
  }, [])

  const startDetection = useCallback(async () => {
    if (window.electronAPI?.anomaly) {
      await window.electronAPI.anomaly.start()
      setIsRunning(true)
    }
  }, [])

  const stopDetection = useCallback(async () => {
    if (window.electronAPI?.anomaly) {
      await window.electronAPI.anomaly.stop()
      setIsRunning(false)
    }
  }, [])

  useEffect(() => {
    const loadInitialData = async () => {
      if (window.electronAPI?.anomaly) {
        try {
          const cfg = await window.electronAPI.anomaly.getConfig()
          setConfig(cfg as AnomalyDetectionConfig)

          const stats = await window.electronAPI.anomaly.getStatistics()
          setStatistics(stats as Record<string, StreamStatistics>)

          const anomalies = await window.electronAPI.anomaly.getActiveAnomalies()
          setActiveAnomalies(anomalies)
        } catch (error) {
          console.error('Failed to load anomaly detection data:', error)
        }
      }
    }

    loadInitialData()

    const handleAnomalyDetected = (_event: any, anomaly: AnomalyEvent) => {
      setActiveAnomalies(prev => [anomaly, ...prev])
    }

    const handleAnomalyResolved = (_event: any, anomaly: AnomalyEvent) => {
      setActiveAnomalies(prev => prev.filter(a => a.id !== anomaly.id))
    }

    const handleSourceAnomaly = (_event: any, data: { sourceId: string; result: any }) => {
      setStatistics(prev => ({
        ...prev,
        [data.sourceId]: data.result.statistics
      }))
    }

    const handleConfigUpdated = (_event: any, newConfig: AnomalyDetectionConfig) => {
      setConfig(newConfig)
    }

    if (window.electronAPI?.ipc) {
      window.electronAPI.ipc.on('anomaly:detected', handleAnomalyDetected)
      window.electronAPI.ipc.on('anomaly:resolved', handleAnomalyResolved)
      window.electronAPI.ipc.on('source:anomaly', handleSourceAnomaly)
      window.electronAPI.ipc.on('anomaly:config-updated', handleConfigUpdated)
    }

    return () => {
      if (window.electronAPI?.ipc) {
        window.electronAPI.ipc.removeListener('anomaly:detected', handleAnomalyDetected)
        window.electronAPI.ipc.removeListener('anomaly:resolved', handleAnomalyResolved)
        window.electronAPI.ipc.removeListener('source:anomaly', handleSourceAnomaly)
        window.electronAPI.ipc.removeListener('anomaly:config-updated', handleConfigUpdated)
      }
    }
  }, [])

  return {
    activeAnomalies,
    statistics,
    config,
    isRunning,
    registerSource,
    unregisterSource,
    updateConfig,
    detectAll,
    startDetection,
    stopDetection
  }
}
