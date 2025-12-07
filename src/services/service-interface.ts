/**
 * 服务接口定义
 * 所有插件服务都需要实现这个接口
 */

export interface ServiceRequest {
  input: string;
  userId: string;
  context?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface ServiceResponse {
  success: boolean;
  content: string;
  data?: any;
  error?: string;
  suggestions?: string[];
}

export interface ServiceCapability {
  name: string;
  description: string;
  keywords: string[];
  examples: string[];
  parameters?: ServiceParameter[];
}

export interface ServiceParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

/**
 * 所有服务插件的基础接口
 */
export abstract class BaseService {
  abstract readonly name: string;
  abstract readonly capabilities: ServiceCapability[];

  /**
   * 检查是否能处理当前请求
   */
  abstract canHandle(request: ServiceRequest): boolean;

  /**
   * 处理请求
   */
  abstract handle(request: ServiceRequest): Promise<ServiceResponse>;

  /**
   * 获取服务帮助信息
   */
  abstract getHelp(): string;

  /**
   * 健康检查
   */
  abstract healthCheck(): Promise<boolean>;
}

/**
 * AI路由器接口
 */
export interface AIRouter {
  /**
   * 分析用户意图，返回应该调用的服务
   */
  analyzeIntent(input: string): Promise<{
    serviceName: string;
    confidence: number;
    parameters: Record<string, any>;
    reasoning: string;
  }>;

  /**
   * 生成自然语言回复
   */
  generateResponse(context: {
    userMessage: string;
    serviceResponse: ServiceResponse;
    serviceName: string;
  }): Promise<string>;
}

/**
 * 配置接口
 */
export interface BotConfig {
  wechat: {
    appId: string;
    appSecret: string;
    token: string;
  };
  ai: {
    provider: 'deepseek' | 'gemini';
    apiKey: string;
    model?: string;
  };
  services: {
    [serviceName: string]: {
      enabled: boolean;
      config: Record<string, any>;
    };
  };
  dailyPush: {
    users: string[];
    time: string; // cron格式
    services: string[];
  };
}
