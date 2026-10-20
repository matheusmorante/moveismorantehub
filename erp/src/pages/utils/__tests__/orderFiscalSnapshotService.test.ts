import { describe, expect, it, vi } from 'vitest';
import { ensureOrderItemsHaveFiscalSnapshots } from '../orderFiscalSnapshotService';
import type Item from '@/pages/types/items.type';

describe('orderFiscalSnapshotService - partial estorno & NCM persistence', () => {
  const sampleXmlWithTwoItems = `
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe41261044512248000107650010000006551046645952" versao="4.00">
      <det nItem="1">
        <prod>
          <cProd>004038-01</cProd>
          <xProd>COZINHA COMPACTA 8 PORTAS 2 GAVETAS GRAZI</xProd>
          <NCM>94035000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>949.0000</vUnCom>
          <vProd>949.00</vProd>
          <uTrib>UN</uTrib>
          <vDesc>150.00</vDesc>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102><orig>0</orig><CSOSN>103</CSOSN></ICMSSN102>
          </ICMS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <cProd>000353-01</cProd>
          <xProd>PIA DE MARMORE SINTETICO 1,20M</xProd>
          <NCM>94035000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>229.0000</vUnCom>
          <vProd>229.00</vProd>
          <uTrib>UN</uTrib>
          <vDesc>0.00</vDesc>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102><orig>0</orig><CSOSN>103</CSOSN></ICMSSN102>
          </ICMS>
        </imposto>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

  const sampleEstornoXml = `
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe41261044512248000107550010000007331352112570" versao="4.00">
      <det nItem="1">
        <prod>
          <cProd>000353-01</cProd>
          <xProd>PIA DE MARMORE SINTETICO 1,20M</xProd>
          <NCM>94035000</NCM>
          <CFOP>1949</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>229.0000</vUnCom>
          <vProd>229.00</vProd>
          <uTrib>UN</uTrib>
          <vDesc>0.00</vDesc>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102><orig>0</orig><CSOSN>103</CSOSN></ICMSSN102>
          </ICMS>
        </imposto>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

  it('recupera NCM da 2ª linha do XML original quando o 1º item foi estornado e sobrou apenas o 2º item', async () => {
    // Only item 2 (Pia) remains in the order (index 0)
    const remainingItem: Item = {
      id: 'item-pia',
      code: '000353-01',
      description: 'PIA DE MARMORE SINTETICO 1,20M',
      quantity: 1,
      unitPrice: 229,
      itemType: 'product',
      fiscal: {
        ncm: '',
        cfop: '5102',
        commercialUnit: 'UN',
        taxableUnit: 'UN',
      },
      fiscalSnapshotVersion: 1,
    } as unknown as Item;

    const enriched = await ensureOrderItemsHaveFiscalSnapshots(
      [remainingItem],
      { xml: sampleXmlWithTwoItems, status: 'homologada' }
    );

    expect(enriched).toHaveLength(1);
    expect(enriched[0].code).toBe('000353-01');
    expect(enriched[0].fiscal?.ncm).toBe('94035000');
    expect(enriched[0].fiscal?.cfop).toBe('5102');
  });

  it('inverte CFOP de estorno 1949 para 5102 na nova nota de saída preservando o NCM', async () => {
    const itemAfterEstorno: Item = {
      id: 'item-pia-estorno',
      code: '000353-01',
      description: 'PIA DE MARMORE SINTETICO 1,20M',
      quantity: 1,
      unitPrice: 229,
      itemType: 'product',
      fiscal: {
        ncm: '',
        cfop: '',
        commercialUnit: 'UN',
        taxableUnit: 'UN',
      },
      fiscalSnapshotVersion: 1,
    } as unknown as Item;

    const enriched = await ensureOrderItemsHaveFiscalSnapshots(
      [itemAfterEstorno],
      { xml: sampleEstornoXml, status: 'homologada' }
    );

    expect(enriched).toHaveLength(1);
    expect(enriched[0].fiscal?.ncm).toBe('94035000');
    // CFOP 1949 inverted to 5102 for outbound sale
    expect(enriched[0].fiscal?.cfop).toBe('5102');
  });
});
