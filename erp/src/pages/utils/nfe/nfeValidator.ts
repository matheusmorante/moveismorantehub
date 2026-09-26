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

    const missingEmitterFields = [
        ['Logradouro', (settings as any).companyLogradouro || settings.companyAddress],
        ['número', (settings as any).companyNumero],
        ['bairro', (settings as any).companyBairro],
        ['código IBGE do município', (settings as any).companyCMun],
        ['município', (settings as any).companyXMun],
        ['UF', (settings as any).companyUF],
        ['CEP', (settings as any).companyCEP],
    ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
    if (missingEmitterFields.length) errors.push(`Endereço do emitente incompleto: informe ${missingEmitterFields.join(', ')} nas Configurações Fiscais.`);

    // 2. Validação dos Itens do Pedido
    const fiscalProducts = (order.items || []).filter(item => item.itemType !== 'service');
    if (fiscalProducts.length === 0) {
        errors.push("O pedido não possui nenhum item para emissão de nota fiscal.");
    } else {
        fiscalProducts.forEach((item, index) => {
            const itemNum = index + 1;
            const desc = item.description || `Item #${itemNum}`;

            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${itemNum} (${desc}): Quantidade deve ser maior que zero.`);
            }

            if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
                errors.push(`Item ${itemNum} (${desc}): Valor unitário inválido.`);
            }

            // NCM (8 dígitos)
            const ncm = (item as any).fiscal?.ncm || '';
            const cleanNcm = String(ncm).replace(/\D/g, '');
            if (!cleanNcm || cleanNcm.length !== 8) {
                errors.push(`Item ${itemNum} (${desc}): informe um NCM válido de 8 dígitos antes da emissão.`);
            }
        });
    }

    // 3. Validação do Destinatário (especialmente para NF-e modelo 55 - Entrega)
    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    if (!isPickup) {
        // NF-e modelo 55 exige endereço do destinatário
        const customer = order.customerData;
        if (!customer) {
            errors.push("Para entregas (NF-e Modelo 55), os dados do cliente destinatário são obrigatórios.");
        }
        const address = order.shipping?.deliveryAddress || customer?.fullAddress || (customer as any)?.address;
        const missingAddressFields = [
            ['logradouro', (address as any)?.street], ['bairro', (address as any)?.neighborhood || (address as any)?.bairro],
            ['código IBGE do município', (address as any)?.cityCode || (address as any)?.cMun],
            ['município', (address as any)?.city], ['UF', (address as any)?.state || (address as any)?.uf],
            ['CEP', (address as any)?.postalCode || (address as any)?.cep],
        ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
        if (missingAddressFields.length) {
            errors.push(`Identificação do destinatário para NF-e incompleta: informe ${missingAddressFields.join(', ')} no endereço do pedido/cliente.`);
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
