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
- **Gemini API Key**: `__REDACTED_GCP_API_KEY__` (Salvo para futura integração com IA no Catálogo/ERP)

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
- **Gemini API Key**: `__REDACTED_GCP_API_KEY__` (Salvo para futura integração com IA no Catálogo/ERP)

## Filtro e Menu de Navegação (Em andamento)
- **Correção da Queima dos Salvados**: Consulta ajustada no Supabase para filtrar exclusivamente pelo ID da oportunidade `opportunity_id = 9d8bedae-b366-4f8c-ac49-74b85b882bde`.
- **Destaque do Menu Superior**: Sincronizar UUID da oportunidade com o estado ativo do botão no SubHeader.
## Formulário de Pedidos ERP (Em andamento)
- **Alinhamento de Colunas**: Ajustar a tabela de itens do Pedido de Vendas para alinhar perfeitamente cabeçalhos (th) e campos de entrada (td), corrigindo a exibição do Manuseio e breakpoint móbile.
- **Inputs Monetários (R$)**: Selo `R$` ajustado nos componentes `CurrencyInput` e `CurrencyOrPercentInput` para ficar posicionado à esquerda do campo de entrada.
- **Autocomplete Limpo de Produtos**: Remover sugestões de histórico ('HISTÓRICO') e exibir apenas produtos/variações do catálogo com nome limpo e preenchimento de preços.
- **Migração obrigatória de formulários (14/10/2026):** React Hook Form + zodResolver em todos os caminhos, inclusive autosave, perfil, autenticação, buscas e cadastro administrativo. Acesso/perfil/categorias/buscas já têm integração localizada; o editor administrativo de produto e seus subformulários permanecem pendentes de conferência. Estado central: `../docs/forms/migracao-rhf-zod-2026-10-14.md`. Não declarar conclusão pela simples instalação/importação.
- **Envio Direto via WhatsApp Cloud API**: Permitir o disparo direto de mensagens para clientes na Lista de Pedidos e na Lista de Produtos sem abrir o aplicativo/WhatsApp Web. Exibe o alerta padronizado `"Mensagem enviada com sucesso"` na tela ao concluir o disparo.
- **Impressão de Etiquetas**: Implementado o motor unificado de renderização [`PriceLabelArtRenderer.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Stock/LabelPrinting/PriceLabelArtRenderer.tsx), compartilhado de forma 1:1 entre o **Editor de Arte** e o **Resultado Final da Etiqueta** ([`LabelItem.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Stock/LabelPrinting/LabelItem.tsx)). O editor e a folha de impressão agora utilizam o **mesmo artboard virtual travado em 840x480 pixels** com auto-escalonamento vetorial (`ResizeObserver` + `transform: scale`), garantindo que o design montado no editor seja reproduzido com fidelidade milimétrica absoluta e máxima nitidez. O espaçamento e z-index da área de trabalho do editor foram calibrados para que as caixas delimitadoras de seleção, alças de redimensionamento e botões de rotação fiquem com ampla margem de visualização e nunca fiquem escondidos sob o cabeçalho ou rodapé. O botão avulso "Branco" foi removido da barra de busca de produtos: ao clicar em **"+ ADICIONAR"** com o campo de produto vazio, o sistema insere automaticamente a quantidade informada de **Etiquetas em Branco (espaçadores)** na fila.
- **Página de Configurações no ERP**: Reformulada para o modelo em lista sanfonada (accordion) agrupada em "MINHA CONTA" e "SISTEMA". Botões, inputs e campos redesenhados para ficarem **menores, ultra cleans e ocupando menos espaço**. Removidos alertas em pop-up (toasts) a cada alteração e alterado o selo do cabeçalho para **"Salvamento Automático"**. O tópico **"Descrições por Canal"** foi removido do sumário principal, tendo seu campo integrado diretamente dentro do tópico **WhatsApp & Catálogo**.










- **Continuação RHF (14/10):** eliminadas cópias dos contratos Zod em favor de reexports de `../shared-utils`; Next passa a incluir a raiz compartilhada. Editor de produto e seus anexos/variações têm integração conferida; buscas desktop/móvel/sugestões agora possuem proprietário único com RHF. Build e typecheck do catálogo passaram. A conferência global dos formulários permanece no inventário central.

## Meta integral de formulários — 15/10/2026

Conferir todos os callbacks do catálogo com React Hook Form + zodResolver, schemas compartilhados explícitos, payload parseado e erros visíveis. O censo inicial localizou 31 arquivos candidatos (13 com integração localizada), incluindo campos filhos e wrappers; isso não representa conclusão. Inventário: `../docs/forms/inventario-mobile-catalogo-2026-10-15.md`. Antes de alterar código Next.js, consultar o guia pertinente de `node_modules/next/dist/docs/`, conforme AGENTS.md. Manter autenticação/permissões no backend e testes sem publicação ou alteração comercial remota.

### Autenticação conferida — 15/10

Login/recuperação/cadastro mantêm zodResolver ativo durante Auth/perfil e têm prazo local compartilhado sem retry automático. Sete testes das páginas com Supabase/router simulados passaram; TypeScript completo e lint dos arquivos passaram. Build Next passou antes do ajuste final de catch, conferido depois por testes/TypeScript/lint. Continuar pelos demais proprietários do inventário; ainda falta prova real de navegação e dos fluxos de conta/admin, sem declarar conclusão global.

### Perfil conferido — 15/10

Os seis caminhos de nome/e-mail/senha agora mantêm o resolver até terminar o serviço e compartilham proteção contra concorrência. Corrigida a ordem dos hooks na chegada/saída da sessão, uso dos valores parseados e erro de logout retornado pelo provedor. Dez testes do perfil passaram (17 com autenticação); TypeScript, lint da página e build Next finais também passaram. Auth/router/abas simulados, sem mudança real de conta. Continuar pelo inventário, incluindo navegação de usuário/admin e demais proprietários; três páginas do catálogo conferidas, sem percentual global inferido do censo.

### Fronteira de formulário — 15/10

ZodForm sem consumidor ativo localizado foi conferido: onValid obrigatório recebe valores parseados, espera pelo callback e apresenta falha. Três testes específicos passaram; o conjunto completo do catálogo soma 20, com TypeScript, lint da fronteira e build Next finais aprovados. Não contar a fronteira técnica como página operacional. Continuar com navegação de usuário/admin, buscas, categorias e produto, preservando proprietário dos campos filhos e as pendências do inventário central.
