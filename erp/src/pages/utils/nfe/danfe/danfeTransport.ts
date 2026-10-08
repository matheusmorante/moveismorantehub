import Order from '@/pages/types/order.type';
import type { ParsedFiscalDetails, ParsedFiscalTransport } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';
import { escapeDanfeHtml, formatDanfeDecimal } from './danfeHtmlUtils';

/**
 * Constrói o BLOCO 6: TRANSPORTADOR / VOLUMES TRANSPORTADOS do DANFE oficial A4.
 */
export function buildDanfeTransportOfficialHtml(
  order: Order,
  fiscalDetails?: ParsedFiscalDetails
): string {
  const sourceTransport = fiscalDetails?.transport;
  const transport =
    sourceTransport && !Array.isArray(sourceTransport)
      ? (sourceTransport as ParsedFiscalTransport)
      : undefined;
  const isPickup = order.shipping?.deliveryMethod === 'pickup';
  const legacyVolumeCount = order.items?.length || 1;
  const modFrete = transport?.modFrete || '';
  const freightLabelByCode: Record<string, string> = {
    '0': '0-Remetente (CIF)',
    '1': '1-Destinatário (FOB)',
    '2': '2-Terceiros',
    '3': '3-Transporte próprio por conta do remetente',
    '4': '4-Transporte próprio por conta do destinatário',
    '9': '9-Sem ocorrência de transporte',
  };
  const carrierName = transport
    ? escapeDanfeHtml(transport.carrierName) || '&nbsp;'
    : isPickup
      ? 'RETIRADA PELO DESTINATÁRIO'
      : 'O PRÓPRIO EMITENTE';
  const carrierTaxId = transport ? escapeDanfeHtml(transport.carrierTaxId) || '&nbsp;' : '&nbsp;';
  const carrierAddress = escapeDanfeHtml(transport?.carrierAddress) || '&nbsp;';
  const carrierCity = escapeDanfeHtml(transport?.carrierCity) || '&nbsp;';
  const carrierState = escapeDanfeHtml(transport?.carrierState) || '&nbsp;';
  const carrierStateRegistration =
    escapeDanfeHtml(transport?.carrierStateRegistration) || '&nbsp;';
  const freightDescription = transport
    ? freightLabelByCode[modFrete] || escapeDanfeHtml(modFrete) || '&nbsp;'
    : isPickup
      ? '9-Sem Ocorrência de Transporte'
      : '0-Emitente (CIF)';
  const volumeCount = transport ? escapeDanfeHtml(transport.volumeQuantity) || '&nbsp;' : legacyVolumeCount;
  const vehiclePlate = escapeDanfeHtml(transport?.vehiclePlate) || '&nbsp;';
  const vehicleState = escapeDanfeHtml(transport?.vehicleState) || '&nbsp;';
  const vehicleRntc = escapeDanfeHtml(transport?.vehicleRntc) || '&nbsp;';
  const volumeSpecies = escapeDanfeHtml(transport?.volumeSpecies) || (transport ? '&nbsp;' : 'VOLUMES');
  const volumeBrand = escapeDanfeHtml(transport?.volumeBrand) || '&nbsp;';
  const volumeNumber = escapeDanfeHtml(transport?.volumeNumber) || '&nbsp;';
  const grossWeight = formatDanfeDecimal(transport?.grossWeight, transport ? '&nbsp;' : '0,000');
  const netWeight = formatDanfeDecimal(transport?.netWeight, transport ? '&nbsp;' : '0,000');

  return `
        <!-- BLOCO 6: TRANSPORTADOR / VOLUMES TRANSPORTADOS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td colspan="6" style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    TRANSPORTADOR / VOLUMES TRANSPORTADOS
                </td>
            </tr>
            <tr>
                <td style="width: 40%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">RAZÃO SOCIAL</div>
                    <div class="box-value">${carrierName}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">FRETE POR CONTA</div>
                    <div class="box-value">${freightDescription}</div>
                </td>
                <td style="width: 10%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CÓDIGO ANTT</div>
                    <div class="box-value">${vehicleRntc}</div>
                </td>
                <td style="width: 12%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">PLACA DO VEÍCULO</div>
                    <div class="box-value">${vehiclePlate}</div>
                </td>
                <td style="width: 4%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">UF</div>
                    <div class="box-value">${vehicleState}</div>
                </td>
                <td style="width: 14%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CNPJ / CPF</div>
                    <div class="box-value">${carrierTaxId}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 35%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">ENDEREÇO</div>
                    <div class="box-value">${carrierAddress}</div>
                </td>
                <td style="width: 25%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">MUNICÍPIO</div>
                    <div class="box-value">${carrierCity}</div>
                </td>
                <td style="width: 8%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">UF</div>
                    <div class="box-value text-center">${carrierState}</div>
                </td>
                <td style="width: 32%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">INSCRIÇÃO ESTADUAL</div>
                    <div class="box-value">${carrierStateRegistration}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 12%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">QUANTIDADE</div>
                    <div class="box-value text-right">${typeof volumeCount === 'number' ? volumeCount : volumeCount}</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">ESPÉCIE</div>
                    <div class="box-value">${volumeSpecies}</div>
                </td>
                <td style="width: 15%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">MARCA</div>
                    <div class="box-value">${volumeBrand}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">NUMERAÇÃO</div>
                    <div class="box-value">${volumeNumber}</div>
                </td>
                <td style="width: 17%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">PESO BRUTO</div>
                    <div class="box-value text-right">${grossWeight}</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">PESO LÍQUIDO</div>
                    <div class="box-value text-right">${netWeight}</div>
                </td>
            </tr>
        </table>
    `;
}
