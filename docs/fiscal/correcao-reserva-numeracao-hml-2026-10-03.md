# Correção da reserva de numeração HML — 03/10/2026

> **Registro de execução histórico:** causa, deploy/aplicação remota e validações referem-se à etapa de 03/10/2026. O projeto remoto não foi reconsultado nesta auditoria documental. Para o status de testes e evidências mais recentes, consulte [status-testes-homologacao.md](status-testes-homologacao.md); não use este relato para inferir o estado atual do banco ou deploy.

## Causas confirmadas

- `api/nfe/reserve-number.ts` recusava GET antes do trecho de consulta, retornando 405. GET passa a consultar a sequência com autenticação fiscal e sem chamar RPC de reserva.
- O ERP não incluía `reserve-number` no bundle/dispatcher fiscal nem no rewrite da Vercel. A rota agora usa `operations`, preservando a arquitetura existente de funções.
- No projeto remoto `hkoxhourxwlddgsfdgws`, o overload `prepare_numbered_nfe_fiscal_snapshot` com CPF/CNPJ chamava o allocator de nove argumentos, ausente no banco. Uma chamada controlada confirmou `undefined_function` (42883), sem reservar número.
- A migration `20261003164340_restore_numbered_nfe_snapshot_allocator.sql` restaura somente o allocator necessário e seus grants. Foi revisada e aplicada no projeto configurado. Não aplica outras mudanças da migration histórica de recuperação de duplicidade.

## Efeitos e transação

A consulta GET não cria fatos fiscais. A reserva manual grava número e snapshot na mesma transação, com locks por solicitação/pedido e na sequência, mantém o maior número usado e rejeita conflitos. O overload com destinatário congela CPF/CNPJ e recalcula o hash nessa transação. Uma falha reverte a reserva inteira. Não há escrita em cadastro do cliente, estoque, financeiro, pagamentos ou reservas comerciais. A transmissão SEFAZ continua após o commit, com os estados de tentativa/reconciliação existentes. Cancelamento/devolução não são alterados por este reparo.

O resumo do modal deixa de exibir o cartão informativo CPF/CNPJ e usa três colunas em telas maiores; o preenchimento e a validação do destinatário continuam no modal.

## Validações

| Teste | Executado | Projeto/massa | Resultado | Limitação |
|---|---|---|---|---|
| Vitest: endpoint, pipeline HML e hook do modal | Sim | Mocks/fixtures dos três arquivos | 42 testes aprovados | Não comprova SEFAZ real |
| Build fiscal e startup nativo | Sim | Local, sem transmissão | Nove handlers carregados/executados, incluindo `reserve-number`; WASM/XSD resolvidos | Não equivale a deployment Vercel |
| TypeScript backend (`api/tsconfig.nfe.json`) | Sim | Local | Aprovado | — |
| ESLint do resumo e teste do endpoint; sintaxe dos scripts | Sim | Local | Aprovado | API fora do escopo do ESLint do ERP; validada por TypeScript/build |
| Reserva manual/automática, destinatário/hash, retry, conflitos, rollback e grants | Sim | Remoto configurado; duas fixtures `TEST_AUT_<uuid>` geradas pela execução, série HML 888 previamente ausente | Aprovado; `supabase/tests/nfeNumberedSnapshotRemote.sql` | Reserva apenas; sem SOAP; não exercita concorrência entre conexões |
| Limpeza da integração | Sim | Mesmo projeto/série | Transação revertida; nenhuma fixture/snapshot/número de teste confirmado; ausência de sequência/snapshots da série conferida depois | Nenhum documento fiscal transmitido |
| TypeScript ERP (`erp/tsconfig.fiscal.json`) | Sim | Local | Falhou em arquivos fora desta correção | Erros em `ReceiptPrintDocument`, `fiscalOperationReview`, `fiscalOperationXml`, `orderCrmSyncService`, `orderItemStockReconciliation`, `orderUpdateService` e `orderSyncQueries`; nenhum no resumo alterado |

As fixtures usam `draft`, `deleted=true`, `HML_TECHNICAL_V1`, itens/pagamentos vazios e `testRunId` correspondente. A exclusão dos indicadores foi conferida por `is_nfe_hml_test_order` e pelos triggers de métricas/entregas. O teste verifica ausência de itens, pagamentos e processamento de estoque; a transação inteira termina com ROLLBACK. Não houve alteração confirmada de registro operacional.

Em 03/10/2026, `npm run advisors` falhou ao tentar conectar ao serviço local; nenhum Docker/Supabase Local foi iniciado. Esse relato descreve o comando e ambiente daquela data, não o checkout atual: hoje `package.json` usa `npx supabase db advisors --linked`, direcionado ao projeto Supabase remoto vinculado. Os Advisors remotos de segurança e desempenho foram consultados antes do reparo naquela execução. Há achados existentes fora do escopo; o allocator usa `search_path=''`, `SECURITY INVOKER` e execução somente para `service_role`.

## Autopreenchimento do NCM — ajuste posterior na mesma data

O modal agora prioriza o NCM do cadastro atual do produto/variação sobre o snapshot do pedido. Quando o cadastro não fornece NCM, mantém o código do pedido; uma edição manual feita no modal continua tendo prioridade ao reabrir e transmitir o comando. O ajuste não altera cadastros nem cria efeitos comerciais/fiscais antes da emissão.

Foram aprovados 19 testes focados do hook/modal e de `NcmSelect`, incluindo cadastro com snapshot vazio ou divergente, variação sem NCM próprio, fallback e preservação de edição manual. ESLint e `git diff --check` passaram. A checagem TypeScript fiscal do ERP retornou os mesmos erros externos já listados acima, sem erro no hook alterado.

Foi consultado em 03/10/2026 o [MOC 7.0, Anexo I, campo I05 e regra I05-10](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf), para conferir o campo NCM. A alteração apenas copia o código já cadastrado; não determina classificação tributária, modifica formato/validação ou representa revisão integral das NTs vigentes.

## Fonte oficial consultada para o reparo da numeração

[SEFA/PR — endpoints NF-e 4.00 de homologação e produção](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400), consultada em 03/10/2026. O índice de manuais do Portal Nacional falhou na abertura. Este reparo trata transporte HTTP interno e persistência atômica; não muda leiaute, tributação, endpoints SEFAZ ou regras de autorização. Não constitui revisão integral de MOC/NTs.
