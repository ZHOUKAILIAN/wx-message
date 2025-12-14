import {
  BaseService,
  ServiceCapability,
  ServiceParameter,
  ServiceRequest,
  ServiceResponse,
} from "./service-interface";
import type { MCPClient, MCPToolDefinition } from "./mcp-client";

function mapJsonSchemaTypeToParamType(
  schemaType: any
): ServiceParameter["type"] {
  if (
    schemaType === "string" ||
    schemaType === "number" ||
    schemaType === "boolean" ||
    schemaType === "array" ||
    schemaType === "object"
  ) {
    return schemaType;
  }
  if (Array.isArray(schemaType)) {
    const first = schemaType.find((t) => typeof t === "string" && t !== "null");
    return mapJsonSchemaTypeToParamType(first || "string");
  }
  return "string";
}

function schemaToParameters(inputSchema: any): ServiceParameter[] {
  const schema =
    inputSchema && typeof inputSchema === "object" ? inputSchema : null;
  const properties =
    schema?.properties && typeof schema.properties === "object"
      ? schema.properties
      : {};
  const required: string[] = Array.isArray(schema?.required)
    ? schema.required
    : [];

  return Object.entries(properties).map(([name, propSchema]) => {
    const prop =
      propSchema && typeof propSchema === "object" ? (propSchema as any) : {};
    return {
      name,
      type: mapJsonSchemaTypeToParamType(prop.type),
      required: required.includes(name),
      description:
        typeof prop.description === "string" ? prop.description : "参数",
      defaultValue: prop.default,
    } as ServiceParameter;
  });
}

export class MCPToolService extends BaseService {
  readonly name: string;
  readonly capabilities: ServiceCapability[];

  constructor(private mcpClient: MCPClient, private tool: MCPToolDefinition) {
    super();

    this.name = tool.name;

    this.capabilities = [
      {
        name: tool.name,
        description: tool.description || `调用 MCP 工具: ${tool.name}`,
        keywords: [tool.name],
        examples: [tool.name],
        parameters: schemaToParameters(tool.inputSchema),
      },
    ];
  }

  canHandle(_request: ServiceRequest): boolean {
    // 现在由大模型统一路由，不再做本地关键词匹配
    return false;
  }

  async handle(request: ServiceRequest): Promise<ServiceResponse> {
    try {
      const args = request.parameters || {};
      const result = await this.mcpClient.callTool(this.tool.name, args);

      // MCP 常见返回：{ content: [{ type: 'text', text: '...' }] }
      const text = result?.content?.[0]?.text;
      if (typeof text === "string" && text.trim()) {
        return {
          success: true,
          content: text,
          data: result,
        };
      }

      return {
        success: true,
        content: JSON.stringify(result),
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        content: "❌ MCP 工具调用失败，请稍后重试",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getHelp(): string {
    const cap = this.capabilities[0];
    return `🔧 MCP 工具: ${cap.name}\n\n${cap.description}`;
  }

  async healthCheck(): Promise<boolean> {
    return this.mcpClient.isSessionActive();
  }
}
