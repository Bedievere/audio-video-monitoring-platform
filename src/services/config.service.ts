import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface ConfigData {
  sources: any[]
  alert: {
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
    sound: {
      enabled: boolean
      volume: number
      filePath: string
    }
  }
  detection: {
    blackScreenThreshold: number
    snowScreenThreshold: number
    staticScreenTimeout: number
    audioLossTimeout: number
    lowVolumeThreshold: number
    highVolumeThreshold: number
    signalLossTimeout: number | { network: number; http: number }
  }
  recording: {
    enabled: boolean
    preRecordDuration: number
    postRecordDuration: number
    storagePath: string
    maxRetentionDays: number
  }
  alertFrequency: {
    emailInterval: number
    instantMessageInterval: number
  }
}

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json')

const DEFAULT_CONFIG: ConfigData = {
  sources: [],
  alert: {
    email: {
      enabled: false,
      smtpHost: '',
      smtpPort: 587,
      username: '',
      password: '',
      to: []
    },
    instantMessage: {
      enabled: false,
      type: 'wechat',
      webhookUrl: ''
    },
    sound: {
      enabled: true,
      volume: 0.5,
      filePath: ''
    }
  },
  detection: {
    blackScreenThreshold: 10,
    snowScreenThreshold: 20,
    staticScreenTimeout: 5,
    audioLossTimeout: 5,
    lowVolumeThreshold: -30,
    highVolumeThreshold: -6,
    signalLossTimeout: {
      network: 10,
      http: 15
    }
  },
  recording: {
    enabled: true,
    preRecordDuration: 30,
    postRecordDuration: 30,
    storagePath: path.join(app.getPath('userData'), 'recordings'),
    maxRetentionDays: 90
  },
  alertFrequency: {
    emailInterval: 600,
    instantMessageInterval: 300
  }
}

export class ConfigManager {
  private config: ConfigData = deepClone(DEFAULT_CONFIG)
  private loaded = false

  load(): ConfigData {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
        const parsed = JSON.parse(data) as Partial<ConfigData>
        this.config = this.deepMerge(deepClone(DEFAULT_CONFIG), parsed)
        console.log('配置已从文件加载:', CONFIG_FILE)
      } else {
        console.log('配置文件不存在，使用默认配置')
        this.config = deepClone(DEFAULT_CONFIG)
        this.save()
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      this.config = deepClone(DEFAULT_CONFIG)
    }
    this.loaded = true
    return this.config
  }

  save(): void {
    try {
      const userDataPath = app.getPath('userData')
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2))
      console.log('配置已保存到文件:', CONFIG_FILE)
    } catch (error) {
      console.error('保存配置失败:', error)
      throw error
    }
  }

  get(): ConfigData {
    if (!this.loaded) {
      this.load()
    }
    return this.config
  }

  update(updates: Partial<ConfigData>): void {
    this.config = this.deepMerge(this.config, updates)
    this.save()
  }

  reset(): void {
    this.config = deepClone(DEFAULT_CONFIG)
    this.save()
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = deepClone(target) as any

    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          source[key] !== null
        ) {
          result[key] = this.deepMerge(result[key] || {}, source[key] as any)
        } else {
          result[key] = source[key]
        }
      }
    }

    return result
  }
}

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

export const configManager = new ConfigManager()
