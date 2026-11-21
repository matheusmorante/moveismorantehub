# Correções fiscais — 21/11/2026

## Finalização de venda após timeout do autosave

**Problema e sintomas.** Finalizar ou salvar uma venda podia exigir vários cliques. Entre 10h25 e 10h43 BRT, a API retornou 13 erros HTTP 500 em `create_order_with_inventory_transaction`, todos com `57014`, e três na listagem paginada. O ERP também registrava timeout ao aguardar o rascunho e erros 405/CORS nas chamadas de push.

**Causa comprovada.** O PostgreSQL cancelou as transações ao exceder `statement_timeout`. Os contextos incluíam a persistência de itens, o painel incremental e a guarda de artefatos de teste. A listagem serializava o pedido inteiro para testar poucos campos, e o decodificador de metadata abria blocos de exceção para tentar converter observações comuns em JSON. No ERP, uma rejeição confirmada do autosave interrompia a submissão validada. O fluxo de push buscava tokens e tentava enviar pelo navegador mesmo com o gatilho `send_app_notification_push_trigger` ativo no banco.

**Correção.** A finalização aguarda até 30 segundos quando há autosave em andamento e prossegue com o formulário validado quando o PostgreSQL confirma que desfez a gravação. A primeira gravação manual e o autosave compartilham a identidade do pedido. A transação comercial da venda tem uma única nova tentativa após `57014` com indicação de `statement timeout`. Em atualizações, a repetição usa a versão previamente lida, inclusive no registro de ações pós-venda que ainda não têm essa versão. Resultado incerto mantém o formulário aberto. O ERP registra a notificação uma vez e o Supabase encaminha o push após o commit. [Documentação do pg_net](https://supabase.com/docs/guides/database/extensions/pg_net#http_post).

**Banco e paridade.** A migration `20261121135527` foi aplicada ao projeto operacional `hkoxhourxwlddgsfdgws`, schema `public`. O decodificador mantém a precedência dos marcadores e só tenta interpretar como JSON as observações que podem conter um objeto. A listagem e o painel usam a projeção necessária para verificar os mesmos artefatos. A RPC de listagem atende ERP e app, com as mesmas permissões e limite de 15. O aplicativo tem a listagem e a conclusão de entrega, enquanto a criação e a finalização do formulário de venda ficam no ERP.

**Arquivos alterados.**

- `erp/src/pages/App/SalesOrder/hooks/useOrderAutoSave.ts:9,16–17,59,99–239,314`, `useSalesOrderForm.ts:155,196` e `useOrderFormSubmission.ts:9,32,55,131–157,210,242–315,353`. Classificação do resultado do autosave, identidade da criação, conclusão e feedback.
- `erp/src/pages/utils/orderMutation/orderCreationService.ts:15,87–90`, `orderUpdateService.ts:17,149–184,348–365` e `orderStatementTimeout.ts:1–20`. Repetição limitada ao cancelamento confirmado e proteção de versão.
- `erp/src/pages/App/SalesOrder/OrderActions/PostOrderActionsModal.tsx:134` e `erp/src/pages/utils/pushNotificationService.ts:1–42`. Carregamento da versão quando necessário e registro único de notificação.
- `erp/src/pages/App/SalesOrder/hooks/useOrderAutoSave.test.tsx:155`, `useSalesOrderForm.test.tsx:7–524`, `erp/src/pages/App/SalesOrder/__tests__/salesOrderHandlingPersistence.test.ts:34,120–121`, `erp/src/pages/utils/orderMutation/__tests__/orderCreationAtomicity.test.ts:94,122–194` e `erp/src/pages/utils/pushNotificationService.test.ts:16–70`. Cobertura de conclusão após rollback, resposta incerta, conflito de versão, persistência pós-venda, reuso do rascunho e push.
- `supabase/migrations/20261121135527_lighten_sale_order_test_artifact_checks.sql:1–102`, `docs/fiscal/README.md:8`, `docs/fiscal/historico-correcoes-2026-11-21.md:3–22` e `docs/auditorias/roadmap-otimizacao-consumo-supabase.md:1–11`.

**Verificação.** Passaram 120 testes Vitest no ERP e nove da listagem no aplicativo. O build do ERP terminou com sucesso. A alteração final do modal pós-venda foi compilada separadamente, e o auxiliar de repetição passou na checagem de tipos com modo estrito. A checagem global de TypeScript atingiu o limite de memória do Node. No Supabase, as nove combinações de filtros produziram a mesma resposta antes e depois da migration, os indicadores de 1.289 pedidos coincidiram e os sete casos de marcadores retornaram o resultado esperado. A amostra somente leitura de duas chamadas padrão de listagem passou de 705 para 527 ms e de 12.469 para 9.036 acessos a buffers já em cache. O tráfego operacional de 10h55 a 11h04 registrou sete transações de pedido, 72 consultas de listagem e 11 de agendamento, todas HTTP 200. O catálogo confirmou a versão, as permissões e a comparação de versão da RPC de atualização. A prova de gravação de venda de ponta a ponta ficou pendente por falta de fixture autorizada. As alterações do frontend permanecem no checkout local.

## Vínculo histórico do item normalizado da NF por código do fornecedor

**Problema e sintomas:** itens de uma NF da Móveis Sul podiam permanecer sem produto associado em notas novas, mesmo quando a linha correspondente de uma nota anterior já tinha sido vinculada. O item ficava em “Vinculações Pendentes” e exigia novo vínculo manual.

**Causa raiz técnica comprovada:** a função public.find_inbound_invoice_product_links usava inbound_invoice_items somente quando o array inbound_invoices.itens estava vazio. Quando o JSON da nota continha linhas, mas uma linha não carregava product_id/variation_id, os vínculos já persistidos na linha normalizada eram ignorados. O histórico fiscal de 20/11 registrou esse formato: na NF 270892 havia vínculos normalizados que não apareciam no JSON itens.

**Solução técnica:** o resolvedor agora consulta as linhas normalizadas por NF, número do item e código completo do fornecedor quando a linha correspondente do JSON não informa vínculo conflitante ou composição. O código divergente, uma escolha explícita diferente, composição, código ambíguo, produto inválido/inativo ou variação não canônica continuam sem associação automática. ERP e aplicativo já chamam a mesma RPC na importação e na conferência, então ambos passam a reconhecer o vínculo com a alteração da função compartilhada.

**Aplicação operacional:** a migration 20261121132901_reuse_linked_normalized_inbound_invoice_items foi aplicada ao schema public do projeto operacional hkoxhourxwlddgsfdgws, registrada remotamente na versão 20261121133635. Não houve alteração de linhas de notas, produtos ou memória de códigos; a migration altera somente a função do resolvedor.

**Arquivos e linhas modificados:**

- supabase/migrations/20261121132901_reuse_linked_normalized_inbound_invoice_items.sql:1-192
- docs/fiscal/README.md:3,8
- docs/fiscal/historico-correcoes-2026-11-21.md:1-27
- docs/auditorias/roadmap-otimizacao-consumo-supabase.md:1-11
- docs/estoque/guia-pratico/gerar_guia.py:418
- docs/estoque/guia-pratico/README.md:3-5
- shared-utils/stockGuide.json:4
- erp/public/guias/guia-pratico-estoque.pdf: página 8
- output/pdf/guia-pratico-do-estoque.pdf: página 8

**Validação:** antes da aplicação, o hash da função ativa era dd016ffcc36d1b0a2c7027847268d2e9, exatamente a versão-base esperada; a tabela tinha índice por invoice_id e índice único por nota/item. Após a migration, o hash remoto d632bf0dbb36782fae55c660187deafc confirmou que a função aplicada corresponde ao arquivo local. A função remota segue SECURITY INVOKER e search_path vazio, não permite execução por anon e permite authenticated e service_role. A versão remota 20261121133635 consta no histórico. Não executei testes ou build, não invoquei a RPC com notas reais e não criei fixtures. Assim, a definição e as permissões remotas foram verificadas, mas não houve prova funcional de ponta a ponta com uma nova NF.

**Consumo e limite:** o cliente mantém a mesma chamada RPC e o mesmo formato de resposta; não são adicionados campos nem bytes de resposta. A função faz leitura adicional no banco usando os índices já existentes de invoice_id e (invoice_id, item_number); CPU e latência antes/depois não foram medidas. A aplicação do código do ERP/app em ambiente publicado não ocorreu neste trabalho.

## Rótulo acessível do cadastro rápido por item da NF

**Problema e sintomas:** uma nota pode ter vários botões com o nome acessível idêntico “Cadastro rápido”. A automação semântica não consegue distinguir com segurança qual item deve ser cadastrado.

**Causa raiz técnica comprovada:** o botão do cabeçalho da linha da NF expunha um nome acessível genérico, sem o número nem o código do item. Na NF apresentada, os itens 4 e 5 têm o mesmo rótulo.

**Solução técnica:** o nome acessível inclui o número do item e o código completo do fornecedor, preservando o texto visual existente.

**Arquivos e linhas modificados:**

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:202`
- `docs/fiscal/README.md:10`
- `docs/fiscal/historico-correcoes-2026-11-21.md:49–63`

**Validação e limite:** revisão estática do componente e dos rótulos. Não executei testes ou build. A alteração local não está publicada; por isso, ela ainda não muda os nomes expostos pela página de produção nem conclui os cadastros da NF.
