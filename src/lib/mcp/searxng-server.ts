#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "searxng-search",
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
        name: "search_web",
        description: "Search the web across multiple engines using local SearXNG.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g. 'latest news in tech')",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "search_web") {
    const query = request.params.arguments?.query as string;
    if (!query) {
      throw new Error("Query is required");
    }

    try {
      // 検索エンジンを絞りたい場合は、ここで google,duckduckgo,bing,wikipedia のように指定します
      const engines = ["wikipedia", "google", "bing"];
      
      // ローカルのSearXNGコンテナにアクセス（bot対策エラー回避のためヘッダーを付与）
      const response = await fetch(`http://searxng:8080/search?q=${encodeURIComponent(query)}&format=json&engines=${engines.join(",")}`, {
        headers: {
          "X-Forwarded-For": "127.0.0.1",
          "X-Real-IP": "127.0.0.1"
        }
      });
      if (!response.ok) {
        throw new Error(`SearXNG returned ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.results || [];

      // 上位5件の結果をフォーマットして返す
      const resultsText = results
        .slice(0, 5) 
        .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: resultsText || "No results found.",
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Search error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SearXNG MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
