// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseFiscalXmlDetails } from '../utils/fiscalXmlParser';

describe('FiscalDocuments - fiscalXmlParser', () => {
  it('retorna null para string vazia ou inválida', () => {
    expect(parseFiscalXmlDetails('')).toBeNull();
    expect(parseFiscalXmlDetails('not an xml')).toBeNull();
  });

  it('extrai itens, totais, transporte e pagamentos de um XML válido de NF-e', () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe>
      <ide>
        <natOp>VENDA DE MERCADORIA</natOp>
        <dhEmi>2026-10-05T12:30:00-03:00</dhEmi>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>4050</nNF>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
      </ide>
      <dest>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Cliente de Teste</xNome>
        <IE>ISENTO</IE>
        <indIEDest>9</indIEDest>
        <email>cliente@example.com</email>
        <enderDest>
          <xLgr>Rua Teste</xLgr>
          <nro>10</nro>
          <xBairro>Centro</xBairro>
          <cMun>4106902</cMun>
          <xMun>Curitiba</xMun>
          <UF>PR</UF>
          <CEP>80000000</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PROD-001</cProd>
          <xProd>Mesa de Jantar Morante 6 Cadeiras</xProd>
          <NCM>94036000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>1500.00</vUnCom>
          <vProd>1500.00</vProd>
        </prod>
        <infAdProd>Observação fiscal do item</infAdProd>
      </det>
      <total>
        <ICMSTot>
          <vProd>1500.00</vProd>
          <vFrete>100.00</vFrete>
          <vDesc>50.00</vDesc>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vNF>1550.00</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>0</modFrete>
        <xNome>Transportadora Expresso</xNome>
        <placa>ABC1234</placa>
      </transp>
      <pag>
        <detPag>
          <tPag>17</tPag>
          <vPag>1550.00</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
</nfeProc>`;

    const result = parseFiscalXmlDetails(mockXml);
    expect(result).not.toBeNull();
    expect(result?.general).toMatchObject({
      natureOperation: 'VENDA DE MERCADORIA',
      issueDate: '2026-10-05T12:30:00-03:00',
      model: '55',
      series: '1',
      number: '4050',
      finalConsumer: '1',
    });
    expect(result?.recipient).toMatchObject({
      name: 'Cliente de Teste',
      taxId: '12345678000199',
      email: 'cliente@example.com',
      street: 'Rua Teste',
      municipality: 'Curitiba',
      postalCode: '80000000',
    });
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({
      code: 'PROD-001',
      description: 'Mesa de Jantar Morante 6 Cadeiras',
      additionalInfo: 'Observação fiscal do item',
      quantity: '1.0000',
      unit: 'UN',
      unitValue: '1500.00',
      discount: '',
      total: '1500.00',
      ncm: '94036000',
      cfop: '5102',
    });

    expect(result?.totals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Produtos', value: '1500.00' }),
        expect.objectContaining({ label: 'Frete', value: '100.00' }),
        expect.objectContaining({ label: 'Descontos', value: '50.00' }),
        expect.objectContaining({ label: 'Total da NF-e', value: '1550.00' }),
      ])
    );

    expect(result?.transport).toMatchObject({
      modFrete: '0',
      carrierName: 'Transportadora Expresso',
      vehiclePlate: 'ABC1234',
    });

    expect(result?.payments).toEqual([{ method: 'PIX', value: '1550.00' }]);
  });

  it('extrai dados completos: finalidade, documento referenciado, entrega alternativa, impostos detalhados, duplicatas, troco e cartão', () => {
    const richXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe>
      <ide>
        <natOp>DEVOLUCAO DE MERCADORIA</natOp>
        <dhEmi>2026-10-05T14:00:00-03:00</dhEmi>
        <dhSaiEnt>2026-10-05T16:00:00-03:00</dhSaiEnt>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>625</nNF>
        <finNFe>4</finNFe>
        <NFref>
          <refNFe>41261044512248000107550010000005001000005001</refNFe>
        </NFref>
      </ide>
      <dest>
        <CNPJ>00000000000191</CNPJ>
        <xNome>Fornecedor Alpha</xNome>
        <enderDest>
          <xLgr>Av Central</xLgr>
          <nro>500</nro>
          <xBairro>Centro</xBairro>
          <xMun>Curitiba</xMun>
          <UF>PR</UF>
          <CEP>80000000</CEP>
        </enderDest>
      </dest>
      <entrega>
        <xLgr>Rua do Galpao</xLgr>
        <nro>99</nro>
        <xBairro>Industrial</xBairro>
        <xMun>Sao Jose dos Pinhais</xMun>
        <UF>PR</UF>
        <CEP>83000000</CEP>
      </entrega>
      <det nItem="1">
        <prod>
          <cProd>SOFA-02</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>Sofa Retratil 3 Lugares</xProd>
          <NCM>94016100</NCM>
          <CEST>2803800</CEST>
          <CFOP>5202</CFOP>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>1000.00</vUnCom>
          <vProd>2000.00</vProd>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <vBC>2000.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>360.00</vICMS>
            </ICMS00>
          </ICMS>
          <IPI>
            <IPITrib>
              <pIPI>5.00</pIPI>
              <vIPI>100.00</vIPI>
            </IPITrib>
          </IPI>
          <PIS>
            <PISAliq>
              <pPIS>1.65</pPIS>
              <vPIS>33.00</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>152.00</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vProd>2000.00</vProd>
          <vFrete>100.00</vFrete>
          <vSeg>20.00</vSeg>
          <vDesc>0.00</vDesc>
          <vOutro>30.00</vOutro>
          <vBC>2000.00</vBC>
          <vICMS>360.00</vICMS>
          <vIPI>100.00</vIPI>
          <vPIS>33.00</vPIS>
          <vCOFINS>152.00</vCOFINS>
          <vNF>2250.00</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>3</modFrete>
        <veicTransp>
          <placa>XYZ1234</placa>
          <UF>PR</UF>
          <RNTC>12345678</RNTC>
        </veicTransp>
      </transp>
      <cobr>
        <dup>
          <nDup>001</nDup>
          <dVenc>2026-11-05</dVenc>
          <vDup>1125.00</vDup>
        </dup>
        <dup>
          <nDup>002</nDup>
          <dVenc>2026-12-05</dVenc>
          <vDup>1125.00</vDup>
        </dup>
      </cobr>
      <pag>
        <detPag>
          <tPag>03</tPag>
          <vPag>2300.00</vPag>
          <card>
            <tpIntegra>1</tpIntegra>
            <tBand>01</tBand>
            <cAut>987654</cAut>
          </card>
        </detPag>
        <vTroco>50.00</vTroco>
      </pag>
    </infNFe>
  </NFe>
</nfeProc>`;

    const parsed = parseFiscalXmlDetails(richXml);
    expect(parsed).not.toBeNull();

    // General: finalidade 4 (devolução), NF-e referenciada e saída
    expect(parsed?.general.purpose).toBe('4');
    expect(parsed?.general.referencedKey).toBe('41261044512248000107550010000005001000005001');
    expect(parsed?.general.exitDate).toBe('2026-10-05T16:00:00-03:00');

    // Recipient & Entrega
    expect(parsed?.recipient.deliveryAddress).toMatchObject({
      street: 'Rua do Galpao',
      number: '99',
      district: 'Industrial',
      municipality: 'Sao Jose dos Pinhais',
      state: 'PR',
      postalCode: '83000000',
    });

    // Item: CEST, EAN e tributos
    const item = parsed?.items[0];
    expect(item?.ean).toBe('7891234567890');
    expect(item?.cest).toBe('2803800');
    expect(item?.cst).toBe('00');
    expect(item?.icmsBase).toBe('2000.00');
    expect(item?.icmsRate).toBe('18.00');
    expect(item?.icmsValue).toBe('360.00');
    expect(item?.ipiRate).toBe('5.00');
    expect(item?.ipiValue).toBe('100.00');
    expect(item?.pisRate).toBe('1.65');
    expect(item?.pisValue).toBe('33.00');
    expect(item?.cofinsRate).toBe('7.60');
    expect(item?.cofinsValue).toBe('152.00');

    // Transporte: RNTC e modFrete
    expect(parsed?.transport).toMatchObject({
      modFrete: '3',
      vehiclePlate: 'XYZ1234',
      vehicleState: 'PR',
      vehicleRntc: '12345678',
    });

    // Cobrança: 2 duplicatas
    expect(parsed?.installments).toHaveLength(2);
    expect(parsed?.installments?.[0]).toEqual({
      number: '001',
      dueDate: '2026-11-05',
      value: '1125.00',
    });

    // Pagamento: Cartão com bandeira e troco
    expect(parsed?.changeValue).toBe('50.00');
    expect(parsed?.payments?.[0]).toMatchObject({
      method: 'Cartão de crédito',
      value: '2300.00',
      card: {
        brand: 'Visa',
        integration: 'TEF / Integrado',
        authorization: '987654',
      },
    });
  });
});
