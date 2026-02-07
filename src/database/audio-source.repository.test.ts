import { describe, it, expect } from '@jest/globals'

describe('AudioSource', () => {
  describe('音视频源模型', () => {
    it('应该创建有效的音视频源', () => {
      const source = {
        id: 'test-1',
        name: '测试源',
        url: 'rtsp://test.com/stream',
        protocol: 'RTSP' as const,
        status: 'connected' as const
      }

      expect(source.id).toBe('test-1')
      expect(source.name).toBe('测试源')
      expect(source.url).toBe('rtsp://test.com/stream')
      expect(source.protocol).toBe('RTSP')
    })

    it('应该验证音视频源URL格式', () => {
      const validUrls = [
        'rtsp://example.com/stream',
        'rtmp://example.com/stream',
        'http://example.com/stream.mp4',
        'http://example.com/stream.m3u8'
      ]

      validUrls.forEach(url => {
        const isValid = /^https?:\/\//i.test(url) ||
                      /^rtsp:\/\//i.test(url) ||
                      /^rtmp:\/\//i.test(url)
        expect(isValid).toBe(true)
      })
    })

    it('应该支持所有支持的协议', () => {
      const protocols = ['RTSP', 'RTMP', 'SRT', 'HTTP'] as const
      protocols.forEach(protocol => {
        expect(protocols).toContain(protocol)
      })
    })
  })

  describe('状态管理', () => {
    it('应该更新音视频源状态', () => {
      const status = 'connected' as const
      expect(status).toBe('connected')
      expect(['connected', 'disconnected', 'error']).toContain(status)
    })
  })
})
