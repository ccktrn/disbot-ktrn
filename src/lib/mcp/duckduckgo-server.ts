#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { search, SafeSearchType } from "duck-duck-scrape";

const server = new Server(
  {
    name: "duckduckgo-search",
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
        description: "Search the web using DuckDuckGo",
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
      const searchResults = await search(query, {
        safeSearch: SafeSearchType.MODERATE
      });

      // 上位5件の結果をフォーマットして返す
      const resultsText = searchResults.results
        .slice(0, 5) 
        .map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`)
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
  console.error("DuckDuckGo MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
