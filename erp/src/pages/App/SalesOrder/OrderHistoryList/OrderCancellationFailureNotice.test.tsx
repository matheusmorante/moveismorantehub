// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderCancellationFailureNotice } from './OrderCancellationFailureNotice';

afterEach(() => {
  cleanup();
});

describe('OrderCancellationFailureNotice', () => {
  it('renders nothing when state is undefined', () => {
    const { container } = render(<OrderCancellationFailureNotice />);
    expect(container.firstChild).toBeNull();
  });

  it('renders explicit "cancelamento fiscal" label in failed state for homologation', () => {
    const onRetry = vi.fn();
    render(
      <OrderCancellationFailureNotice
        state="failed"
        documentId="doc-123"
        environment={2}
        onRetry={onRetry}
      />
    );

    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).toContain('NFH — Falha na tentativa de cancelamento fiscal');

    const retryBtn = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retryBtn).toBeTruthy();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith('doc-123');
  });

  it('renders explicit "cancelamento fiscal" label in failed state for production', () => {
    render(
      <OrderCancellationFailureNotice
        state="failed"
        documentId="doc-456"
        environment={1}
      />
    );

    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).toContain('NF — Falha na tentativa de cancelamento fiscal');
  });

  it('renders explicit "cancelamento fiscal" label in pending and verify states', () => {
    const { rerender } = render(
      <OrderCancellationFailureNotice
        state="pending"
        documentId="doc-789"
        environment={2}
      />
    );

    expect(screen.getByRole('status').textContent).toContain(
      'NFH — Cancelamento fiscal pendente de confirmação'
    );

    rerender(
      <OrderCancellationFailureNotice
        state="verify"
        documentId="doc-789"
        environment={1}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole('status').textContent).toContain(
      'NF — Cancelamento fiscal pendente de confirmação'
    );
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeTruthy();
  });
});
