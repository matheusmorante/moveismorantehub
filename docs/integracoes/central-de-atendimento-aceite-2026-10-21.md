# Inbox — conferência de aceite em 21/10/2026

## Estado e alcance

O plano original é concluir a Inbox, com envio bloqueado, sem dashboard, campanhas ou automações. A versão publicada é `dpl_7hG2EdsC9jBdS3tpexoJySN8NwaC`; a restrição final do contrato legado foi aplicada como `20261021162004`. O lote posterior ATD-009-R1 tem decisão explícita de reabrir Fechados e Adiados, mas sua função/massa/publicação continuam pendentes.

Esta conferência distingue implementação, prova de execução e limitações. **Não comprova conclusão global.** A publicação original e a execução anterior de fixtures permanecem os checkpoints de ponta a ponta. Alterações locais posteriores não são atribuídas ao deploy existente.

## Requisitos do plano original

| Requisito | Evidência atual | Limite ou pendência |
| --- | --- | --- |
| Busca de filas e atendentes | `InboxSidebar.tsx` filtra pastas e atendentes; cobertura RTL da Inbox | Sem nova navegação nesta conferência |
| Blocos de 50 e contagem correta | `useCustomerSupportConversations.ts` usa 50, descarta respostas antigas, deduplica e reconcilia página vazia; a RPC conta sobre o conjunto filtrado antes de LIMIT/OFFSET | Prova remota/UI anterior 50+1; não é prova de snapshot imutável durante alterações de outros atendentes |
| Filtros antes da paginação, inclusive pedidos | Corpo atual de `customer_support_list_conversations`: status, responsável, não lidas, vínculo, pedidos e texto dentro da CTE filtrada; guard comercial antes da consulta de pedidos | O lote antigo não criou clientes/pedidos próprios; não declarar prova positiva de “com pedidos” com massa comercial |
| Atendentes reais com acesso | RPC atual retorna somente `id`, `full_name`, `role`, filtra pela permissão e nega anon; frontend usa esse diretório | Catálogo e prova UI de seleção; sem conta negativa adicional nesta etapa |
| Pastas persistidas e compartilhadas | Serviço lê a tabela sem filtro por criador; política SELECT exige acesso à Central e não ownership; prova anterior criou/reabriu/editou/excluiu uma pasta | Visibilidade com duas identidades reais ainda não exercitada |
| “Por mim/Outras” corresponde ao autor | `InboxSectionCustom.tsx` compara `createdBy` a `currentUserId`; teste RTL cobre ambas as abas | Não confundir autoria da pasta com critério relativo de responsável |
| Criar, editar e excluir pastas | Formulário RHF/resolver real e serviços persistentes; RLS permite INSERT/UPDATE/DELETE do autor autorizado, preserva ownership no WITH CHECK | Edição/exclusão por autor, como implementação atual; esta conferência não muda essa política |
| Evitar nomes duplicados | Índice único remoto `lower(btrim(name))`; nome com 2–50 caracteres no banco; serviço apresenta conflito 23505 | Conferência de catálogo e contrato; sem nova gravação para repetir o conflito |
| Critérios combinados e busca salva | Formulário usa schema de domínio; serviço salva critérios; SQL resolve “mine” por `auth.uid()` de quem consulta, combina filtros e aplica o escopo da pasta antes da paginação | Prova do conjunto comercial permanece delimitada acima |
| Mensagens anteriores ao topo | Cursor de 80 mensagens e desempate estável, sem perder histórico após refresh/erro; prova UI anterior 80+1 | Sem nova execução gravável nesta conferência |
| Snippet copia texto com feedback | `QuickSnippetsModal.tsx` usa clipboard e feedback; prova UI anterior confirmou cópia sem nota | Não envia mensagem |
| Timeline somente persistida e sem duplicatas | `ActivityTimelineDrawer.tsx` usa IDs de notas/eventos persistidos; atribuição/status por RPC transacional; prova UI própria anterior | Reabertura automática nova ainda não foi validada no PostgreSQL |
| Comentários, tags e pastas com RHF + zodResolver | `ChatComposer.tsx`, `CustomerNotesTab.tsx`, modal de pasta e exclusão executam o resolver antes dos serviços; erros aparecem na interface; RTL cobre recusas | Regra conferida para os formulários da Central; não é certificação de todos os formulários do ERP/app/catálogo |
| Remover anon e exigir acesso à Central | Seis negativas anônimas reais na seleção atual; catálogo pós-contração sem SELECT/INSERT/UPDATE/DELETE nas quatro tabelas, inclusive por coluna; RPCs verificam permissão | Não equivale a prova comportamental com uma identidade autenticada sem acesso |
| Exigir permissão comercial adicional | Sete funções de contexto comercial/filtro relidas no catálogo; resumos, contagem, pedidos, busca e vínculo exigem as duas permissões | Falta conta autenticada sem permissão comercial. Feedback local agora diferencia essas recusas conhecidas; ainda não publicado |
| Webhook recusa assinatura inválida/ausente | HMAC sobre bytes originais no processador compartilhado; Vitest e verificações HTTP pós-contração aprovados; ausência de segredo em produção gera 503 nas provas locais | Presença do segredo na produção não comprova que seu valor corresponde ao aplicativo Meta |
| Preservar recebimento e mídia | API publicada carrega o processador canônico empacotado; proxy autentica usuário, permissão e vínculo da mídia antes da Meta; suíte cobre recusas e contrato | Download real de mídia própria e webhook legítimo do aplicativo não foram exercitados neste lote |
| Nenhum despacho da Central | Guard frontend sempre nega; rotas standalone/consolidada retornam 403; sete verificações HTTP da versão publicada passaram | Não extrapolar para outros módulos do ERP que enviam WhatsApp |
| Substituir contador de 1.000 por política | Modal de política sem contador; documentação explica divergência com a fonte Meta e decisão empresarial de manter o bloqueio | Nenhuma configuração de franquia libera envio |
| Ocultar atalhos sem função | Navegação da Central mantém Inbox, filtro de contatos, política e controles existentes; sem atalhos de dashboard/campanha/automação | Isso não remove o dashboard global do ERP |
| Vitest/RTL e Playwright reais | Seleção atual: 210/210, incluindo seis negativas remotas; provas anteriores: quatro Vitest próprios, Playwright gravável e limpeza próprios aprovados | Não somar todas as provas como se fossem uma execução do mesmo candidato ou novas provas PostgreSQL |
| Banco operacional e ownership | Todos os metadados/migrations no projeto existente `hkoxhourxwlddgsfdgws`, public; execução anterior encerrada e preservada | Nenhum Supabase/PG/Docker local, novo schema, CLI Supabase ou fixture operacional usado |

## Catálogo e origem conferidos nesta rodada

O catálogo completo desta revisão está em `scratch/central-support-permission-audit-catalog-2026-10-21.json`, sem linhas de pessoas/conversas ou segredos. Contém as quatro políticas de pastas, índices/constraints e dez funções com MD5, assinatura de retorno e grants. O diretório de atendentes expõe três campos; as dez funções consultadas não permitem execução anônima.

Antes do ajuste local de feedback, sete arquivos de leitores/formulários/navegação foram comparados byte a byte com o candidato isolado publicado e coincidiram: `scratch/central-support-reader-published-fingerprints-2026-10-21.json`. Depois da correção, o serviço de conversas na origem difere da revisão publicada somente pelo tratamento das duas recusas de permissão conhecidas; a produção não recebeu esse ajuste.

## Ajuste de feedback derivado da revisão

O banco já retornava `CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED` e `CUSTOMER_SUPPORT_PERMISSION_DENIED` com SQLSTATE 42501. `fetchConversations` transformava ambos em falha genérica de carregamento. Duas regressões unitárias falharam antes do ajuste; depois o serviço apresenta uma explicação de permissão, sem repetir consultas ou carregar dados comerciais. Falhas sem contrato conhecido continuam com a mensagem genérica, sem exibir o detalhe interno do servidor. Nenhuma permissão/RLS mudou.

Arquivos: `erp/src/pages/utils/customerSupport/customerSupportService.ts` e `erp/src/pages/App/CustomerSupport/__tests__/customerSupportInbox.test.tsx`. Provas: `scratch/central-support-permission-feedback-before-2026-10-21.log` e `scratch/central-support-permission-feedback-consolidated-2026-10-21.log`. Resultado: **210/210 em 21 arquivos**, seis negativos remotos reais, lint focado exit 0. TypeScript global nesta rodada: **423 diagnósticos, zero na Central**; o total global permanece reprovado e não foi tratado como responsabilidade desta alteração. Log `scratch/central-support-permission-feedback-types-2026-10-21.log`.

## Próximo gate concreto

A [proposta limitada de reabertura](central-de-atendimento-reabertura-fixtures-proposta-2026-10-21.md) aguarda resposta do proprietário: aplicar os dois SQLs revisados e executar até cinco conversas/68 registros totais, com reserva de limpeza incluída. O envelope continua `approved=false`. A decisão de produto autoriza implementar a regra; não autoriza inferir nova massa ou publicação. A pesquisa/questionário comparativo mais amplo também permanece parcial.
