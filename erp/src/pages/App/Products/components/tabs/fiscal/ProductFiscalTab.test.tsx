// @vitest-environment happy-dom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type Product from '../../../../../types/product.type';
import ProductFiscalTab from './ProductFiscalTab';

vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({}) }));
vi.mock('./ProductNcmSelector', () => ({ ProductNcmSelector: () => null }));

const initialProduct = {
  itemType: 'product',
  fiscal: {
    ncm: '94017900',
    cest: '',
    cst: '103',
    cfop: '5102',
    origem: '0',
    icmsPercent: 0,
    pisCst: '99',
    cofinsCst: '99',
    codigoServico: '',
  },
} as Partial<Product>;

function ProductFiscalTabHarness() {
  const [formData, setFormData] = useState(initialProduct);
  return <ProductFiscalTab formData={formData} setFormData={setFormData} />;
}

describe('confirmação de alteração do CSOSN no cadastro do produto', () => {
  afterEach(() => cleanup());

  it('só aplica o novo CSOSN depois da confirmação', () => {
    render(<ProductFiscalTabHarness />);
    const csosn = screen.getByRole('combobox', { name: 'CSOSN do produto' }) as HTMLSelectElement;

    fireEvent.change(csosn, { target: { value: '102' } });
    expect(csosn.value).toBe('102');
    fireEvent.blur(csosn);

    expect(screen.getByText('Confirmar alteração de CSOSN?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, alterar' }));
    expect(csosn.value).toBe('102');
  });

  it('restaura o valor anterior se a alteração for recusada', () => {
    render(<ProductFiscalTabHarness />);
    const csosn = screen.getByRole('combobox', { name: 'CSOSN do produto' }) as HTMLSelectElement;

    fireEvent.change(csosn, { target: { value: '102' } });
    fireEvent.blur(csosn);
    fireEvent.click(screen.getByRole('button', { name: 'Não, manter atual' }));

    expect(csosn.value).toBe('103');
  });
});
