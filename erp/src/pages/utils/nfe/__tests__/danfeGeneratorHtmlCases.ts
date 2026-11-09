import { describe, expect, it } from 'vitest';
import { generateDanfeHtml, DanfeData } from '../danfeGenerator';
import { parseFiscalXmlDetails } from '@/pages/App/FiscalDocuments/utils/fiscalXmlParser';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { getDanfeNfceA4UnavailableReason } from '../danfe/danfeNfceA4';

export function registerDanfeGeneratorHtmlCases({
  baseDanfeData,
  authorizedHmlXml,
  nfceAccessKey,
  authorizedNfceXml,
  mockSettings,
}: {
  baseDanfeData: DanfeData;
  authorizedHmlXml: string;
  nfceAccessKey: string;
  authorizedNfceXml: string;
  mockSettings: DanfeData['settings'];
}) {
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
}
