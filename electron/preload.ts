import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 音视频源管理
  sources: {
    getAll: () => ipcRenderer.invoke('sources:getAll'),
    getById: (id: string) => ipcRenderer.invoke('sources:getById', id),
    add: (source: any) => ipcRenderer.invoke('sources:add', source),
    update: (id: string, source: any) => ipcRenderer.invoke('sources:update', id, source),
    delete: (id: string) => ipcRenderer.invoke('sources:delete', id),
    updateStatus: (id: string, status: string) => ipcRenderer.invoke('sources:updateStatus', id, status)
  },

  // 异常记录
  anomalies: {
    getAll: (filters?: any) => ipcRenderer.invoke('anomalies:getAll', filters),
    record: (anomaly: any) => ipcRenderer.invoke('anomalies:record', anomaly),
    update: (id: string, updates: any) => ipcRenderer.invoke('anomalies:update', id, updates),
    exportToCSV: (anomalies: any[]) => ipcRenderer.invoke('anomalies:exportToCSV', anomalies)
  },

  // 告警通知服务
  notifications: {
    getConfig: () => ipcRenderer.invoke('notification:get-config'),
    updateConfig: (config: any) => ipcRenderer.invoke('notification:update-config', config),
    sendTest: () => ipcRenderer.invoke('notification:send-test'),
    clearHistory: () => ipcRenderer.invoke('notification:clear-history'),
    getQueueStatus: () => ipcRenderer.invoke('notification:get-queue-status')
  },

  // 异常检测
  anomaly: {
    start: () => ipcRenderer.invoke('anomaly:start'),
    stop: () => ipcRenderer.invoke('anomaly:stop'),
    registerSource: (params: any) => ipcRenderer.invoke('anomaly:register-source', params),
    unregisterSource: (params: any) => ipcRenderer.invoke('anomaly:unregister-source', params),
    processFrame: (params: any) => ipcRenderer.invoke('anomaly:process-frame', params),
    processBitrate: (params: any) => ipcRenderer.invoke('anomaly:process-bitrate', params),
    getConfig: () => ipcRenderer.invoke('anomaly:get-config'),
    updateConfig: (config: any) => ipcRenderer.invoke('anomaly:update-config', config),
    getStatistics: (sourceId?: string) => ipcRenderer.invoke('anomaly:get-statistics', sourceId),
    getActiveAnomalies: () => ipcRenderer.invoke('anomaly:get-active-anomalies'),
    detectAll: () => ipcRenderer.invoke('anomaly:detect-all')
  },

  // IPC 事件监听
  ipc: {
    on: (channel: string, callback: (...args: any[]) => void) => {
      const listener = (_event: any, ...args: any[]) => callback(...args)
      ipcRenderer.on(channel, listener)
    },
    removeListener: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, callback)
    }
  },

  // 配置管理
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (config: any) => ipcRenderer.invoke('config:update', config),
    save: () => ipcRenderer.invoke('config:save'),
    load: () => ipcRenderer.invoke('config:load')
  },

  // 录制管理
  recordings: {
    getByAnomaly: (anomalyId: string) => ipcRenderer.invoke('recordings:getByAnomaly', anomalyId),
    download: (recordingId: string) => ipcRenderer.invoke('recordings:download', recordingId),
    cleanup: () => ipcRenderer.invoke('recordings:cleanup')
  },

  // 告警服务
  alerts: {
    sendTest: (alert: any) => ipcRenderer.invoke('alerts:sendTest', alert)
  },

  // 监控控制
  monitoring: {
    start: (sourceId: string) => ipcRenderer.invoke('monitoring:start', sourceId),
    stop: (sourceId: string) => ipcRenderer.invoke('monitoring:stop', sourceId),
    getStatus: (sourceId: string) => ipcRenderer.invoke('monitoring:getStatus', sourceId)
  },

  // 流事件监听
  stream: {
    onFrame: (callback: (data: { sourceId: string; frame: any }) => void) => {
      const listener = (_event: any, data: { sourceId: string; frame: any }) => callback(data)
      ipcRenderer.on('stream:frame', listener)
      return () => ipcRenderer.removeListener('stream:frame', listener)
    },
    onInfo: (callback: (data: { sourceId: string; info: any }) => void) => {
      const listener = (_event: any, data: { sourceId: string; info: any }) => callback(data)
      ipcRenderer.on('stream:info', listener)
      return () => ipcRenderer.removeListener('stream:info', listener)
    },
    onError: (callback: (data: { sourceId: string; error: string }) => void) => {
      const listener = (_event: any, data: { sourceId: string; error: string }) => callback(data)
      ipcRenderer.on('stream:error', listener)
      return () => ipcRenderer.removeListener('stream:error', listener)
    },
    onConnected: (callback: (data: { sourceId: string }) => void) => {
      const listener = (_event: any, data: { sourceId: string }) => callback(data)
      ipcRenderer.on('stream:connected', listener)
      return () => ipcRenderer.removeListener('stream:connected', listener)
    },
    onDisconnected: (callback: (data: { sourceId: string }) => void) => {
      const listener = (_event: any, data: { sourceId: string }) => callback(data)
      ipcRenderer.on('stream:disconnected', listener)
      return () => ipcRenderer.removeListener('stream:disconnected', listener)
    }
  }
})
