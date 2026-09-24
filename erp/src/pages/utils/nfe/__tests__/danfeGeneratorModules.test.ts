import { describe, expect, it } from 'vitest';
import { generateDanfeHtml, DanfeData } from '../danfeGenerator';
import { buildDanfeRecipientOfficialHtml } from '../danfe/danfeRecipient';
import { buildDanfeTaxesAndTotalsOfficialHtml } from '../danfe/danfeTaxesAndTotals';
import { buildDanfeTransportOfficialHtml } from '../danfe/danfeTransport';
import { buildDanfeAdditionalInfoOfficialHtml } from '../danfe/danfeAdditionalInfo';
import Order from '@/pages/types/order.type';
import { AppSettings } from '../../settingsService';

describe('DANFE Generator & Submódulos de Layout Oficial MOC 7.0', () => {
    const mockOrder: Order = {
        id: 'ord-danfe-01',
        orderIndex: 4050,
        orderType: 'sale',
        status: 'fulfilled',
        observation: 'Entregar no período da tarde',
        customerData: {
            fullName: 'Consumidor da Silva',
            cpfCnpj: '123.456.789-00',
            phone: '41999998888',
            fullAddress: {
                street: 'Rua das Flores',
                number: '120',
                neighborhood: 'Centro',
                city: 'Curitiba',
                state: 'PR',
                cep: '80000-000',
            },
        },
        items: [
            {
                productId: 'prod-01',
                description: 'Cadeira Gamer Ergonomica',
                quantity: 2,
                unitPrice: 500,
                unitDiscount: 50,
                discountType: 'fixed',
            } as any,
        ],
        shipping: {
            deliveryMethod: 'delivery',
            value: 60,
        },
        paymentsSummary: {
            totalOrderValue: 960,
        },
        itemsSummary: {
            totalFixedDiscount: 100,
        },
    };

    const mockSettings: AppSettings = {
        companyName: 'MÓVEIS MORANTE LTDA',
        companyCnpj: '44.512.248/0001-07',
    } as any;

    const baseDanfeData: DanfeData = {
        order: mockOrder,
        settings: mockSettings,
        accessKey: '41260944512248000107550010000040501000040501',
        nfeNumber: 4050,
        series: '1',
        protocolNumber: '141260000123456',
        protocolDate: '24/09/2026 14:00:00',
        model: '55',
        environment: 1,
        status: 'autorizada',
    };

    describe('generateDanfeHtml', () => {
        it('gera o documento HTML completo com cabeçalho, estilos e todos os blocos oficiais', () => {
            const html = generateDanfeHtml(baseDanfeData);

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<title>DANFE NF-e - Nº 4050</title>');
            expect(html).toContain('4126 0944 5122 4800 0107 5500 1000 0040 5010 0004 0501');
            expect(html).toContain('DESTINATÁRIO / REMETENTE');
            expect(html).toContain('Consumidor da Silva');
            expect(html).toContain('CÁLCULO DO IMPOSTO');
            expect(html).toContain('TRANSPORTADOR / VOLUMES TRANSPORTADOS');
            expect(html).toContain('DADOS DOS PRODUTOS / SERVIÇOS');
            expect(html).toContain('INFORMAÇÕES COMPLEMENTARES');
            expect(html).toContain('DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL');
        });

        it('exibe marca d’água e título diferenciado em ambiente de homologação', () => {
            const htmlHomolog = generateDanfeHtml({ ...baseDanfeData, environment: 2 });

            expect(htmlHomolog).toContain('AMBIENTE DE HOMOLOGAÇÃO');
            expect(htmlHomolog).toContain('SEM VALOR FISCAL');
        });
    });

    describe('Submódulos individuais', () => {
        it('buildDanfeRecipientOfficialHtml renderiza dados do destinatário com endereço', () => {
            const html = buildDanfeRecipientOfficialHtml({
                order: mockOrder,
                isHomologacao: false,
                dtEmi: '24/09/2026',
                dtSaida: '24/09/2026',
                hrSaida: '14:00',
            });

            expect(html).toContain('Consumidor da Silva');
            expect(html).toContain('123.456.789-00');
            expect(html).toContain('Rua das Flores, 120');
            expect(html).toContain('Curitiba');
            expect(html).toContain('PR');
        });

        it('buildDanfeTaxesAndTotalsOfficialHtml renderiza totais e valores formatados', () => {
            const html = buildDanfeTaxesAndTotalsOfficialHtml({
                totalOrder: 960,
                totalProd: 1000,
                freight: 60,
                discount: 100,
            });

            expect(html).toContain('VALOR TOTAL DA NOTA');
            expect(html).toContain('960,00');
            expect(html).toContain('1.000,00');
            expect(html).toContain('60,00');
        });

        it('buildDanfeTransportOfficialHtml identifica frete por conta e modalidade', () => {
            const html = buildDanfeTransportOfficialHtml(mockOrder);
            expect(html).toContain('0-Emitente (CIF)');

            const htmlPickup = buildDanfeTransportOfficialHtml({
                ...mockOrder,
                shipping: { deliveryMethod: 'pickup' },
            });
            expect(htmlPickup).toContain('RETIRADA PELO DESTINATÁRIO');
            expect(htmlPickup).toContain('9-Sem Ocorrência de Transporte');
        });

        it('buildDanfeAdditionalInfoOfficialHtml inclui notas do simples e observações do pedido', () => {
            const html = buildDanfeAdditionalInfoOfficialHtml(mockOrder);
            expect(html).toContain('OPTANTE PELO SIMPLES NACIONAL');
            expect(html).toContain('Referente ao Pedido de Venda #4050');
            expect(html).toContain('Entregar no período da tarde');
        });
    });
});
