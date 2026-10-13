# CNPJ alfanumérico — revisão de 13/10/2026

## Resultado e fontes

**PARCIAL.** Compatibilidade local ampliada no fluxo de saída. A implantação depende da migration específica abaixo, ainda não aplicada. Não houve transmissão SEFAZ, geração de artefatos comerciais remotos ou deployment nesta continuação. CC-e continua fora da operação do produto.

Fontes oficiais consultadas em 13/10/2026:

- [NT Conjunta 2025.001](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ%3D), campos de CNPJ/chave e anexos I/II: CNPJ com 12 caracteres `A-Z/0-9` e dois DVs numéricos; chave com letras exclusivamente nas primeiras 12 posições do CNPJ. No módulo 11, cada caractere vale seu código ASCII menos 48. Os números existentes preservam o mesmo cálculo. A exclusão de determinadas letras aparece como proposta a confirmar; não foi implementada como proibição.
- [NT 2026.004 v1.01](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=BTZQzgsO9Ws%3D): adequação de NF-e/NFC-e, chaves e eventos. Validações locais usam os XSDs já fixados em [schemas](../../api/nfe/schemas/README.md), que aceitam esse formato.

## Implementação e compatibilidade

- `shared-utils/fiscalIdentifiers.ts` centraliza formato, normalização sem apagar caracteres desconhecidos, DV do CNPJ e DV da chave. O gerador preserva letras, valida o CNPJ e não preenche CNPJ incompleto com zeros. A entrada de chave de NF-e confere também os DVs do CNPJ; o formatador mantém leitura de documentos históricos.
- Emissão normal/técnica, serializer, CSRT, pré-validação, consulta, cancelamento e referências de estorno/devolução deixam de remover ou rejeitar letras permitidas. Comparações continuam exigindo identidade completa, modelo e ambiente; não se altera prazo ou elegibilidade fiscal.
- Configuração geral do CNPJ passa a usar o formatador de CNPJ já existente. A inferência PF/PJ no modal preserva letras. O contrato antigo de validação de **formato** do destinatário não foi convertido silenciosamente em validação de DV para todos os cadastros.
- DANFE/NFC-e preserva as letras no texto da chave; a entrada do gerador Code 128 passa a aceitar o novo formato. Os testes conferem HTML/SVG gerados, sem comprovar impressão, leitura por scanner ou conformidade visual integral do DANFE.
- Dados existentes, XMLs assinados, hashes persistidos, protocolos, chaves, numeração e históricos não foram reescritos. Nenhuma nova transição comercial foi criada. Reservas, snapshots e documentos continuam pertencendo às transações existentes; a SEFAZ continua após o commit, com reconciliação de resultados incertos.

O escopo não certifica distribuição/manifestações de entrada, inutilização, contingências nem todas as NTs da RTC. Não tratar esta revisão como prontidão fiscal integral.

## Evidência local

Execuções focadas, com sobreposição entre rodadas; não somar as contagens como testes distintos:

| Execução | Resultado |
|---|---|
| Identificadores, geração numérica, consulta autorizada e XSD do cancelamento | 57 testes em quatro arquivos aprovados. Inclui consulta com chave alfanumérica e evento assinado com o novo CNPJ. |
| Venda normal com XML assinado/XSD | 31 testes aprovados, incluindo emitente e destinatário alfanuméricos em NF-e/NFC-e. |
| Estorno/devolução | 13 testes aprovados, incluindo preservação da chave original alfanumérica no cabeçalho do estorno e na referência por item da devolução. |
| API de cancelamento, identificadores, geração e envelope | 59 testes em quatro arquivos aprovados na rodada final, incluindo os dois formatos de emitente no cancelamento simulado. |
| Orquestração, fronteiras e políticas afetadas | 164 testes em nove arquivos aprovados; SOAP e persistência simulados. |
| Entrada da chave, módulos legados, serializer e responsável técnico | Respectivamente 7, 6, 9 e 3 testes aprovados. O teste legado que rejeitava qualquer letra foi atualizado: uma letra pode preservar ambos os DVs pelo cálculo oficial. |
| DANFE alfanumérico | Dois testes Node de HTML/SVG aprovados. A suíte antiga em jsdom não iniciou por ausência de `canvas.node` no ambiente local. |
| Estáticos/build | TypeScript da API e build fiscal aprovados: 15 rotas carregadas, XSD/WASM resolvidos, 12/12 funções Vercel locais. ESLint dos arquivos alterados sem erros; Biome da API com seis avisos e uma informação preexistentes. |

O TypeScript fiscal do ERP encontrou `TS2345` em `ReceiptPage/ShippingData.tsx:50`, numa alteração concorrente fora desta tarefa (`string | undefined` entregue a função que exige `string`). Não foi declarado aprovado nem corrigido por esta revisão. A regra de nome do destinatário em HML já implementada foi preservada, corrigindo apenas uma expectativa desatualizada de teste.

## Migration e implantação

**BLOCKED — [20261013123000_alphanumeric_fiscal_identifiers.sql](../../supabase/migrations/20261013123000_alphanumeric_fiscal_identifiers.sql).** Destino: projeto operacional `MoranteHub`, ref `hkoxhourxwlddgsfdgws`, branch primária, schema `public`. Preparada após ler histórico, definições, constraints, índice e ACLs reais. Falta autorização específica de aplicação e validação do SQL no PostgreSQL; a autorização anterior de cancelamento não abrange esta expansão.

A migration:

1. Confere a assinatura/hash de oito funções, cinco constraints e um índice antes de alterar; divergência aborta a transação e exige nova revisão.
2. Amplia as cinco constraints de CNPJ/chave e substitui o índice único de sequência por estabelecimento, preservando as letras no fallback do snapshot. Não reinicia sequência nem altera linhas comerciais.
3. Atualiza oito funções existentes: destinatário temporário do snapshot, conflito de numeração HML, preparação de operação revisada, reserva legada, persistência de operação revisada, prévia de número, preparação normal e reserva HML. Corpos completos foram copiados do catálogo e modificados somente nos padrões/normalização necessários.
4. Preserva ownership, ACLs, `SECURITY DEFINER/INVOKER`, `search_path`, travas, idempotência e contratos. A permissão preexistente de `authenticated` na reserva HML não é ampliada nem removida por esta mudança.

O SQL roda em uma transação com `lock_timeout=5s` e `statement_timeout=60s`. A reconstrução do índice pode exigir locks; falha ou timeout deve reverter a expansão. Não aplicar em lote com migrations de outras tarefas. A expansão precisa preceder a API nova. Mesmo após aplicação, clientes antigos que removem letras não devem emitir para CNPJ alfanumérico; atualizar os escritores antes de habilitar esse uso.

`npm run advisors -- --output json` executou com saída 0 e 367 alertas/avisos existentes (18 de search_path, 2 de extensão em public, 72 de execução de security definer, 1 de proteção de senha, 27 de initplan, 246 de políticas múltiplas e 1 de índice duplicado). Não é parecer de banco sem riscos. As funções legadas com `search_path=public` continuam com esse contrato; nenhuma correção geral de segurança foi incorporada.

Foi preparado [alphanumeric_fiscal_identifiers_contract.sql](../../supabase/tests/alphanumeric_fiscal_identifiers_contract.sql): **24 verificações pgTAP ainda não executadas**, de definições, ACLs, constraints, índice e função pura de conflito. Não cria fixtures ou documentos e não comprova reserva, rollback ou concorrência. Após autorização: reconferir projeto/histórico/Advisors, aplicar somente esta migration, conferir versão exata e executar esse roteiro. Qualquer teste com gravação comercial ou transmissão continua exigindo escopo próprio.

Não reverter para restrições numéricas depois de existirem fatos alfanuméricos. Preferir correção por nova migration; não apagar ou reescrever documentos para viabilizar rollback. A migration de cancelamento [20261013115005](../../supabase/migrations/20261013115005_atomic_nfe_cancellation_confirmation.sql) permanece **APPLIED** e foi preservada.
