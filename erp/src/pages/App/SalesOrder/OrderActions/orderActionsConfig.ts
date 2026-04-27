import Order, { OrderAction, IsButtonsClicked } from "../../../types/order.type";
import { toast } from "react-toastify";

import { 
    shippingOrderWhatsappUrl, 
    customerOrderWhatsappUrl, 
    customerReviewsWhatsappUrl, 
    assistanceCustomerWhatsappUrl,
    assistanceOrderDetailsWhatsappUrl,
    assistanceServiceOrderWhatsappUrl,
    sendDirectShippingMessage,
    sendDirectCustomerMessage,
    sendDirectAssistanceMessage,
    sendDirectAssistanceOrderDetailsMessage,
    budgetWhatsappUrl,
    sendDirectBudgetMessage,
    sendDirectGroupInviteMessage
} from "../../../utils/whatsapp";

export const actionsMap: Record<OrderAction, (order: Order) => void> = {
    'PRINT_RECEIPT': (order) => {
        if (!order.seller) {
            toast.error("Atendente obrigatório para imprimir recibo.");
            return;
        }
        sessionStorage.setItem('order', JSON.stringify(order));
        window.open('/receipt', '_blank');
    },
    'PRINT_SHIPPING_ORDER': (order) => {
        if (!order.seller) {
            toast.error("Atendente obrigatório para imprimir o pedido.");
            return;
        }
        sessionStorage.setItem("order", JSON.stringify(order));
        window.open("/order", "_blank");
    },
    'PRINT_WARRANTY_TERM': (order) => {
        console.log("Gerando Termo de Garantia para o pedido:", order.id);
    },
    'SEND_SHIPPING_ORDER': (order) => {
        sendDirectShippingMessage(order);
    },
    'SEND_CUSTOMER_ORDER': (order) => {
        sendDirectCustomerMessage(order);
    },
    'SEND_ASSISTANCE_CUSTOMER': (order) => {
        sendDirectAssistanceMessage(order);
    },
    'SEND_ASSISTANCE_ORDER_DETAILS': (order) => {
        sendDirectAssistanceOrderDetailsMessage(order);
    },
    'SEND_ASSISTANCE_OS': (order) => {
        window.open(assistanceServiceOrderWhatsappUrl(order), "_blank");
    },
    'SEND_CUSTOMER_REVIEWS': (order) => {
        window.open(customerReviewsWhatsappUrl(order), "_blank");
    },
    'PRINT_SHIPPING_LABEL': (order) => {
        sessionStorage.setItem("order", JSON.stringify(order));
        window.open("/shipping-label", "_blank");
    },
    'PRINT_PRODUCT_LABEL': (order) => {
        const item = order.items?.[0];
        const url = item?.productId 
            ? `/stock/label-printing?preset=qr_product&productId=${item.productId}` 
            : `/stock/label-printing?preset=qr_product`;
        window.open(url, "_blank");
    },
    'GENERATE_PAYMENT_LINK': (order) => {
        console.log("Gerando link de pagamento para o pedido:", order.id);
    },
    'PRINT_BUDGET': (order) => {
        sessionStorage.setItem("order", JSON.stringify(order));
        window.open("/order?type=budget", "_blank");
    },
    'SEND_BUDGET': (order) => {
        sendDirectBudgetMessage(order);
    },
    'SEND_GROUP_INVITE': (order) => {
        sendDirectGroupInviteMessage(order);
    },
    'PRINT_ASSISTANCE_OS': (order) => {
        sessionStorage.setItem('order', JSON.stringify(order));
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const assistanceItemsHtml = (order.assistanceItems || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.handlingType || 'N/A'}</td>
            </tr>
        `).join('');

        const extraItemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>ORDEM DE SERVIÇO - ${order.id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        .ticket { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
                        .header { border-bottom: 8px solid #f97316; padding-bottom: 10px; margin-bottom: 15px; }
                        table { width: 100%; border-collapse: collapse; margin-block: 10px; }
                        th { text-align: left; font-size: 12px; background: #f4f4f4; padding: 8px; border-bottom: 1px solid #ddd; }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="header" style="background: #ea580c; color: white; padding: 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; border: none; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <div style="display: flex; gap: 15px; align-items: center;">
                                <img src="/lizandro.png" style="width: 50px; height: 50px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.2);" />
                                <div>
                                    <h1 style="color: white; margin: 0; font-size: 20px;">Ordem de Serviço (Assistência)</h1>
                                    <div style="color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 700;">ID: #${order.id}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 10px; font-weight: 900; text-transform: uppercase;">Emissão</div>
                                <div style="font-size: 13px; font-weight: 700;">${new Date(order.date).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>
                        <p><strong>Cliente:</strong> ${order.customerData?.fullName}</p>
                        <p><strong>Telefone:</strong> ${order.customerData?.phone}</p>
                        <p><strong>Vendedor:</strong> ${order.seller}</p>
                        
                        <div style="margin-top: 20px; padding: 10px; border: 1px solid #eee; background: #fafafa;">
                            <strong>Descrição do Problema:</strong><br/>
                            ${order.assistanceDescription || 'Nenhuma descrição informada.'}
                        </div>

                        ${order.assistanceItems?.length ? `
                            <h3>Itens para Assistência</h3>
                            <table>
                                <thead><tr><th>Produto</th><th>Qtd</th><th>Tratativa</th></tr></thead>
                                <tbody>${assistanceItemsHtml}</tbody>
                            </table>
                        ` : ''}

                        ${order.items?.length ? `
                            <h3>Peças Adicionais</h3>
                            <table>
                                <thead><tr><th>Item</th><th>Qtd</th><th>Preço</th></tr></thead>
                                <tbody>${extraItemsHtml}</tbody>
                            </table>
                        ` : ''}

                        <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 10px; text-align: right;">
                            <strong>Valor do Serviço: R$ ${(order.assistanceServiceValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                    <script>window.onload = function() { window.print(); window.close(); };</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    },
    'GENERATE_RETURN': (order) => {
        // Handled by onAction prop in SalesOrder/Index.tsx
        console.log("Iniciando fluxo de devolução para o pedido:", order.id);
    },
    'PRINT_RETURN_OS': (order) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <div style="font-weight: 900; font-size: 12px; text-transform: uppercase;">${item.description}</div>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 700;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">R$ ${item.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>COMPROVANTE DE DEVOLUÇÃO - ${order.id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                        .ticket { max-width: 800px; margin: 0 auto; border: 2px solid #eee; padding: 30px; border-radius: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-block: 20px; }
                        th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; background: #fdfaf1; padding: 12px; color: #92400e; }
                        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px dashed #eee; font-size: 11px; color: #666; text-align: center; }
                        .signature-box { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                        .sig-line { border-top: 1px solid #333; margin-top: 40px; text-align: center; font-size: 10px; font-weight: 900; text-transform: uppercase; }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="header" style="background: #d97706; color: white; padding: 30px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin-bottom: 30px;">
                            <div style="display: flex; gap: 20px; align-items: center;">
                                <img src="/lizandro.png" style="width: 60px; height: 60px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.3);" />
                                <div>
                                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">OS de Devolução</h1>
                                    <div style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 800;">ID: #${order.id}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; opacity: 0.8;">Data da Devolução</div>
                                <div style="font-size: 16px; font-weight: 900;">${new Date(order.date).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                            <div style="padding: 15px; background: #fffcf0; border-radius: 12px;">
                                <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #92400e; margin-bottom: 5px;">Dados do Cliente</div>
                                <div style="font-size: 14px; font-weight: 900;">${order.customerData?.fullName}</div>
                                <div style="font-size: 12px; font-weight: 600; color: #b45309;">${order.customerData?.phone}</div>
                            </div>
                            <div style="padding: 15px; background: #fffcf0; border-radius: 12px; text-align: right;">
                                <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #92400e; margin-bottom: 5px;">Pedido Original</div>
                                <div style="font-size: 14px; font-weight: 900;">#${order.linkedOrderId || 'N/A'}</div>
                                <div style="font-size: 12px; font-weight: 600; color: #b45309;">Vendedor: ${order.seller}</div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 30px;">
                            <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e293b; border-left: 4px solid #d97706; padding-left: 10px; margin-bottom: 15px;">Itens Devolvidos</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Descrição do Produto</th>
                                        <th style="text-align: center;">Qtd</th>
                                        <th style="text-align: right;">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>${itemsHtml}</tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="2" style="padding: 15px; text-align: right; font-weight: 900; font-size: 14px; text-transform: uppercase; color: #78350f;">Total do Estorno:</td>
                                        <td style="padding: 15px; text-align: right; font-weight: 900; font-size: 18px; color: #d97706;">R$ ${order.itemsSummary?.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        ${order.observation ? `
                            <div style="margin-top: 20px; padding: 20px; border-radius: 12px; background: #fffbeb; border: 1px solid #fef3c7;">
                                <strong style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #92400e; display: block; margin-bottom: 8px;">Observações da Devolução:</strong>
                                <div style="font-size: 12px; color: #92400e; font-weight: 500;">${order.observation}</div>
                            </div>
                        ` : ''}

                        <div class="signature-box">
                            <div>
                                <div class="sig-line">Assinatura do Cliente</div>
                            </div>
                            <div>
                                <div class="sig-line">Responsável Móveis Morante</div>
                            </div>
                        </div>

                        <div class="footer">
                            <strong>MÓVEIS MORANTE</strong> - Comprovante gerado em ${new Date().toLocaleString('pt-BR')}
                        </div>
                    </div>
                    <script>window.onload = function() { window.print(); window.close(); };</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
};

export interface OrderButton {
    key: keyof IsButtonsClicked;
    icon: string;
    action: OrderAction;
    label: string | ((order: Order) => string);
    color: string;
    tooltip: string;
    // Optional: which orderTypes this button applies to. If absent = all types.
    orderTypes?: string[];
}

export const buttons: OrderButton[] = [
    {
        key: "printShippingOrder",
        icon: "bi-printer-fill",
        action: "PRINT_SHIPPING_ORDER",
        label: "Imprimir Pedido",
        color: "text-blue-600 hover:bg-blue-50",
        tooltip: "Imprimir Pedido de Venda",
        orderTypes: ['sale']  // Não aparece para assistência
    },
    {
        key: "printReceipt",
        icon: "bi-receipt",
        action: "PRINT_RECEIPT",
        label: "Imprimir Recibo",
        color: "text-slate-600 hover:bg-slate-50",
        tooltip: "Gerar Recibo do Cliente",
        orderTypes: ['sale']  // Não aparece para assistência
    },
    {
        key: "sendShippingOrder",
        icon: "bi-truck",
        action: "SEND_SHIPPING_ORDER",
        label: (order) => order.shipping?.deliveryMethod === 'pickup' ? "Enviar Retirada para a equipe" : "Enviar Entrega para a equipe",
        color: "text-orange-500 hover:bg-orange-50",
        tooltip: "Enviar detalhes da entrega via WhatsApp",
        orderTypes: ['sale']  // Não aparece para assistência
    },
    {
        key: "sendCustomerOrder",
        icon: "bi-whatsapp",
        action: "SEND_CUSTOMER_ORDER",
        label: (order) => order.shipping?.deliveryMethod === 'pickup' ? "Enviar retirada para o cliente" : "Enviar entrega para o cliente",
        color: "text-green-600 hover:bg-green-50",
        tooltip: "Enviar confirmação do pedido para o cliente",
        orderTypes: ['sale']
    },
    {
        key: "sendCustomerOrderDetails",  // details message
        icon: "bi-whatsapp",
        action: "SEND_ASSISTANCE_ORDER_DETAILS",
        label: "Enviar assistência para o cliente",
        color: "text-green-600 hover:bg-green-50",
        tooltip: "Enviar detalhes completos do pedido de assistência ao cliente",
        orderTypes: ['assistance']
    },
    {
        key: "sendCustomerReviews",
        icon: "bi-star-fill",
        action: "SEND_CUSTOMER_REVIEWS",
        label: "Enviar pedido de avaliação",
        color: "text-yellow-500 hover:bg-yellow-50",
        tooltip: "Enviar pedido de avaliação da loja no Google Maps",
        orderTypes: ['sale']
    },
    {
        key: "generateReturn",
        icon: "bi-arrow-return-left",
        action: "GENERATE_RETURN",
        label: "Gerar Devolução",
        color: "text-amber-600 hover:bg-amber-50",
        tooltip: "Criar uma devolução baseada neste pedido",
        orderTypes: ['sale', 'showroom'] 
    },
    {
        key: "printReturnOS",
        icon: "bi-printer-fill",
        action: "PRINT_RETURN_OS",
        label: "Imprimir OS de Devolução",
        color: "text-amber-700 hover:bg-amber-50",
        tooltip: "Imprimir comprovante de devolução",
        orderTypes: ['return']
    },
    {
        key: "sendAssistanceOS",
        icon: "bi-send-fill",
        action: "SEND_ASSISTANCE_OS",
        label: "Enviar OS para a equipe",
        color: "text-blue-600 hover:bg-blue-50",
        tooltip: "Enviar Ordem de Serviço de assistência para o grupo da equipe",
        orderTypes: ['assistance']
    },
    {
        key: "printAssistanceOS",
        icon: "bi-printer-fill",
        action: "PRINT_ASSISTANCE_OS",
        label: "Imprimir OS",
        color: "text-slate-600 hover:bg-slate-50",
        tooltip: "Imprimir Ordem de Serviço (PDF)",
        orderTypes: ['assistance']
    },
    {
        key: "printBudget",
        icon: "bi-printer-fill",
        action: "PRINT_BUDGET",
        label: "Imprimir Orçamento",
        color: "text-indigo-600 hover:bg-indigo-50",
        tooltip: "Imprimir Proposta Comercial (Orçamento)",
        orderTypes: ['budget']
    },
    {
        key: "sendBudget",
        icon: "bi-whatsapp",
        action: "SEND_BUDGET",
        label: "Enviar orçamento para o cliente",
        color: "text-green-600 hover:bg-green-50",
        tooltip: "Enviar orçamento para o cliente via WhatsApp",
        orderTypes: ['budget']
    },
    {
        key: "sendGroupInvite",
        icon: "bi-people-fill",
        action: "SEND_GROUP_INVITE",
        label: "Enviar Convite VIP",
        color: "text-indigo-600 hover:bg-indigo-50",
        tooltip: "Enviar convite do grupo VIP para o WhatsApp do cliente",
        orderTypes: ['sale']
    },
];
