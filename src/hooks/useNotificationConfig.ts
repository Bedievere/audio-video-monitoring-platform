import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'

interface NotificationConfig {
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

const DEFAULT_CONFIG: NotificationConfig = {
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

interface UseNotificationConfigReturn {
  config: NotificationConfig
  loading: boolean
  updateConfig: (newConfig: Partial<NotificationConfig>) => Promise<void>
  sendTestAlert: () => Promise<void>
  clearHistory: () => Promise<void>
}

export function useNotificationConfig(): UseNotificationConfigReturn {
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)

  const loadConfig = useCallback(async () => {
    if (window.electronAPI?.notifications) {
      try {
        setLoading(true)
        const cfg = await window.electronAPI.notifications.getConfig()
        if (cfg && typeof cfg === 'object') {
          setConfig(cfg as NotificationConfig)
        }
      } catch (error) {
        console.error('Failed to load notification config:', error)
      } finally {
        setLoading(false)
      }
    }
  }, [])

  const updateConfig = useCallback(async (newConfig: Partial<NotificationConfig>) => {
    if (window.electronAPI?.notifications) {
      try {
        const result = await window.electronAPI.notifications.updateConfig(newConfig)
        if (result && typeof result === 'object' && 'config' in result) {
          setConfig((result as any).config as NotificationConfig)
          message.success('配置更新成功')
        }
      } catch (error) {
        console.error('Failed to update notification config:', error)
        message.error('配置更新失败')
      }
    }
  }, [])

  const sendTestAlert = useCallback(async () => {
    if (window.electronAPI?.notifications) {
      try {
        await window.electronAPI.notifications.sendTest()
        message.success('测试告警已发送，请检查通知')
      } catch (error) {
        console.error('Failed to send test alert:', error)
        message.error('发送测试告警失败')
      }
    }
  }, [])

  const clearHistory = useCallback(async () => {
    if (window.electronAPI?.notifications) {
      try {
        await window.electronAPI.notifications.clearHistory()
        message.success('告警历史已清空')
      } catch (error) {
        console.error('Failed to clear history:', error)
        message.error('清空历史失败')
      }
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return {
    config,
    loading,
    updateConfig,
    sendTestAlert,
    clearHistory
  }
}
