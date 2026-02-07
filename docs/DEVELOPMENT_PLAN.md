# 音视频监播平台 - 开发计划

## 项目概述

音视频监播平台是一个基于 Electron + React 的跨平台桌面应用，用于实时监控多个音视频流，自动检测异常情况，支持告警通知和异常录制功能。

## 技术栈

- **框架**: Electron 28, React 18, TypeScript
- **UI 库**: Ant Design
- **数据库**: SQLite (better-sqlite3)
- **流解析**: RTSP, RTMP, SRT, HTTP
- **视频解码**: FFmpeg

## 开发进度

| 阶段 | 状态 | 描述 |
|--------|--------|--------|
| 阶段1 | 已完成 | 初始化项目脚手架和基础配置 |
| 阶段2 | 已完成 | 实现音视频源管理功能 |
| 阶段3 | 已完成 | 实现音视频流解析与解码 |
| 阶段4 | 已完成 | 实现实时监控界面 |
| 阶段5 | 已完成 | 实现异常检测引擎 |
| 阶段6 | 已完成 | 实现告警通知服务 |
| 阶段7 | 已完成 | 实现异常录制功能 |
| 阶段8 | 已完成 | 实现历史记录与配置管理 |
| 阶段9 | 待实现 | 测试与优化 |

## 各阶段详细说明

### 阶段1: 初始化项目脚手架和基础配置

**状态**: 已完成

**内容**:
- 创建 Electron + React 项目结构
- 配置 TypeScript 编译
- 配置 Vite 构建工具
- 配置 Electron 打包构建
- 设置项目基础依赖

### 阶段2: 实现音视频源管理功能

**状态**: 已完成

**内容**:
- 创建音视频源数据模型 (`AudioSource`)
- 创建 SQLite 数据仓库 (`audio-source.repository.ts`)
- 实现 CRUD 操作的 IPC 处理器
- 提供音视频源的增删改查功能

**文件**:
- `src/database/audio-source.repository.ts`
- `src/database/repositories.ts`

### 阶段3: 实现音视频流解析与解码

**状态**: 已完成

**内容**:
- 创建流解析器接口和工厂
- 实现 RTSP 协议解析器
- 实现 RTMP 协议解析器
- 实现 SRT 协议解析器
- 实现 HTTP 协议解析器
- 创建 FFmpeg 解码器
- 实现流管理器，统一管理多个音视频源
- 实现 IPC 流事件通信

**文件**:
- `src/streaming/parser.interface.ts`
- `src/streaming/rtsp.parser.ts`
- `src/streaming/rtmp.parser.ts`
- `src/streaming/srt.parser.ts`
- `src/streaming/http.parser.ts`
- `src/streaming/stream-manager.ts`
- `src/decoding/decoder.interface.ts`
- `src/decoding/ffmpeg.decoder.ts`
- `src/decoding/decoder-factory.ts`

### 阶段4: 实现实时监控界面

**状态**: 已完成

**内容**:
- 创建视频显示组件，支持实时视频流显示
- 创建监控网格组件，支持网格/列表两种布局模式
- 创建音频波形可视化组件
- 创建主监控页面，包含控制工具栏
- 创建音视频源管理页面，支持增删改查操作
- 更新主布局，集成监控和音视频源管理页面
- 创建音视频源 Hook，管理音视频源数据
- 创建监控状态 Hook，管理监控状态和统计

**文件**:
- `src/components/monitoring/VideoDisplay.tsx`
- `src/components/monitoring/MonitoringGrid.tsx`
- `src/components/monitoring/AudioVisualizer.tsx`
- `src/components/monitoring/MonitoringPage.tsx`
- `src/components/monitoring/AudioSourcesPage.tsx`
- `src/components/common/MainLayout.tsx`
- `src/hooks/useAudioSources.ts`
- `src/hooks/useSourceMonitor.ts`
- `src/utils/helpers.ts`

### 阶段5: 实现异常检测引擎

**状态**: 已完成

**内容**:
- 创建异常检测核心类，支持多种异常类型检测：
  - 丢帧检测
  - 黑屏检测
  - 画面冻结检测
  - 音频静音检测
  - 码率异常检测
  - 低帧率检测
- 创建异常检测 IPC 处理器，支持前后端通信
- 创建异常检测 Hook，管理检测状态和统计
- 扩展全局类型定义，包含异常检测相关接口

**文件**:
- `src/detection/anomaly.detector.ts`
- `src/types/detection.types.ts`
- `src/ipc/anomaly-detection.handler.ts`
- `src/hooks/useAnomalyDetection.ts`

### 阶段6: 实现告警通知服务

**状态**: 已完成

**内容**:
- 实现告警通知服务，支持多种通知方式：
  - 桌面通知
  - 邮件通知 (SMTP)
  - 即时通讯通知 (微信、钉钉)
  - 声音告警
- 创建告警配置管理界面
- 实现告警去重和频率控制

**文件**:
- `src/notification/notification.service.ts`
- `src/ipc/notification.handler.ts`
- `src/hooks/useNotificationConfig.ts`
- `src/components/alerts/AlertsPage.tsx`

### 阶段7: 实现异常录制功能

**状态**: 已完成

**内容**:
- 实现异常事件录制功能：
  - 异常前录制 (预录制)
  - 异常期间录制
  - 异常后录制 (后录制)
- 支持录制文件管理
- 实现录制文件下载功能
- 实现录制文件自动清理

**文件**:
- `src/recording/anomaly.recorder.ts`
- `src/ipc/recording.handler.ts`
- `src/hooks/useRecordingConfig.ts`
- `src/components/history/RecordingsPage.tsx`

### 阶段8: 实现历史记录与配置管理

**状态**: 已完成

**内容**:
- 实现异常历史记录查询界面
- 支持按时间范围、音视频源、异常类型过滤
- 实现历史记录导出功能 (CSV)
- 创建系统配置管理界面：
  - 检测阈值配置
  - 告警配置
  - 录制配置

**文件**:
- `src/components/history/HistoryPage.tsx`
- `src/hooks/useHistory.ts`

### 阶段9: 测试与优化

**状态**: 待实现

**待实现内容**:
- 单元测试覆盖
- 集成测试
- 性能优化
- 用户体验优化
- Bug 修复

## 项目结构

```
src/
├── components/          # React 组件
│   ├── common/       # 通用组件
│   └── monitoring/   # 监控相关组件
├── database/          # 数据库相关
├── decoding/          # 视频解码
├── detection/         # 异常检测
├── hooks/            # React Hooks
├── ipc/              # IPC 通信处理
├── services/         # 后端服务
├── streaming/         # 流解析
├── types/            # 类型定义
└── utils/            # 工具函数
```

## 数据库表结构

### audio_sources
- id (TEXT, PRIMARY KEY)
- name (TEXT)
- url (TEXT)
- protocol (TEXT)
- format (TEXT)
- status (TEXT)
- created_at (TEXT)
- updated_at (TEXT)

### anomalies
- id (TEXT, PRIMARY KEY)
- source_id (TEXT)
- source_name (TEXT)
- type (TEXT)
- start_time (TEXT)
- end_time (TEXT)
- duration (INTEGER)
- details (TEXT)
- recording_file_path (TEXT)
- created_at (TEXT)
- updated_at (TEXT)

## 异常检测配置

| 配置项 | 默认值 | 说明 |
|---------|---------|------|
| enabled | true | 是否启用异常检测 |
| frameRateThreshold | 10 | 帧率阈值 (fps) |
| frameRateThresholdDuration | 3000 | 帧率异常持续时间阈值 (ms) |
| blackScreenThreshold | 5 | 黑屏帧数阈值 |
| blackScreenThresholdDuration | 2000 | 黑屏持续时间阈值 (ms) |
| freezeThreshold | 5000 | 画面冻结时间阈值 (ms) |
| freezeThresholdDuration | 2000 | 冻结持续时间阈值 (ms) |
| audioSilenceThreshold | -60 | 音频静音阈值 (dB) |
| audioSilenceThresholdDuration | 5000 | 静音持续时间阈值 (ms) |
| bitrateLowThreshold | 100 | 低码率阈值 (kbps) |
| bitrateHighThreshold | 10000 | 高码率阈值 (kbps) |
