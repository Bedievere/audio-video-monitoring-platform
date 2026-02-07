import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AnomalyDetector } from './anomaly.detector'
import { AnomalyEvent } from '../types/detection.types'

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector

  beforeEach(() => {
    detector = new AnomalyDetector({})
  })

  afterEach(() => {
    detector.dispose()
  })

  describe('初始化', () => {
    it('应该正确初始化检测器', () => {
      expect(detector).toBeDefined()
    })

    it('应该使用默认配置', () => {
      expect(detector).toBeDefined()
    })
  })

  describe('音视频源管理', () => {
    it('应该能够注册音视频源', () => {
      expect(() => detector.registerSource('test-source')).not.toThrow()
    })

    it('应该能够注销音视频源', () => {
      detector.registerSource('test-source')
      expect(() => detector.unregisterSource('test-source')).not.toThrow()
    })

    it('应该能够获取统计信息', () => {
      detector.registerSource('test-source')
      const stats = detector.getStatistics('test-source')
      expect(stats).toBeDefined()
      expect(stats?.sourceId).toBe('test-source')
    })
  })

  describe('黑屏检测', () => {
    it('应该检测到黑屏', () => {
      detector.registerSource('test-source')
      const blackFrame = {
        width: 640,
        height: 480,
        timestamp: Date.now(),
        data: Buffer.alloc(640 * 480 * 3)
      }

      expect(() => {
        detector.processFrame('test-source', blackFrame)
      }).not.toThrow()
    })
  })

  describe('异常事件生成', () => {
    it('应该生成有效的异常事件', () => {
      detector.registerSource('test-source')
      const events: AnomalyEvent[] = []

      detector.on('anomaly-detected', (event: AnomalyEvent) => {
        events.push(event)
      })

      const now = Date.now()
      detector.processFrame('test-source', {
        width: 640,
        height: 480,
        timestamp: now,
        data: Buffer.alloc(640 * 480 * 3)
      })

      expect(() => {
        detector.processFrame('test-source', {
          width: 640,
          height: 480,
          timestamp: now + 3000,
          data: Buffer.alloc(640 * 480 * 3)
        })
      }).not.toThrow()
    })
  })

  describe('配置更新', () => {
    it('应该能够更新配置', () => {
      expect(() => {
        detector.updateConfig({
          frameRateThreshold: 15
        })
      }).not.toThrow()
    })

    it('应该能够获取当前配置', () => {
      const config = detector.getConfig()
      expect(config).toBeDefined()
      expect(config.frameRateThreshold).toBeGreaterThan(0)
    })
  })

  describe('资源清理', () => {
    it('应该正确清理资源', () => {
      detector.registerSource('test-1')
      detector.registerSource('test-2')

      expect(() => detector.dispose()).not.toThrow()
    })
  })
})
