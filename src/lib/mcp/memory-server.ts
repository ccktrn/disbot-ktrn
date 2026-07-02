#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MemoryRepository } from "../../repositories/memory-repository";

const memoryRepo = new MemoryRepository();

const server = new Server(
  {
    name: "memory-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_memory",
        description: "Retrieves past memories (profiles, preferences, etc.) for a Discord user. You must specify the User ID attached to the incoming message.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "Discord User ID" }
          },
          required: ["user_id"]
        }
      },
      {
        name: "save_memory",
        description: "Saves information about a Discord user (name, preferences, rules, etc.) as a memory. This OVERWRITES the previous memory, so if you want to keep existing memories, you MUST fetch them first and merge them before saving.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "Discord User ID" },
            memory: { 
              type: "object", 
              description: "JSON object containing the memory data (free-form key-value pairs)",
              additionalProperties: true
            }
          },
          required: ["user_id", "memory"]
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_memory") {
    const user_id = request.params.arguments?.user_id as string;
    if (!user_id) throw new Error("user_id is required");
    
    const memory = memoryRepo.getMemory(user_id);
    return {
      content: [{ type: "text", text: JSON.stringify(memory, null, 2) }]
    };
  }

  if (request.params.name === "save_memory") {
    const user_id = request.params.arguments?.user_id as string;
    const memory = request.params.arguments?.memory as any;
    if (!user_id) throw new Error("user_id is required");
    if (!memory) throw new Error("memory is required");
    
    memoryRepo.updateMemory(user_id, memory);
    return {
      content: [{ type: "text", text: "Successfully saved memory for user." }]
    };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
