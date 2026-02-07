import {
  Card,
  Form,
  Switch,
  Input,
  InputNumber,
  Select,
  Button,
  Divider,
  message,
  Tabs,
  Space,
  Alert
} from 'antd'
import { useNotificationConfig } from '../../hooks/useNotificationConfig'
import { useRecordingConfig } from '../../hooks/useRecordingConfig'

export default function AlertsPage() {
  const { config, loading, updateConfig: updateNotificationConfig, sendTestAlert } = useNotificationConfig()
  const { config: recordingConfig, updateConfig: updateRecordingConfig } = useRecordingConfig()
  const [form] = Form.useForm()

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await updateNotificationConfig(values)
      await updateRecordingConfig(values)
    } catch (error) {
      message.error('请检查表单填写是否正确')
    }
  }

  const handleSendTest = async () => {
    await sendTestAlert()
  }

  const handleTabChange = () => {
    form.setFieldsValue({
      ...config,
      ...recordingConfig
    })
  }

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
        <h1 style={{ margin: 0 }}>告警与录制设置</h1>
        <Space>
          <Button onClick={handleSendTest}>发送测试告警</Button>
          <Button type="primary" onClick={handleSave} loading={loading}>
            保存配置
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={(_, allValues) => {
          form.setFieldsValue(allValues)
        }}
      >
        <Card title="全局设置" style={{ marginBottom: '16px' }}>
          <Form.Item
            name="enabled"
            label="启用告警通知"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>

        <Tabs
          defaultActiveKey="sound"
          onChange={handleTabChange}
          items={[
            {
              key: 'sound',
              label: '声音提醒',
              children: (
                <Card>
                  <Form.Item
                    name={['sound', 'enabled']}
                    label="启用声音提醒"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name={['sound', 'volume']}
                    label="音量"
                    rules={[{ type: 'number', min: 0, max: 100 }]}
                  >
                    <InputNumber min={0} max={100} style={{ width: '200px' }} />
                  </Form.Item>

                  <Form.Item
                    name={['sound', 'filePath']}
                    label="告警音效文件路径"
                    rules={[{ required: true, message: '请输入音效文件路径' }]}
                  >
                    <Input placeholder="/assets/alert.mp3" />
                  </Form.Item>
                </Card>
              )
            },
            {
              key: 'email',
              label: '邮件通知',
              children: (
                <Card>
                  <Form.Item
                    name={['email', 'enabled']}
                    label="启用邮件通知"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name={['email', 'smtpHost']}
                    label="SMTP 服务器地址"
                    rules={[{ required: true, message: '请输入SMTP服务器地址' }]}
                  >
                    <Input placeholder="smtp.gmail.com" />
                  </Form.Item>

                  <Form.Item
                    name={['email', 'smtpPort']}
                    label="SMTP 端口"
                    rules={[{ required: true, message: '请输入SMTP端口' }]}
                  >
                    <InputNumber min={1} max={65535} style={{ width: '200px' }} />
                  </Form.Item>

                  <Form.Item
                    name={['email', 'username']}
                    label="发件邮箱"
                    rules={[{ required: true, message: '请输入发件邮箱' }]}
                  >
                    <Input placeholder="your-email@gmail.com" />
                  </Form.Item>

                  <Form.Item
                    name={['email', 'password']}
                    label="邮箱密码或应用专用密码"
                    rules={[{ required: true, message: '请输入邮箱密码' }]}
                  >
                    <Input.Password placeholder="请输入密码" />
                  </Form.Item>

                  <Form.Item
                    name={['email', 'to']}
                    label="收件人邮箱列表"
                  >
                    <Select
                      mode="tags"
                      placeholder="输入邮箱后按回车添加"
                      tokenSeparators={[',', ' ', ';']}
                    />
                  </Form.Item>
                </Card>
              )
            },
            {
              key: 'im',
              label: '即时通讯',
              children: (
                <Card>
                  <Form.Item
                    name={['instantMessage', 'enabled']}
                    label="启用即时通讯通知"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name={['instantMessage', 'type']}
                    label="通知类型"
                    rules={[{ required: true, message: '请选择通知类型' }]}
                  >
                    <Select>
                      <Select.Option value="dingtalk">钉钉机器人</Select.Option>
                      <Select.Option value="wechat">企业微信机器人</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name={['instantMessage', 'webhookUrl']}
                    label="Webhook URL"
                    rules={[{ required: true, message: '请输入Webhook URL' }]}
                  >
                    <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx" />
                  </Form.Item>

                  <Alert
                    message="配置说明"
                    description={
                      <div>
                        <p><strong>钉钉机器人：</strong>在钉钉群设置中添加自定义机器人，获取Webhook URL</p>
                        <p><strong>企业微信机器人：</strong>在企业微信群设置中添加机器人，获取Webhook URL</p>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                </Card>
              )
            },
            {
              key: 'frequency',
              label: '通知频率',
              children: (
                <Card>
                  <Form.Item
                    name={['frequency', 'emailInterval']}
                    label="邮件通知间隔（毫秒）"
                    rules={[{ required: true, message: '请输入邮件通知间隔' }]}
                  >
                    <InputNumber
                      min={10000}
                      max={3600000}
                      step={10000}
                      style={{ width: '300px' }}
                    />
                  </Form.Item>
                  <p style={{ color: '#999', marginBottom: '16px' }}>
                    建议值：300000（5分钟）- 同一类型告警在指定间隔内只发送一次邮件
                  </p>

                  <Form.Item
                    name={['frequency', 'instantMessageInterval']}
                    label="即时通讯通知间隔（毫秒）"
                    rules={[{ required: true, message: '请输入即时通讯通知间隔' }]}
                  >
                    <InputNumber
                      min={10000}
                      max={3600000}
                      step={10000}
                      style={{ width: '300px' }}
                    />
                  </Form.Item>
                  <p style={{ color: '#999' }}>
                    建议值：60000（1分钟）- 同一类型告警在指定间隔内只发送一次即时通讯消息
                  </p>

                  <Divider />

                  <Alert
                    message="频率设置说明"
                    description={
                      <div>
                        <p>为避免同一类型异常频繁发送通知造成骚扰，系统会对通知频率进行控制：</p>
                        <ul>
                          <li>同一类型的异常在设置的间隔时间内只发送一次通知</li>
                          <li>异常恢复正常后，下次再发生时会重新发送通知</li>
                          <li>桌面通知和声音提醒不受频率限制</li>
                        </ul>
                      </div>
                    }
                    type="warning"
                    showIcon
                  />
                </Card>
              )
            },
            {
              key: 'recording',
              label: '异常录制',
              children: (
                <Card>
                  <Form.Item
                    name="enabled"
                    label="启用异常录制"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="preRecordDuration"
                    label="预录制时长（毫秒）"
                    rules={[{ required: true, message: '请输入预录制时长' }]}
                    extra="在异常发生前录制的时间长度，用于获取异常发生前的情况"
                  >
                    <InputNumber
                      min={1000}
                      max={30000}
                      step={1000}
                      style={{ width: '300px' }}
                      addonAfter="ms"
                    />
                  </Form.Item>
                  <p style={{ color: '#999', marginBottom: '16px' }}>
                    建议值：5000（5秒）- 在异常发生前录制5秒画面
                  </p>

                  <Form.Item
                    name="postRecordDuration"
                    label="后录制时长（毫秒）"
                    rules={[{ required: true, message: '请输入后录制时长' }]}
                    extra="在异常发生后录制的时间长度"
                  >
                    <InputNumber
                      min={5000}
                      max={60000}
                      step={1000}
                      style={{ width: '300px' }}
                      addonAfter="ms"
                    />
                  </Form.Item>
                  <p style={{ color: '#999', marginBottom: '16px' }}>
                    建议值：10000（10秒）- 在异常发生后录制10秒画面
                  </p>

                  <Form.Item
                    name="storagePath"
                    label="录制文件存储路径"
                    extra="留空使用默认路径"
                  >
                    <Input placeholder="留空使用默认路径" />
                  </Form.Item>

                  <Form.Item
                    name="maxRetentionDays"
                    label="录制文件保留天数"
                    rules={[{ required: true, message: '请输入保留天数' }]}
                    extra="超过此天数的录制文件将被自动删除"
                  >
                    <InputNumber
                      min={1}
                      max={365}
                      style={{ width: '200px' }}
                      addonAfter="天"
                    />
                  </Form.Item>
                  <p style={{ color: '#999' }}>
                    建议值：30天 - 自动删除30天前的录制文件
                  </p>

                  <Divider />

                  <Alert
                    message="录制功能说明"
                    description={
                      <div>
                        <p>异常录制功能会在检测到异常时自动开始录制：</p>
                        <ul>
                          <li><strong>预录制：</strong>在异常发生前开始录制，用于获取异常发生前的情况</li>
                          <li><strong>后录制：</strong>在异常发生后继续录制一段时间，用于记录异常的发展过程</li>
                          <li><strong>自动清理：</strong>系统会定期清理超过保留天数的录制文件</li>
                          <li><strong>文件命名：</strong>录制文件按时间戳和异常类型自动命名</li>
                        </ul>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                </Card>
              )
            }
          ]}
        />
      </Form>
    </div>
  )
}
