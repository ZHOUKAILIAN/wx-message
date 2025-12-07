import axios from 'axios';
import { EventEmitter } from 'events';

export class SimpleMCPClient extends EventEmitter {
  private mcpUrl: string;
  private isConnected: boolean = false;

  constructor(mcpUrl: string) {
    super();
    this.mcpUrl = mcpUrl;
  }

  // 简化的连接方法 - 只是为了建立SSE会话
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log('🔗 建立MCP SSE连接...');
      
      // 发起SSE连接但不处理复杂的数据解析
      const response = await axios.get(`${this.mcpUrl}/mcp`, {
        responseType: 'stream',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });

      this.isConnected = true;
      console.log('✅ MCP SSE连接已建立，等待POST请求...');
      debugger
      // 监听数据但不解析，只是保持连接
      response.data.on('data', (chunk: Buffer) => {
        // 静默处理SSE数据，不进行JSON解析
        console.log('📥 收到SSE数据，长度:', chunk.length);
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
      // 即使SSE连接失败，我们也标记为已连接，因为POST请求可能还能工作
      this.isConnected = true;
    }
  }

  // 调用MCP工具 - 这是核心方法
  async callTool(toolName: string, args: any = {}): Promise<any> {
    try {
      console.log(`🔧 调用MCP工具: ${toolName}`, args);

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

      console.log('📨 MCP工具响应:', JSON.stringify(response.data, null, 2));
      
      if (response.data.result) {
        return response.data.result;
      } else if (response.data.error) {
        throw new Error(response.data.error.message || 'MCP调用失败');
      } else {
        throw new Error('MCP返回无效响应');
      }
    } catch (error) {
      console.error('❌ MCP工具调用失败:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('详细错误信息:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      
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
