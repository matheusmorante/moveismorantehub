import Order from "@/pages/types/order.type";
import { escapeXml } from "./xmlEmitterBlock";

export function buildDestXml(order: Order, isHomologacao: boolean): string {
    const customer = order.customerData;
    const rawDoc = (customer?.cpfCnpj || customer?.document || '').replace(/\D/g, '');
    const isCpf = rawDoc.length <= 11;
    const destDocTag = isCpf ? `<CPF>${rawDoc.padStart(11, '0')}</CPF>` : `<CNPJ>${rawDoc.padStart(14, '0')}</CNPJ>`;
    
    // Regra oficial SEFAZ: em homologação o nome DEVE ser fixo
    const destName = isHomologacao 
        ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' 
        : (customer?.fullName || customer?.name || 'CONSUMIDOR FINAL');

    const destAddress = order.shipping?.address || customer?.address;
    const destCep = (destAddress?.postalCode || destAddress?.cep || '80000000').replace(/\D/g, '');
    const destLogr = destAddress?.street || 'Rua do Cliente';
    const destNum = destAddress?.number || 'S/N';
    const destBairro = destAddress?.neighborhood || destAddress?.bairro || 'Centro';
    const destMun = destAddress?.city || 'Curitiba';
    const destCMun = destAddress?.cityCode || '4106907';
    const destUF = destAddress?.state || 'PR';

    return `
    <dest>
      ${destDocTag}
      <xNome>${escapeXml(destName)}</xNome>
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
      </enderDest>
      <indIEDest>9</indIEDest>
    </dest>`;
}
