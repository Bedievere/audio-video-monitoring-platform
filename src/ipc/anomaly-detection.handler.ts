import { ipcMain } from 'electron'
import { AnomalyDetector } from '../detection/anomaly.detector'
import { AnomalyDetectionConfig, AnomalyEvent } from '../types/detection.types'
import { getNotificationService } from './notification.handler'
import {
  getRecordingService,
  registerSourceForRecording,
  unregisterSourceForRecording,
  processFrameForRecording
} from './recording.handler'

let detector: AnomalyDetector | null = null

export function registerAnomalyDetectionHandlers(): void {
  ipcMain.handle('anomaly:start', async () => {
    if (!detector) {
      detector = new AnomalyDetector()
      setupDetectorEvents()
    }
    if (!detector.isRunning()) {
      detector.startDetection()
    }
    return { success: true }
  })

  ipcMain.handle('anomaly:stop', async () => {
    if (detector) {
      detector.stopDetection()
    }
    return { success: true }
  })

  ipcMain.handle('anomaly:register-source', async (_, { sourceId }) => {
    if (detector) {
      detector.registerSource(sourceId)
    }
    registerSourceForRecording(sourceId)
    return { success: true }
  })

  ipcMain.handle('anomaly:unregister-source', async (_, { sourceId }) => {
    if (detector) {
      detector.unregisterSource(sourceId)
    }
    unregisterSourceForRecording(sourceId)
    return { success: true }
  })

  ipcMain.handle('anomaly:process-frame', async (_, { sourceId, frame }) => {
    if (detector) {
      detector.processFrame(sourceId, frame)
    }
    processFrameForRecording(sourceId, { data: frame.data, timestamp: Date.now() })
    return { success: true }
  })

  ipcMain.handle('anomaly:process-bitrate', async (_, { sourceId, bitrate }) => {
    if (detector) {
      detector.processBitrate(sourceId, bitrate)
    }
    return { success: true }
  })

  ipcMain.handle('anomaly:get-config', async () => {
    return detector?.getConfig() || {}
  })

  ipcMain.handle('anomaly:update-config', async (_, config: Partial<AnomalyDetectionConfig>) => {
    if (detector) {
      detector.updateConfig(config)
      return { success: true, config: detector.getConfig() }
    }
    return { success: false }
  })

  ipcMain.handle('anomaly:get-statistics', async (_, sourceId?: string) => {
    if (detector) {
      if (sourceId) {
        return detector.getStatistics(sourceId)
      }
      return Object.fromEntries(detector.getAllStatistics())
    }
    return {}
  })

  ipcMain.handle('anomaly:get-active-anomalies', async () => {
    if (detector) {
      return detector.getActiveAnomalies()
    }
    return []
  })

  ipcMain.handle('anomaly:detect-all', async () => {
    if (detector) {
      const results = detector.detectAll()
      return Object.fromEntries(results)
    }
    return {}
  })
}

function setupDetectorEvents(): void {
  if (!detector) return

  detector.on('anomaly-detected', async (anomaly: AnomalyEvent) => {
    const notificationService = getNotificationService()
    if (notificationService) {
      notificationService.queueAnomalyAlert(anomaly)
    }
    const recordingService = getRecordingService()
    if (recordingService) {
      await recordingService.startRecording(anomaly)
    }
    if (detector) {
      const mainWindow = require('electron').BrowserWindow.getAllWindows()[0]
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('anomaly:detected', anomaly)
      }
    }
  })

  detector.on('anomaly-resolved', (anomaly: AnomalyEvent) => {
    const recordingService = getRecordingService()
    if (recordingService) {
      recordingService.stopRecording(anomaly.sourceId, 'anomaly_resolved')
    }
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0]
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('anomaly:resolved', anomaly)
    }
  })

  detector.on('source-anomaly', ({ sourceId, result }) => {
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0]
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('source:anomaly', { sourceId, result })
    }
  })

  detector.on('config-updated', (config: AnomalyDetectionConfig) => {
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0]
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('anomaly:config-updated', config)
    }
  })
}

export function getDetector(): AnomalyDetector | null {
  return detector
}

export function shutdownAnomalyDetection(): void {
  if (detector) {
    detector.dispose()
    detector = null
  }
}
