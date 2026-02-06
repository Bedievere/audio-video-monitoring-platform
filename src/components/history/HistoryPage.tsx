import { useState } from 'react'
import { Table, Button, DatePicker, Select, Space, Tag, Modal } from 'antd'
import { useHistory } from '../../hooks/useHistory'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

const anomalyTypeMap: Record<string, string> = {
  stream_interrupted: '流中断',
  frame_loss: '丢帧',
  audio_missing: '音频静音',
  video_black: '画面黑屏',
  video_freeze: '画面冻结',
  low_frame_rate: '帧率过低',
  high_bitrate: '码率过高',
  low_bitrate: '码率过低',
  connection_failed: '连接失败',
  timeout: '连接超时'
}

const severityMap: Record<string, { text: string; color: string }> = {
  low: { text: '低', color: 'blue' },
  medium: { text: '中', color: 'orange' },
  high: { text: '高', color: 'red' }
}

export default function HistoryPage() {
  const { anomalies, loading, loadAnomalies, exportAnomalies } = useHistory()
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [selectedRow, setSelectedRow] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const filteredAnomalies = anomalies.filter(anomaly => {
    if (selectedType && anomaly.type !== selectedType) return false
    if (dateRange) {
      const [start, end] = dateRange
      const anomalyTime = dayjs(anomaly.timestamp)
      if (anomalyTime.isBefore(start) || anomalyTime.isAfter(end)) return false
    }
    return true
  })

  const columns = [
    {
      title: '异常ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
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
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => anomalyTypeMap[type] || type
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (severity: string) => {
        const { text, color } = severityMap[severity] || { text: severity, color: 'default' }
        return <Tag color={color}>{text}</Tag>
      }
    },
    {
      title: '描述',
      dataIndex: 'message',
      key: 'message',
      width: 200,
      ellipsis: true
    },
    {
      title: '检测时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (time: number) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '状态',
      dataIndex: 'resolved',
      key: 'resolved',
      width: 80,
      render: (resolved: boolean) => (
        <Tag color={resolved ? 'green' : 'red'}>
          {resolved ? '已恢复' : '未恢复'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => handleViewDetails(record)}>
          查看详情
        </Button>
      )
    }
  ]

  const handleViewDetails = (record: any) => {
    setSelectedRow(record)
    setModalVisible(true)
  }

  const handleExport = () => {
    exportAnomalies(filteredAnomalies)
  }

  const handleResetFilters = () => {
    setSelectedType(undefined)
    setDateRange(null)
  }

  const handleRefresh = () => {
    loadAnomalies()
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
        <h1 style={{ margin: 0 }}>历史记录</h1>
        <Space>
          <Select
            placeholder="选择异常类型"
            allowClear
            style={{ width: 150 }}
            value={selectedType}
            onChange={setSelectedType}
          >
            {Object.entries(anomalyTypeMap).map(([key, label]) => (
              <Select.Option key={key} value={key}>
                {label}
              </Select.Option>
            ))}
          </Select>
          <RangePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={['开始时间', '结束时间']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
          />
          <Button onClick={handleResetFilters}>重置筛选</Button>
          <Button onClick={handleRefresh}>刷新</Button>
          <Button type="primary" onClick={handleExport}>
            导出数据
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredAnomalies}
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
        title="异常详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedRow && (
          <div>
            <p><strong>异常ID：</strong> {selectedRow.id}</p>
            <p><strong>音视频源：</strong> {selectedRow.sourceName}</p>
            <p>
              <strong>异常类型：</strong>
              <Tag color="blue">{anomalyTypeMap[selectedRow.type]}</Tag>
            </p>
            <p>
              <strong>严重程度：</strong>
              <Tag color={severityMap[selectedRow.severity]?.color}>
                {severityMap[selectedRow.severity]?.text}
              </Tag>
            </p>
            <p><strong>描述：</strong> {selectedRow.message}</p>
            <p>
              <strong>检测时间：</strong>
              {dayjs(selectedRow.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </p>
            {selectedRow.resolvedAt && (
              <p>
                <strong>恢复时间：</strong>
                {dayjs(selectedRow.resolvedAt).format('YYYY-MM-DD HH:mm:ss')}
              </p>
            )}
            {selectedRow.duration && (
              <p>
                <strong>持续时间：</strong>
                {`${(selectedRow.duration / 1000).toFixed(2)} 秒`}
              </p>
            )}
            <p>
              <strong>状态：</strong>
              <Tag color={selectedRow.resolved ? 'green' : 'red'}>
                {selectedRow.resolved ? '已恢复' : '未恢复'}
              </Tag>
            </p>
            {selectedRow.metadata && Object.keys(selectedRow.metadata).length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <strong>额外信息：</strong>
                <pre style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  marginTop: '8px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {JSON.stringify(selectedRow.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
