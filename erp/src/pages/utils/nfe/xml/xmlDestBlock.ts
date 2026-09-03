import Order from "@/pages/types/order.type";
import { escapeXml } from "./xmlEmitterBlock";

export function buildDestXml(order: Order, isHomologacao: boolean, model: '55' | '65' = '55'): string {
    const customer = order.customerData;
    const rawDoc = (customer?.cpfCnpj || (customer as any)?.document || '').replace(/\D/g, '');
    const isCpf = rawDoc.length <= 11;
    const hasDoc = rawDoc.length === 11 || rawDoc.length === 14;

    // Na NFC-e (Mod. 65), a tag <dest> é opcional quando o consumidor não é identificado
    if (model === '65' && !hasDoc && !isHomologacao) {
        return '';
    }

    const destDocTag = hasDoc 
        ? (isCpf ? `<CPF>${rawDoc.padStart(11, '0')}</CPF>` : `<CNPJ>${rawDoc.padStart(14, '0')}</CNPJ>`)
        : '';
    
    // Regra oficial SEFAZ: em homologação o nome DEVE ser fixo
    const destName = isHomologacao 
        ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' 
        : (customer?.fullName || (customer as any)?.name || 'CONSUMIDOR FINAL');

    const destAddress = order.shipping?.deliveryAddress || customer?.fullAddress || (customer as any)?.address;
    const destCep = ((destAddress as any)?.postalCode || (destAddress as any)?.cep || '83410270').replace(/\D/g, '');
    const destLogr = (destAddress as any)?.street || 'Rua do Cliente';
    const destNum = (destAddress as any)?.number || 'S/N';
    const destBairro = (destAddress as any)?.neighborhood || (destAddress as any)?.bairro || 'Centro';
    const destMun = (destAddress as any)?.city || 'Colombo';
    const destCMun = (destAddress as any)?.cityCode || (destAddress as any)?.cMun || '4105805';
    const destUF = (destAddress as any)?.state || (destAddress as any)?.uf || 'PR';

    // Para NFC-e (65) com apenas CPF, não é obrigatório <enderDest>
    const enderDestXml = model === '65' && !destAddress?.street ? '' : `
      <enderDest>
        <xLgr>${escapeXml(destLogr)}</xLgr>
        <nro>${escapeXml(destNum)}</nro>
        <xBairro>${escapeXml(destBairro)}</xBairro>
        <cMun>${destCMun}</cMun>
        <xMun>${escapeXml(destMun)}</xMun>
        <UF>${destUF}</UF>
        <CEP>${destCep}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>`;

    return `
    <dest>
      ${destDocTag}
      <xNome>${escapeXml(destName)}</xNome>${enderDestXml}
      <indIEDest>9</indIEDest>
    </dest>`;
}
