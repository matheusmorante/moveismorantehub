import { AppSettings } from '../../settingsService';
import type { ParsedFiscalDetails } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';
import bwipjs from 'bwip-js';
import { escapeDanfeHtml } from './danfeHtmlUtils';

export interface DanfeHeaderParams {
  settings: AppSettings;
  nfeNumber: number;
  series: string;
  formattedKey: string;
  protocolNumber: string;
  protocolDate: string;
  natOp?: string;
  logoUrl?: string;
  fiscalDetails?: ParsedFiscalDetails;
}

export function buildDanfeHeaderOfficialHtml(p: DanfeHeaderParams): string {
  const issuer = p.fiscalDetails?.issuer;
  const emitName = issuer?.name || p.settings.companyName || '';
  const emitCnpj = issuer?.taxId || p.settings.companyCnpj || '';
  const emitIE = issuer?.stateRegistration || (p.settings as any).companyIE || '';
  const emitLogr = issuer?.street || (p.settings as any).companyLogradouro || '';
  const emitNum = issuer?.number || (p.settings as any).companyNumero || '';
  const emitBairro = issuer?.district || (p.settings as any).companyBairro || '';
  const emitMun = issuer?.municipality || (p.settings as any).companyXMun || '';
  const emitUF = issuer?.state || (p.settings as any).companyUF || '';
  const emitCep = issuer?.postalCode || (p.settings as any).companyCEP || '';
  const emitPhone = issuer?.phone || p.settings.companyPhone || '';
  const emitIest = issuer?.stateRegistrationSubstitute || '';
  const operationType = p.fiscalDetails?.general.operationType === '0' ? '0' : '1';
  const natOp = p.natOp || 'VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS';

  const cleanKey = p.formattedKey.replace(/\s/g, '');

  return `
    <!-- 1. CANHOTO DE RECEBIMENTO (OBRIGATÓRIO NO TOPO DO DANFE A4) -->
    <div class="canhoto-container">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="border: 1px solid #000; padding: 3px; font-family: Arial, Helvetica, sans-serif; font-size: 7.5px; line-height: 1.2; width: 82%;">
                    RECEBEMOS DE <strong>${escapeDanfeHtml(emitName)}</strong> OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.
                </td>
                <td rowspan="2" style="border: 1px solid #000; text-align: center; vertical-align: middle; width: 18%; font-family: Arial, Helvetica, sans-serif;">
                    <div style="font-size: 8px; font-weight: bold;">NF-e</div>
                    <div style="font-size: 11px; font-weight: 900;">Nº ${p.nfeNumber}</div>
                    <div style="font-size: 8px; font-weight: bold;">SÉRIE ${p.series}</div>
                </td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 2px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 25%; border-right: 1px solid #000; padding: 2px;">
                                <div class="box-title">DATA DE RECEBIMENTO</div>
                                <div class="box-value">&nbsp;</div>
                            </td>
                            <td style="width: 75%; padding: 2px;">
                                <div class="box-title">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
                                <div class="box-value">&nbsp;</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>

    <!-- 2. CABEÇALHO DO EMITENTE COM LOGO + IDENTIFICAÇÃO DANFE + CHAVE DE ACESSO -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
        <tr>
            <!-- Bloco 1: Logotipo + Dados do Emitente (Anexo II item 3.1.3 e Anexo III.02) -->
            <td style="width: 44%; border: 1px solid #000; padding: 4px; vertical-align: middle; font-family: Arial, Helvetica, sans-serif;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 75px; text-align: center; vertical-align: middle; padding-right: 6px;">
                            <img src="/favicon.png" alt="Logo Morante" style="max-width: 68px; max-height: 52px; object-fit: contain;" onerror="this.style.display='none'" />
                        </td>
                        <td style="vertical-align: middle;">
                            <div style="font-size: 10px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; text-transform: uppercase;">
                                ${escapeDanfeHtml(emitName)}
                            </div>
                            <div style="font-size: 7.5px; line-height: 1.25; color: #000;">
                                ${escapeDanfeHtml(emitLogr)}${emitNum ? `, ${escapeDanfeHtml(emitNum)}` : ''}${emitBairro ? ` - ${escapeDanfeHtml(emitBairro)}` : ''}<br>
                                ${escapeDanfeHtml(emitMun)}${emitUF ? ` - ${escapeDanfeHtml(emitUF)}` : ''}${emitCep ? ` - CEP: ${escapeDanfeHtml(emitCep)}` : ''}<br>
                                ${emitPhone ? `Fone: ${escapeDanfeHtml(emitPhone)}` : ''}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>

            <!-- Bloco 2: DANFE + Tipo + Nº / Série -->
            <td style="width: 18%; border: 1px solid #000; text-align: center; vertical-align: middle; padding: 2px; font-family: Arial, Helvetica, sans-serif;">
                <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px;">DANFE</div>
                <div style="font-size: 6px; font-weight: bold; line-height: 1.1;">Documento Auxiliar da<br>Nota Fiscal Eletrônica</div>
                
                <table style="margin: 3px auto; border-collapse: collapse;">
                    <tr>
                        <td style="border: 1px solid #000; font-size: 6.5px; padding: 1px 3px; font-weight: bold; text-align: left;">
                            0 - Entrada<br>1 - Saída
                        </td>
                        <td style="border: 1px solid #000; font-size: 11px; font-weight: 900; padding: 1px 5px;">
                            ${operationType}
                        </td>
                    </tr>
                </table>

                <div style="font-size: 9px; font-weight: 900;">Nº ${p.nfeNumber}</div>
                <div style="font-size: 8px; font-weight: 900;">SÉRIE ${p.series}</div>
                <div style="font-size: 6.5px; margin-top: 2px;">Folha 1/1</div>
            </td>

            <!-- Bloco 3: Chave de Acesso e Código de Barras (CODE-128C conforme Anexo II item 2) -->
            <td style="width: 38%; border: 1px solid #000; padding: 3px; vertical-align: top; font-family: Arial, Helvetica, sans-serif;">
                <div style="text-align: center; margin-bottom: 2px;">
                    ${generateBarcodeSvg(cleanKey)}
                </div>
                <div class="box-title">CHAVE DE ACESSO</div>
                <div style="font-family: monospace; font-size: 8px; font-weight: 900; text-align: center; letter-spacing: 0.2px;">
                    ${p.formattedKey}
                </div>
                <div style="font-size: 6px; text-align: center; color: #000; margin-top: 3px; line-height: 1.1;">
                    Consulta de autenticidade no portal nacional da NF-e<br>www.nfe.fazenda.gov.br/portal ou no site da SEFAZ Autorizadora
                </div>
            </td>
        </tr>
    </table>

    <!-- 3. NATUREZA DA OPERAÇÃO E PROTOCOLO DE AUTORIZAÇÃO -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
        <tr>
            <td style="width: 58%; border: 1px solid #000; padding: 1px 3px;">
                <div class="box-title">NATUREZA DA OPERAÇÃO</div>
                <div class="box-value">${escapeDanfeHtml(natOp)}</div>
            </td>
            <td style="width: 42%; border: 1px solid #000; padding: 1px 3px;">
                <div class="box-title">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
                <div class="box-value">${escapeDanfeHtml(p.protocolNumber || '-')} - ${escapeDanfeHtml(p.protocolDate || '-')}</div>
            </td>
        </tr>
    </table>

    <!-- 4. INSCRIÇÃO ESTADUAL, IE DO SUBST. TRIBUTÁRIO E CNPJ DO EMITENTE -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
        <tr>
            <td style="width: 33.33%; border: 1px solid #000; padding: 1px 3px;">
                <div class="box-title">INSCRIÇÃO ESTADUAL</div>
                <div class="box-value">${escapeDanfeHtml(emitIE) || '&nbsp;'}</div>
            </td>
            <td style="width: 33.33%; border: 1px solid #000; padding: 1px 3px;">
                <div class="box-title">INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO</div>
                <div class="box-value">${escapeDanfeHtml(emitIest) || '&nbsp;'}</div>
            </td>
            <td style="width: 33.34%; border: 1px solid #000; padding: 1px 3px;">
                <div class="box-title">CNPJ</div>
                <div class="box-value">${escapeDanfeHtml(emitCnpj) || '&nbsp;'}</div>
            </td>
        </tr>
    </table>
    `;
}

/**
 * Gera barras de código de barras estilizadas com base no hash da chave de acesso
 */
function generateBarcodeSvg(key: string): string {
  if (!/^\d{44}$/.test(key)) return '';
  try {
    const toSVG = (bwipjs as unknown as {
      toSVG: (options: {
        bcid: string;
        text: string;
        height: number;
        scale: number;
        includetext: boolean;
        padding: number;
      }) => string;
    }).toSVG;
    return toSVG({ bcid: 'code128', text: key, height: 12, scale: 2, includetext: false, padding: 0 })
      .replace('<svg ', '<svg style="width:96%;height:32px;display:block;margin:0 auto" ');
  } catch {
    return '';
  }
}
