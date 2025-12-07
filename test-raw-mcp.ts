import axios from 'axios';

async function testRawMCP() {
  console.log('🧪 原始MCP测试...');
  
  const mcpUrl = 'http://localhost:7777';
  
  try {
    // 1. 先建立SSE连接
    console.log('1️⃣ 建立SSE连接...');
    const sseResponse = await axios.get(`${mcpUrl}/mcp`, {
      responseType: 'stream'
    });
    
    console.log('✅ SSE连接建立成功');
    
    // 2. 监听SSE数据
    let responseReceived = false;
    
    sseResponse.data.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      console.log('📥 收到SSE数据:', data);
      
      if (data.includes('result') || data.includes('error')) {
        responseReceived = true;
        console.log('✅ 收到MCP响应');
      }
    });
    
    sseResponse.data.on('error', (error: any) => {
      console.error('SSE错误:', error);
    });
    
    // 3. 等待一秒后发送POST请求
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('2️⃣ 发送POST请求...');
    const postResponse = await axios.post(`${mcpUrl}/mcp-messages`, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get-weather',
        arguments: { cityName: '杭州市' }
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 POST响应:', postResponse.data);
    
    // 4. 等待SSE响应
    console.log('3️⃣ 等待SSE响应...');
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (responseReceived) {
        console.log('✅ 测试完成');
        return;
      }
    }
    
    console.log('⚠️ 未在预期时间内收到SSE响应');
    
  } catch (error) {
    console.error('❌ 原始测试失败:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('详细错误:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
  }
}

testRawMCP();
