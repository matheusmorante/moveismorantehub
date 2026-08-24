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
- **Correção da Queima dos Salvados**: Consulta ajustada no Supabase para filtrar exclusivamente pelo ID da oportunidade `opportunity_id = 9d8bedae-b366-4f8c-ac49-74b85b882bde`.
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
- **Correção da Queima dos Salvados**: Consulta ajustada no Supabase para filtrar exclusivamente pelo ID da oportunidade `opportunity_id = 9d8bedae-b366-4f8c-ac49-74b85b882bde`.
- **Destaque do Menu Superior**: Sincronizar UUID da oportunidade com o estado ativo do botão no SubHeader.
## Formulário de Pedidos ERP (Em andamento)
- **Alinhamento de Colunas**: Ajustar a tabela de itens do Pedido de Vendas para alinhar perfeitamente cabeçalhos (th) e campos de entrada (td), corrigindo a exibição do Manuseio e breakpoint móbile.
- **Inputs Monetários (R$)**: Selo `R$` ajustado nos componentes `CurrencyInput` e `CurrencyOrPercentInput` para ficar posicionado à esquerda do campo de entrada.
- **Autocomplete Limpo de Produtos**: Remover sugestões de histórico ('HISTÓRICO') e exibir apenas produtos/variações do catálogo com nome limpo e preenchimento de preços.
- **Envio Direto via WhatsApp Cloud API**: Permitir o disparo direto de mensagens para clientes na Lista de Pedidos e na Lista de Produtos sem abrir o aplicativo/WhatsApp Web. Exibe o alerta padronizado `"Mensagem enviada com sucesso"` na tela ao concluir o disparo.
- **Impressão de Etiquetas**: Implementado o motor unificado de renderização [`PriceLabelArtRenderer.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Stock/LabelPrinting/PriceLabelArtRenderer.tsx), compartilhado de forma 1:1 entre o **Editor de Arte** e o **Resultado Final da Etiqueta** ([`LabelItem.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Stock/LabelPrinting/LabelItem.tsx)). O editor e a folha de impressão agora utilizam o **mesmo artboard virtual travado em 840x480 pixels** com auto-escalonamento vetorial (`ResizeObserver` + `transform: scale`), garantindo que o design montado no editor seja reproduzido com fidelidade milimétrica absoluta e máxima nitidez. O espaçamento e z-index da área de trabalho do editor foram calibrados para que as caixas delimitadoras de seleção, alças de redimensionamento e botões de rotação fiquem com ampla margem de visualização e nunca fiquem escondidos sob o cabeçalho ou rodapé. O botão avulso "Branco" foi removido da barra de busca de produtos: ao clicar em **"+ ADICIONAR"** com o campo de produto vazio, o sistema insere automaticamente a quantidade informada de **Etiquetas em Branco (espaçadores)** na fila.
- **Página de Configurações no ERP**: Reformulada para o modelo em lista sanfonada (accordion) agrupada em "MINHA CONTA" e "SISTEMA". Botões, inputs e campos redesenhados para ficarem **menores, ultra cleans e ocupando menos espaço**. Removidos alertas em pop-up (toasts) a cada alteração e alterado o selo do cabeçalho para **"Salvamento Automático"**. O tópico **"Descrições por Canal"** foi removido do sumário principal, tendo seu campo integrado diretamente dentro do tópico **WhatsApp & Catálogo**.









