import { useState, useEffect } from 'react'
import MonitoringGrid from './MonitoringGrid'
import { useAudioSources } from '../../hooks/useAudioSources'

export default function MonitoringPage() {
  const { sources, fetchSources } = useAudioSources()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5000)

  useEffect(() => {
    fetchSources()
    const intervalId = setInterval(() => {
      if (autoRefresh) {
        fetchSources()
      }
    }, refreshInterval)

    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval, fetchSources])

  const handleStartAll = async () => {
    if (window.electronAPI?.monitoring) {
      const connectedSources = sources.filter((s: any) => s.status === 'connected')
      for (const source of connectedSources) {
        await window.electronAPI.monitoring.start(source.id)
      }
      fetchSources()
    }
  }

  const handleStopAll = async () => {
    if (window.electronAPI?.monitoring) {
      for (const source of sources) {
        await window.electronAPI.monitoring.stop(source.id)
      }
      fetchSources()
    }
  }

  const connectedCount = sources.filter((s: any) => s.status === 'connected').length
  const totalCount = sources.length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        height: 'calc(100vh - 64px)',
        background: '#141414'
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>
            实时监控
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.7)'
              }}
            >
              {connectedCount}/{totalCount} 连接
            </span>
            <button
              onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
              style={{
                background: layout === 'grid' ? '#1890ff' : '#333',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {layout === 'grid' ? '网格' : '列表'}
            </button>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '12px',
            alignItems: 'center'
          }}
        >
          <label style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            自动刷新
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            style={{
              background: '#333',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={1000}>1秒</option>
            <option value={3000}>3秒</option>
            <option value={5000}>5秒</option>
            <option value={10000}>10秒</option>
          </select>
          <button
            onClick={handleStartAll}
            style={{
              background: '#52c41a',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            全部开始
          </button>
          <button
            onClick={handleStopAll}
            style={{
              background: '#ff4d4f',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            全部停止
          </button>
          <button
            onClick={fetchSources}
            style={{
              background: '#333',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            >
            刷新
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MonitoringGrid sources={sources} layout={layout} />
      </div>
    </div>
  )
}
