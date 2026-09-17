// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InboundInvoiceItemsReview } from './InboundInvoiceItemsReview';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {}, isTestEnvironment: false }));
vi.mock('@/pages/utils/personService', () => ({ fetchPersons: vi.fn().mockResolvedValue([]) }));
vi.mock('@/pages/App/Products/ProductFormModal', () => ({ default: () => null }));
vi.mock('./QuickRegisterVariationModal', () => ({ QuickRegisterVariationModal: () => null }));
vi.mock('@/components/shared/DropdownPortal', () => ({ default: () => null }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({
    findProductSupplierCodes: vi.fn().mockResolvedValue(new Map()),
    saveProductSupplierCode: vi.fn().mockResolvedValue(undefined),
    deleteProductSupplierCode: vi.fn().mockResolvedValue(undefined),
}));
import { getFullProduct } from '@/pages/utils/productService';

vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));
vi.mock('@/pages/utils/productService', () => ({
    getFullProduct: vi.fn(),
    saveProduct: vi.fn(),
    saveVariation: vi.fn(),
}));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: vi.fn().mockResolvedValue([]) }));
vi.mock('@/pages/utils/variationService', () => ({ ensureAttributeValue: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/inboundSupplierProductContext', () => ({
    fetchSupplierProductsForContext: vi.fn().mockResolvedValue([]),
    buildSupplierContextSummary: vi.fn().mockReturnValue(''),
}));
vi.mock('@/pages/utils/aiService', () => ({ aiService: {} }));
vi.mock('@/components/productAutocompleteUtils', () => ({
    fetchAllProductSearchResults: vi.fn().mockResolvedValue([]),
    getVariationDisplayName: vi.fn(),
    normalizeProductSearch: (t: string) => t,
    renderHighlightedProductText: vi.fn(),
}));

const mockSuggestion = {
    productId: 'prod_1',
    variationId: 'var_1',
    displayName: 'Beliche Rubim - Branco',
    confidence: 92,
    reason: 'Nome e atributos compatíveis com o catálogo',
    matches: ['modelo', 'cor'],
    divergences: [],
};

const mockReject = vi.fn();
let mockIsProcessing = false;
let currentSuggestion: typeof mockSuggestion | undefined = mockSuggestion;

vi.mock('../hooks/useInboundInvoiceSuggestions', () => ({
    useInboundInvoiceSuggestions: () => ({
        suggestionFor: () => currentSuggestion,
        rejectSuggestion: mockReject,
        isProcessingSuggestions: mockIsProcessing,
        isItemProcessing: () => mockIsProcessing,
        retrySuggestions: vi.fn(),
    }),
}));

beforeEach(() => {
    vi.mocked(getFullProduct).mockResolvedValue({
        id: 'prod_1',
        name: 'Beliche Rubim',
        variations: [{ id: 'var_1', name: 'Rubim Branco' }],
    } as any);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockIsProcessing = false;
    currentSuggestion = mockSuggestion;
});

const sampleItem: InboundInvoiceItem = {
    itemNumber: 1,
    productCode: 'FORN_01',
    productDescription: 'BELICHE RUBIM BR',
    quantity: 2,
    unit: 'UN',
    unitCost: 250,
    totalCost: 500,
} as any as InboundInvoiceItem;

it('renderiza o campo de busca limpo e livre para digitação, e exibe a sugestão de IA abaixo do input', async () => {
    const onChange = vi.fn();
    const view = render(
        <InboundInvoiceItemsReview
            items={[sampleItem]}
            supplierId="forn_123"
            suppliers={[]}
            onChange={onChange}
        />
    );

    // 1. O campo de busca (input) deve estar livre e vazio, não preenchido com a sugestão
    const input = view.getByPlaceholderText('Digite 2 ou mais letras para buscar...') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.value).toBe('');

    // O usuário pode digitar livremente no input a qualquer momento
    fireEvent.change(input, { target: { value: 'Guarda Roupa' } });
    expect(input.value).toBe('Guarda Roupa');

    // 2. A sugestão aparece abaixo do input exibindo apenas o nome completo do produto e botões
    expect(view.getByText('Beliche Rubim - Branco')).toBeTruthy();
    expect(view.queryByText('Sugestão de Vínculo (IA)')).toBeNull();
    expect(view.queryByText('92%')).toBeNull();

    // 3. Ao clicar em Vincular, aceita a sugestão
    const vincularBtn = view.getByTitle('Vincular produto sugerido');
    fireEvent.click(vincularBtn);
    await waitFor(() => expect(onChange).toHaveBeenCalled());

    // 4. Ao clicar em Ignorar (botão com ícone X), rejeita a sugestão
    const ignorarBtn = view.getByTitle('Ignorar sugestão');
    fireEvent.click(ignorarBtn);
    expect(mockReject).toHaveBeenCalled();
});

it('mantém o input livre para escrita e não exibe indicador de carregamento bloqueante enquanto a IA processa em background', () => {
    mockIsProcessing = true;
    currentSuggestion = undefined;

    const view = render(
        <InboundInvoiceItemsReview
            items={[sampleItem]}
            supplierId="forn_123"
            suppliers={[]}
            onChange={vi.fn()}
        />
    );

    // Nenhum indicador de carregamento/busca aparece na interface
    expect(view.queryByText('Buscando sugestão de vínculo...')).toBeNull();

    // O input permanece 100% livre e habilitado para escrita manual
    const input = view.getByPlaceholderText('Digite 2 ou mais letras para buscar...') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: 'Comoda Sapateira' } });
    expect(input.value).toBe('Comoda Sapateira');
});
