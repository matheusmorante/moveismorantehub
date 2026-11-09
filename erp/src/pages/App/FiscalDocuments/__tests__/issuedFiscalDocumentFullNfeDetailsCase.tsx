import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { fetchFiscalDocumentDetails } from '../services/fiscalDocumentsService';
import { createDanfeShareFile } from '../services/fiscalDanfeXmlService';
import { IssuedFiscalDocumentDetailsModal } from '../modals/IssuedFiscalDocumentDetailsModal';
import type { FiscalDocumentDetails } from '../types/fiscalDocuments.types';

export function registerIssuedFiscalDocumentFullNfeDetailsCase(): void {
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
              integration: 'Integrado',
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
    expect(screen.getByText(/^Integrado$/)).toBeTruthy();
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
}
