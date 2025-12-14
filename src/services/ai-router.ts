import axios from "axios";
import { AIRouter, ServiceCapability } from "./service-interface";

export class DeepSeekRouter implements AIRouter {
  private apiKey: string;
  private model: string;
  private capabilities: ServiceCapability[];

  constructor(
    apiKey: string,
    model: string = "deepseek-chat",
    capabilities: ServiceCapability[] = []
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.capabilities = capabilities;
  }

  async analyzeIntent(input: string): Promise<{
    serviceName: string;
    confidence: number;
    parameters: Record<string, any>;
    reasoning: string;
  }> {
    const capabilitiesText = this.capabilities
      .map(
        (cap) =>
          `- ${cap.name}: ${cap.description}\n` +
          `  关键词: ${(cap.keywords || []).join(", ")}\n` +
          `  示例: ${(cap.examples || []).join(", ")}\n` +
          `  参数: ${JSON.stringify(
            (cap.parameters || []).map((p) => ({
              name: p.name,
              type: p.type,
              required: p.required,
              description: p.description,
              defaultValue: p.defaultValue,
            }))
          )}`
      )
      .join("\n");

    const prompt = `你是一个智能路由器，负责根据“服务能力列表”分析用户意图并选择合适的服务。

可用的服务列表：
${capabilitiesText}

请分析用户消息："${input}"

返回JSON格式的分析结果：
{
  "serviceName": "服务名称",
  "confidence": 0.0-1.0之间的置信度,
  "parameters": {
    "提取的参数": "参数值"
  },
  "reasoning": "选择该服务的推理过程"
}

分析规则：
1. 必须从服务列表中选择一个 serviceName；如果都不匹配，返回 "unknown"，confidence 设为 0
2. parameters 必须与所选服务的“参数”字段一致；没有参数则返回 {}
3. 如果用户的输入缺少关键必填参数，请在 reasoning 中说明，并尽量给出合理默认值（若参数定义里有 defaultValue）

请只返回JSON，不要包含其他文字。`;

    try {
      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的意图分析助手，严格按照指定格式返回JSON结果。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const result = this.safeParseJson(content);
      if (!result) {
        throw new Error("AI 返回内容非 JSON，可解析的片段不存在");
      }

      return {
        serviceName: result.serviceName || "unknown",
        confidence: result.confidence || 0,
        parameters: result.parameters || {},
        reasoning: result.reasoning || "未提供推理过程",
      };
    } catch (error) {
      console.error("AI分析意图失败:", error);
      return {
        serviceName: "unknown",
        confidence: 0,
        parameters: {},
        reasoning: "AI分析失败，返回默认结果",
      };
    }
  }

  /**
   * 尝试解析 AI 返回的 JSON，兼容被包裹在 ```json ``` 或附带额外文本的情况
   */
  private safeParseJson(content: string): any | null {
    try {
      return JSON.parse(content);
    } catch (err) {
      // 兼容 ```json ... ``` 形式
      const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced) {
        try {
          return JSON.parse(fenced[1].trim());
        } catch {
          /* ignore */
        }
      }

      // 退一步：截取第一个 { 到最后一个 } 尝试解析
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const slice = content.slice(start, end + 1);
        try {
          return JSON.parse(slice);
        } catch {
          /* ignore */
        }
      }
    }
    return null;
  }

  async generateResponse(context: {
    userMessage: string;
    serviceResponse: any;
    serviceName: string;
  }): Promise<string> {
    const { userMessage, serviceResponse, serviceName } = context;

    if (serviceName === "help") {
      return serviceResponse.content;
    }

    const prompt = `用户消息："${userMessage}"
服务名称：${serviceName}
服务响应：${JSON.stringify(serviceResponse)}

请将服务响应转换为自然、友好的中文回复。要求
：
1. 保持回复简洁明了
2. 适当使用emoji增强可读性
3. 如果服务返回错误信息，给出友好的错误提示
4. 保持专业但亲切的语气

请直接返回回复内容，不要包含其他文字。`;

    try {
      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "你是一个微信机器人助手，擅长将技术响应转换为友好的中文对话。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error("AI生成回复失败:", error);
      // 降级处理：直接返回服务内容
      return serviceResponse.content || "服务暂时不可用，请稍后重试";
    }
  }

  updateCapabilities(capabilities: ServiceCapability[]): void {
    this.capabilities = capabilities;
  }
}

export class GeminiRouter implements AIRouter {
  private apiKey: string;
  private model: string;
  private capabilities: ServiceCapability[];

  constructor(
    apiKey: string,
    model: string = "gemini-pro",
    capabilities: ServiceCapability[] = []
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.capabilities = capabilities;
  }

  async analyzeIntent(input: string): Promise<{
    serviceName: string;
    confidence: number;
    parameters: Record<string, any>;
    reasoning: string;
  }> {
    const capabilitiesText = this.capabilities
      .map(
        (cap) =>
          `- ${cap.name}: ${cap.description}\n` +
          `  关键词: ${cap.keywords.join(", ")}\n` +
          `  示例: ${cap.examples.join(", ")}`
      )
      .join("\n");

    const prompt = `你是一个智能路由器，负责根据“服务能力列表”分析用户意图并选择合适的服务。

可用的服务列表：
${capabilitiesText}

请分析用户消息："${input}"

返回JSON格式的分析结果：
{
  "serviceName": "服务名称",
  "confidence": 0.0-1.0之间的置信度,
  "parameters": {
    "提取的参数": "参数值"
  },
  "reasoning": "选择该服务的推理过程"
}

分析规则：
1. 必须从服务列表中选择一个 serviceName；如果都不匹配，返回 "unknown"，confidence 设为 0
2. parameters 必须与所选服务的“参数”字段一致；没有参数则返回 {}
3. 如果用户的输入缺少关键必填参数，请在 reasoning 中说明，并尽量给出合理默认值（若参数定义里有 defaultValue）

请只返回JSON，不要包含其他文字。`;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }
      );

      const content = response.data.candidates[0].content.parts[0].text;
      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("无法从响应中提取JSON");
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        serviceName: result.serviceName || "unknown",
        confidence: result.confidence || 0,
        parameters: result.parameters || {},
        reasoning: result.reasoning || "未提供推理过程",
      };
    } catch (error) {
      console.error("AI分析意图失败:", error);
      return {
        serviceName: "unknown",
        confidence: 0,
        parameters: {},
        reasoning: "AI分析失败，返回默认结果",
      };
    }
  }

  async generateResponse(context: {
    userMessage: string;
    serviceResponse: any;
    serviceName: string;
  }): Promise<string> {
    const { userMessage, serviceResponse, serviceName } = context;

    if (serviceName === "help") {
      return serviceResponse.content;
    }

    const prompt = `用户消息："${userMessage}"
服务名称：${serviceName}
服务响应：${JSON.stringify(serviceResponse)}

请将服务响应转换为自然、友好的中文回复。要求：
1. 保持回复简洁明了
2. 适当使用emoji增强可读性
3. 如果服务返回错误信息，给出友好的错误提示
4. 保持专业但亲切的语气

请直接返回回复内容，不要包含其他文字。`;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error("AI生成回复失败:", error);
      // 降级处理：直接返回服务内容
      return serviceResponse.content || "服务暂时不可用，请稍后重试";
    }
  }

  updateCapabilities(capabilities: ServiceCapability[]): void {
    this.capabilities = capabilities;
  }
}

// 工厂函数
export function createAIRouter(
  provider: "deepseek" | "gemini",
  apiKey: string,
  model?: string
): AIRouter {
  switch (provider) {
    case "deepseek":
      return new DeepSeekRouter(apiKey, model);
    case "gemini":
      return new GeminiRouter(apiKey, model);
    default:
      throw new Error(`不支持的AI提供商: ${provider}`);
  }
}
