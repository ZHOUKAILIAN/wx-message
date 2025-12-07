import axios from 'axios';
import { EventEmitter } from 'events';

export class MCPClient extends EventEmitter {
  private mcpUrl: string;
  private sessionId: string;
  private isConnected: boolean = false;

  constructor(mcpUrl: string) {
    super();
    this.mcpUrl = mcpUrl;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 建立SSE连接
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log('🔗 建立MCP SSE连接...');
      
      // 创建SSE连接
      const response = await axios.get(`${this.mcpUrl}/mcp`, {
        responseType: 'stream',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });

      this.isConnected = true;
      console.log('✅ MCP SSE连接已建立');
      
      // 监听SSE消息
      let buffer = '';
      
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        debugger
        // 保留最后一行可能不完整的数据
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // 跳过空行和注释
          if (!trimmedLine || trimmedLine.startsWith(':')) {
            continue;
          }
          
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.substring(6);
            if (data.trim()) {
              try {
                const event = JSON.parse(data);
                this.emit('message', event);
              } catch (error) {
                console.error('解析SSE消息失败:', error);
                console.error('原始数据:', data);
              }
            }
          }
        }
      });

      response.data.on('error', (error: any) => {
        console.error('SSE连接错误:', error);
        this.isConnected = false;
        this.emit('error', error);
      });

      response.data.on('close', () => {
        console.log('🔌 MCP SSE连接已关闭');
        this.isConnected = false;
        this.emit('disconnect');
      });

    } catch (error) {
      console.error('❌ 建立MCP SSE连接失败:', error);
      throw error;
    }
  }

  // 调用MCP工具
  async callTool(toolName: string, args: any = {}): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const response = await axios.post(`${this.mcpUrl}/mcp-messages`, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log('📨 MCP响应:', JSON.stringify(response.data, null, 2));
      
      if (response.data.result) {
        return response.data.result;
      } else if (response.data.error) {
        throw new Error(response.data.error.message || 'MCP调用失败');
      } else {
        throw new Error('MCP返回无效响应');
      }
    } catch (error) {
      console.error('❌ MCP工具调用失败:', error);
      throw error;
    }
  }

  // 获取天气信息
  async getWeather(cityName: string = '杭州市'): Promise<any> {
    try {
      const result = await this.callTool('get-weather', { cityName });
      return result;
    } catch (error) {
      console.error('获取天气信息失败:', error);
      throw error;
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.isConnected) {
      this.isConnected = false;
      this.emit('disconnect');
    }
  }

  // 检查连接状态
  isSessionActive(): boolean {
    return this.isConnected;
  }
}
