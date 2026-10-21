# Inbox — conferência de 21/10/2026

> Continuidade mais recente: [publicação e gates](central-de-atendimento-publicacao-2026-10-21.md) e [duas falhas reais de inicialização/correção](central-de-atendimento-runtime-esm-2026-10-21.md). A suíte posterior tem 192 testes/20 arquivos; os resultados de fixtures abaixo continuam históricos e a massa permanece encerrada.

## Correções desta continuidade

- **Erro de export no navegador:** `supportConversationCommandSchema` existia no arquivo, mas a resposta HTTP do Vite ainda continha somente os quatro exports antigos. Requisições sem cache, inclusive com query nova, repetiam o módulo antigo. Após nova notificação do arquivo, o Vite entregou os exports atuais; uma alteração subsequente no schema de pastas também foi detectada normalmente. A Inbox foi recarregada e validada. Não foi criada uma implementação substituta do schema.
- **Comandos e contexto:** schemas compartilhados validam atribuição, status, arquivo, exclusão de pasta e vínculo/desvínculo antes do serviço. Erros ficam visíveis, valores parseados seguem para a operação e travas impedem duplo clique. Respostas antigas não alteram outra conversa nem uma seleção A→B→A. Os painéis são remontados por conversa.
- **Pastas:** formulário usa schema compartilhado, valida UUID ou os critérios `all`/`mine`/`unassigned`, apresenta erro de atendente e rejeita submissão repetida durante a gravação. Nome duplicado mantém o formulário aberto com feedback do serviço.
- **Pedido do cartão:** o link encaminha `saleOrderIdToOpen` pelo contrato já consumido pela lista de Vendas. O identificador do próprio cartão é preservado; sem vínculo ou permissão comercial o atalho não é oferecido. Esta prova foi de componente, sem navegar para pedido operacional.
- **Rolagem real:** antes da correção, a região da lista tinha altura e conteúdo de 5.146px, dentro de um viewport de 917px. O layout usava somente `min-h-screen`, permitindo que o conteúdo expandisse a página inteira. O scroll da região não mudava e a página 2 não era solicitada. A Central agora limita o shell a `h-dvh`, permite encolhimento no `main` e no proprietário da Inbox e mantém a rolagem interna. Outras rotas preservam `min-h-screen`.
- **Acessibilidade:** região da lista identificada; seção de atendentes com nome acessível e estado expandido; botões de atendente expõem o estado selecionado. Os ícones antes interferiam no nome acessível do cabeçalho da seção.
- **Identidade do operador:** o runner usa o launcher oficial de Vercel Development desde a raiz. Isso evita as credenciais divergentes de `erp/.env.local`. Confere o usuário real e exige resposta 204 do gate antes de consultar a Central. Detalhes no [registro do launcher compartilhado](../fiscal/historico-correcoes-2026-10-21.md#credenciais-canônicas-no-runner-de-leitura-da-central).
- **Fonte do token de mídia:** metadata de `settings/app` confirmou token/número/WABA existentes e canal correspondente às conversas, sem retornar os valores. Quando não há token no ambiente, o proxy agora lê somente `data->whatsappConfig` no servidor, depois de JWT, permissão e mensagem visível pela RLS; consulta o canal da conversa com a identidade do usuário e exige igualdade do número configurado. Token de ambiente mantém prioridade. Treze testes isolados conferem sucesso, canal divergente, configuração inválida/indisponível e ausência de leitura privilegiada sem acesso. Nenhum binário da Meta foi consultado nesta prova.

## Arquivos principais

- `shared-utils/customerSupportFormSchemas.ts:14`: contratos dos comandos; `:23`: exclusão; `:33`: vínculo; `:39`: pasta.
- `erp/src/pages/App/CustomerSupport/components/chat/ChatHeader.tsx`: resolver e trava dos comandos.
- `erp/src/pages/App/CustomerSupport/components/ManualLinkModal.tsx` e `CustomerInfoPanel.tsx`: vínculo/desvínculo e retorno assíncrono.
- `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportActions.ts`: geração da seleção e atualização funcional do estado atual.
- `erp/src/pages/App/CustomerSupport/components/inbox/AddCustomInboxModal.tsx:45`: trava; `:102`: submissão validada.
- `erp/src/pages/App/CustomerSupport/components/infoPanel/CustomerOrdersTab.tsx:101`: seleção do pedido.
- `erp/src/AppLayout.tsx:41` e `:85`; `erp/src/pages/App/CustomerSupport/Index.tsx:173`: altura e encolhimento da Central.
- `erp/src/pages/App/CustomerSupport/components/ConversationSidebar.tsx:168` e `components/inbox/InboxSectionTeam.tsx:20`: identificação/estados acessíveis.
- `erp/tests/support-readonly/support-login.spec.ts`: prova UI com escrita de negócio bloqueada na rede; credenciais em memória; sem trace, vídeo, screenshot ou storage state.

## Evidências do checkpoint de leitura

| Teste | Executado | Projeto/ref | Massa/runId | Resultado | Limite |
| --- | --- | --- | --- | --- | --- |
| Vitest/RTL e despacho | Sim, 18 arquivos/163 casos | Sem banco para mocks | Valores isolados | Aprovado | Inclui seis checks negativos remotos e seis testes das rotas do layout; não prova persistência gravável |
| Negativas remotas de `anon` | Sim, seis casos na suíte | `hkoxhourxwlddgsfdgws` | Nenhuma fixture | Acesso recusado | Sem autoria, concorrência ou RLS entre usuários autenticados |
| Playwright de leitura | Sim, 1/1 em 24s | Mesmo ref, UI 5173/API 3000 | Lista operacional somente leitura; sem runId | Gate 204; pasta vazia recusada; filtro de atendente aplicado/limpo; segunda página carregada; mídia anônima 401 | Não seleciona/edita conversa, não salva pasta e não baixa mídia real |
| Geometria após a rolagem | Sim, Playwright | Mesmo ref | Somente leitura | 99 de 99 conversas; lista com 772px e conteúdo de 10.134px em viewport de 917px | Valores do momento, sem massa controlada |
| TypeScript global | Sim | Checkout compartilhado | N/A | 424 diagnósticos; nenhum nos caminhos da Central | `AppLayout.tsx:100` tem erro anterior de `assistanceInitialData`, fora das duas alterações de classes; gate global continua reprovado |
| Build Vite | Sim, 1m45s após ajuste de altura | Checkout compartilhado | N/A | Aprovado | Avisos de tamanho dos chunks; não equivale a deploy |

Comando unitário: `RUN_CUSTOMER_SUPPORT_REMOTE_READONLY_TESTS=1 npm run test:unit -- src/pages/App/CustomerSupport/__tests__ src/pages/utils/__tests__/whatsappDispatchTracking.test.ts src/components/layout/hooks/__tests__/useLayoutRoutes.test.ts`, dentro de `erp`. Em PowerShell, definir a variável com `$env:`. UI: `npm run test:support:readonly`, desde a raiz, com navegador Playwright visível já aberto na porta de desenvolvimento.

Logs locais ignorados: `scratch/central-inbox-unit-2026-10-21.log`, `scratch/central-inbox-tsc-2026-10-21.log` e `scratch/central-inbox-build-2026-10-21.log`. Não contêm credenciais de login.

## Evidências atuais e próximos gates

### Continuação com massa própria, autorizada posteriormente

O proprietário autorizou expressamente 51 conversas, 131 mensagens iniciais e uma pasta, com até 20 eventos/comentários de teste adicionais. [Registro completo, versões/SHA das migrations e limites](central-de-atendimento-fixtures-proposta-2026-10-21.md). As guardas foram instaladas sem novos schemas/tabelas/colunas. O runId `73bcaf9a-9b15-4ae1-8583-23c026fd9477` pertence ao operador real `13eab361-be48-4e49-be4b-4ad79813b812`; todos os vínculos foram conferidos antes das gravações.

- **Unidades/componentes/contratos:** 191 testes em 19 arquivos aprovados, incluindo seis negativas anônimas remotas e treze casos da fonte de configuração de mídia. Lint focado com zero erros e um aviso anterior de Fast Refresh; o complemento de mídia passou sem avisos nos dois arquivos cobertos pela configuração. Configuração específica dos harnesses passou no TypeScript com zero diagnósticos.
- **PostgreSQL autenticado:** quatro casos Vitest aprovados. Preparação/replay sem massa duplicada; busca textual antes da contagem/paginação (50+1); filtros de pedidos sobre conversas sem cliente; autoria e metadata forjadas recusadas; duas tags concorrentes preservadas; uma edição de notas vencedora e uma rejeitada; metadados da pasta mantidos; repetição do estado atual sem novo evento. Essas provas usam somente os IDs próprios.
- **Interface real:** Playwright 1/1 em 36,3s: pasta criada anteriormente e reaberta/editada/excluída, 51 conversas em duas páginas, 81 mensagens com carregamento anterior, cópia com feedback sem comentário, comentário com autor real, atribuição, fechamento/reabertura, timeline com IDs únicos, marcador reservado bloqueado, tag criada/removida, draft de notas preservado e resumo persistido. Escritas fora dos IDs da execução foram bloqueadas no transporte. Cópia exata do texto também tem prova RTL; o harness não lê a área de transferência do sistema.
- **Bugs encontrados pela prova:** fragmentos alfanuméricos eram reduzidos a dígitos e traziam telefones sem relação; `40001` em conflitos de domínio provocava espera em vez da resposta de conflito; contexto da pasta podia ficar antigo ao inicializar a sessão; botões de editar/excluir dependiam de hover. As correções e testes estão no registro da operação.
- **Retenção:** pasta excluída na UI e ausência confirmada no banco. Após autorização específica dos 51 eventos de limpeza, a migration `20261021122238_customer_support_cleanup_events.sql` instalou a reserva total de 202. Vitest 2/2 passou em 4,55s: as mesmas 51 conversas foram arquivadas pelo serviço normal, preservando 190 mensagens (139 anteriores +51 eventos). Manifesto encerrado; não reutilizar a massa para novas gravações.
- **Build e tipos finais:** Vite aprovado em 1m59s; harnesses TypeScript sem diagnósticos. O TypeScript global mantém 424 diagnósticos e nenhum nos caminhos da Central; o erro anterior de assistência no layout permanece fora das alterações de classes deste lote. O gate global continua reprovado.
- **Leitura após a limpeza:** Playwright 1/1 aprovado em 12,5s, com o mesmo login/gate, formulário inválido, filtro de atendente, segunda página por rolagem e mídia anônima recusada. Sem novas gravações de negócio.
- **Repetição final:** após o complemento de configuração de mídia, o mesmo Playwright de leitura passou novamente em 12,7s. TypeScript global reconferido: 424 diagnósticos, zero na Central; diff focado sem erros de whitespace. A publicação continua aguardando autorização, e o segredo de assinatura aguarda uma fonte protegida identificada pelo proprietário.

Não foram criados clientes, pedidos, produtos ou usuários nem consultados arquivos da Meta. Permanecem sem prova nesta massa: acesso por outra identidade autorizada, perfil sem permissão comercial, vínculo com cliente/pedido próprios e download de mídia própria. A implantação e a restrição final do contrato legado ainda não foram executadas.

As seis migrations da Central constam no histórico remoto; versões e hashes estão no [registro da operação](central-de-atendimento-fixtures-proposta-2026-10-21.md). A revogação final dos privilégios autenticados legados permanece preparada fora das migrations automáticas e depende de publicar a versão compatível. Persistência, reabertura, paginação, autoria, idempotência e concorrência têm as provas próprias descritas acima; compartilhamento entre identidades, mídia e vínculos comerciais conservam os limites explícitos. Nenhum envio à Meta foi habilitado. A Inbox não foi declarada globalmente concluída.

Preparação da entrega e gates de configuração: [pacote da Central](central-de-atendimento-entrega-2026-10-21.md).
