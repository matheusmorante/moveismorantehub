// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import BodyRow from '../ItemsTable/BodyRow';
import { BodyRowDesktop } from '../ItemsTable/BodyRowDesktop';
import { BodyRowMobile } from '../ItemsTable/BodyRowMobile';
import Item from '@/pages/types/items.type';
import { AppSettings } from '@/pages/utils/settingsService';

const mockSettings: AppSettings = {
  deliveryHandlingOptions: [
    { label: 'Na caixa > Montagem no deposito > Entregue montado', includeInAssemblySchedule: true, isAssemblyOutside: false },
    { label: 'Na caixa > Montagem no local da entrega', includeInAssemblySchedule: false, isAssemblyOutside: true },
    { label: 'De mostruário montado > Entregue montado', includeInAssemblySchedule: false, isAssemblyOutside: false },
  ],
  pickupHandlingOptions: [
    { label: 'De caixa > Montagem para retirada', includeInAssemblySchedule: true, isAssemblyOutside: false },
    { label: 'Na caixa > Montagem por conta do cliente', includeInAssemblySchedule: false, isAssemblyOutside: false },
  ],
} as any;

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => mockSettings,
  useSettings: () => mockSettings,
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  },
}));

describe('Manuseio nos Itens do Pedido (Desktop e Mobile)', () => {
  afterEach(() => {
    cleanup();
  });

  const baseItem: Item = {
    orderItemId: 'item-1',
    description: 'Guarda-Roupa 6 Portas',
    quantity: 1,
    unitPrice: 1200,
    unitDiscount: 0,
    discountType: 'fixed',
    handlingType: '',
    itemType: 'product',
  };

  it('deve exibir apenas manuseios de entrega quando deliveryMethod for delivery (Desktop)', () => {
    render(
      <table>
        <tbody>
          <BodyRow
            item={baseItem}
            productItems={[baseItem]}
            idx={0}
            onChange={vi.fn()}
            onBatchChange={vi.fn()}
            onToggleDiscountType={vi.fn()}
            onDelete={vi.fn()}
            deliveryMethod="delivery"
            errors={{}}
            isMobile={false}
            onSelectProduct={vi.fn()}
          />
        </tbody>
      </table>
    );

    const select = screen.getByRole('combobox', { name: 'Manuseio' }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());

    // Deve conter placeholder e as 3 opções de entrega
    expect(optionLabels).toContain('Selecione');
    expect(optionLabels).toContain('Na caixa > Montagem no deposito > Entregue montado');
    expect(optionLabels).toContain('Na caixa > Montagem no local da entrega');
    expect(optionLabels).toContain('De mostruário montado > Entregue montado');

    // NUNCA deve conter opções de retirada nem opções de fallback genérico
    expect(optionLabels).not.toContain('De caixa > Montagem para retirada');
    expect(optionLabels).not.toContain('Montagem');
    expect(optionLabels).not.toContain('Entrega sem montagem');
    expect(optionLabels).not.toContain('Sem manuseio');
  });

  it('deve exibir apenas manuseios de retirada quando deliveryMethod for pickup (Desktop)', () => {
    render(
      <table>
        <tbody>
          <BodyRow
            item={baseItem}
            productItems={[baseItem]}
            idx={0}
            onChange={vi.fn()}
            onBatchChange={vi.fn()}
            onToggleDiscountType={vi.fn()}
            onDelete={vi.fn()}
            deliveryMethod="pickup"
            errors={{}}
            isMobile={false}
            onSelectProduct={vi.fn()}
          />
        </tbody>
      </table>
    );

    const select = screen.getByRole('combobox', { name: 'Manuseio' }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());

    expect(optionLabels).toContain('De caixa > Montagem para retirada');
    expect(optionLabels).toContain('Na caixa > Montagem por conta do cliente');

    // NUNCA deve conter opções de entrega nem fallbacks
    expect(optionLabels).not.toContain('Na caixa > Montagem no local da entrega');
    expect(optionLabels).not.toContain('Montagem');
    expect(optionLabels).not.toContain('Entrega sem montagem');
    expect(optionLabels).not.toContain('Sem manuseio');
  });

  it('deve exibir manuseios corretos no modo Mobile (Cards) conforme deliveryMethod e NUNCA fallbacks', () => {
    render(
      <BodyRow
        item={baseItem}
        productItems={[baseItem]}
        idx={0}
        onChange={vi.fn()}
        onBatchChange={vi.fn()}
        onToggleDiscountType={vi.fn()}
        onDelete={vi.fn()}
        deliveryMethod="delivery"
        errors={{}}
        isMobile={true}
        onSelectProduct={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox', { name: 'Manuseio' }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());

    // Deve conter as opções reais de entrega
    expect(optionLabels).toContain('Na caixa > Montagem no deposito > Entregue montado');
    expect(optionLabels).toContain('Na caixa > Montagem no local da entrega');
    expect(optionLabels).toContain('De mostruário montado > Entregue montado');

    // NUNCA deve conter as opções de fallback que estavam hardcoded no BodyRowMobile
    expect(optionLabels).not.toContain('Montagem');
    expect(optionLabels).not.toContain('Entrega sem montagem');
    expect(optionLabels).not.toContain('Sem manuseio');
  });

  it('deve exibir manuseios de retirada no modo Mobile quando deliveryMethod for pickup', () => {
    render(
      <BodyRow
        item={baseItem}
        productItems={[baseItem]}
        idx={0}
        onChange={vi.fn()}
        onBatchChange={vi.fn()}
        onToggleDiscountType={vi.fn()}
        onDelete={vi.fn()}
        deliveryMethod="pickup"
        errors={{}}
        isMobile={true}
        onSelectProduct={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox', { name: 'Manuseio' }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());

    expect(optionLabels).toContain('De caixa > Montagem para retirada');
    expect(optionLabels).toContain('Na caixa > Montagem por conta do cliente');

    expect(optionLabels).not.toContain('Na caixa > Montagem no local da entrega');
    expect(optionLabels).not.toContain('Montagem');
    expect(optionLabels).not.toContain('Entrega sem montagem');
    expect(optionLabels).not.toContain('Sem manuseio');
  });

  it('não deve exibir nenhum manuseio de fallback se as configurações estiverem vazias', () => {
    const emptySettings: AppSettings = {
      deliveryHandlingOptions: [],
      pickupHandlingOptions: [],
    } as any;

    const dummyPricing: any = {
      tempUnitPrice: 100,
      setTempUnitPrice: vi.fn(),
      commitUnitPrice: vi.fn(),
      tempDiscountValue: 0,
      setTempDiscountValue: vi.fn(),
      commitDiscountValue: vi.fn(),
      tempDiscountPercent: 0,
      setTempDiscountPercent: vi.fn(),
      commitDiscountPercent: vi.fn(),
      tempSubtotal: 100,
      setTempSubtotal: vi.fn(),
      commitSubtotal: vi.fn(),
      tempObservation: '',
      setTempObservation: vi.fn(),
      commitObservation: vi.fn(),
    };

    // Testar Desktop
    const { unmount } = render(
      <table>
        <tbody>
          <BodyRowDesktop
            item={baseItem}
            idx={0}
            deliveryMethod="delivery"
            settings={emptySettings}
            pricing={dummyPricing}
            onChange={vi.fn()}
            onBatchChange={vi.fn()}
            onToggleDiscountType={vi.fn()}
            onDelete={vi.fn()}
            onSelectProduct={vi.fn()}
            handleStockOriginChange={vi.fn()}
            isService={false}
            shouldShowStockOrigin={true}
            shouldHideHandling={false}
            isLinkedProduct={false}
            isTemporaryProduct={false}
            itemHasError={false}
            serviceProductLink={null}
          />
        </tbody>
      </table>
    );

    let select = screen.getByRole('combobox', { name: 'Manuseio' }) as HTMLSelectElement;
    let optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(optionLabels).toEqual(['Selecione']);

    unmount();

    // Testar Mobile
    render(
      <BodyRowMobile
        item={baseItem}
        idx={0}
        deliveryMethod="delivery"
        settings={emptySettings}
        pricing={dummyPricing}
        onChange={vi.fn()}
        onBatchChange={vi.fn()}
        onToggleDiscountType={vi.fn()}
        onDelete={vi.fn()}
        onSelectProduct={vi.fn()}
        handleStockOriginChange={vi.fn()}
        isService={false}
        shouldShowStockOrigin={true}
        shouldHideHandling={false}
        isLinkedProduct={false}
        isTemporaryProduct={false}
        itemHasError={false}
        serviceProductLink={null}
      />
    );

    select = screen.getByRole('combobox', { name: 'Manuseio' }) as HTMLSelectElement;
    optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(optionLabels).toEqual(['Selecione']);
  });

  it('não deve exibir opções de fallback legadas como (Atual) se item contiver montagem, entrega ou sem_manuseio', () => {
    const itemWithFallback: Item = {
      ...baseItem,
      handlingType: 'montagem',
    };

    render(
      <table>
        <tbody>
          <BodyRow
            item={itemWithFallback}
            productItems={[itemWithFallback]}
            idx={0}
            onChange={vi.fn()}
            onBatchChange={vi.fn()}
            onToggleDiscountType={vi.fn()}
            onDelete={vi.fn()}
            deliveryMethod="delivery"
            errors={{}}
            isMobile={false}
            onSelectProduct={vi.fn()}
          />
        </tbody>
      </table>
    );

    const select = screen.getByRole('combobox', { name: 'Manuseio' }) as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());

    // NUNCA deve renderizar 'montagem (Atual)'
    expect(optionLabels).not.toContain('montagem (Atual)');
    expect(optionLabels).not.toContain('montagem');
  });

  it('deve aplicar o manuseio selecionado pelo usuário como alteração em lote', () => {
    const onChangeMock = vi.fn();
    const onBatchChangeMock = vi.fn();
    render(
      <table>
        <tbody>
          <BodyRow
            item={baseItem}
            productItems={[baseItem]}
            idx={0}
            onChange={onChangeMock}
            onBatchChange={onBatchChangeMock}
            onToggleDiscountType={vi.fn()}
            onDelete={vi.fn()}
            deliveryMethod="delivery"
            errors={{}}
            isMobile={false}
            onSelectProduct={vi.fn()}
          />
        </tbody>
      </table>
    );

    const select = screen.getByRole('combobox', { name: 'Manuseio' });
    fireEvent.change(select, { target: { value: 'Na caixa > Montagem no local da entrega' } });

    expect(onBatchChangeMock).toHaveBeenCalledWith(0, {
      handlingType: 'Na caixa > Montagem no local da entrega',
    });
    expect(onChangeMock).not.toHaveBeenCalled();
  });
});
