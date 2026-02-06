import { useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, message, Tag } from 'antd'
import { useAudioSources } from '../../hooks/useAudioSources'
import { generateId, validateUrl } from '../../utils/helpers'

export default function AudioSourcesPage() {
  const { sources, loading, fetchSources } = useAudioSources()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSource, setEditingSource] = useState<any>(null)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingSource(null)
    setModalVisible(true)
  }

  const handleEdit = (source: any) => {
    setEditingSource(source)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (window.electronAPI?.sources) {
      await window.electronAPI.sources.delete(id)
      message.success('删除成功')
      fetchSources()
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingSource) {
        await window.electronAPI.sources.update(editingSource.id, values)
        message.success('更新成功')
      } else {
        const newSource = {
          ...values,
          id: generateId(),
          status: 'disconnected' as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await window.electronAPI.sources.add(newSource)
        message.success('添加成功')
      }
      setModalVisible(false)
      setEditingSource(null)
      fetchSources()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const urlValidationRules = [
    { required: true, message: '请输入流地址' },
    {
      validator: (_: any, value: string) => {
        const protocol = form.getFieldValue('protocol')
        const result = validateUrl(value, protocol)
        if (!result.valid) {
          return Promise.reject(new Error(result.message))
        }
        return Promise.resolve()
      }
    }
  ]

  const formatValidationRules = [
    {
      dependencies: ['protocol'],
      validator: (_: any, value: string) => {
        const protocol = form.getFieldValue('protocol')
        if (protocol === 'HTTP' && !value) {
          return Promise.reject(new Error('请选择格式'))
        }
        return Promise.resolve()
      }
    }
  ]

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 250
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      width: 100
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          connected: 'green',
          disconnected: 'gray',
          error: 'red'
        }
        return <Tag color={colorMap[status]}>{status}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </span>
      )
    }
  ]

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
        <h1 style={{ margin: 0 }}>音视频源管理</h1>
        <Button type="primary" onClick={handleAdd}>
          添加音视频源
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={sources}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingSource ? '编辑音视频源' : '添加音视频源'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingSource(null)
        }}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            确定
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={editingSource || {
            name: '',
            url: '',
            protocol: 'RTSP',
            format: 'MP4'
          }}
          onFinish={handleSubmit}
        >
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入名称" />
          </Form.Item>

          <Form.Item label="URL" name="url" rules={urlValidationRules}>
            <Input placeholder="请输入流地址" />
          </Form.Item>

          <Form.Item label="协议" name="protocol" rules={[{ required: true, message: '请选择协议' }]}>
            <Select placeholder="请选择协议">
              <Select.Option value="RTSP">RTSP</Select.Option>
              <Select.Option value="RTMP">RTMP</Select.Option>
              <Select.Option value="SRT">SRT</Select.Option>
              <Select.Option value="HTTP">HTTP</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="格式" name="format" rules={formatValidationRules}>
            <Select placeholder="请选择格式">
              <Select.Option value="MP4">MP4</Select.Option>
              <Select.Option value="HLS">HLS</Select.Option>
              <Select.Option value="DASH">DASH</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
