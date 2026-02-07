import { Layout, Menu } from 'antd'
import {
  MonitorOutlined,
  VideoCameraOutlined,
  AlertOutlined,
  SettingOutlined,
  HistoryOutlined,
  FileOutlined
} from '@ant-design/icons'
import { lazy, Suspense, useState } from 'react'
import { Spin } from 'antd'

const MonitoringPage = lazy(() => import('../monitoring/MonitoringPage'))
const AudioSourcesPage = lazy(() => import('../monitoring/AudioSourcesPage'))
const AlertsPage = lazy(() => import('../alerts/AlertsPage'))
const HistoryPage = lazy(() => import('../history/HistoryPage'))
const RecordingsPage = lazy(() => import('../history/RecordingsPage'))
const SettingsPage = lazy(() => import('../settings/SettingsPage'))

const { Header, Content, Sider } = Layout

export default function MainLayout() {
  const [selectedKey, setSelectedKey] = useState('monitoring')

  const menuItems = [
    { key: 'monitoring', icon: <MonitorOutlined />, label: '实时监控' },
    { key: 'sources', icon: <VideoCameraOutlined />, label: '音视频源管理' },
    { key: 'alerts', icon: <AlertOutlined />, label: '告警管理' },
    { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
    { key: 'recordings', icon: <FileOutlined />, label: '录制记录' },
    { key: 'settings', icon: <SettingOutlined />, label: '系统设置' }
  ]

  const loadingFallback = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Spin size="large" />
    </div>
  )

  return (
    <Layout style={{ height: '100%' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: '#001529' }}>
        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
          音视频监播平台
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="dark">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
            onClick={({ key }) => setSelectedKey(key)}
          />
        </Sider>
        <Content style={{ padding: '24px', overflow: 'auto' }}>
          <Suspense fallback={loadingFallback}>
            {selectedKey === 'monitoring' && <MonitoringPage />}
            {selectedKey === 'sources' && <AudioSourcesPage />}
            {selectedKey === 'alerts' && <AlertsPage />}
            {selectedKey === 'history' && <HistoryPage />}
            {selectedKey === 'recordings' && <RecordingsPage />}
            {selectedKey === 'settings' && <SettingsPage />}
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
