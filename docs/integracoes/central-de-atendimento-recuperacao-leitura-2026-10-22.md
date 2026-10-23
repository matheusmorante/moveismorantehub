# Central de Atendimento — leitura recuperada pela atualização da lista

**Data:** 22/10/2026  
**Estado:** correção local validada e compilada em candidato isolado; sem publicação deste lote.

## Problema e causa

Uma conversa já aberta podia receber novas não lidas pela atualização periódica da lista sem confirmar a leitura. O efeito de mensagens dependia do contador, mas só executava a confirmação dentro da condição de troca do ID da conversa. Assim, uma mensagem recuperada após perda do evento Realtime permanecia não lida até uma nova abertura ou evento.

Além disso, a confirmação bem-sucedida limpava apenas o item da lista. A conversa selecionada mantinha o contador anterior; se uma nova consulta retornasse esse mesmo valor, a dependência do efeito não mudaria. A confirmação citada é o contador interno da Inbox, sem chamada à Meta.

## Solução

- A confirmação considera também novas não lidas da conversa que continua selecionada, sem reiniciar nem descartar seu histórico.
- Após sucesso, lista e conversa selecionada passam a ter contador zero. A seleção só é alterada se ainda corresponder ao mesmo ID.
- Permanecem as guardas de geração/resposta, feedback de falha e repetição manual. Não houve alteração de serviço, RPC, RLS, schema, recebimento ou envio.

Arquivos de execução: `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportMessages.ts` e `erp/src/pages/App/CustomerSupport/Index.tsx`.

## Provas

| Teste | Executado | Projeto / massa | Resultado | Limite |
|---|---|---|---|---|
| Regressão de novas não lidas sem INSERT Realtime | Vitest/RTL antes/depois | Somente mocks isolados | Falhou antes com zero confirmações; passou após corrigir o efeito, preservando histórico e aguardando sucesso antes de limpar | Não prova PostgreSQL |
| Leitura, paginação, contexto de ações, Realtime e Inbox | Vitest/RTL, cinco arquivos | Isolado | **49/49 aprovados** | Não é nova execução da suíte inteira |
| Fluxo pela interface e recuperação pela lista | Playwright visível na **5173**, strictPort; API 3000 respondendo | Supabase operacional `hkoxhourxwlddgsfdgws`, schema public, run retido `8eaed14f-364d-47ab-be41-66be54b3fb65`; manifesto/owner/IDs/canal de teste e arquivamento conferidos antes de selecionar | **1/1 em 49,1s na conferência final**; primeira aprovação funcional em 18,2s. Erro de gravação visível, repetição recusada, um ACK sintético no navegador e nova tentativa provocada pelo poll remoto real | Todo PATCH foi abortado ou respondido no navegador; **não comprova persistência de leitura** e não reabre autorização de escrita da execução encerrada |
| ESLint dos dois arquivos de execução e regressão RTL | Executado | Local | Aprovado | Harness Playwright compilado pelo runner |
| Build ERP completo isolado | Executado sobre o commit de produção conferido `bed981061157e1d07164b4cb9c8fdeb91e78abbb` mais oito caminhos selecionados | Sem `.env` ou credenciais; manifests de dependências idênticos ao workspace | **Aprovado em 1m37s**, 5.912 módulos Vite | Avisos não fatais de anotações de dependência, imports estáticos/dinâmicos e chunks acima de 500 kB |

A primeira tentativa Playwright parou numa assertiva antiga de atalhos: ela pesquisava o título “Canal WhatsApp” na página inteira e encontrou o selo estático legítimo de `ConversationItem`. A assertiva agora verifica somente botões; também exige a indicação estática “Whatsapp” no compositor. Essa falha de prova não foi atribuída ao defeito de leitura.

O ACK sintético só é permitido pelo harness quando o ID é o da conversa própria já comprovada, o PATCH tem apenas `unread_count: 0` e contém o predicado `unread_count=gt.0`. A requisição é atendida com 204 no navegador, sem encaminhamento ao Supabase; todas as demais escritas continuam bloqueadas. A leitura periódica posterior continua sendo remota e retorna o contador real inalterado. O cenário comprova coordenação do frontend, sem alegar gravação no banco.

A limpeza final navega para `about:blank` antes de retirar a guarda de rede, encerrando a aplicação, seus polls e callbacks enquanto as escritas ainda estão bloqueadas. A janela visível e a sessão do navegador permanecem abertas. Essa limpeza também foi exercitada na conferência final aprovada.

Arquivos de prova: `erp/src/pages/App/CustomerSupport/__tests__/customerSupportPaging.test.tsx`, `erp/tests/support-readonly/support-login.spec.ts`; logs em `scratch/central-support-missed-read-before-2026-10-22.log`, `scratch/central-support-missed-read-after-2026-10-22.log`, `scratch/central-support-missed-read-playwright-before-2026-10-22.log`, `scratch/central-support-missed-read-playwright-after-2026-10-22.log` e `scratch/central-support-missed-read-playwright-final-2026-10-22.log`.

Nenhuma fixture, migration, conta, mensagem ou dado comercial foi criado. O envio continua bloqueado. A auditoria A–R permanece em andamento.

Candidato: `C:\Users\mathe\morantehub-central-read-recovery-release-20261022`, com dois arquivos de execução e oito caminhos selecionados no manifesto. A conferência de Vercel após o build ainda encontrou o alias público no deploy anterior `dpl_GXyA2xGLgWMamjYCpzRwfzrburYE`; o código deste lote não está nesse commit. Este agente não fez commit, push, deploy ou promoção.
