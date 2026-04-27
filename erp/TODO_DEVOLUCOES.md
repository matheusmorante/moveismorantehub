# Módulo de Devoluções - Status de Implementação

## ✅ Concluído
- **Padronização Visual:** Identidade visual alterada de Vermelho para **Âmbar (#d97706)** em todo o sistema.
- **Navegação:** Inclusão de links diretos para "Devoluções" nos menus Desktop e Mobile.
- **CRUD de Devoluções:**
  - Rota `/returns` configurada para listar apenas pedidos do tipo `return`.
  - Botão "Nova Devolução" adicionado à listagem de devoluções.
  - Suporte ao tipo `return` no modal de criação de pedidos (`NewSaleOrder`) com cores e ícones correspondentes.
  - Edição e exclusão (lixeira) integradas.
- **Geração Vinculada:**
  - Botão "Gerar Devolução" (Âmbar) disponível no menu de ações de Vendas e Showroom.
  - Modal de geração permite selecionar itens e quantidades para devolução.
  - **Novo:** Armazenamento de `returnOrderId` no pedido original para rastreabilidade bidirecional.
- **Reversão (Desfazer):**
  - Implementada a ação "Desfazer Devolução" que alterna com o botão de gerar.
  - A reversão mescla os itens de volta ao pedido original, restaura totais, limpa observações e exclui o registro de devolução e seus movimentos de estoque.
- **Visual:**
  - Badge de devolução (ícone âmbar) adicionado à linha do pedido original quando uma devolução está vinculada.
- **Impressão:** Template de OS de Devolução padronizado com cabeçalho âmbar e layout informativo.

## 📌 Ideias e Planos Pendentes
- **Dashboard de Estornos:** Criar um gráfico no dashboard principal para monitorar o volume de devoluções vs vendas.
- **Notificação Automática:** Enviar mensagem de WhatsApp ao cliente quando uma devolução for finalizada com sucesso.
- **Ajuste de Estoque Automático:** Validar se a devolução está realmente voltando os itens ao estoque (atualmente requer verificação manual dependendo da configuração do produto).
- **Relatório de Motivos:** Adicionar um campo obrigatório de "Motivo da Devolução" para análise estatística futura.

## 🎨 Paleta de Cores (Devoluções)
- **Principal:** Âmbar (`#d97706`)
- **Fundo suave:** `bg-amber-50`
- **Ícone:** `bi-arrow-return-left`
