import { ipcMain } from 'electron'
import { NotificationService, NotificationConfig } from '../notification/notification.service'

let notificationService: NotificationService | null = null

export function registerNotificationHandlers(): void {
  ipcMain.handle('notification:get-config', async () => {
    if (notificationService) {
      return notificationService.getConfig()
    }
    return {}
  })

  ipcMain.handle('notification:update-config', async (_event, config) => {
    if (notificationService && config && typeof config === 'object') {
      notificationService.updateConfig(config)
      return { success: true, config: notificationService.getConfig() }
    }
    return { success: false }
  })

  ipcMain.handle('notification:send-test', async () => {
    if (notificationService) {
      await notificationService.sendTestAlert()
    }
    return { success: true }
  })

  ipcMain.handle('notification:clear-history', async () => {
    if (notificationService) {
      notificationService.clearLastNotificationTimes()
    }
    return { success: true }
  })

  ipcMain.handle('notification:get-queue-status', async () => {
    if (notificationService) {
      return notificationService.getQueueStatus()
    }
    return { queueLength: 0, isProcessing: false }
  })
}

export function initNotificationService(config?: Partial<NotificationConfig>): void {
  notificationService = new NotificationService(config)
}

export function getNotificationService(): NotificationService | null {
  return notificationService
}

export function shutdownNotificationService(): void {
  notificationService = null
}
