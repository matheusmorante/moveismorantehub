import { AppSettings } from "../../settingsService";

export function escapeXml(unsafe: string = ''): string {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export interface IdeParams {
    accessKey: string;
    randomCode: string;
    checkDigit: number;
    nfeNumber: number;
    series: string;
    model: '55' | '65';
    environment: 1 | 2;
    dhEmi: string;
}

export function buildIdeXml(p: IdeParams): string {
    return `
    <ide>
      <cUF>41</cUF>
      <cNF>${p.randomCode}</cNF>
      <natOp>VENDA MERCADORIA</natOp>
      <mod>${p.model}</mod>
      <serie>${parseInt(p.series, 10)}</serie>
      <nNF>${p.nfeNumber}</nNF>
      <dhEmi>${p.dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>4106907</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${p.checkDigit}</cDV>
      <tpAmb>${p.environment}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>MoranteHub_1.0</verProc>
    </ide>`;
}

export function buildEmitXml(settings: AppSettings): string {
    const emitCnpj = (settings.companyCnpj || '00000000000000').replace(/\D/g, '').padStart(14, '0');
    const emitName = settings.companyName || 'MOVEIS MORANTE LTDA';
    const emitIE = ((settings as any).companyIE || 'ISENTO').replace(/[^\w]/g, '');
    const emitCRT = (settings as any).companyCRT || '1';
    const emitCep = ((settings as any).companyCEP || '80000000').replace(/\D/g, '');
    const emitBairro = (settings as any).companyBairro || 'Centro';
    const emitMun = (settings as any).companyXMun || 'Curitiba';
    const emitCMun = (settings as any).companyCMun || '4106907';
    const emitUF = (settings as any).companyUF || 'PR';
    const emitLogr = (settings as any).companyLogradouro || settings.companyAddress || 'Rua Principal';
    const emitNum = (settings as any).companyNumero || '100';

    return `
    <emit>
      <CNPJ>${emitCnpj}</CNPJ>
      <xNome>${escapeXml(emitName)}</xNome>
      <xFant>${escapeXml(settings.companyName || 'MOVEIS MORANTE')}</xFant>
      <enderEmit>
        <xLgr>${escapeXml(emitLogr)}</xLgr>
        <nro>${escapeXml(emitNum)}</nro>
        <xBairro>${escapeXml(emitBairro)}</xBairro>
        <cMun>${emitCMun}</cMun>
        <xMun>${escapeXml(emitMun)}</xMun>
        <UF>${emitUF}</UF>
        <CEP>${emitCep}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>${emitIE}</IE>
      <CRT>${emitCRT}</CRT>
    </emit>`;
}
