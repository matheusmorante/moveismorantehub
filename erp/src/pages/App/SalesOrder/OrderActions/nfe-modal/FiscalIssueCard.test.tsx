// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FiscalIssueCard } from './FiscalIssueCard';

afterEach(() => cleanup());

describe('FiscalIssueCard', () => {
  it('keeps technical codes collapsed and copies only the diagnostic fields', async () => {
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    try {
      render(
        <FiscalIssueCard
          tone="attention"
          title="Estamos confirmando o que aconteceu com esta nota"
          description="Ainda não recebemos a confirmação da SEFAZ."
          nextStep="Consulte a tentativa antes de qualquer novo envio."
          technicalDetails={{
            apiCode: 'HML_TRANSMISSION_UNCERTAIN',
            httpStatus: 502,
            transportCode: 'SELF_SIGNED_CERT_IN_CHAIN',
            diagnosticId: 'diagnostic-1',
            emissionRequestId: 'request-1',
            environment: 2,
            model: '65',
          }}
        />
      );

      expect(
        screen.getByTestId('fiscal-issue-card').querySelector('h2')?.textContent
      ).not.toContain('HML_TRANSMISSION_UNCERTAIN');
      fireEvent.click(screen.getByText('Ver detalhes técnicos'));
      expect(screen.getByText('HML_TRANSMISSION_UNCERTAIN')).toBeTruthy();
      fireEvent.click(screen.getByTestId('fiscal-copy-details'));

      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      expect(writeText.mock.calls[0][0]).toContain('Código: HML_TRANSMISSION_UNCERTAIN');
      expect(writeText.mock.calls[0][0]).toContain('Transporte: SELF_SIGNED_CERT_IN_CHAIN');
      expect(screen.getByRole('status').textContent).toBe('Detalhes copiados.');
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });
});
