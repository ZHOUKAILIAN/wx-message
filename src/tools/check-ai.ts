import { ConfigManager } from "../config/config-manager";
import { DeepSeekRouter, GeminiRouter } from "../services/ai-router";
import type { ServiceCapability } from "../services/service-interface";

async function main(): Promise<void> {
  const config = ConfigManager.getInstance().getConfig();

  const capabilities: ServiceCapability[] = [
    {
      name: "weather",
      description: "查询城市天气预报",
      keywords: ["天气", "weather", "气温", "下雨", "晴天", "阴天"],
      examples: ["杭州天气", "今天北京天气怎么样", "weather shanghai"],
    },
    {
      name: "stock",
      description: "查询股票行情",
      keywords: ["股票", "股价", "stock", "行情", "涨跌"],
      examples: ["苹果股票", "AAPL 股价", "腾讯股票怎么样"],
    },
    {
      name: "time",
      description: "查询当前时间",
      keywords: ["时间", "time", "几点", "现在"],
      examples: ["现在几点了", "时间", "time now"],
    },
    {
      name: "help",
      description: "帮助与使用说明",
      keywords: ["帮助", "help", "怎么用", "功能"],
      examples: ["帮助", "help"],
    },
  ];

  const model =
    config.ai.model ||
    (config.ai.provider === "deepseek" ? "deepseek-chat" : "gemini-pro");

  const router =
    config.ai.provider === "deepseek"
      ? new DeepSeekRouter(config.ai.apiKey, model, capabilities)
      : new GeminiRouter(config.ai.apiKey, model, capabilities);

  const sampleUserMessage = "杭州天气怎么样？";

  console.log("🔍 AI 连接自检开始");
  console.log(`  🤖 provider: ${config.ai.provider}`);
  console.log(`  🧠 model: ${model}`);

  const intent = await router.analyzeIntent(sampleUserMessage);
  console.log("✅ analyzeIntent 成功");
  console.log(intent);

  const responseText = await router.generateResponse({
    userMessage: sampleUserMessage,
    serviceName: intent.serviceName,
    serviceResponse: {
      success: true,
      content: "（自检用的模拟服务响应）",
    },
  });

  console.log("✅ generateResponse 成功");
  console.log(responseText);
  console.log("🎉 AI 连接自检通过");
}

main().catch((error) => {
  console.error("❌ AI 连接自检失败");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
