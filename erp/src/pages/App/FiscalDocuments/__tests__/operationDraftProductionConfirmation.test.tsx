// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NfeOperationDraftModal from '../modals/NfeOperationDraftModal';
const mocks = vi.hoisted(() => ({ hook: vi.fn(), transmitOrReconcile: vi.fn() }));
vi.mock('../hooks/useNfeOperationDraft', () => ({ useNfeOperationDraft: mocks.hook }));
vi.mock('../components/NfeOperationDraftReview', () => ({ NfeOperationDraftReview: () => null }));
vi.mock('../components/NfeOperationDraftSetup', () => ({ NfeOperationDraftSetup: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('operation draft production action confirmation', () => {
  it.each([
    { status: 'unknown', retryAllowed: false, confirmed: false, environment: 1 as const, enabled: true },
    { status: 'transmitting', retryAllowed: false, confirmed: false, environment: 1 as const, enabled: true },
    { status: 'ready', retryAllowed: false, confirmed: false, environment: 1 as const, enabled: false },
    { status: 'unknown', retryAllowed: true, confirmed: false, environment: 1 as const, enabled: false },
    { status: 'ready', retryAllowed: true, confirmed: true, environment: 1 as const, enabled: true },
    { status: 'unknown', retryAllowed: true, confirmed: true, environment: 1 as const, enabled: true },
    { status: 'ready', retryAllowed: false, confirmed: false, environment: 2 as const, enabled: true },
  ])('status=$status retry=$retryAllowed confirmation=$confirmed environment=$environment enabled=$enabled', ({ status, retryAllowed, confirmed, environment, enabled }) => {
    mocks.hook.mockReturnValue({
      kind: 'estorno', returnOrders: [], reviewedLines: [], payload: { draft: { status } },
      review: {}, productionConfirmed: confirmed, retryAllowed,
      transmitting: false, savingReview: false, prepareDraft: vi.fn(), saveFiscalReview: vi.fn(),
      transmitOrReconcile: mocks.transmitOrReconcile,
    });
    render(<NfeOperationDraftModal sourceDocument={{
      id: 'source-1', order_id: 'order-1', modelo: '55', ambiente: environment,
      numero_nfe: 1, serie: '1', chave_acesso: '1'.repeat(44),
    }} onClose={vi.fn()} onAuthorized={vi.fn()} />);
    const action = screen.getByRole('button', { name: /Consultar situação na SEFAZ|Reenviar a mesma chave e XML|Transmitir NF-e revisada/ }) as HTMLButtonElement;
    expect(action.disabled).toBe(!enabled);
    fireEvent.click(action);
    expect(mocks.transmitOrReconcile).toHaveBeenCalledTimes(enabled ? 1 : 0);
  });
});
