import { Notification } from 'electron'
import { AnomalyEvent } from '../types/detection.types'

export interface NotificationConfig {
  enabled: boolean
  sound: {
    enabled: boolean
    volume: number
    filePath: string
  }
  email: {
    enabled: boolean
    smtpHost: string
    smtpPort: number
    username: string
    password: string
    to: string[]
  }
  instantMessage: {
    enabled: boolean
    type: 'wechat' | 'dingtalk'
    webhookUrl: string
  }
  frequency: {
    emailInterval: number
    instantMessageInterval: number
  }
}

export class NotificationService {
  private config: NotificationConfig
  private lastNotificationTimes: Map<string, number> = new Map()
  private notificationQueue: AnomalyEvent[] = []
  private isProcessingQueue: boolean = false

  constructor(config: Partial<NotificationConfig> = {}) {
    const defaultConfig = this.getDefaultConfig()
    this.config = this.mergeConfig(defaultConfig, config)
  }

  private mergeConfig(base: NotificationConfig, partial: Partial<NotificationConfig>): NotificationConfig {
    return {
      ...base,
      ...partial,
      sound: { ...base.sound, ...partial.sound },
      email: { ...base.email, ...partial.email },
      instantMessage: { ...base.instantMessage, ...partial.instantMessage },
      frequency: { ...base.frequency, ...partial.frequency }
    }
  }

  private getDefaultConfig(): NotificationConfig {
    return {
      enabled: true,
      sound: {
        enabled: true,
        volume: 80,
        filePath: '/assets/alert.mp3'
      },
      email: {
        enabled: false,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        username: '',
        password: '',
        to: []
      },
      instantMessage: {
        enabled: false,
        type: 'dingtalk',
        webhookUrl: ''
      },
      frequency: {
        emailInterval: 300000,
        instantMessageInterval: 60000
      }
    }
  }

  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): NotificationConfig {
    return { ...this.config }
  }

  async sendAnomalyAlert(anomaly: AnomalyEvent): Promise<void> {
    if (!this.config.enabled) return

    if (!this.shouldSendNotification(anomaly)) {
      return
    }

    if (this.config.sound.enabled) {
      this.playSoundAlert()
    }

    if (this.config.email.enabled) {
      await this.sendEmailAlert(anomaly)
    }

    if (this.config.instantMessage.enabled) {
      await this.sendInstantMessageAlert(anomaly)
    }

    this.showDesktopNotification(anomaly)

    this.updateLastNotificationTime(anomaly)
  }

  private shouldSendNotification(anomaly: AnomalyEvent): boolean {
    const lastTime = this.lastNotificationTimes.get(anomaly.type)
    if (!lastTime) return true

    const now = Date.now()
    const elapsed = now - lastTime

    const interval = this.getNotificationInterval(anomaly.type)
    return elapsed >= interval
  }

  private getNotificationInterval(_type: string): number {
    if (this.config.email.enabled) {
      return this.config.frequency.emailInterval
    }
    if (this.config.instantMessage.enabled) {
      return this.config.frequency.instantMessageInterval
    }
    return 60000
  }

  private updateLastNotificationTime(anomaly: AnomalyEvent): void {
    this.lastNotificationTimes.set(anomaly.type, Date.now())
  }

  private playSoundAlert(): void {
    try {
      const audio = new Audio(this.config.sound.filePath)
      audio.volume = this.config.sound.volume / 100
      audio.play().catch(err => {
        console.error('Failed to play alert sound:', err)
      })
    } catch (error) {
      console.error('Failed to create audio player:', error)
    }
  }

  private async sendEmailAlert(anomaly: AnomalyEvent): Promise<void> {
    try {
      const nodemailer = require('nodemailer')

      const transporter = nodemailer.createTransport({
        host: this.config.email.smtpHost,
        port: this.config.email.smtpPort,
        secure: true,
        auth: {
          user: this.config.email.username,
          pass: this.config.email.password
        }
      })

      const mailOptions = {
        from: this.config.email.username,
        to: this.config.email.to.join(', '),
        subject: `音视频监控异常告警 - ${anomaly.sourceName}`,
        text: this.formatAlertMessage(anomaly)
      }

      await transporter.sendMail(mailOptions)
      console.log('Email alert sent for anomaly:', anomaly.id)
    } catch (error) {
      console.error('Failed to send email alert:', error)
    }
  }

  private async sendInstantMessageAlert(anomaly: AnomalyEvent): Promise<void> {
    if (!this.config.instantMessage.webhookUrl) return

    try {
      const fetch = require('node-fetch')

      const message = this.formatAlertMessage(anomaly)

      const payload = {
        text: message,
        at: new Date().toISOString()
      }

      await fetch(this.config.instantMessage.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('Instant message alert sent for anomaly:', anomaly.id)
    } catch (error) {
      console.error('Failed to send instant message alert:', error)
    }
  }

  private showDesktopNotification(anomaly: AnomalyEvent): void {
    const title = `监控异常 - ${anomaly.sourceName}`
    const body = `${anomaly.message} (${anomaly.type})`

    new Notification({
      title,
      body,
      urgency: 'critical',
      timeoutType: 'never',
      silent: false
    }).show()
  }

  private formatAlertMessage(anomaly: AnomalyEvent): string {
    const { sourceName, type, message, timestamp } = anomaly
    const time = new Date(timestamp).toLocaleString('zh-CN')

    return `
异常音视频源: ${sourceName}
异常类型: ${type}
异常描述: ${message}
检测时间: ${time}
    `.trim()
  }

  queueAnomalyAlert(anomaly: AnomalyEvent): void {
    this.notificationQueue.push(anomaly)

    if (!this.isProcessingQueue) {
      this.processNotificationQueue()
    }
  }

  private async processNotificationQueue(): Promise<void> {
    this.isProcessingQueue = true

    while (this.notificationQueue.length > 0) {
      const anomaly = this.notificationQueue.shift()
      if (anomaly) {
        await this.sendAnomalyAlert(anomaly)
        await this.delay(1000)
      }
    }

    this.isProcessingQueue = false
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async sendTestAlert(): Promise<void> {
    const testAnomaly: AnomalyEvent = {
      id: 'test-' + Date.now(),
      sourceId: 'test',
      sourceName: '测试源',
      type: 'stream_interrupted',
      severity: 'low',
      message: '这是一条测试告警消息',
      timestamp: Date.now(),
      resolved: false
    }
    await this.sendAnomalyAlert(testAnomaly)
  }

  clearLastNotificationTimes(): void {
    this.lastNotificationTimes.clear()
  }

  getQueueStatus(): {
    queueLength: number
    isProcessing: boolean
  } {
    return {
      queueLength: this.notificationQueue.length,
      isProcessing: this.isProcessingQueue
    }
  }
}
