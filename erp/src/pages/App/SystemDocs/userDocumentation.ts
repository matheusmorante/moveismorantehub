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
    {
        title: "Cadastro de Produtos e Canais",
        icon: "bi-tags-fill",
        summary: "Guia para cadastrar, ativar e gerenciar a publicação de produtos nos canais de venda (ERP e Catálogo Digital).",
        rules: [
            "Para ativar um produto ou variação no ERP, não é necessário custo antecipado; preencha apenas Nome, Preço de Venda, Categoria e Fornecedor.",
            "Use os botões bipartidos da coluna 'Status de Canais' para ativar/desativar no ERP ou publicar/ocultar no Catálogo com um único clique.",
            "Produtos desativados permanecem na listagem normal com selo próprio, sem irem para uma tela separada.",
            "Na aba Fotos, utilize imagens quadradas 1:1 e ferramentas de recorte livre sem bordas internas.",
        ],
        flow: [
            { title: "Cadastrar", detail: "Preencha dados básicos e selecione categoria e fornecedor." },
            { title: "Ativar ERP", detail: "Ative para permitir o uso em vendas e estoque." },
            { title: "Publicar Catálogo", detail: "Publique para exibir no catálogo digital público." },
        ],
    },
    {
        title: "Gerência e Controle Operacional",
        icon: "bi-shield-shaded",
        summary: "Guia para acompanhamento de vendas, auditoria de cancelamentos, conciliação e comissões de colaboradores.",
        rules: [
            "Acompanhe o desempenho de vendas utilizando o filtro de vendedores elegíveis e o relatório de comissões.",
            "Pedidos agendados cancelados estornam automaticamente os movimentos de estoque e exibem carimbo CANCELADO em destaque.",
            "Utilize a Conciliação Comercial para associar produtos cadastrados a vendas que continham itens temporários para efeito de métricas analíticas.",
            "Pedidos vencidos há mais de 5 dias da data de entrega são atendidos automaticamente pelo sistema para garantir conformidade de saldo.",
        ],
        flow: [
            { title: "Auditar Pedidos", detail: "Confira vendas agendadas, canceladas e atendidas." },
            { title: "Conciliar Itens", detail: "Vincule itens temporários para qualificar relatórios comerciais." },
            { title: "Fechar Período", detail: "Analise comissões e balanço de estoque de forma consistente." },
        ],
    },
    {
        title: "Comprovantes e Validação Digital",
        icon: "bi-qr-code-scan",
        summary: "Guia para emissão de recibos digitais com QR Code, carimbo ICP-Brasil e envio automatizado aos clientes.",
        rules: [
            "Recibos contam com assinatura digital e QR Code público dinâmico para validação imediata no smartphone.",
            "Observações cadastradas no item de venda são anexadas automaticamente ao nome do produto na folha de pedido, no recibo e no WhatsApp.",
            "Para reimprimir ou reenviar um pedido com comprovante assinado, acerte as opções no botão de Ações pós-venda ou no menu do pedido.",
            "Cada pedido possui código sequencial único de 6 dígitos (#000000) impresso no topo de todos os documentos oficiais.",
        ],
        flow: [
            { title: "Emitir Recibo", detail: "Gera documento assinado digitalmente com padrão ICP-Brasil." },
            { title: "Leitura QR Code", detail: "Cliente ou fiscal confere autenticidade pelo celular." },
            { title: "Disparar WhatsApp", detail: "Envia link e detalhes formatados com as observações registradas." },
        ],
    },
];
