import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';

describe.skipIf(process.env.SALE_STOCK_OWNED_PHASE !== 'guard-readonly')('conferência da guarda de estoque', () => {
  it('executa a conciliação vazia na venda de teste cancelada sem mudar seus dados', async () => {
    const fixture = JSON.parse(readFileSync(resolve(process.cwd(), '../tmp/sale-stock-owned-fixture.json'), 'utf8'));
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    const url = process.env.VITE_SUPABASE_URL;
    const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (fixture.phase !== 'cancelled' || !email || !password || !url || !service) throw new Error('Pré-requisitos ausentes.');
    const login = await supabase.auth.signInWithPassword({ email, password });
    if (login.error || login.data.user?.id !== fixture.ownerId) throw new Error('Operador diferente do dono.');
    const admin = await supabase.rpc('is_administrator');
    if (admin.error || admin.data !== true) throw new Error('Operador não é administrador.');
    const readState = async () => {
      const order = await supabase.from('orders').select('*').eq('id', fixture.orderId).single();
      if (order.error || !order.data) throw new Error('Venda de teste ausente.');
      const identity = await supabase.rpc('test_artifact_row_data', { p_table: 'orders', p_row: order.data });
      if (identity.error || identity.data?.runId !== fixture.runId || identity.data?.ownerId !== fixture.ownerId || identity.data?.is_test !== true)
        throw new Error('Propriedade da venda não comprovada.');
      expect(order.data.status).toBe('cancelled');
      const moves = await supabase.from('inventory_moves').select('*').eq('order_id', fixture.orderId);
      if (moves.error) throw moves.error;
      for (const move of moves.data || []) {
        const owner = await supabase.rpc('test_artifact_row_data', { p_table: 'inventory_moves', p_row: move });
        expect(owner.data?.runId).toBe(fixture.runId);
        expect(owner.data?.ownerId).toBe(fixture.ownerId);
        expect(move.status).toBe('reversed');
      }
      return { order: order.data, moves: (moves.data || []).sort((a: any, b: any) => a.id.localeCompare(b.id)) };
    };
    const before = await readState();
    const headers: Record<string, string> = { apikey: service, 'content-type': 'application/json' };
    if (service.startsWith('eyJ')) headers.authorization = `Bearer ${service}`;
    for (const fresh of [false, true]) {
      const response = await fetch(new URL('/rest/v1/rpc/reconcile_sale_order_stock_lines', url), {
        method: 'POST', headers, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ p_order_id: fixture.orderId, p_order_code: 'teste',
          p_previous_items: [], p_current_items: [], p_previous_lineage: null, p_fresh: fresh }),
      });
      if (!response.ok) throw new Error('Conciliação vazia de teste não pôde ser verificada.');
      expect(await response.json()).toEqual({ items: [], hasStock: false, lineage: { version: 1, lines: [] } });
    }
    expect(await readState()).toEqual(before);
    await supabase.auth.signOut();
  });
});
