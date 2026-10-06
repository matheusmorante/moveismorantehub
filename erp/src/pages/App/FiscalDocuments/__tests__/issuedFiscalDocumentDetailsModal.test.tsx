// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Order } from '@/pages/types/order.type';
import { fetchFiscalDocumentDetails } from '../services/fiscalDocumentsService';
import {
  createDanfeShareFile,
  downloadXml,
  printDanfe,
} from '../services/fiscalDanfeXmlService';
import { IssuedFiscalDocumentDetailsModal } from '../modals/IssuedFiscalDocumentDetailsModal';
import type { FiscalDocumentDetails } from '../types/fiscalDocuments.types';

vi.mock('../services/fiscalDocumentsService', () => ({
  fetchFiscalDocumentDetails: vi.fn(),
}));

vi.mock('../services/fiscalDanfeXmlService', () => ({
  createDanfeShareFile: vi.fn(),
  downloadXml: vi.fn(),
  printDanfe: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const fiscalDetails: FiscalDocumentDetails = {
  document: {
    id: 'fiscal-document-615',
    order_id: 'order-7001',
    numero_nfe: 615,
    serie: '1',
    chave_acesso: '41261044512248000107650010000006151000006150',
    modelo: '65',
    ambiente: 2,
    status: 'homologada',
    numero_protocolo: '141260000000001',
    valor_total: 1550,
    destinatario_nome: 'Cliente de Teste',
    destinatario_documento: '12345678901',
    created_at: '2026-10-05T15:30:00.000Z',
    updated_at: '2026-10-05T15:30:00.000Z',
    xml_nfe: '<NFe />',
    xml_protocolo: '<protNFe />',
  },
  events: [],
  parsedXml: {
    general: {
      natureOperation: 'VENDA DE MERCADORIA',
      issueDate: '2026-10-05T12:30:00-03:00',
      model: '65',
      series: '1',
      number: '615',
      operationType: '1',
      destination: '1',
      finalConsumer: '1',
      presence: '4',
      total: '1550.00',
      additionalInfo: '',
    },
    recipient: {
      name: 'Cliente de Teste',
      taxId: '12345678901',
      stateRegistration: 'ISENTO',
      stateRegistrationIndicator: '9',
      email: 'cliente@example.com',
      phone: '41999990000',
      street: 'Rua das Flores',
      number: '25',
      complement: 'Casa 2',
      district: 'Centro',
      municipality: 'Colombo',
      municipalityCode: '4105805',
      state: 'PR',
      postalCode: '83405000',
      country: 'Brasil',
    },
    items: [
      {
        code: 'SOFA-01',
        description: 'Sofá de teste',
        quantity: '1.0000',
        unit: 'UN',
        unitValue: '1500.00',
        discount: '0.00',
        total: '1500.00',
        ncm: '94016100',
        cfop: '5102',
        cst: '102',
        origin: '0',
        icmsBase: '0.00',
        icmsValue: '0.00',
        ipiValue: '0.00',
        icmsRate: '0.00',
        ipiRate: '0.00',
      },
    ],
    totals: [
      { label: 'Produtos', value: '1500.00' },
      { label: 'Frete', value: '50.00' },
      { label: 'Total da NF-e', value: '1550.00' },
    ],
    transport: ['modFrete: 9', 'xNome: Retirada pelo cliente'],
    payments: [{ method: 'PIX', value: '1550.00' }],
  },
};

const emissionResult = {
  success: true,
  documentId: fiscalDetails.document.id,
  environment: 2 as const,
  model: '65' as const,
  nfeNumber: 615,
  series: '1',
  accessKey: fiscalDetails.document.chave_acesso,
  protocolNumber: fiscalDetails.document.numero_protocolo || undefined,
};

const order = { id: 'order-7001', orderNumber: 7001 } as Order;

describe('IssuedFiscalDocumentDetailsModal', () => {
  it('mostra abas somente leitura com os dados fiscais persistidos no XML', async () => {
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(fiscalDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFCe_000615.png', { type: 'image/png' })
    );

    render(
      <IssuedFiscalDocumentDetailsModal
        emissionResult={emissionResult}
        order={order}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByText('VENDA DE MERCADORIA')).toBeTruthy();
    expect(screen.getByText('Consumidor final')).toBeTruthy();
    expect(screen.queryByText(/sem valor fiscal/i)).toBeNull();
    expect(document.querySelector('input, textarea, select')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Cliente' }));
    expect(screen.getByText('Rua das Flores, 25, Casa 2')).toBeTruthy();
    expect(screen.getByText('Centro')).toBeTruthy();
    expect(screen.getByText('Colombo - PR')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText('Sofá de teste')).toBeTruthy();
    expect(screen.getByText('NCM 94016100')).toBeTruthy();
    expect(screen.getByText('CFOP 5102')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Transporte' }));
    expect(screen.getByText('Retirada pelo cliente')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Pagamento' }));
    expect(screen.getByText('PIX')).toBeTruthy();
  });

  it('abre os mesmos detalhes a partir de um documento da lista fiscal', async () => {
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(fiscalDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFCe_000615.png', { type: 'image/png' })
    );

    render(
      <IssuedFiscalDocumentDetailsModal
        document={fiscalDetails.document}
        orderNumber={7001}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByText('VENDA DE MERCADORIA')).toBeTruthy();
    expect(fetchFiscalDocumentDetails).toHaveBeenCalledWith(fiscalDetails.document.id);
    expect(screen.getByText(/Pedido #7001/)).toBeTruthy();
    expect(screen.getByText('Recebida em homologação')).toBeTruthy();
    expect(document.querySelector('input, textarea, select')).toBeNull();
  });

  it('renderiza em tela cheia quando chamado pelo rótulo de produção', async () => {
    const productionDetails: FiscalDocumentDetails = {
      ...fiscalDetails,
      document: { ...fiscalDetails.document, ambiente: 1, status: 'autorizada' },
    };
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(productionDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFCe_000615.png', { type: 'image/png' })
    );

    render(
      <IssuedFiscalDocumentDetailsModal
        documentId={productionDetails.document.id}
        initialEnvironment={1}
        fullScreen
        onClose={vi.fn()}
      />
    );

    await screen.findByText('VENDA DE MERCADORIA');
    expect(screen.getByRole('dialog').className).toContain('max-w-none');
    expect(screen.getAllByText('Produção').length).toBeGreaterThan(0);
    expect(screen.getByText('Autorizada')).toBeTruthy();
  });

  it('imprime DANFE, baixa XML, compartilha arquivo e fecha o modal', async () => {
    const onClose = vi.fn();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true),
    });
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(fiscalDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFCe_000615.png', { type: 'image/png' })
    );
    vi.mocked(printDanfe).mockResolvedValueOnce(undefined);
    vi.mocked(downloadXml).mockResolvedValueOnce(undefined);

    render(
      <IssuedFiscalDocumentDetailsModal
        emissionResult={emissionResult}
        order={order}
        onClose={onClose}
      />
    );

    await screen.findByText('VENDA DE MERCADORIA');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Compartilhar DANFE' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir DANFE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Baixar XML' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar DANFE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar detalhes da nota fiscal' }));

    await waitFor(() => {
      expect(printDanfe).toHaveBeenCalledWith(fiscalDetails.document);
      expect(downloadXml).toHaveBeenCalledWith(fiscalDetails.document);
      expect(share).toHaveBeenCalledWith({
        files: [expect.any(File)],
        title: 'DANFE NFC-e 615',
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('exibe a aba Transporte de forma humanizada para modFrete = 3 sem vazar código cru nem cards vazios', async () => {
    const transportDetails: FiscalDocumentDetails = {
      ...fiscalDetails,
      parsedXml: {
        ...fiscalDetails.parsedXml!,
        transport: {
          modFrete: '3',
        },
      },
    };
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(transportDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFe_000615.png', { type: 'image/png' })
    );

    render(
      <IssuedFiscalDocumentDetailsModal
        document={transportDetails.document}
        onClose={vi.fn()}
      />
    );

    await screen.findByText('VENDA DE MERCADORIA');
    fireEvent.click(screen.getByRole('tab', { name: 'Transporte' }));

    // Deve exibir rótulo e valor legíveis para modFrete = 3
    expect(screen.getByText('Transporte próprio da empresa')).toBeTruthy();
    expect(
      screen.getByText(/Transporte próprio por conta do remetente/)
    ).toBeTruthy();

    // NUNCA deve expor código cru nem tag do XML
    expect(screen.queryByText('modFrete')).toBeNull();
    expect(screen.queryByText('MODFRETE')).toBeNull();

    // Como não há transportador, veículo nem volumes cadastrados, não deve criar cards vazios
    expect(screen.queryByText('Dados da transportadora')).toBeNull();
    expect(screen.queryByText('Veículo de transporte')).toBeNull();
    expect(screen.queryByText('Volumes e pesos')).toBeNull();
    expect(
      screen.getByText(
        'Sem informações adicionais de transportador, veículo ou volumes para esta operação.'
      )
    ).toBeTruthy();
  });

  it('exibe indicador de IE e origem do item traduzidos nas abas de Cliente e Itens', async () => {
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(fiscalDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFCe_000615.png', { type: 'image/png' })
    );

    render(
      <IssuedFiscalDocumentDetailsModal
        document={fiscalDetails.document}
        onClose={vi.fn()}
      />
    );

    await screen.findByText('VENDA DE MERCADORIA');

    // Aba Cliente: indIEDest = 9 deve mostrar "Não contribuinte"
    fireEvent.click(screen.getByRole('tab', { name: 'Cliente' }));
    expect(screen.getByText('Não contribuinte')).toBeTruthy();

    // Aba Itens: origem 0 deve mostrar "Nacional", não "origem 0"
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText(/Nacional/)).toBeTruthy();
    expect(screen.queryByText(/origem 0/)).toBeNull();
  });

  it('renderiza NF-e 55 completa com as 6 abas: Resumo com NFref, Cliente com local de entrega, Itens com tributação, Pagamento com duplicatas e Eventos SEFAZ', async () => {
    const fullNfeDetails: FiscalDocumentDetails = {
      document: {
        id: 'fiscal-doc-nfe-625',
        order_id: 'order-999',
        numero_nfe: 625,
        serie: '1',
        chave_acesso: '41261044512248000107550010000006251000006250',
        modelo: '55',
        ambiente: 1,
        status: 'autorizada',
        numero_protocolo: '141269999999999',
        valor_total: 2250,
        destinatario_nome: 'Móveis & Cia Ltda',
        destinatario_documento: '00000000000191',
        created_at: '2026-10-05T14:00:00.000Z',
        updated_at: '2026-10-05T14:00:00.000Z',
        xml_nfe: '<NFe />',
        xml_protocolo: '<protNFe />',
      },
      events: [
        {
          id: 'event-01',
          event_type: '110110',
          status: 'registrado',
          requested_at: '2026-10-05T15:00:00.000Z',
          attempt_number: 1,
          cstat: '135',
          xmotivo: 'Evento registrado e vinculado a NF-e',
          requested_by: 'admin',
          protocol_number: '141268888888888',
          justification: 'Correção do endereço de entrega e dados do transportador.',
        },
      ],
      parsedXml: {
        general: {
          natureOperation: 'DEVOLUCAO DE MERCADORIA',
          issueDate: '2026-10-05T14:00:00-03:00',
          model: '55',
          series: '1',
          number: '625',
          purpose: '4',
          referencedKey: '41261044512248000107550010000005001000005001',
          exitDate: '2026-10-05T16:00:00-03:00',
          operationType: '1',
          destination: '1',
          finalConsumer: '0',
          presence: '1',
          total: '2250.00',
          additionalInfo: 'Devolução parcial referente à NF-e de entrada 500.',
        },
        recipient: {
          name: 'Móveis & Cia Ltda',
          taxId: '00000000000191',
          stateRegistration: '123456789',
          stateRegistrationIndicator: '1',
          email: 'contato@moveisecia.com.br',
          phone: '4133334444',
          street: 'Av Central',
          number: '500',
          complement: '',
          district: 'Centro',
          municipality: 'Curitiba',
          municipalityCode: '4106902',
          state: 'PR',
          postalCode: '80000000',
          country: 'Brasil',
          deliveryAddress: {
            street: 'Rua do Galpão',
            number: '99',
            district: 'Industrial',
            municipality: 'São José dos Pinhais',
            state: 'PR',
            postalCode: '83000000',
          },
        },
        items: [
          {
            code: 'SOFA-02',
            description: 'Sofá Retrátil 3 Lugares',
            quantity: '2.0000',
            unit: 'UN',
            unitValue: '1000.00',
            discount: '0.00',
            total: '2000.00',
            ncm: '94016100',
            cest: '2803800',
            ean: '7891234567890',
            cfop: '5202',
            cst: '00',
            origin: '0',
            icmsBase: '2000.00',
            icmsRate: '18.00',
            icmsValue: '360.00',
            ipiRate: '5.00',
            ipiValue: '100.00',
            pisRate: '1.65',
            pisValue: '33.00',
            cofinsRate: '7.60',
            cofinsValue: '152.00',
          },
        ],
        totals: [
          { label: 'Produtos', value: '2000.00', isTaxDetail: false },
          { label: 'Frete', value: '100.00', isTaxDetail: false },
          { label: 'Total da NF-e', value: '2250.00', isTaxDetail: false },
          { label: 'Base de Cálculo do ICMS', value: '2000.00', isTaxDetail: true },
          { label: 'Valor do ICMS', value: '360.00', isTaxDetail: true },
        ],
        transport: {
          modFrete: '3',
          freightValue: '100.00',
          vehiclePlate: 'XYZ1234',
          vehicleState: 'PR',
          vehicleRntc: '12345678',
        },
        payments: [
          {
            method: 'Cartão de crédito',
            value: '2300.00',
            card: {
              brand: 'Visa',
              integration: 'TEF / Integrado',
              authorization: '987654',
            },
          },
        ],
        installments: [
          { number: '001', dueDate: '2026-11-05', value: '1125.00' },
          { number: '002', dueDate: '2026-12-05', value: '1125.00' },
        ],
        changeValue: '50.00',
      },
    };

    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(fullNfeDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFe_000625.png', { type: 'image/png' })
    );

    render(
      <IssuedFiscalDocumentDetailsModal
        document={fullNfeDetails.document}
        onClose={vi.fn()}
      />
    );

    await screen.findByText('DEVOLUCAO DE MERCADORIA');

    // 1. Aba Resumo
    // Header
    expect(screen.getByText(/NF-e nº 625 · Série 1/)).toBeTruthy();
    expect(screen.getAllByText('Produção').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Autorizada').length).toBeGreaterThan(0);

    // Finalidade mapeada
    expect(screen.getByText('Devolução de mercadoria')).toBeTruthy();
    // Documento referenciado em destaque
    expect(screen.getByText(/Documento de origem referenciado/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Copiar chave referenciada/i })).toBeTruthy();
    // Saída da mercadoria
    expect(screen.getByText('Saída da mercadoria')).toBeTruthy();

    // 2. Aba Cliente
    fireEvent.click(screen.getByRole('tab', { name: 'Cliente' }));
    expect(screen.getByText('Móveis & Cia Ltda')).toBeTruthy();
    expect(screen.getByText(/Av Central, 500/)).toBeTruthy();
    expect(screen.getByText('Curitiba - PR')).toBeTruthy();
    // Local de entrega alternativo destacado
    expect(screen.getByText(/Local de entrega \(endereço diferenciado\)/)).toBeTruthy();
    expect(screen.getByText(/Rua do Galpão, 99/)).toBeTruthy();
    expect(screen.getByText('São José dos Pinhais - PR')).toBeTruthy();

    // 3. Aba Itens
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText('Sofá Retrátil 3 Lugares')).toBeTruthy();
    expect(screen.getByText('NCM 94016100')).toBeTruthy();
    expect(screen.getByText('CFOP 5202')).toBeTruthy();
    expect(screen.getByText('CEST 2803800')).toBeTruthy();
    expect(screen.getByText('EAN 7891234567890')).toBeTruthy();

    // Expandir accordion de tributação
    const taxButton = screen.getByRole('button', { name: /Ver tributação/i });
    fireEvent.click(taxButton);
    expect(screen.getByText(/Alíquota: 18/)).toBeTruthy();
    expect(screen.getByText(/Alíquota: 5/)).toBeTruthy();

    // 4. Aba Pagamento
    fireEvent.click(screen.getByRole('tab', { name: 'Pagamento' }));
    expect(screen.getByText('Cartão de crédito')).toBeTruthy();
    expect(screen.getByText('Bandeira:')).toBeTruthy();
    expect(screen.getByText('Visa')).toBeTruthy();
    expect(screen.getByText(/TEF \/ Integrado/)).toBeTruthy();
    expect(screen.getByText('987654')).toBeTruthy();
    expect(screen.getByText('Troco em dinheiro')).toBeTruthy();
    expect(screen.getByText(/50,00/)).toBeTruthy();
    // Parcelas / Duplicatas (exibidas na tabela desktop e nos cards mobile)
    expect(screen.getAllByText(/001ª parcela/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/002ª parcela/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.125,00/).length).toBeGreaterThan(0);

    // 5. Aba Transporte
    fireEvent.click(screen.getByRole('tab', { name: 'Transporte' }));
    expect(screen.getByText('Transporte próprio da empresa')).toBeTruthy();
    expect(screen.getByText(/100,00/)).toBeTruthy();
    expect(screen.getByText(/XYZ1234/)).toBeTruthy();
    expect(screen.getByText('12345678')).toBeTruthy(); // RNTC

    // 6. Aba Eventos
    const eventsTab = screen.getByRole('tab', { name: /Eventos/ });
    expect(eventsTab.textContent).toContain('1');
    fireEvent.click(eventsTab);
    expect(screen.getByText('Carta de Correção Eletrônica (CC-e)')).toBeTruthy();
    expect(screen.getByText(/Correção do endereço de entrega/)).toBeTruthy();
    expect(screen.getByText('141268888888888')).toBeTruthy();
  });

  it('renderiza NFC-e com consumidor não identificado sem quebrar', async () => {
    const anonymousNfceDetails: FiscalDocumentDetails = {
      ...fiscalDetails,
      parsedXml: {
        ...fiscalDetails.parsedXml!,
        recipient: {
          name: '',
          taxId: '',
          stateRegistration: '',
          stateRegistrationIndicator: '',
          email: '',
          phone: '',
          street: '',
          number: '',
          complement: '',
          district: '',
          municipality: '',
          municipalityCode: '',
          state: '',
          postalCode: '',
          country: '',
        },
      },
      events: [],
    };
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(anonymousNfceDetails);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(
      new File(['danfe'], 'DANFE_NFCe_000615.png', { type: 'image/png' })
    );

    render(
      <IssuedFiscalDocumentDetailsModal
        document={anonymousNfceDetails.document}
        onClose={vi.fn()}
      />
    );

    await screen.findByText('VENDA DE MERCADORIA');
    fireEvent.click(screen.getByRole('tab', { name: 'Cliente' }));
    expect(screen.getByText('Consumidor não identificado')).toBeTruthy();
    expect(screen.getByText(/sem identificação do destinatário/)).toBeTruthy();

    // Aba Eventos vazia
    fireEvent.click(screen.getByRole('tab', { name: 'Eventos' }));
    expect(screen.getByText('Nenhum evento registrado')).toBeTruthy();
  });
});
