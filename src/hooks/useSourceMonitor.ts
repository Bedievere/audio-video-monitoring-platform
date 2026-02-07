import { useEffect, useRef } from 'react'

interface MonitorStatus {
  active: boolean
  connected: boolean
  lastFrameTime?: number
  frameRate: number
  bitrate: number
}

interface UseSourceMonitorReturn {
  getMonitorStatus: (sourceId: string) => MonitorStatus | undefined
  startMonitoring: (sourceId: string) => Promise<void>
  stopMonitoring: (sourceId: string) => Promise<void>
}

export function useSourceMonitor(): UseSourceMonitorReturn {
  const statusesRef = useRef<Map<string, MonitorStatus>>(new Map())

  const startMonitoring = async (sourceId: string): Promise<void> => {
    try {
      if (window.electronAPI?.monitoring) {
        await window.electronAPI.monitoring.start(sourceId)
        statusesRef.current.set(sourceId, {
          active: true,
          connected: false,
          frameRate: 0,
          bitrate: 0
        })
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error)
    }
  }

  const stopMonitoring = async (sourceId: string): Promise<void> => {
    try {
      if (window.electronAPI?.monitoring) {
        await window.electronAPI.monitoring.stop(sourceId)
        statusesRef.current.set(sourceId, {
          active: false,
          connected: false,
          frameRate: 0,
          bitrate: 0
        })
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error)
    }
  }

  useEffect(() => {
    if (window.electronAPI?.stream) {
      const unregisterFrame = window.electronAPI.stream.onFrame(({ sourceId, frame }) => {
        const status = statusesRef.current.get(sourceId)
        if (status?.active) {
          const now = Date.now()
          const lastTime = status.lastFrameTime || now

          if (status.lastFrameTime) {
            const delta = now - lastTime
            const newFrameRate = Math.round(1000 / delta)
            const avgFrameRate = status.frameRate * 0.9 + newFrameRate * 0.1

            const dataSize = frame.data?.length || 0
            const newBitrate = Math.round(dataSize * 8 * 1000 / delta / 1024)
            const avgBitrate = status.bitrate * 0.9 + newBitrate * 0.1

            statusesRef.current.set(sourceId, {
              ...status,
              lastFrameTime: now,
              frameRate: avgFrameRate,
              bitrate: avgBitrate
            })
          } else {
            statusesRef.current.set(sourceId, {
              ...status,
              lastFrameTime: now
            })
          }
        }
      })

      const unregisterInfo = window.electronAPI.stream.onInfo(({ sourceId }) => {
        const status = statusesRef.current.get(sourceId)
        if (status?.active) {
          statusesRef.current.set(sourceId, {
            ...status,
            connected: true
          })
        }
      })

      const unregisterError = window.electronAPI.stream.onError(({ sourceId }) => {
        const status = statusesRef.current.get(sourceId)
        if (status?.active) {
          statusesRef.current.set(sourceId, {
            ...status,
            connected: false
          })
        }
      })

      const unregisterConnected = window.electronAPI.stream.onConnected(({ sourceId }) => {
        const status = statusesRef.current.get(sourceId)
        if (status?.active) {
          statusesRef.current.set(sourceId, {
            ...status,
            connected: true
          })
        }
      })

      const unregisterDisconnected = window.electronAPI.stream.onDisconnected(({ sourceId }) => {
        const status = statusesRef.current.get(sourceId)
        if (status?.active) {
          statusesRef.current.set(sourceId, {
            ...status,
            connected: false
          })
        }
      })

      return () => {
        unregisterFrame()
        unregisterInfo()
        unregisterError()
        unregisterConnected()
        unregisterDisconnected()
      }
    }
  }, [])

  return {
    getMonitorStatus: (sourceId: string) => statusesRef.current.get(sourceId),
    startMonitoring,
    stopMonitoring
  }
}
