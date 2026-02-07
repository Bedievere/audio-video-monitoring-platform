import { useState } from 'react'
import { Card, Form, InputNumber, Button, Divider, message } from 'antd'

interface DetectionConfig {
  frameRateThreshold: number
  frameRateThresholdDuration: number
  blackScreenThreshold: number
  blackScreenThresholdDuration: number
  freezeThreshold: number
  freezeThresholdDuration: number
  audioSilenceThreshold: number
  audioSilenceThresholdDuration: number
  bitrateLowThreshold: number
  bitrateHighThreshold: number
}

const DEFAULT_CONFIG: DetectionConfig = {
  frameRateThreshold: 10,
  frameRateThresholdDuration: 3000,
  blackScreenThreshold: 5,
  blackScreenThresholdDuration: 2000,
  freezeThreshold: 5000,
  freezeThresholdDuration: 2000,
  audioSilenceThreshold: -60,
  audioSilenceThresholdDuration: 5000,
  bitrateLowThreshold: 100,
  bitrateHighThreshold: 10000
}

export default function SettingsPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const loadConfig = async () => {
    if (window.electronAPI?.anomaly) {
      try {
        const config = await window.electronAPI.anomaly.getConfig()
        if (config && typeof config === 'object') {
          form.setFieldsValue(config)
        }
      } catch (error) {
        console.error('Failed to load detection config:', error)
      }
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      if (window.electronAPI?.anomaly) {
        await window.electronAPI.anomaly.updateConfig(values)
        message.success('检测配置已更新')
      }
    } catch (error) {
      console.error('Failed to save detection config:', error)
      message.error('配置保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.setFieldsValue(DEFAULT_CONFIG)
    message.info('已恢复默认配置，请点击保存按钮保存')
  }

  useState(() => {
    loadConfig()
  })

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <h1 style={{ margin: 0 }}>系统设置</h1>
        <Button type="primary" onClick={handleSave} loading={loading}>
          保存配置
        </Button>
      </div>

      <Card title="异常检测阈值设置" style={{ marginBottom: '24px' }}>
        <Form form={form} layout="vertical" initialValues={DEFAULT_CONFIG}>
          <Divider orientation="left">帧率检测</Divider>
          <Form.Item
            name="frameRateThreshold"
            label="帧率阈值 (fps)"
            extra="低于此帧率持续指定时间将被判定为低帧率异常"
          >
            <InputNumber min={1} max={60} style={{ width: '200px' }} />
          </Form.Item>

          <Form.Item
            name="frameRateThresholdDuration"
            label="帧率异常持续时间 (毫秒)"
            extra="低帧率持续超过此时间才触发告警"
          >
            <InputNumber min={100} max={60000} step={100} style={{ width: '300px' }} addonAfter="ms" />
          </Form.Item>

          <Divider orientation="left">画面异常检测</Divider>
          <Form.Item
            name="blackScreenThreshold"
            label="黑屏阈值 (帧数)"
            extra="连续检测到指定数量的黑帧将被判定为黑屏"
          >
            <InputNumber min={1} max={100} style={{ width: '200px' }} addonAfter="帧" />
          </Form.Item>

          <Form.Item
            name="blackScreenThresholdDuration"
            label="黑屏持续时间 (毫秒)"
            extra="黑屏持续超过此时间才触发告警"
          >
            <InputNumber min={100} max={30000} step={100} style={{ width: '300px' }} addonAfter="ms" />
          </Form.Item>

          <Form.Item
            name="freezeThreshold"
            label="画面冻结阈值 (毫秒)"
            extra="画面内容无变化超过此时间将被判定为冻结"
          >
            <InputNumber min={100} max={60000} step={100} style={{ width: '300px' }} addonAfter="ms" />
          </Form.Item>

          <Form.Item
            name="freezeThresholdDuration"
            label="冻结持续时间 (毫秒)"
            extra="画面冻结持续超过此时间才触发告警"
          >
            <InputNumber min={100} max={30000} step={100} style={{ width: '300px' }} addonAfter="ms" />
          </Form.Item>

          <Divider orientation="left">音频异常检测</Divider>
          <Form.Item
            name="audioSilenceThreshold"
            label="音频静音阈值 (dB)"
            extra="音量低于此值将被判定为静音"
          >
            <InputNumber min={-100} max={0} step={1} style={{ width: '200px' }} addonAfter="dB" />
          </Form.Item>

          <Form.Item
            name="audioSilenceThresholdDuration"
            label="静音持续时间 (毫秒)"
            extra="静音持续超过此时间才触发告警"
          >
            <InputNumber min={100} max={60000} step={100} style={{ width: '300px' }} addonAfter="ms" />
          </Form.Item>

          <Divider orientation="left">码率检测</Divider>
          <Form.Item
            name="bitrateLowThreshold"
            label="低码率阈值 (kbps)"
            extra="低于此码率将被判定为码率过低"
          >
            <InputNumber min={0} max={10000} step={10} style={{ width: '200px' }} addonAfter="kbps" />
          </Form.Item>

          <Form.Item
            name="bitrateHighThreshold"
            label="高码率阈值 (kbps)"
            extra="高于此码率将被判定为码率过高"
          >
            <InputNumber min={1000} max={100000} step={100} style={{ width: '200px' }} addonAfter="kbps" />
          </Form.Item>
        </Form>
      </Card>

      <Card title="操作" style={{ marginBottom: '24px' }}>
        <Button onClick={handleReset}>
          恢复默认配置
        </Button>
      </Card>

      <Card title="配置说明">
        <div style={{ color: '#666' }}>
          <h4>检测阈值说明</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li><strong>帧率检测：</strong>监控视频流的实际帧率，低于阈值时触发告警</li>
            <li><strong>黑屏检测：</strong>检测连续的黑帧数量，超过阈值时触发告警</li>
            <li><strong>画面冻结：</strong>检测画面内容是否长时间无变化</li>
            <li><strong>音频静音：</strong>检测音量是否低于设定的静音阈值</li>
            <li><strong>码率检测：</strong>监控编码码率，异常高或异常低时触发告警</li>
          </ul>
          <h4>调优建议</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li>首次使用建议使用默认配置，根据实际运行效果逐步调整</li>
            <li>对于关键信号源可以设置更严格的检测阈值</li>
            <li>检测持续时间设置不宜过短，避免因网络波动产生误报</li>
            <li>定期查看历史记录，根据误报和漏报情况调整阈值</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
