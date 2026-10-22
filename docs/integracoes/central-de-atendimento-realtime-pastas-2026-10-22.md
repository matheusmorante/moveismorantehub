# Central de Atendimento — ciclo de vida Realtime e feedback de pastas

**Data:** 22/10/2026  
**Estado:** correções locais implementadas e validadas; compilação isolada em preparação, sem publicação.

## Realtime: causa e correção

Os efeitos de conversas e mensagens tratavam qualquer `CLOSED` como queda e criavam um temporizador de reconexão. Na dependência instalada `@supabase/realtime-js` 2.99.1, `removeChannel` chama `unsubscribe`; quando a saída termina, o callback de assinatura recebe `CLOSED`. Assim, sair da Inbox ou trocar os filtros removia o canal e agendava outro depois do encerramento do efeito. Ao substituir uma conexão com falha, o canal antigo também podia agendar outra reconexão, consultar filas ou confirmar leitura de uma mensagem atrasada. Uma recuperação para `SUBSCRIBED` não cancelava a tentativa já agendada.

Os dois efeitos agora invalidam o ciclo antes da remoção, atribuem uma geração a cada canal e descartam status/eventos de gerações anteriores. O canal recuperado cancela o temporizador pendente. A reconexão automática de uma falha atual continua com os prazos já existentes.

**Prova:** seis regressões RTL falharam antes da alteração: três aberturas de canal após unmount, duas após recuperação e callbacks antigos provocando consulta/leitura. As seis passaram após a correção.

## Pastas: causa e correção

`useCustomerSupportFolders` já expunha erro, estado de carregamento e função de recarga. `Index.tsx` não os consumia, e a seção de pastas interpretava a lista vazia como consulta concluída. Uma falha de rede/permissão, portanto, aparecia como “Nenhuma pasta nesta aba”.

Os estados agora chegam à seção de pastas, que apresenta carregamento com spinner, erro com botão “Tentar novamente” e vazio somente depois de uma consulta concluída. Pastas previamente carregadas continuam visíveis se uma atualização falhar. Não houve mudança em serviços, permissões, dados ou formulários de gravação.

## Arquivos

- `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportConversations.ts`
- `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportMessages.ts`
- `erp/src/pages/App/CustomerSupport/Index.tsx`
- `erp/src/pages/App/CustomerSupport/components/InboxSidebar.tsx`
- `erp/src/pages/App/CustomerSupport/components/inbox/InboxSectionCustom.tsx`
- `erp/src/pages/App/CustomerSupport/__tests__/customerSupportRealtimeLifecycle.test.tsx`
- `erp/src/pages/App/CustomerSupport/__tests__/customerSupportInbox.test.tsx`
- `erp/tests/support-readonly/support-login.spec.ts`

## Validação e limites

- Regressões anteriores à correção: **6/6 Realtime e 1/1 feedback de pastas falharam**, com as causas acima.
- Seleção Vitest/RTL: **53/53 em seis arquivos** aprovados, incluindo paginação, leitura, contexto de ações, formulários e ciclo de vida.
- Suíte `src/pages/App/CustomerSupport/__tests__`: **227 aprovados e seis ignorados em 23 arquivos**. Os seis checks anônimos remotos dependem de opt-in e não rodaram neste lote; não atribuir a eles prova nova de banco. As verificações HTTP locais da Central mantiveram despacho 403 e recusas de webhook/mídia.
- ESLint dos sete arquivos de aplicação/teste tocados: aprovado.
- Playwright visível: **1/1 em 12,2s**, ERP Vite na porta **5173** com `strictPort`, API 3000 respondendo e login autônomo por Vercel Development. A guarda bloqueou gravações de negócio. O teste simulou resposta 403 apenas na leitura inicial de pastas e confirmou a recuperação por clique com resposta remota 200; também exerceu filtro real por atendente e validação do formulário sem salvar.
- Nenhuma fixture, migration, alteração de permissão ou envio à Meta. A regressão de reconexão é determinística em RTL com o contrato de `CLOSED` conferido no SDK instalado; o teste de navegador não simula uma queda real do servidor Realtime.
- Logs locais: `scratch/central-support-realtime-lifecycle-before-2026-10-22.log`, `scratch/central-support-folder-feedback-before-2026-10-22.log`, `scratch/central-support-realtime-folders-focused-2026-10-22.log` e `scratch/central-support-realtime-folders-playwright-2026-10-22.log`.

Referências: [remoção de canal](https://supabase.com/docs/reference/javascript/removechannel), [assinaturas de banco](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes), [changelog consultado](https://supabase.com/changelog). O endpoint Markdown do changelog foi recusado pelo leitor por content-type; o índice HTML foi consultado. Não houve mudança de API/SDK nem de schema.
