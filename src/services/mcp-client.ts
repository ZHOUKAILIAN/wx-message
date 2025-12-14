import axios from "axios";
import { EventEmitter } from "events";

interface MCPRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema?: any;
}

export class MCPClient extends EventEmitter {
  private mcpUrl: string;
  private isConnected: boolean = false;
  private pendingRequests: Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private requestId: number = 1;

  constructor(mcpUrl: string) {
    super();
    this.mcpUrl = mcpUrl;
  }

  // 建立SSE连接并监听响应
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log("🔗 建立MCP SSE连接...");

      // 建立SSE连接
      const response = await axios.get(`${this.mcpUrl}/mcp`, {
        responseType: "stream",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });

      this.isConnected = true;
      console.log("✅ MCP SSE连接已建立");

      // 监听SSE数据流
      let buffer = "";

      response.data.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();

        // 处理SSE格式的数据
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // 保留最后一行可能不完整的数据

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (trimmedLine.startsWith("data: ")) {
            const data = trimmedLine.substring(6).trim();
            if (data) {
              this.handleSSEData(data);
            }
          }
        }
      });

      response.data.on("error", (error: any) => {
        console.error("SSE连接错误:", error);
        this.isConnected = false;
        this.emit("error", error);
      });

      response.data.on("close", () => {
        console.log("🔌 MCP SSE连接已关闭");
        this.isConnected = false;
        this.emit("disconnect");
      });
    } catch (error) {
      console.error("❌ 建立MCP SSE连接失败:", error);
      throw error;
    }
  }

  // 处理SSE数据
  private handleSSEData(data: string): void {
    try {
      // 提取sessionId
      if (data.includes("sessionId")) {
        const sessionIdMatch = data.match(/sessionId=([^&\s]+)/);
        if (sessionIdMatch) {
          this.sessionId = sessionIdMatch[1];
          console.log("🔑 提取到sessionId:", this.sessionId);
        }
        console.log("⏭️ 跳过sessionId响应");
        return;
      }

      // 跳过HTML响应
      if (data.includes("<html>") || data.includes("</html>")) {
        console.log("⏭️ 跳过HTML响应");
        return;
      }

      // 尝试解析JSON数据
      const response = JSON.parse(data) as MCPResponse;

      // 处理pending请求
      if (response && response.id && this.pendingRequests.has(response.id)) {
        const { resolve, reject, timeout } = this.pendingRequests.get(
          response.id
        )!;

        // 清除超时
        clearTimeout(timeout);
        this.pendingRequests.delete(response.id);

        // 处理响应
        if (response.error) {
          reject(new Error(response.error.message));
        } else if (response.result) {
          resolve(response.result);
        } else {
          reject(new Error("无效的MCP响应"));
        }
      }
    } catch (error) {
      console.error("解析SSE数据失败:", error);
      console.error("原始数据:", data);
      // 不要抛出错误，继续处理下一个数据
    }
  }

  private sessionId: string = "";

  private async sendRpc(method: string, params?: any): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise(async (resolve, reject) => {
      const id = this.requestId++;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("MCP请求超时"));
      }, 15000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        let postUrl = `${this.mcpUrl}/mcp-messages`;
        if (this.sessionId) {
          postUrl += `?sessionId=${this.sessionId}`;
        }

        const payload: MCPRequest = {
          jsonrpc: "2.0",
          id,
          method,
          params,
        };

        console.log(`🔧 发送MCP请求: ${method}`, params);

        await axios.post(postUrl, payload, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });

        console.log("📤 MCP请求已发送，等待SSE响应...");
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  // 调用MCP工具
  async callTool(toolName: string, args: any = {}): Promise<any> {
    return this.sendRpc("tools/call", {
      name: toolName,
      arguments: args,
    });
  }

  // 列出MCP工具
  async listTools(): Promise<MCPToolDefinition[]> {
    const result = await this.sendRpc("tools/list");
    const tools = result?.tools;
    if (!Array.isArray(tools)) {
      return [];
    }

    return tools
      .filter((t: any) => t && typeof t.name === "string")
      .map((t: any) => ({
        name: String(t.name),
        description:
          typeof t.description === "string" ? t.description : undefined,
        inputSchema: t.inputSchema,
      }));
  }

  // 获取天气信息
  async getWeather(cityName: string = "杭州市"): Promise<any> {
    try {
      const result = await this.callTool("get-weather", { cityName });
      return result;
    } catch (error) {
      console.error("获取天气信息失败:", error);
      throw error;
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.isConnected) {
      // 清理所有pending请求
      for (const [id, { reject, timeout }] of this.pendingRequests) {
        clearTimeout(timeout);
        reject(new Error("连接已断开"));
      }
      this.pendingRequests.clear();

      this.isConnected = false;
      this.emit("disconnect");
    }
  }

  // 检查连接状态
  isSessionActive(): boolean {
    return this.isConnected;
  }
}
