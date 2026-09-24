import { describe, expect, it } from 'vitest';
import { parseInboundNfeXml } from './inboundXmlParser';

const accessKey = '1'.repeat(44);
const xml = (model = '55') => `
<NFe><infNFe Id="NFe${accessKey}">
  <ide><nNF>123</nNF><mod>${model}</mod><serie>1</serie><dhEmi>2026-01-02T10:00:00-03:00</dhEmi></ide>
  <emit><CNPJ>123</CNPJ><xNome>Fornecedor Exemplo</xNome></emit>
  <dest><CNPJ>456</CNPJ><xNome>Loja Exemplo</xNome></dest>
  <det><prod><cProd>A1</cProd><xProd>Produto</xProd><NCM>123</NCM><CFOP>1102</CFOP><uCom>UN</uCom><qCom>2</qCom><vUnCom>5</vUnCom><vProd>10</vProd></prod></det>
  <total><ICMSTot><vProd>10</vProd><vNF>10</vNF></ICMSTot></total>
</infNFe></NFe>`;

describe('parseInboundNfeXml', () => {
  it('reads the key, header and product items from an NF-e XML', () => {
    const invoice = parseInboundNfeXml(xml());
    expect(invoice.nfeKey).toBe(accessKey);
    expect(invoice.nfeNumber).toBe('123');
    expect(invoice.items).toHaveLength(1);
    expect(invoice.items[0].productDescription).toBe('Produto');
    expect(invoice.totalInvoice).toBe(10);
  });

  it('rejects an XML without a 44 digit access key', () => {
    expect(() => parseInboundNfeXml(xml().replace(accessKey, '123'))).toThrow(/Chave de acesso/);
  });

  it('rejects NFC-e model 65', () => {
    expect(() => parseInboundNfeXml(xml('65'))).toThrow(/modelo 65/);
  });
});
