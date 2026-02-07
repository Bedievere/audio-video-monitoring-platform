import { ipcMain, BrowserWindow } from 'electron'
import { audioSourceRepository, anomalyRepository } from '../database/repositories'
import { configManager } from './config.service'
import { StreamManager } from '../streaming'

let streamManagerInstance: StreamManager | null = null

export function registerIpcHandlers(): void {
  streamManagerInstance = new StreamManager({
    onFrame: (sourceId, frame) => {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('stream:frame', { sourceId, frame })
      }
    },
    onInfo: (sourceId, info) => {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('stream:info', { sourceId, info })
      }
    },
    onError: (sourceId, error) => {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('stream:error', { sourceId, error: error.message })
      }
    },
    onConnected: (sourceId) => {
      audioSourceRepository.updateStatus(sourceId, 'connected')
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('stream:connected', { sourceId })
      }
    },
    onDisconnected: (sourceId) => {
      audioSourceRepository.updateStatus(sourceId, 'disconnected')
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('stream:disconnected', { sourceId })
      }
    }
  })

  ipcMain.handle('sources:getAll', async () => {
    return await audioSourceRepository.findAll()
  })

  ipcMain.handle('sources:getById', async (_event, id: string) => {
    return await audioSourceRepository.findById(id)
  })

  ipcMain.handle('sources:add', async (_event, source: any) => {
    await audioSourceRepository.create(source)
  })

  ipcMain.handle('sources:update', async (_event, id: string, source: any) => {
    await audioSourceRepository.update(id, source)
  })

  ipcMain.handle('sources:delete', async (_event, id: string) => {
    await audioSourceRepository.delete(id)
  })

  ipcMain.handle('sources:updateStatus', async (_event, id: string, status: string) => {
    await audioSourceRepository.updateStatus(id, status as any)
  })

  ipcMain.handle('anomalies:getAll', async (_event, filters?: any) => {
    return await anomalyRepository.findAll(filters)
  })

  ipcMain.handle('anomalies:record', async (_event, anomaly: any) => {
    await anomalyRepository.create(anomaly)
  })

  ipcMain.handle('anomalies:update', async (_event, id: string, updates: any) => {
    await anomalyRepository.update(id, updates)
  })

  ipcMain.handle('anomalies:exportToCSV', async (_event, anomalies: any[]) => {
    if (anomalies.length === 0) {
      return ''
    }

    const headers = ['id', 'source_id', 'source_name', 'type', 'start_time', 'end_time', 'duration', 'details']
    const rows = anomalies.map((a) => [
      a.id,
      a.sourceId,
      a.sourceName,
      a.type,
      a.startTime.toISOString(),
      a.endTime?.toISOString() || '',
      a.duration?.toString() || '',
      JSON.stringify(a.details)
    ])

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  })

  ipcMain.handle('config:get', async () => {
    return configManager.get()
  })

  ipcMain.handle('config:update', async (_event, config: any) => {
    configManager.update(config)
  })

  ipcMain.handle('config:save', async () => {
    configManager.save()
  })

  ipcMain.handle('config:load', async () => {
    return configManager.load()
  })

  ipcMain.handle('recordings:getByAnomaly', async () => {
    return []
  })

  ipcMain.handle('recordings:download', async () => {
    return Buffer.from('')
  })

  ipcMain.handle('recordings:cleanup', async () => {
  })

  ipcMain.handle('alerts:sendTest', async (_event, alert: any) => {
    console.log('测试告警:', alert)
  })

  ipcMain.handle('monitoring:start', async (_event, sourceId: string) => {
    const source = await audioSourceRepository.findById(sourceId)
    if (!source) {
      throw new Error(`Source ${sourceId} not found`)
    }
    if (streamManagerInstance) {
      streamManagerInstance.addSource(source)
      await streamManagerInstance.startSource(sourceId)
    }
  })

  ipcMain.handle('monitoring:stop', async (_event, sourceId: string) => {
    if (streamManagerInstance) {
      await streamManagerInstance.stopSource(sourceId)
      streamManagerInstance.removeSource(sourceId)
    }
  })

  ipcMain.handle('monitoring:getStatus', async (_event, sourceId: string) => {
    if (streamManagerInstance) {
      const status = streamManagerInstance.getStatus(sourceId)
      return status ? { status: status.active ? 'running' : 'idle', connected: status.connected } : { status: 'idle', connected: false }
    }
    return { status: 'idle', connected: false }
  })
}
