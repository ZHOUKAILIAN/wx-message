import { BaseService, ServiceRequest, ServiceResponse, ServiceCapability } from './service-interface';
import { MCPClient } from './mcp-client';

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

export class WeatherService extends BaseService {
  readonly name = 'weather';
  readonly capabilities: ServiceCapability[] = [
    {
      name: 'weather',
      description: '查询天气预报信息',
      keywords: ['天气', 'weather', '气温', '下雨', '晴天', '阴天', '气温'],
      examples: [
        '天气',
        '杭州天气',
        '北京天气怎么样',
        '今天会下雨吗',
        'weather',
        '北京 weather'
      ],
      parameters: [
        {
          name: 'cityName',
          type: 'string',
          required: false,
          description: '城市名称，默认为杭州市',
          defaultValue: '杭州市'
        }
      ]
    }
  ];

  private mcpClient: MCPClient;

  constructor(mcpUrl: string) {
    super();
    this.mcpClient = new MCPClient(mcpUrl);
    this.initializeMCPConnection();
  }

  private async initializeMCPConnection(): Promise<void> {
    try {
      await this.mcpClient.connect();
      console.log('✅ 天气服务MCP连接已建立');
    } catch (error) {
      console.error('❌ 天气服务MCP连接失败:', error);
    }
  }

  canHandle(request: ServiceRequest): boolean {
    const input = request.input.toLowerCase();
    const keywords = this.capabilities[0].keywords;
    
    // 检查关键词匹配
    const hasKeyword = keywords.some(keyword => input.includes(keyword));
    
    // 检查weather关键词（支持中英文）
    const hasWeather = input.includes('weather') || input.includes('天气');
    
    return hasKeyword || hasWeather;
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    try {
      // 提取城市名称
      let cityName = this.extractCityName(request.input) || 
                     request.parameters?.cityName || 
                     '杭州市';

      console.log(`🌤️ 查询${cityName}天气信息...`);
      
      const result = await this.mcpClient.getWeather(cityName);
      
      if (result.content && result.content.length > 0) {
        const weatherText = result.content[0].text;
        const weatherData = JSON.parse(weatherText) as WeatherResponse;
        const formattedMessage = this.formatWeatherMessage(weatherData, cityName);
        
        return {
          success: true,
          content: formattedMessage,
          data: weatherData,
          suggestions: [
            `${cityName}明天天气`,
            '查询其他城市天气',
            '查看空气质量'
          ]
        };
      }
      
      return {
        success: false,
        content: '❌ 获取天气信息失败，请稍后重试',
        error: 'MCP服务返回空数据'
      };
      
    } catch (error) {
      console.error('天气服务处理失败:', error);
      return {
        success: false,
        content: '❌ 天气服务暂时不可用，请稍后重试',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private extractCityName(input: string): string | null {
    // 正则匹配城市名 + 天气
    const patterns = [
        /^(.+?)(?:天气|weather)$/i,           // "北京天气"
        /^(.+?)(?:天气|weather).*/i,          // "北京天气怎么样"
        /(?:天气|weather)(.+)$/i,             // "weather北京"
        /(?:查询|查看|预报).+?(\w+市|\w+县|\w+区|\w{2,4})/i  // "查询北京市天气"
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const city = match[1].trim();
        // 过滤掉无意义的词
        if (!['怎么样', '如何', '情况', '详情', ''].includes(city)) {
          return city;
        }
      }
    }
    
    return null;
  }

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
    
    // 取前8小时的天气数据
    const hourlyData = data.hourly.slice(0, 8);
    
    let message = `📍 ${cityName} 天气预报\n`;
    message += `📅 ${today}\n`;
    message += `─`.repeat(20) + '\n\n';
    
    hourlyData.forEach((hour, index) => {
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
      
      if ((index + 1) % 2 === 0 && index < hourlyData.length - 1) {
        message += '\n';
      }
    });
    
    message += `\n─`.repeat(20) + '\n';
    message += `💡 建议根据天气情况合理安排出行~\n`;
    message += `🔄 数据更新时间: ${new Date().toLocaleTimeString('zh-CN')}`;
    
    return message;
  }

  getHelp(): string {
    return `🌤️ 天气服务使用说明\n\n`
      + `📌 支持的查询方式：\n`
      + `• "天气" - 查询杭州天气\n`
      + `• "北京天气" - 查询指定城市\n`
      + `• "北京天气怎么样" - 自然语言查询\n`
      + `• "weather Beijing" - 中英混合查询\n\n`
      + `💡 小提示：支持全国主要城市的天气查询`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.mcpClient.getWeather('杭州市');
      return result.content && result.content.length > 0;
    } catch (error) {
      console.error('天气服务健康检查失败:', error);
      return false;
    }
  }
}
