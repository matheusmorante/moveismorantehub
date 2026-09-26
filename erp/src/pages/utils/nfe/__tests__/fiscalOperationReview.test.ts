import { describe, expect, it } from 'vitest';
import { buildProportionalReturnTaxesXml, buildReturnProductXml, updateFiscalOperationTotalsXml } from '../fiscalOperationReview';

describe('revisão proporcional de NF-e de devolução', () => {
    it('preserva a identidade do produto e calcula quantidade, valores e CFOP da parte devolvida', () => {
        const xml = buildReturnProductXml({
            originalProductXml: '<prod><cProd>M-01</cProd><xProd>Colchão casal</xProd><NCM>94042900</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>2.0000</qCom><vUnCom>100.0000</vUnCom><vProd>200.00</vProd><uTrib>UN</uTrib><qTrib>2.0000</qTrib><vUnTrib>100.0000</vUnTrib><vFrete>8.00</vFrete><vDesc>20.00</vDesc><indTot>1</indTot></prod>',
            quantity: 1, originalQuantity: 2, grossValue: 100, discountValue: 10, cfop: '1202',
        });

        expect(xml).toContain('<cProd>M-01</cProd>');
        expect(xml).toContain('<xProd>Colchão casal</xProd>');
        expect(xml).toContain('<NCM>94042900</NCM>');
        expect(xml).toContain('<uCom>UN</uCom>');
        expect(xml).toContain('<vUnCom>100.0000</vUnCom>');
        expect(xml).toContain('<CFOP>1202</CFOP>');
        expect(xml).toContain('<qCom>1.0000</qCom>');
        expect(xml).toContain('<qTrib>1.0000</qTrib>');
        expect(xml).toContain('<vProd>100.00</vProd>');
        expect(xml).toContain('<vDesc>10.00</vDesc>');
        expect(xml).toContain('<vFrete>4.00</vFrete>');
    });

    it('proporciona bases e valores de tributos sem alterar alíquotas/classificações', () => {
        const xml = buildProportionalReturnTaxesXml(
            '<imposto><ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>200.00</vBC><pICMS>18.0000</pICMS><vICMS>36.00</vICMS></ICMS00></ICMS></imposto>',
            1, 2,
        );
        expect(xml).toContain('<CST>00</CST>');
        expect(xml).toContain('<vBC>100.00</vBC>');
        expect(xml).toContain('<pICMS>18.0000</pICMS>');
        expect(xml).toContain('<vICMS>18.00</vICMS>');
    });

    it('recalcula os valores comerciais da devolução e deixa tributos totais revisáveis', () => {
        const xml = updateFiscalOperationTotalsXml({
            originalTotalsXml: '<total><ICMSTot><vProd>400.00</vProd><vDesc>40.00</vDesc><vFrete>0.00</vFrete><vOutro>0.00</vOutro><vICMS>72.00</vICMS><vNF>360.00</vNF></ICMSTot></total>',
            grossTotal: 100, discountTotal: 10,
        });
        expect(xml).toContain('<vProd>100.00</vProd>');
        expect(xml).toContain('<vDesc>10.00</vDesc>');
        expect(xml).toContain('<vFrete>0.00</vFrete>');
        expect(xml).toContain('<vNF>90.00</vNF>');
        expect(xml).toContain('<vICMS>72.00</vICMS>');
    });

    it('rejeita CFOP inválido e quantidades fora do faturado', () => {
        const args = { originalProductXml: '<prod><CFOP>5102</CFOP><qCom>2.0000</qCom><qTrib>2.0000</qTrib><vProd>200.00</vProd></prod>',
            quantity: 1, originalQuantity: 2, grossValue: 100, discountValue: 0, cfop: '5102' };
        expect(() => buildReturnProductXml({ ...args, cfop: '51020' })).toThrow(/CFOP/);
        expect(() => buildReturnProductXml({ ...args, cfop: '1202', quantity: 3 })).toThrow(/Quantidade/);
    });
});
