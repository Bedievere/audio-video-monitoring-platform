import { useState } from 'react'
import { Table, Button, Space, Tag, Modal, message, Descriptions, Statistic, Row, Col } from 'antd'
import { useHistory } from '../../hooks/useHistory'
import dayjs from 'dayjs'

export interface RecordingMetadata {
  id: string
  anomalyId: string
  sourceId: string
  sourceName: string
  anomalyType: string
  filePath: string
  startTime: number
  endTime: number
  duration: number
  fileSize: number
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) {
    return `${hours}小时 ${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟 ${seconds % 60}秒`
  }
  return `${seconds}秒`
}

export default function RecordingsPage() {
  const { recordings, loading, stats, deleteRecording, cleanupRecordings, loadRecordings } = useHistory()
  const [selectedRow, setSelectedRow] = useState<RecordingMetadata | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条录制记录吗？',
      onOk: async () => {
        await deleteRecording(id)
        message.success('删除成功')
      }
    })
  }

  const handleCleanup = async () => {
    Modal.confirm({
      title: '确认清理',
      content: '确定要清理过期的录制文件吗？',
      onOk: async () => {
        await cleanupRecordings()
        message.success('清理完成')
      }
    })
  }

  const handleRefresh = () => {
    loadRecordings()
  }

  const columns = [
    {
      title: '录制ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true
    },
    {
      title: '音视频源',
      dataIndex: 'sourceName',
      key: 'sourceName',
      width: 120
    },
    {
      title: '异常类型',
      dataIndex: 'anomalyType',
      key: 'anomalyType',
      width: 120
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
      render: (time: number) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 180,
      render: (time: number) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (duration: number) => formatDuration(duration)
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: RecordingMetadata) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelectedRow(record)}>
            详情
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
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
        <h1 style={{ margin: 0 }}>录制记录</h1>
        <Space>
          <Button onClick={handleRefresh}>刷新</Button>
          <Button onClick={handleCleanup}>清理过期录制</Button>
        </Space>
      </div>

      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic
              title="录制总数"
              value={stats.totalRecordings}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="占用空间"
              value={formatFileSize(stats.totalSize)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="最早录制"
              value={stats.oldestRecording
                ? dayjs(stats.oldestRecording).format('YYYY-MM-DD')
                : '-'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="最新录制"
              value={stats.newestRecording
                ? dayjs(stats.newestRecording).format('YYYY-MM-DD')
                : '-'}
            />
          </Col>
        </Row>
      )}

      <Table
        columns={columns}
        dataSource={recordings}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="录制详情"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setSelectedRow(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setModalVisible(false)
            setSelectedRow(null)
          }}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedRow && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="录制ID">{selectedRow.id}</Descriptions.Item>
            <Descriptions.Item label="音视频源">{selectedRow.sourceName}</Descriptions.Item>
            <Descriptions.Item label="异常类型">
              <Tag color="blue">{selectedRow.anomalyType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {dayjs(selectedRow.startTime).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {dayjs(selectedRow.endTime).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="持续时间">
              {formatDuration(selectedRow.duration)}
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {formatFileSize(selectedRow.fileSize)}
            </Descriptions.Item>
            <Descriptions.Item label="文件路径">
              {selectedRow.filePath}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
