import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

// Explicit opt-in. Real RPCs only, no SEFAZ transmission or operational fixtures.
describe.skipIf(process.env.RUN_FISCAL_RPC_INTEGRATION !== '1')(
  'active fiscal reservation / PostgreSQL',
  () => {
    it('serializes distinct concurrent intentions and resumes the winning reservation without another number', async () => {
      config({
        path: fileURLToPath(new URL('../../../../../../.env.local', import.meta.url)),
        quiet: true,
      });
      const url = process.env.VITE_SUPABASE_URL || '';
      expect(new URL(url).hostname).toBe('hkoxhourxwlddgsfdgws.supabase.co');
      const db = createClient(url, process.env.SUPABASE_SECRET_KEY || '', {
        auth: { persistSession: false },
      });
      const testRunId = `TEST_AUT_${randomUUID()}`;
      // Reuse only a series whose fiscal facts belong exclusively to synthetic tests.
      let series: string | undefined;
      for (const candidate of ['885', '886', '887', '888', '889']) {
        const [snapshots, documents] = await Promise.all([
          db
            .from('nfe_fiscal_snapshots')
            .select('id')
            .eq('requested_model', '55')
            .eq('environment', 2)
            .eq('series', candidate)
            .not('order_id', 'like', 'TEST_AUT_%')
            .limit(1),
          db
            .from('nfe_documents')
            .select('id')
            .eq('modelo', '55')
            .eq('ambiente', 2)
            .eq('serie', candidate)
            .or('order_id.is.null,order_id.not.like.TEST_AUT_%')
            .limit(1),
        ]);
        expect(snapshots.error).toBeNull();
        expect(documents.error).toBeNull();
        if (!snapshots.data?.length && !documents.data?.length) {
          series = candidate;
          break;
        }
      }
      if (!series)
        throw new Error(
          'No isolated HML test series available; do not advance operational numbering.'
        );
      const { error: orderError } = await db.from('orders').insert({
        id: testRunId,
        order_type: 'sale',
        status: 'draft',
        deleted: true,
        order_data: {
          id: testRunId,
          testRunId,
          fiscalScenario: 'HML_TECHNICAL_V1',
          status: 'draft',
          deleted: true,
          payments: [],
          items: [],
        },
      });
      expect(orderError).toBeNull();
      const base = {
        p_order_id: testRunId,
        p_modelo: '55',
        p_ambiente: 2,
        p_serie: series,
        p_numero_minimo: 1,
        p_item_csosn_overrides: {},
        p_item_fiscal_selections: {},
      };
      const requests = [randomUUID(), randomUUID()];
      const results = await Promise.all(
        requests.map((id) =>
          db.rpc('prepare_nfe_fiscal_snapshot', {
            ...base,
            p_emission_request_id: id,
          })
        )
      );
      const winner = results.findIndex((r) => !r.error);
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(results.filter((r) => !r.error)).toHaveLength(1);
      expect(results[1 - winner].error).toMatchObject({
        code: '23505',
        message: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
      });
      const reservation = results[winner].data;
      const { data: snapshots, error: snapshotError } = await db
        .from('nfe_fiscal_snapshots')
        .select('id,order_id,emission_request_id,reserved_number')
        .eq('order_id', testRunId)
        .eq('environment', 2)
        .limit(2);
      expect(snapshotError).toBeNull();
      expect(snapshots).toHaveLength(1);
      expect(snapshots?.[0]).toMatchObject({
        id: reservation.snapshotId,
        emission_request_id: requests[winner],
        reserved_number: reservation.number,
      });
      const resumed = await db.rpc('prepare_nfe_fiscal_snapshot', {
        ...base,
        p_emission_request_id: requests[winner],
      });
      expect(resumed.error).toBeNull();
      expect(resumed.data).toEqual(reservation);
      const invalid = await db.rpc('prepare_nfe_fiscal_snapshot', {
        ...base,
        p_emission_request_id: requests[winner],
        p_serie: '1',
      });
      expect(invalid.error).toMatchObject({ code: '23505', message: 'IDEMPOTENCY_KEY_REUSED' });
      const { data: finalSequence, error: finalError } = await db
        .from('nfe_sequences')
        .select('ultimo_numero')
        .eq('modelo', '55')
        .eq('ambiente', 2)
        .eq('serie', series)
        .single();
      expect(finalError).toBeNull();
      expect(finalSequence?.ultimo_numero).toBe(reservation.number);
      const { data: documents, error: documentsError } = await db
        .from('nfe_documents')
        .select('id')
        .eq('order_id', testRunId)
        .eq('ambiente', 2)
        .limit(2);
      expect(documentsError).toBeNull();
      expect(documents).toHaveLength(0);
      const { data: fixture, error: fixtureError } = await db
        .from('orders')
        .select('status,deleted,order_data->payments')
        .eq('id', testRunId)
        .single();
      expect(fixtureError).toBeNull();
      expect(fixture).toMatchObject({ status: 'draft', deleted: true, payments: [] });
      // Already soft-deleted from creation. Preserve the reserved fiscal fact and its lineage.
      console.info(
        JSON.stringify({
          projectRef: 'hkoxhourxwlddgsfdgws',
          testRunId,
          series,
          snapshotId: reservation.snapshotId,
          number: reservation.number,
          result: 'PASS',
          sefazContacted: false,
        })
      );
    }, 30_000);
  }
);
