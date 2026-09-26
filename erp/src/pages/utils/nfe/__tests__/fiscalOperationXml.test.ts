import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../../settingsService';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { buildReviewedFiscalOperationXml, normalizeReviewedFiscalBlock, type ReviewedFiscalOperationXmlInput } from '../fiscalOperationXml';
import { buildIdeXml } from '../xml/xmlEmitterBlock';
import { validateNfeAgainstOfficialSchema } from '../../../../../../api/nfe/schemaValidator';
import { signNfeXml } from '../../../../../../api/nfe/nfeSigner';
import { parseAuthorizedInvoiceLines } from '../invoiceLineSnapshot';
import forge from 'node-forge';

const issuedAt = '2026-09-26T12:00:00-03:00';
const settings = {
    companyCnpj: '44512248000107', companyName: 'Móveis Morante', companyIE: '9091234567', companyCRT: '1',
    companyCEP: '83410270', companyBairro: 'Guaraituba', companyXMun: 'Colombo', companyCMun: '4105805',
    companyUF: 'PR', companyLogradouro: 'R. Cascavel', companyNumero: '306',
} as AppSettings;
const key = generateNfeAccessKey({ ufCode: '41', yearMonth: '2609', cnpj: settings.companyCnpj,
    model: '55', series: '1', number: 701, emissionType: '1', randomCode: '12345678' });
const sourceKey = generateNfeAccessKey({ ufCode: '41', yearMonth: '2609', cnpj: settings.companyCnpj,
    model: '55', series: '1', number: 700, emissionType: '1', randomCode: '87654321' }).accessKey;

const input = (kind: 'estorno' | 'return'): ReviewedFiscalOperationXmlInput => ({
    kind, environment: 1, originalEnvironment: 1, originalStatus: 'autorizada',
    originalProtocol: '141260000000001', originalAccessKey: sourceKey,
    accessKey: key.accessKey, randomCode: key.randomCode, checkDigit: key.checkDigit,
    nfeNumber: 701, series: '1', issuedAt, settings,
    natureOfOperation: kind === 'estorno' ? 'Nota Fiscal de Estorno' : 'Devolucao de mercadoria',
    recipientXml: '<dest><CPF>12345678901</CPF><xNome>Cliente</xNome></dest>',
    totalsXml: '<total><ICMSTot><vProd>100.00</vProd><vDesc>10.00</vDesc><vNF>90.00</vNF></ICMSTot></total>',
    transportXml: '<transp><modFrete>9</modFrete></transp>',
    paymentXml: '<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>',
    reason: 'Operacao nao realizada e prazo de cancelamento vencido.',
    lines: [{ originalItemNumber: 2, billedQuantity: 4,
        originalGrossValue: kind === 'estorno' ? 100 : 400,
        originalDiscountValue: kind === 'estorno' ? 10 : 40,
        quantity: kind === 'estorno' ? 4 : 1,
        grossValue: 100, discountValue: 10, cfop: '1202',
        productXml: `<prod><cProd>A</cProd><xProd>Colchao</xProd><NCM>94042900</NCM><CFOP>1202</CFOP><qCom>${kind === 'estorno' ? '4.0000' : '1.0000'}</qCom><vProd>100.00</vProd><vDesc>10.00</vDesc></prod>`,
        taxesXml: '<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto>',
    }],
});

describe('prévia estrutural do XML fiscal revisado', () => {
    it('estorno usa finalidade 3 e referência da NF-e original no cabeçalho', () => {
        const xml = buildReviewedFiscalOperationXml(input('estorno'));
        expect(xml).toContain('<finNFe>3</finNFe>');
        expect(xml).toContain('<tpNF>0</tpNF>');
        expect(xml).toContain(`<NFref><refNFe>${sourceKey}</refNFe></NFref>`);
        expect(xml).not.toContain('<DFeReferenciado>');
        expect(xml).toContain('art. 298 do RICMS');
    });

    it('devolução usa finalidade 4 e referência da origem por item, sem NFref', () => {
        const xml = buildReviewedFiscalOperationXml(input('return'));
        expect(xml).toContain('<finNFe>4</finNFe>');
        expect(xml).toContain(`<DFeReferenciado><chaveAcesso>${sourceKey}</chaveAcesso><nItem>2</nItem></DFeReferenciado>`);
        expect(xml).not.toContain('<NFref>');
        expect(xml.indexOf('<DFeReferenciado>')).toBeGreaterThan(xml.indexOf('</imposto>'));
        expect(() => buildIdeXml({ accessKey: key.accessKey, randomCode: key.randomCode,
            checkDigit: key.checkDigit, nfeNumber: 701, series: '1', model: '55',
            environment: 1, dhEmi: issuedAt, finalidade: 4,
            referencedAccessKey: sourceKey })).toThrow(/apenas para estorno/);
    });

    it('bloqueia origem sem autorização/protocolo e CFOP de saída', () => {
        expect(() => buildReviewedFiscalOperationXml({ ...input('return'), originalProtocol: '' })).toThrow(/original/);
        const draft = input('return');
        draft.lines[0].cfop = '5102';
        expect(() => buildReviewedFiscalOperationXml(draft)).toThrow(/CFOP/);
    });

    it('aceita CFOP de entrada interestadual confirmado por item', () => {
        const interstate = input('return');
        interstate.lines[0].cfop = '2202';
        interstate.lines[0].productXml = interstate.lines[0].productXml.replace('1202', '2202');
        expect(buildReviewedFiscalOperationXml(interstate)).toContain('<CFOP>2202</CFOP>');
    });

    it('bloqueia valor, quantidade e XML não revisados', () => {
        const value = input('return');
        value.lines[0].grossValue = 99;
        expect(() => buildReviewedFiscalOperationXml(value)).toThrow(/proporcional/);
        const quantity = input('return');
        quantity.lines[0].quantity = 5;
        expect(() => buildReviewedFiscalOperationXml(quantity)).toThrow(/quantidade/);
        const taxes = input('return');
        taxes.lines[0].taxesXml = '<imposto><!DOCTYPE x></imposto>';
        expect(() => buildReviewedFiscalOperationXml(taxes)).toThrow(/imposto/);
    });

    it('não aceita prévia incompleta como XML pronto para transmissão', async () => {
        await expect(validateNfeAgainstOfficialSchema(buildReviewedFiscalOperationXml(input('return'))))
            .rejects.toThrow(/schema oficial/);
    });

    it.each(['return', 'estorno'] as const)('valida um XML completo de %s assinado no schema oficial 010f', async (kind) => {
        const complete = input(kind);
        const quantity = kind === 'estorno' ? '4.0000' : '1.0000';
        const unitValue = kind === 'estorno' ? '25.0000' : '100.0000';
        complete.recipientXml = `<dest><CPF>12345678909</CPF><xNome>Cliente Teste</xNome><enderDest>
            <xLgr>Rua Teste</xLgr><nro>10</nro><xBairro>Centro</xBairro><cMun>4105805</cMun>
            <xMun>Colombo</xMun><UF>PR</UF><CEP>83410270</CEP><cPais>1058</cPais><xPais>BRASIL</xPais>
            </enderDest><indIEDest>9</indIEDest></dest>`;
        complete.lines[0].productXml = `<prod><cProd>A</cProd><cEAN>SEM GTIN</cEAN><xProd>Colchao</xProd>
            <NCM>94042900</NCM><CFOP>1202</CFOP><uCom>UN</uCom><qCom>${quantity}</qCom>
            <vUnCom>${unitValue}</vUnCom><vProd>100.00</vProd><cEANTrib>SEM GTIN</cEANTrib>
            <uTrib>UN</uTrib><qTrib>${quantity}</qTrib><vUnTrib>${unitValue}</vUnTrib>
            <vDesc>10.00</vDesc><indTot>1</indTot></prod>`;
        complete.lines[0].taxesXml = `<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
            <PIS><PISOutr><CST>49</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>
            <COFINS><COFINSOutr><CST>49</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto>`;
        complete.totalsXml = `<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson>
            <vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST>
            <vFCPSTRet>0.00</vFCPSTRet><vProd>100.00</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg>
            <vDesc>10.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>
            <vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>90.00</vNF>
            </ICMSTot></total>`;
        const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
        const signed = signNfeXml(buildReviewedFiscalOperationXml(complete),
            forge.pki.privateKeyToPem(keyPair.privateKey), Buffer.from('certificado de teste').toString('base64'));
        const parsedLine = parseAuthorizedInvoiceLines(signed)[0];
        expect(parsedLine.productXml).toBe(normalizeReviewedFiscalBlock(complete.lines[0].productXml, 'prod'));
        expect(parsedLine.taxesXml).toBe(normalizeReviewedFiscalBlock(complete.lines[0].taxesXml, 'imposto'));
        await validateNfeAgainstOfficialSchema(signed);
    });
});
