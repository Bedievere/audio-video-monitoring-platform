import { useState, useEffect, useRef } from 'react'

interface VideoDisplayProps {
  sourceId: string
  sourceName: string
  streamUrl: string
  isActive: boolean
  isConnected: boolean
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error', error?: string) => void
}

type VideoStatus = 'idle' | 'loading' | 'connected' | 'disconnected' | 'error'

export default function VideoDisplay({
  sourceId,
  sourceName,
  streamUrl,
  isActive,
  isConnected,
  onStatusChange
}: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [frameRate, setFrameRate] = useState(0)
  const [bitrate, setBitrate] = useState(0)

  useEffect(() => {
    if (isActive && !isConnected) {
      setVideoStatus('loading')
      if (onStatusChange) {
        onStatusChange('disconnected')
      }
    } else if (isConnected) {
      setVideoStatus('connected')
      if (onStatusChange) {
        onStatusChange('connected')
      }
    } else {
      setVideoStatus('idle')
    }
  }, [isActive, isConnected, onStatusChange])

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.stream) {
      const unregister = window.electronAPI.stream.onFrame(({ sourceId: id, frame }) => {
        if (id === sourceId) {
          updateFrameStats(frame)
        }
      })

      const unregisterInfo = window.electronAPI.stream.onInfo(({ sourceId: id, info }) => {
        if (id === sourceId) {
          console.log('Stream info:', info)
        }
      })

      const unregisterError = window.electronAPI.stream.onError(({ sourceId: id, error }) => {
        if (id === sourceId) {
          setVideoStatus('error')
          if (onStatusChange) {
            onStatusChange('error', error)
          }
        }
      })

      const unregisterConnected = window.electronAPI.stream.onConnected(({ sourceId: id }) => {
        if (id === sourceId) {
          setVideoStatus('connected')
          if (onStatusChange) {
            onStatusChange('connected')
          }
        }
      })

      const unregisterDisconnected = window.electronAPI.stream.onDisconnected(({ sourceId: id }) => {
        if (id === sourceId) {
          setVideoStatus('disconnected')
          if (onStatusChange) {
            onStatusChange('disconnected')
          }
        }
      })

      return () => {
        unregister()
        unregisterInfo()
        unregisterError()
        unregisterConnected()
        unregisterDisconnected()
      }
    }
  }, [sourceId, onStatusChange])

  useEffect(() => {
    if (isActive && videoRef.current && streamUrl) {
      startMonitoring()
    }
  }, [isActive, streamUrl])

  const startMonitoring = async () => {
    try {
      if (window.electronAPI?.monitoring) {
        await window.electronAPI.monitoring.start(sourceId)
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      setVideoStatus('error')
    }
  }

  const updateFrameStats = (frame: any) => {
    const now = Date.now()
    const lastFrameTime = (videoRef.current as any)._lastFrameTime || now
    const delta = now - lastFrameTime

    if (delta > 0) {
      const newFrameRate = Math.round(1000 / delta)
      const avgFrameRate = frameRate * 0.9 + newFrameRate * 0.1
      setFrameRate(avgFrameRate)
    }

    if (frame.data) {
      const frameSize = frame.data.length
      const newBitrate = Math.round(frameSize * 8 * 1000 / delta / 1024)
      const avgBitrate = bitrate * 0.9 + newBitrate * 0.1
      setBitrate(avgBitrate)
    }

    ;(videoRef.current as any)._lastFrameTime = now
  }

  const getVideoElement = () => {
    if (videoStatus === 'connected') {
      return (
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onCanPlay={() => setVideoStatus('connected')}
          onError={() => {
            setVideoStatus('error')
            if (onStatusChange) {
              onStatusChange('error', 'Video playback error')
            }
          }}
        />
      )
    }
    return null
  }

  const getStatusBadge = () => {
    const statusConfig: Record<VideoStatus, { color: string; text: string; icon: string }> = {
      idle: { color: 'gray', text: '空闲', icon: '○' },
      loading: { color: 'blue', text: '连接中...', icon: '◐' },
      connected: { color: 'green', text: '已连接', icon: '●' },
      disconnected: { color: 'orange', text: '已断开', icon: '○' },
      error: { color: 'red', text: '错误', icon: '×' }
    }

    const config = statusConfig[videoStatus]

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: config.color
        }}
      >
        <span style={{ fontSize: '14px' }}>{config.icon}</span>
        <span>{config.text}</span>
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        height: '100%'
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0
          }}
        >
          {sourceName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {getStatusBadge()}
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}
          >
            FPS: {frameRate}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}
          >
            {bitrate > 1024 ? `${(bitrate / 1024).toFixed(1)} Mbps` : `${bitrate} kbps`}
          </span>
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '14px'
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        {videoStatus === 'loading' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '14px'
            }}
          >
            连接中...
          </div>
        )}
        {videoStatus === 'error' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#ff4444',
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.8)'
            }}
          >
            连接失败
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
          width={640}
          height={480}
        />
        {getVideoElement()}
      </div>
    </div>
  )
}
