import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { randomBytes } from "crypto";

export class McpManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();

  async connectServer(name: string, command: string, args: string[], env?: Record<string, string>) {
    console.log(`[MCP] Connecting to server ${name}...`);
    
    // undefinedを除外して型を合わせる
    const safeEnv = { ...process.env, ...env };
    const validEnv: Record<string, string> = {};
    for (const key in safeEnv) {
      if (safeEnv[key] !== undefined) {
        validEnv[key] = safeEnv[key] as string;
      }
    }

    const transport = new StdioClientTransport({
      command,
      args,
      env: validEnv
    });

    const client = new Client(
      { name: `disbot-client-${name}`, version: "1.0.0" },
      { capabilities: {} } // クライアント側なのでtoolsは不要
    );

    await client.connect(transport);
    this.clients.set(name, client);
    this.transports.set(name, transport);
    console.log(`[MCP] Connected to server: ${name}`);
  }

  async getAllTools() {
    const allTools: Array<{ serverName: string; tool: any }> = [];
    for (const [serverName, client] of this.clients.entries()) {
      try {
        const response: any = await client.request({ method: "tools/list" }, ListToolsResultSchema);
        if (response && response.tools) {
          for (const tool of response.tools) {
            allTools.push({
              serverName,
              tool
            });
          }
        }
      } catch (err) {
        console.error(`[MCP] Failed to get tools from ${serverName}:`, err);
      }
    }
    return allTools;
  }

  async callTool(serverName: string, toolName: string, args: any) {
    const callId = randomBytes(8).toString("hex");
    console.log(`[MCP-${callId}] Calling tool ${toolName} on server ${serverName} with args:`, args);

    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP Server ${serverName} not found`);
    try {
      const result: any = await client.request(
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        },
        CallToolResultSchema
      );
      console.log(`[MCP-${callId}] Tool called successfully`);
      return result;
    } catch (err) {
      console.error(`[MCP-${callId}] Error calling tool:`, err);
      throw err;
    }
  }

  async closeAll() {
    for (const [name, transport] of this.transports.entries()) {
      try {
        await transport.close();
        console.log(`[MCP] Closed server: ${name}`);
      } catch (err) {
        console.error(`[MCP] Error closing server ${name}:`, err);
      }
    }
  }
}

export const mcpManager = new McpManager();
