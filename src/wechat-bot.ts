import crypto from 'crypto';
import xml2js from 'xml2js';
import axios from 'axios';
import { ProperMCPClient } from './proper-mcp-client';

interface WeChatConfig {
  appId: string;
  appSecret: string;
  token: string;
  mcpUrl: string;
  dailyPushUsers: string[];
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface WeatherHourlyData {
  date: string;
  hour: string;
  temp: string;
  condition: string;
  humidity: string;
  windSpeed: string;
  windDir: string;
  pressure: string;
  realFeel: string;
  iconDay: string;
  iconNight: string;
  pop: string;
  uvi: string;
  conditionId: string;
  updatetime: string;
}

interface WeatherResponse {
  hourly: WeatherHourlyData[];
}

interface WeChatMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Content?: string;
  Event?: string;
  EventKey?: string;
}

export class WeChatBot {
  private config: WeChatConfig;
  private accessToken: string = '';
  private tokenExpiry: number = 0;
  private mcpClient: ProperMCPClient;

  constructor(config: WeChatConfig) {
    this.config = config;
    this.mcpClient = new ProperMCPClient(config.mcpUrl);
    
    // 初始化时建立MCP连接
    this.initializeMCPConnection();
  }
  
  // 初始化MCP连接
  private async initializeMCPConnection(): Promise<void> {
    try {
      await this.mcpClient.connect();
      console.log('✅ MCP客户端已初始化');
    } catch (error) {
      console.error('❌ MCP客户端初始化失败:', error);
      // 不抛出错误，允许继续启动，但会在使用时重试连接
    }
  }

  // 验证微信服务器签名
  verifySignature(signature: string, timestamp: string, nonce: string): boolean {
    const token = this.config.token;
    const tmpStr = [token, timestamp, nonce].sort().join('');
    const hash = crypto.createHash('sha1').update(tmpStr).digest('hex');
    return hash === signature;
  }

  // 获取访问令牌
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('获取微信访问令牌...');
      const response = await axios.get<AccessTokenResponse>(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`
      );
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期
      
      console.log('访问令牌获取成功');
      return this.accessToken;
    } catch (error) {
      console.error('获取访问令牌失败:', error);
      throw error;
    }
  }

  // 调用MCP获取天气信息
  private async getWeatherFromMCP(cityName: string = '杭州市'): Promise<string> {
    try {
      console.log(`调用MCP获取${cityName}天气信息...`);

      // 使用MCP客户端获取天气
      const result = await this.mcpClient.getWeather(cityName);
      
      if (result.content && result.content.length > 0) {
        const weatherText = result.content[0].text;
        const weatherData = JSON.parse(weatherText) as WeatherResponse;
        return this.formatWeatherMessage(weatherData, cityName);
      }
      
      return '❌ 获取天气信息失败，请稍后重试';
    } catch (error) {
      console.error('调用MCP失败:', error);
      return '❌ 天气服务暂时不可用，请稍后重试';
    }
  }

  // 格式化天气消息
  private formatWeatherMessage(data: WeatherResponse, cityName: string): string {
    if (!data.hourly || data.hourly.length === 0) {
      return `❌ ${cityName}暂无天气数据`;
    }

    const today = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    // 取前8小时的天气数据（更简洁）
    const hourlyData = data.hourly.slice(0, 8);
    
    let message = `📍 ${cityName} 天气预报\n`;
    message += `📅 ${today}\n`;
    message += `─`.repeat(20) + '\n\n';
    
    hourlyData.forEach((hour, index) => {
      // 构建时间显示
      const timeStr = `${hour.date} ${hour.hour}:00`;
      
      // 天气图标映射
      let weatherIcon = '☁️';
      if (hour.condition.includes('晴')) weatherIcon = '☀️';
      else if (hour.condition.includes('雨')) weatherIcon = '🌧️';
      else if (hour.condition.includes('雪')) weatherIcon = '❄️';
      else if (hour.condition.includes('阴')) weatherIcon = '☁️';
      else if (hour.condition.includes('多云')) weatherIcon = '⛅';
      else if (hour.condition.includes('雾')) weatherIcon = '🌫';
      
      message += `${timeStr} ${weatherIcon} ${hour.temp}°C ${hour.condition}\n`;
      message += `💧 湿度:${hour.humidity}% 💨 风速:${hour.windSpeed}m/s\n`;
      
      // 每隔几个小时换行
      if ((index + 1) % 2 === 0 && index < hourlyData.length - 1) {
        message += '\n';
      }
    });
    
    message += `\n─`.repeat(20) + '\n';
    message += `💡 建议根据天气情况合理安排出行~\n`;
    message += `🔄 数据更新时间: ${new Date().toLocaleTimeString('zh-CN')}`;
    
    return message;
  }

  // 发送文本消息给用户
  private async sendTextMessage(openId: string, content: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`;
      
      const messageData = {
        touser: openId,
        msgtype: 'text',
        text: {
          content: content
        }
      };
      
      await axios.post(url, messageData);
      console.log(`✅ 消息已发送给用户: ${openId}`);
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      throw error;
    }
  }

  // 处理接收到的消息
  async handleMessage(xmlData: string | Buffer): Promise<string> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);
    const message = result.xml as WeChatMessage;
    
    const fromUser = message.FromUserName[0];
    const toUser = message.ToUserName[0];
    const content = message.Content ? message.Content[0] : '';
    const msgType = message.MsgType[0];
    
    console.log('📨 收到消息:', { fromUser, msgType, content });
    
    let replyContent = '';
    
    if (msgType === 'text') {
      const lowerContent = content.toLowerCase().trim();
      
      if (lowerContent.includes('天气') || lowerContent.includes('weather')) {
        // 提取城市名称
        let cityName = '杭州市';
        const cityMatch = content.match(/(.+?)(?:天气|weather)/i);
        if (cityMatch && cityMatch[1].trim()) {
          cityName = cityMatch[1].trim();
        }
        
        replyContent = await this.getWeatherFromMCP(cityName);
      } else if (content === '帮助' || content === 'help' || content === '?') {
        replyContent = this.getHelpMessage();
      } else if (content === '时间' || content === 'time') {
        const now = new Date();
        replyContent = `🕐 当前时间：\n📅 ${now.toLocaleDateString('zh-CN')}\n⏰ ${now.toLocaleTimeString('zh-CN')}`;
      } else if (['id', 'openid', 'whoami'].includes(lowerContent)) {
        replyContent = `🆔 您的OpenID是：\n${fromUser}\n\n(请复制此ID添加到环境变量 DAILY_PUSH_USERS 中)`;
      } else {
        replyContent = '👋 您好！我是天气机器人\n\n📌 使用方法：\n• 发送"天气"查询杭州天气\n• 发送"北京天气"查询北京天气\n• 发送"帮助"查看更多功能';
      }
    } else if (msgType === 'event') {
      const event = message.Event ? message.Event[0] : '';
      if (event === 'subscribe') {
        replyContent = '🎉 欢迎关注天气机器人！\n\n📌 使用方法：\n• 发送"天气"查询天气预报\n• 发送"城市名+天气"查询指定城市\n• 发送"帮助"查看使用说明\n\n⏰ 每天早上8点会自动推送天气预报哦~';
      }
    } else {
      replyContent = '🤖 目前只支持文字消息，请发送"天气"查询天气预报';
    }
    
    // 构建回复XML
    const timestamp = Math.floor(Date.now() / 1000);
    const replyXml = `
      <xml>
        <ToUserName><![CDATA[${fromUser}]]></ToUserName>
        <FromUserName><![CDATA[${toUser}]]></FromUserName>
        <CreateTime>${timestamp}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[${replyContent}]]></Content>
      </xml>
    `;
    
    console.log('📤 准备回复:', replyContent.substring(0, 50) + '...');
    return replyXml.trim();
  }

  // 获取帮助消息
  private getHelpMessage(): string {
    return `🤖 天气机器人使用说明\n\n`
      + `📌 功能列表：\n`
      + `• 🌤️ 查询天气预报\n`
      + `• ⏰ 每日定时推送\n`
      + `• 🕐 查询当前时间\n\n`
      + `🔧 使用方法：\n`
      + `• "天气" - 查询杭州天气\n`
      + `• "北京天气" - 查询指定城市\n`
      + `• "时间" - 查看当前时间\n`
      + `• "帮助" - 显示此说明\n\n`
      + `💡 小提示：每天早上8点会自动推送天气预报哦~`;
  }

  // 给所有关注用户发送每日天气预报
  async sendDailyWeatherToAllUsers(): Promise<void> {
    try {
      console.log('🌅 开始执行每日天气预报推送...');
      
      const weatherMessage = await this.getWeatherFromMCP('杭州市');
      
      if (this.config.dailyPushUsers.length === 0) {
        console.warn('⚠️ 没有配置每日推送用户，但会显示天气信息');
        console.log('天气信息:', weatherMessage);
        return;
      }
      
      console.log(`📋 准备推送给 ${this.config.dailyPushUsers.length} 个用户`);
      
      for (const openId of this.config.dailyPushUsers) {
        try {
          await this.sendTextMessage(openId, `🌅 早安！每日天气预报\n\n${weatherMessage}`);
          // 避免频繁发送，间隔1秒
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ 推送给用户 ${openId} 失败:`, error);
        }
      }
      
      console.log('✅ 每日天气预报推送完成');
    } catch (error) {
      console.error('❌ 每日天气预报推送失败:', error);
      throw error;
    }
  }
}
