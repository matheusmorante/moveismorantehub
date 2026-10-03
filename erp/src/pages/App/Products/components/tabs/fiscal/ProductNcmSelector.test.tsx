// @vitest-environment jsdom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Product from '../../../../../types/product.type';
import { ncmService } from '@/services/fiscal/ncmService';
import { ProductNcmSelector } from './ProductNcmSelector';

vi.mock('@/services/fiscal/ncmService', () => ({
  ncmService: { searchNcms: vi.fn(), getCatalogEntry: vi.fn() },
}));

function Harness() {
  const [formData, setFormData] = useState<Partial<Product>>({ fiscal: { ncm: '' } });
  return (
    <>
      <ProductNcmSelector formData={formData} setFormData={setFormData} />
      <output>{formData.fiscal?.ncm}</output>
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(ncmService.searchNcms).mockResolvedValue([
    {
      code: '94036000',
      official_description: 'Outros móveis de madeira',
      alias_match: 'móveis de madeira',
      rank: 1.1,
    },
  ]);
  vi.mocked(ncmService.getCatalogEntry).mockResolvedValue({
    code: '94036000',
    official_description: 'Outros móveis de madeira',
    active: true,
    is_active: true,
    start_date: null,
    end_date: null,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it('mantém a seleção por busca de texto/código sem controles ou chamadas de IA', async () => {
  render(<Harness />);
  expect(screen.queryByRole('switch', { name: /autopreencher ncm/i })).toBeNull();
  expect(screen.queryByText(/sugestão de ncm/i)).toBeNull();

  fireEvent.change(screen.getByPlaceholderText('Digite ou pesquise o NCM...'), {
    target: { value: 'móveis de madeira' },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(ncmService.searchNcms).toHaveBeenCalledWith('móveis de madeira', 10);
  fireEvent.click(screen.getByText('Outros móveis de madeira'));
  expect(screen.getByText('94036000')).toBeTruthy();
});

it('mostra sugestão pendente em amarelo e permite aceitar ou rejeitar', () => {
  const accept = vi.fn();
  const reject = vi.fn();
  render(
    <ProductNcmSelector
      formData={{ fiscal: { ncm: '' } }}
      setFormData={vi.fn()}
      suggestion={{ code: '94036000', description: 'Móveis de madeira' }}
      onAcceptSuggestion={accept}
      onRejectSuggestion={reject}
    />
  );
  const status = screen.getByRole('status');
  expect(status.textContent).toContain('aguardando confirmação');
  expect(status.className).toContain('amber');
  fireEvent.click(screen.getByRole('button', { name: 'Aceitar sugestão de NCM' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rejeitar sugestão de NCM' }));
  expect(accept).toHaveBeenCalledOnce();
  expect(reject).toHaveBeenCalledOnce();
});

it('não mostra sugestão concorrente quando NCM já está preenchido', () => {
  render(
    <ProductNcmSelector
      formData={{ fiscal: { ncm: '94036000' } }}
      setFormData={vi.fn()}
      suggestion={{ code: '12345678', description: 'Outra' }}
    />
  );
  expect(screen.queryByRole('status')).toBeNull();
});
