# Auditoria de Egress — Supabase MoranteHub

## Estado atual — 27/10/2026, 08:23 BRT

CLI/plugin autenticados e ref hkoxhourxwlddgsfdgws reconfirmados. Sem medidor oficial Usage/Egress: bytes, quota, excedente, delta e meta confirmada de 100 MB/dia não verificáveis. Janela 27/10 08:15–11:15 UTC (05:15–08:15 BRT): gateway 491 eventos, todos REST. Nenhuma nova correção de código nesta rodada. EGR-005 já presente: Central com timer de 30 segundos; decisão anterior sobre 6/30 segundos resolvida. Economia em bytes não medida, implantação não verificada. Recorrência ACTIVE/3 h preservada.
## Coleta inicial — 25/10/2026, 09:35 BRT (12:35 UTC)

Projeto confirmado: `hkoxhourxwlddgsfdgws` (MoranteHub). Primeira coleta desta auditoria; não havia relatório anterior. Automação existente ACTIVE, intervalo de três horas conferido no arquivo de configuração; agendamento preservado.

**Egress em bytes, quota e excedente: indisponíveis.** A redescoberta das ferramentas do plugin não encontrou medidor explícito de Usage/Egress. CLI instalada `2.121.0`: ajuda raiz, `projects`, `projects list`, `inspect`, `inspect db` e `telemetry` sem medidor de cobrança/Egress identificado. `telemetry` controla a telemetria da própria CLI. Nenhum comando de inspeção do banco foi executado. Não converter contagens, tamanho de tabelas ou Storage em bytes/custo. Sem baseline comparável, sem delta e sem redução medida.

CLI e plugin autenticados com acesso ao projeto correto; vínculo local em `supabase/.temp/project-ref` também confere. A CLI retorna envelope JSON `projects`, tratado sem imprimir identidade ou credenciais. Sem `link`, `init`, atualizações de CLI, navegador/dashboard, SQL de banco ou alterações remotas.

## Coleta oficial de logs (contagens, não Egress)

Fonte: plugin Supabase `query_logs`; janela exata **2026-10-25T09:30:00Z a 2026-10-25T12:30:00Z**, equivalente a **06:30–09:30 BRT**. Duas consultas agregadas, sem polling: contagem por `source` e contagem de `edge_logs` por serviço, rota REST normalizada e status.

Campos autorizados e documentados: `source`, `log_attributes['request.path']`, `log_attributes['response.status_code']`. Somente `count()` e agrupamentos; sem mensagens, headers, query strings, parâmetros, SQL de usuários ou corpos. Rotas restritas por expressão regular ao nome estático da tabela/RPC, sem IDs ou caminhos de objetos. Referência: [detecção e consultas ClickHouse oficiais](https://supabase.com/docs/guides/observability/detecting).

| Fonte | Entradas |
| --- | ---: |
| postgres_logs | 612 |
| edge_logs | 156 |
| postgrest_logs | 105 |

Essas fontes descrevem eventos distintos: não somar como requisições. As 156 entradas de `edge_logs` agrupadas foram de `rest/v1`:

| Rota (prefixo `/rest/v1/`) | Status HTTP | Requisições |
| --- | ---: | ---: |
| rpc/claim_return_fiscal_emission_job | 200 | 90 |
| categories | 200 | 25 |
| category_relationships | 200 | 16 |
| store_style_settings | 200 | 14 |
| products | 200 | 8 |
| opportunities | 200 | 2 |
| products | 206 | 1 |

Não há atribuição por cliente, tamanho de resposta, método ou versão implantada nesta coleta. O status 206 isolado não comprova falha. A RPC fiscal tem maior contagem, mas não comprova maior Egress ou polling indevido; fluxo fiscal não inspecionado/alterado nesta rodada. Ausência de outras fontes nesta janela não comprova ausência de tráfego de Storage/Realtime fora da cobertura dos logs.

## Correção EGR-001 — projeção excessiva na página de categorias

- **Sintoma e causa comprovados no código:** `CategoryPage.loadData` solicitava `*` de categorias e vínculos em toda mudança de slug. A página utiliza `id`, `slug` e `type`; conserva `name` no contrato de categorias. Os vínculos seguem o contrato `parent_id, child_id`. Campos extras não são consumidos. O tipo local de categorias também declara `image_url` e `created_at`, que eram pedidos sem necessidade; nenhum registro remoto foi lido para essa conclusão.
- **Arquivo/linhas alterados:** `digital-catalog/src/app/categorias/[slug]/page.tsx:55–56`.
- **Solução:** `categories.select('id, name, slug, type')` e `category_relationships.select('parent_id, child_id')`, igual aos contratos já usados no catálogo. Preservados ordenação por nome, conjunto de registros, identificação do ambiente/categoria, normalização de slug, estados e frequência de carga. Nenhuma nova política de cache.
- **Revisão estática:** consumidores conferidos na própria página (`:59–89`, `:120–126`) e em `digital-catalog/src/features/products/components/product-filter.tsx:17` (atualmente só usa os controles do painel). Outros consumidores de categorias/vínculos usam projeções equivalentes em `digital-catalog/src/components/layout/sub-header/use-sub-header-data.ts:17–18` e `digital-catalog/src/app/page.tsx:59–60`. Diff final limitado às duas linhas; `git diff --check` passou no arquivo.
- **Efeito esperado:** deixar de solicitar colunas sem uso; magnitude em bytes não medida. Não altera o número de requests. Patch apenas local, sem commit ou deploy; não associar a coleta anterior à correção.
- **Validação pendente:** UI de categorias/ambientes, slugs alternativos e filtros, além de comparação oficial de bytes em janela equivalente depois de uma implantação autorizada. Nenhum teste adicionado/executado, conforme instrução desta automação.

## Inventário inicial de integrações e chamadores

Inventário parcial, priorizado pelas rotas observadas; não representa auditoria completa do ERP/app. Correlação identifica chamadores possíveis no código, sem atribuir a eles a contagem remota.

| Integração / finalidade | Arquivos e chamadas exatas | Gatilho / frequência | Deduplicação, cache e cancelamento | Evidência / risco |
| --- | --- | --- | --- | --- |
| PostgREST: categorias da página | `digital-catalog/src/app/categorias/[slug]/page.tsx:52–96`, duas consultas de EGR-001 | Montagem e mudança de slug | Effect próprio, sem cache/deduplicação/abort | Projeção corrigida; 25/16 requests nas rotas, cliente não identificado |
| PostgREST: menus de ambientes | `digital-catalog/src/components/layout/sub-header/use-sub-header-data.ts:7–49`, selects de categorias e vínculos; chamadores `sub-header/index.tsx:24` e `header/mobile-menu.tsx:69` | Um par por carga; instâncias simultâneas compartilham a promessa | EGR-002: promessa em voo, descartada em sucesso/rejeição; sem TTL/cache persistente/abort | Duplicação estrutural corrigida localmente; montagens após conclusão voltam a consultar. Sem atribuição remota ou economia medida |
| PostgREST: metadados da home | `digital-catalog/src/app/page.tsx:55–78`, selects de categorias/vínculos/oportunidades ativas | Entrada na home, conforme estado da query | React Query `catalog-meta`, fresco 10 min, retenção 30 min; sem abort explícito | Chave distinta da query de categorias da grade; possível repetição entre consumidores |
| PostgREST/RPC: grade e busca | `digital-catalog/src/features/products/components/product-grid.tsx:35–63` → `hooks/useCatalogProductsQuery.ts:55–200`; `categories`, vínculos por ambiente, oportunidades, `search_catalog_product_page` e produtos com relações | Página/filtros/ordenação; texto com debounce de 300 ms | Categorias 10/30 min; produtos 2/10 min; React Query por chave; sem abort explícito; BroadcastChannel invalida produtos/categorias | Página de 15 produtos; busca usa IDs paginados. Variantes/atributos/imagens são relações aninhadas; tamanho remoto não lido. Fallbacks de schema podem repetir consulta em erros; nenhum erro observado na janela |
| PostgREST: estilo visual | `digital-catalog/src/lib/store-settings-cache.ts:8–31` → `store-design-provider.tsx:18` e `useCatalogProductsQuery.ts:206`; adicional direto `digital-catalog/src/app/produto/[slug]/page.tsx:28` | Montagem do provider, carga da grade e detalhes de produto | Cache de módulo e promessa em voo para helper, sem TTL; detalhe solicita apenas `button_style` | 14 chamadas observadas; cache existente não é compartilhado entre sessões/reloads. Não comprova defeito ou oportunidade de TTL |
| PostgREST: opções administrativas | `digital-catalog/src/features/products/components/admin-modal/hooks/useAdminProductData.ts:54–84,205–219` → `admin-product-modal.tsx:107` | Abertura do modal/troca de produto | State por instância, sem cache/abort para opções | `*` em opções; não estreitado sem revisar todos os consumidores administrativos |
| ERP/app: categorias | `erp/src/pages/utils/categoryService.ts:51,92`; `mobile/src/features/products/services/mobileCategoryService.ts:32,66` | Não aprofundado nesta rodada | Não avaliado | Mesmas rotas têm outros chamadores; impede atribuir tráfego só ao catálogo |
| PostgREST: fila fiscal | `rpc/claim_return_fiscal_emission_job` | Frequência/caller não apurados nesta rodada | Não avaliado | 90 chamadas/3 h; contagem não prova falha. Inspeção exige antes a documentação fiscal vigente |

O provider do catálogo mantém QueryClient por montagem e desativa refetch ao focar a janela (`digital-catalog/src/lib/react-query-provider.tsx:7–16`). BroadcastChannel é comunicação local entre abas, não uma assinatura Supabase Realtime. Nenhum polling foi encontrado nos hooks da grade examinados; não generalizar para o restante do repositório.

## Decisões e próximos passos

1. **Meta confirmada: 100 MB por dia de Database Egress/PostgREST.** Operador respondeu em 25/10/2026; decisão registrada às 10:22 BRT (13:22 UTC). Usar essa meta nas próximas auditorias, sempre informando a janela exata do medidor oficial disponível. Nenhum limite configurado. Sem medidor oficial, não é possível verificar o cumprimento da meta. Valores anteriores “200”/“1.500” não são baseline porque faltam unidade, medidor e período.
2. **Menus duplicados:** compartilhamento de carga simultânea implementado localmente em EGR-002 na segunda execução. Cache por minutos continua fora do patch: exige decisão de frescor/invalidação; bytes poupados desconhecidos.
3. **Medição:** redescobrir medidor oficial na próxima rodada. Sem medidor na CLI/plugin, permanecer com contagens agregadas; não substituir por dashboard nesta automação.

## Escopo e fontes consultadas

AGENTS raiz e do catálogo, política de testes remotos e memória lidos antes de editar. Havia 257 entradas no status em conferência intermediária, com trabalho amplo preexistente; catálogo limpo antes do patch. Nenhum arquivo preexistente modificado foi sobrescrito. Alterações desta rodada: duas linhas da página, este relatório e referência em `digital-catalog/ideias_planos.md`.

Skill Supabase, [changelog oficial](https://supabase.com/changelog.md), [mudança TLS documentada](https://supabase.com/changelog/cbc-tls-ciphers-deprecated), [projeção select](https://supabase.com/docs/reference/javascript/select), [joins e projeções](https://supabase.com/docs/guides/database/joins-and-nesting) e guia local Next.js `digital-catalog/node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` consultados. Nenhuma alteração de integração TLS necessária ao patch de projeção.

## Segunda execução — 25/10/2026, 12:31 BRT (15:31 UTC)

### Fontes e limites

Releitura de AGENTS raiz/catálogo, política remota, memória e relatório antes da alteração; skill Supabase e Ponytail aplicadas. `git status` e diffs conferidos: árvore com trabalho amplo preexistente (301 entradas em conferência intermediária), incluindo EGR-001. Hook dos menus sem alteração prévia; patch anterior e demais arquivos preservados.

CLI `2.121.0`: `--help`, `projects --help`, `projects list --help`, `inspect --help`, `inspect db --help`, `inspect db traffic-profile --help` e `telemetry --help` redescobertos. `traffic-profile` mede proporção de I/O de blocos, não Egress; só sua ajuda foi consultada. `projects list --output-format json` autenticou e confirmou o ref, com saída filtrada em memória para booleanos, sem identidade/segredos. Plugin `list_projects` e vínculo `supabase/.temp/project-ref` também confirmaram `hkoxhourxwlddgsfdgws`. Ferramentas do plugin novamente sem Usage/Egress explícito; `get_cost` trata criação de projeto/branch, não consumo. Não atualizar a CLI nem mudar o agendamento existente `FREQ=HOURLY;INTERVAL=3`.

Changelog oficial obtido em Markdown por HTTP após ferramenta web recusar o tipo de conteúdo; aviso TLS relido, sem mudança necessária neste patch. Referências vigentes: [campos de logs](https://supabase.com/docs/guides/observability/log-field-reference), [consultas agregadas](https://supabase.com/docs/guides/observability/detecting), [select JavaScript](https://supabase.com/docs/reference/javascript/select) e guia Next.js local já citado. Busca documental do plugin não retornou o tópico específico; consulta direta oficial supriu a lacuna.

### Contagens oficiais: 2026-10-25T12:30:00Z–2026-10-25T15:30:00Z

Janela de três horas, **09:30–12:30 BRT**. Duas chamadas `query_logs`, sem polling: fontes e gateway por serviço/rota/status. Campos `source`, `request.path`, `response.status_code` confirmados na documentação vigente. Somente agregados; rotas REST normalizadas pelo padrão `^/rest/v1/((?:rpc/)?[A-Za-z_][A-Za-z0-9_]*)(?:[/?]|$)`, demais serviços classificados por prefixo fixo. Sem query strings, headers, payloads, valores SQL, linhas de negócio ou identificadores de usuários/objetos. Nenhum SQL no banco, alteração remota, navegador/dashboard ou teste.

| Fonte | Eventos |
| --- | ---: |
| edge_logs | 5.589 |
| postgres_logs | 627 |
| postgrest_logs | 218 |
| auth_logs | 79 |
| realtime_logs | 31 |
| auth_audit_logs | 12 |
| pgbouncer_logs | 12 |
| storage_logs | 1 |

Fontes não devem ser somadas. No gateway: REST 5.486, Auth 77 (200), Realtime 24 (101), Storage 2 (um 200 e um 400). Os 46 grupos retornados ficaram abaixo do limite de 80. Eventos do gateway passaram de 156 para 5.589 (**+5.433 eventos**) em janelas consecutivas de igual duração; isso não mede bytes, custo nem efeito dos patches locais.

| Rotas REST de destaque | Status | Chamadas |
| --- | --- | ---: |
| rpc/customer_support_list_conversations | 200 | 1.042 |
| rpc/customer_support_count_customer_orders | 200 | 1.040 |
| rpc/customer_support_list_customer_summaries | 200 | 1.040 |
| rpc/customer_support_conversation_counts | 200 | 1.021 |
| whatsapp_messages | 200 | 165 |
| products | 200 / 206 / 204 | 163 / 15 / 8 |
| people | 200 / 204 | 92 / 8 |
| rpc/claim_return_fiscal_emission_job | 200 | 90 |
| orders | 200 | 75 |
| categories | 200 | 54 |
| store_style_settings | 200 | 32 |
| category_relationships | 200 | 22 |
| opportunities | 200 | 20 |

Tabela priorizada, não soma todos os grupos REST. As quatro RPCs de atendimento representam 4.143 chamadas; não se deduz tamanho das respostas nem maior contribuição em Egress. A RPC fiscal manteve 90 chamadas; fluxo não inspecionado/alterado. Status 206/101 isolados não significam falha; o único 400 de Storage não foi investigado porque não há causa local comprovada sem ampliar escopo.

### EGR-002 — carga simultânea dos menus

- **Causa comprovada:** `SiteChrome:20–22` monta Header/SubHeader; `header/index.tsx:34` monta MobileMenu. `header/mobile-menu.tsx:69` e `sub-header/index.tsx:24` instanciam o mesmo hook, antes com um `Promise.all` independente por effect. Quando os effects se sobrepõem, iniciam dois pares idênticos de consultas.
- **Arquivo/linhas:** `digital-catalog/src/components/layout/sub-header/use-sub-header-data.ts:7–24,35`. Adicionados `fetchMenuData`, promessa tipada em escopo de módulo e `loadMenuData`; effect usa a promessa compartilhada. Nenhuma nova dependência.
- **Comportamento preservado:** mesmas projeções, ordenação, filtros e estados por consumidor; `isLoaded` segue no `finally` de cada instância. A promessa é liberada no `finally`, inclusive em rejeição; próxima montagem após conclusão volta a buscar. Respostas PostgREST com erro continuam no mesmo contrato. Não reter resultados por minutos nem alterar frescor por TTL.
- **Revisão estática:** todos os chamadores do hook e tipos `Category`/`Relationship` conferidos; diff restrito ao helper e sua chamada, `git diff --check` passou. Promessa só criada no effect do cliente, sem busca durante renderização/SSR. Compartilhamento limitado ao módulo no mesmo contexto do navegador; não deduplica abas ou outras páginas/hooks.
- **Efeito esperado e limite:** um único par de requests para consumidores com cargas sobrepostas; montagens sequenciais podem continuar gerando pares distintos. Economia em bytes não medida, correção apenas local, sem commit/deploy. Nenhum teste criado/executado. Pendente conferir UI dos dois menus, sobreposição de montagem, refetch posterior e falha/retry em validação futura autorizada.

### Inventário adicional e decisão de produto

| Integração / finalidade | Arquivos e chamadas | Gatilho / frequência | Deduplicação / cancelamento | Evidência / risco |
| --- | --- | --- | --- | --- |
| Atendimento: lista e contadores | `erp/src/pages/App/CustomerSupport/Index.tsx:151` → `hooks/useCustomerSupportConversations.ts:44–102,154–173,176–214` → `erp/src/pages/utils/customerSupport/customerSupportService.ts:153–263` | Montagem, filtros, foco/visibilidade, timer de 6 s com página visível e eventos Realtime de conversas | Guardas impedem refresh silencioso com carga pendente; requestId/queryKey descartam resultado obsoleto; não há cache/abort nesse caminho; reconexão 3 s | Lista pagina 50 itens; refresh recarrega páginas já abertas. Por página: lista + resumos/clientes e contagem de pedidos se autorizado; ao final, contadores globais. Quatro rotas observadas; agregados não identificam instância/versão implantada |

**Fato local:** timer continua ativo com Realtime conectado; hidratação comercial repete a cada refresh autorizado. **Hipótese:** esse caminho contribui para as contagens elevadas; não é possível atribuir cada evento ou provar excesso em bytes. Nenhuma alteração feita na Central: reduzir frequência ou reter hidratação muda a atualidade exibida e exige escolha.

Opções concretas para o operador:

1. Manter seis segundos e Realtime: conserva a frequência atual e a repetição periódica observada no código.
2. Aumentar timer para 30 segundos, preservando Realtime e refresh por foco: reduz os gatilhos periódicos esperados, mas sem evento a atualização pode esperar até 30 s; eventos/foco ainda geram consultas e economia em bytes continua desconhecida.
3. Usar timer somente como fallback de Realtime: elimina o gatilho periódico enquanto conectado, mas estado SUBSCRIBED não garante entrega de todo evento nem cobertura das mudanças de dados comerciais. Exige definir reconciliação periódica e atualidade de pedidos/clientes antes de implementar.

Decisão pendente: tolerância de atualização da Central (manter 6 s, aceitar 30 s ou especificar reconciliação do fallback). Meta diária de 100 MB já resolvida; não perguntar novamente dia/mês. Próxima auditoria deve preservar EGR-001/EGR-002, priorizar esse caminho após decisão e redescobrir medidor oficial. Sem medidor, não declarar meta cumprida nem redução remota.

## Terceira execução — 25/10/2026, 15:37 BRT (18:37 UTC)

Regras, política remota, memória, relatório e skill Supabase relidos. CLI instalada 2.121.0: ajudas raiz/projects/list/inspect/db/telemetry redescobertas, sem medidor Usage/Egress identificado. Plugin redescoberto também sem ferramenta de consumo faturável; get_cost continua restrito a criação de projeto/branch. CLI e plugin autenticados com acesso a MoranteHub/hkoxhourxwlddgsfdgws, saída filtrada em memória; vínculo local confere. Automação ACTIVE a cada três horas, sem mudança. Changelog oficial e documentação de campos/consultas agregadas conferidos; aviso TLS não fundamenta alteração de código nesta rodada.

### Coleta: 2026-10-25T15:30:00Z–2026-10-25T18:30:00Z

Janela completa **12:30–15:30 BRT**; duas chamadas query_logs, sem polling. Somente source, request.path normalizado e response.status_code, confirmados na [referência oficial de campos](https://supabase.com/docs/guides/observability/log-field-reference). Mesma expressão regular REST da segunda execução; demais serviços classificados apenas por prefixo fixo. Sem mensagens, query strings, headers, SQL de usuários, corpos, identidade ou linhas de negócio. Retornaram 52 grupos, abaixo do limite de 80.

| Fonte | Eventos |
| --- | ---: |
| edge_logs | 12.422 |
| postgres_logs | 634 |
| postgrest_logs | 223 |
| auth_logs | 96 |
| realtime_logs | 22 |
| auth_audit_logs | 16 |
| pgbouncer_logs | 10 |
| storage_logs | 1 |

Fontes não se somam. Gateway por serviço: REST 12.282; Auth 89 (200); Realtime 49 (101); Storage 2 (200/400). Aumento de **6.833 eventos de gateway** em relação à janela anterior de mesma duração; não é delta de Egress.

| Rota REST de destaque | Status | Chamadas |
| --- | --- | ---: |
| rpc/customer_support_list_conversations | 200 | 2.724 |
| rpc/customer_support_count_customer_orders | 200 | 2.709 |
| rpc/customer_support_list_customer_summaries | 200 | 2.707 |
| rpc/customer_support_conversation_counts | 200 | 2.670 |
| whatsapp_messages | 200 / 204 / 400 | 266 / 7 / 5 |
| rpc/customer_support_list_agents | 200 | 120 |
| products | 200 / 206 / 204 | 99 / 7 / 2 |
| rede_transactions | 200 | 94 |
| rpc/claim_return_fiscal_emission_job | 200 | 90 |
| categories | 200 | 67 |
| category_relationships | 200 | 44 |
| store_style_settings | 200 | 39 |

Tabela priorizada. Quatro RPCs da Central: **10.810 chamadas**, aumento de **6.667 chamadas** ante 4.143; não prova excesso em bytes nem permite atribuição a cliente, sessão, versão ou patch. Cinco respostas 400 de whatsapp_messages e uma 401 de attributes não estabelecem causa local/retry; nenhum payload foi consultado. Rota fiscal apenas contada, sem inspeção de código fiscal.

### Revisão local e decisão preservada

Git status: 334 entradas na conferência, com amplo trabalho preexistente. Diffs relevantes inspecionados antes da escrita. Hook de conversas sem diff contra HEAD; serviço contém alterações preexistentes em imports/envio, preservadas. EGR-002 permanece no diff local. Nenhum código alterado nesta rodada.

Inventário da Central reconfirmado: Index.tsx:151 → hooks/useCustomerSupportConversations.ts:44–102,154–214 → pages/utils/customerSupport/customerSupportService.ts:153–263. Timer de seis segundos com página visível, foco/visibilidade e Realtime; guarda contra sobreposição silenciosa, descarte de resultado obsoleto, páginas de 50 e hidratação comercial condicionada à permissão continuam presentes. Este é um chamador local compatível com as rotas observadas, sem atribuição remota comprovada. Inventário anterior permanece vigente; não expandido por inferência a novas rotas.

**Decisão ainda pendente:** escolher manter 6 s, aceitar 30 s com Realtime/foco ou definir reconciliação do fallback, conforme impactos já descritos na segunda execução. Não alterar frescor nem introduzir cache especulativo. A meta já confirmada permanece **100 MB/dia de Database Egress/PostgREST**; não repetir pergunta de unidade/período.

**Resultado:** coleta atualizada; sem nova causa corrigível comprovada dentro do escopo sem decisão de produto. Bytes, quota, excedente e redução medida indisponíveis. Nenhuma tabela de negócio lida, SQL de banco, mudança remota, teste, commit ou deploy. Revisão estática concluída; validações funcionais dos patches anteriores e medição oficial após implantação autorizada continuam pendentes.

## Quarta execução — 25/10/2026, 18:34 BRT (21:34 UTC)

CLI 2.121.0: ajudas raiz/projects/list/inspect/db/telemetry redescobertas, sem medidor Usage/Egress faturável. Plugin também sem esse medidor. Ambos autenticados no projeto MoranteHub, ref `hkoxhourxwlddgsfdgws`; vínculo local confere, saídas de projetos filtradas em memória sem identidade/segredos. Changelog vigente e [campos de logs](https://supabase.com/docs/guides/observability/log-field-reference) conferidos; aviso TLS relido sem evidência que justifique mudança nesta rodada. Agendamento ACTIVE/3 h preservado.

### Coleta: 2026-10-25T18:30:00Z–2026-10-25T21:30:00Z

Janela completa **15:30–18:30 BRT**. Duas query_logs agregadas: source/count e gateway por serviço/rota/status; somente campos documentados source, request.path e response.status_code. Mesma normalização REST das rodadas anteriores, sem caminhos de objetos, parâmetros, headers, corpos, mensagens ou dados de negócio. Retorno de 55 grupos, abaixo do limite de 80.

| Fonte | Eventos |
| --- | ---: |
| edge_logs | 1.591 |
| postgres_logs | 619 |
| postgrest_logs | 188 |
| auth_logs | 35 |
| realtime_logs | 31 |
| pgbouncer_logs | 9 |
| auth_audit_logs | 4 |

Fontes não se somam. Gateway: REST 1.538; Auth 34 (33 status 200 e um 302); Realtime 17 (101); Storage 2 (200/400). Queda de 10.831 eventos de gateway ante janela anterior de mesma duração; não é delta de Egress. Ausência de storage_logs nesta resposta não prova ausência de tráfego, inclusive porque há dois eventos Storage no gateway.

| Rota REST de destaque | Status | Chamadas |
| --- | --- | ---: |
| rpc/customer_support_list_conversations | 200 | 246 |
| rpc/customer_support_list_customer_summaries | 200 | 243 |
| rpc/customer_support_count_customer_orders | 200 | 243 |
| rpc/customer_support_conversation_counts | 200 | 231 |
| whatsapp_messages | 200 / 204 | 114 / 2 |
| rpc/claim_return_fiscal_emission_job | 200 | 89 |
| products | 200 / 204 / 206 | 33 / 2 / 1 |
| rpc/customer_support_list_agents | 200 | 32 |
| store_style_settings | 200 | 14 |
| categories | 200 | 13 |
| category_relationships | 200 | 7 |

Tabela priorizada. Quatro RPCs da Central somam **963 chamadas**, queda de **9.847** ante 10.810. Sem atribuição a sessão, versão, mudança local ou tamanho de resposta. Rota fiscal somente contada; nenhum código fiscal inspecionado. O 400 isolado de Storage permanece sem causa comprovada no escopo seguro.

### Revisão e resultado

AGENTS vigente, política, memória, relatório e skills lidos. Git status tinha 387 entradas; diffs relevantes conferidos antes da escrita, inclusive trabalho preexistente em Index.tsx/serviço e EGR-001/EGR-002. Nenhum código alterado.

Inventário da Central reconfirmado, com referências atuais: `erp/src/pages/App/CustomerSupport/Index.tsx:153` → `hooks/useCustomerSupportConversations.ts:46–102,154–209` → `erp/src/pages/utils/customerSupport/customerSupportService.ts:169,211,223,257`. Mesmas quatro RPCs; página de 50; timer de 6 s visível, foco/visibilidade e Realtime; guarda de carga silenciosa e descarte de resultados obsoletos. Sem nova causa independente comprovada ou mudança no inventário funcional. A queda nas contagens não elimina a repetição presente no código nem autoriza atribuir economia aos patches.

**Decisão preservada:** manter 6 s, aceitar 30 s com Realtime/foco (até 30 s sem evento) ou definir reconciliação do fallback. Opções/impactos da segunda execução continuam vigentes. Meta confirmada de 100 MB/dia, sem nova pergunta de período. Sem medidor oficial, uso/quota/excedente/delta em bytes e cumprimento da meta permanecem indisponíveis.

Revisão estática somente; nenhuma tabela de negócio, SQL no banco, alteração remota, teste, commit ou deploy. Validações funcionais anteriores continuam pendentes. Relatório e memória são as únicas entregas desta execução.

## Quinta execução — 25/10/2026, 21:33 BRT (26/10, 00:33 UTC)

CLI 2.121.0: ajudas raiz/projects/list/inspect/db/telemetry redescobertas; sem medidor oficial de Usage/Egress faturável. Versão 2.122.0 anunciada pela CLI, sem atualização. Plugin redescoberto com list_projects/query_logs e sem medidor explícito de consumo. Ambos autenticados e com acesso a MoranteHub/hkoxhourxwlddgsfdgws; vínculo local confere. Saídas de projetos filtradas em memória para booleanos, sem identidade/segredos. Agendamento ACTIVE/3 h conferido e preservado. Changelog oficial obtido por HTTP após recusa de Markdown na ferramenta web; aviso TLS conferido, sem alteração pertinente nesta rodada.

### Coleta: 2026-10-25T21:30:00Z–2026-10-26T00:30:00Z

Janela completa **25/10 18:30–21:30 BRT**. Duas query_logs agregadas, sem polling. Campos source, request.path e response.status_code reconfirmados na [referência oficial](https://supabase.com/docs/guides/observability/log-field-reference). Mesma normalização REST das rodadas anteriores; demais serviços classificados por prefixos fixos. Sem corpos, parâmetros, mensagens, headers, SQL de usuários ou tabelas de negócio. Retorno de 33 grupos, abaixo do limite de 80.

| Fonte | Eventos |
| --- | ---: |
| edge_logs | 850 |
| postgres_logs | 618 |
| postgrest_logs | 238 |
| auth_logs | 28 |
| realtime_logs | 25 |
| pgbouncer_logs | 10 |
| auth_audit_logs | 6 |
| storage_logs | 1 |

Fontes não se somam. Gateway: **REST 803; Auth 28 (200); Realtime 17 (101); Storage 2 (200/400)**. Queda de 741 eventos do gateway ante 1.591 na janela anterior de igual duração; não é delta de Egress.

| Rota REST de destaque | Status | Chamadas |
| --- | --- | ---: |
| rpc/claim_return_fiscal_emission_job | 200 | 89 |
| products | 200 / 206 | 73 / 4 |
| rpc/customer_support_count_customer_orders | 200 | 63 |
| rpc/customer_support_list_customer_summaries | 200 | 62 |
| rpc/customer_support_list_conversations | 200 | 62 |
| store_style_settings | 200 | 52 |
| rpc/customer_support_conversation_counts | 200 | 47 |
| rede_transactions | 200 | 47 |
| rpc/customer_support_list_agents | 200 | 40 |
| rpc/flush_supabase_telemetry | 204 / 200 / 401 | 26 / 3 / 2 |
| categories | 200 | 19 |
| category_relationships | 200 | 12 |

Tabela priorizada. Quatro RPCs da Central: **234 chamadas**, queda de 729 ante 963. Estilo visual: 52 ante 14; não prova falha no cache, excesso em bytes ou origem específica. Dois 401 de telemetria e o 400 de Storage não estabelecem causa local/repetição indevida; nenhum payload foi consultado. Rota fiscal apenas contada, sem inspeção/alteração fiscal.

### Inventário revisto e resultado

AGENTS vigente, política remota, memória, relatório e skills Supabase/Ponytail lidos. Git status tinha 427 entradas na conferência; diffs dos caminhos pertinentes examinados antes da escrita, preservando amplo trabalho concorrente. Nenhum código alterado nesta rodada.

| Integração / finalidade | Arquivos e chamadas atuais | Gatilho / frequência | Deduplicação / cache / cancelamento | Evidência / risco |
| --- | --- | --- | --- | --- |
| Central: lista e contadores | erp/src/pages/App/CustomerSupport/Index.tsx:152 → hooks/useCustomerSupportConversations.ts:48–102,158–220 → erp/src/pages/utils/customerSupport/customerSupportService.ts:173,215,227,261 | Montagem/filtros, timer de 6 s visível, foco/visibilidade, Realtime | Página 50; guarda contra carga silenciosa sobreposta e descarte de resultados obsoletos; sem cache/abort nesse caminho | Mesmas quatro RPCs; agregado não atribui sessão/versão. Mudanças preexistentes retiraram search deste hook e substituíram o timer explícito de reconexão de 3 s por estado/reconexão manual; a descrição histórica de reconexão de 3 s não representa o código atual. Não inferir daí comportamento interno do SDK |
| Telemetria: envio de agregados locais | erp/src/services/monitoring/queryGuard.ts:43–60,84–121 | Timer 5 min, somente buffer com dados e sessão disponível | Backoff de falhas 5 min até 60 min; buffer preservado; exclusão da própria rota do tracking em :192 | 31 chamadas, duas 401; não comprova loop ou causa de Egress. Sem mudança proposta a partir de erro isolado |

Inventário de estilo permanece vigente: helper com cache de módulo/promessa em voo e projeção explícita; detalhe de produto tem consulta própria. A variação de 14 para 52 chamadas não comprova defeito nesses chamadores. EGR-001/EGR-002 continuam locais e preservados; não atribuir a eles as variações remotas.

**Decisão pendente preservada:** manter 6 s, aceitar 30 s com Realtime/foco (até 30 s sem evento) ou definir reconciliação do fallback, com os impactos já registrados. Meta confirmada: 100 MB/dia; período não precisa de nova escolha. Sem medidor oficial, uso/quota/excedente/delta em bytes e cumprimento da meta seguem indisponíveis.

Somente revisão estática; sem testes, SQL no banco, alteração remota, commit ou deploy. Sem nova causa comprovada corrigível nesta execução. Validações funcionais dos patches anteriores e medição oficial permanecem pendentes. Entregas desta rodada restritas ao relatório e memória.
## Sexta execução — 26/10/2026, 00:35 BRT (03:35 UTC)

CLI 2.121.0: ajudas raiz/projects/list/inspect/db/telemetry redescobertas, sem medidor oficial de Usage/Egress faturável. Atualização 2.122.0 anunciada, não instalada. Plugin redescoberto com list_projects/query_logs, sem medidor explícito; get_cost cobre criação de projeto/branch. CLI e plugin autenticados com acesso ao projeto MoranteHub, ref `hkoxhourxwlddgsfdgws`; vínculo local e indicador linked da CLI conferem. Nesta versão a lista CLI retornou array raiz, tratado em memória; nenhuma identidade/credencial impressa. Recorrência ACTIVE/3 h conferida e preservada. Changelog oficial, aviso TLS e [referência de campos](https://supabase.com/docs/guides/observability/log-field-reference) consultados; nenhuma mudança pertinente comprovada.

### Coleta: 2026-10-26T00:30:00Z–2026-10-26T03:30:00Z

Janela completa **25/10 21:30–26/10 00:30 BRT**. Duas query_logs agregadas, sem polling: source/count e gateway por serviço/rota/status. Somente source, request.path e response.status_code documentados. Normalização REST `^/rest/v1/((?:rpc/)?[A-Za-z_][A-Za-z0-9_]*)(?:[/?]|$)`; demais serviços por prefixos fixos. Nenhum corpo, parâmetro, header, mensagem, SQL de usuários, objeto Storage ou linha de negócio retornado. Grupos abaixo do limite de 80.

| Fonte | Eventos |
| --- | ---: |
| edge_logs | 2.865 |
| postgres_logs | 632 |
| postgrest_logs | 284 |
| auth_logs | 201 |
| pgbouncer_logs | 31 |
| realtime_logs | 16 |
| auth_audit_logs | 10 |
| storage_logs | 7 |

Fontes não se somam. Gateway: **REST 2.641; Auth 197 (195 status 200, dois 302); Realtime 23 (101); Storage quatro (dois 200, dois 400)**. Aumento de 2.015 eventos do gateway ante 850 na janela anterior de igual duração; não é delta de Egress.

| Rota REST de destaque | Status | Chamadas |
| --- | --- | ---: |
| orders | 200 / 206 | 323 / 37 |
| nfe_documents | 200 | 262 |
| people | 200 / 204 / 400 | 240 / 6 / 2 |
| profiles | 200 | 194 |
| rpc/current_user_has_password | 200 | 130 |
| rpc/is_administrator | 200 | 119 |
| rede_transactions | 200 | 98 |
| products | 200 / 206 / 204 | 86 / 8 / 6 |
| rpc/claim_return_fiscal_emission_job | 200 | 90 |
| rpc/flush_supabase_telemetry | 204 / 200 | 66 / 5 |
| rpc/customer_support_list_conversations | 200 | 36 |
| rpc/customer_support_list_customer_summaries | 200 | 36 |
| rpc/customer_support_count_customer_orders | 200 | 35 |
| rpc/customer_support_conversation_counts | 200 | 26 |
| categories | 200 | 27 |
| store_style_settings | 200 | 17 |
| category_relationships | 200 | 9 |

Tabela priorizada. Quatro RPCs da Central: **133 chamadas**, queda de 101 ante 234. Não atribuir as variações a sessão, versão, patch ou bytes. Rotas fiscais somente contadas, sem inspeção de código fiscal. Dois 400 de goods_receipts, dois 409 de goods_receipt_items e dois 400 de people, assim como Storage, não comprovam loop nem causa de Egress; dados/payloads não consultados.

### Revisão estática e inventário atualizado

AGENTS vigente, política remota, memória, relatório e skills lidos. Conferência intermediária do git status: 65 entradas, com trabalho preexistente; há mudanças concorrentes durante a execução. Diffs pertinentes examinados antes da escrita; nenhum código alterado. EGR-001/EGR-002 presentes no código atual, agora sem diff nos respectivos arquivos contra HEAD; isso não comprova implantação nem economia remota.

| Integração / finalidade | Arquivos e chamadas | Gatilho / frequência | Deduplicação / cache / cancelamento | Evidência / risco |
| --- | --- | --- | --- | --- |
| ERP: sessão/perfil | erp/src/context/AuthContext.tsx:26 → auth/useAuthSession.ts:72–180,273–288 → auth/profileService.ts:53–89 | getSession e eventos onAuthStateChange; perfil buscado ao processar sessão | Guarda handlingSession contra simultaneidade; dedup de getSession/INITIAL_SESSION por usuário; projeção PROFILE_COLUMNS, filtro id/maybeSingle, timeout 6 s, uma repetição condicionada a erro de autenticação, cache como fallback | Rota profiles:194; há outros chamadores, inclusive mobileAuthProfile.ts:28. Não comprova excesso nem origem ERP; cache de perfil pode alterar atualidade/permissões e não foi introduzido |
| ERP: estado de senha | auth/useAuthSession.ts:156–164 → auth/usePasswordCredentials.ts:25–34 → erp/src/services/authPasswordSetup.ts:33–40; política shared-utils/authSessionPolicy.ts:2–3 | Manutenção de sessão exceto TOKEN_REFRESHED; refresh explícito e após criação de senha | Chamador de sessão protegido pela guarda; timeout externo 4 s; sem cache/abort explícito na função de consulta | RPC current_user_has_password:130. Mobile também usa a RPC em services/authPasswordSetup.ts:39–40; contagens não atribuem plataforma/instância. Nenhuma evidência suficiente para alterar segurança/contrato |

Central reconfirmada: Index.tsx:152 → hooks/useCustomerSupportConversations.ts:48–102,158–220 → customerSupportService.ts:179,221,233,267. Mesmo timer de seis segundos com página visível, foco/visibilidade e Realtime; páginas de 50, guarda silenciosa e descarte de resultados obsoletos. Inventários anteriores de menus, estilo e telemetria permanecem válidos. Chamador de is_administrator não estabelecido nesta inspeção; não inferir que venha do mesmo fluxo de senha/perfil.

**Resultado:** nenhuma nova causa comprovada corrigível sem escolha de produto. Decisão preservada: manter 6 s, aceitar 30 s com Realtime/foco ou definir reconciliação do fallback, com impactos registrados na segunda execução. Meta de 100 MB/dia confirmada; sem medidor oficial, uso/quota/excedente/delta em bytes indisponíveis. Somente relatório e memória alterados; sem testes, consulta de dados de negócio/execute_sql, mudanças remotas, commit ou deploy. Validações funcionais anteriores e medição oficial continuam pendentes.

## Sétima execução — 26/10/2026, 08:47 BRT

**Acesso e fontes:** CLI 2.121.0, ajudas raiz/projects/list/inspect/db/telemetry redescobertas; nenhum medidor de Usage/Egress faturável. Plugin redescoberto sem medidor explícito; list_projects confirmou MoranteHub/hkoxhourxwlddgsfdgws. CLI projects list filtrada em memória confirmou autenticação, nome/ref, linked e vínculo local; nenhuma identidade/credencial armazenada. Automação ACTIVE com intervalo de três horas conferida e preservada. Changelog oficial consultado (índice Markdown por HTTP); sem mudança pertinente identificada. Campos e consultas confirmados na documentação atual de [logs](https://supabase.com/docs/guides/observability/advanced-log-filtering) e [detecção](https://supabase.com/docs/guides/observability/detecting).

**Janela exata:** 2026-10-26T08:30:00Z–2026-10-26T11:30:00Z (**05:30–08:30 BRT**). Duas query_logs, somente source/count e gateway por rota normalizada/status/count, sem polling. Mesmo padrão REST das coletas anteriores e prefixos fixos Auth/Realtime/Storage; nenhum parâmetro, mensagem, corpo, header, ID de usuário/objeto ou SQL de negócio consultado.

| Fonte | Eventos |
| --- | ---: |
| postgres_logs | 612 |
| edge_logs | 444 |
| postgrest_logs | 111 |
| pgbouncer_logs | 9 |
| storage_logs | 1 |

Fontes não se somam. Gateway: **REST 442 e Storage dois** (um 200, um 400); nove grupos, sem truncamento. Demais serviços sem eventos retornados nesta janela, o que não prova ausência de tráfego fora da cobertura.

| Rota REST | Status | Chamadas |
| --- | --- | ---: |
| store_style_settings | 200 | 163 |
| products | 200 / 206 | 156 / 1 |
| rpc/claim_return_fiscal_emission_job | 200 | 90 |
| categories | 200 | 21 |
| category_relationships | 200 | 9 |
| opportunities | 200 | 2 |

Ante a última coleta de igual duração (00:30–03:30 UTC), gateway caiu 2.421 eventos (2.865→444); estilo subiu 146 (17→163). Janelas não contíguas: intervalo 03:30–08:30 UTC não coletado nesta rodada. Não é delta de Egress nem prova de efeito dos patches. Central não apareceu nos agregados atuais. Bytes, uso/quota/excedente e cumprimento de 100 MB/dia indisponíveis; nenhum valor antigo reutilizado como consumo atual.

**Revisão estática e inventário:** AGENTS raiz/catálogo, política, skill Supabase, memória e relatório lidos. Status inicial com dois documentos de paridade/roadmap preexistentes modificados; diffs conferidos e preservados. Arquivos da integração inspecionada sem diff preexistente. EGR-001/EGR-002 continuam presentes, sem inferir deploy.

| Integração / finalidade | Chamadores e consulta | Gatilho / frequência | Deduplicação / cache / cancelamento | Evidência / risco |
| --- | --- | --- | --- | --- |
| Catálogo: estilo visual | store-design-provider.tsx:18 e useCatalogProductsQuery.ts:206 → digital-catalog/src/lib/store-settings-cache.ts:8–31 | Montagem do provider/carga da grade | Projeção explícita STYLE_COLUMNS; eq(id,true)/maybeSingle; promessa compartilhada e cache de módulo após sucesso; sem abort/TTL | 163 chamadas agregadas da rota, sem atribuição a cliente/instância. Não comprova duplicação do helper |
| Catálogo: estilo no detalhe | digital-catalog/src/app/produto/[slug]/page.tsx:17–28 | Renderização dinâmica por slug; dados compartilhados por generateMetadata/componente | React cache na função getProductData; estilo solicita só button_style, eq(id,true)/maybeSingle; sem cache persistente/abort | Cache entre requests alteraria frescor; contagem não comprova consulta excessiva. Produtos também têm outros chamadores |

**Resultado:** sem nova causa comprovada para patch de código. Sem novo plano de catálogo; inventário existente apenas reconfirmado. Decisão anterior da Central (6 s / 30 s / fallback com reconciliação) preservada, sem alterar comportamento. Somente relatório e memória atualizados. Nenhum teste adicionado/executado, consulta de dados de negócio/execute_sql, mudança remota, dependência, migration, commit ou deploy. Revisão estática; validações funcionais anteriores e medição oficial continuam pendentes.

## Oitava execução — 26/10/2026, 12:37 BRT

**Fontes e acesso:** AGENTS raiz/catálogo, política remota, memória, relatório, skill Supabase e Ponytail lidos. CLI `2.121.0`; ajudas raiz, `projects`, `projects list`, `inspect`, `inspect db` e `telemetry` conferidas. Autenticação CLI confirmada sem imprimir identidade; ref `hkoxhourxwlddgsfdgws`, nome MoranteHub e vínculo local confirmados. Plugin `list_projects` confirmou o mesmo projeto. Nenhum medidor oficial Usage/Egress encontrado na CLI nem no plugin. Changelog e busca documental Supabase consultados; sem mudança pertinente a este ajuste. Automação segue ACTIVE a cada três horas.

**Janela oficial de logs:** 2026-10-26T11:30:00Z–14:30:00Z (**08:30–11:30 BRT**), via duas consultas agregadas `query_logs`; campos somente `source`, `request.path` normalizado, `response.status_code` e `count()`. As fontes disponíveis retornaram: edge_logs 1.627, postgres_logs 624, postgrest_logs 235, auth_logs 39, pgbouncer_logs 20, auth_audit_logs 13, realtime_logs 12 e storage_logs 5. Fontes representam eventos distintos e não se somam como requests. No gateway: REST 1.565 (1.412 status 200, 106 status 204, 32 status 206, 8 status 201, 6 status 400, 1 status 401), Auth 34, Realtime 20 e Storage 8. Nenhum corpo, query string, header, SQL, ID ou dado de negócio foi consultado.

| Rota REST | Status | Chamadas |
| --- | --- | ---: |
| products | 200 / 206 | 264 / 18 |
| store_style_settings | 200 | 193 |
| orders | 200 / 206 | 133 / 14 |
| people | 200 / 204 / 400 | 113 / 11 / 3 |
| rede_transactions | 200 | 88 |
| rpc/claim_return_fiscal_emission_job | 200 | 90 |
| profiles | 200 | 83 |
| rpc/flush_supabase_telemetry | 204 / 200 | 69 / 5 |

Ante a janela consecutiva anterior de três horas, gateway aumentou 1.183 eventos (444→1.627), produtos subiram 125 chamadas (157→282) e estilo subiu 30 (163→193). Isso compara contagens, não bytes, e não atribui origem, maior volume de resposta ou mudança ao código local. Não há uso, quota, excedente ou delta oficial de Egress disponível; cumprimento da meta de 100 MB/dia não verificável.

**EGR-003 — projeção ampla no histórico de transações da Rede:** a tela `erp/src/pages/App/Finance/Settings/index.tsx:40` chama `financeService.getRedeTransactions(5)` e, em `:251–264`, exibe apenas `tid`, `status`, `amount` e `created_at`. O único chamador do serviço foi conferido. `erp/src/pages/services/financeService.ts:384–389` limitava cinco registros, mas solicitava `select('*')`; a rota `rede_transactions` teve 88 respostas 200 na janela, sem atribuição comprovada a esta tela. Alterada a projeção para `select('tid, status, amount, created_at')`, preservando limite, ordenação e renderização. Revisão estática confirmou que esses são todos os campos lidos pela UI; diff restrito a uma linha neste serviço. Nenhum teste executado/adicionado conforme a automação; validação funcional e economia em bytes pendentes. Sem commit, deploy ou alteração remota.

**Inventário atualizado:** integração ERP de histórico da Rede: Finance/Settings → `financeService.getRedeTransactions(5)` → `rede_transactions`, uma carga ao montar a tela, limite 5, ordem por `created_at` decrescente, sem cache/deduplicação/abort; projeção explícita agora cobre apenas campos exibidos. As 88 chamadas observadas não identificam plataforma/tela. Produtos, estilo, pedidos, pessoas e fila fiscal lideram as contagens, mas sem evidência de excesso de payload ou repetição atribuível a causa local nova. EGR-001/EGR-002 e decisão de atualidade da Central (6 s / 30 s / reconciliação) preservados; sem mudança nesse fluxo.

**Resultado:** revisão estática e atualização do relatório. Status inicial continha trabalho local preexistente; arquivos não relacionados foram preservados. `git diff --check` passou. Nenhum teste, consulta a dados de negócio, `execute_sql`, alteração remota, dependência, migration, commit ou deploy. Medição oficial de bytes e validação funcional continuam pendentes.

## Nona execução — 26/10/2026, 14:49 BRT

**Acesso e limites:** regras, política remota, memória, relatório e skills Supabase/Ponytail consultados. CLI 2.121.0; ajudas raiz/projects/list/inspect/db/telemetry redescobertas, sem Usage/Egress faturável. `projects list` filtrado em memória confirmou autenticação, nome MoranteHub, ref hkoxhourxwlddgsfdgws e linked=true; vínculo local correto. Plugin `list_projects` confirmou o mesmo projeto, sem ferramenta de medição de bytes. Automação ACTIVE, RRULE de três horas, preservada. [Changelog](https://supabase.com/changelog) e [campos/agregações oficiais](https://supabase.com/docs/guides/observability/detecting) consultados. Nenhuma mudança de integração exigida pelos avisos consultados.

**Janela exata:** 2026-10-26T14:30:00Z–2026-10-26T17:30:00Z (**11:30–14:30 BRT**). Duas `query_logs`, somente agregados de source e gateway por rota normalizada/status/count, sem polling. Campos documentados source, request.path e response.status_code; nomes REST restritos por regex, demais serviços apenas prefixos fixos. Sem corpos, parâmetros, headers, mensagens, SQL de negócio ou dados individuais.

Fontes: edge_logs 4.370; postgres_logs 628; postgrest_logs 328; pgbouncer_logs 147; auth_logs 68; storage_logs 45; auth_audit_logs 21; realtime_logs 3. Não somar fontes como requests. Gateway: **REST 4.240, Auth 60, Realtime 20, Storage 50**; 64 grupos, sem truncamento.

| Rota REST | Status | Chamadas |
| --- | --- | ---: |
| products | 200 / 206 / 204 / 400 | 865 / 14 / 10 / 4 |
| orders | 200 / 206 | 561 / 95 |
| product_variations | 200 | 379 |
| people | 200 / 204 / 201 | 329 / 10 / 1 |
| rpc/get_products_trash_eligibility | 200 | 245 |
| store_style_settings | 200 | 185 |
| rede_transactions | 200 | 159 |
| rpc/flush_supabase_telemetry | 204 / 200 | 144 / 9 |

Ante a janela consecutiva anterior de três horas, gateway +2.743 eventos (1.627→4.370), REST +2.675 (1.565→4.240), leituras de produtos +597 (282→879), pedidos +509 (147→656), Rede +71 (88→159). São contagens, sem evidência de bytes, origem ou versão. Storage retornou 33 status 400; o agregado por serviço não identifica causa/objeto nem comprova repetição. Nenhum valor antigo reapresentado como Egress atual; bytes/quota/excedente/delta oficial e meta 100 MB/dia continuam indisponíveis.

**Inventário e revisão estática:**

| Integração / finalidade | Arquivos e chamadas | Gatilho / proteção | Evidência / risco |
| --- | --- | --- | --- |
| ERP: lista e elegibilidade para lixeira | `erp/src/pages/App/Products/ProductList/hooks/data/useProducts.ts:101–107` → `erp/src/pages/utils/productService/productQueryService.ts:178–247` → products e RPC get_products_trash_eligibility | Página/filtros no queryKey; staleTime 60 s e gcTime 5 min; uma RPC em lote dos IDs retornados, timeout com abort e fallback conservador; sem cache próprio da elegibilidade | 245 chamadas da RPC entre todos os clientes; não atribuir ao ERP ou inferir excesso. Cache independente poderia desatualizar a elegibilidade |
| Mobile: lista e elegibilidade para lixeira | `mobile/src/features/products/hooks/useMobileProducts.ts:209–238` → `services/mobileProductFetchService.ts:218–344,459–461,732–734`; helper RPC em :67–112 | Página/filtros/busca aplicada; retry de leitura uma vez com guarda de requisição atual; paginação range; elegibilidade em lote, pula lixeira/rascunhos, timeout/abort e fallback seguro; helper sem cache próprio | Vários chamadores de products; contagens não provam qual projeção/tela foi usada. Campos amplos requerem rastrear todos os consumidores antes de retirar |
| ERP: histórico da Rede | Finance/Settings/index.tsx:36–53 → financeService.ts:384–392 | Montagem ou botão Tentar novamente; limite 5, projeção de quatro campos, timeout 15 s e descarte de resposta obsoleta; sem polling/cache/abort nesta carga | EGR-003 preservada, sem diff contra HEAD; 159 respostas 200 não provam implantação/efeito da correção ou loop |

**Resultado:** sem nova causa comprovada corrigível nesta rodada. Somente relatório e memória atualizados; preservadas 14 entradas iniciais de trabalho local, inclusive arquivos novos e mudanças concorrentes nos produtos. Diffs pertinentes conferidos antes de escrever. Nenhum código alterado, teste adicionado/executado, dado de negócio consultado, execute_sql, mudança remota, migration, dependência, commit ou deploy. Fluxos fiscais não inspecionados. Decisão anterior da Central (6 s / 30 s / reconciliação) continua pendente, sem repetir o achado. Revisão estática; validação funcional e medição oficial permanecem pendentes.

## Décima execução — 26/10/2026, 17:50 BRT

**Acesso e fontes:** AGENTS vigente, política remota, memória, relatório e skill Supabase consultados. CLI 2.121.0; ajudas raiz/projects/list/inspect/db/traffic-profile/telemetry redescobertas, sem Usage/Egress faturável. traffic-profile mede I/O de blocos, não Egress; somente ajuda consultada. CLI e plugin list_projects confirmaram acesso a MoranteHub/ref hkoxhourxwlddgsfdgws; linked e vínculo local corretos, saída CLI filtrada em memória. Plugin sem medidor explícito. Automação ACTIVE/3 h conferida e preservada. Changelog Markdown e documentação atual de [campos](https://supabase.com/docs/guides/observability/log-field-reference), [agregações](https://supabase.com/docs/guides/observability/detecting) e [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress) consultados; nenhuma mudança pertinente comprovada.

**Janela exata:** 2026-10-26T17:30:00Z–2026-10-26T20:30:00Z (**14:30–17:30 BRT**). Duas query_logs, sem polling; somente source/count e gateway por serviço/rota normalizada/status/count. Campos documentados source, request.path e response.status_code; mesma regex REST das coletas anteriores, demais serviços por prefixos fixos. Sem mensagens, headers, parâmetros, corpos, SQL de negócio ou dados individuais. Retornaram 78 grupos, abaixo do limite de 80; soma do gateway confere com edge_logs.

Fontes: edge_logs 4.028; postgres_logs 626; postgrest_logs 318; auth_logs 89; pgbouncer_logs 36; auth_audit_logs 29; realtime_logs 19; storage_logs 5. Não somar fontes como requests. Gateway: **REST 3.918; Auth 80 (77x200, 2x302, 1x400); Realtime 18 (101); Storage 12 (6x400, 5x200, 1x304)**.

| Rota REST de destaque | Status | Chamadas |
| --- | --- | ---: |
| products | 200 / 206 / 204 / 400 / 201 | 540 / 32 / 16 / 4 / 2 |
| people | 200 / 400 / 201 / 204 | 433 / 4 / 2 / 1 |
| orders | 200 / 206 | 387 / 41 |
| profiles | 200 | 340 |
| rpc/current_user_has_password | 200 | 274 |
| rede_transactions | 200 | 221 |
| rpc/flush_supabase_telemetry | 204 / 200 / 401 | 196 / 13 / 2 |
| store_style_settings | 200 | 170 |
| product_variations | 200 / 204 / 201 | 111 / 5 / 4 |

Ante a janela consecutiva anterior de três horas, gateway -342 eventos (4.370→4.028), REST -322 (4.240→3.918), leituras de produtos -307 (879→572), pedidos -228 (656→428), Rede +62 (159→221). São contagens, sem atribuição a cliente, versão ou patch; não são delta de Egress. Status de erro isolados não comprovam loop. Uso/quota/excedente/delta em bytes e cumprimento de 100 MB/dia continuam indisponíveis.

**Inventário/revisão estática:** sessão/perfil ERP reconfirmados em erp/src/context/auth/useAuthSession.ts:72–180 → profileService.ts:53–89 (deduplicação inicial e guarda simultânea, projeção explícita/id/maybeSingle/timeout, retry condicionado a erro Auth). Mobile: mobile/src/contexts/AuthContext.tsx:108–148,177–247 → resolveMobileUserProfile e refreshPasswordCredentialStatus; getSession/INITIAL_SESSION compartilham guarda inicial, authSyncId descarta resultados obsoletos e perfil tem timeout. Política shared-utils/authSessionPolicy.ts:2–3 pula manutenção de senha em TOKEN_REFRESHED. RPC compartilhada também pelo ERP; 274 chamadas não identificam plataforma nem demonstram duplicação. Nenhum cache de segurança introduzido.

Telemetria reconfirmada em erp/src/services/monitoring/queryGuard.ts:43–60,84–121,192: envio a cada cinco minutos com buffer/sessão, backoff 5–60 min e exclusão da própria rota do tracking; 211 chamadas agregadas, sem atribuição por instância. Não há evidência suficiente para alterar frequência. EGR-003 permanece em financeService.ts:384–392 com projeção de quatro campos. Inventários anteriores continuam aplicáveis; decisão da Central preservada, sem repetir o achado como novo.

**Resultado:** nenhuma nova causa comprovada corrigível nesta rodada; apenas relatório e memória atualizados. Nove entradas iniciais de trabalho local preexistente preservadas; diffs relevantes conferidos antes da escrita, integrações revisadas sem diff. Nenhum código alterado, teste adicionado/executado, dado de negócio consultado, execute_sql, mudança remota, migration, dependência, commit ou deploy. Fluxos fiscais não inspecionados. Revisão estática; validações funcionais anteriores e medição oficial continuam pendentes.

## Décima primeira execução — 26/10/2026, 20:49 BRT

**Acesso e fontes:** AGENTS vigente, política remota, memória, relatório e skills Supabase/Ponytail/Surgical Patch consultados. CLI 2.121.0; ajudas raiz/projects/list/inspect/db/telemetry redescobertas, sem medidor Usage/Egress. CLI e plugin list_projects autenticados no MoranteHub/ref hkoxhourxwlddgsfdgws; linked e vínculo local corretos. Saída de projetos filtrada em memória, sem identidade/segredos. Plugin sem medidor oficial de bytes; nenhuma inspeção SQL do banco executada. Changelog atual consultado, inclusive aviso TLS já conhecido; documentação oficial de logs e select consultada. Automação ACTIVE/3 h preservada.

**Janela exata:** 2026-10-26T20:30:00Z–2026-10-26T23:30:00Z (**17:30–20:30 BRT**). Duas query_logs, somente agregados source/count e gateway por serviço/rota/status/count, sem polling. Campos documentados source, request.path e response.status_code. Nesta coleta, apenas caminhos completos correspondentes a `^/rest/v1/(rpc/)?[a-z_]+$` aparecem como rota; demais caminhos são reduzidos a prefixos de serviço. Nenhum parâmetro, ID, header, corpo, mensagem ou SQL de negócio foi consultado. Retornaram 60 grupos, abaixo do limite de 100; soma 2.311 confere com edge_logs.

Fontes: edge_logs 2.311; postgres_logs 620; postgrest_logs 216; auth_logs 101; pgbouncer_logs 31; auth_audit_logs 10; realtime_logs 4; storage_logs 2. Não somar fontes como requests. Gateway: **REST 2.202, Auth 98 (200), Realtime 4 (101), Storage 7 (4x400, 3x200)**.

| Rota REST de destaque | Status | Chamadas |
| --- | --- | ---: |
| products | 200 / 206 / 204 / 201 | 292 / 40 / 8 / 1 |
| orders | 200 / 206 | 252 / 32 |
| people | 200 | 176 |
| profiles | 200 | 132 |
| rede_transactions | 200 | 90 |
| categories | 200 | 85 |
| rpc/flush_supabase_telemetry | 204 / 200 | 65 / 5 |
| store_style_settings | 200 | 42 |

Ante a janela consecutiva anterior de três horas, gateway -1.717 eventos (4.028→2.311), REST -1.716 (3.918→2.202), leituras de produtos -240 (572→332), pedidos -144 (428→284). São deltas de contagens, sem atribuição a cliente, versão ou patch; não medem Egress. Uso/quota/excedente/delta em bytes e meta 100 MB/dia continuam indisponíveis.

**EGR-004 — linhas de categorias descartadas pelo painel:** `erp/src/pages/App/Dashboard/Index.tsx:144` monta DigitalCatalogPanel. Seu efeito de montagem em `erp/src/pages/App/Dashboard/components/DigitalCatalogPanel.tsx:15–73` consulta categories em :24 com select de IDs e count exact, mas o único consumo de categoriesRes é `.count` em :59. Causa local comprovada: solicitar linhas que o componente descarta. Alterada somente :24 para `{ count: 'exact', head: true }`, preservando contagem exata, filtros, carga paralela e consumidores. A [documentação oficial de select](https://supabase.com/docs/reference/javascript/select) confirma esse modo de consulta de contagem. A rota categories teve 85 respostas 200, sem prova de que partiram deste painel. Economia esperada: eliminar o corpo das linhas nessa chamada quando executada; magnitude em bytes e efeito remoto não medidos.

**Inventário incremental:** integração ERP/painel do catálogo → DigitalCatalogPanel:24 → categories, finalidade contar categorias; gatilho montagem, sem polling/cache/deduplicação/abort próprios; agora HEAD/count exact. Outros chamadores incluem CategoryAutocomplete:45 (id/name, montagem e foco), productCategoryOptionsService:11–15 (id/name/type) e mobileCategoryService; isso impede atribuir o agregado ao painel. Sem alterar frescor, frequência ou regras de produto. EGR-003 reconfirmada em financeService.ts:384–392 e Finance/Settings:36–53, sem diff prévio; EGR-001/EGR-002 e decisão anterior da Central preservadas.

**Validação e limites:** diff prévio do painel vazio; mudança de uma linha revisada com todos os usos de categoriesRes. Trabalho local amplo preexistente preservado (175 entradas no status intermediário, antes do patch). Revisão estática e git diff --check dos arquivos alterados; nenhum teste adicionado/executado por instrução da automação. Prova funcional e medição oficial de bytes pendentes. Nenhuma consulta a dados de negócio, execute_sql, alteração remota, migration, dependência, commit ou deploy; fluxos fiscais não inspecionados. Mudança interna sem efeito na operação do estoquista.

## Décima segunda execução — 26/10/2026, 23:24 BRT

**EGR-005 — intervalo de atualização da Central:** a lista agenda uma atualização silenciosa a cada 6 segundos enquanto visível; cada atualização recarrega todas as páginas abertas, com 50 conversas por página. Eventos Realtime e foco/retorno à tela também atualizam a lista. O relatório informado de 108 chamadas × 50 linhas = 5.400 ocorrências é compatível com o tamanho de página do cliente, mas não permite concluir que sejam conversas únicas nem que tenham sido gravadas. A RPC consulta whatsapp_conversations; não é uma tabela chamada customer_support_list_conversations.

**Correção local:** em erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportConversations.ts:164, intervalo do timer alterado de 6 para 30 segundos. Atualizações por Realtime e foco/visibilidade continuam imediatas. Efeito esperado: até 80% menos chamadas disparadas pelo timer no mesmo período; eventos e páginas adicionais podem alterar o total. Sem medição de bytes ou deploy.

**Observabilidade e validação:** query_logs agregados para 2026-10-26T23:24:03Z–2026-10-27T02:24:03Z retornaram 753 respostas 200 da RPC. Esse agregado não corresponde à métrica de 108 sem a janela/fonte original e não identifica sessões ou clientes. Revisão estática e diff --check; nenhum teste executado. Nenhuma escrita SQL, mudança remota, migration, commit ou deploy.

## Décima terceira execução — 27/10/2026, 08:23 BRT

**Fontes e acesso:** AGENTS vigente, política remota, memória, relatório e skills Supabase/Ponytail consultados. CLI 2.121.0, com ajudas raiz/projects/list/inspect/db/telemetry redescobertas; sem medidor Usage/Egress faturável. CLI e plugin list_projects confirmaram acesso ao MoranteHub/ref hkoxhourxwlddgsfdgws; vínculo local e linked corretos. Saídas de projetos filtradas em memória. Plugin redescoberto sem medidor explícito de bytes. Automação existente ACTIVE, intervalo de três horas, preservada. [Changelog](https://supabase.com/changelog.md) consultado por HTTP após o leitor web recusar text/markdown; aviso TLS já conhecido, sem nova exigência pertinente ao escopo. [Campos oficiais de logs](https://supabase.com/docs/guides/observability/log-field-reference) confirmam source, request.path e response.status_code.

**Janela exata:** 2026-10-27T08:15:00Z–2026-10-27T11:15:00Z (**05:15–08:15 BRT**). Duas query_logs, sem polling: fonte/count e gateway por rota normalizada/status/count. Apenas caminhos completos compatíveis com `^/rest/v1/(rpc/)?[a-z_]+$` aparecem como rota; demais caminhos seriam agrupados por prefixos fixos. Sem mensagens, headers, query strings, corpos, SQL de negócio ou dados individuais. Foram 14 grupos, abaixo do limite de 100; soma 491 confere com edge_logs.

Fontes: postgres_logs **612**, edge_logs **491**, postgrest_logs **122**. Não somar fontes como requests. Gateway: **REST 491**; nenhum evento de Auth, Storage, Realtime ou Functions retornado nesta janela.

| Rota REST | Status | Chamadas |
| --- | --- | ---: |
| rpc/claim_return_fiscal_emission_job | 200 | 89 |
| whatsapp_conversations | 200 | 77 |
| whatsapp_messages | 200 / 204 | 77 / 18 |
| people | 200 | 74 |
| rpc/customer_support_receive_message | 200 | 39 |
| rpc/customer_support_receive_message_echo | 200 | 38 |
| warranty_terms | 204 | 18 |
| whatsapp_dispatches | 204 | 18 |
| categories | 200 | 14 |
| store_style_settings | 200 | 14 |
| products | 200 / 206 | 7 / 1 |
| category_relationships | 200 | 7 |

Não calcular delta nesta coleta: a janela não é contígua à última coleta de três horas e o registro intermediário EGR-005 apresenta apenas uma rota. **Uso/quota/excedente/delta em bytes e cumprimento dos 100 MB/dia permanecem indisponíveis.** Contagens não identificam versão, cliente, payload ou efeito dos patches.

**Inventário incremental — recebimento WhatsApp:** handlers `api/whatsapp-webhook.ts:52` e `erp/api/whatsapp-webhook.ts:106` executam o bundle `erp/server/customer-support/whatsapp-processor.cjs`, derivado de `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts`. Mensagem recebida: :432–438 consulta somente id por api_message_id/maybeSingle; se nova, :458–464 consulta vínculo da conversa por canal/contato; :467 chama matchCustomerByPhone quando não há cliente e o vínculo não é manual; :481 chama a RPC. Echo segue a mesma estrutura em :93–127. Finalidade: conferir duplicidade/vínculo antes do recebimento transacional; gatilho por evento do webhook, sem timer/cache compartilhado/abort nessas leituras. A RPC continua responsável por confirmar o recebimento, inclusive para mensagens já conhecidas; remover a consulta ou pular a RPC alteraria a proteção atual. Contagens 77/77 e 39/38 são compatíveis com esses chamadores, sem atribuição comprovada.

Matching compartilhado em `customerMatchingService.ts:51–132`: people com projeção explícita (:24), até seis candidatos de telefone, limite de 20 registros (:72), comparação normalizada e deduplicação por id; retorna resumo e lista de ambiguidades. Não reduzir esse limite nem introduzir cache de vínculos sem preservar ambiguidade e atualizações. Bundle conferido estaticamente (:143,246–254,503–514); nenhum loop de rede comprovado nesses caminhos. Nenhuma mudança de código justificada apenas pelas contagens.

**Continuidade EGR-005:** intervalo atual de 30 segundos reconfirmado em `useCustomerSupportConversations.ts:160–175`, com foco/visibilidade e Realtime (:197–200). A decisão histórica de 6/30 segundos foi resolvida na execução anterior; não voltar a apresentá-la como pendente. Memória desta automação ainda terminava em EGR-004 e foi atualizada para registrar essa continuidade. Não inferir implantação ou redução remota.

**Resultado e validação:** somente relatório e memória atualizados. Preservadas cinco entradas iniciais de trabalho local, incluindo migration removida/substituta; nenhum SQL dessa alteração foi executado. Diffs locais pertinentes revisados antes da escrita; integrações inspecionadas sem diff. Revisão estática e git diff --check do relatório; sem testes por instrução explícita, sem dados de negócio, execute_sql, alteração remota, migration, dependência, commit ou deploy. Fluxos fiscais não inspecionados. Nenhuma nova mudança acionável; medição oficial e validação funcional dos patches anteriores permanecem pendentes.
