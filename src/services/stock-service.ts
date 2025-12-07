import { BaseService, ServiceRequest, ServiceResponse, ServiceCapability } from './service-interface';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  updateTime: string;
}

export class StockService extends BaseService {
  readonly name = 'stock';
  readonly capabilities: ServiceCapability[] = [
    {
      name: 'stock',
      description: '查询股票行情信息',
      keywords: ['股票', '股价', '涨跌', 'stock', '股价', '行情'],
      examples: [
        '股票',
        '苹果股票',
        'AAPL股价',
        '腾讯股票怎么样',
        'stock AAPL',
        '特斯拉股票'
      ],
      parameters: [
        {
          name: 'symbol',
          type: 'string',
          required: false,
          description: '股票代码，如AAPL、TSLA等',
          defaultValue: 'AAPL'
        }
      ]
    }
  ];

  // 模拟股票数据 - 在实际项目中应该接入真实的股票API
  private mockStockData: Record<string, StockData> = {
    'AAPL': {
      symbol: 'AAPL',
      name: '苹果公司',
      price: 178.56,
      change: 2.34,
      changePercent: 1.33,
      volume: '52.3M',
      updateTime: new Date().toLocaleString('zh-CN')
    },
    'TSLA': {
      symbol: 'TSLA',
      name: '特斯拉',
      price: 245.82,
      change: -3.21,
      changePercent: -1.29,
      volume: '98.7M',
      updateTime: new Date().toLocaleString('zh-CN')
    },
    'MSFT': {
      symbol: 'MSFT',
      name: '微软',
      price: 378.91,
      change: 1.23,
      changePercent: 0.33,
      volume: '28.1M',
      updateTime: new Date().toLocaleString('zh-CN')
    },
    'GOOGL': {
      symbol: 'GOOGL',
      name: '谷歌',
      price: 139.62,
      change: -0.87,
      changePercent: -0.62,
      volume: '31.4M',
      updateTime: new Date().toLocaleString('zh-CN')
    }
  };

  private stockNameMap: Record<string, string> = {
    '苹果': 'AAPL',
    '苹果公司': 'AAPL',
    '特斯拉': 'TSLA',
    '微软': 'MSFT',
    '谷歌': 'GOOGL',
    '谷歌公司': 'GOOGL'
  };

  canHandle(request: ServiceRequest): boolean {
    const input = request.input.toLowerCase();
    const keywords = this.capabilities[0].keywords;
    
    return keywords.some(keyword => input.includes(keyword));
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    try {
      const symbol = this.extractStockSymbol(request.input) || 
                    request.parameters?.symbol || 
                    'AAPL';

      console.log(`📈 查询股票${symbol}行情...`);
      
      const stockData = await this.getStockData(symbol);
      
      if (!stockData) {
        return {
          success: false,
          content: `❌ 未找到股票代码 ${symbol} 的信息`,
          error: `股票代码 ${symbol} 不存在或暂无数据`
        };
      }

      const formattedMessage = this.formatStockMessage(stockData);
      
      return {
        success: true,
        content: formattedMessage,
        data: stockData,
        suggestions: [
          `${stockData.symbol} 详细信息`,
          '查看其他股票行情',
          '股市大盘分析'
        ]
      };
      
    } catch (error) {
      console.error('股票服务处理失败:', error);
      return {
        success: false,
        content: '❌ 股票服务暂时不可用，请稍后重试',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private extractStockSymbol(input: string): string | null {
    // 提取股票代码 - 支持中英文
    const patterns = [
      /([A-Z]{1,5})(?:\s*(?:股票|股价|行情))/i,      // "AAPL股票"
      /(?:股票|股价|行情)\s*([A-Z]{1,5})/i,           // "股票AAPL"
      /(苹果|特斯拉|微软|谷歌)(?:\s*(?:股票|股价))/,   // "苹果股票"
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        let symbol = match[1].toUpperCase();
        // 如果是中文名，映射到股票代码
        if (this.stockNameMap[symbol]) {
          symbol = this.stockNameMap[symbol];
        }
        return symbol;
      }
    }
    
    return null;
  }

  private async getStockData(symbol: string): Promise<StockData | null> {
    // 在实际项目中，这里应该调用真实的股票API
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const upperSymbol = symbol.toUpperCase();
    
    // 如果是模拟数据
    if (this.mockStockData[upperSymbol]) {
      // 模拟价格变化
      const originalData = { ...this.mockStockData[upperSymbol] };
      const randomChange = (Math.random() - 0.5) * 2; // -1 到 1 之间的随机变化
      originalData.price += randomChange;
      originalData.change = randomChange;
      originalData.changePercent = (randomChange / originalData.price) * 100;
      originalData.updateTime = new Date().toLocaleString('zh-CN');
      
      return originalData;
    }
    
    // 如果不在模拟数据中，尝试生成一个假的股票数据
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return {
        symbol: upperSymbol,
        name: `${upperSymbol} 公司`,
        price: Math.random() * 500 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: `${(Math.random() * 100).toFixed(1)}M`,
        updateTime: new Date().toLocaleString('zh-CN')
      };
    }
    
    return null;
  }

  private formatStockMessage(data: StockData): string {
    const changeEmoji = data.change >= 0 ? '📈' : '📉';
    const changeColor = data.change >= 0 ? '+' : '';
    
    let message = `${changeEmoji} ${data.name} (${data.symbol})\n`;
    message += `─`.repeat(25) + '\n';
    message += `💰 当前价格: $${data.price.toFixed(2)}\n`;
    message += `📊 涨跌: ${changeColor}${data.change.toFixed(2)} (${changeColor}${data.changePercent.toFixed(2)}%)\n`;
    message += `📈 成交量: ${data.volume}\n`;
    message += `\n💡 数据更新时间: ${data.updateTime}`;
    
    return message;
  }

  getHelp(): string {
    return `📈 股票服务使用说明\n\n`
      + `📌 支持的查询方式：\n`
      + `• "股票" - 查询默认股票(AAPL)\n`
      + `• "AAPL股票" - 查询指定股票代码\n`
      + `• "苹果股票" - 查询公司股票\n`
      + `• "stock TSLA" - 中英混合查询\n\n`
      + `💡 支持的股票示例：AAPL、TSLA、MSFT、GOOGL\n`
      + `⚠️ 注意：当前为演示数据，非实时行情`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.getStockData('AAPL');
      return result !== null;
    } catch (error) {
      console.error('股票服务健康检查失败:', error);
      return false;
    }
  }
}
