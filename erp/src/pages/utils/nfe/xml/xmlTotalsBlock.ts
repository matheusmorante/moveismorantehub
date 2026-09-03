import Order from "@/pages/types/order.type";

export function buildTotalsAndPaymentXml(order: Order, vProdTotal: number, vDescTotal: number): string {
    const vFrete = Number(order.shipping?.fee || 0);
    const vNF = (vProdTotal - vDescTotal + vFrete).toFixed(2);

    // Modalidade de Frete: 0=Remetente/Entrega, 9=Sem frete/Retirada
    const modFrete = order.shipping?.deliveryMethod === 'pickup' ? '9' : '0';

    // Meio de pagamento
    const paymentMethods = (order as any).payments || [];
    let tPag = '99'; // Outros
    if (paymentMethods.length > 0) {
        const method = (paymentMethods[0]?.method || '').toLowerCase();
        if (method.includes('dinheiro') || method.includes('cash')) tPag = '01';
        else if (method.includes('credito') || method.includes('credit')) tPag = '03';
        else if (method.includes('debito') || method.includes('debit')) tPag = '04';
        else if (method.includes('pix')) tPag = '17';
    }

    return `
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${vProdTotal.toFixed(2)}</vProd>
        <vFrete>${vFrete.toFixed(2)}</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${vDescTotal.toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${vNF}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>${modFrete}</modFrete>
    </transp>
    <pag>
      <detPag>
        <tPag>${tPag}</tPag>
        <vPag>${vNF}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI/ICMS. Pedido #${order.orderIndex || order.id}</infCpl>
    </infAdic>`;
}
