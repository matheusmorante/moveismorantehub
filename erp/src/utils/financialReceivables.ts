import { addDays } from 'date-fns';
export function generateReceivables(
    orderIndex: number, 
    customerName: string, 
    totalValue: number, 
    installmentsCount: number, 
    saleDateIso: string, 
    config: { name: string, installments_model: string, days_to_receive: number, fee_percentage: number }
) {
    const saleDate = new Date(saleDateIso);
    const receivables = [];
    const count = installmentsCount || 1;
    const amountPerInstallment = totalValue / count;

    for (let i = 1; i <= count; i++) {
        const dueDate = config.installments_model === 'monthly'
            ? addDays(saleDate, config.days_to_receive * i)
            : addDays(saleDate, config.days_to_receive);

        receivables.push({
            description: `Ped. #${orderIndex} - ${customerName} (${config.name}${count > 1 ? ` - Parc. ${i}/${count}` : ''})`,
            amount: amountPerInstallment,
            status: 'pending',
            due_date: dueDate.toISOString(),
            // Não colocamos o category_id obrigatório aqui pois depende da configuração financeira do cliente
        });
    }

    return receivables;
}
