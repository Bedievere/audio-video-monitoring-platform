import { useEffect } from 'react'
import VideoDisplay from './VideoDisplay'
import { useSourceMonitor } from '../../hooks/useSourceMonitor'
import { AudioSource } from '../../types'

interface MonitoringGridProps {
  sources: AudioSource[]
  layout?: 'grid' | 'list'
}

export default function MonitoringGrid({ sources, layout = 'grid' }: MonitoringGridProps) {
  const { getMonitorStatus, startMonitoring, stopMonitoring } = useSourceMonitor()

  useEffect(() => {
    const activeSources = sources.filter(s => s.status === 'connected')

    activeSources.forEach(source => {
      const status = getMonitorStatus(source.id)
      if (!status?.active) {
        startMonitoring(source.id)
      }
    })

    return () => {
      activeSources.forEach(source => {
        stopMonitoring(source.id)
      })
    }
  }, [sources])

  const gridStyles: React.CSSProperties = layout === 'grid' ? {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gridTemplateRows: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    padding: '16px',
    background: '#1a1a1a',
    height: 'calc(100vh - 64px)'
  } : {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    background: '#1a1a1a',
    height: 'calc(100vh - 64px)',
    overflow: 'auto'
  }

  const getMonitorStatusForSource = (id: string) => {
    const status = getMonitorStatus(id)
    return {
      isActive: status?.active || false,
      isConnected: status?.connected || false
    }
  }

  if (sources.length === 0) {
    return (
      <div style={gridStyles}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255, 255, 255, 0.5)'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📺</div>
          <div style={{ fontSize: '16px' }}>暂无音视频源</div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.3)', marginTop: '8px' }}>
            请在音视频源管理中添加音视频源
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={gridStyles}>
      {sources.map(source => {
        const { isActive, isConnected } = getMonitorStatusForSource(source.id)
        return (
          <VideoDisplay
            key={source.id}
            sourceId={source.id}
            sourceName={source.name}
            streamUrl={source.url}
            isActive={isActive}
            isConnected={isConnected}
          />
        )
      })}
    </div>
  )
}
