import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cron from 'node-cron';
// 临时忽略类型错误，后续修复
// @ts-ignore
import { WeChatBot } from './wechat-bot';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || '8080';

// 微信机器人配置
const wechatBot = new WeChatBot({
  appId: process.env.WECHAT_APP_ID!,
  appSecret: process.env.WECHAT_APP_SECRET!,
  token: process.env.WECHAT_TOKEN!,
  mcpUrl: process.env.MCP_URL || 'http://localhost:7777',
  dailyPushUsers: process.env.DAILY_PUSH_USERS?.split(',') || []
});

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/xml' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'wechat-weather-bot'
  });
});

// 微信服务器验证
app.get('/wechat', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  console.log('微信服务器验证请求:', { signature, timestamp, nonce });
  
  if (wechatBot.verifySignature(signature as string, timestamp as string, nonce as string)) {
    console.log('验证成功，返回echostr:', echostr);
    res.send(echostr);
  } else {
    console.error('验证失败');
    res.status(403).send('Invalid signature');
  }
});

// 处理微信消息
app.post('/wechat', async (req, res) => {
  try {
    const result = await wechatBot.handleMessage(req.body);
    res.set('Content-Type', 'text/xml');
    res.send(result);
  } catch (error) {
    console.error('处理消息失败:', error);
    res.status(500).send('Error processing message');
  }
});

// 手动触发天气预报推送的管理接口
app.post('/admin/send-daily-weather', async (req, res) => {
  try {
    console.log('🌅 开始执行每日天气预报推送...');
    await wechatBot.sendDailyWeatherToAllUsers();
    res.json({ success: true, message: '每日天气预报推送成功' });
  } catch (error) {
    console.error('❌ 每日天气预报推送失败:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});


// 启动服务器
app.listen(PORT, () => {
  console.log(`🤖 微信天气机器人服务器已启动`);
  console.log(`📍 端口: ${PORT}`);
  console.log(`🔗 微信回调地址: http://107.173.187.185:${PORT}/wechat`);
  console.log(`🏥 健康检查: http://107.173.187.185:${PORT}/health`);
  console.log(`⏰ 天气MCP服务器: ${process.env.MCP_URL}`);
  
  // 设置每天早上8点推送天气预报
  cron.schedule('0 8 * * *', async () => {
    console.log('🌅 开始执行每日天气预报推送...');
    try {
      await wechatBot.sendDailyWeatherToAllUsers();
      console.log('✅ 每日天气预报推送完成');
    } catch (error) {
      console.error('❌ 每日天气预报推送失败:', error);
    }
  });
});
