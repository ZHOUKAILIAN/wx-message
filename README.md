# 智能微信机器人

🤖 一个基于插件架构和AI智能路由的微信公众号机器人，支持多种服务的智能对话。

## 🌟 主要特性

### 🧠 AI智能路由
- 集成 DeepSeek/Gemini 大模型
- 智能理解用户意图
- 自然语言回复生成
- 支持中英文混合查询

### 🔌 插件化架构
- 🌤️ 天气查询服务
- 📈 股票行情服务  
- 🕐 时间查询服务
- 🆘 帮助和指导服务
- 🚀 可扩展的插件系统

### ⚙️ 高级功能
- 🔄 动态配置管理
- 📊 服务健康监控
- 🕐 定时任务推送
- 🛡️ 错误处理和降级
- 📱 友好的微信交互

## 📋 版本说明

- **v1.0** - 基础天气机器人 ([查看说明](./README_V1.md))
- **v2.0** - 智能插件架构 (当前版本)

## 🚀 快速开始

### 1. 环境要求

- Node.js 18+
- npm 或 yarn
- 微信公众号（服务号）
- AI API Key (DeepSeek 或 Gemini)

### 2. 安装依赖

```bash
git clone https://github.com/ZHOUKAILIAN/wx-message.git
cd wx-message
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 微信公众号配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token

# AI服务配置 (二选一)
# DeepSeek配置
AI_PROVIDER=deepseek
AI_API_KEY=your_deepseek_api_key
AI_MODEL=deepseek-chat

# 或者使用Gemini
# AI_PROVIDER=gemini
# AI_API_KEY=your_gemini_api_key
# AI_MODEL=gemini-pro

# MCP服务配置
MCP_URL=http://localhost:7777

# 每日推送配置
DAILY_PUSH_USERS=user1_openid,user2_openid
DAILY_PUSH_TIME=0 8 * * *
DAILY_PUSH_SERVICES=weather,time

# 服务器配置
PORT=8080
```

### 4. 启动服务

```bash
# 开发模式 (v2.0)
npm run dev:v2

# 生产模式 (v2.0)
npm run start:v2

# 如需使用v1.0版本
npm run dev
npm start
```

服务启动后会显示：

```
🤖 智能微信机器人服务器已启动 (v2.0.0)
📍 端口: 8080
🤖 AI提供商: deepseek
🔗 微信回调地址: http://107.173.187.185:8080/wechat
🏥 健康检查: http://107.173.187.185:8080/health
🔧 服务状态: http://107.173.187.185:8080/health/services
📋 服务能力: http://107.173.187.185:8080/capabilities
⏰ 每日推送已设置: 0 8 * * *
```

## 🎯 功能演示

### 智能对话示例

```
用户: 今天北京天气怎么样？
机器人: 📍 北京市 天气预报
        📅 2024年12月7日 星期六
        ─────────────────────
        
        2024-12-07 14:00 ☀️ 5°C 晴
        💧 湿度:45% 💨 风速:3.2m/s
        
        2024-12-07 15:00 ☀️ 6°C 晴
        💧 湿度:43% 💨 风速:3.5m/s
        ...
        
        ─────────────────────
        💡 建议根据天气情况合理安排出行~
        🔄 数据更新时间: 14:30:15

用户: 苹果股票现在多少钱？
机器人: 📈 苹果公司 (AAPL)
        ──────────────────────────
        💰 当前价格: $178.56
        📊 涨跌: +2.34 (+1.33%)
        📈 成交量: 52.3M
        
        💡 数据更新时间: 2024/12/7 14:30:15

用户: 现在几点了？
机器人: 🕐 当前时间: 14:30:15
        📅 日期: 2024年12月7日 星期六
        🌍 国际时间: 2024-12-07T06:30:15.123Z

用户: 帮助
机器人: 🤖 智能助手使用说明
        
        📌 可用功能列表：
        
        🔸 查询天气预报信息
           关键词: 天气, weather, 气温, 下雨, 晴天, 阴天, 气温
           示例: 天气, 杭州天气, 北京天气怎么样
        
        🔸 查询股票行情信息
           关键词: 股票, 股价, 涨跌, stock, 股价, 行情
           示例: 股票, 苹果股票, AAPL股价, 腾讯股票怎么样
        
        🔸 查询当前时间
           关键词: 时间, time, 几点, 现在, 当前时间
           示例: 时间, time, 现在几点了, 当前时间
        
        💡 使用技巧：
        • 可以用自然语言描述您的需求
        • 支持中英文混合查询
        • 输入任意功能关键词即可触发相应服务
        
        🚀 AI智能路由会自动理解您的意图！
```

## 🏗️ 架构设计

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   微信公众号     │ ←→ │   智能机器人      │ ←→ │   AI服务        │
│               │    │                  │    │ (DeepSeek/      │
│ 用户交互        │    │ ┌──────────────┐ │    │  Gemini)        │
└─────────────────┘    │ │ ServiceManager│ │    └─────────────────┘
                       │ │              │ │
                       │ │ ┌──────────┐ │ │    ┌─────────────────┐
                       │ │ │AIRouter  │ │ │ ←→ │  天气MCP服务     │
                       │ │ └──────────┘ │ │    └─────────────────┘
                       │ └──────────────┘ │
                       │                  │
                       │ ┌──────────────┐ │
                       │ │ 天气服务      │ │
                       │ │ 股票服务      │ │
                       │ │ 时间服务      │ │
                       │ │ 帮助服务      │ │
                       │ └──────────────┘ │
                       └──────────────────┘
```

## 🔧 API 接口

### 微信回调接口

- `GET /wechat` - 微信服务器验证
- `POST /wechat` - 处理微信消息

### 系统监控接口

- `GET /health` - 系统健康检查
- `GET /health/services` - 服务健康状态
- `GET /capabilities` - 服务能力查询

### 管理接口

- `POST /admin/send-daily-push` - 手动触发每日推送
- `POST /admin/add-push-user` - 添加推送用户
- `POST /admin/remove-push-user` - 移除推送用户
- `POST /admin/update-ai-config` - 更新AI配置
- `GET /admin/config` - 获取配置信息

### 使用示例

```bash
# 查看服务状态
curl http://localhost:8080/health/services

# 查看服务能力
curl http://localhost:8080/capabilities

# 添加推送用户
curl -X POST http://localhost:8080/admin/add-push-user \
  -H "Content-Type: application/json" \
  -d '{"userId": "new_user_openid"}'

# 切换AI提供商
curl -X POST http://localhost:8080/admin/update-ai-config \
  -H "Content-Type: application/json" \
  -d '{"provider": "gemini", "apiKey": "your_gemini_key"}'
```

## 🚀 部署

### PM2 部署

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start src/index-v2.ts --name wechat-bot --interpreter tsx

# 查看状态
pm2 status

# 查看日志
pm2 logs wechat-bot

# 重启服务
pm2 restart wechat-bot
```

### Docker 部署

```bash
# 构建镜像
docker build -t wechat-bot .

# 运行容器
docker run -d \
  --name wechat-bot \
  -p 8080:8080 \
  --env-file .env \
  wechat-bot
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /wechat {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🔌 开发插件

### 创建新服务

```typescript
import { BaseService, ServiceRequest, ServiceResponse, ServiceCapability } from './service-interface';

export class MyService extends BaseService {
  readonly name = 'my-service';
  readonly capabilities: ServiceCapability[] = [
    {
      name: 'my-feature',
      description: '我的功能描述',
      keywords: ['我的', '功能', 'my'],
      examples: ['查询我的功能', 'my feature'],
      parameters: [
        {
          name: 'param1',
          type: 'string',
          required: true,
          description: '参数描述'
        }
      ]
    }
  ];

  canHandle(request: ServiceRequest): boolean {
    const input = request.input.toLowerCase();
    return this.capabilities[0].keywords.some(keyword => input.includes(keyword));
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    try {
      // 处理业务逻辑
      const result = await this.processRequest(request);
      
      return {
        success: true,
        content: `处理结果: ${result}`,
        data: result,
        suggestions: ['相关操作1', '相关操作2']
      };
    } catch (error) {
      return {
        success: false,
        content: '❌ 处理失败，请稍后重试',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getHelp(): string {
    return `🔧 我的服务使用说明\n\n`
      + `📌 支持的功能：\n`
      + `• 功能描述1\n`
      + `• 功能描述2\n\n`
      + `💡 使用示例：${this.capabilities[0].examples.join(', ')}`;
  }

  async healthCheck(): Promise<boolean> {
    // 健康检查逻辑
    return true;
  }

  private async processRequest(request: ServiceRequest): Promise<any> {
    // 具体业务逻辑
    return { status: 'ok', data: request.input };
  }
}
```

### 注册服务

在 `ServiceManager` 中注册新服务：

```typescript
// 在 initializeServices 方法中添加
const myService = new MyService();
this.registerService(myService);
```

## 🔄 从 v1.0 迁移

详细的迁移指南请参考 [MIGRATION.md](./MIGRATION.md)。

### 主要变化

1. **环境变量**: 新增AI相关配置
2. **启动方式**: 使用 `npm run dev:v2` 或 `npm run start:v2`
3. **API增强**: 新增多个管理和监控接口
4. **功能扩展**: 新增股票查询和AI智能对话

## 🐛 故障排除

### 1. AI服务连接失败

```bash
# 检查服务状态
curl http://localhost:8080/health/services

# 检查配置
curl http://localhost:8080/admin/config
```

### 2. 微信验证失败

- 检查 `WECHAT_TOKEN` 是否与公众号后台一致
- 确认服务器URL可以正常访问
- 检查防火墙设置

### 3. 服务不可用

```bash
# 查看详细日志
pm2 logs wechat-bot

# 重启服务
pm2 restart wechat-bot
```

## 📊 性能优化

- **AI调用缓存**: 相同意图的请求会被缓存
- **连接池**: MCP连接复用
- **健康检查**: 定期检查服务状态
- **降级处理**: AI不可用时回退到关键词匹配

## 🗺️ 路线图

- [ ] 更多AI模型支持 (Claude, GPT等)
- [ ] 数据持久化和用户偏好学习
- [ ] 可视化管理界面
- [ ] 多语言支持
- [ ] 更多插件 (新闻、汇率等)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 📧 Email: zhoukailian@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/ZHOUKAILIAN/wx-message/issues)
- 📖 文档: [项目Wiki](https://github.com/ZHOUKAILIAN/wx-message/wiki)
