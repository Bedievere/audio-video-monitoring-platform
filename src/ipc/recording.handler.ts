import { ipcMain } from 'electron'
import { AnomalyRecorder, RecordingConfig } from '../recording/anomaly.recorder'

let recorder: AnomalyRecorder | null = null

export function registerRecordingHandlers(): void {
  ipcMain.handle('recording:get-config', async () => {
    if (recorder) {
      return recorder.getConfig()
    }
    return {}
  })

  ipcMain.handle('recording:update-config', async (_event, config: Partial<RecordingConfig>) => {
    if (recorder) {
      recorder.updateConfig(config)
      return { success: true, config: recorder.getConfig() }
    }
    return { success: false }
  })

  ipcMain.handle('recording:get-all', async () => {
    if (recorder) {
      return recorder.getAllRecordings()
    }
    return []
  })

  ipcMain.handle('recording:get-by-anomaly', async (_event, anomalyId: string) => {
    if (recorder) {
      return recorder.getRecordingsByAnomaly(anomalyId)
    }
    return []
  })

  ipcMain.handle('recording:get-by-source', async (_event, sourceId: string) => {
    if (recorder) {
      return recorder.getRecordingsBySource(sourceId)
    }
    return []
  })

  ipcMain.handle('recording:get-stats', async () => {
    if (recorder) {
      return recorder.getRecordingStats()
    }
    return {
      totalRecordings: 0,
      totalSize: 0,
      oldestRecording: null,
      newestRecording: null
    }
  })

  ipcMain.handle('recording:delete', async (_event, recordingId: string) => {
    if (recorder) {
      await recorder.deleteRecording(recordingId)
      return { success: true }
    }
    return { success: false }
  })

  ipcMain.handle('recording:cleanup', async () => {
    if (recorder) {
      await recorder.cleanupOldRecordings()
      return { success: true }
    }
    return { success: false }
  })
}

export function initRecordingService(config?: Partial<RecordingConfig>): void {
  if (!recorder) {
    recorder = new AnomalyRecorder(config)
  }
}

export function getRecordingService(): AnomalyRecorder | null {
  return recorder
}

export function shutdownRecordingService(): void {
  if (recorder) {
    recorder.dispose()
    recorder = null
  }
}

export function registerSourceForRecording(sourceId: string): void {
  if (recorder) {
    recorder.registerSource(sourceId)
  }
}

export function unregisterSourceForRecording(sourceId: string): void {
  if (recorder) {
    recorder.unregisterSource(sourceId)
  }
}

export function processFrameForRecording(sourceId: string, frame: { data: Buffer; timestamp: number }): void {
  if (recorder) {
    recorder.processFrame(sourceId, frame)
  }
}
