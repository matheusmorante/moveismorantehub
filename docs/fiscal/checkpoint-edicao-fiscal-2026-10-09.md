# Checkpoint: substituição fiscal após edição do pedido

> **Snapshot de implementação em andamento:** este checkpoint registra a interrupção observada durante a integração de 09/10 e não descreve necessariamente o estado final do checkout. Para o status atual de código e testes fiscais, consulte [status-testes-homologacao.md](status-testes-homologacao.md).

## Regra solicitada em 09/10/2026

- A venda ainda agendada e sem saída, trânsito, entrega ou retirada pode ser editada com substituição integral da nota original.
- Dentro do prazo aplicável no Paraná, usar cancelamento fiscal. Após o prazo, preparar NF-e 55 de estorno quando cabível, com revisão fiscal obrigatória, inclusive de período de apuração posterior.
- Depois de confirmar a reversão, emitir uma nova nota com os itens, destinatário, valores e pagamentos atualizados.
- Não utilizar CC-e, inclusive para mudanças pequenas que seriam permitidas legalmente. Esta é uma decisão operacional do ERP.
- Estornar integralmente a nota original. No exemplo sofá de R$ 2.000 + mesa de R$ 1.000, a reversão cobre R$ 3.000; a nova emissão cobre apenas o sofá de R$ 2.000 e os pagamentos corrigidos.
- Preservar a nota, XML, protocolo, snapshots e eventos originais. A venda permanece agendada; não cancelar o pedido para conseguir preparar o estorno.
- Com circulação, bloquear este caminho e seguir a política de devolução vinculada quando houver retorno físico.

## Efeitos e transação proposta

A confirmação da edição deve gravar a alteração comercial, os ajustes de estoque e os pagamentos normalizados, junto com a intenção de substituição fiscal, em uma única transação. O estorno fiscal não cria outra entrada física de estoque nem outro crédito comercial.

Cancelamento, autorização do estorno e nova autorização ocorrem pela interface após o commit. Falha externa mantém a intenção pendente e reconciliável; não desfaz a edição comercial confirmada. Nova emissão depende de prova de reversão integral, ambiente correspondente e idempotência. Entrega/retirada não devem avançar durante a pendência.

## Estado da implementação neste checkpoint

Implementação em andamento, **não pronta para uso**. Foram iniciados política central de edição, bloqueio de novas CC-e, registro transacional da substituição e integração com o estorno existente. A continuação da interface ainda precisa ser integrada ao formulário e validada.

O chat **Criar E2E fiscais com Playwright** está ativo no mesmo diretório e alterou o formulário/serviço de edição durante este trabalho. A integração dos arquivos compartilhados foi interrompida para coordenar as execuções. Não aplicar as migrations deste checkpoint nem publicar o conjunto parcial antes de resolver essa concorrência.

| Migration | Destino | Estado | Próxima etapa |
| --- | --- | --- | --- |
| `20261009050000_isolate_remote_test_data.sql` | Supabase `hkoxhourxwlddgsfdgws` | DISCARDED | Removida localmente por solicitação do usuário em 09/10/2026. Versão ausente no histórico remoto consultado antes da reversão; não foi aplicada neste trabalho. A iniciativa de colunas, registro de execução e segregação de dados de teste foi abandonada. |
| `20261009140000_order_update_version_guard.sql` | Supabase `hkoxhourxwlddgsfdgws` | BLOCKED | Preservada como parte da edição fiscal, sem dependência da iniciativa de isolamento. Aplicação remota não autorizada nesta reversão; validação e implantação continuam pendentes. |
| `20261009180000_fiscal_order_edit_replacements.sql` | Supabase `hkoxhourxwlddgsfdgws` | BLOCKED | Preservada como parte da edição fiscal, retirando somente colunas, checks e gravação de is_test/test_run_id. Finalizar validação da interface, permissões/linhagem/retries, transações e compatibilidade com o guard de versão. Versão e tabela ausentes na consulta remota anterior; aplicação não autorizada nesta reversão. |

Também foi identificada a migration local `20261009140000_order_update_version_guard.sql`, criada pela outra execução; sua validação e implantação precisam ser coordenadas com o autor.

## Evidência obtida

- Vitest focado: 31 testes aprovados em `orderEditFiscalPolicy.test.ts` (13), `orderEditFiscalAudit.test.ts` (6) e `fiscalCancellationPolicy.test.ts` (12).
- Diagnostics TypeScript do Serena: sem erros reportados em `api/nfe/audit-order-edit.ts` e `api/nfe/normalSaleRuleSet.ts` no instante consultado. Isso não substitui compilação do conjunto.
- `npm run advisors` executado com sucesso; retornou avisos preexistentes de search_path, RLS/policies e índices. Nenhuma correção remota foi aplicada.
- Nenhuma migration aplicada, fixture remota criada ou transmissão SEFAZ executada neste checkpoint.
- Testes de CC-e antigos precisam refletir a nova proibição de emissão e preservar cobertura da consulta/reconciliação de eventos anteriores.
- Integração real, rollback, repetição, concorrência e fluxo Playwright ainda pendentes. A iniciativa de isolamento por novas colunas no Supabase foi revertida localmente; as convenções e controles anteriores do E2E precisam ser avaliados separadamente antes de executar testes remotos.

## Fontes consultadas em 09/10/2026

- [SEFA/PR — NF-e, cancelamento e perda do prazo](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/23), perguntas 1670/1671. A consulta retornou a orientação de operação não realizada e 168 horas; a FAQ contém descrição antiga de natureza da operação.
- [SEFA/PR — NFC-e](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/22) e [orientação oficial sobre os 30 minutos](https://www.fazenda.pr.gov.br/Noticia/Programa-Nota-Parana-reforca-canais-de-fiscalizacao-sobre-documentos-fiscais-cancelados).
- [NPF 038/2022, art. 1º, texto consolidado oficial](https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/103202200038.pdf): finalidade 3, referência à chave original, justificativa, CFOP e operação inversos; natureza “Nota Fiscal de Estorno”. A norma prevalece sobre o texto antigo da FAQ para a natureza da operação.
- A revisão do RICMS/PR art. 298, VII e §2º permanece obrigatória na revisão do estorno; a consulta direta ao PDF tentada neste checkpoint não retornou o documento. Não alterar os controles já existentes de revisão por período sem essa conferência.
