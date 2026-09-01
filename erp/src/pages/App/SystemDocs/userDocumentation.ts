import type { DocumentationSection } from "./systemDocumentation";

export const userDocumentation: DocumentationSection[] = [
    {
        title: "Vendedor",
        icon: "bi-person-badge-fill",
        summary: "Guia para registrar vendas, acompanhar pedidos e tratar cancelamentos ou devoluções sem comprometer o estoque.",
        rules: [
            "Use Rascunho apenas enquanto preenche. Ao cadastrar um pedido válido, ele passa a Agendado.",
            "Pedido Agendado ou Atendido pode ser editado. Se item ou quantidade mudar, confirme o resumo antes de salvar para ajustar somente a movimentação daquele item.",
            "Cancelamento é definitivo: estorna as saídas e exige a criação de outro pedido caso a venda precise ser refeita.",
            "Devolução vinculada nasce de venda Atendida. Na tela Devoluções, use Nova devolução sem venda vinculada para registrar cliente e itens sem relacionar uma venda.",
        ],
        flow: [{ title: "Preencher", detail: "Inclua cliente, itens, pagamento e agendamento." }, { title: "Cadastrar", detail: "Pedido passa a Agendado." }, { title: "Acompanhar", detail: "Marque Atendido ao concluir a venda." }, { title: "Pós-venda", detail: "Use devolução somente para itens realmente recebidos de volta." }],
    },
    {
        title: "Entregador e montador",
        icon: "bi-truck",
        summary: "Guia para acompanhar entregas e montagens programadas e concluir atendimentos realizados.",
        rules: [
            "Consulte o cronograma pelo período e tipo de atividade antes de sair para a rota.",
            "Pedidos Agendados aparecem no cronograma; Atendidos e Cancelados não aparecem mais.",
            "Após concluir a entrega ou montagem, marque o pedido como Atendido. Se houver divergência, registre-a antes de concluir.",
            "Na etapa Em atendimento, confira cada pagamento. Forma e valor podem ser ajustados, mas todos precisam estar como Pago para liberar a finalização.",
            "Não cancele pedido para corrigir um atendimento concluído: comunique o responsável para aplicar o fluxo correto de venda ou devolução.",
        ],
        flow: [{ title: "Consultar", detail: "Filtre data e tipo no cronograma." }, { title: "Executar", detail: "Realize entrega ou montagem conforme o pedido." }, { title: "Atualizar", detail: "Marque Atendido após a execução." }, { title: "Divergência", detail: "Encaminhe a ocorrência antes de alterar o status." }],
    },
    {
        title: "Almoxarifado",
        icon: "bi-box-seam-fill",
        summary: "Guia para recebimentos, inventários e leitura das movimentações que atualizam o saldo físico do estoque.",
        rules: [
            "Registre o recebimento de mercadoria com itens reais para criar entradas e atualizar o saldo.",
            "O custo do recebimento atualiza o custo médio do saldo. Não trate custo desconhecido como custo zero.",
            "Movimentação é o histórico de cada entrada, saída, ajuste ou estorno. Consulte o detalhe para saber origem e motivo.",
            "A devolução só cria entrada quando o pedido de devolução é marcado como Atendido, após confirmação de segurança de cinco segundos.",
            "Inicie uma contagem com responsável. Cada diferença efetiva gera ajuste ao finalizar; inventário em andamento pode ser excluído.",
        ],
        flow: [{ title: "Receber", detail: "Registre a mercadoria que chegou." }, { title: "Conferir", detail: "Veja saldo e movimentos por item físico." }, { title: "Contar", detail: "Faça inventário com responsável." }, { title: "Ajustar", detail: "Finalize apenas após conferir as divergências." }],
    },
];
