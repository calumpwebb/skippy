import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Config, Logger, ToolName, SearchableEntity } from '@skippy/shared';
import { HybridSearcher } from '@skippy/search';
import { toolRegistry } from './tools/registry';
import { Schema } from './utils/schema';
import { join } from 'node:path';

export interface ServerContext {
  config: Config;
  logger: Logger;
  dataDir: string;
  searcherCache: Map<string, HybridSearcher<SearchableEntity>>;
  schemaCache: Map<string, Schema>;
}

/** Creates and configures the MCP server. */
export function createServer(context: ServerContext): Server {
  const { logger } = context;

  const server = new Server(
    {
      name: 'arc-raiders-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing tools');
    return {
      tools: await toolRegistry.getToolDefinitionsWithSchemas(context.dataDir, context.schemaCache),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    const toolLogger = logger.child({ tool: name });
    toolLogger.info('Tool called');

    const handler = toolRegistry.getHandler(name as ToolName);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}. Available: ${Object.values(ToolName).join(', ')}`);
    }

    try {
      const result = await handler(args, context);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      toolLogger.error('Tool failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  });

  // List resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug('Listing resources');
    return {
      resources: [
        {
          uri: 'arc-raiders://glossary',
          name: 'Arc Raiders Glossary',
          description: 'Game terminology and definitions',
          mimeType: 'text/markdown',
        },
      ],
    };
  });

  // Read resource
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const { uri } = request.params;
    logger.info('Resource requested', { uri });

    // Normalize URI for comparison
    const normalizedUri = uri.toLowerCase().replace(/\/$/, '');

    if (normalizedUri === 'arc-raiders://glossary') {
      const glossaryPath = join(context.dataDir, 'glossary.md');
      const file = Bun.file(glossaryPath);

      if (!(await file.exists())) {
        throw new Error(`Glossary not found at ${glossaryPath}`);
      }

      const glossary = await file.text();
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: glossary }],
      };
    }

    throw new Error(`Unknown resource: ${uri}. Available: arc-raiders://glossary`);
  });

  return server;
}

/** Starts the MCP server with stdio transport. */
export async function startServer(
  context: ServerContext
): Promise<{ server: Server; shutdown: () => Promise<void> }> {
  const server = createServer(context);
  const transport = new StdioServerTransport();

  // Setup graceful shutdown
  const shutdown = async (): Promise<void> => {
    context.logger.info('Shutting down MCP server...');
    await server.close();
    context.logger.success('MCP server stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  context.logger.info('Starting MCP server...');
  await server.connect(transport);
  context.logger.success('MCP server running');

  return { server, shutdown };
}
