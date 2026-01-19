#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { z } from "zod";

// Initialize server
const server = new Server(
  {
    name: "npm-detective",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Constants
const API_BASE = "https://api.npms.io/v2";

// Helper to format scores
const formatScore = (val: number) => (val * 100).toFixed(0);

// Tool 1: Search Packages
async function searchPackages(query: string, size: number = 10) {
  try {
    const response = await axios.get(`${API_BASE}/search`, {
      params: { q: query, size },
    });

    const results = response.data.results.map((item: any) => {
      const pkg = item.package;
      const score = item.score;
      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        links: pkg.links,
        score: {
          final: formatScore(score.final),
          quality: formatScore(score.detail.quality),
          popularity: formatScore(score.detail.popularity),
          maintenance: formatScore(score.detail.maintenance),
        },
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error searching packages: ${error.message}`,
        },
      ],
    };
  }
}

// Tool 2: Get Package Metadata
async function getPackageMetadata(name: string) {
  // Validate package name (basic security against path traversal if this were a file system)
  if (!/^[a-zA-Z0-9@/._-]+$/.test(name)) {
    return {
      isError: true,
      content: [{ type: "text", text: "Invalid package name format." }],
    };
  }

  try {
    // Encoded name for scoped packages
    const encodedName = encodeURIComponent(name);
    const response = await axios.get(`${API_BASE}/package/${encodedName}`);
    const data = response.data;
    const pkg = data.collected.metadata;
    const score = data.score;

    const info = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      keywords: pkg.keywords || [],
      publisher: pkg.publisher,
      date: pkg.date,
      links: pkg.links,
      license: pkg.license,
      scores: {
        final: formatScore(score.final),
        quality: formatScore(score.detail.quality),
        popularity: formatScore(score.detail.popularity),
        maintenance: formatScore(score.detail.maintenance),
      },
      evaluation: {
        quality: data.evaluation.quality,
        popularity: data.evaluation.popularity,
        maintenance: data.evaluation.maintenance
      }
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        isError: true,
        content: [{ type: "text", text: `Package '${name}' not found.` }],
      };
    }
    return {
      isError: true,
      content: [{ type: "text", text: `Error fetching metadata: ${error.message}` }],
    };
  }
}

// Handler for listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_packages",
        description: "Search for NPM packages using npms.io API to find the best candidates based on quality, popularity and maintenance scores.",
        inputSchema: zodToJsonSchema(
          z.object({
            query: z.string().describe("Search query (e.g. 'react', 'validation', 'database')"),
            size: z.number().optional().describe("Number of results to return (default 10)"),
          })
        ),
      },
      {
        name: "get_package_metadata",
        description: "Get detailed metadata and scores for a specific NPM package.",
        inputSchema: zodToJsonSchema(
          z.object({
            name: z.string().describe("Exact name of the npm package (e.g. 'react', '@types/node')"),
          })
        ),
      },
    ],
  };
});

// Helper for Zod to JSON Schema
function zodToJsonSchema(schema: any) {
  // Use a simplified inline conversion or a library like zod-to-json-schema if strictly needed.
  // However, MCP SDK expects standard JSON schema.
  // For simplicity without adding another dependency, I'll manually construct it or rely on a simple helper.
  // Wait, I should add zod-to-json-schema to dependencies nicely?
  // Or just write the schema object manually?
  // The SDK documentation suggests standard JSON schema.
  // Let's implement a manual return for now to avoid complexity or write the schema object directly in the tool definition.
  // Actually, I'll just change the listTools handler to return raw JSON schema objects.
  return {
    type: "object",
    properties:
      schema._def.typeName === "ZodObject"
        ? Object.fromEntries(
          Object.entries(schema.shape).map(([key, val]: [string, any]) => [
            key,
            {
              type: val._def.typeName === "ZodNumber" ? "number" : "string",
              description: val.description
            }
          ])
        )
        : {},
    required: Object.keys(schema.shape).filter(k => !schema.shape[k].isOptional())
  };
}


// Redefining setRequestHandler because my helper above was too hacky.
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_packages",
        description: "Search for NPM packages using npms.io API to find the best candidates based on quality, popularity and maintenance scores.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query keywords"
            },
            size: {
              type: "number",
              description: "Number of results (default 10)"
            }
          },
          required: ["query"]
        },
      },
      {
        name: "get_package_metadata",
        description: "Get detailed metadata and scores for a specific NPM package.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The full package name"
            }
          },
          required: ["name"]
        },
      },
    ],
  };
});

// Handler for calling tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_packages") {
    const schema = z.object({
      query: z.string(),
      size: z.number().optional().default(10),
    });

    // basic validation
    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      throw new Error("Invalid arguments: " + parsed.error.message);
    }
    return searchPackages(parsed.data.query, parsed.data.size);
  }

  if (name === "get_package_metadata") {
    const schema = z.object({
      name: z.string()
    });
    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      throw new Error("Invalid arguments: " + parsed.error.message);
    }
    return getPackageMetadata(parsed.data.name);
  }

  throw new Error(`Tool not found: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NPM Detective MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
