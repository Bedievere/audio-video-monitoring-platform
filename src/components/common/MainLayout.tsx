import { Layout, Menu } from 'antd'
import {
  MonitorOutlined,
  VideoCameraOutlined,
  AlertOutlined,
  SettingOutlined,
  HistoryOutlined
} from '@ant-design/icons'
import { useState } from 'react'

const { Header, Content, Sider } = Layout

export default function MainLayout() {
  const [selectedKey, setSelectedKey] = useState('monitoring')

  const menuItems = [
    { key: 'monitoring', icon: <MonitorOutlined />, label: '实时监控' },
    { key: 'sources', icon: <VideoCameraOutlined />, label: '音视频源管理' },
    { key: 'alerts', icon: <AlertOutlined />, label: '告警管理' },
    { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
    { key: 'settings', icon: <SettingOutlined />, label: '系统设置' }
  ]

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
          <div style={{ padding: '24px', background: '#fff', minHeight: '100%' }}>
            {selectedKey === 'monitoring' && (
              <div>
                <h2>实时监控</h2>
                <p>选择左侧音视频源开始监控</p>
              </div>
            )}
            {selectedKey === 'sources' && (
              <div>
                <h2>音视频源管理</h2>
                <p>管理RTSP、RTMP、SRT、HTTP等音视频源</p>
              </div>
            )}
            {selectedKey === 'alerts' && (
              <div>
                <h2>告警管理</h2>
                <p>查看和管理告警通知</p>
              </div>
            )}
            {selectedKey === 'history' && (
              <div>
                <h2>历史记录</h2>
                <p>查看异常历史记录</p>
              </div>
            )}
            {selectedKey === 'settings' && (
              <div>
                <h2>系统设置</h2>
                <p>配置系统参数</p>
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
