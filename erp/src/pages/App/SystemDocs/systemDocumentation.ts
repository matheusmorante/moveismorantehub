import type { FlowStep } from "./DocumentationFlow";

export type DocumentationSection = {
    title: string;
    icon: string;
    summary: string;
    rules: string[];
    flow: FlowStep[];
};

export const systemDocumentation: DocumentationSection[] = [
    {
        title: "Modelo operacional",
        icon: "bi-diagram-3-fill",
        summary: "Pedidos ficam em order_data na tabela orders. Movimentos ficam em inventory_moves e alteram o saldo do produto ou da variação.",
        rules: [
            "Códigos empresariais sequenciais de seis dígitos para pedidos e recebimentos.",
            "Produto pai é referência; variação representa o item físico.",
            "Movimentos registram produto, variação, quantidade, data, origem e observação.",
            "Pedido, movimentos e saldo são atualizados em sequência pelo serviço ao salvar.",
        ],
        flow: [{ title: "Cadastro", detail: "Pedido, itens e cliente ficam em orders." }, { title: "Movimento", detail: "A origem é registrada em inventory_moves." }, { title: "Saldo", detail: "Produto ou variação recebe o saldo recalculado." }],
    },
    {
        title: "Pedidos de venda e devoluções",
        icon: "bi-cart-check-fill",
        summary: "Vendas e devoluções formam um mesmo fluxo operacional: a venda reduz estoque e a devolução atendida registra a entrada correspondente.",
        rules: [
            "Rascunho é criado durante o preenchimento e não pode voltar a ser escolhido depois do cadastro.",
            "Ao cadastrar um pedido válido, ele passa para Agendado; isso habilita os gatilhos de cronograma e de estoque configurados.",
            "Agendado pode ser marcado como atendido mediante confirmação; atendido pode voltar a agendado sem alterar itens ou valores.",
            "Pedido cancelado tem status definitivo; para refazer, usa-se Copiar pedido.",
            "Pedido de devolução pode nascer de venda atendida, mantendo o vínculo, ou ser criado sem venda vinculada com cliente e itens próprios. Em ambos os casos nasce Agendado e não movimenta estoque ao ser gerado.",
            "Ao marcar a devolução como Atendida, uma confirmação de cinco segundos informa que a entrada será criada apenas para os itens e quantidades devolvidos.",
            "Devolução Agendada não cria entrada. Se o item estiver temporário, a entrada fica pendente até o produto ser reconciliado no pedido de venda; uma devolução já atendida recebe automaticamente essa entrada histórica após a reconciliação.",
            "A devolução preserva a saída original da venda. A entrada de retorno usa o CMV histórico da venda quando disponível e participa do CMPM; nunca usa custo atual como se fosse nova compra.",
            "Devolução em Rascunho pode ser excluída. Depois de Atendida, não pode ser cancelada ou desfeita; para corrigir a operação, deve-se gerar novo pedido de venda.",
        ],
        flow: [{ title: "Rascunho", detail: "Preenchimento sem saída de estoque." }, { title: "Agendado", detail: "Cronograma e baixa configurada são acionados." }, { title: "Atendido", detail: "Venda concluída; devolução pode ser criada." }, { title: "Devolução atendida", detail: "Após confirmação de cinco segundos, cria entrada e fica definitiva." }],
    },
    {
        title: "Orçamentos",
        icon: "bi-file-earmark-text-fill",
        summary: "Orçamentos registram propostas comerciais sem efetivar venda ou movimentar estoque.",
        rules: [
            "O orçamento pode ser impresso ou enviado ao cliente sem criar saída de estoque.",
            "Ao gerar um pedido de venda a partir do orçamento, nasce um novo pedido; os gatilhos de estoque e cronograma passam a valer somente para essa venda.",
        ],
        flow: [{ title: "Proposta", detail: "Valores e itens são montados sem estoque." }, { title: "Envio", detail: "Pode ser impresso ou enviado ao cliente." }, { title: "Gerar venda", detail: "Cria pedido separado, com seus próprios gatilhos." }],
    },
    {
        title: "Assistências",
        icon: "bi-tools",
        summary: "Assistências mantêm dados de serviço, itens associados e agendamento próprio, separados do fluxo de venda.",
        rules: [
            "O cronograma pode exibir assistências agendadas conforme tipo e período selecionados.",
            "A baixa automática de estoque da venda não é aplicada a uma assistência; qualquer movimentação deve seguir o fluxo específico do serviço.",
        ],
        flow: [{ title: "Abrir assistência", detail: "Registra serviço e itens associados." }, { title: "Agendar", detail: "Entra no cronograma conforme período e tipo." }, { title: "Executar", detail: "Segue fluxo próprio, sem baixa automática de venda." }],
    },
    {
        title: "Produtos e estoque",
        icon: "bi-lightning-charge-fill",
        summary: "Cada mudança de status afeta, de forma independente, o estoque, as movimentações e o cronograma. Produtos físicos são sempre variações; produto pai não recebe saldo.",
        rules: [
            "Rascunho: não gera saída nem altera saldo. Se já tiver data ou agendamento preenchido, aparece no cronograma apenas para planejamento.",
            "Cadastro válido → Agendado: o pedido entra no cronograma conforme data e filtros. Para itens reais, cria saídas quando Agendado estiver configurado como status de baixa (padrão do sistema).",
            "Atendido: sai do cronograma. Se a saída ainda não existir, o status pode disparar a baixa configurada; não duplica saída já processada.",
            "Cancelado: sai do cronograma, estorna todas as movimentações de venda vinculadas, recompõe o saldo e redefine stockProcessed. Não pode ser reaberto ou editado.",
            "O cancelamento também registra uma notificação para o aplicativo; a entrega por push depende de token ativo no dispositivo.",
            "Na lista de pedidos, Agendado e Atendido podem ser editados. A comparação dos itens ocorre somente ao clicar em Salvar alterações — abrir ou mudar campos no formulário não movimenta estoque.",
            "Quando produto ou quantidade de item real muda, Salvar alterações abre uma confirmação com o antes e o depois. Somente Confirmar e salvar executa o estorno e o novo lançamento.",
            "Ao salvar uma alteração em item real já baixado, o sistema estorna a saída do item anterior e cria nova saída para o item atualizado. Quantidade, produto, preço ou desconto alterados contam como mudança.",
            "Somente o item modificado é estornado e relançado; itens não alterados preservam seus movimentos. Item temporário não cria movimento e não bloqueia a baixa dos itens reais do mesmo pedido.",
            "No aplicativo, a finalização da entrega exige que cada pagamento esteja Pago. O atendente pode corrigir forma e valor; a conclusão grava pagamentos e resumo atualizado no pedido.",
        ],
        flow: [{ title: "Variação", detail: "Representa o item físico e recebe saldo." }, { title: "Venda agendada", detail: "Item real pode gerar saída configurada." }, { title: "Editar e salvar", detail: "Item alterado é estornado e relançado após confirmação." }, { title: "Cancelar", detail: "Estorna movimentos, recompõe saldo e bloqueia o pedido." }],
    },
    {
        title: "Movimentações e saldo",
        icon: "bi-box-arrow-up-right",
        summary: "A venda gera saídas ao atingir o status configurado de baixa. Nas alterações, Agendado ou Atendido acionam a tentativa de processamento.",
        rules: [
            "Cada item real, com productId, gera sua própria baixa; item temporário não gera movimento e não bloqueia os demais.",
            "A saída usa o custo médio vigente (CMPM) materializado em costPrice; não usa FIFO nem média geral de todas as aquisições.",
            "Ao salvar a edição de item real já baixado, a saída antiga é estornada e uma nova saída é lançada para o item atualizado; itens não alterados são preservados.",
            "O campo stockProcessed rastreia se a saída já foi lançada para o pedido.",
        ],
        flow: [{ title: "Origem", detail: "Venda, recebimento, inventário ou ajuste cria movimento." }, { title: "Rastreio", detail: "Movimento guarda produto, variação, quantidade e motivo." }, { title: "Estorno", detail: "Reverte apenas o movimento vinculado e justifica a reversão." }],
    },
    {
        title: "Custo médio, CMV e reconstrução",
        icon: "bi-calculator-fill",
        summary: "O histórico válido de inventory_moves é a fonte da verdade. stock e costPrice são o estado atual materializado para manter operações normais rápidas.",
        rules: [
            "stock é o saldo atual e costPrice é o Custo Médio Ponderado Móvel (CMPM) vigente. O valor atual é derivado por stock × costPrice; não há um segundo campo de valor de estoque.",
            "Recebimento confirmado incorpora quantidade e custo real: (saldo × custo médio + quantidade recebida × custo de aquisição) ÷ novo saldo.",
            "Venda usa o costPrice vigente, grava esse CMV no item e na movimentação da venda, reduz stock e preserva o custo médio das unidades restantes.",
            "Com estoque zerado, o próximo recebimento inicia uma nova base de custo; custo antigo não participa do cálculo.",
            "Custo desconhecido é não apurado, nunca custo zero. Relatórios de CMV, lucro e margem usam o CMV histórico materializado da venda, não o costPrice atual.",
            "Correção histórica de entrada exige replay cronológico do produto/variação afetado: recalcula CMVs posteriores e substitui o cache final de stock e costPrice.",
            "Integridade crítica: histórico válido → replay deve produzir o mesmo stock e costPrice materializados, salvo arredondamento monetário.",
        ],
        flow: [{ title: "Recebimento", detail: "Atualiza saldo e recalcula CMPM." }, { title: "Venda", detail: "Usa CMPM vigente e materializa CMV." }, { title: "Correção histórica", detail: "Replay corrige CMVs e reconstrói o cache." }],
    },
    {
        title: "Entradas e saldo",
        icon: "bi-box-arrow-in-down",
        summary: "Recebimentos, compras e lançamentos manuais criam entradas. A gravação recalcula saldo do produto e, quando aplicável, da variação.",
        rules: [
            "Recebimento finalizado cria entrada para cada item vinculado.",
            "Entradas, saídas e ajustes alteram o saldo.",
            "Inventário confirmado só gera ajuste para diferença efetiva.",
        ],
        flow: [{ title: "Receber", detail: "Compra ou recebimento finalizado registra entrada." }, { title: "Contar", detail: "Inventário compara saldo físico e sistema." }, { title: "Ajustar", detail: "Somente divergência efetiva gera ajuste." }],
    },
    {
        title: "Cronograma",
        icon: "bi-calendar-week-fill",
        summary: "O cronograma operacional apresenta pedidos com agendamento preenchido, obedecendo data e filtros de período ativos.",
        rules: [
            "Rascunho com data ou agendamento preenchido aparece para planejamento, mas não faz movimentação de estoque.",
            "Pedidos agendados aparecem no cronograma; atendidos e cancelados não aparecem.",
            "Ao desfazer atendimento, o pedido pode voltar ao cronograma se sua data estiver dentro do filtro.",
        ],
        flow: [{ title: "Agendamento", detail: "Data ou pendência define o planejamento." }, { title: "Filtro", detail: "Período e tipo determinam a visualização." }, { title: "Status", detail: "Atendido ou cancelado deixa de aparecer." }],
    },
    {
        title: "Inventário e auditoria",
        icon: "bi-clipboard2-check-fill",
        summary: "A contagem salva o andamento e, ao finalizar, lança apenas ajustes que realmente mudam o saldo.",
        rules: [
            "Responsável é obrigatório e vem da lista de funcionários.",
            "Inventários em andamento podem ser excluídos.",
            "Ajuste é gerado apenas para divergência efetiva.",
        ],
        flow: [{ title: "Iniciar", detail: "Responsável e itens compõem a contagem." }, { title: "Salvar andamento", detail: "Alterações da contagem são persistidas." }, { title: "Finalizar", detail: "Divergências viram ajustes auditáveis." }],
    },
    {
        title: "Catálogo Digital e Status de Canais",
        icon: "bi-shop-window",
        summary: "Os canais de venda (ERP e Catálogo Digital) operam de maneira 100% independente para flexibilidade comercial.",
        rules: [
            "O estado do produto no ERP (Ativo / Inativo) não interfere no Catálogo Digital (Publicado / Ocultado), e vice-versa.",
            "Produtos desativados no ERP permanecem na listagem normal com selo indicativo, sem aba isolada.",
            "Botões bipartidos de 'Status de Canais' permitem alternar ERP e Catálogo em 1 clique tanto na tabela quanto nos cards e variações.",
            "Para ativar no ERP, são validados Nome, Preço de Venda, Categoria e Fornecedor. Preço de custo não é exigido previamente (é alimentado por compras ou saldo inicial).",
            "O alerta de ativação destaca especificamente apenas os campos que estiverem de fato faltando.",
        ],
        flow: [
            { title: "Status ERP", detail: "Controla se o produto está ativo para novos pedidos." },
            { title: "Status Catálogo", detail: "Controla a visibilidade na vitrine online pública." },
            { title: "Independência", detail: "Desativar no ERP preserva o catálogo e vice-versa." },
        ],
    },
    {
        title: "Recibos e Assinatura Digital ICP-Brasil",
        icon: "bi-shield-check",
        summary: "Recibos de venda possuem carimbo de autenticidade criptográfica e QR Code público para validação em conformidade técnica.",
        rules: [
            "Assinatura manual do vendedor foi eliminada do recibo de venda.",
            "O recibo traz carimbo oficial padrão ICP-Brasil / A1 com dados da empresa, emissor responsável e hash determinístico da venda.",
            "QR Code dinâmico gerado via biblioteca criptográfica permite ao cliente ou terceiro escanear e consultar a autenticidade do documento.",
            "Observações por item são concatenadas com ' - ' na descrição do produto em recibos, folhas de pedido, ordens de serviço e mensagens de WhatsApp.",
        ],
        flow: [
            { title: "Venda concluída", detail: "Gera identificador determinístico para o recibo." },
            { title: "Carimbo ICP-Brasil", detail: "Emite certificado digital com dados do emissor." },
            { title: "QR Code Dinâmico", detail: "Permite leitura e validação pública instantânea." },
        ],
    },
    {
        title: "Emissão Fiscal SEFAZ-PR Direta",
        icon: "bi-file-earmark-lock2-fill",
        summary: "Emissão e comunicação direta com a SEFAZ-PR para NF-e e NFC-e sem necessidade de APIs ou intermediários pagos.",
        rules: [
            "Comunicação SOAP HTTPS mTLS diretamente com os servidores da Receita Estadual do Paraná.",
            "Autenticação e assinatura de lote XML via Certificado Digital A1 no padrão W3C XMLDSig.",
            "Isolamento rigoroso de ambiente: Homologação (tpAmb: 2) para testes e Produção (tpAmb: 1) para operações fiscais reais.",
            "Tratamento automático de duplicidades (Rejeição 204) e contingência offline com retransmissão síncrona.",
        ],
        flow: [
            { title: "Montagem do XML", detail: "Gera estrutura tributária conforme NCM, CSOSN e CFOP do pedido." },
            { title: "Assinatura A1", detail: "Aplica certificado digital e calcula digest value do lote." },
            { title: "Transmissão SEFAZ", detail: "Envia lote mTLS e recebe protocolo de autorização." },
        ],
    },
    {
        title: "Aplicativo Mobile e Operações Offline-First",
        icon: "bi-phone-vibrate-fill",
        summary: "Arquitetura resiliente focada no risco operacional de campo (entregas, montagens e conferência de almoxarifado).",
        rules: [
            "Offline-first restrito à operação de campo: entregas, montagens, checklists, fotos, assinaturas e contagem de inventário.",
            "Gravação por eventos atômicos de negócio com UUID idempotente, timestamp e ciclo de 4 estados: PENDING → SYNCING → CONFIRMED / REJECTED.",
            "O estado REJECTED interrompe retentativas automáticas e alerta o operador sobre inconsistência de negócio.",
            "Fila de upload separada para mídias pesadas (fotos comprimidas), garantindo agilidade na transmissão de eventos de texto.",
            "O backend é a autoridade estrita e final para validação de regras de negócio e lançamentos de estoque.",
        ],
        flow: [
            { title: "Registro Local", detail: "Evento gerado e gravado no SQLite em estado PENDING." },
            { title: "Sincronização", detail: "Gerenciador em segundo plano transmite lote quando há rede (SYNCING)." },
            { title: "Autoridade Backend", detail: "Backend valida e confirma (CONFIRMED) ou rejeita com justificativa (REJECTED)." },
        ],
    },
    {
        title: "Colaboradores, Vendedores e Segurança",
        icon: "bi-person-badge",
        summary: "Governança de acessos, elegibilidade de vendedores e preservação histórica de autoria nas vendas.",
        rules: [
            "Apenas pessoas cadastradas como colaboradores ativos com perfil de acesso válido aparecem como opções de vendedor na venda.",
            "O pedido grava um snapshot permanente do identificador (sellerId) e do nome do vendedor (seller), preservando o histórico para comissões.",
            "A alteração posterior de dados do colaborador não corrompe nem altera o histórico de vendas já realizadas.",
            "Geração obrigatória de código sequencial único de 6 dígitos (#000000) com blindagem contra sobrescritas acidentais.",
        ],
        flow: [
            { title: "Colaborador Ativo", detail: "Verifica elegibilidade e credenciais de acesso no ERP." },
            { title: "Seleção na Venda", detail: "Vendedor selecionado no formulário de novo pedido." },
            { title: "Snapshot Histórico", detail: "Grava sellerId e seller imutáveis no pedido para relatórios e auditoria." },
        ],
    },
];
