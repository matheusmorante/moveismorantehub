# Chat financeiro móvel — proprietário, fila e voz — 18/10/2026

## Problemas e causas comprovadas

O componente `FinancialAiChatView` excluía cartões `NEEDS_INPUT` da lista. A composição da fila podia avançar para um item incompleto que desaparecia da tela. Seu callback de seleção de candidato chamava `handleSelectCandidate` sem o ID do cartão; esse handler alterava apenas `pendingIntent`, independente do cartão exibido. A seleção marcava o rascunho como pronto sem validar a conta nem os campos restantes.

O contrato final também aceitava `MATCH_EXISTING`/`QUERY_OR_UPDATE` sem `matchedAccount`; o serviço existente usa essa conta quando presente e tem um caminho separado de criação. Confirmar o primeiro caso sem conta poderia alcançar esse caminho indevidamente. A correção é no proprietário antes do serviço, preservando a validação do backend.

Quatro provas iniciais falharam (`scratch/rhf-mobile-financial-batch-baseline-18.log`): composição oculta e seleção sem proprietário de cartão. Onze provas anteriores continuaram passando.

## Correção e escopo

Os cartões incompletos permanecem visíveis. Cada callback de seleção identifica seu cartão. O proprietário executa o resolver real de `financialCandidateSelectionFormSchema` antes de aplicar a conta: ID, valor monetário positivo com até duas casas, descrição/contraparte e datas opcionais explícitos. A conta precisa ser idêntica a uma opção oferecida ao item atual; payload adulterado, cartão salvo/descartado, contexto alterado e concorrência não modificam o rascunho.

Uma escolha atualiza somente o primeiro item do cartão selecionado e conserva o restante da fila. O estado pronto/incompleto deriva da validação de confirmação; escolher uma conta não dispensa forma de pagamento/finalidade ou outros campos. A seleção não grava uma movimentação. A confirmação posterior executa novamente seu resolver, exige conta para as intenções de vínculo e somente avança após recibo do serviço. Chaves distintas conservam dois lançamentos iguais como intenções diferentes. Recusa do segundo item não regrava o primeiro; resposta incerta não avança nem permite repetir a escrita localmente; falha só no refresh conserva o progresso confirmado.

**Acionadores:** `GlobalAgentScreen` usa `FinancialAiChatView`. O caminho ativo de análise publica um cartão por ferramenta `criarMovimentacaoFinanceira`. A infraestrutura de `batchDraftsList`/`publishTimelineCard` é retida no hook, sem consumidor ativo localizado que abra um lote agregado com candidatos. Os testes exercitam essa biblioteca com o proprietário real e a composição View → TimelineCard. A correção não cria um novo acionador ou reativa registro legado. O mock de `TransactionPreviewCard` na prova da View verifica entrega de identidade/estado; não certifica renderização nativa ou captura de áudio.

## Arquivos e validação

| Arquivo | Linhas / responsabilidade |
|---|---|
| `shared-utils/financialFormSchemas.ts` | 12: comando explícito de seleção da conta, reutilizando a regra monetária do domínio |
| `mobile/src/features/finance/hooks/useFinancialAiChat.ts` | 74, 80, 132, 198, 224, 253, 285, 348, 373, 412, 438, 455: contratos/intenções, recursos e retornos aguardados |
| `mobile/src/features/finance/components/FinancialAiChatView.tsx` | 69, 74, 82: cartão incompleto visível, trava visual comum e identidade da seleção |
| `erp/tests/mobile-forms/financialChatOwner.test.tsx` | 19, 41, 72, 87, 97, 125: seleção, confirmação vinculada, recibos/fila e entradas inválidas |
| `erp/tests/mobile-forms/financialTimelineView.test.tsx` | 17, 25: composição real View → TimelineCard e identidade/trava na seleção |

**65 testes em seis arquivos de formulários móveis aprovados**, incluindo 29 provas de chat/fila/composição (as rodadas intermediárias são subconjuntos). **352 testes unitários móveis em 66 arquivos e seis testes do domínio de características no ERP também passaram.** Lint do conjunto de 26 arquivos do lote/amparo de build: zero erros e cinco avisos; no chat/schema/testes são dois avisos anteriores de cleanup. **Exportação web do aplicativo móvel aprovada** (`expo export --platform web`), sem publicação. TypeScript móvel caiu de 61 para **30 diagnósticos globais**, nenhum nos arquivos alterados; não há aprovação global de tipos.

O build revelou dependências não resolvidas dos schemas compartilhados e imports de componentes extraídos. As correções são mecânicas e possuem [registro separado com os arquivos e limites](../fiscal/historico-correcoes-2026-10-18.md#mobile--resolução-de-dependências-dos-formulários-extraídos): caminho de dependências no Metro, 29 imports em 18 arquivos e normalizador puro movido para `shared-utils`, com export do ERP preservado. Não há alteração de política fiscal ou regras comerciais nessas correções.

Logs finais: `scratch/rhf-mobile-financial-batch-repaired-tests-18.log`, `scratch/rhf-mobile-financial-batch-all-mobile-tests-18.log`, `scratch/rhf-mobile-shared-attribute-tests-18.log`, `scratch/rhf-mobile-financial-batch-all-lint-18.json`, `scratch/rhf-mobile-financial-batch-verified-tsc-18.log` e `scratch/rhf-mobile-financial-batch-web-build-shared-18.log`.

No checkpoint da fila acima, o agregado do chat permanecia pendente de captura, preanálise, voz/live e ferramentas de sessão. A continuação abaixo substitui essa pendência por provas próprias. O principal ERP permanece 132/132; isso não encerra mobile/catálogo nem o censo adicional. Nenhuma chamada paga de IA, microfone real, movimentação financeira remota, alteração de banco, deploy ou operação fiscal foi feita neste lote. CC-e continua proibida.

## Continuação de voz/live — proprietário conferido

**Causas reproduzidas:** quatro falhas no proprietário: callback antigo após limpar o chat, pausa duplicada, início sem prazo e gravação concorrente (`scratch/rhf-mobile-voice-owner-baseline-18.log`). Quatro falhas no serviço Live: abertura após encerrar durante permissão/cota, ferramenta/transcrição antiga e limpeza dependente de `stop` sem resposta (`scratch/rhf-mobile-live-service-baseline-18.log`). Duas falhas no serviço de gravação: permissão/preparação nativa tardias abriam um gravador cancelado (`scratch/rhf-mobile-recorder-service-baseline-18.log`). Duas provas posteriores confirmaram repetição de execução/publicação e reutilização de ID com payload diferente (`scratch/rhf-mobile-live-replay-baseline-18.log`).

**Solução no proprietário:** comandos de início/controle/encerramento e gravação executam resolvers reais com ação, estado e identidade da sessão. Início Live tem prazo de 20s, captura e controles de 15s; encerramentos têm limites próprios. Pausa/mute/início compartilham trava com as submissões financeiras; encerrar possui seu próprio resolver e pode interromper início ou pausa pendentes. Contexto/identidade da sessão são conferidos depois de cada espera. Transcrição recebida passa por resolver antes de entrar no histórico. Quota é validada como resposta de domínio; quota inválida encerra a sessão. Limpeza/desmontagem/troca de operador invalidam callbacks antigos e liberam recursos. Campos de erro/progresso ficam visíveis na View, botões concorrentes são desabilitados e encerrar permanece acessível.

**Recursos nativos/web:** o serviço Live confere a geração após permissão, cota, configuração e microfone; invalida sockets e ferramentas antigas e não inicia a segunda ferramenta depois de encerrar. A limpeza de socket/contexto/microfone/cota é independente e limitada; `end` repetido compartilha a mesma promessa. Resposta tardia da cota de início solicita sua pausa. O gravador invalida operações antigas, libera tracks web tardias e recursos nativos preparados depois do cancelamento, inclusive em falha de preparação. O construtor correto é obtido do `AudioModule` exportado pelo pacote instalado; o antigo `AudioRecorder` exportado apenas como tipo não é instanciado. A forma dos presets foi conferida no código local da dependência.

**Ferramentas e confirmação:** o resultado de `criarMovimentacaoFinanceira` do Live chega ao proprietário por `onToolExecuted`, valida o rascunho no resolver e publica um cartão ancorado numa mensagem. Não grava a movimentação nessa preparação; o botão de confirmação executa seu resolver e exige recibo. Duas ferramentas diferentes conservam dois cartões. Na sessão Live, repetição do mesmo ID/payload reutiliza execução e publicação, aguardando a mesma confirmação local antes de responder; ID reutilizado com outros dados é recusado. Ferramentas já despachadas podem terminar no servidor; não são reenviadas por esta correção.

**Outras intenções do mesmo proprietário:** limpar conversa e copiar mensagem usam contrato explícito e resolver real. Limpeza invalida o contexto imediatamente, aplica somente os IDs do snapshot validado e preserva texto digitado depois do clique. Cópia exige mensagem/texto atuais e tem prazo de 5s, sem anúncio de sucesso se clipboard indisponível ou pendente. Confirmação individual retida aguarda o refresh por até 15s; falha só na atualização da lista não repete gravação confirmada.

### Arquivos e linhas desta continuação

| Arquivo | Linhas / responsabilidade |
|---|---|
| `shared-utils/financialVoiceFormSchemas.ts` | 4, 13, 18, 19, 22: comandos Live/captura, transcrição, quota e limpar/copiar |
| `shared-utils/financialFormSchemas.ts` | 31: rascunho preparado com tipo, descrição e valor explícitos |
| `mobile/src/features/finance/hooks/useFinancialAiChat.ts` | 74, 80, 132, 198, 224, 253, 285, 348, 373, 412, 438, 455: contratos/intenções, recursos e retornos aguardados |
| `mobile/src/services/geminiLiveService.ts` | 19, 59, 62, 80, 290, 338, 352, 388: quota, geração, ferramentas, replay e limpeza |
| `mobile/src/services/voiceRecorderService.ts` | 21, 26, 158, 162, 170, 182, 187, 212: captura, API nativa, preparação e descarte |
| `mobile/src/features/finance/components/FinancialAiChatView.tsx` | 74, 100, 101, 102, 107, 119: trava, erro/progresso e controles |
| `mobile/src/features/finance/components/chat/FinancialChatInputBar.tsx` | 38, 48, 49: impedir nova chamada durante submissão |
| `mobile/src/features/finance/components/chat/GeminiLiveOrb.tsx` | 18, 74, 82: pausa/mute desabilitados e encerramento disponível |
| `erp/tests/mobile-forms/financialVoiceOwner.test.tsx` | 1: 21 provas do proprietário, sessões e publicação/confirmacão de ferramentas |
| `erp/tests/mobile-forms/financialVoiceControls.test.tsx` | 1: dois testes dos controles reais com plataforma mockada |
| `erp/tests/mobile-forms/financialChatOwner.test.tsx` | 1: cinco provas de limpar/copiar/refresh e adaptação dos testes ao resolver assíncrono da limpeza |
| `mobile/src/services/geminiLiveService.test.ts` | 1: dez testes do serviço, recursos, ferramentas e replay |
| `mobile/src/services/voiceRecorderService.test.ts` | 1: cinco testes de permissão, preparação, tracks e encerramento |

### Validação final e limites

**93 testes de formulários móveis em oito arquivos e 367 testes unitários móveis em 68 arquivos aprovados. Lint de 14 arquivos sem erros nem avisos. Exportação web móvel aprovada**, sem publicação. TypeScript móvel permanece com **29 diagnósticos globais**, nenhum nos arquivos deste lote; o erro do construtor nativo foi removido. Rodadas intermediárias são subconjuntos, não somar como provas distintas.

Logs finais: `scratch/rhf-mobile-chat-complete-form-tests-18.log`, `scratch/rhf-mobile-chat-complete-mobile-tests-18.log`, `scratch/rhf-mobile-chat-complete-lint-18.json`, `scratch/rhf-mobile-chat-complete-tsc-18.log` e `scratch/rhf-mobile-chat-complete-web-build-18.log`.

**Acionadores e limites:** a UI atual abre Live pelo botão de voz; captura por `handleStartVoice` e confirmação individual antiga são bibliotecas retidas, sem novo acionador. Pré-análise da captura é local; seu fallback nativo não cria um novo recurso de transcrição automática nesta migração. Microfone, WebSocket, quota, clipboard e serviços de negócio são mockados nos testes: não há prova de áudio em aparelho, cobrança, RLS ou concorrência no banco. Identidade para descarte de contexto segue o `userName` recebido pelo componente; autenticação e autorização continuam nos serviços. O replay é memória da sessão e depende do ID da ferramenta; não substitui idempotência persistente no backend nem deduplica operações distintas sem ID.

O protocolo de quota permanece `supabase.functions.invoke('gemini-live-token', {body})`, com espera limitada; [referência oficial consultada de invoke](https://supabase.com/docs/reference/javascript/functions-invoke). Não houve mudança de permissões, RLS, credenciais ou contrato remoto; nenhuma chamada paga de IA, microfone real, movimentação financeira remota, instalação, migration, deploy ou operação fiscal neste lote. CC-e permanece ausente.

**Inventário:** conferido o proprietário do chat e quatro filhos de apresentação/entrada vinculados a ele, sem introduzir formulários independentes para cada campo. Os demais candidatos e o censo adicional continuam abertos; não há conclusão global.
