import { describe, expect, it, vi } from 'vitest';
import type { AgentSupabaseClient } from '../ai-agent/agentProductMetadataOperations';
import {
  createProductForAgent,
  updateProductForAgent,
} from '../ai-agent/agentProductOperations';

describe('agentProductOperations — explicit projections and modular sync', () => {
  it('usa projeções explícitas sem select(*) ao criar e editar produto', async () => {
    const selectedColumns: string[] = [];
    const createdProduct = {
      id: 'prod-1',
      code: '000010',
      name: 'Mesa Cairo',
      unit_price: 900,
      price: 900,
      stock: 5,
      active: true,
      deleted: false,
    };

    const client = {
      from: (table: string) => ({
        select: (cols: string) => {
          selectedColumns.push(`${table}:${cols}`);
          const chain = {
            or: () => chain,
            eq: () => chain,
            order: () => chain,
            limit: () =>
              table === 'products' && cols === 'code, sku'
                ? Promise.resolve({ data: [{ code: '000009' }], error: null })
                : chain,
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  ...createdProduct,
                  product_variations: [{ id: 'var-1', sku: '000010-01', price: 900, stock: 5 }],
                },
                error: null,
              }),
          };
          return chain;
        },
        insert: (rows: Array<Record<string, unknown>>) => ({
          select: (cols: string) => {
            selectedColumns.push(`${table}:insert:${cols}`);
            return {
              single: () => Promise.resolve({ data: createdProduct, error: null }),
              maybeSingle: () =>
                Promise.resolve({ data: { id: 'var-1', ...rows[0] }, error: null }),
            };
          },
        }),
        update: () => ({
          eq: () => ({
            select: (cols: string) => {
              selectedColumns.push(`${table}:update:${cols}`);
              const res = {
                ...createdProduct,
                product_variations: [{ id: 'var-1', sku: '000010-01', price: 950, stock: 3 }],
              };
              return {
                single: () => Promise.resolve({ data: res, error: null }),
                maybeSingle: () => Promise.resolve({ data: res.product_variations[0], error: null }),
              };
            },
          }),
        }),
      }),
    } as unknown as AgentSupabaseClient;

    const created = await createProductForAgent(client, { nome: 'Mesa Cairo', precoVenda: 900 });
    expect(created.success).toBe(true);
    expect(created.data?.codigo).toBe('000010');

    const updated = await updateProductForAgent(client, {
      codigoOuSku: '000010',
      precoVenda: 950,
      estoque: 3,
    });
    expect(updated.success).toBe(true);
    expect(updated.data?.variacoes[0].preco).toBe(950);
    expect(selectedColumns.length).toBeGreaterThan(0);
    expect(selectedColumns.some((c) => c.includes('*'))).toBe(false);
  });

  it('registra aviso estruturado sem quebrar atualização quando sincronização de variação falha', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = {
      from: (table: string) => ({
        select: () => {
          const chain = {
            or: () => chain,
            eq: () => chain,
            limit: () => chain,
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: 'prod-2',
                  code: '000020',
                  name: 'Cadeira',
                  product_variations: [{ id: 'var-2', sku: '000020-01', price: 200, stock: 2 }],
                },
                error: null,
              }),
          };
          return chain;
        },
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'prod-2',
                    code: '000020',
                    name: 'Cadeira',
                    product_variations: [{ id: 'var-2', sku: '000020-01', price: 200, stock: 2 }],
                  },
                  error: null,
                }),
              maybeSingle: () => {
                if (table === 'product_variations') {
                  return Promise.reject(new Error('network glitch'));
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        }),
      }),
    } as unknown as AgentSupabaseClient;

    const res = await updateProductForAgent(client, { codigoOuSku: '000020', precoVenda: 250 });
    expect(res.success).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
