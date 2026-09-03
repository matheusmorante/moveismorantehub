import Order from "@/pages/types/order.type";
import { AppSettings } from "../settingsService";

export interface NfeValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Valida se um pedido possui todos os dados necessários para emissão em ambiente de homologação/produção
 */
export function validateOrderForNfe(order: Order, settings: AppSettings): NfeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validação do Emitente
    const cleanCnpj = (settings.companyCnpj || '').replace(/\D/g, '');
    if (!cleanCnpj || cleanCnpj.length !== 14) {
        errors.push("CNPJ da empresa emitente não configurado ou inválido nas Configurações Fiscais.");
    }

    if (!settings.companyName || settings.companyName.trim() === '') {
        errors.push("Razão Social da empresa emitente não configurada.");
    }

    const companyIE = ((settings as any).companyIE || '').replace(/\D/g, '');
    if (!companyIE) {
        warnings.push("Inscrição Estadual (IE) do emitente não configurada (obrigatória para emissão em produção).");
    }

    // 2. Validação dos Itens do Pedido
    if (!order.items || order.items.length === 0) {
        errors.push("O pedido não possui nenhum item para emissão de nota fiscal.");
    } else {
        order.items.forEach((item, index) => {
            const itemNum = index + 1;
            const desc = item.description || `Item #${itemNum}`;

            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${itemNum} (${desc}): Quantidade deve ser maior que zero.`);
            }

            if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
                errors.push(`Item ${itemNum} (${desc}): Valor unitário inválido.`);
            }

            // NCM (8 dígitos)
            const ncm = (item as any).fiscal?.ncm || (settings as any).fiscalDefaults?.ncm || '94036000';
            const cleanNcm = String(ncm).replace(/\D/g, '');
            if (!cleanNcm || cleanNcm.length !== 8) {
                warnings.push(`Item ${itemNum} (${desc}): NCM '${ncm}' não possui 8 dígitos.`);
            }
        });
    }

    // 3. Validação do Destinatário (especialmente para NF-e modelo 55 - Entrega)
    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    const isHomologacao = ((settings as any).nfeEnvironment || 2) === 2;

    if (!isPickup) {
        // NF-e modelo 55 exige endereço do destinatário
        const customer = order.customerData;
        if (!customer && !isHomologacao) {
            errors.push("Para entregas (NF-e Modelo 55), os dados do cliente destinatário são obrigatórios.");
        }
        
        const address = order.shipping?.address;
        if (!address?.street && !customer?.address?.street && !isHomologacao) {
            warnings.push("Endereço de entrega do cliente não preenchido completamente.");
        }
    }

    // 4. Totais
    const totalOrder = order.paymentsSummary?.totalOrderValue || 0;
    if (totalOrder <= 0) {
        errors.push("O valor total do pedido deve ser maior que zero.");
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
