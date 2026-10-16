# Formulários financeiros — revisão de 15/10/2026

Estado: quatro proprietários conferidos localmente; migration **aplicada com autorização explícita**, 15 checks remotos aprovados. Provas de negócio com fixtures permanecem pendentes. Os quatro proprietários (contas a pagar, contas a receber, movimentação manual e integração Rede) estão conferidos quanto ao resolver, payload, erros e ciclo de submissão. Isso não comprova os novos comandos com dados comerciais ou concorrência real. Não representa prontidão fiscal nem conclusão global.

## Causas verificadas

- Baixas executavam UPDATE da conta e INSERT da movimentação em chamadas distintas. Falha entre elas podia deixar uma conta paga sem lançamento. A revisão dos consumidores não encontrou RPC atômica existente. Os testes antigos de invariantes reproduziam uma função de exemplo; não eram prova do serviço utilizado pela tela.
- A recorrência fazia duas gravações e o banco operacional não tinha `recurring_expenses`. `createTransaction` enviava `result_nature`, ausente nas duas tabelas financeiras; o assistente também envia `purpose`, igualmente ausente. Foram consultados somente catálogos/metadados no projeto `hkoxhourxwlddgsfdgws`, sem valores comerciais ou credenciais.
- Parcelas dividiam números de ponto flutuante; `setMonth` podia levar 31/01 para março. A recorrência tentava compensar fuso com `getDate()+1`. Agora parcelas conservam o total em centavos e datas civis preservam o dia original, limitado ao último dia de cada mês.
- Cada intenção tinha resolver próprio, mas faltava uma trava entre salvar e baixar, prazo da gravação dentro de onValid e proteção contra respostas de outro proprietário. Carregamento de configuração podia falhar e deixar um formulário vazio salvável. Campos de leitura eram reenviados junto da configuração.
- O catálogo remoto revelou política `Admins can manage rede_config` pública com `USING(true)` e privilégios de leitura/escrita para `anon`. A proposta restringe somente essa tabela a administradores autenticados; não leu, exibiu nem alterou segredos.

## Solução local

RHF e resolver reais continuam proprietários de cada submissão; os serviços reutilizam contratos Zod explícitos. A baixa usa os valores persistidos, independentemente de edições não salvas. Um único lock cobre salvar/baixar antes da validação. Prazo de 30s dentro de onValid libera também o estado RHF; resultado incerto impede repetição nesta sessão e orienta consulta. Queries têm prazo de 15s e descartam respostas obsoletas. Erros ficam visíveis, com mensagens genéricas para não expor detalhes de credenciais. A configuração envia apenas seis campos editáveis e preserva o segredo sem trim.

## Migration aplicada e autorização recebida

Arquivo: `supabase/migrations/20261015194122_complete_financial_form_commands.sql`, criado pelo CLI instalado com `supabase migration new`. Aplicação específica somente no projeto operacional, branch principal e schema `public`.

Objetos/efeitos:

- Colunas opcionais `result_nature` em categorias/transações e `purpose` em transações, com CHECK explícito. Nenhum backfill ou UPDATE de linhas históricas.
- Tabela `recurring_expenses`, índices/FKs/RLS e vínculo opcional `accounts_payable.recurring_expense_id`. A nova tabela inicia vazia. Leitura autenticada, criação em nome do operador, alteração administrativa.
- Função pura `financial_result_nature`, RPC `settle_financial_account` (baixa/lançamento na mesma transação, lock por conta, snapshot esperado, replay consistente) e RPC `create_recurring_payable_expense` (recorrência e 12 ocorrências atômicas, identidade de requisição e comparação do payload no replay). SECURITY INVOKER, caminho fixo, lock de 5s e transação ociosa de até 60s; sem I/O de rede no banco. A frequência anual conserva o contrato anterior de 12 ocorrências anuais.
- Restrição da política e dos privilégios de `rede_config` ao administrador autenticado. Não abrange outras políticas financeiras.
- Roteiro `supabase/tests/financial_form_commands_catalog.sql`: **15 consultas de catálogo/funções puras**, sem fixtures ou gravações comerciais. Esses checks não provam concorrência, rollback, RLS por usuário ou replay real de comandos.

Riscos/retenção/reversão: DDL obtém locks breves e pode abortar após 5s; clientes sem perfil administrativo perderão acesso à configuração Rede, conforme a política declarada. Na falha de implantação, preserve as adições e desabilite a ação afetada até corrigir; não volte ao fluxo de duas gravações. Após utilização, preservar recorrências, vínculos, colunas e lançamentos, sem DROP/TRUNCATE/reset. Qualquer reversão estrutural ou reabertura de acesso exigirá outra revisão e autorização. A autorização recebida cobriu somente esta migration e os 15 checks, sem fixtures, emissão SEFAZ, Auth ou deploy.

## Evidências e pendências

Verificação local final: **54 testes em oito arquivos aprovados** (`scratch/rhf-finance-final-tests.log`), incluindo serviço real composto com o hook e consumidor do assistente. Falhas de resposta truncada, gateway e cardinalidade bloqueiam um segundo INSERT; desmontagem durante resolver não inicia gravação nem emite aviso antigo. Feedback de lançamento fica dentro do modal. Build ERP final aprovado em `scratch/rhf-finance-final-build.log` (1m19s, avisos existentes de tamanho de bundle). Lint das fontes sem erros/avisos (`scratch/rhf-finance-lint-verified.log`); diff-check dos arquivos do lote passou. A revisão final não encontrou novos problemas. TypeScript ERP: 271 diagnósticos fora dos arquivos deste lote, zero nos arquivos financeiros alterados, conforme `scratch/rhf-finance-final-tsc.log`. O primeiro comando de lint usou o invólucro que não localizou a configuração; a verificação válida usa o executável Node com configuração explícita (`scratch/rhf-finance-lint-verified.log`). Não confundir saída de arquivos ignorados com validação.

Os testes usam RHF/Zod/serviço reais, com transporte Supabase simulado. Catálogo operacional foi consultado somente para leitura. A migration e os 15 checks foram executados com sucesso no projeto operacional. Concorrência, rollback, replay e RLS real por operador dos novos comandos **ainda não foram exercitados com fixtures**. A política `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md` exige autorização concreta para novo DDL e, separadamente, para fixtures sintéticas com isolamento comprovado. O script antigo `npm run advisors` aponta para `--local`; não foi usado. Advisors consultados por MCP no projeto remoto, sem substituir a prova dos comandos.

## Artefatos aplicados

- `supabase/migrations/20261015194122_complete_financial_form_commands.sql` — SHA-256 `ff4c0f2f424027ddfdd6b0cb5b603d9459615ddcb83826d60a869d9f1eca0331`.
- `supabase/tests/financial_form_commands_catalog.sql` — SHA-256 `0988a89a6030f426dfce1a4fb69038c9fec4acfe6cd70a82029ba651b8948d4f`.

## Execução remota autorizada

O usuário aprovou o artefato original `20261015185418_complete_financial_form_commands.sql` e os 15 checks. Supabase MCP registrou a versão `20261015194122`, nome `complete_financial_form_commands`. O arquivo local foi renomeado para corresponder ao histórico remoto, sem alterar SQL/hash, evitando reaplicação por divergência de versão. Nenhum reparo manual do histórico foi feito.

| Teste | Executado | Projeto/ref | Massa/runId | Resultado | Limitação |
|---|---|---|---|---|---|
| Migration aprovada | Sim | hkoxhourxwlddgsfdgws, principal/public | Nenhuma | success=true, registro remoto confirmado | Não é instalação em banco vazio |
| Catálogo e funções puras | Sim, 15 | Mesmo projeto | Nenhuma | 15/15 aprovados | Não exercita comandos comerciais |
| Baixa/recorrência, rollback, replay e concorrência | Não | — | Não autorizada | Pendente | Necessita massa sintética com ownership/isolamento conforme política |

[Evidência remota](../audits/fiscal-2026-10-15/evidence/financial-form-commands-catalog-remote.json). Advisors de segurança não apontaram os objetos deste lote; isso não equivale a ausência global de achados. Performance registrou o FK de categoria antigo de accounts_payable sem índice ([referência](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)), políticas permissivas sobrepostas já existentes em accounts_receivable ([referência](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)) e os três novos índices ainda sem uso ([referência](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)), esperado antes de uso comercial. Nenhuma alteração adicional de DDL/RLS foi feita fora da autorização.
