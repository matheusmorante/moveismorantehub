// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { NfeFiscalIssueModal } from './NfeFiscalIssueModal';

describe('NfeFiscalIssueModal', () => {
  it('confirma a preparação antes de oferecer retomada da mesma tentativa', () => {
    const onReconcile = vi.fn();
    const baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      environment: 2 as const,
      productionConfirmed: false,
      retryNumber: '',
      canOperateFiscal: true,
      isSubmitting: false,
      isLoadingFiscalData: false,
      fiscalPreparationError: null,
      onReconcile,
    };
    const emissionResult: NfeEmissionResult = {
      success: false,
      pending: true,
      orderId: 'TEST_AUT_order',
      environment: 2,
      model: '65',
      emissionRequestId: '2108d518-4419-4017-94ff-ad6bbef8ad0f',
      sefazContacted: false,
      technicalDetails: { apiCode: 'FISCAL_PREPARATION_UNCONFIRMED', httpStatus: 503 },
    };
    const view = render(<NfeFiscalIssueModal {...baseProps} emissionResult={emissionResult} />);

    expect(screen.getByText('A preparação da nota não foi confirmada')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar preparação' }));
    expect(onReconcile).toHaveBeenCalledTimes(1);

    view.rerender(
      <NfeFiscalIssueModal
        {...baseProps}
        emissionResult={{ ...emissionResult, pending: false, preparationReconciled: true }}
      />
    );
    expect(screen.getByText('A preparação não foi registrada')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retomar a mesma tentativa' }));
    expect(onReconcile).toHaveBeenCalledTimes(2);
  });
});
