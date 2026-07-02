#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "weather-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define weather code mappings for better readability
const getWeatherDescription = (code: number): string => {
  const weatherCodes: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
  };
  return weatherCodes[code] || "Unknown";
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_weather",
        description: "Get the current weather and daily forecast for a specific city or location using Open-Meteo API.",
        inputSchema: {
          type: "object",
          properties: {
            location: { type: "string", description: "The name of the city or region. Must be English (e.g., 'Tokyo', 'New York', 'London')" }
          },
          required: ["location"]
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_weather") {
    const location = request.params.arguments?.location as string;
    if (!location) throw new Error("location is required");

    try {
      // 1. Geocoding: Convert location name to latitude and longitude
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
      if (!geoResponse.ok) throw new Error("Failed to fetch location data");
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        return {
          content: [{ type: "text", text: `Could not find location coordinates for '${location}'.` }]
        };
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // 2. Fetch Weather Data
      const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
      if (!weatherResponse.ok) throw new Error("Failed to fetch weather data");
      const weatherData = await weatherResponse.json();

      const current = weatherData.current_weather;
      const daily = weatherData.daily;

      let resultText = `Weather forecast for ${name}, ${country}:\n\n`;
      resultText += `[Current Weather]\n`;
      resultText += `- Temperature: ${current.temperature}°C\n`;
      resultText += `- Condition: ${getWeatherDescription(current.weathercode)}\n`;
      resultText += `- Wind Speed: ${current.windspeed} km/h\n\n`;

      resultText += `[Upcoming Forecast]\n`;
      for (let i = 0; i < Math.min(3, daily.time.length); i++) {
        resultText += `- ${daily.time[i]}: ${getWeatherDescription(daily.weathercode[i])} (High: ${daily.temperature_2m_max[i]}°C, Low: ${daily.temperature_2m_min[i]}°C, Rain: ${daily.precipitation_sum[i]}mm)\n`;
      }

      return {
        content: [{ type: "text", text: resultText }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to retrieve weather data: ${error.message}` }],
        isError: true
      };
    }
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
