import type { IncomingMessage, ServerResponse } from 'node:http';
import { MoranteHubMcpServer } from '../src/mcp/server.js';
import { ALL_MCP_TOOLS } from '../src/mcp/tools/index.js';

type ApiRequest = IncomingMessage & {
  query: Record<string, string | string[] | undefined>;
  body?: any;
};

type ApiResponse = ServerResponse & {
  status(code: number): ApiResponse;
  json(body: unknown): void;
};

const mcpServer = new MoranteHubMcpServer();

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Configuração de CORS e Headers de Segurança
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-MCP-Client-Id, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Healthcheck e Especificação OpenAPI
  if (req.method === 'GET') {
    const isSpec = req.query.spec === 'true' || req.query.openapi === 'true';

    if (isSpec) {
      const host = req.headers.host || 'moveismorante.com.br';
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = `${proto}://${host}`;

      return res.status(200).json({
        openapi: '3.1.0',
        info: {
          title: 'MoranteHub Post Generation MCP API (Produção)',
          description: 'API Privada para geração de posts e consulta de produtos no MoranteHub.',
          version: '1.0.0',
        },
        servers: [{ url: baseUrl }],
        paths: Object.fromEntries(
          ALL_MCP_TOOLS.map(tool => [
            `/api/mcp?tool=${tool.name}`,
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
                  '200': { description: 'Sucesso' },
                  '401': { description: 'Não autorizado' },
                  '429': { description: 'Rate limit excedido' },
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
      });
    }

    return res.status(200).json({
      status: 'ok',
      service: 'morantehub-mcp',
      environment: 'production-serverless',
      mode: 'read-only',
    });
  }

  // 2. Execução de Tools (POST)
  if (req.method === 'POST') {
    const isMcpProtocolRequest = req.body?.jsonrpc === '2.0' && typeof req.body?.method === 'string';
    if (isMcpProtocolRequest) {
      const requestServer = new MoranteHubMcpServer();
      try {
        await requestServer.handleStreamableHttpRequest(
          req,
          res,
          req.body,
          req.headers.authorization,
          (req.headers['x-mcp-client-id'] as string) || undefined,
        );
        return;
      } catch (err: any) {
        if (!res.headersSent) {
          const status = err.statusCode || 500;
          return res.status(status).json({
            jsonrpc: '2.0',
            id: req.body?.id ?? null,
            error: {
              code: status === 401 ? -32001 : -32603,
              message: err.message || 'Erro ao processar requisição MCP.',
            },
          });
        }
        return;
      }
    }

    const toolName = (req.query.tool as string) || req.body?.toolName || req.body?.method?.replace('tools/', '');
    const authHeader = req.headers.authorization;
    const requestedClient = (req.headers['x-mcp-client-id'] as string) || undefined;
    const args = req.body?.arguments || req.body?.params?.arguments || req.body || {};

    if (!toolName) {
      return res.status(400).json({
        error: 'MISSING_TOOL_NAME',
        message: 'Informe a ferramenta desejada via query param (?tool=...) ou no corpo da requisição.',
      });
    }

    try {
      const result = await mcpServer.executeToolWithAuth(toolName, args, authHeader, requestedClient);
      return res.status(200).json(result.data);
    } catch (err: any) {
      const status = err.statusCode || (err.name === 'McpAuthError' ? 401 : err.code === 'RATE_LIMITED' ? 429 : 500);
      return res.status(status).json({
        error: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Erro ao processar requisição MCP.',
      });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
