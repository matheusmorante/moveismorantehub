import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MoranteHubMcpServer } from '../server.js';
import { mcpProductService } from '../services/mcpProductService.js';

describe('MCP Server Smoke Test (HTTP & Protocol)', () => {
  let server: MoranteHubMcpServer;
  let port: number;
  const TEST_TOKEN = 'smoke_test_master_token_1234567890';

  beforeAll(async () => {
    process.env.MORANTEHUB_MCP_ACCESS_TOKEN = TEST_TOKEN;
    process.env.MCP_ALLOWED_CLIENTS = 'internal,chatgpt,antigravity';
    server = new MoranteHubMcpServer();
    port = await server.startHttp(0); // Porta aleatória livre
  });

  afterAll(async () => {
    await server.stopHttp();
  });

  it('1. GET /health retorna 200 OK e status do serviço', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('morantehub-mcp');
    expect(body.mode).toBe('read-only');
  });

  it('2. GET /openapi.json retorna especificação OpenAPI válida com as 9 tools', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/openapi.json`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.openapi).toBe('3.1.0');
    expect(Object.keys(body.paths)).toHaveLength(9);
    expect(body.paths['/api/tools/get_post_generation_context']).toBeDefined();
  });

  it('3. POST /api/tools/search_products sem token retorna 401 Unauthorized', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/tools/search_products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Guarda-Roupa' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('4. POST /api/tools/search_products com Bearer Token executa e retorna produtos', async () => {
    vi.spyOn(mcpProductService, 'searchProducts').mockResolvedValueOnce([
      {
        id: 'smoke-1',
        name: 'Guarda-Roupa Monza',
        slug: 'guarda-roupa-monza',
        price: 999.9,
        active: true,
      },
    ]);

    const res = await fetch(`http://127.0.0.1:${port}/api/tools/search_products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({ query: 'Monza', limit: 5 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].name).toBe('Guarda-Roupa Monza');
  });
});
