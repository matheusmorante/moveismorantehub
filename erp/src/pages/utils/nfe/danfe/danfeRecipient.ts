import Order from '@/pages/types/order.type';
import type { ParsedFiscalDetails } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';
import { escapeDanfeHtml } from './danfeHtmlUtils';

export interface DanfeRecipientParams {
  order: Order;
  isHomologacao: boolean;
  dtEmi: string;
  dtSaida: string;
  hrSaida: string;
  fiscalDetails?: ParsedFiscalDetails;
}

/**
 * Constrói o BLOCO 3: DESTINATÁRIO / REMETENTE do DANFE oficial A4.
 */
export function buildDanfeRecipientOfficialHtml(params: DanfeRecipientParams): string {
  const { order, isHomologacao, dtEmi, dtSaida, hrSaida } = params;
  const recipient = params.fiscalDetails?.recipient;
  const fromFiscalXml = Boolean(params.fiscalDetails);
  const fromSource = (xmlValue: string | undefined, legacyValue: string | undefined) =>
    fromFiscalXml ? xmlValue || '' : legacyValue || '';
  const customer = order.customerData;
  const destName = isHomologacao
    ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
    : fromSource(recipient?.name, customer?.fullName) || 'CONSUMIDOR FINAL';
  const destDoc = fromSource(recipient?.taxId, customer?.cpfCnpj);
  const destStreet = fromSource(
    recipient?.street,
    order.shipping?.deliveryAddress?.street || customer?.fullAddress?.street
  );
  const destLogr = [destStreet, fromSource(recipient?.complement, '')].filter(Boolean).join(', ');
  const destNum = fromSource(
    recipient?.number,
    order.shipping?.deliveryAddress?.number || customer?.fullAddress?.number
  ) || (fromFiscalXml ? '' : 'S/N');
  const destBairro =
    fromSource(
      recipient?.district,
      order.shipping?.deliveryAddress?.neighborhood || customer?.fullAddress?.neighborhood
    );
  const destCep = fromSource(
    recipient?.postalCode,
    order.shipping?.deliveryAddress?.cep || customer?.fullAddress?.cep
  );
  const destMun = fromSource(
    recipient?.municipality,
    order.shipping?.deliveryAddress?.city || customer?.fullAddress?.city
  );
  const destUF = fromSource(
    recipient?.state,
    order.shipping?.deliveryAddress?.state || customer?.fullAddress?.state
  );
  const destPhone = fromSource(recipient?.phone, customer?.phone);
  const destIE = fromSource(recipient?.stateRegistration, (customer as any)?.rgIe) || 'ISENTO';

  return `
        <!-- BLOCO 3: DESTINATÁRIO / REMETENTE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td colspan="4" style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    DESTINATÁRIO / REMETENTE
                </td>
            </tr>
            <tr>
                <td style="width: 58%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">NOME / RAZÃO SOCIAL</div>
                    <div class="box-value">${escapeDanfeHtml(destName)}</div>
                </td>
                <td style="width: 24%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CNPJ / CPF</div>
                    <div class="box-value">${escapeDanfeHtml(destDoc) || '&nbsp;'}</div>
                </td>
                <td colspan="2" style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">DATA DA EMISSÃO</div>
                    <div class="box-value text-right">${escapeDanfeHtml(dtEmi)}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 48%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">ENDEREÇO</div>
                    <div class="box-value">${destLogr ? `${escapeDanfeHtml(destLogr)}${destNum ? `, ${escapeDanfeHtml(destNum)}` : ''}` : fromFiscalXml ? '&nbsp;' : 'RETIRADA NO ESTABELECIMENTO'}</div>
                </td>
                <td style="width: 24%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">BAIRRO / DISTRITO</div>
                    <div class="box-value">${escapeDanfeHtml(destBairro) || '&nbsp;'}</div>
                </td>
                <td style="width: 13%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CEP</div>
                    <div class="box-value">${escapeDanfeHtml(destCep) || '&nbsp;'}</div>
                </td>
                <td style="width: 15%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">DATA DE SAÍDA/ENTRADA</div>
                    <div class="box-value text-right">${escapeDanfeHtml(dtSaida)}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 38%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">MUNICÍPIO</div>
                    <div class="box-value">${escapeDanfeHtml(destMun) || '&nbsp;'}</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">FONE / FAX</div>
                    <div class="box-value">${escapeDanfeHtml(destPhone) || '&nbsp;'}</div>
                </td>
                <td style="width: 6%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">UF</div>
                    <div class="box-value text-center">${escapeDanfeHtml(destUF) || '&nbsp;'}</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">INSCRIÇÃO ESTADUAL</div>
                    <div class="box-value">${escapeDanfeHtml(destIE)}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">HORA DE SAÍDA</div>
                    <div class="box-value text-right">${escapeDanfeHtml(hrSaida)}</div>
                </td>
            </tr>
        </table>
    `;
}
