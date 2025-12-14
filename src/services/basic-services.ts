import {
  BaseService,
  ServiceRequest,
  ServiceResponse,
  ServiceCapability,
} from "./service-interface";

export class TimeService extends BaseService {
  readonly name = "time";
  readonly capabilities: ServiceCapability[] = [
    {
      name: "time",
      description: "查询当前时间",
      keywords: ["时间", "time", "几点", "现在", "当前时间"],
      examples: ["时间", "time", "现在几点了", "当前时间", "现在是什么时间"],
      parameters: [],
    },
  ];

  canHandle(request: ServiceRequest): boolean {
    const input = request.input.toLowerCase();
    const keywords = this.capabilities[0].keywords;
    return keywords.some((keyword) => input.includes(keyword));
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    try {
      const now = new Date();

      const timeFormats = [
        {
          label: "🕐 当前时间",
          value: now.toLocaleTimeString("zh-CN"),
        },
        {
          label: "📅 日期",
          value: now.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          }),
        },
        {
          label: "🌍 国际时间",
          value: now.toISOString(),
        },
      ];

      let message = `${timeFormats[0].label}: ${timeFormats[0].value}\n`;
      message += `${timeFormats[1].label}: ${timeFormats[1].value}\n`;
      message += `${timeFormats[2].label}: ${timeFormats[2].value}`;

      return {
        success: true,
        content: message,
        data: {
          timestamp: now.getTime(),
          isoString: now.toISOString(),
          localString: now.toLocaleString("zh-CN"),
        },
        suggestions: ["查询天气", "查看股票行情", "获取帮助信息"],
      };
    } catch (error) {
      console.error("时间服务处理失败:", error);
      return {
        success: false,
        content: "❌ 时间服务暂时不可用，请稍后重试",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getHelp(): string {
    return (
      `🕐 时间服务使用说明\n\n` +
      `📌 支持的查询方式：\n` +
      `• "时间" - 查询当前时间\n` +
      `• "time" - 英文查询\n` +
      `• "现在几点" - 自然语言查询\n\n` +
      `💡 支持本地时间和国际时间显示`
    );
  }

  async healthCheck(): Promise<boolean> {
    return true; // 时间服务总是可用的
  }
}

export class HelpService extends BaseService {
  readonly name = "help";
  private allCapabilities: ServiceCapability[] = [];

  readonly capabilities: ServiceCapability[] = [
    {
      name: "help",
      description: "获取帮助信息",
      keywords: ["帮助", "help", "使用说明", "功能", "菜单"],
      examples: ["帮助", "help", "使用说明", "有什么功能", "?"],
      parameters: [],
    },
  ];

  constructor() {
    super();
  }

  setAllCapabilities(capabilities: ServiceCapability[]): void {
    this.allCapabilities = capabilities;
  }

  canHandle(request: ServiceRequest): boolean {
    const input = request.input.toLowerCase();
    const keywords = this.capabilities[0].keywords;

    // 检查关键词
    const hasKeyword = keywords.some((keyword) => input.includes(keyword));

    // 检查单独的问号
    const hasQuestionMark = input.includes("?");

    return hasKeyword || hasQuestionMark;
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    try {
      let message = `🤖 智能助手使用说明\n\n`;
      message += `📌 可用功能列表：\n\n`;

      // 按服务分组显示功能
      const serviceGroups = this.allCapabilities.reduce(
        (groups, capability) => {
          if (!groups[capability.name]) {
            groups[capability.name] = [];
          }
          groups[capability.name].push(capability);
          return groups;
        },
        {} as Record<string, ServiceCapability[]>
      );

      for (const [serviceName, capabilities] of Object.entries(serviceGroups)) {
        if (serviceName === "help") continue; // 跳过帮助服务本身

        const capability = capabilities[0];
        message += `🔸 ${capability.description}\n`;
        message += `   关键词: ${capability.keywords.join(", ")}\n`;
        message += `   示例: ${capability.examples.slice(0, 2).join(", ")}\n\n`;
      }

      message += `💡 使用技巧：\n`;
      message += `• 可以用自然语言描述您的需求\n`;
      message += `• 支持中英文混合查询\n`;
      message += `• 直接说一句话，AI 会自动选择可用功能（来自 MCP 工具列表）\n\n`;
      message += `🚀 AI智能路由会自动理解您的意图并调用相应 MCP 工具！`;

      return {
        success: true,
        content: message,
        data: {
          services: serviceGroups,
          totalServices: Object.keys(serviceGroups).length,
        },
        suggestions: ["查询天气", "查看股票行情", "获取当前时间"],
      };
    } catch (error) {
      console.error("帮助服务处理失败:", error);
      return {
        success: false,
        content: "❌ 帮助服务暂时不可用，请稍后重试",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getHelp(): string {
    return (
      `🆘 帮助服务使用说明\n\n` +
      `📌 查询方式：\n` +
      `• "帮助" - 获取完整使用说明\n` +
      `• "help" - 英文查询\n` +
      `• "?" - 快速获取帮助\n\n` +
      `💡 帮助服务会显示所有可用的功能和服务`
    );
  }

  async healthCheck(): Promise<boolean> {
    return true; // 帮助服务总是可用的
  }
}

export class UnknownService extends BaseService {
  readonly name = "unknown";
  readonly capabilities: ServiceCapability[] = [
    {
      name: "unknown",
      description: "处理无法识别的请求",
      keywords: [],
      examples: [],
      parameters: [],
    },
  ];

  canHandle(request: ServiceRequest): boolean {
    return true; // 总是可以处理（作为兜底）
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    const suggestions = [
      '发送"帮助"查看所有功能',
      '试试："有什么功能"',
      '试试："帮我查一下..."',
    ];

    return {
      success: false,
      content:
        `🤔 抱歉，我暂时无法理解您的需求："${request.input}"\n\n` +
        `💡 建议：\n` +
        suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") +
        `\n\n🤖 您可以尝试用更明确的方式表达您的需求，或者发送"帮助"查看所有可用功能。`,
      error: "无法识别用户意图",
      suggestions,
    };
  }

  getHelp(): string {
    return (
      `❓ 未知请求处理\n\n` +
      `当AI无法理解您的需求时，我会：\n` +
      `• 提供功能建议\n` +
      `• 显示可用服务列表\n` +
      `• 引导您使用正确的表达方式`
    );
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
