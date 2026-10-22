// HTML/SVG generation and XML parsing use the supported Node fallback; no DOM is required.
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateDanfeHtml, DanfeData } from '../danfeGenerator';
import { buildDanfeRecipientOfficialHtml } from '../danfe/danfeRecipient';
import { buildDanfeTaxesAndTotalsOfficialHtml } from '../danfe/danfeTaxesAndTotals';
import { buildDanfeTransportOfficialHtml } from '../danfe/danfeTransport';
import { buildDanfeAdditionalInfoOfficialHtml } from '../danfe/danfeAdditionalInfo';
import { parseFiscalXmlDetails } from '@/pages/App/FiscalDocuments/utils/fiscalXmlParser';
import Order from '@/pages/types/order.type';
import { AppSettings } from '../../settingsService';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { getDanfeNfceA4UnavailableReason } from '../danfe/danfeNfceA4';

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
        <ide><cUF>41</cUF><natOp>VENDA TESTE XML</natOp><dhEmi>2026-10-01T15:20:30-03:00</dhEmi><dhSaiEnt>2026-10-01T18:45:00-03:00</dhSaiEnt><tpNF>0</tpNF><idDest>1</idDest><tpAmb>2</tpAmb><mod>55</mod><serie>3</serie><nNF>77</nNF><tpEmis>1</tpEmis></ide>
        <emit><CNPJ>44512248000107</CNPJ><xNome>EMITENTE DO XML LTDA</xNome><IE>1234567890</IE><IEST>9876543210</IEST><enderEmit><xLgr>Rua XML</xLgr><nro>55</nro><xBairro>Centro XML</xBairro><xMun>Colombo XML</xMun><UF>PR</UF><CEP>83410000</CEP><fone>4133334444</fone></enderEmit></emit>
        <dest><CPF>12345678900</CPF><xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome><enderDest><xLgr>Rua Destino XML</xLgr><nro>10</nro><xBairro>Bairro XML</xBairro><xMun>Curitiba XML</xMun><UF>PR</UF><CEP>80000000</CEP><fone>4199999999</fone></enderDest></dest>
        <det nItem="1"><prod><cProd>SKU-XML</cProd><xProd>PRODUTO DO XML</xProd><NCM>94016100</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>2.0000</qCom><vUnCom>60.0000</vUnCom><vProd>120.00</vProd><vDesc>3.00</vDesc></prod><imposto><ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>80.00</vBC><pICMS>18.00</pICMS><vICMS>14.40</vICMS></ICMS00></ICMS><IPI><IPITrib><pIPI>4.00</pIPI><vIPI>5.00</vIPI></IPITrib></IPI></imposto></det>
        <total><ICMSTot><vBC>80.00</vBC><vICMS>14.40</vICMS><vBCST>0.00</vBCST><vST>0.00</vST><vProd>120.00</vProd><vFrete>10.00</vFrete><vSeg>2.00</vSeg><vDesc>3.00</vDesc><vOutro>4.00</vOutro><vIPI>5.00</vIPI><vNF>138.00</vNF></ICMSTot></total>
        <transp><modFrete>0</modFrete><transporta><CNPJ>12345678000199</CNPJ><xNome>TRANSPORTADORA DO XML</xNome><IE>123123123</IE><xEnder>Rua Transportadora</xEnder><xMun>São José dos Pinhais</xMun><UF>PR</UF></transporta><veicTransp><placa>ABC1234</placa><UF>PR</UF><RNTC>ANTT-7</RNTC></veicTransp><vol><qVol>2</qVol><esp>CAIXAS</esp><marca>MARCA XML</marca><nVol>1-2</nVol><pesoB>20.000</pesoB><pesoL>18.000</pesoL></vol></transp>
        <cobr><fat><nFat>FAT-77</nFat><vOrig>138.00</vOrig><vDesc>0.00</vDesc><vLiq>138.00</vLiq></fat><dup><nDup>001</nDup><dVenc>2026-10-30</dVenc><vDup>138.00</vDup></dup></cobr>
        <pag><detPag><tPag>01</tPag><vPag>138.00</vPag></detPag><vTroco>0.00</vTroco></pag>
        <infAdic><infAdFisco>RESERVADO PARA O FISCO</infAdFisco><infCpl>INFORMAÇÃO COMPLEMENTAR DO XML</infCpl></infAdic>
      </infNFe></NFe>
    </nfeProc>`;

  const nfceAccessKey = generateNfeAccessKey({
    ufCode: '41',
    yearMonth: '2610',
    cnpj: '44512248000107',
    model: '65',
    series: '3',
    number: '77',
    emissionType: '1',
    randomCode: '12345678',
  }).accessKey;

  const authorizedNfceXml = authorizedHmlXml
    .replace('<NFe><infNFe>', `<NFe><infNFe Id="NFe${nfceAccessKey}">`)
    .replace('<mod>55</mod>', '<mod>65</mod>')
    .replace(
      '</infNFe></NFe>',
      `</infNFe><infNFeSupl><qrCode>https://www.fazenda.pr.gov.br/nfce/qrcode?p=${nfceAccessKey}|2|2|1|${'A'.repeat(40)}</qrCode><urlChave>https://www.fazenda.pr.gov.br/nfce/consulta</urlChave></infNFeSupl></NFe>`
    );

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

    it.each([1, 2] as const)('imprime o infCpl do XML no rodapé da NFC-e no ambiente %s', (environment) => {
      const complementaryInfo = 'Taxas de pagamento: R$ 4,00. Serviço: montagem.\nObservação: A & B <script>alert("teste")</script>.';
      const xml = authorizedHmlXml
        .replace('<mod>55</mod>', '<mod>65</mod>')
        .replace('<tpAmb>2</tpAmb>', `<tpAmb>${environment}</tpAmb>`)
        .replace('INFORMAÇÃO COMPLEMENTAR DO XML', 'Taxas de pagamento: R$ 4,00. Serviço: montagem.\nObservação: A &amp; B &lt;script&gt;alert(&quot;teste&quot;)&lt;/script&gt;.');
      const fiscalDetails = parseFiscalXmlDetails(xml)!;
      const snapshot = JSON.stringify(fiscalDetails);

      const html = generateDanfeHtml({ ...baseDanfeData, model: '65', environment, fiscalDetails });

      expect(fiscalDetails.general.additionalInfo).toBe(complementaryInfo);
      expect(html).toContain('INFORMAÇÕES COMPLEMENTARES');
      expect(html).toContain('Taxas de pagamento: R$ 4,00. Serviço: montagem.');
      expect(html).toContain('Observação: A &amp; B &lt;script&gt;alert(&quot;teste&quot;)&lt;/script&gt;.');
      expect(html).not.toContain('<script>alert(');
      expect(html).not.toContain('Entregar no período da tarde');
      expect(html).not.toContain('RESERVADO PARA O FISCO');
      expect(html.indexOf('INFORMAÇÕES COMPLEMENTARES')).toBeGreaterThan(html.indexOf('Protocolo de autorização:'));
      expect(html.indexOf('INFORMAÇÕES COMPLEMENTARES')).toBeLessThan(html.indexOf('Obrigado pela preferência'));
      expect(JSON.stringify(fiscalDetails)).toBe(snapshot);
    });

    it.each(['', '   \n  '])('omite a seção complementar da NFC-e quando o infCpl está vazio (%j)', (content) => {
      const fiscalDetails = parseFiscalXmlDetails(authorizedHmlXml
        .replace('<mod>55</mod>', '<mod>65</mod>')
        .replace('INFORMAÇÃO COMPLEMENTAR DO XML', content))!;

      const html = generateDanfeHtml({ ...baseDanfeData, model: '65', fiscalDetails });

      expect(html).not.toContain('INFORMAÇÕES COMPLEMENTARES');
      expect(html).not.toContain('Entregar no período da tarde');
      expect(html).toContain('DANFE NFC-e');
    });

    it('não inventa informações complementares na NFC-e sem infCpl ou sem XML', () => {
      const fiscalDetails = parseFiscalXmlDetails(authorizedHmlXml
        .replace('<mod>55</mod>', '<mod>65</mod>')
        .replace('<infCpl>INFORMAÇÃO COMPLEMENTAR DO XML</infCpl>', ''))!;

      for (const details of [fiscalDetails, undefined]) {
        const html = generateDanfeHtml({ ...baseDanfeData, model: '65', fiscalDetails: details });
        expect(html).not.toContain('INFORMAÇÕES COMPLEMENTARES');
        expect(html).not.toContain('Entregar no período da tarde');
      }
    });

    it('gera o DANFE NFC-e A4 com paginação nativa, QR vetorial e infCpl sem forçar bloco longo em uma página', () => {
      const parsed = parseFiscalXmlDetails(authorizedNfceXml.replace('INFORMAÇÃO COMPLEMENTAR DO XML', 'Informação complementar do XML'))!;
      parsed.general.additionalInfo = Array.from({ length: 80 }, (_, index) => `Linha complementar ${index + 1}`).join('\n');

      const html = generateDanfeHtml({
        ...baseDanfeData,
        model: '65',
        accessKey: nfceAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        printFormat: 'a4',
        fiscalDetails: parsed,
      });

      expect(html).toContain('<title>DANFE NFC-e - Nº 77 (A4)</title>');
      expect(html).toContain('size: A4 portrait;');
      expect(html).toContain('margin: 10mm;');
      expect(html).toContain('display: table-header-group;');
      expect(html).toContain('break-inside: avoid;');
      expect(html).toContain('width: 37mm;');
      expect(html).toContain('padding: 3mm;');
      expect(html).toContain('<svg');
      expect(html).toContain('PRODUTO DO XML');
      expect(html).toContain('Linha complementar 1');
      expect(html).toContain('Linha complementar 80');
      expect(html).toContain('.additional-info-section {');
      expect(html).toContain('break-inside: auto;');
      expect(html).toContain('RESERVADO PARA O FISCO');
      expect(html).toContain('/images/logo-morante.svg');
      expect(html).toContain('44.512.248/0001-07');
      expect(html).toContain('https://www.fazenda.pr.gov.br/nfce/consulta');
      expect(html).toContain('EMITENTE DO XML LTDA');
      expect(html).not.toContain('MÓVEIS MORANTE LTDA');
      expect(html).toContain('Rua XML, 55');
      expect(html).toContain('Colombo XML - PR');
      expect(html).not.toContain('Troco');
      expect(html).not.toContain('Obrigado pela preferência');
      expect(html).not.toContain('MoranteHub ERP · Sistema de Gestão Empresarial');
      expect(html).not.toContain('Informação dos Tributos Totais Incidentes');
      expect(html).not.toContain('additional-info-section avoid-break');
    });

    it('organiza o cabeçalho, consumidor, CFOP e pagamentos do XML no A4', () => {
      const xmlWithMultiplePayments = authorizedNfceXml
        .replace(
          '<detPag><tPag>01</tPag><vPag>138.00</vPag></detPag>',
          '<detPag><tPag>01</tPag><vPag>100.00</vPag></detPag><detPag><tPag>03</tPag><vPag>38.00</vPag></detPag>'
        )
        .replace(
          '<xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome>',
          '<xNome>Maria da Silva</xNome>'
        );
      const parsed = parseFiscalXmlDetails(xmlWithMultiplePayments)!;
      parsed.items[0].description = 'Descrição de móvel com embalagem longa '.repeat(12);

      const html = generateDanfeHtml({
        ...baseDanfeData,
        model: '65',
        accessKey: nfceAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        printFormat: 'a4',
        fiscalDetails: parsed,
      });
      const documentMarkup = html.slice(html.indexOf('<main'));
      expect(documentMarkup.indexOf('EMITENTE DO XML LTDA')).toBeLessThan(documentMarkup.indexOf('DANFE NFC-e'));
      expect(documentMarkup.indexOf('DANFE NFC-e')).toBeLessThan(documentMarkup.indexOf('Chave de acesso'));
      expect(documentMarkup.indexOf('Chave de acesso')).toBeLessThan(documentMarkup.indexOf('Dados do Consumidor'));
      expect(html).toContain('CFOP');
      expect(html).toContain('5102');
      expect(html).toContain('Maria da Silva');
      expect(html).toContain('Rua Destino XML, 10');
      expect(html).toContain('Descrição de móvel com embalagem longa');
      expect(html).toContain('Seguro:');
      expect(html).toContain('100,00');
      expect(html).toContain('38,00');
      expect(html).toContain('Valor pago');
      expect(html).toContain('138,00');
      expect(html).toContain('Homologação (tpAmb=2)');
      expect(html).not.toContain('ISSQN');
      expect(html).not.toContain('BASE DE CÁLCULO ICMS');
    });

    it('identifica consumidor ausente sem reaproveitar um nome genérico como identificação', () => {
      const anonymousXml = authorizedNfceXml
        .replace('<CPF>12345678900</CPF>', '')
        .replace(
          '<xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome>',
          '<xNome>Consumidor Final</xNome>'
        );
      const fiscalDetails = parseFiscalXmlDetails(anonymousXml)!;
      const html = generateDanfeHtml({
        ...baseDanfeData,
        model: '65',
        accessKey: nfceAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        printFormat: 'a4',
        fiscalDetails,
      });

      expect(html).toContain('Consumidor não identificado');
      expect(html).toContain('CPF / CNPJ');
      expect(html).not.toContain('123.456.789-00');
    });

    it('omite as colunas NCM e CFOP quando esses dados não constam nos itens do XML', () => {
      const fiscalDetails = parseFiscalXmlDetails(authorizedNfceXml)!;
      fiscalDetails.items[0].ncm = '';
      fiscalDetails.items[0].cfop = '';
      const html = generateDanfeHtml({
        ...baseDanfeData,
        model: '65',
        accessKey: nfceAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        printFormat: 'a4',
        fiscalDetails,
      });

      expect(html).not.toContain('<th>NCM</th>');
      expect(html).not.toContain('<th>CFOP</th>');
      expect(html).toContain('<th>Descrição do Produto / Serviço</th>');
    });

    it('mostra ambiente de produção a partir do XML sem faixa de homologação', () => {
      const productionXml = authorizedNfceXml
        .replace('<tpAmb>2</tpAmb>', '<tpAmb>1</tpAmb>')
        .replace('|2|2|1|', '|2|1|1|');
      const fiscalDetails = parseFiscalXmlDetails(productionXml)!;
      const html = generateDanfeHtml({
        ...baseDanfeData,
        model: '65',
        accessKey: nfceAccessKey,
        environment: 1,
        nfeNumber: 77,
        series: '3',
        printFormat: 'a4',
        fiscalDetails,
      });

      expect(html).toContain('Produção (tpAmb=1)');
      expect(html).not.toContain('AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL');
      expect(html).not.toContain('Homologação (tpAmb=2)');
    });

    it('permite retirar o logotipo e imprime troco apenas quando há valor positivo no XML', () => {
      const fiscalDetails = parseFiscalXmlDetails(authorizedNfceXml.replace('<vTroco>0.00</vTroco>', '<vTroco>5.00</vTroco>'))!;
      const data = {
        ...baseDanfeData,
        model: '65' as const,
        accessKey: nfceAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        printFormat: 'a4' as const,
        settings: { ...mockSettings, companyDanfeLogoUrl: '' },
        fiscalDetails,
      };
      const html = generateDanfeHtml(data);

      expect(html).not.toContain('<img class="issuer-logo"');
      expect(html).toContain('issuer-card without-logo');
      expect(html).toContain('Troco');
      expect(html).toContain('5,00');
    });

    it.each([1, 20, 100])('preserva todos os itens no HTML A4 para impressão com %s produtos', (count) => {
      const parsed = parseFiscalXmlDetails(authorizedNfceXml)!;
      const sourceItem = parsed.items[0];
      parsed.items = Array.from({ length: count }, (_, index) => ({
        ...sourceItem,
        code: `SKU-${index + 1}`,
        description: `Produto de teste ${index + 1}`,
      }));
      const html = generateDanfeHtml({
        ...baseDanfeData,
        model: '65',
        accessKey: nfceAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        printFormat: 'a4',
        fiscalDetails: parsed,
      });

      expect((html.match(/<td class="text-center">\d+<\/td>/g) || []).length).toBe(count);
      expect(html).toContain(`Produto de teste ${count}`);
      expect(html).toContain('display: table-header-group;');
      expect(html).toContain('break-inside: avoid;');
    });

    it('blocks A4 when the document key does not match the authorized XML key', () => {
      const fiscalDetails = parseFiscalXmlDetails(authorizedNfceXml)!;
      const data = {
        ...baseDanfeData,
        model: '65' as const,
        accessKey: nfceAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        fiscalDetails,
      };

      expect(getDanfeNfceA4UnavailableReason(data)).toBeNull();
      expect(getDanfeNfceA4UnavailableReason({ ...data, accessKey: baseDanfeData.accessKey })).toContain('não corresponde ao documento selecionado');
      expect(getDanfeNfceA4UnavailableReason({
        ...data,
        fiscalDetails: { ...fiscalDetails, issuer: { ...fiscalDetails.issuer, stateRegistration: '' } },
      })).toContain('Inscrição Estadual do emitente');
      expect(() => generateDanfeHtml({ ...data, printFormat: 'a4', accessKey: baseDanfeData.accessKey })).toThrow('não corresponde ao documento selecionado');
    });

    it('identifica emissão em contingência e não aceita versão QR Code fora do manual vigente', () => {
      const contingencyAccessKey = generateNfeAccessKey({
        ufCode: '41',
        yearMonth: '2610',
        cnpj: '44512248000107',
        model: '65',
        series: '3',
        number: '77',
        emissionType: '9',
        randomCode: '12345678',
      }).accessKey;
      const contingencyXml = authorizedNfceXml
        .replaceAll(nfceAccessKey, contingencyAccessKey)
        .replace('<tpEmis>1</tpEmis>', '<tpEmis>9</tpEmis>')
        .replace(`|2|2|1|${'A'.repeat(40)}`, `|1|2|1|${'A'.repeat(40)}`);
      const fiscalDetails = parseFiscalXmlDetails(contingencyXml)!;
      const data = {
        ...baseDanfeData,
        model: '65' as const,
        accessKey: contingencyAccessKey,
        environment: 2,
        nfeNumber: 77,
        series: '3',
        fiscalDetails,
      };

      expect(getDanfeNfceA4UnavailableReason(data)).toContain('não corresponde à chave, versão ou ambiente');

      fiscalDetails.general.qrCode = fiscalDetails.general.qrCode.replace('|1|2|1|', '|2|2|1|');
      const html = generateDanfeHtml({ ...data, printFormat: 'a4' });
      expect(html).toContain('EMISSÃO EM CONTINGÊNCIA (9)');
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
