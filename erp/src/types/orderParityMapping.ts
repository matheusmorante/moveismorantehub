import React from 'react';

/**
 * MATRIZ DE MAPEAMENTO CAMPO A CAMPO
 * Auditoria Definitiva de Paridade: Legado (order_data / orders.items) vs Normalizado (orders, order_items, order_payments)
 * 
 * Classificação:
 * Categoria A: Dado operacional normalizado (deve existir em coluna/tabela normalizada)
 * Categoria B: Snapshot histórico legítimo (deve permanecer em JSON/snapshot porque representa o estado histórico no momento da venda)
 * Categoria C: Compatibilidade temporária (existe para suportar leitores legados antes do desligamento total)
 * Categoria D: Dado derivável (reconstruível via SQL / computação funcional a partir da estrutura normalizada)
 * Categoria E: Suspeito / sem destino (bloqueia desligamento se for operacional e sem destino)
 */

export interface FieldMapping {
  campoLegado: string;
  local: string;
  destinoNormalizado: string;
  categoria: 'A' | 'B' | 'C' | 'D' | 'E';
  consumidores: string;
  paridade: 'TOTAL' | 'PARCIAL' | 'SNAPSHOT_LEGITIMO' | 'DERIVAVEL';
  justificativa: string;
}

export const ORDER_PARITY_FIELD_MATRIX: FieldMapping[] = [
  // ── CABEÇALHO BÁSICO & IDENTIFICAÇÃO ──
  {
    campoLegado: 'id',
    local: 'order_data.id',
    destinoNormalizado: 'orders.id',
    categoria: 'A',
    consumidores: 'Todos os módulos (PK do pedido)',
    paridade: 'TOTAL',
    justificativa: 'Identificador primário do pedido mantido idêntico em ambas as estruturas.'
  },
  {
    campoLegado: 'orderNumber / orderIndex',
    local: 'order_data.orderNumber / order_data.orderIndex',
    destinoNormalizado: 'orders.order_number / orders.order_index',
    categoria: 'A',
    consumidores: 'Listagem, buscas, relatórios, impressão de comprovantes',
    paridade: 'TOTAL',
    justificativa: 'Código sequencial de 6 dígitos espelhado em colunas dedicadas indexadas.'
  },
  {
    campoLegado: 'status',
    local: 'order_data.status',
    destinoNormalizado: 'orders.status',
    categoria: 'A',
    consumidores: 'Esteira logística, filtros, agenda, relatórios de vendas, estoque',
    paridade: 'TOTAL',
    justificativa: 'Máquina de estados (draft, scheduled, fulfilled, cancelled) mantida em orders.status.'
  },
  {
    campoLegado: 'orderType',
    local: 'order_data.orderType',
    destinoNormalizado: 'orders.order_type',
    categoria: 'A',
    consumidores: 'PDV, relatórios, devoluções, orçamentos, assistências',
    paridade: 'TOTAL',
    justificativa: 'Tipo da operação (sale, budget, return, assistance) em coluna dedicada indexada.'
  },
  {
    campoLegado: 'date',
    local: 'order_data.date',
    destinoNormalizado: 'orders.created_at',
    categoria: 'A',
    consumidores: 'Linha do tempo, relatórios, ordenação cronológica',
    paridade: 'TOTAL',
    justificativa: 'Timestamp da venda refletido fielmente em created_at com fuso e precisão.'
  },
  {
    campoLegado: 'observation',
    local: 'order_data.observation',
    destinoNormalizado: 'orders.notes',
    categoria: 'A',
    consumidores: 'Agenda, romaneio de entrega, montadores, detalhe do pedido',
    paridade: 'TOTAL',
    justificativa: 'Observações e avisos gerais do pedido refletidos na coluna notes.'
  },

  // ── CLIENTE & CRM ──
  {
    campoLegado: 'customerData.id',
    local: 'order_data.customerData.id',
    destinoNormalizado: 'orders.customer_id',
    categoria: 'A',
    consumidores: 'CRM, histórico do cliente, busca por CPF/CNPJ',
    paridade: 'TOTAL',
    justificativa: 'FK para a tabela people (type=customers).'
  },
  {
    campoLegado: 'customerData.fullName',
    local: 'order_data.customerData.fullName',
    destinoNormalizado: 'orders.customer_name',
    categoria: 'A',
    consumidores: 'Listagem de pedidos, cards da agenda, buscas textuais',
    paridade: 'TOTAL',
    justificativa: 'Nome congelado do cliente em orders.customer_name para pesquisas de alta performance.'
  },
  {
    campoLegado: 'customerData (snapshot completo)',
    local: 'order_data.customerData (phone, address, cpfCnpj)',
    destinoNormalizado: 'order_data.customerData / people (tabela)',
    categoria: 'B',
    consumidores: 'Impressão de contrato, romaneio de entrega, CRM',
    paridade: 'SNAPSHOT_LEGITIMO',
    justificativa: 'Snapshot do cliente no instante da venda. Preservado para impedir que alterações cadastrais futuras no CRM alterem notas fiscais ou romaneios históricos já emitidos.'
  },

  // ── VENDEDOR & EQUIPE ──
  {
    campoLegado: 'seller / sellerData.fullName',
    local: 'order_data.seller / order_data.sellerData.fullName',
    destinoNormalizado: 'orders.seller_name',
    categoria: 'A',
    consumidores: 'Comissões, filtros por vendedor, relatórios',
    paridade: 'TOTAL',
    justificativa: 'Nome do vendedor mantido em coluna dedicada.'
  },
  {
    campoLegado: 'sellerId',
    local: 'order_data.sellerId',
    destinoNormalizado: 'orders.seller_id',
    categoria: 'A',
    consumidores: 'Comissões, autenticação, permissões por filial/vendedor',
    paridade: 'TOTAL',
    justificativa: 'FK para a tabela employees / people.'
  },

  // ── LOGÍSTICA, ENTREGA & AGENDAMENTO ──
  {
    campoLegado: 'shipping.deliveryMethod',
    local: 'order_data.shipping.deliveryMethod',
    destinoNormalizado: 'orders.delivery_method',
    categoria: 'A',
    consumidores: 'Agenda, romaneio, separação de pedidos, filtros',
    paridade: 'TOTAL',
    justificativa: 'Modalidade (delivery vs pickup) mantida em orders.delivery_method.'
  },
  {
    campoLegado: 'shipping.scheduling.date',
    local: 'order_data.shipping.scheduling.date',
    destinoNormalizado: 'orders.scheduled_date',
    categoria: 'A',
    consumidores: 'Calendário de rotas, agenda logística, kanban de entregas',
    paridade: 'TOTAL',
    justificativa: 'Data operacional da entrega/retirada mantida em coluna DATE indexada.'
  },
  {
    campoLegado: 'shipping.scheduling.startTime / endTime',
    local: 'order_data.shipping.scheduling.startTime / endTime',
    destinoNormalizado: 'orders.scheduled_start_time / orders.scheduled_end_time',
    categoria: 'A',
    consumidores: 'Roteirização de frotas, janelas de entrega na agenda',
    paridade: 'TOTAL',
    justificativa: 'Janelas horárias (ex: 14:00 - 18:00) normalizadas em colunas dedicadas.'
  },
  {
    campoLegado: 'shipping.deliveryStatus',
    local: 'order_data.shipping.deliveryStatus',
    destinoNormalizado: 'orders.delivery_status',
    categoria: 'A',
    consumidores: 'Tracking de motoristas mobile, painel de rotas',
    paridade: 'TOTAL',
    justificativa: 'Status da viagem (pending, in_transit, delivered) em coluna física.'
  },
  {
    campoLegado: 'shipping.routeGeoJSON / destinationCoords / distance',
    local: 'order_data.shipping.routeGeoJSON / destinationCoords',
    destinoNormalizado: 'order_data.shipping (snapshot geográfico)',
    categoria: 'B',
    consumidores: 'Roteirizador de mapas Leaflet/OSRM, auditoria de trajeto',
    paridade: 'SNAPSHOT_LEGITIMO',
    justificativa: 'Polígono do trajeto e coordenadas calculadas no momento do agendamento. Dado pesado de telemetria que deve permanecer em snapshot sem onerar consultas relacionais.'
  },

  // ── ITENS DO PEDIDO (order_items) ──
  {
    campoLegado: 'items[].productId',
    local: 'orders.items[].productId / order_data.items[].productId',
    destinoNormalizado: 'order_items.product_id',
    categoria: 'A',
    consumidores: 'Estoque, movimentações, relatórios de CMV, catálogo',
    paridade: 'TOTAL',
    justificativa: 'FK para a tabela products.'
  },
  {
    campoLegado: 'items[].variationId',
    local: 'orders.items[].variationId',
    destinoNormalizado: 'order_items.variation_id',
    categoria: 'A',
    consumidores: 'Estoque de variações, cores, voltagens',
    paridade: 'TOTAL',
    justificativa: 'Identificador da variação do produto normalizado em coluna física.'
  },
  {
    campoLegado: 'items[].code / SKU',
    local: 'orders.items[].code',
    destinoNormalizado: 'order_items.code',
    categoria: 'A',
    consumidores: 'Busca por código, etiqueta, conferência física',
    paridade: 'TOTAL',
    justificativa: 'Código comercial do produto no item do pedido.'
  },
  {
    campoLegado: 'items[].description',
    local: 'orders.items[].description',
    destinoNormalizado: 'order_items.description',
    categoria: 'A',
    consumidores: 'Romaneio, lista de itens, relatórios de vendas, nota fiscal',
    paridade: 'TOTAL',
    justificativa: 'Descrição do item normalizada em coluna indexada.'
  },
  {
    campoLegado: 'items[].quantity',
    local: 'orders.items[].quantity',
    destinoNormalizado: 'order_items.quantity',
    categoria: 'A',
    consumidores: 'Baixa de estoque, cálculo de totais, relatórios',
    paridade: 'TOTAL',
    justificativa: 'Quantidade numérica do item.'
  },
  {
    campoLegado: 'items[].unitPrice',
    local: 'orders.items[].unitPrice',
    destinoNormalizado: 'order_items.unit_price',
    categoria: 'A',
    consumidores: 'Financeiro, faturamento, batimento de valores',
    paridade: 'TOTAL',
    justificativa: 'Preço unitário em NUMERIC(12,2).'
  },
  {
    campoLegado: 'items[].unitDiscount / discountType',
    local: 'orders.items[].unitDiscount / discountType',
    destinoNormalizado: 'order_items.unit_discount / order_items.discount_type',
    categoria: 'A',
    consumidores: 'DRE, margem de contribuição, auditoria de descontos',
    paridade: 'TOTAL',
    justificativa: 'Desconto comercial unitário e tipo (fixed/percentage).'
  },
  {
    campoLegado: 'items[].costPrice',
    local: 'orders.items[].costPrice',
    destinoNormalizado: 'order_items.cost_price',
    categoria: 'A',
    consumidores: 'CMV, Lucro Bruto, relatório de rentabilidade',
    paridade: 'TOTAL',
    justificativa: 'Custo histórico unitário do produto na data da venda.'
  },
  {
    campoLegado: 'items[].handlingType',
    local: 'orders.items[].handlingType',
    destinoNormalizado: 'order_items.handling_type',
    categoria: 'A',
    consumidores: 'Módulo de montagens, comissão de montadores',
    paridade: 'TOTAL',
    justificativa: 'Regra operacional (montagem_inclusa, entrega_sem_montagem, etc.).'
  },
  {
    campoLegado: 'items[].condition',
    local: 'orders.items[].condition',
    destinoNormalizado: 'order_items.condition',
    categoria: 'A',
    consumidores: 'Classificação de avarias, saldo de mostruário',
    paridade: 'TOTAL',
    justificativa: 'Condição do item (novo, mostruario, com_avaria).'
  },
  {
    campoLegado: 'items[].observation',
    local: 'orders.items[].observation',
    destinoNormalizado: 'order_items.observation',
    categoria: 'A',
    consumidores: 'Instruções de montagem, romaneio',
    paridade: 'TOTAL',
    justificativa: 'Observações específicas do produto/montagem.'
  },
  {
    campoLegado: 'items[].itemSnapshot',
    local: 'orders.items[].itemSnapshot',
    destinoNormalizado: 'order_items.item_snapshot',
    categoria: 'B',
    consumidores: 'Histórico de especificações (cor, tecido, medidas originais)',
    paridade: 'SNAPSHOT_LEGITIMO',
    justificativa: 'Snapshot com as especificações do catálogo na data da venda.'
  },
  {
    campoLegado: 'orders.items (coluna JSONB na tabela orders)',
    local: 'orders.items',
    destinoNormalizado: 'order_items (tabela filha)',
    categoria: 'C',
    consumidores: 'Leitores legados em transição para order_items',
    paridade: 'TOTAL',
    justificativa: 'Coluna JSONB mantida pelo dual-write para compatibilidade até o desligamento do READ legado.'
  },

  // ── PAGAMENTOS DO PEDIDO (order_payments) ──
  {
    campoLegado: 'payments[].method',
    local: 'order_data.payments[].method',
    destinoNormalizado: 'order_payments.payment_method',
    categoria: 'A',
    consumidores: 'Fluxo de caixa, conciliação bancária, relatórios financeiros',
    paridade: 'TOTAL',
    justificativa: 'Forma de pagamento (Dinheiro, Pix, Cartão de Crédito, etc.).'
  },
  {
    campoLegado: 'payments[].amount',
    local: 'order_data.payments[].amount',
    destinoNormalizado: 'order_payments.amount',
    categoria: 'A',
    consumidores: 'Contas a receber, totalizadores financeiros, fluxo de caixa',
    paridade: 'TOTAL',
    justificativa: 'Valor pago/faturado em NUMERIC(12,2).'
  },
  {
    campoLegado: 'payments[].fee / feeType',
    local: 'order_data.payments[].fee / feeType',
    destinoNormalizado: 'order_payments.fee / order_payments.fee_type',
    categoria: 'A',
    consumidores: 'DRE, despesas com taxas de cartão e intermediadores',
    paridade: 'TOTAL',
    justificativa: 'Taxa da operadora de pagamento.'
  },
  {
    campoLegado: 'payments[].status',
    local: 'order_data.payments[].status',
    destinoNormalizado: 'order_payments.status',
    categoria: 'A',
    consumidores: 'Contas a receber, inadimplência, conciliação',
    paridade: 'TOTAL',
    justificativa: 'Status do pagamento (PAGO, PENDENTE, etc.).'
  },
  {
    campoLegado: 'payments[].installments',
    local: 'order_data.payments[].installments',
    destinoNormalizado: 'order_payments.installments',
    categoria: 'A',
    consumidores: 'Contas a receber, projeção de fluxo futuro',
    paridade: 'TOTAL',
    justificativa: 'Número de parcelas.'
  },
  {
    campoLegado: 'payments[].date',
    local: 'order_data.payments[].date',
    destinoNormalizado: 'order_payments.paid_at',
    categoria: 'A',
    consumidores: 'Relatório diário de caixa, extrato bancário',
    paridade: 'TOTAL',
    justificativa: 'Data da quitação ou vencimento.'
  },

  // ── VALORES TOTAIS & RESUMOS ──
  {
    campoLegado: 'paymentsSummary.totalOrderValue',
    local: 'order_data.paymentsSummary.totalOrderValue',
    destinoNormalizado: 'orders.total_amount',
    categoria: 'A',
    consumidores: 'Faturamento total, dashboard, comissões',
    paridade: 'TOTAL',
    justificativa: 'Valor final líquido do pedido mantido em orders.total_amount.'
  },
  {
    campoLegado: 'itemsSummary.itemsSubtotal',
    local: 'order_data.itemsSummary.itemsSubtotal',
    destinoNormalizado: 'orders.items_subtotal',
    categoria: 'A',
    consumidores: 'Relatórios de vendas, cálculos de margem',
    paridade: 'TOTAL',
    justificativa: 'Soma dos itens antes de frete e descontos.'
  },
  {
    campoLegado: 'itemsSummary.totalFixedDiscount',
    local: 'order_data.itemsSummary.totalFixedDiscount',
    destinoNormalizado: 'orders.total_discount',
    categoria: 'A',
    consumidores: 'Auditoria fiscal, DRE',
    paridade: 'TOTAL',
    justificativa: 'Total de descontos concedidos no pedido.'
  },
  {
    campoLegado: 'itemsSummary.totalItemsCost',
    local: 'order_data.itemsSummary.totalItemsCost',
    destinoNormalizado: 'orders.total_cost',
    categoria: 'A',
    consumidores: 'Relatórios de CMV, Lucro Operacional',
    paridade: 'TOTAL',
    justificativa: 'Custo total dos produtos do pedido.'
  },
  {
    campoLegado: 'paymentsSummary.amountRemaining',
    local: 'order_data.paymentsSummary.amountRemaining',
    destinoNormalizado: 'orders.total_amount - SUM(order_payments.amount)',
    categoria: 'D',
    consumidores: 'Cobrança, alerta de saldo pendente',
    paridade: 'DERIVAVEL',
    justificativa: 'Dado derivável matematicamente do cabeçalho e dos pagamentos.'
  },

  // ── VÍNCULOS & DEVOLUÇÕES ──
  {
    campoLegado: 'linkedOrderId',
    local: 'order_data.linkedOrderId',
    destinoNormalizado: 'orders.linked_order_id',
    categoria: 'A',
    consumidores: 'Módulo de devoluções, troca de produtos, estorno financeiro',
    paridade: 'TOTAL',
    justificativa: 'FK que amarra a devolução ao pedido de venda de origem.'
  },
  {
    campoLegado: 'returnOrderId',
    local: 'order_data.returnOrderId',
    destinoNormalizado: 'orders.return_order_id',
    categoria: 'A',
    consumidores: 'Pedido original avisando que possui devolução gerada',
    paridade: 'TOTAL',
    justificativa: 'Referência inversa de devolução.'
  },

  // ── CONTROLE OPERACIONAL DE ESTOQUE ──
  {
    campoLegado: 'stockProcessed',
    local: 'order_data.stockProcessed',
    destinoNormalizado: 'orders.stock_processed',
    categoria: 'A',
    consumidores: 'Garantia de que o pedido deu baixa física no almoxarifado',
    paridade: 'TOTAL',
    justificativa: 'Flag booleana indicando processamento de saída no estoque.'
  },
  {
    campoLegado: 'isStockChecked',
    local: 'order_data.isStockChecked',
    destinoNormalizado: 'orders.is_stock_checked',
    categoria: 'A',
    consumidores: 'Conferência física na expedição',
    paridade: 'TOTAL',
    justificativa: 'Flag booleana de conferência física de estoque.'
  },

  // ── CONTROLES DE INTERFACE & METADADOS (isButtonsClicked) ──
  {
    campoLegado: 'isButtonsClicked',
    local: 'order_data.isButtonsClicked (printReceipt, sendBudget, etc.)',
    destinoNormalizado: 'order_data.isButtonsClicked',
    categoria: 'B',
    consumidores: 'Indicadores visuais de cliques na UI (recibo impresso, WhatsApp enviado)',
    paridade: 'SNAPSHOT_LEGITIMO',
    justificativa: 'Metadados visuais de conveniência da UI. Não possuem relevância relacional nem impacto fiscal/contábil/estoque; mantidos no snapshot JSON.'
  }
];
