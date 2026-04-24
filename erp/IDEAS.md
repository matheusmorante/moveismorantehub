# 💡 Ideias e Planos Pendentes - Móveis Morante HUB

Este arquivo contém o registro de melhorias, ideias e planos pendentes para o sistema, servindo como guia para futuras sessões de desenvolvimento.

---

## ✅ Concluído Recentemente (Março 2026)

### 📦 Módulo de Pedidos de Venda
- **Resumo do Pedido (Passo 5):** Interface rica e compacta em duas colunas, otimizada para evitar rolagem. Exibe itens, pagamentos, dados do cliente e logística (Entregue vs Retirada) em uma única tela.
- **Validação Inteligente (Hover):** Botões de ação desativados (Imprimir, Enviar) agora exibem um overlay premium ao passar o mouse, detalhando quais campos obrigatórios ainda faltam.
- **Navegação Simplificada:** Remoção dos botões "Anterior" e "Próximo" do rodapé nos passos intermediários, centralizando o controle no Stepper superior.
- **Identificação Visual:** Cores associadas aos métodos de logística: **Esmeralda/Verde** para Entrega e **Roxo/Índigo** para Retirada na Loja.
- **Módulo de Orçamentos:** Novo fluxo de "Orçamento" integrado ao menu de Pedidos. Permite criar propostas sem obrigatoriedade de cliente ou forma de pagamento imediata, com interface simplificada que foca nos itens e logística de frete. Botão de impressão de orçamento adicionado.
- **Configuração de Juros e Bandeiras:** Nova interface premium para configurar taxas de juros por número de parcelas (limitado a 10x). Pré-configuradas bandeiras VISA, MASTER, ELO e HIPERCARD com 0% e SENFF com juros customizáveis.
- **Logística de Montagem:** Corrigida a lista de montagem para filtrar corretamente os itens baseando-se na modalidade (Entrega vs Retirada) e nas configurações de cada opção de manuseio. Resolvidos erros de carregamento (400) e avisos de DOM nesting.

### 🛠️ Módulo de Assistência Técnica
- **Ajuste de Fluxo:** Campo de vínculo com pedido original movido para o topo do formulário.
- **Limpeza de Campos:** Remoção de campos financeiros redundantes (Custo Interno, Valor de Serviço no corpo da descrição) para simplificar a criação.
- **Lógica de Dados:** Ocultação automática do campo de telefone quando há um pedido de venda vinculado (evita redundância).

## ✅ Concluído Recentemente (Abril 2026)

### 📊 Relatórios e BI
- **Menu de Relatórios:** O submenu "Relatórios de Venda" foi renomeado para **"Relatório de Vendas CSV"** em todas as interfaces (Desktop, Mobile e título da página). Isso visa diferenciar claramente os relatórios baseados em importação de dados manuais (CSV) dos relatórios integrados via API (Bling).
- **Relatório de Estoque (Giro e Reservas):** Adicionado novo botão de relatório na gestão de estoque que exibe de forma consolidada os produtos vendidos (finalizados) e a quantidade de pedidos/unidades em rascunho ou agendados, permitindo uma visão clara do comprometimento do estoque.
- **Ajuste de Layout no Cronograma:** Implementada largura mínima para as colunas e cards de pedidos na visualização de tabela do cronograma logístico. Isso garante que as informações permaneçam legíveis e bem estruturadas, evitando o esmagamento das colunas em dias com muitos horários.




---

## 🚀 Planos e Ideias Futuras

### 📊 Estoque e Logística
- **[IDEIA] Mapa de Entregas Iterativo:** No Filtro de Cronograma de Entregas, adicionar uma visualização de mapa com pins coloridos para as entregas do dia selecionado.
- **[IDEIA] Baixa de Estoque Automática:** Integrar o botão "Baixar Estoque" com um log de movimentações mais detalhado (quem, quando, por que).
- **[IDEIA] Sugestão de Rota:** Agrupar entregas por bairro/cidade automaticamente no cronograma.

### 💳 Financeiro
- **[IDEIA] Link de Pagamento Dinâmico:** Gerar QR Code Pix dinâmico diretamente no resumo do pedido (Passo 5). (Parcialmente implementado: QR Code Pix estático/manual disponível no modal de pagamento).
- **[IDEIA] Fluxo de Caixa:** Criar uma aba de "Entradas do Dia" baseada nos pagamentos de pedidos finalizados.

### 🧩 Experiência do Usuário (UX/UI)
- **[MELHORIA] Dark Mode Polish:** Revisar contrastes em tabelas durante o modo escuro para garantir legibilidade 100%.
- **[IDEIA] Atalhos de Teclado:** Adicionar `Ctrl + S` para salvar rascunhos ou `Enter` para avançar steps no formulário de venda.

---

> [!NOTE]
> Este documento deve ser atualizado ao final de cada grande ciclo de mudanças para garantir que o contexto histórico e as ideias criativas não se percam.
