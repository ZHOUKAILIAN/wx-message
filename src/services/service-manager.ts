import { BaseService, ServiceRequest, ServiceResponse, AIRouter, BotConfig } from './service-interface';
import { createAIRouter } from './ai-router';
import { WeatherService } from './weather-service';
import { StockService } from './stock-service';
import { TimeService, HelpService, UnknownService } from './basic-services';

export class ServiceManager {
  private services: Map<string, BaseService> = new Map();
  private aiRouter: AIRouter;
  private helpService: HelpService | null = null;
  private unknownService: UnknownService | null = null;

  constructor(private config: BotConfig) {
    // 初始化AI路由器
    this.aiRouter = createAIRouter(
      config.ai.provider,
      config.ai.apiKey,
      config.ai.model
    );

    // 初始化基础服务
    this.initializeServices();
  }

  private initializeServices(): void {
    // 创建服务实例
    const mcpUrl = this.config.services.weather?.config?.mcpUrl || 'http://localhost:7777';
    const weatherService = new WeatherService(mcpUrl);
    const stockService = new StockService();
    const timeService = new TimeService();
    this.helpService = new HelpService();
    this.unknownService = new UnknownService();

    // 注册服务
    this.registerService(weatherService);
    this.registerService(stockService);
    this.registerService(timeService);
    if (this.helpService) {
      this.registerService(this.helpService);
    }
    if (this.unknownService) {
      this.registerService(this.unknownService);
    }

    // 更新帮助服务的能力列表
    this.updateHelpServiceCapabilities();
    
    // 更新AI路由器的能力列表
    this.updateAIRouterCapabilities();
  }

  private registerService(service: BaseService): void {
    this.services.set(service.name, service);
    console.log(`✅ 已注册服务: ${service.name}`);
  }

  private updateHelpServiceCapabilities(): void {
    if (!this.helpService) return;
    
    const allCapabilities = Array.from(this.services.values())
      .filter(service => service.name !== 'unknown') // 排除未知服务
      .flatMap(service => service.capabilities);
    
    this.helpService.setAllCapabilities(allCapabilities);
  }

  private updateAIRouterCapabilities(): void {
    const allCapabilities = Array.from(this.services.values())
      .flatMap(service => service.capabilities);
    
    if ('updateCapabilities' in this.aiRouter) {
      (this.aiRouter as any).updateCapabilities(allCapabilities);
    }
  }

  /**
   * 处理用户请求的主要方法
   */
  async processRequest(input: string, userId: string): Promise<ServiceResponse> {
    const request: ServiceRequest = {
      input,
      userId,
      context: { timestamp: new Date().toISOString() }
    };

    try {
      console.log(`🔄 处理用户请求: "${input}"`);

      // 使用AI分析意图
      const intent = await this.aiRouter.analyzeIntent(input);
      console.log(`🧠 AI意图分析:`, intent);

      // 选择服务
      let service: BaseService;
      
      if (intent.confidence > 0.7 && intent.serviceName !== 'unknown') {
        // AI置信度高，使用AI推荐的服务
        service = this.services.get(intent.serviceName) || this.unknownService || new UnknownService();
        request.parameters = intent.parameters;
      } else {
        // AI置信度低，使用传统关键词匹配
        service = this.findServiceByKeywords(input);
      }

      console.log(`🎯 选择服务: ${service.name}`);

      // 调用服务
      const serviceResponse = await service.handle(request);
      console.log(`📤 服务响应:`, serviceResponse);

      // 如果启用了AI且不是帮助服务，使用AI生成回复
      if (this.shouldUseAI(input, service.name)) {
        const aiResponse = await this.aiRouter.generateResponse({
          userMessage: input,
          serviceResponse,
          serviceName: service.name
        });
        
        return {
          ...serviceResponse,
          content: aiResponse
        };
      }

      return serviceResponse;

    } catch (error) {
      console.error('处理请求失败:', error);
      return {
        success: false,
        content: '❌ 系统错误，请稍后重试',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 根据关键词匹配服务
   */
  private findServiceByKeywords(input: string): BaseService {
    for (const service of this.services.values()) {
      if (service.name === 'unknown') continue; // 兜底服务最后考虑
      
      const request: ServiceRequest = { input, userId: 'test' };
      if (service.canHandle(request)) {
        return service;
      }
    }
    
    return this.unknownService || new UnknownService();
  }

  /**
   * 判断是否应该使用AI生成回复
   */
  private shouldUseAI(input: string, serviceName: string): boolean {
    // 帮助服务直接返回格式化的内容
    if (serviceName === 'help') {
      return false;
    }

    // 简单的时间查询不需要AI
    if (serviceName === 'time' && input.length < 10) {
      return false;
    }

    // 其他情况使用AI
    return true;
  }

  /**
   * 获取所有服务的健康状态
   */
  async getHealthStatus(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};
    
    for (const [name, service] of this.services) {
      try {
        healthStatus[name] = await service.healthCheck();
      } catch (error) {
        healthStatus[name] = false;
        console.error(`服务 ${name} 健康检查失败:`, error);
      }
    }
    
    return healthStatus;
  }

  /**
   * 获取服务能力描述
   */
  getServiceCapabilities(): Array<{ name: string; capabilities: any[] }> {
    return Array.from(this.services.values()).map(service => ({
      name: service.name,
      capabilities: service.capabilities
    }));
  }

  /**
   * 执行定时任务（如每日推送）
   */
  async executeDailyPush(userId: string, serviceNames: string[]): Promise<void> {
    console.log(`🌅 开始为用户 ${userId} 执行每日推送...`);
    
    for (const serviceName of serviceNames) {
      const service = this.services.get(serviceName);
      if (!service) {
        console.warn(`⚠️ 服务 ${serviceName} 不存在，跳过`);
        continue;
      }

      try {
        const request: ServiceRequest = {
          input: this.getDailyPushTrigger(serviceName),
          userId
        };
        
        const response = await service.handle(request);
        
        if (response.success) {
          console.log(`✅ 服务 ${serviceName} 推送成功`);
          // 这里应该调用微信API发送消息，但需要在WeChatBot类中实现
        } else {
          console.error(`❌ 服务 ${serviceName} 推送失败:`, response.error);
        }
      } catch (error) {
        console.error(`❌ 服务 ${serviceName} 推送异常:`, error);
      }
    }
  }

  /**
   * 获取每日推送的触发词
   */
  private getDailyPushTrigger(serviceName: string): string {
    const triggers: Record<string, string> = {
      weather: '天气',
      stock: '股票',
      time: '时间'
    };
    
    return triggers[serviceName] || serviceName;
  }

  /**
   * 重启AI路由器（用于更新配置）
   */
  updateAIConfig(provider: 'deepseek' | 'gemini', apiKey: string, model?: string): void {
    this.config.ai.provider = provider;
    this.config.ai.apiKey = apiKey;
    this.config.ai.model = model;
    
    this.aiRouter = createAIRouter(provider, apiKey, model);
    this.updateAIRouterCapabilities();
    
    console.log(`🔄 AI路由器已更新: ${provider}`);
  }
}
