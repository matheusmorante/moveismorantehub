import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { FiscalDatabase } from '../../../../../../api/nfe/fiscalDatabaseTypes';
import type { FiscalSnapshotCandidate } from '../../../../../../api/nfe/fiscalSnapshot';
import { loadNormalSaleInputs } from '../../../../../../api/nfe/normal-sale/inputLoader';
import {
  normalSaleContributionSettingsId,
  resolveNormalSaleContribution,
} from '../../../../../../api/nfe/simplesNormalSaleContribution';

const contribution = () => ({
  scope: { models: ['55', '65'], operation: 'normal_sale', issuerCrt: '1' },
  pis: { cst: '99', base: 0, rate: 0, value: 0 },
  cofins: { cst: '99', base: 0, rate: 0, value: 0 },
  confirmedAt: '2026-09-01T00:00:00Z',
  confirmedBy: 'TEST_UNIT_SHARED_DECISION',
});

const facts = (): FiscalSnapshotCandidate => ({
  schemaVersion: 1,
  capturedAt: '2026-09-30T13:00:00Z',
  order: {
    id: 'TEST_UNIT_INPUTS',
    type: 'sale',
    status: 'fulfilled',
    version: 1,
    updatedAt: '2026-09-30T12:00:00Z',
    data: {
      items: [{ quantity: 1, description: 'TEST_UNIT', unitPrice: 1 }],
      customerData: { id: 'TEST_UNIT_CUSTOMER' },
    },
  },
  issuerProfile: { companyCRT: '1', companyUF: 'PR' },
  emissionRequest: {
    id: 'e1eefc8b-37fe-444c-bb2d-8b77dc0a84d1',
    environment: 2,
    itemFiscalSelections: {
      '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '102' },
    },
  },
});

function database(includeDecision: boolean) {
  const requestedSettings = vi.fn();
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          error: null,
          data: {
            id: 'TEST_UNIT_CUSTOMER',
            full_name: 'TEST_UNIT',
            cpf_cnpj: null,
            address: null,
            rg_ie: null,
            person_type_pf_pj: 'PF',
            deleted: false,
          },
        })),
      })),
      in: vi.fn(async (_field: string, ids: string[]) => {
        if (table === 'settings') {
          requestedSettings(ids);
          return {
            error: null,
            data: includeDecision
              ? [{ id: normalSaleContributionSettingsId(), data: contribution() }]
              : [],
          };
        }
        return {
          error: null,
          data:
            table === 'ncms'
              ? [
                  {
                    code: '94036000',
                    active: true,
                    is_active: true,
                    start_date: null,
                    end_date: null,
                  },
                ]
              : [],
        };
      }),
    })),
  }));
  return { db: { from } as unknown as SupabaseClient<FiscalDatabase>, requestedSettings };
}

describe('carregamento da decisão de venda normal', () => {
  it('busca uma decisão compartilhada e valida separadamente os dois modelos', async () => {
    const { db, requestedSettings } = database(true);
    const candidate = facts();
    await loadNormalSaleInputs(db, candidate, { fiscalDefaults: { pisCst: '99' } });
    expect(requestedSettings).toHaveBeenCalledWith([
      normalSaleContributionSettingsId(),
    ]);
    expect(resolveNormalSaleContribution(candidate.fiscalInputs!, '55').confirmedBy).toBe(
      'TEST_UNIT_SHARED_DECISION'
    );
    expect(resolveNormalSaleContribution(candidate.fiscalInputs!, '65').confirmedBy).toBe(
      'TEST_UNIT_SHARED_DECISION'
    );
  });
  it('bloqueia ambos os modelos quando falta a decisão compartilhada', async () => {
    const { db } = database(false);
    const candidate = facts();
    await loadNormalSaleInputs(db, candidate, {});
    for (const model of ['55', '65'] as const) {
      expect(() => resolveNormalSaleContribution(candidate.fiscalInputs!, model)).toThrow(
        'CONTRIBUTION_MODEL_SCOPE_REQUIRED'
      );
    }
  });
});
