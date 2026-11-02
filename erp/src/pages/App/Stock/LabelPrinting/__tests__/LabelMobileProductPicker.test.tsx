// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ProductAutocomplete', () => ({
  default: ({ onSelect }: any) => <button onClick={() => onSelect({ id: 'parent' }, { id: 'variation' })}>Escolher variação</button>,
}));
vi.mock('../components/ProductSearchInput', () => ({
  default: ({ onSelectProduct }: any) => <button onClick={() => onSelectProduct({ id: 'product' })}>Escolher produto</button>,
}));
import { LabelMobileProductPicker } from '../components/LabelMobileProductPicker';

afterEach(cleanup);

describe('busca de produto nas etiquetas do aplicativo', () => {
  it('abre a busca em modal e entrega a variação selecionada para identificação', () => {
    const onSelectIdentification = vi.fn();
    render(<LabelMobileProductPicker category="identificacao" selected={false} products={[]} onSelectIdentification={onSelectIdentification} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar produto' }));
    expect(screen.getByRole('dialog', { name: 'Buscar produto' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher variação' }));
    expect(onSelectIdentification).toHaveBeenCalledWith({ id: 'parent' }, { id: 'variation' });
    expect(screen.queryByRole('dialog', { name: 'Buscar produto' })).toBeNull();
  });

  it('permite selecionar o produto de uma etiqueta de preço', () => {
    const onSelectPrice = vi.fn();
    render(<LabelMobileProductPicker category="precos" selected={false} products={[]} onSelectPrice={onSelectPrice} />);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar produto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher produto' }));
    expect(onSelectPrice).toHaveBeenCalledWith({ id: 'product' });
  });
});
