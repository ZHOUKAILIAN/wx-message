# 微信天气机器人

🤖 一个调用天气MCP服务器的微信公众号机器人，支持定时天气预报推送。

## 功能特性

- 🌤️ 实时天气查询
- 🏙️ 多城市天气查询
- ⏰ 每日定时推送（早上8点）
- 🔄 自动重连和错误处理
- 📱 友好的微信交互界面

## 项目架构

```
微信公众号 ←→ 微信机器人服务 ←→ 天气MCP服务器
```

## 快速开始

### 1. 环境要求

- Node.js 18+
- npm 或 yarn
- 微信公众号（服务号）

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 微信公众号配置
WECHAT_APP_ID=你的微信AppID
WECHAT_APP_SECRET=你的微信AppSecret  
WECHAT_TOKEN=your_custom_token_here

# 天气MCP服务器配置
MCP_URL=http://107.173.187.185:7777

# 服务器端口
PORT=3000

# 接收每日推送的用户OpenID（多个用户用逗号分隔）
DAILY_PUSH_USERS=user_open_id_1,user_open_id_2
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后会显示：

```
🤖 微信天气机器人服务器已启动
📍 端口: 3000
🔗 微信回调地址: http://107.173.187.185:3000/wechat
🏥 健康检查: http://107.173.187.185:3000/health
⏰ 天气MCP服务器: http://107.173.187.185:7777
⏰ 每日8:00天气预报推送已设置
```

## 微信公众号配置

### 1. 服务器配置

在微信公众号后台的「开发」->「基本配置」中设置：

- **服务器URL**: `http://107.173.187.185:3000/wechat`
- **Token**: 与 `.env` 中的 `WECHAT_TOKEN` 保持一致
- **消息加解密方式**: 明文模式（开发测试）

### 2. 获取用户OpenID

用户关注公众号后，可以通过以下方式获取OpenID：

1. 在用户发送消息时查看日志
2. 通过公众号的用户管理接口获取
3. 通过创建带参数的二维码获取

## API 接口

### 微信回调接口

- `GET /wechat` - 微信服务器验证
- `POST /wechat` - 处理微信消息

### 管理接口

- `GET /health` - 健康检查
- `POST /admin/send-daily-weather` - 手动触发天气预报推送

## 使用说明

### 微信端交互

用户发送以下消息：

- `天气` - 查询杭州天气
- `北京天气` - 查询指定城市天气
- `时间` - 查看当前时间
- `帮助` - 查看使用说明

### 定时推送

系统会在每天早上8点自动向 `DAILY_PUSH_USERS` 中配置的用户推送天气预报。

## 部署

### 服务器部署

```bash
# 克隆项目
git clone https://github.com/ZHOUKAILIAN/wx-message.git
cd wx-message

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 使用 PM2 管理进程
npm install -g pm2
pm2 start src/index.ts --name wechat-weather-bot --interpreter tsx
```

### Docker 部署

```bash
# 构建镜像
docker build -t wechat-weather-bot .

# 运行容器
docker run -d \
  --name wechat-weather-bot \
  -p 3000:3000 \
  --env-file .env \
  wechat-weather-bot
```

## 监控和日志

- 查看PM2日志: `pm2 logs wechat-weather-bot`
- 重启服务: `pm2 restart wechat-weather-bot`
- 查看服务状态: `pm2 status`

## 故障排除

### 1. 微信验证失败

- 检查 `WECHAT_TOKEN` 是否与公众号后台一致
- 确认服务器URL可以正常访问
- 检查服务器防火墙设置

### 2. MCP调用失败

- 确认天气MCP服务器正在运行
- 检查 `MCP_URL` 配置是否正确
- 查看MCP服务器日志

### 3. 消息发送失败

- 检查 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 是否正确
- 确认用户OpenID是否有效
- 检查API调用频率限制

## 开发

### 项目结构

```
src/
├── index.ts          # 主服务入口
└── wechat-bot.ts     # 微信机器人核心类
```

### 开发调试

```bash
# 开发模式（支持热重载）
npm run dev

# 构建项目
npm run build
```

## License

MIT License
