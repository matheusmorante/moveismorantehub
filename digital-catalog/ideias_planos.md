# Ideias e Planos Pendentes — Móveis Morante

Este documento serve para guardar ideias de melhorias futuras para o sistema da loja Móveis Morante.

## Painel Admin & Analytics (Em andamento)
- **Melhorias de UX**: Tornar a página principal do admin em um Dashboard interativo.
- **Gráficos de Engajamento**: Criar gráficos em SVG para monitorar produtos mais vistos, cliques para o carrinho do WhatsApp e tempo de engajamento.
- **Termos de Busca**: Identificar quais palavras são mais procuradas pelos clientes para facilitar decisões de estoque.

## Integração Meta Catalog (Concluído)
- Ajustado o arquivo CSV para manter quebras de linha e emojis no catálogo do WhatsApp.
- Removido o cache da API para sincronização imediata.
- Fixada a quantidade padrão para vender em `1` item no CSV.

## Credenciais e APIs
- **Gemini API Key**: `AIzaSyCPtMVEueWaBPvX-cbJY2CSnf5jdonu5uQ` (Salvo para futura integração com IA no Catálogo/ERP)

## Filtro e Menu de Navegação (Em andamento)
- **Correção da Queima dos Salvados**: Ajustar consulta no Supabase para buscar produtos por `is_salvado = true` ou por `opportunity_id` combinados via `.or()`.
- **Destaque do Menu Superior**: Sincronizar UUID da oportunidade com o estado ativo do botão no SubHeader.
## Formulário de Pedidos ERP (Em andamento)
- **Alinhamento de Colunas**: Ajustar a tabela de itens do Pedido de Vendas para alinhar perfeitamente cabeçalhos (th) e campos de entrada (td), corrigindo a exibição do Manuseio e breakpoint móbile.
- **Varinha Mágica do Pagamento**: Ajustar o botão da varinha mágica para funcionar bidirecionalmente (aumentando ou reduzindo o valor pago para casar com o total do pedido).
- **Autocomplete Limpo de Produtos**: Remover sugestões de histórico ('HISTÓRICO') e exibir apenas produtos/variações do catálogo com nome limpo e preenchimento de preços.





