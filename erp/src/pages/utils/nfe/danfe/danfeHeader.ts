import { AppSettings } from "../../settingsService";

export interface DanfeHeaderParams {
    settings: AppSettings;
    nfeNumber: number;
    series: string;
    formattedKey: string;
    protocolNumber: string;
    protocolDate: string;
}

export function buildDanfeHeaderHtml(p: DanfeHeaderParams): string {
    const emitName = p.settings.companyName || 'MOVEIS MORANTE LTDA';
    const emitCnpj = p.settings.companyCnpj || '00.000.000/0000-00';
    const emitIE = (p.settings as any).companyIE || 'ISENTO';
    const emitAddr = (p.settings as any).companyLogradouro 
        ? `${(p.settings as any).companyLogradouro}, ${(p.settings as any).companyNumero || 'S/N'} - ${(p.settings as any).companyBairro || ''}, ${(p.settings as any).companyXMun || 'Curitiba'} - ${(p.settings as any).companyUF || 'PR'}`
        : (p.settings.companyAddress || 'Curitiba - PR');

    return `
        <div class="header-box">
            <div class="emit-info">
                <h2 style="margin:0 0 4px; font-size:14px; font-weight:900;">${emitName}</h2>
                <p style="margin:0; font-size:10px; color:#475569;">${emitAddr}</p>
                <p style="margin:4px 0 0; font-size:10px;"><strong>CNPJ:</strong> ${emitCnpj}</p>
                <p style="margin:2px 0 0; font-size:10px;"><strong>IE:</strong> ${emitIE}</p>
            </div>

            <div class="danfe-badge">
                <h3 style="margin:0; font-size:16px; font-weight:900;">DANFE</h3>
                <p style="margin:2px 0; font-size:9px;">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                <p style="margin:4px 0 0; font-size:11px; font-weight:bold;">
                    0 - ENTRADA<br>1 - SAÍDA: <strong>1</strong>
                </p>
                <p style="margin:6px 0 0; font-size:11px; font-weight:900;">
                    Nº ${p.nfeNumber}<br>SÉRIE ${p.series}
                </p>
            </div>

            <div class="key-info">
                <div style="font-size:9px; font-weight:bold; color:#475569; text-transform:uppercase;">Chave de Acesso:</div>
                <div style="font-family:monospace; font-size:11px; font-weight:900; margin:4px 0; letter-spacing:0.5px;">
                    ${p.formattedKey}
                </div>
                <div style="font-size:9px; color:#64748b; margin-top:8px;">
                    Consulta de autenticidade no portal nacional da NF-e ou no site da SEFAZ autorizadora.
                </div>
                <div style="margin-top:8px; font-size:10px; border-top:1px dashed #cbd5e1; padding-top:4px;">
                    <strong>Protocolo de Autorização:</strong> ${p.protocolNumber} - ${p.protocolDate}
                </div>
            </div>
        </div>
    `;
}
