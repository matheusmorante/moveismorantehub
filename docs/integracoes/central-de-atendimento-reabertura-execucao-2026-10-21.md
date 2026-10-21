# Reabertura — execução autorizada em 21/10/2026

## Resultado atual

As migrações e a operação limitada da [proposta revisada](central-de-atendimento-reabertura-fixtures-proposta-2026-10-21.md) foram executadas. O proprietário respondeu “Autorizar essa operação limitada” à solicitação `call_64cc2cc7f4ed402384b1beca52bbd7ee`. Publicação continua fora dessa autorização: este agente não criou nem promoveu deployment nesta operação. A conferência encontrou a produção já avançada por integração Git para `dpl_Hm6cgBdncczxjNk91AvFSqbNacYB`, commit `0385fa1343887892117996e3d57fd027956bcadb`, READY/production. O commit publicado contém o novo processador e o feedback de permissões; nove arquivos de runtime/build/schema foram comparados por blob Git com a origem e coincidiram. O antigo `dpl_7hG2EdsC9jBdS3tpexoJySN8NwaC` é checkpoint histórico.

Projeto operacional `hkoxhourxwlddgsfdgws`, schema public, runId `8eaed14f-364d-47ab-be41-66be54b3fb65`, owner autenticado `13eab361-be48-4e49-be4b-4ad79813b812`. Login feito pelo agente com Vercel Development, credenciais em memória; gate real de operador 204, administrador e acesso à Central confirmados. Nenhum cliente, pedido, pasta, mídia, efeito fiscal/financeiro/estoque ou chamada à Meta foi criado.

## Migrações e correção prévia

Histórico e catálogo remoto foram reconferidos; os corpos existentes da guarda e do manifesto coincidiam integralmente com a base revisada. Aplicadas:

| Versão real | Objeto | SHA-256 do SQL/local migration |
| --- | --- | --- |
| 20261021190324 | customer_support_inbound_reopening | FCFDC424A8BAFB1C438BEB4E5A1D044192D216CB83FC1A57DC9E8AC6C6F5C82A |
| 20261021190331 | customer_support_reopening_test_guards | 645A22087C21821ADA9E88C20B5FD49B3C8E954450B6FDA6E3AF20EFC2A63BF5 |

As cópias exatas estão em `supabase/migrations/20261021190324_customer_support_inbound_reopening.sql` e `supabase/migrations/20261021190331_customer_support_reopening_test_guards.sql`. O catálogo posterior confirmou RPC de produção SECURITY INVOKER, owner postgres, search path vazio, timeouts 10s/5s, sem execução por anon/authenticated e com execução por service role. A wrapper de fixtures é restrita a authenticated e exige identidade/ownership/gates reais; anon e service role não podem executá-la diretamente.

Antes de qualquer DDL, a revisão encontrou encerramento duplicado do corpo da guarda dentro do literal da expressão regular de cenário. A correção em `docs/integracoes/sql/customer-support-reopening-test-guards.sql` restaura o literal completo e remove somente o trecho duplicado. Uma regressão estática em `erp/src/pages/App/CustomerSupport/__tests__/customerSupportInbound.test.ts` falhou antes (15 passaram/1 falhou) e passou depois (16/16). Logs `scratch/central-support-reopening-sql-regression-before-2026-10-21.log` e `scratch/central-support-reopening-sql-regression-after-2026-10-21.log`. Essa inspeção estática não foi usada como substituto da prova PostgreSQL abaixo.

## Provas executadas

| Etapa | Resultado e evidência |
| --- | --- |
| Provisionamento separado, Vitest remoto | 1/1; negativas anon/parâmetro/RPC de produção e quatro âncoras próprias; `scratch/central-support-reopening-provision-2026-10-21.log` |
| Backend, Vitest remoto | 4/4; fechado e adiado reabrem; atribuição e tag preservadas; replay depois de fechar não reabre; nota não reabre; entrega atrasada não faz datas/resumo retrocederem; dois IDs concorrentes e mesmo ID concorrente sem perda/duplicata; rollback existente/primeiro contato e retry; primeiro contato concorrente cria uma só conversa; `scratch/central-support-reopening-backend-2026-10-21.log` |
| Inspeções depois de falhas de seletor, Vitest remoto | 1/1 em cada etapa; primeiro confirmou 26 registros e nenhuma mensagem da UI; segundo confirmou 27 e exatamente a reabertura manual já observada. Continuação somente após conferir o ponto persistido, sem reprovisionar; logs `scratch/central-support-reopening-ui-prewrite-inspection-2026-10-21.log` e `scratch/central-support-reopening-ui-after-open-inspection-2026-10-21.log` |
| UI, Playwright visível | 1/1 em 15,3s no ERP Vite 5173/strictPort, API 3000, CDP 9225. Login, ownership e gate reais; status pela UI, recebimento sintético pela wrapper compartilhada, retorno à fila e histórico único. Zero escrita proibida pela interceptação; `scratch/central-support-reopening-ui-resumed-2026-10-21.log` |
| Limpeza, Vitest remoto | 1/1; cinco arquivamentos normais acrescentaram cinco eventos; IDs do histórico anterior preservados; `scratch/central-support-reopening-cleanup-2026-10-21.log` |

Os dois erros iniciais do Playwright eram seletores do harness: o nome acessível de All incluía os ícones; depois de abrir o chat, o painel lateral recolhido não oferecia Todas. O harness passou a usar o menu de escopo visível e retomar o estado comprovado. Não houve alteração do produto para fazer os seletores passarem. Logs iniciais preservados em `scratch/central-support-reopening-ui-2026-10-21.log` e `scratch/central-support-reopening-ui-corrected-2026-10-21.log`.

## Retenção e limites

Manifesto encerrado: `scratch/central-support-reopening-manifest-2026-10-21.json`. Cinco conversas próprias, todas arquivadas; **38 mensagens/eventos finais de um teto de 68** (26 após backend, 33 após UI, mais cinco de limpeza). O manifesto recusa reutilização. A execução anterior de 51 conversas permanece encerrada e não foi reaberta/reutilizada. Nenhum histórico foi excluído.

## Limitações e próximo passo

A prova usa a mesma RPC transacional chamada pelo processador, dentro de uma wrapper protegida de fixtures. Não é um webhook legítimo entregue pela Meta, download real de mídia, prova com segunda identidade nem prova positiva de vínculo comercial. Não comprova atomicidade do webhook inteiro: confirmação comercial de entrega, progressão de recibos e erros parciais continuam com os limites já documentados.

Conferência final: **211/211 testes em 21 arquivos na origem**, incluindo seis negativas anônimas reais; o snapshot isolado também passou **211/211** com variáveis Vercel somente em memória e build Vite completo em **2m24s**. TypeScript do harness e lint dos seis arquivos focados passaram. Logs `scratch/central-support-reopening-final-consolidated-2026-10-21.log`, `scratch/central-support-reopening-harness-final-types-2026-10-21.log`, `scratch/central-support-reopening-final-lint-2026-10-21.log`; snapshot em `C:/Users/mathe/morantehub-central-reopening-release-20261021` (`unit.log`, `build.log`, `manifest.json`). A primeira seleção isolada omitia a atualização de mocks já presente na origem; foi completada. O teste anônimo passou a aceitar as variáveis públicas em memória antes do fallback local, eliminando a dependência de copiar `.env.local` para o snapshot. O log inicial foi preservado em `unit-before-complete-selection.log`.

O snapshot possui 109 caminhos selecionados, 27 sobreposições sobre a publicação anterior e duas mudanças de runtime (processador/feedback). Serve como prova isolada e **não deve ser publicado sobre a produção atual**, pois seu baseline antecede a publicação Git encontrada. Nenhuma autorização adicional de deploy foi solicitada ou consumida.

As sete verificações HTTP no alias público atual passaram: HTML compilado, duas recusas de mídia sem sessão, dois bloqueios de despacho e duas recusas de assinatura ausente/forjada. Provas `scratch/central-support-reopening-current-production-http-2026-10-21.log` e `scratch/central-support-reopening-current-production-http-proof-2026-10-21.json`. O ERP de desenvolvimento foi reiniciado na 5173/strictPort ao detectar que o processo anterior havia terminado; o navegador visível permaneceu disponível. O build não substitui o gate global TypeScript, historicamente com 423 diagnósticos e zero na Central; esse gate global não foi declarado aprovado.

Rollback, se futuramente necessário e autorizado, deve considerar a produção Git atual e suas outras mudanças, manter as RPCs aditivas instaladas e preservar o histórico. Nunca restaurar privilégios diretos legados nem excluir eventos.
