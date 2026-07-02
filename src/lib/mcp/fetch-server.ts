#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as cheerio from "cheerio";

const server = new Server(
  {
    name: "webreader-server",
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
        name: "read_page",
        description: "Accesses the specified URL and extracts the main text content (plain text), excluding ads and scripts. Use this when you need to read the detailed content of a URL found in search results.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL of the web page to read" }
          },
          required: ["url"]
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "read_page") {
    const url = request.params.arguments?.url as string;
    if (!url) throw new Error("url is required");

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 不要な要素を削除
      $("script, style, noscript, iframe, img, svg, nav, footer, header, aside").remove();

      // テキストを抽出して整形
      const text = $("body").text()
        .replace(/\\s+/g, " ") // 連続する空白を1つに
        .trim();

      // あまりにも長すぎる場合は最初の8000文字にカットする（LLMのコンテキスト上限回避）
      const truncatedText = text.length > 8000 ? text.substring(0, 8000) + "\\n...[テキストが長いため省略されました]" : text;

      return {
        content: [{ type: "text", text: truncatedText }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to read URL: ${error.message}` }],
        isError: true
      };
    }
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("WebReader MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
