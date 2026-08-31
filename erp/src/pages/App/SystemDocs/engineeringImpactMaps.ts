export type EngineeringImpact = { action: string; effects: string[] };

export const engineeringImpactMaps: Record<string, EngineeringImpact[]> = {
    "Modelo operacional": [
        { action: "Salvar pedido", effects: ["orders: grava dados", "inventory_moves: registra origem quando aplicável", "saldo: recalculado pelo movimento"] },
        { action: "Persistir código", effects: ["orders: código empresarial sequencial", "listas: exibem código, não o ID do banco"] },
    ],
    "Pedidos de venda e devoluções": [
        { action: "Venda: Rascunho → Agendado", effects: ["Estoque: saída dos itens reais conforme automação", "Cronograma: pedido entra pelo agendamento", "Notificações: venda e montagens são comunicadas"] },
        { action: "Venda: Agendado → Atendido", effects: ["Estoque: completa baixa pendente sem duplicar", "Cronograma: pedido deixa de aparecer", "Pós-venda: devolução e avaliação ficam disponíveis"] },
        { action: "Venda → Cancelado", effects: ["Estoque: estorna saídas vinculadas e recompõe saldo", "Cronograma: remove pedido", "Mobile: cria notificação de cancelamento"] },
        { action: "Gerar pedido de devolução", effects: ["orders: cria retorno Agendado vinculado", "Estoque: não movimenta", "Venda original: mantém status e saídas"] },
        { action: "Criar devolução sem venda vinculada", effects: ["orders: grava cliente e itens sem linkedOrderId", "Estoque: não movimenta até Atendido", "Itens temporários: nunca criam entrada"] },
        { action: "Devolução: Agendado → Atendido", effects: ["Estoque: cria entradas dos itens devolvidos", "Cronograma: remove devolução", "Integridade: bloqueia cancelar e desfazer"] },
    ],
    "Orçamentos": [{ action: "Gerar venda", effects: ["Pedidos: cria nova venda independente", "Estoque e cronograma: só passam a agir no pedido gerado"] }],
    "Assistências": [{ action: "Agendar assistência", effects: ["Cronograma: exibe serviço no período", "Estoque: não usa a baixa automática de venda"] }],
    "Produtos e estoque": [
        { action: "Editar item e salvar", effects: ["Movimentações: estorna somente item anterior alterado", "Estoque: registra nova saída do estado atual", "Demais itens: mantêm seus movimentos"] },
        { action: "Usar produto temporário", effects: ["Estoque: item não cria movimento", "Venda: segue válida para os itens reais"] },
    ],
    "Movimentações e saldo": [{ action: "Criar ou estornar movimento", effects: ["Saldo: é recalculado", "Auditoria: guarda origem, motivo e reversão", "Relatórios: recebem a origem do lançamento"] }],
    "Entradas e saldo": [{ action: "Finalizar recebimento", effects: ["Movimentações: cria entradas por item", "Saldo: incrementa produto ou variação", "Auditoria: mantém origem do recebimento"] }],
    "Cronograma": [{ action: "Alterar status ou agendamento", effects: ["Pedidos agendados: entram no período filtrado", "Atendidos e cancelados: saem", "Mobile e ERP: atualização em tempo real"] }],
    "Inventário e auditoria": [{ action: "Finalizar contagem", effects: ["Movimentações: lança somente ajustes com diferença", "Saldo: reflete quantidade contada", "Auditoria: mantém responsável e histórico"] }],
};
