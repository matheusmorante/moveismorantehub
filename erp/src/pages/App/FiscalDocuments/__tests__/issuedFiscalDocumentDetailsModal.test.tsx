// @vitest-environment happy-dom
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
import { registerIssuedFiscalDocumentFullNfeDetailsCase } from './issuedFiscalDocumentFullNfeDetailsCase';
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

vi.mock('../modals/NfeOperationDraftModal', () => ({ default: (props: any) => <div role="dialog" aria-label="Revisão fiscal">{props.sourceDocument.id} {props.initialDraftId}<button onClick={props.onClose}>Fechar revisão</button></div> }));

describe('IssuedFiscalDocumentDetailsModal', () => {
  it.each(['estorno', 'return'] as const)('mostra o XML do %s selecionado somente por solicitação, sem trocar pela origem nem alterar as abas', async operation_kind => {
    const xml = `<NFe><infNFe Id="${operation_kind}-selecionado" /></NFe>`;
    const issued = { ...fiscalDetails, document: { ...fiscalDetails.document, document_type: operation_kind, xml_nfe: xml } };
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(issued);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(new File(['danfe'], 'DANFE.png', { type: 'image/png' }));
    const onClose = vi.fn();
    render(<IssuedFiscalDocumentDetailsModal documentId={issued.document.id} onClose={onClose} />);
    await screen.findByText('VENDA DE MERCADORIA');
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Cliente' }));
    const openXml = screen.getByRole('button', { name: 'Ver XML' });
    openXml.focus();
    fireEvent.click(openXml);
    const field = screen.getByRole('textbox', { name: 'XML completo do documento fiscal' }) as HTMLTextAreaElement;
    expect(field.value).toBe(xml);
    expect(field.readOnly).toBe(true);
    const closeXml = screen.getByRole('button', { name: 'Fechar XML' });
    expect(document.activeElement).toBe(closeXml);
    fireEvent.keyDown(closeXml, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(field);
    fireEvent.keyDown(field, { key: 'Tab' });
    expect(document.activeElement).toBe(closeXml);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.activeElement).toBe(openXml);
    expect(screen.getByRole('tab', { name: 'Cliente' }).getAttribute('aria-selected')).toBe('true');
    expect(onClose).not.toHaveBeenCalled();
    expect(downloadXml).not.toHaveBeenCalled();
    expect(issued.document.xml_nfe).toBe(xml);
  });
  it('identifica o rascunho sem exportar a nota original e abre a revisão existente', async () => {
    const sourceDocument = { id: 'source-647', order_id: 'sale', modelo: '65' as const, ambiente: 2 as const, numero_nfe: 647, serie: '1', chave_acesso: fiscalDetails.document.chave_acesso };
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce({
      document: { ...fiscalDetails.document, id: 'draft-647', numero_nfe: 0, serie: '', chave_acesso: '', modelo: '55', status: 'pendente', document_type: 'estorno', xml_nfe: null, xml_protocolo: null, numero_protocolo: null },
      events: [], parsedXml: null,
      operationDrafts: [{ id: 'draft-647', operation_kind: 'estorno', environment: 2, status: 'draft', created_at: fiscalDetails.document.created_at, sourceDocument }],
    });
    render(<IssuedFiscalDocumentDetailsModal documentId="draft-647" onClose={vi.fn()} />);
    await screen.findByText('Rascunho em revisão');
    expect(screen.getByText(/Documento de origem: NFC-e nº 647/)).toBeTruthy();
    expect(screen.queryByText('VENDA DE MERCADORIA')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Imprimir DANFE' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Baixar XML' })).toBeNull();
    expect(createDanfeShareFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar estorno fiscal' }));
    expect(screen.getByRole('dialog', { name: 'Revisão fiscal' }).textContent).toContain('source-647 draft-647');
  });
  it.each(['estorno', 'return'] as const)('libera arquivos do %s autorizado mesmo quando documento e rascunho usam o mesmo UUID', async operation_kind => {
    const issued = { ...fiscalDetails, document: { ...fiscalDetails.document, document_type: operation_kind },
      operationDrafts: [{ id: fiscalDetails.document.id, operation_kind, environment: 2, status: 'authorized', created_at: fiscalDetails.document.created_at }],
    };
    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(issued);
    vi.mocked(createDanfeShareFile).mockResolvedValueOnce(new File(['danfe'], 'DANFE.png', { type: 'image/png' }));
    render(<IssuedFiscalDocumentDetailsModal documentId={issued.document.id} onClose={vi.fn()} />);
    const share = await screen.findByRole('button', { name: /Compartilhar DANFE/ });
    expect((share as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole('button', { name: /Baixar XML/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Revisar estorno fiscal|Revisar devolução fiscal/ })).toBeNull();
    expect(createDanfeShareFile).toHaveBeenCalledWith(issued.document);
  });
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

  registerIssuedFiscalDocumentFullNfeDetailsCase();

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

  it('renders estorno details modal with dedicated header and shows rejection reason in events tab', async () => {
    const estornoDetails: FiscalDocumentDetails = {
      document: {
        id: 'estorno-doc-1',
        numero_nfe: 644,
        serie: '1',
        chave_acesso: '41261012345678000195550010000006441000006441',
        modelo: '55',
        ambiente: 2,
        status: 'pendente',
        motivo_status: 'Nota Fiscal de Estorno (Modelo 55) preparada para regularização',
        numero_protocolo: null,
        created_at: '2026-10-14T02:05:09Z',
        updated_at: '2026-10-14T02:05:09Z',
        document_type: 'estorno',
        xml_nfe: fiscalDetails.document.xml_nfe,
        xml_protocolo: null,
        valor_total: 849,
      },
      parsedXml: fiscalDetails.parsedXml,
      events: [
        {
          id: 'event-1',
          event_type: '110111',
          status: 'rejected',
          requested_at: '2026-10-14T02:05:09Z',
          attempt_number: 1,
          cstat: null,
          xmotivo:
            'Falha local antes do envio à SEFAZ: Prazo de cancelamento da NFC-e (30 minutos no Paraná) ultrapassado. Necessário emitir NF-e de estorno (Modelo 55).',
          justification: 'Cancelamento solicitado pelo operador após cancelamento do pedido #5753.',
          requested_by: null,
          protocol_number: null,
        },
      ],
      operationDrafts: [
        {
          id: 'draft-1',
          operation_kind: 'estorno',
          environment: 2,
          status: 'draft',
          reason: 'Pedido #5753 cancelado; operação não realizada.',
          created_at: '2026-10-14T02:05:09Z',
        },
      ],
    };

    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(estornoDetails);

    render(
      <IssuedFiscalDocumentDetailsModal
        documentId="estorno-doc-1"
        orderNumber={5753}
        onClose={vi.fn()}
      />
    );

    await screen.findByText(/Detalhes da nota fiscal de estorno/);
    expect(screen.getByText(/NF-e de Estorno.*nº 644 · Série 1/)).toBeTruthy();
    expect(screen.getByText(/Pedido #5753/)).toBeTruthy();

    // Navega para aba de Eventos
    fireEvent.click(screen.getByRole('tab', { name: /Eventos/ }));
    expect(screen.getByText('Cancelamento Fiscal Rejeitado / Bloqueado')).toBeTruthy();
    expect(
      screen.getByText(
        'Falha local antes do envio à SEFAZ: Prazo de cancelamento da NFC-e (30 minutos no Paraná) ultrapassado. Necessário emitir NF-e de estorno (Modelo 55).'
      )
    ).toBeTruthy();
    expect(
      screen.getByText('Cancelamento solicitado pelo operador após cancelamento do pedido #5753.')
    ).toBeTruthy();
    expect(screen.getByText(/Orientação Fiscal:/)).toBeTruthy();
  });

  it('renderiza o aviso contextual de situação fiscal (FiscalSituationNotice) na aba Detalhes quando nova emissão é necessária', async () => {
    const detailsWithFiscalSituation: FiscalDocumentDetails = {
      ...fiscalDetails,
      linkedDocuments: [
        {
          id: 'doc-estorno-733',
          order_id: 'order-7001',
          numero_nfe: 733,
          serie: '1',
          chave_acesso: '41261044512248000107550010000007331046645952',
          modelo: '55',
          ambiente: 2,
          status: 'homologada',
          numero_protocolo: '141260000000733',
          created_at: '2026-10-19T22:15:00Z',
          updated_at: '2026-10-19T22:15:00Z',
          document_type: 'estorno',
          xml_nfe: '<nfeProc />',
        },
      ],
      fiscalSituation: {
        status: 'reissue_required',
        environment: 2,
        title: 'Nova nota fiscal necessária',
        description: 'A nota anterior foi regularizada e o pedido foi alterado. É necessário emitir a nova NF.',
        actionRequired: true,
        blockingRegularization: false,
      },
    };

    vi.mocked(fetchFiscalDocumentDetails).mockResolvedValueOnce(detailsWithFiscalSituation);

    render(
      <IssuedFiscalDocumentDetailsModal
        documentId="fiscal-document-615"
        orderNumber={7001}
        onClose={vi.fn()}
      />
    );

    await screen.findByText('Nova nota fiscal necessária');
    expect(
      screen.getByText(
        'A nota fiscal anterior foi cancelada ou estornada após a alteração do pedido. É necessário emitir uma nova nota fiscal com os dados atualizados.'
      )
    ).toBeTruthy();

    const linkedNavButton = screen.getByRole('button', { name: /Ver documentos vinculados/i });
    expect(linkedNavButton).toBeTruthy();

    // Clicar no botão navega para a aba Vinculadas
    fireEvent.click(linkedNavButton);

    const linkedTab = screen.getByRole('tab', { name: /Vinculadas/i });
    expect(linkedTab.getAttribute('aria-selected')).toBe('true');
  });
});
