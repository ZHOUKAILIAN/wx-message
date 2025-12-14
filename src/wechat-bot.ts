import crypto from "crypto";
import xml2js from "xml2js";
import axios from "axios";
import { ServiceManager } from "./services/service-manager";
import { BotConfig } from "./services/service-interface";

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
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
  private config: BotConfig;
  private accessToken: string = "";
  private tokenExpiry: number = 0;
  private serviceManager: ServiceManager;

  constructor(config: BotConfig) {
    this.config = config;
    this.serviceManager = new ServiceManager(config);
  }

  // 验证微信服务器签名
  verifySignature(
    signature: string,
    timestamp: string,
    nonce: string
  ): boolean {
    const token = this.config.wechat.token;
    const tmpStr = [token, timestamp, nonce].sort().join("");
    const hash = crypto.createHash("sha1").update(tmpStr).digest("hex");
    return hash === signature;
  }

  // 获取访问令牌
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log("获取微信访问令牌...");
      const response = await axios.get<AccessTokenResponse>(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.config.wechat.appId}&secret=${this.config.wechat.appSecret}`
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期

      console.log("访问令牌获取成功");
      return this.accessToken;
    } catch (error) {
      console.error("获取访问令牌失败:", error);
      throw error;
    }
  }

  // 发送文本消息给用户
  private async sendTextMessage(
    openId: string,
    content: string
  ): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`;

      const messageData = {
        touser: openId,
        msgtype: "text",
        text: {
          content: content,
        },
      };

      await axios.post(url, messageData);
      console.log(`✅ 消息已发送给用户: ${openId}`);
    } catch (error) {
      console.error("❌ 发送消息失败:", error);
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
    const content = message.Content ? message.Content[0] : "";
    const msgType = message.MsgType[0];

    console.log("📨 收到消息:", { fromUser, msgType, content });

    let replyContent = "";

    if (msgType === "text") {
      // 使用服务管理器处理文本消息
      const response = await this.serviceManager.processRequest(
        content,
        fromUser
      );
      replyContent = response.content;
    } else if (msgType === "event") {
      const event = message.Event ? message.Event[0] : "";
      if (event === "subscribe") {
        replyContent = `🎉 欢迎关注智能助手！
            🤖 我是一个集成了多种服务的智能机器人，支持：
            • 🌤️ 天气预报查询
            • 📈 股票行情查看
            • 🕐 时间信息获取
            • 🤖 AI智能对话
            💡 发送"帮助"查看所有功能，或直接用自然语言告诉我您的需求！`;
      }
    } else {
      replyContent = "🤖 目前只支持文字消息，请发送任意文字开始对话~";
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

    console.log("📤 准备回复:", replyContent.substring(0, 50) + "...");
    return replyXml.trim();
  }

  // 给所有关注用户发送每日推送
  async sendDailyWeatherToAllUsers(): Promise<void> {
    try {
      console.log("🌅 开始执行每日推送...");

      const users = this.config.dailyPush.users;
      const services = this.config.dailyPush.services;

      if (users.length === 0) {
        console.warn("⚠️ 没有配置每日推送用户");
        return;
      }

      if (services.length === 0) {
        console.warn("⚠️ 没有配置推送服务");
        return;
      }

      console.log(
        `📋 准备推送给 ${users.length} 个用户，服务: ${services.join(", ")}`
      );

      for (const openId of users) {
        try {
          let pushContent = `🌅 早安！每日资讯推送\n\n`;

          for (const serviceName of services) {
            const response = await this.serviceManager.processRequest(
              this.getDailyPushTrigger(serviceName),
              openId
            );

            if (response.success) {
              pushContent += `━`.repeat(20) + "\n";
              pushContent += response.content + "\n\n";
            }
          }

          pushContent += `💡 祝您有美好的一天！`;

          await this.sendTextMessage(openId, pushContent);

          // 避免频繁发送，间隔2秒
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ 推送给用户 ${openId} 失败:`, error);
        }
      }

      console.log("✅ 每日推送完成");
    } catch (error) {
      console.error("❌ 每日推送失败:", error);
      throw error;
    }
  }

  // 获取每日推送的触发词
  private getDailyPushTrigger(serviceName: string): string {
    const triggers: Record<string, string> = {
      weather: "杭州天气",
      stock: "苹果股票",
      time: "时间",
    };

    return triggers[serviceName] || serviceName;
  }

  // 获取服务健康状态
  async getServiceHealth(): Promise<Record<string, boolean>> {
    return await this.serviceManager.getHealthStatus();
  }

  // 获取服务能力
  getServiceCapabilities(): any {
    return this.serviceManager.getServiceCapabilities();
  }

  // 更新AI配置
  updateAIConfig(
    provider: "deepseek" | "gemini",
    apiKey: string,
    model?: string
  ): void {
    this.config.ai.provider = provider;
    this.config.ai.apiKey = apiKey;
    this.config.ai.model = model;

    this.serviceManager.updateAIConfig(provider, apiKey, model);
  }
}
