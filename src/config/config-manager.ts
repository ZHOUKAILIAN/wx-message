import dotenv from 'dotenv';
import { BotConfig } from '../services/service-interface';

/**
 * 配置管理器
 * 负责加载和管理系统配置
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: BotConfig;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    // 加载环境变量
    dotenv.config();

    // 验证必需的环境变量
    this.validateRequiredEnvVars();

    // 构建配置对象
    this.config = {
      wechat: {
        appId: process.env.WECHAT_APP_ID!,
        appSecret: process.env.WECHAT_APP_SECRET!,
        token: process.env.WECHAT_TOKEN!
      },
      ai: {
        provider: (process.env.AI_PROVIDER as 'deepseek' | 'gemini') || 'deepseek',
        apiKey: process.env.AI_API_KEY!,
        model: process.env.AI_MODEL
      },
      services: {
        weather: {
          enabled: process.env.WEATHER_SERVICE_ENABLED !== 'false',
          config: {
            mcpUrl: process.env.MCP_URL || 'http://localhost:7777'
          }
        },
        stock: {
          enabled: process.env.STOCK_SERVICE_ENABLED !== 'false',
          config: {
            // 股票服务配置（如果需要API密钥等）
          }
        },
        time: {
          enabled: process.env.TIME_SERVICE_ENABLED !== 'false',
          config: {}
        },
        help: {
          enabled: true,
          config: {}
        }
      },
      dailyPush: {
        users: process.env.DAILY_PUSH_USERS?.split(',') || [],
        time: process.env.DAILY_PUSH_TIME || '0 8 * * *',
        services: process.env.DAILY_PUSH_SERVICES?.split(',') || ['weather', 'time']
      }
    };

    console.log('✅ 配置加载完成');
    this.logConfigSummary();
  }

  private validateRequiredEnvVars(): void {
    const requiredVars = [
      'WECHAT_APP_ID',
      'WECHAT_APP_SECRET', 
      'WECHAT_TOKEN',
      'AI_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`缺少必需的环境变量: ${missingVars.join(', ')}`);
    }
  }

  private logConfigSummary(): void {
    console.log('📋 配置摘要:');
    console.log(`  🤖 AI提供商: ${this.config.ai.provider}`);
    console.log(`  🌤️ 天气服务: ${this.config.services.weather.enabled ? '启用' : '禁用'}`);
    console.log(`  📈 股票服务: ${this.config.services.stock.enabled ? '启用' : '禁用'}`);
    console.log(`  📅 每日推送: ${this.config.dailyPush.users.length > 0 ? '已配置' : '未配置'} (${this.config.dailyPush.users.length} 用户)`);
    console.log(`  ⏰ 推送时间: ${this.config.dailyPush.time}`);
    console.log(`  🎯 推送服务: ${this.config.dailyPush.services.join(', ')}`);
  }

  public getConfig(): BotConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<BotConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔄 配置已更新');
  }

  public updateServiceConfig(serviceName: string, config: any): void {
    if (this.config.services[serviceName]) {
      this.config.services[serviceName] = {
        ...this.config.services[serviceName],
        config
      };
      console.log(`🔄 服务 ${serviceName} 配置已更新`);
    } else {
      console.warn(`⚠️ 服务 ${serviceName} 不存在`);
    }
  }

  public addDailyPushUser(userId: string): void {
    if (!this.config.dailyPush.users.includes(userId)) {
      this.config.dailyPush.users.push(userId);
      console.log(`✅ 已添加每日推送用户: ${userId}`);
    } else {
      console.log(`ℹ️ 用户 ${userId} 已在每日推送列表中`);
    }
  }

  public removeDailyPushUser(userId: string): void {
    const index = this.config.dailyPush.users.indexOf(userId);
    if (index > -1) {
      this.config.dailyPush.users.splice(index, 1);
      console.log(`✅ 已移除每日推送用户: ${userId}`);
    } else {
      console.log(`ℹ️ 用户 ${userId} 不在每日推送列表中`);
    }
  }

  public getDailyPushUsers(): string[] {
    return [...this.config.dailyPush.users];
  }

  public isServiceEnabled(serviceName: string): boolean {
    return this.config.services[serviceName]?.enabled ?? false;
  }

  public getServiceConfig(serviceName: string): any {
    return this.config.services[serviceName]?.config ?? {};
  }
}
