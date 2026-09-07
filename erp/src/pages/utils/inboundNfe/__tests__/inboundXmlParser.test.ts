import { describe, it, expect } from 'vitest';
import { parseInboundNfeXml } from '../inboundXmlParser';

describe('Inbound XML Parser (SEFAZ Layout 4.00)', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe41260912345678000190550010000012341000012345" versao="4.00">
      <ide>
        <cUF>41</cUF>
        <cNF>00001234</cNF>
        <natOp>VENDA DE MERCADORIAS</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>1234</nNF>
        <dhEmi>2026-09-07T10:00:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>ESTOFADOS FABRICA LTDA</xNome>
        <xFant>FABRICA ESTOFADOS</xFant>
      </emit>
      <dest>
        <CNPJ>44512248000107</CNPJ>
        <xNome>MOVEIS MORANTE LTDA</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>EST-001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>SOFA RETRATIL 3L SUEDE</xProd>
          <NCM>94014010</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>1500.00</vUnCom>
          <vProd>3000.00</vProd>
          <vFrete>100.00</vFrete>
        </prod>
        <imposto>
          <IPI>
            <IPITrib>
              <vIPI>50.00</vIPI>
            </IPITrib>
          </IPI>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vProd>3000.00</vProd>
          <vFrete>100.00</vFrete>
          <vIPI>50.00</vIPI>
          <vNF>3150.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    it('successfully extracts nfe key, emitter, recipient and items from Layout 4.00 XML', () => {
        const result = parseInboundNfeXml(sampleXml);

        expect(result.nfeKey).toBe('41260912345678000190550010000012341000012345');
        expect(result.nfeNumber).toBe('1234');
        expect(result.series).toBe('1');
        expect(result.emitterName).toBe('ESTOFADOS FABRICA LTDA');
        expect(result.emitterCnpj).toBe('12345678000190');
        expect(result.recipientName).toBe('MOVEIS MORANTE LTDA');
        expect(result.recipientCnpj).toBe('44512248000107');
        expect(result.totalProducts).toBe(3000);
        expect(result.totalFreight).toBe(100);
        expect(result.totalIpi).toBe(50);
        expect(result.totalInvoice).toBe(3150);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].productDescription).toBe('SOFA RETRATIL 3L SUEDE');
        expect(result.items[0].quantity).toBe(2);
        expect(result.items[0].unitCost).toBe(1500);
        expect(result.items[0].ncm).toBe('94014010');
        expect(result.items[0].freightValue).toBe(100);
        expect(result.items[0].ipiValue).toBe(50);
    });

    it('throws error when XML is invalid', () => {
        expect(() => parseInboundNfeXml('<invalid>')).toThrow();
    });

    it('throws error when access key is not 44 digits', () => {
        const invalidKeyXml = sampleXml.replace('41260912345678000190550010000012341000012345', '12345');
        expect(() => parseInboundNfeXml(invalidKeyXml)).toThrow(/44 dígitos/);
    });
});
