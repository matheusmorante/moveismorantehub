import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { validateMcpAuth, McpAuthError } from './auth.js';
import { checkRateLimit, McpRateLimitError } from './middleware/mcpRateLimit.js';
import { recordAuditLog } from './middleware/mcpAudit.js';
import { ALL_MCP_TOOLS, getMcpToolByName } from './tools/index.js';
import { McpClientAuth } from './types/mcp.js';

export class MoranteHubMcpServer {
  private readonly server: Server;
  private httpServer: http.Server | null = null;
  private remoteAuthContext: { authHeader?: string; requestedClient?: string } | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'morantehub-post-generation-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 1. Listagem de Tools (100% Read-Only)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ALL_MCP_TOOLS.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object',
            properties: (tool.inputSchema as any).shape
              ? Object.fromEntries(
                  Object.entries((tool.inputSchema as any).shape).map(([k, v]: [string, any]) => [
                    k,
                    {
                      type: v._def?.typeName === 'ZodNumber' ? 'number' : 'string',
                      description: v.description || k,
                    },
                  ]),
                )
              : {},
          },
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
        })),
      };
    });

    // 2. Execução de Tools
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const toolName = request.params.name;
      const tool = getMcpToolByName(toolName);

      if (!tool) {
        throw new Error(`Tool "${toolName}" não reconhecida no servidor MCP.`);
      }

      const start = Date.now();
      try {
        const result = this.remoteAuthContext
          ? (
              await this.executeToolWithAuth(
                toolName,
                request.params.arguments || {},
                this.remoteAuthContext.authHeader,
                this.remoteAuthContext.requestedClient,
              )
            ).data
          : await tool.handler(request.params.arguments || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        throw new Error(`Erro ao executar ${toolName}: ${err?.message || String(err)}`);
      }
    });
  }

  /**
   * Inicia o servidor no modo Stdio (para Antigravity IDE / Cursor / CLI).
   */
  async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Servidor MCP MoranteHub iniciado via Stdio (Read-Only).');
  }

  /**
   * Processa uma requisição MCP Streamable HTTP real.
   *
   * O modo stateless é intencional para ambientes serverless como a Vercel:
   * cada POST carrega todo o contexto necessário e não depende da afinidade
   * entre instâncias. A autenticação é validada também no handshake initialize.
   */
  async handleStreamableHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    parsedBody: unknown,
    authHeader?: string,
    requestedClient?: string,
  ): Promise<void> {
    validateMcpAuth(authHeader, requestedClient);
    this.remoteAuthContext = { authHeader, requestedClient };

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    try {
      await this.server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } finally {
      this.remoteAuthContext = null;
      await transport.close();
    }
  }

  /**
   * Executa uma tool diretamente com autenticação e auditoria completas.
   */
  async executeToolWithAuth(
    toolName: string,
    params: unknown,
    authHeader?: string,
    requestedClient?: string,
  ): Promise<{ data: any; auth: McpClientAuth; durationMs: number }> {
    const start = Date.now();
    let auth: McpClientAuth;

    try {
      auth = validateMcpAuth(authHeader, requestedClient);
    } catch (err: any) {
      recordAuditLog({
        tool: toolName,
        clientId: requestedClient || 'unknown',
        status: 'UNAUTHORIZED',
        durationMs: Date.now() - start,
        errorMessage: err.message,
      });
      throw err;
    }

    try {
      checkRateLimit(auth.clientId);
    } catch (err: any) {
      recordAuditLog({
        tool: toolName,
        clientId: auth.clientId,
        status: 'RATE_LIMITED',
        durationMs: Date.now() - start,
        errorMessage: err.message,
      });
      throw err;
    }

    const tool = getMcpToolByName(toolName);
    if (!tool) {
      const err = new Error(`Tool "${toolName}" não encontrada no MCP.`);
      recordAuditLog({
        tool: toolName,
        clientId: auth.clientId,
        status: 'ERROR',
        durationMs: Date.now() - start,
        errorMessage: err.message,
      });
      throw err;
    }

    try {
      const data = await tool.handler(params);
      const durationMs = Date.now() - start;

      const pId = (params as any)?.productId;
      const cId = (params as any)?.campaign || (params as any)?.campaignId;

      recordAuditLog({
        tool: toolName,
        clientId: auth.clientId,
        productId: typeof pId === 'string' ? pId : null,
        campaign: typeof cId === 'string' ? cId : null,
        status: 'SUCCESS',
        durationMs,
      });

      return { data, auth, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      recordAuditLog({
        tool: toolName,
        clientId: auth.clientId,
        status: 'ERROR',
        durationMs,
        errorMessage: err.message || String(err),
      });
      throw err;
    }
  }

  /**
   * Inicia o servidor HTTP/HTTPS privado para ChatGPT e Antigravity.
   */
  startHttp(port = Number(process.env.MCP_PORT) || 3333): Promise<number> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        // Headers de CORS e Segurança
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Client-Id');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // 1. Health Check
        if (pathname === '/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'morantehub-mcp', mode: 'read-only' }));
          return;
        }

        // 2. OpenAPI Schema (para Custom GPTs / ChatGPT Actions)
        if (pathname === '/openapi.json' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.generateOpenApiSpec()));
          return;
        }

        // 3. Execução REST Direta de Tool
        if (pathname.startsWith('/api/tools/') && req.method === 'POST') {
          const toolName = pathname.replace('/api/tools/', '').trim();
          const authHeader = req.headers.authorization;
          const requestedClient = (req.headers['x-mcp-client-id'] as string) || undefined;

          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              let parsedBody = {};
              if (body) {
                try {
                  parsedBody = JSON.parse(body);
                } catch {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'INVALID_JSON_PAYLOAD' }));
                  return;
                }
              }

              const result = await this.executeToolWithAuth(toolName, parsedBody, authHeader, requestedClient);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result.data));
            } catch (err: any) {
              const status = err.statusCode || (err instanceof McpAuthError ? err.statusCode : err instanceof McpRateLimitError ? 429 : 500);
              res.writeHead(status, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: err.code || 'INTERNAL_ERROR',
                  message: err.message || 'Ocorreu um erro ao processar a requisição.',
                }),
              );
            }
          });
          return;
        }

        // 4. Endpoint MCP Streamable HTTP (ChatGPT e demais clientes remotos)
        if (pathname === '/mcp' && req.method === 'POST') {
          const authHeader = req.headers.authorization;
          const requestedClient = (req.headers['x-mcp-client-id'] as string) || undefined;

          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const rpcRequest = body ? JSON.parse(body) : {};
              const requestServer = new MoranteHubMcpServer();
              await requestServer.handleStreamableHttpRequest(
                req,
                res,
                rpcRequest,
                authHeader,
                requestedClient,
              );
            } catch (err: any) {
              if (!res.headersSent) {
                const status = err.statusCode || (err instanceof SyntaxError ? 400 : 500);
                res.writeHead(status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id: null,
                  error: {
                    code: status === 401 ? -32001 : -32603,
                    message: err.message || 'Erro ao processar requisição MCP.',
                  },
                }));
              }
            }
          });
          return;
        }

        // 5. Endpoint de distribuição DF-e SEFAZ (mTLS Proxy Seguro Node.js)
        if ((pathname === '/api/nfe/dist-dfe' || pathname === '/api/sefaz/dist-dfe') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const parsedBody = body ? JSON.parse(body) : {};
              const mockReq: any = {
                method: 'POST',
                headers: req.headers,
                body: parsedBody,
              };
              const mockRes: any = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => {
                  res.statusCode = code;
                  return mockRes;
                },
                json: (data: any) => {
                  res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(data));
                },
                end: () => res.end(),
              };

              const distDfeModule = await import('../../api/nfe/dist-dfe.js');
              await distDfeModule.default(mockReq, mockRes);
            } catch (err: any) {
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
              }
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND' }));
      });

      this.httpServer.listen(port, '0.0.0.0', () => {
        const addr = this.httpServer?.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        if (process.env.NODE_ENV !== 'test') {
          console.log(`[MCP Server] Servidor MCP Privado do MoranteHub rodando na porta ${actualPort}`);
        }
        resolve(actualPort);
      });

      this.httpServer.on('error', reject);
    });
  }

  stopHttp(): Promise<void> {
    return new Promise(resolve => {
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private generateOpenApiSpec() {
    return {
      openapi: '3.1.0',
      info: {
        title: 'MoranteHub Post Generation MCP API',
        description: 'API Privada somente-leitura para geração de posts e consulta de produtos no MoranteHub.',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${process.env.MCP_PORT || 3333}` }],
      paths: Object.fromEntries(
        ALL_MCP_TOOLS.map(tool => [
          `/api/tools/${tool.name}`,
          {
            post: {
              summary: tool.description,
              operationId: tool.name,
              security: [{ BearerAuth: [] }],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                },
              },
              responses: {
                '200': { description: 'Sucesso', content: { 'application/json': {} } },
                '401': { description: 'Não autorizado' },
                '429': { description: 'Rate Limit excedido' },
              },
            },
          },
        ]),
      ),
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT / Secret Token',
          },
        },
      },
    };
  }
}
