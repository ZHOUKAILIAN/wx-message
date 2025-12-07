import axios from 'axios';
import { ProperMCPClient } from './src/proper-mcp-client';

async function testMCPConnection() {
  console.log('🧪 开始测试MCP连接...');
  
  const mcpUrl = 'http://localhost:7777';
  const client = new ProperMCPClient(mcpUrl);
  
  try {
    // 1. 测试连接
    console.log('1️⃣ 测试SSE连接...');
    await client.connect();
    
    // 等待一下确保连接稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. 测试工具调用
    console.log('2️⃣ 测试天气工具调用...');
    const result = await client.callTool('get-weather', { cityName: '杭州市' });
    
    console.log('3️⃣ 测试结果:', result);
    
    if (result && result.content && result.content.length > 0) {
      const weatherData = JSON.parse(result.content[0].text);
      console.log('✅ 天气数据解析成功:', {
        hourlyCount: weatherData.hourly?.length || 0,
        firstHour: weatherData.hourly?.[0]
      });
    } else {
      console.log('❌ 天气数据格式异常');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    client.disconnect();
  }
}

// 运行测试
testMCPConnection().catch(console.error);
