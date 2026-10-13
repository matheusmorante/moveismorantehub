# Revisão dos fluxos fiscais de saída — 13/10/2026

## Resultado e escopo

As correções locais de emissão, consulta, cancelamento e retomada da devolução passaram nas validações focadas. A migration de persistência atômica foi aplicada, com autorização específica, no Supabase operacional e passou nas 12 verificações pgTAP de catálogo/ACL. A prontidão fiscal ponta a ponta continua parcial: não houve gravação de negócio, navegador/E2E, transmissão SEFAZ ou deployment. Rollback e concorrência das operações ainda precisam de prova real. Produção está disponível por padrão, com confirmação explícita por operação, permissões, validações e idempotência.

**Política operacional:** não utilizar CC-e, inclusive para correções pequenas. Usar cancelamento ou estorno direto conforme elegibilidade e política central; após circulação, devolução vinculada. Preservar CC-e antiga somente para histórico/reconciliação, sem novas transmissões.

O checkout contém alterações de outras tarefas. Este registro descreve somente os comportamentos inspecionados e os resultados observados nesta revisão; não certifica todas as alterações locais nem substitui as evidências históricas do [status central](status-testes-homologacao.md).

## Correções e evidências

| Fluxo | Lacuna encontrada | Correção e limite da evidência |
|---|---|---|
| Modal de emissão | O botão opcional de prévia referenciava `handlePreviewXml` sem obtê-lo do hook. | Handler conectado. Testes preservam emissão explícita sem obrigar prévia e restrição administrativa da prévia. |
| Identificação do destinatário | A validação de formato aceitava vazio e, sozinha, não bloqueava um campo obrigatório. | Campo vazio bloqueado quando a regra exige identificação: NF-e 55, NFC-e com entrega e cenário de valor obrigatório. Retirada dispensada continua permitida quando elegível. |
| Dados fiscais dos itens | A mensagem usava um termo interno que fazia o sanitizador esconder a indicação do item incompleto. | Mensagem informa os itens e a ação de reabrir a emissão. Testes preservam os dados fiscais registrados no pedido, sem recalculá-los pelo cadastro atual. |
| Consulta de venda normal autorizada | O caminho `NORMAL_SALE_V1` retornava o estado local sem consultar novamente a SEFAZ. | Consulta efetiva por modelo/ambiente, valida XML e identidade da resposta (chave, ambiente, status e protocolo). Divergência, resposta inválida ou timeout mantêm pendência de reconciliação; a consulta não escreve no banco nem retransmite. Tentativas ainda incertas mantêm o reconciliador existente. |
| Situação atual da nota | O protocolo de autorização original podia prevalecer sobre o status atual da consulta. | `retConsSitNFe/cStat` prevalece sobre o protocolo incorporado; cancelamento, indisponibilidade e ausência não viram autorização. Parsing cobre namespaces. |
| Retorno e retomada do cancelamento | Um retorno de evento registrado não era conferido contra toda a identidade esperada; a consulta de uma tentativa anterior também não conferia a identidade. | API exige um único retorno, mesma chave/ambiente, tipo `110111`, sequência `1` e protocolo válido para `135/155`. Na retomada, valida o XML da consulta, chave, ambiente e protocolo original antes de cancelar ou permitir retry. Divergência mantém a pendência, sem alterar o documento nem retransmitir. |
| Schema do cancelamento | Assinatura e validação da nota não validavam o leiaute do evento. | Gate do envelope assinado e do detalhe `110111`, com os seis XSDs oficiais necessários. O gate ocorre antes da reserva e do envio. Origem, versão e hashes em [schemas](../../api/nfe/schemas/README.md). |
| Persistência do cancelamento | Evento e status da nota eram gravados em chamadas separadas. | API usa reserva e confirmação transacionais, sem fallback para gravações parciais. Falha de commit ou perda de resposta permanece pendente; timeout não sobrescreve confirmação concorrente. Migration aplicada e catálogo/ACL aprovados em 12 testes pgTAP; comportamento transacional ainda não exercitado no PostgreSQL. |
| Consulta legada | Caminho ainda acessível pela tela fiscal podia reconciliar documento e evento separadamente. | Valida identidade e exige uma RPC única; não restaura nota cancelada nem fabrica evento ao descobrir cancelamento sem tentativa local. Resposta ausente, indisponibilidade ou duplicidade mantém reconciliação pendente. |
| Devolução fiscal automática | A retomada de fonte pendente podia usar o rascunho antes de conferir seus vínculos. | Carrega e valida pedido de devolução, documento original, ambiente e estado do rascunho antes de reconciliar. Um estado pendente não inicia nova transmissão de rascunho incompatível. |

Foram preservadas as políticas de circulação: `fulfilled` significa circulação para entrega e retirada; mercadoria que circulou exige devolução vinculada, com preservação da nota original. Os limites já centralizados do Paraná receberam regressões no instante exato de 168 horas (55) e 30 minutos (65), incluindo o primeiro milissegundo posterior.

## Estados e efeitos

| Transição | Efeitos obrigatórios | Tratamento após o commit |
|---|---|---|
| Cancelamento comercial permitido, sem circulação | Pedido e efeitos comerciais/estoque seguem a operação transacional existente. Sem documento autorizado, não há evento fiscal. | Havendo documento autorizado, política central escolhe cancelamento ou estorno aplicável. Falha fiscal fica reconciliável e não apaga o fato comercial. |
| Devolução concluída (`fulfilled`, exibida como “Devolvido”) | Entrada de estoque e conclusão pertencem à transação comercial existente. Agendamento isolado não cria uma segunda entrada. | Documento original autorizado no mesmo ambiente e cenário validado permitem a tentativa fiscal automática. Falha fiscal preserva devolução e estoque confirmados. |
| Consulta de documento autorizado no fluxo normal | Nenhum novo efeito comercial, financeiro, de estoque, reserva ou histórico. | Consulta sem alteração do banco; resposta divergente exige reconciliação. |
| Cancelamento confirmado na SEFAZ | Evento/protocolo próprios vinculados à nota; XML original preservado. | A nova API exige a RPC que confirma evento e status na mesma transação. A migration está aplicada; a prova de rollback/concorrência no banco real permanece pendente. |

Não foi alterado o momento dos efeitos comerciais. Repetição, concorrência, timeout e falhas de persistência foram exercitados nos testes locais dos serviços; isso não prova rollback ou concorrência em PostgreSQL real.

## Validação executada

- Bateria principal: **24 arquivos, 305 testes aprovados, zero falhas**; inclui modal, validação, APIs, política comercial/fiscal, retomada, timeout, idempotência e concorrência simulada.
- XML: **40 testes aprovados** (`hmlNormalSaleRuleSet`, 29; `fiscalOperationXml`, 11), com assinatura e XSD local real do pacote fixado `PL_010f_v1.04`, cobrindo cenários de NF-e 55, NFC-e 65 de retirada/entrega, estorno e devolução. SEFAZ simulada.
- Após os ajustes finais de imports/tipos: 34 testes aprovados em consulta autorizada, worker e política de edição fiscal (13 desta última, adicionais à bateria principal).
- Regressões finais de evento: 13 casos adicionais à bateria principal, sete no parser e seis na API. Execução do parser/API antes da última proteção de retomada: 31 testes aprovados. Após a proteção, **32 testes aprovados em quatro arquivos** (API de cancelamento, consulta autorizada, reconciliação e roteamento da consulta). As contagens de execuções sobrepostas não devem ser somadas como testes distintos.
- TypeScript fiscal do ERP e da API e lint dos arquivos alterados aprovados. Ajustados imports ESM necessários à compilação `NodeNext`, sem mudar configuração de runtime.
- `npm run build:fiscal --prefix erp` aprovado: 15 rotas carregam no Node, assets XSD/WASM resolvidos e contagem local de **11/12 funções**. Build local não comprova deployment remoto.
- Continuação da revisão: **63 testes aprovados em cinco arquivos** (`cancelEndpoint`: 18; `nfeEventRules`: 27; `cancellationReconciliation`: 1; `legacyConsultation`: 10; `hmlConsultBoundary`: 7). Uma regressão revelou retorno vazio classificado como rejeição; corrigido e retestado. Falhas de RPC retornadas e lançadas, inclusive perda de resposta após confirmação SEFAZ simulada, permanecem pendentes sem gravação parcial alternativa.
- Conferência final: consulta com `101` sem protocolo de evento também permanece pendente. Acrescentadas três regressões; reteste dos três arquivos afetados passou com **58 casos** (18 API, 29 regras e 11 consulta legada), sobrepostos à execução anterior.
- Continuação de contratos e concorrência: **40 testes em quatro arquivos passaram** (19 API, 13 consulta legada, 1 reconciliação e 7 roteamento), incluindo resposta RPC vazia/divergente e captura do início da consulta antes do SOAP. A API exige identidade e status esperados na confirmação da RPC. O SQL preparado impede que consulta iniciada antes de 30 segundos da reserva encerre uma tentativa em transmissão/incerta; o timeout de transporte é 25 segundos. Essa proteção foi revisada, mas ainda não executada em duas sessões reais.
- **13 testes de XSD do cancelamento aprovados**, com assinatura local e modelos 55/65 nos ambientes 1/2. Os **40 testes de XML de documentos** foram reexecutados e passaram após extrair o validador comum. Esses 53 casos são distintos dos 63 acima; contagens anteriores incluem sobreposição e não devem ser somadas.
- TypeScript fiscal ERP/API, ESLint focado, Biome dos 11 arquivos da continuação e build fiscal passaram novamente. O Advisors executou com código de saída 0, mas retornou alertas no schema atual, incluindo `search_path` mutável em funções existentes, políticas permissivas múltiplas e índice duplicado. Isso não é um parecer de ausência de riscos; nenhum alerta foi corrigido nesta tarefa.
- Busca textual em Markdown, incluindo diretórios ocultos de regras/skills: nenhuma referência ao antigo controle global de habilitação de Produção. Evidências históricas JSON não foram reescritas; nenhuma variável Vercel foi alterada.

Relatórios locais de execução foram gerados em `scratch/`; eles não contêm comunicação real com SEFAZ nem prova de integração remota. Nenhuma suíte completa do monorepo foi executada.

## Pendências concretas

1. **Persistência e reconciliação real:** a migration foi aplicada e os 12 testes pgTAP de catálogo/ACL passaram. Rollback e concorrência no Supabase operacional ainda dependem da etapa específica descrita abaixo. Mocks da API não comprovam a execução do SQL.
2. **Eventos:** gate XSD do cancelamento implementado e testado localmente; ainda falta evidência do fluxo completo com a persistência nova. CC-e não é utilizada e não integra a fila de implementação ou homologação de nova emissão.
3. **Interface e HML:** validar apenas os fluxos afetados pela interface e reconciliar a evidência NFC-e que respondeu `217` em 12/10 antes de qualquer retry. Este trabalho não consultou novamente nem transmitiu esse documento.
4. **Operações adicionais:** inutilização de numeração e contingências próprias dos modelos 55/65 não estão completas. Sua implementação exige escopo e fonte oficial aplicável, sem defaults tributários inventados.
5. **Compatibilidade normativa:** CNPJ alfanumérico recebeu correções locais de emissão/chave/consulta/cancelamento/referências; a migration específica continua pendente, conforme a [revisão de compatibilidade](cnpj-alfanumerico-2026-10-13.md). DANFE relacionado à RTC/Tipo 2 e aplicação das demais NTs/tabelas recentes permanecem pendentes. A leitura dirigida abaixo delimita pontos aplicáveis, sem constituir revisão integral de cada NT nem aprovação tributária geral.

## Fontes oficiais e limite da consulta

Consulta realizada em 12–13/10/2026, restrita aos pontos abaixo. MOC, XSD e legislação estadual precisam ser confrontados com NTs posteriores aplicáveis; este registro não declara conformidade integral.

| Fonte | Regra/seção e aplicação nesta revisão |
|---|---|
| [MOC 7, Anexo I, revisão 7.03 — CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf) | E01-10/E01-20 e grupo E: identificação em NF-e e NFC-e com entrega; regressões do campo obrigatório. O XML foi validado contra o pacote local posterior fixado, sem substituir as regras de negócio. |
| [SEFA/PR — FAQ NF-e](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/23) e [FAQ NFC-e](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/22) | Limites estaduais de cancelamento: 168 horas para 55 e 30 minutos para 65; nenhuma mudança de prazo nesta revisão. |
| [SEFA/PR — eventos NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e) | Cancelamento como evento próprio assinado, vinculado ao documento. Correspondência de chave/ambiente e preservação da autorização são também invariantes de integridade do projeto. |
| [NPF 038/2022 — SEFA/PR](https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/103202200038.pdf) | Art. 1º: finalidade, referência, justificativa e operação inversa do estorno. Conferência do fluxo existente; sem nova aprovação ou transmissão de estorno. |
| [Documentos NF-e — SVRS](https://dfe-portal.svrs.rs.gov.br/NFe/Documentos) | Consulta ao índice de publicações. Não equivale à leitura integral, aplicabilidade ou implementação das NTs listadas. |

O [índice de manuais](manuais/README.md) e o [status central](status-testes-homologacao.md) devem ser usados para continuar a revisão sem repetir transmissões ou interpretar evidência local como autorização fiscal.

### Leitura dirigida das NTs em 13/10

| Fonte / trecho consultado | Aplicabilidade e trabalho restante |
|---|---|
| [NT 2026.004 v1.01](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=BTZQzgsO9Ws%3D), cronograma e campos da chave/eventos | CNPJ alfanumérico já integra o cronograma de Produção de julho/2026. O XSD aceita letras; o gerador e os consumidores de saída foram ajustados e testados localmente. O banco ainda depende da migration específica e não há prova SEFAZ. Ver [compatibilidade alfanumérica](cnpj-alfanumerico-2026-10-13.md). |
| [NT 2025.002 v1.52](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=HXPO8VLbh4o%3D), páginas 6–7 | O texto separa CRT 1/2/4, com tributação IBS/CBS/IS a partir de 2027 e orientação futura. Não generalizar exigências de CRT 3 para o escopo CRT 1. A referência por item em devoluções (`DFeReferenciado`, VC02-14) exige revisão própria do serializer e seus vínculos antes da implantação aplicável. |
| [NT 2026.008 v1.00](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=qAoMot6VyiY%3D), I11c-10/I11c-20 | A obrigatoriedade de `vProdLiq` está indicada como implementação futura; validações condicionais aplicam-se quando preenchido. Não inventar valores nem classificar sua ausência como bloqueio universal atual. |
| [NT 2026.007 v1.10](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=fpJlwzhffcQ%3D), regra 12C21-20 | CRT deve corresponder ao cadastro centralizado; formato válido de CNPJ não prova regularidade cadastral. Revisar os cenários do emitente/destinatário sem substituir seu regime real por um default. |
| [NT 2026.010 v1.00](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=ugn4MYF5PLg%3D), cronograma e leiaute do DANFE | Cronograma de Produção: 01/12/2026. Comparar o renderizador com os campos tributários efetivamente presentes no XML; não criar totais fictícios. Não houve alteração ou prova visual do DANFE nesta tarefa. |
| [NT 2026.002 v1.11](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=m8aACnFLK%2FY%3D), páginas 3–4 | RV I08-180, BA02-35 e VC02-40 adiadas para 14/12/2026 em Produção. DANFE Simplificado Tipo 2, contingência e autorização com alerta (`cStat=120`) exigem comparação própria com todos os consumidores. Os caminhos revisados aqui continuam restritos à confirmação `100`; não comprovam suporte à autorização com alerta. |

O [aviso oficial de 05/10/2026](https://www.nfe.fazenda.gov.br/portal/informe.aspx?AspxAutoDetectCookieSupport=1&ehCTG=false&page=0&pagesize=30) adiou NT 2025.002 v1.52, 2026.007 v1.10 e 2026.008 v1.00 para **26/10 em HML e 16/11 em Produção**, atualizando as datas anteriores nos PDFs. Não estender esse aviso às datas próprias das NTs 2026.002 e 2026.010. A leitura não altera tributação, regimes ou configurações do ERP.

## Próxima operação remota revisável

A etapa de integração comercial exige autorização específica para criar, pelos formulários/serviços normais, uma execução UUID de teste do operador e seus próprios cliente, produto/variação e pedidos. Antes da criação, confirmar projeto/branch/schema, permissões, metadata canônica e exclusões/supressão de notificações. Valores comerciais e fiscais vêm dos formulários validados; não usar presets estáticos nem substituir o emitente.

O lote inicial deve ficar restrito a dois pedidos sintéticos: um para cancelamento sem circulação e sem documento autorizado; outro para conclusão e devolução vinculada. Verificar o estado persistido e os movimentos após sucesso, repetição da mesma operação e duas requisições concorrentes; parâmetros inválidos devem falhar sem alteração parcial. Não enviar SOAP, criar documentos autorizados fictícios, alterar configuração global ou consumir registros operacionais. A evidência habilita a classificação de integração real das políticas hoje cobertas por `orderCancellationEffects.test.ts`, `fiscalCancellationService.test.ts` e `returnFiscalRules.test.ts`; não valida emissão ou eventos SEFAZ.

Antes de executar, registrar os IDs próprios em memória e conferir os guards. Depois, limpar apenas artefatos removíveis pelo fluxo normal e reter movimentos/históricos confirmados. O fluxo de cancelamento de documento autorizado permanece uma etapa separada de HML pela interface, com autorização explícita de transmissão e reconciliação da tentativa existente antes de qualquer retry. A consulta nova de documento autorizado pode ser validada separadamente, somente leitura, sem provisionar massa.

## Migration e sequência de implantação

**APPLIED — [20261013115005_atomic_nfe_cancellation_confirmation.sql](../../supabase/migrations/20261013115005_atomic_nfe_cancellation_confirmation.sql).** Destino confirmado: projeto operacional `MoranteHub`, ref `hkoxhourxwlddgsfdgws`, branch primária existente, schema `public`. Aplicada isoladamente com autorização específica, sem `db push` ou aplicação de migrations de outras tarefas. A versão local originalmente revisada era `20261013065235`; o arquivo foi renomeado para a versão efetivamente registrada pelo gerenciador remoto. [Evidência de aplicação e pgTAP](../audits/fiscal-2026-10-13/evidence/atomic-cancellation-migration.json).

A leitura remota de histórico/catálogo confirmou `20260929200157` (eventos), `20260929202020` (reserva histórica de CC-e), a unicidade `(document_id,event_type,attempt_number)` e a ausência de RPC equivalente de confirmação atômica do cancelamento. Foram examinados grants, índices e triggers relevantes; não houve leitura de registros comerciais nesta inspeção. A migration acrescenta três funções, sem atualizar histórico ou dados na aplicação:

- `reserve_nfe_cancellation_event`: trava a nota, confere a tentativa anterior e reserva uma única tentativa ativa; falha antes do SOAP se a função estiver ausente ou houver disputa.
- `persist_nfe_cancellation_result`: trava nota e evento nessa ordem, valida prova/identidade de confirmação e grava evento + status juntos. Uma falha essencial deve reverter ambos. Repetição confirmada é idempotente; resposta tardia incerta não rebaixa confirmação existente. Permite reparar gravação parcial legada somente com o mesmo protocolo e prova conferida.
- `persist_nfe_legacy_consultation`: autorização legada e encerramento de tentativa pendente são confirmados juntos; divergência de estado/evento ou cancelamento já registrado impede restauração indevida.

As funções são `SECURITY INVOKER`, com `search_path` vazio e execução concedida somente a `service_role` entre os papéis da aplicação; o endpoint continua autorizando o operador. As verificações de dados XML no SQL complementam as verificações da API. Não há chamada externa dentro da transação.

A conferência complementar confirmou tipos/nullability e RLS nas duas tabelas. `nfe_document_events` não possui políticas de cliente. `nfe_documents` contém política permissiva, porém `has_table_privilege` confirmou **false** para INSERT/UPDATE/DELETE de `anon` e `authenticated`; a política isolada não comprova escrita liberada. Um `SELECT` com XML sintético literal, sem acessar linhas comerciais ou persistir o XML, confirmou extração XPath com namespace e conversão de fuso no PostgreSQL remoto. Essa verificação de expressão não valida as funções completas.

Foi executado [atomic_nfe_cancellation_contract.sql](../../supabase/tests/atomic_nfe_cancellation_contract.sql): **12 verificações pgTAP aprovadas** de existência, `SECURITY INVOKER`, `search_path` e ACL das três assinaturas. A extensão `pgtap` já existia em `extensions`; o roteiro não criou extensão, fixtures ou fatos fiscais. O roteiro de catálogo não substitui testes de sucesso, rollback e concorrência.

**Aplicação conferida:** a primeira tentativa falhou por sintaxe em duas comparações com `CASE`; histórico e catálogo confirmaram zero efeitos. Após adicionar os parênteses, a aplicação foi concluída e a versão exata e as três funções foram conferidas. O Advisors não apontou achados nas novas funções; alertas preexistentes continuam registrados, incluindo RLS sem políticas na tabela de eventos restrita ao servidor. Deploy da API e testes comportamentais remotos continuam pendentes e exigem seu próprio escopo autorizado.

Evitar sobreposição de requisições de cancelamento da versão antiga durante a troca da API: seus escritores diretos não participam integralmente das travas das novas RPCs. Reconciliar tentativas em andamento e trocar o escritor antes de retomar novas operações. A expansão isolada não impõe atomicidade a chamadas antigas.

**Prova ainda necessária:** com artefatos próprios já persistidos e identificados por `runId`/owner, exercitar sucesso, falha em etapa essencial, repetição e duas sessões concorrentes; verificar que XML/protocolo original e fatos comerciais permanecem intactos. Não fabricar documentos autorizados nem respostas SEFAZ para gravá-los no remoto. Testes locais com mocks não substituem essa prova. Transmissão HML, se necessária, exige autorização separada e acontece exclusivamente pela interface.

**Reversão:** a expansão não altera contratos das RPCs antigas nem reescreve linhas. Não remover as funções enquanto houver leitores/escritores novos ou tentativas pendentes. Um retorno à API antiga reintroduz o risco de gravação parcial e não desfaz fatos SEFAZ; corrigir por nova migration e reconciliar pela mesma tentativa. Esta migration aplicada é imutável; qualquer correção exige nova versão. Deployment continua pendente.
