// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductGeneralTab from './ProductGeneralTab';

const { mockUseProductOpportunities } = vi.hoisted(() => ({
  mockUseProductOpportunities: vi.fn(() => ({ opportunities: [] })),
}));

vi.mock('../../hooks/useProductOpportunities', () => ({
  useProductOpportunities: mockUseProductOpportunities,
}));

vi.mock('./sections/ProductCategoryPicker', () => ({
  default: () => null,
}));

describe('ProductGeneralTab product name field', () => {
  afterEach(() => cleanup());

  const renderTab = () =>
    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService
        formData={{ name: 'Sofá Capri' }}
        setFormData={vi.fn()}
        availableCategories={[]}
      />
    );

  it('labels the ERP name as Nome do Produto', () => {
    renderTab();

    expect(screen.getByText('Nome do Produto')).toBeTruthy();
  });

  it('sincroniza título e título do catálogo ao alterar o nome do produto', () => {
    const setFormData = vi.fn();
    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService
        formData={{ name: 'Mesa' }}
        setFormData={setFormData}
        availableCategories={[]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Digite o nome do produto/i), {
      target: { value: 'Mesa Aurora' },
    });

    const update = setFormData.mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    expect(update({ name: 'Mesa' })).toMatchObject({
      name: 'Mesa Aurora',
      title: 'Mesa Aurora',
      marketplaceTitle: 'Mesa Aurora',
    });
  });

  it('mostra as duas opções dentro do controle na primeira aba e destaca o modo selecionado', () => {
    const onSetHasVariations = vi.fn();
    const { rerender } = render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Mesa', hasVariations: false, variations: [] }}
        setFormData={vi.fn()}
        availableCategories={[]}
        onSetHasVariations={onSetHasVariations}
      />
    );

    const modeGroup = screen.getByRole('group', { name: 'Tipo do produto' });
    const simpleButton = screen.getByRole('button', { name: /^Simples$/ });
    const variationsButton = screen.getByRole('button', { name: /^Com variações$/i });
    expect(modeGroup.contains(simpleButton)).toBe(true);
    expect(modeGroup.contains(variationsButton)).toBe(true);
    expect(modeGroup.getAttribute('class')).toContain('bg-slate-200/70');
    expect(simpleButton.getAttribute('aria-pressed')).toBe('true');
    expect(simpleButton.getAttribute('class')).toContain('bg-white');
    expect(simpleButton.getAttribute('class')).toContain('text-blue-600');
    expect(variationsButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(variationsButton);
    expect(onSetHasVariations).toHaveBeenCalledWith(true);

    rerender(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Mesa', hasVariations: true, variations: [] }}
        setFormData={vi.fn()}
        availableCategories={[]}
        onSetHasVariations={onSetHasVariations}
      />
    );

    expect(screen.getByRole('button', { name: /^Simples$/ }).getAttribute('aria-pressed')).toBe('false');
    const selectedVariationsButton = screen.getByRole('button', { name: /^Com variações$/i });
    expect(selectedVariationsButton.getAttribute('aria-pressed')).toBe('true');
    expect(selectedVariationsButton.getAttribute('class')).toContain('text-emerald-600');
  });

  it('explica que o produto volta a simples automaticamente quando há mais de uma variação', () => {
    const onSetHasVariations = vi.fn();
    const makeVariation = (id: string) => ({
      id,
      name: `Mesa ${id}`,
      sku: `SKU-${id}`,
      stock: 1,
      unitPrice: 100,
      active: false,
      attributes: [],
      images: [],
    });
    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{
          name: 'Mesa',
          hasVariations: true,
          variations: [makeVariation('1'), makeVariation('2')],
        }}
        setFormData={vi.fn()}
        availableCategories={[]}
        onSetHasVariations={onSetHasVariations}
      />
    );

    const simpleButton = screen.getByRole('button', { name: /^Simples$/ });
    expect(simpleButton.getAttribute('aria-pressed')).toBe('false');
    expect(simpleButton.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(simpleButton);
    expect(screen.getByRole('tooltip').textContent).toBe(
      'Este produto se tornará simples automaticamente quando restar apenas 1 variação.'
    );
    expect(onSetHasVariations).not.toHaveBeenCalled();
  });

  it('mostra a explicação do modo simples bloqueado ao focar a chave pelo teclado', () => {
    const makeVariation = (id: string) => ({
      id,
      name: `Mesa ${id}`,
      sku: `SKU-${id}`,
      stock: 1,
      unitPrice: 100,
      active: false,
      attributes: [],
      images: [],
    });
    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{
          name: 'Mesa',
          hasVariations: true,
          variations: [makeVariation('1'), makeVariation('2')],
        }}
        setFormData={vi.fn()}
        availableCategories={[]}
      />
    );

    fireEvent.focus(screen.getByRole('button', { name: /^Simples$/ }));

    expect(screen.getByRole('tooltip').textContent).toBe(
      'Este produto se tornará simples automaticamente quando restar apenas 1 variação.'
    );
  });

  it('does not show the catalog title differentiation button or catalog title input', () => {
    renderTab();

    expect(screen.queryByRole('group', { name: 'Tipo do produto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Diferenciar Título no Catálogo' })).toBeNull();
    expect(screen.queryByText('Título no Catálogo')).toBeNull();
    expect(screen.queryByPlaceholderText('Digite o título no catálogo...')).toBeNull();
  });

  it('renders opportunity empty option without "Selecione" text and without required asterisk for conventional product', () => {
    mockUseProductOpportunities.mockReturnValueOnce({
      opportunities: [
        { id: 'opp-1', name: 'Oportunidade 1' },
        { id: 'opp-2', name: 'Queima dos Salvados' },
      ],
    } as any);

    const { container } = render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Mesa Capri', productKind: 'normal', opportunityId: null }}
        setFormData={vi.fn()}
        availableCategories={[]}
      />
    );

    const oppContainer = container.querySelector('#field-product-opportunity');
    expect(oppContainer).toBeTruthy();

    const select = oppContainer?.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options[0].value).toBe('');
    expect(select.options[0].text).toBe('');

    // Não deve conter o texto "Selecione" nas opções
    const optionsTexts = Array.from(select.options).map((opt) => opt.text);
    expect(optionsTexts).not.toContain('Selecione');

    // Asterisco obrigatório não deve estar presente para normal
    expect(oppContainer?.querySelector('.text-red-500')).toBeNull();
  });

  it('renders opportunity required asterisk and disables select when salvado', () => {
    mockUseProductOpportunities.mockReturnValueOnce({
      opportunities: [
        { id: 'opp-1', name: 'Oportunidade 1' },
        { id: 'opp-2', name: 'Queima dos Salvados' },
      ],
    } as any);

    const { container } = render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Mesa Capri', productKind: 'salvado', opportunityId: 'opp-2' }}
        setFormData={vi.fn()}
        availableCategories={[]}
      />
    );

    const oppContainer = container.querySelector('#field-product-opportunity');
    expect(oppContainer).toBeTruthy();

    const select = oppContainer?.querySelector('select') as HTMLSelectElement;
    expect(select.disabled).toBe(true);

    // Asterisco obrigatório deve estar presente para salvados
    expect(oppContainer?.querySelector('.text-red-500')).toBeTruthy();
  });

  it('não renderiza botão de IA ou container amarelo na primeira aba (migrado para o cabeçalho global)', () => {
    const mockOpenAi = vi.fn();
    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Mesa Capri' }}
        setFormData={vi.fn()}
        availableCategories={[]}
        onOpenAiFillModal={mockOpenAi}
      />
    );

    // O botão genérico de IA não deve ficar na aba/campo individual
    expect(screen.queryByRole('button', { name: /Preencher cadastro com IA/i })).toBeNull();

    // Não deve renderizar botão de texto descritivo avulso na aba
    expect(screen.queryByRole('button', { name: /Preencher via texto descritivo/i })).toBeNull();
    expect(screen.queryByText('Texto descritivo')).toBeNull();

    // Não deve renderizar container de preenchimento com IA com borda amarela
    expect(screen.queryByText('Preenchimento com IA')).toBeNull();
  });
  it('não renderiza card ou botões de sugestão de categoria quando o nome é digitado', () => {
    const mockCategories = [
      { id: 'env-sala', name: 'Sala de Estar', parents: [] },
      { id: 'cat-sofas', name: 'Sofás', parents: ['env-sala'] },
    ];
    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Sofá Retrátil 3 Lugares', categoryIds: [] }}
        setFormData={vi.fn()}
        availableCategories={mockCategories}
      />
    );

    expect(screen.queryByText(/Confira a sugestão pelo nome/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Usar Sofás/i })).toBeNull();
  });

  it('seleciona a categoria automaticamente no onBlur sem exigir clique em sugestão', () => {
    const mockCategories = [
      { id: 'env-sala', name: 'Sala de Estar', parents: [] },
      { id: 'cat-sofas', name: 'Sofás', parents: ['env-sala'] },
    ];
    const mockSetFormData = vi.fn();
    const mockSetValidationErrors = vi.fn();

    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Sofá Retrátil 3 Lugares', categoryIds: [] }}
        setFormData={mockSetFormData}
        availableCategories={mockCategories}
        setValidationErrors={mockSetValidationErrors}
      />
    );

    const input = screen.getByPlaceholderText(/Digite o nome do produto/i);
    fireEvent.blur(input);

    expect(mockSetFormData).toHaveBeenCalled();
    const calls = mockSetFormData.mock.calls;
    const categoryUpdateCall = calls.find(call => {
      const fn = call[0];
      if (typeof fn !== 'function') return false;
      const res = fn({ name: 'Sofá Retrátil 3 Lugares', categoryIds: [] });
      return res && res.categoryIds && res.categoryIds.includes('cat-sofas');
    });
    expect(categoryUpdateCall).toBeTruthy();
  });

  it('seleciona a categoria automaticamente via debounce quando o nome é digitado', () => {
    vi.useFakeTimers();
    const mockCategories = [
      { id: 'env-sala', name: 'Sala de Estar', parents: [] },
      { id: 'cat-sofas', name: 'Sofás', parents: ['env-sala'] },
    ];
    const mockSetFormData = vi.fn();

    render(
      <ProductGeneralTab
        onOpenCategorySearch={vi.fn()}
        isService={false}
        formData={{ name: 'Sofá Retrátil 3 Lugares', categoryIds: [] }}
        setFormData={mockSetFormData}
        availableCategories={mockCategories}
      />
    );

    vi.advanceTimersByTime(350);

    expect(mockSetFormData).toHaveBeenCalled();
    const calls = mockSetFormData.mock.calls;
    const categoryUpdateCall = calls.find(call => {
      const fn = call[0];
      if (typeof fn !== 'function') return false;
      const res = fn({ name: 'Sofá Retrátil 3 Lugares', categoryIds: [] });
      return res && res.categoryIds && res.categoryIds.includes('cat-sofas');
    });
    expect(categoryUpdateCall).toBeTruthy();
    vi.useRealTimers();
  });
});
