import { CustomerData } from "../../types/order.type";

/**
 * Cria ou vincula cliente ao CRM caso não possua ID e tenha nome válido.
 */
export const ensureCustomerInCrm = async (
    customerData?: CustomerData,
    marketingOrigin?: string,
    isStrict = false
): Promise<string | undefined> => {
    if (!customerData || customerData.id || !customerData.fullName) {
        return customerData?.id;
    }

    if (customerData.fullName.toLowerCase().trim() === 'consumidor final') {
        return undefined;
    }

    try {
        const { savePerson } = await import("../personService");
        const personToSave = {
            fullName: customerData.fullName,
            phone: customerData.phone || '',
            noPhone: customerData.noPhone || false,
            fullAddress: customerData.fullAddress,
            noAddress: customerData.noAddress || false,
            additionalContacts: customerData.additionalContacts || [],
            marketingOrigin: (marketingOrigin || 'organic') as any,
            active: true,
            type: 'customers' as const,
        };

        const savedPerson = await savePerson('customers', personToSave as any);
        if (isStrict && !savedPerson?.id) {
            throw new Error('O cadastro do cliente não retornou um identificador válido.');
        }

        return savedPerson?.id;
    } catch (err) {
        console.error("[OrderCrmSync] Erro ao cadastrar cliente no CRM:", err);
        if (isStrict) {
            throw new Error('Não foi possível cadastrar o cliente. O pedido não foi salvo.', { cause: err });
        }
        return undefined;
    }
};

/**
 * Sincroniza dados complementares do cliente (telefone e origem) em segundo plano.
 */
export const syncCustomerToCrmBackground = (
    customerId?: string,
    phone?: string,
    marketingOrigin?: string
): void => {
    if (!customerId) return;

    void (async () => {
        try {
            const { updatePerson } = await import("../personService");
            await updatePerson('customers', customerId, {
                phone,
                marketingOrigin: marketingOrigin as any,
            });
        } catch (syncErr) {
            console.error('[OrderCrmSync] Erro ao sincronizar cliente no CRM (background):', syncErr);
        }
    })();
};
