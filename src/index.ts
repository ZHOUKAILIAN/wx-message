import express from "express";
import bodyParser from "body-parser";
import cron from "node-cron";
import { WeChatBot } from "./wechat-bot";
import { ConfigManager } from "./config/config-manager";

// 加载配置
const configManager = ConfigManager.getInstance();
const config = configManager.getConfig();

const app = express();
const PORT = process.env.PORT || "8080";

// 创建微信机器人实例
const wechatBot = new WeChatBot(config);

// 中间件
app.use(bodyParser.json());
// 专门为微信XML消息配置解析器
app.use('/wechat', express.raw({ type: ['text/xml', 'application/xml', 'text/plain'] }));
app.use(bodyParser.text({ type: "text/xml" }));

// 健康检查
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "wechat-intelligent-bot",
    version: "2.0.0",
    ai: config.ai.provider,
  });
});

// 服务健康状态
app.get("/health/services", async (req, res) => {
  try {
    const healthStatus = await wechatBot.getServiceHealth();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: healthStatus,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 服务能力
app.get("/capabilities", (req, res) => {
  try {
    const capabilities = wechatBot.getServiceCapabilities();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      capabilities,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 微信服务器验证
app.get("/wechat", (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  console.log("微信服务器验证请求:", { signature, timestamp, nonce });

  if (
    wechatBot.verifySignature(
      signature as string,
      timestamp as string,
      nonce as string
    )
  ) {
    console.log("验证成功，返回echostr:", echostr);
    res.send(echostr);
  } else {
    console.error("验证失败");
    res.status(403).send("Invalid signature");
  }
});

// 处理微信消息
app.post("/wechat", async (req, res) => {
  try {
    const result = await wechatBot.handleMessage(req.body);
    console.log("📤 返回XML回复:", result);
    res.set("Content-Type", "text/xml");
    res.send(result);
  } catch (error) {
    console.error("❌ 处理消息失败:", error);
  }
});

// 手动触发每日推送
app.post("/admin/send-daily-weather", async (req, res) => {
  try {
    console.log("🌅 手动触发每日推送...");
    await wechatBot.sendDailyWeatherToAllUsers();
    res.json({ success: true, message: "每日推送成功" });
  } catch (error) {
    console.error("❌ 每日推送失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 添加每日推送用户
app.post("/admin/add-push-user", (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "缺少userId参数" });
    }

    configManager.addDailyPushUser(userId);
    res.json({ success: true, message: "用户添加成功" });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 移除每日推送用户
app.post("/admin/remove-push-user", (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "缺少userId参数" });
    }

    configManager.removeDailyPushUser(userId);
    res.json({ success: true, message: "用户移除成功" });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 更新AI配置
app.post("/admin/update-ai-config", (req, res) => {
  try {
    const { provider, apiKey, model } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        error: "缺少必需参数: provider, apiKey",
      });
    }

    if (!["deepseek", "gemini"].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: "provider必须是deepseek或gemini",
      });
    }

    configManager.updateConfig({
      ai: { provider, apiKey, model },
    });

    wechatBot.updateAIConfig(provider, apiKey, model);

    res.json({ success: true, message: "AI配置更新成功" });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 获取当前配置信息
app.get("/admin/config", (req, res) => {
  try {
    const config = configManager.getConfig();

    // 隐藏敏感信息
    const safeConfig = {
      wechat: {
        appId: config.wechat.appId,
        appSecret: config.wechat.appSecret.replace(/./g, "*"),
        token: config.wechat.token,
      },
      ai: {
        provider: config.ai.provider,
        apiKey: config.ai.apiKey.replace(/./g, "*"),
        model: config.ai.model,
      },
      services: Object.entries(config.services).reduce((acc, [key, value]) => {
        acc[key] = {
          enabled: value.enabled,
          hasConfig: Object.keys(value.config).length > 0,
        };
        return acc;
      }, {} as any),
      dailyPush: config.dailyPush,
    };

    res.json({ success: true, config: safeConfig });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🤖 智能微信机器人服务器已启动 (v2.0.0)`);
  console.log(`📍 端口: ${PORT}`);
  console.log(`🤖 AI提供商: ${config.ai.provider}`);
  console.log(`🔗 微信回调地址: http://107.173.187.185:${PORT}/wechat`);
  console.log(`🏥 健康检查: http://107.173.187.185:${PORT}/health`);
  console.log(`🔧 服务状态: http://107.173.187.185:${PORT}/health/services`);
  console.log(`📋 服务能力: http://107.173.187.185:${PORT}/capabilities`);

  // 设置定时推送任务
  if (config.dailyPush.users.length > 0) {
    cron.schedule(config.dailyPush.time, async () => {
      console.log("🌅 开始执行每日推送...");
      try {
        await wechatBot.sendDailyWeatherToAllUsers();
        console.log("✅ 每日推送完成");
      } catch (error) {
        console.error("❌ 每日推送失败:", error);
      }
    });

    console.log(`⏰ 每日推送已设置: ${config.dailyPush.time}`);
  } else {
    console.log("⚠️ 未配置每日推送用户，跳过定时任务");
  }
});
