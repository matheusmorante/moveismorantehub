// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductFormTabsNavigation, type ProductTabItem } from './ProductFormTabsNavigation';

const tabs: ProductTabItem[] = [
  { id: 'geral', label: 'Informações Básicas', icon: '' },
  { id: 'technical', label: 'Características', icon: 'bi-info-circle' },
  { id: 'description', label: 'Descrição', icon: 'bi-file-text' },
  { id: 'estoque', label: 'Estoque e Precificação', icon: 'bi-box-seam' },
  { id: 'fiscal', label: 'Tributário / NF', icon: 'bi-receipt' },
];

afterEach(cleanup);

describe('ProductFormTabsNavigation', () => {
  it('bloqueia características e descrição enquanto faltam os requisitos', () => {
    const setActiveTab = vi.fn();
    render(
      <ProductFormTabsNavigation
        tabs={tabs}
        formData={{ name: 'Mesa' }}
        activeTab="geral"
        setActiveTab={setActiveTab}
        validationErrors={{}}
      />
    );

    const technicalTab = screen.getByRole('tab', { name: 'Características' }) as HTMLButtonElement;
    const descriptionTab = screen.getByRole('tab', { name: 'Descrição' }) as HTMLButtonElement;

    expect(technicalTab.disabled).toBe(true);
    expect(descriptionTab.disabled).toBe(true);
    fireEvent.click(technicalTab);
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it('ativa a aba selecionada quando os requisitos estão preenchidos', () => {
    const setActiveTab = vi.fn();
    render(
      <ProductFormTabsNavigation
        tabs={tabs}
        formData={{ name: 'Mesa', categoryIds: ['category-1'] }}
        activeTab="geral"
        setActiveTab={setActiveTab}
        validationErrors={{}}
      />
    );

    const descriptionTab = screen.getByRole('tab', { name: 'Descrição' }) as HTMLButtonElement;
    expect(descriptionTab.disabled).toBe(false);
    fireEvent.click(descriptionTab);

    expect(setActiveTab).toHaveBeenCalledWith('description');
  });

  it('marca visualmente a aba de estoque quando há erro de validação', () => {
    render(
      <ProductFormTabsNavigation
        tabs={tabs}
        formData={{ name: 'Mesa', categoryIds: ['category-1'] }}
        activeTab="geral"
        setActiveTab={vi.fn()}
        validationErrors={{ unitPrice: true }}
      />
    );

    expect(screen.getByRole('tab', { name: 'Estoque e Precificação' }).className).toContain(
      'text-red-500'
    );
  });

  it('marca visualmente a aba tributária quando o NCM tem erro', () => {
    render(
      <ProductFormTabsNavigation
        tabs={tabs}
        formData={{ name: 'Mesa', categoryIds: ['category-1'] }}
        activeTab="geral"
        setActiveTab={vi.fn()}
        validationErrors={{ ncm: true }}
      />
    );

    expect(screen.getByRole('tab', { name: 'Tributário / NF' }).className).toContain(
      'text-red-500'
    );
  });
});
