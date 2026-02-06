# 音视频监播平台

用于实时监控广播电视和新媒体内容的单机应用系统。

## 功能特性

- 多种音视频源接入（RTSP、RTMP、SRT、HTTP）
- 最多16路实时监看
- 智能异常检测（画面异常、音频异常、信号中断）
- 多渠道告警通知（界面、声音、邮件、即时消息）
- 异常自动录制（前后各30秒）
- 历史记录查询与导出

## 技术栈

- 前端框架：Electron + React + TypeScript
- 后端服务：Node.js
- 数据库：SQLite
- UI组件库：Ant Design
- 构建工具：Vite

## 开发

### 安装依赖

```bash
npm install -g pnpm
pnpm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建应用

```bash
npm run build
```

### 运行测试

```bash
npm test
```

## 项目结构

```
workspace/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   └── preload.ts        # 预加载脚本
├── src/
│   ├── components/        # React 组件
│   ├── database/         # 数据库访问层
│   ├── services/         # 业务逻辑层
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── hooks/            # 自定义 Hooks
│   ├── store/            # 状态管理
│   └── __tests__/       # 测试文件
├── package.json
├── tsconfig.json
└── vite.config.ts
```
