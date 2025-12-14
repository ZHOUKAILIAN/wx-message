import {
  BaseService,
  ServiceCapability,
  ServiceRequest,
  ServiceResponse,
} from "./service-interface";
import { MCPClient } from "./mcp-client";

export class WeatherService extends BaseService {
  // 与 MCP 工具名保持一致，便于 AI 路由与能力展示
  readonly name = "get-weather";

  readonly capabilities: ServiceCapability[] = [
    {
      name: "get-weather",
      description: "通过 MCP 获取天气信息",
      keywords: ["get-weather"],
      examples: ["get-weather"],
      parameters: [
        {
          name: "cityName",
          type: "string",
          required: false,
          description: "城市名称",
          defaultValue: "杭州市",
        },
      ],
    },
  ];

  private mcpClient: MCPClient;

  constructor(mcpUrl: string) {
    super();
    this.mcpClient = new MCPClient(mcpUrl);
  }

  canHandle(_request: ServiceRequest): boolean {
    // 由大模型统一做路由，不做本地匹配
    return false;
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    try {
      const args = request.parameters || {};
      if (!args.cityName) {
        args.cityName = "杭州市";
      }

      const result = await this.mcpClient.callTool("get-weather", args);
      const text = result?.content?.[0]?.text;

      return {
        success: true,
        content:
          typeof text === "string" && text.trim()
            ? text
            : JSON.stringify(result),
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        content: "❌ 获取天气信息失败，请稍后重试",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getHelp(): string {
    return `🌤️ 天气查询（MCP）\n\n可用工具：get-weather`;
  }

  async healthCheck(): Promise<boolean> {
    return this.mcpClient.isSessionActive();
  }
}
