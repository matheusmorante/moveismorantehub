import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import { NfeEmissionModal } from '../NfeEmissionModal';
import { NfeEnvironmentChoiceModal } from './NfeEnvironmentChoiceModal';

type NfeEmissionEnvironmentChoiceCaseDependencies = { mocks: any; order: any; };

export function registerNfeEmissionEnvironmentChoiceCases({ mocks, order }: NfeEmissionEnvironmentChoiceCaseDependencies): void {
  it('desativa a opção de homologação com tooltip no modal prévio quando já emitida em homologação', async () => {
    const orderHmlIssued: any = {
      ...order,
      id: 'hml-issued-order',
      nfeData: {
        status: 'homologada',
        environment: 2,
        accessKey: '41260400000000000000550010000000011000000010',
      },
    };

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={orderHmlIssued}
        onClose={vi.fn()}
        onSelectEnvironment={vi.fn()}
      />
    );

    const hmlButton = screen.getByText('Homologação').closest('button');
    expect(hmlButton?.hasAttribute('disabled')).toBe(true);
    expect(mocks.prepareOrderSnapshot).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(hmlButton?.getAttribute('title')).toBe(
      'Nota fiscal de homologação já emitida para este pedido.'
    );
  });

  it('abre o fluxo de produção no modal prévio quando ainda não foi emitida', async () => {
    const orderForTest: any = {
      ...order,
      id: 'prod-test-order',
      nfeData: null,
    };
    const onSelectEnvironment = vi.fn();

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={orderForTest}
        onClose={vi.fn()}
        onSelectEnvironment={onSelectEnvironment}
      />
    );

    const prodButton = screen.getByText('Produção').closest('button');
    expect(prodButton?.hasAttribute('disabled')).toBe(false);
    expect(prodButton?.getAttribute('title')).toContain('tpAmb=1');
    fireEvent.click(prodButton!);
    await waitFor(() =>
      expect(mocks.prepareOrderSnapshot).toHaveBeenCalledWith(orderForTest, 1)
    );
    expect(onSelectEnvironment).toHaveBeenCalledWith(1, orderForTest);
  });

  it('inicia uma nova intenção vinculada à nota estornada antes da reemissão em homologação', async () => {
    const orderForTest: any = { ...order, id: 'hml-reissue-order', nfeData: null };
    const fiscalStatuses = {
      production: 'not_issued' as const,
      homologation: 'reissue_required' as const,
      readyToReissueHml: true,
      homologationBadges: [
        { id: 'original-hml-document', status: 'reversed' as const, sequenceNumber: 1, label: 'NFH' },
      ],
    };
    vi.mocked(fetchOrderFiscalBadgeStatuses).mockResolvedValueOnce({ [orderForTest.id]: fiscalStatuses });
    const onSelectEnvironment = vi.fn();

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={orderForTest}
        onClose={vi.fn()}
        onSelectEnvironment={onSelectEnvironment}
      />
    );

    await waitFor(() => expect(fetchOrderFiscalBadgeStatuses).toHaveBeenCalledWith([orderForTest.id]));
    const hmlButton = screen.getByText('Homologação').closest('button');
    fireEvent.click(hmlButton!);

    await waitFor(() =>
      expect(mocks.beginConfirmedReplacement).toHaveBeenCalledWith(
        orderForTest.id,
        2,
        fiscalStatuses
      )
    );
    expect(onSelectEnvironment).toHaveBeenCalledWith(2, orderForTest);
  });

  it('mantém Produção disponível quando o pedido tem somente uma NFC-e de homologação', async () => {
    const hmlOrder: any = {
      ...order,
      id: 'hml-only-order',
      nfeData: {
        status: 'homologada',
        environment: 2,
        accessKey: '41261000000000000000650010000005991000000010',
        protocolNumber: '123456789',
      },
    };
    const onSelectEnvironment = vi.fn();

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={hmlOrder}
        onClose={vi.fn()}
        onSelectEnvironment={onSelectEnvironment}
      />
    );

    const prodButton = screen.getByText('Produção').closest('button');
    expect(prodButton?.hasAttribute('disabled')).toBe(false);
    fireEvent.click(prodButton!);
    await waitFor(() => expect(mocks.prepareOrderSnapshot).toHaveBeenCalledWith(hmlOrder, 1));
    expect(onSelectEnvironment).toHaveBeenCalledWith(1, hmlOrder);
  });

  it('no modal de formulário, não exibe os botões de seleção de ambiente no cabeçalho e inicializa com o ambiente escolhido', async () => {
    render(<NfeEmissionModal isOpen order={order} initialEnvironment={2} onClose={vi.fn()} />);

    // O cabeçalho não deve mais conter os seletores radio de ambiente
    expect(screen.queryByRole('radiogroup', { name: 'Ambiente de emissão' })).toBeNull();
    // Exibe a tag de identificação do ambiente no cabeçalho
    expect(screen.getByText('Homologação')).toBeTruthy();
  });
}
