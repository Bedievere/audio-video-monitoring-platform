import { App as AntApp } from 'antd'
import React from 'react'
import MainLayout from './components/common/MainLayout'

export default function App() {
  const { message } = AntApp.useApp()

  React.useEffect(() => {
    message.info('音视频监播平台已启动')
  }, [message])

  return <MainLayout />
}
