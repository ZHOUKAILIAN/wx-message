#!/usr/bin/env node

/**
 * Mock API测试工具
 * 用于快速测试微信机器人的各种接口
 */

const http = require("http");

const BASE_URL = "http://localhost:8080";

// Mock数据 - 使用真实ID
const mockWeChatMessages = {
  stockQuery: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <ToUserName><![CDATA[gh_9be43e570778]]></ToUserName>
  <FromUserName><![CDATA[o4l8609PwnOlUh9hhh08eJQUpOe4]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[查询苹果股票]]></Content>
  <MsgId>${Date.now()}001</MsgId>
</xml>`,
  },

  timeQuery: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <ToUserName><![CDATA[your-bot]]></ToUserName>
  <FromUserName><![CDATA[test-user-123]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[现在几点了]]></Content>
  <MsgId>${Date.now()}002</MsgId>
</xml>`,
  },

  helpQuery: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <ToUserName><![CDATA[o4l8609PwnOlUh9hhh08eJQUpOe4]]></ToUserName>
  <FromUserName><![CDATA[gh_9be43e570778]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[帮助]]></Content>
  <MsgId>${Date.now()}003</MsgId>
</xml>`,
  },

  weatherQuery: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <ToUserName><![CDATA[your-bot]]></ToUserName>
  <FromUserName><![CDATA[test-user-123]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[告诉我北京的天气，一句话，不要有其他符号]]></Content>
  <MsgId>${Date.now()}004</MsgId>
</xml>`,
  },

  unknownQuery: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <ToUserName><![CDATA[your-bot]]></ToUserName>
  <FromUserName><![CDATA[test-user-123]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[这是一个随机的测试消息]]></Content>
  <MsgId>${Date.now()}005</MsgId>
</xml>`,
  },
};

// HTTP请求工具函数
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 测试函数
async function testHealthCheck() {
  console.log("\n🔍 测试健康检查接口...");
  try {
    const response = await makeRequest({
      hostname: "localhost",
      port: 8080,
      path: "/health",
      method: "GET",
    });

    console.log(`✅ 状态码: ${response.statusCode}`);
    console.log(`📄 响应体: ${response.body}`);
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function testServicesHealth() {
  console.log("\n🔍 测试服务状态接口...");
  try {
    const response = await makeRequest({
      hostname: "localhost",
      port: 8080,
      path: "/health/services",
      method: "GET",
    });

    console.log(`✅ 状态码: ${response.statusCode}`);
    console.log(`📄 响应体: ${response.body}`);
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function testCapabilities() {
  console.log("\n🔍 测试服务能力接口...");
  try {
    const response = await makeRequest({
      hostname: "localhost",
      port: 8080,
      path: "/capabilities",
      method: "GET",
    });

    console.log(`✅ 状态码: ${response.statusCode}`);
    console.log(`📄 响应体: ${response.body}`);
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function testWeChatMessage(messageType, description) {
  console.log(`\n🔍 测试微信消息: ${description}...`);
  try {
    const xmlData = mockWeChatMessages[messageType].xml;

    const response = await makeRequest(
      {
        hostname: "localhost",
        port: 8080,
        path: "/wechat",
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          "Content-Length": Buffer.byteLength(xmlData),
        },
      },
      xmlData
    );

    console.log(`✅ 状态码: ${response.statusCode}`);
    console.log(`📄 响应体: ${response.body}`);
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function testAdminConfig() {
  console.log("\n🔍 测试管理员配置接口...");
  try {
    const response = await makeRequest({
      hostname: "localhost",
      port: 8080,
      path: "/admin/config",
      method: "GET",
    });

    console.log(`✅ 状态码: ${response.statusCode}`);
    console.log(`📄 响应体: ${response.body}`);
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

// 主测试函数
async function runAllTests() {
  console.log("🚀 开始API测试...\n");
  console.log(`📍 测试目标: ${BASE_URL}`);

  // 基础接口测试
  await testHealthCheck();
  await testServicesHealth();
  await testCapabilities();

  // 管理员接口测试
  await testAdminConfig();

  // 微信消息测试
  await testWeChatMessage("stockQuery", "股票查询");
  await testWeChatMessage("timeQuery", "时间查询");
  await testWeChatMessage("helpQuery", "帮助查询");
  await testWeChatMessage("weatherQuery", "天气查询");
  await testWeChatMessage("unknownQuery", "未知消息");

  console.log("\n✨ 所有测试完成！");
}

// 单独测试函数
async function runSingleTest(testType) {
  console.log(`🚀 运行单个测试: ${testType}\n`);

  switch (testType) {
    case "health":
      await testHealthCheck();
      break;
    case "services":
      await testServicesHealth();
      break;
    case "capabilities":
      await testCapabilities();
      break;
    case "config":
      await testAdminConfig();
      break;
    case "stock":
      await testWeChatMessage("stockQuery", "股票查询");
      break;
    case "time":
      await testWeChatMessage("timeQuery", "时间查询");
      break;
    case "help":
      await testWeChatMessage("helpQuery", "帮助查询");
      break;
    case "weather":
      await testWeChatMessage("weatherQuery", "天气查询");
      break;
    case "unknown":
      await testWeChatMessage("unknownQuery", "未知消息");
      break;
    default:
      console.log(`❌ 未知的测试类型: ${testType}`);
      console.log(
        "可用的测试类型: health, services, capabilities, config, stock, time, help, weather, unknown"
      );
      break;
  }
}

// 生成curl命令
function generateCurlCommands() {
  console.log("\n📋 生成的curl命令:\n");

  console.log("# 1. 健康检查");
  console.log("curl -X GET http://localhost:8080/health\n");

  console.log("# 2. 服务状态");
  console.log("curl -X GET http://localhost:8080/health/services\n");

  console.log("# 3. 服务能力");
  console.log("curl -X GET http://localhost:8080/capabilities\n");

  console.log("# 4. 管理员配置");
  console.log("curl -X GET http://localhost:8080/admin/config\n");

  console.log("# 5. 股票查询消息");
  console.log(`curl -X POST http://localhost:8080/wechat \\
  -H "Content-Type: application/xml" \\
  -d '${mockWeChatMessages.stockQuery.xml
    .replace(/\n/g, "")
    .replace(/\s+/g, " ")}'`);
  console.log("");

  console.log("# 6. 时间查询消息");
  console.log(`curl -X POST http://localhost:8080/wechat \\
  -H "Content-Type: application/xml" \\
  -d '${mockWeChatMessages.timeQuery.xml
    .replace(/\n/g, "")
    .replace(/\s+/g, " ")}'`);
  console.log("");
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🤖 微信机器人 API 测试工具

使用方法:
  node mock-api-test.js                    # 运行所有测试
  node mock-api-test.js [test-type]        # 运行指定测试
  node mock-api-test.js curl               # 生成curl命令

可用的测试类型:
  health       - 健康检查
  services     - 服务状态
  capabilities - 服务能力
  config       - 管理员配置
  stock        - 股票查询
  time         - 时间查询
  help         - 帮助查询
  weather      - 天气查询
  unknown      - 未知消息

示例:
  node mock-api-test.js stock              # 只测试股票查询
  node mock-api-test.js curl               # 生成curl命令
  `);
} else if (args[0] === "curl") {
  generateCurlCommands();
} else if (args[0] === "all") {
  runAllTests();
} else {
  runSingleTest(args[0]);
}
