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
