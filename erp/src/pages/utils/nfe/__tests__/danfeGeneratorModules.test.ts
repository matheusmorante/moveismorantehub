// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { generateDanfeHtml, DanfeData } from '../danfeGenerator';
import { buildDanfeRecipientOfficialHtml } from '../danfe/danfeRecipient';
import { buildDanfeTaxesAndTotalsOfficialHtml } from '../danfe/danfeTaxesAndTotals';
import { buildDanfeTransportOfficialHtml } from '../danfe/danfeTransport';
import { buildDanfeAdditionalInfoOfficialHtml } from '../danfe/danfeAdditionalInfo';
import { parseFiscalXmlDetails } from '@/pages/App/FiscalDocuments/utils/fiscalXmlParser';
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
        complement: '',
        observation: '',
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
    seller: 'Vendedor de teste',
    payments: [],
    date: '2026-09-24',
    shipping: {
      deliveryMethod: 'delivery',
      value: 60,
      orderType: 'sale',
      scheduling: { date: '2026-09-24', time: '14:00', type: 'fixed' },
    },
    paymentsSummary: {
      totalPaymentsFee: 0,
      totalOrderValue: 960,
      totalAmountPaid: 960,
      amountRemaining: 0,
    },
    itemsSummary: {
      totalQuantity: 2,
      itemsSubtotal: 1000,
      totalFixedDiscount: 100,
      itemsTotalValue: 900,
      totalItemsCost: 0,
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

  const authorizedHmlXml = `
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe><infNFe>
        <ide><natOp>VENDA TESTE XML</natOp><dhEmi>2026-10-01T15:20:30-03:00</dhEmi><dhSaiEnt>2026-10-01T18:45:00-03:00</dhSaiEnt><tpNF>0</tpNF><idDest>1</idDest><tpAmb>2</tpAmb><mod>55</mod><serie>3</serie><nNF>77</nNF></ide>
        <emit><CNPJ>44512248000107</CNPJ><xNome>EMITENTE DO XML LTDA</xNome><IE>1234567890</IE><IEST>9876543210</IEST><enderEmit><xLgr>Rua XML</xLgr><nro>55</nro><xBairro>Centro XML</xBairro><xMun>Colombo XML</xMun><UF>PR</UF><CEP>83410000</CEP><fone>4133334444</fone></enderEmit></emit>
        <dest><CPF>12345678900</CPF><xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome><enderDest><xLgr>Rua Destino XML</xLgr><nro>10</nro><xBairro>Bairro XML</xBairro><xMun>Curitiba XML</xMun><UF>PR</UF><CEP>80000000</CEP><fone>4199999999</fone></enderDest></dest>
        <det nItem="1"><prod><cProd>SKU-XML</cProd><xProd>PRODUTO DO XML</xProd><NCM>94016100</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>2.0000</qCom><vUnCom>60.0000</vUnCom><vProd>120.00</vProd><vDesc>3.00</vDesc></prod><imposto><ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>80.00</vBC><pICMS>18.00</pICMS><vICMS>14.40</vICMS></ICMS00></ICMS><IPI><IPITrib><pIPI>4.00</pIPI><vIPI>5.00</vIPI></IPITrib></IPI></imposto></det>
        <total><ICMSTot><vBC>80.00</vBC><vICMS>14.40</vICMS><vBCST>0.00</vBCST><vST>0.00</vST><vProd>120.00</vProd><vFrete>10.00</vFrete><vSeg>2.00</vSeg><vDesc>3.00</vDesc><vOutro>4.00</vOutro><vIPI>5.00</vIPI><vNF>138.00</vNF></ICMSTot></total>
        <transp><modFrete>0</modFrete><transporta><CNPJ>12345678000199</CNPJ><xNome>TRANSPORTADORA DO XML</xNome><IE>123123123</IE><xEnder>Rua Transportadora</xEnder><xMun>São José dos Pinhais</xMun><UF>PR</UF></transporta><veicTransp><placa>ABC1234</placa><UF>PR</UF><RNTC>ANTT-7</RNTC></veicTransp><vol><qVol>2</qVol><esp>CAIXAS</esp><marca>MARCA XML</marca><nVol>1-2</nVol><pesoB>20.000</pesoB><pesoL>18.000</pesoL></vol></transp>
        <cobr><fat><nFat>FAT-77</nFat><vOrig>138.00</vOrig><vDesc>0.00</vDesc><vLiq>138.00</vLiq></fat><dup><nDup>001</nDup><dVenc>2026-10-30</dVenc><vDup>138.00</vDup></dup></cobr>
        <infAdic><infAdFisco>RESERVADO PARA O FISCO</infAdFisco><infCpl>INFORMAÇÃO COMPLEMENTAR DO XML</infCpl></infAdic>
      </infNFe></NFe>
    </nfeProc>`;

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

    it('usa o XML autorizado como fonte dos campos impressos da DANFE', () => {
      const fiscalDetails = parseFiscalXmlDetails(authorizedHmlXml);
      expect(fiscalDetails).not.toBeNull();

      const html = generateDanfeHtml({
        ...baseDanfeData,
        nfeNumber: 77,
        series: '3',
        environment: 2,
        fiscalDetails: fiscalDetails!,
      });

      expect(html).toContain('EMITENTE DO XML LTDA');
      expect(html).toContain('VENDA TESTE XML');
      expect(html).toContain('01/10/2026');
      expect(html).toContain('18:45:00');
      expect(html).toContain('TRANSPORTADORA DO XML');
      expect(html).toContain('PRODUTO DO XML');
      expect(html).toContain('30/10/2026');
      expect(html).toContain('14,40');
      expect(html).toContain('5,00');
      expect(html).toContain('138,00');
      expect(html).toContain('INFORMAÇÃO COMPLEMENTAR DO XML');
      expect(html).toContain('RESERVADO PARA O FISCO');
      expect(html).toContain('<svg');
      expect(html).not.toContain('VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS');
      expect(html).not.toContain('960,00');
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

    it('usa o nome obrigatório de homologação no campo do destinatário', () => {
      const html = buildDanfeRecipientOfficialHtml({
        order: mockOrder,
        isHomologacao: true,
        dtEmi: '24/09/2026',
        dtSaida: '24/09/2026',
        hrSaida: '14:00',
      });

      expect(html).toContain(
        'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
      );
      expect(html).not.toContain('Consumidor da Silva');
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
        shipping: {
          deliveryMethod: 'pickup',
          value: 0,
          orderType: 'sale',
          scheduling: { date: '2026-09-24', time: '', type: 'fixed' },
        },
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
