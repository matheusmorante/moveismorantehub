# Inbox — leitura, mensagens em tempo real e cópia de telefone, 21/10/2026

## Publicação concluída

O proprietário autorizou **“Publicar este candidato (recomendado)”** em `call_eca8f155dada4ebaa762ff6a94203895`. O pacote congelado de 17 caminhos, manifesto SHA-256 `10C41AC1F0897A07CD528D79C12AD7D8DBBF79E4AC74341D8BD7E08389A43AE5`, foi construído em Production sem promoção automática. Deployment **dpl_ECK4N6TZDNtDXivdinz1Vwqqkdb6**, [URL imutável](https://morantehub-4gq38n9rb-matheusmorantes-projects.vercel.app), agora publicado em [Central de Atendimento](https://morantehub.vercel.app/atendimento).

Treze arquivos de origem coincidiram por SHA-1 com os arquivos enviados, incluindo as três mudanças de runtime e os contratos de webhook/build preservados. A API do conector truncou diretórios profundos; a árvore completa foi consultada pela CLI autenticada. O build remoto ficou READY (fase Vite: 2m31s). Vitest HTTP: **7/7** na URL imutável e **7/7** no domínio público. O alias foi reconferido após as provas. Sem reconstrução na promoção, nova migration, fixture, conta, webhook legítimo ou envio à Meta. A confirmação do segredo continua limitada às recusas HTTP; não comprova recebimento legítimo do aplicativo.

Registros em `C:/Users/mathe/morantehub-central-read-receipt-release-20261021`: `publication-authorization.json`, `publication-result.json`, `staged-fingerprints.json`, `staged-http-proof.json`, `production-http-proof.json` e logs. O manifesto congelado mantém o estado da preparação; autorização e resultado posteriores estão nesses registros. Os checkpoints abaixo descrevem diagnóstico e preparação, sem substituir o resultado da publicação.

## Problema e causa comprovada

`markConversationAsRead` não tinha prazo máximo, ignorava erros devolvidos pelo Supabase e não informava sucesso ao chamador. A abertura da conversa zerava o contador visual antes da resposta. O callback de recebimento aguardava essa gravação antes de mostrar a mensagem persistida; uma resposta pendente podia impedir sua exibição pelo Realtime.

## Correção delimitada

- `erp/src/pages/utils/customerSupport/customerSupportService.ts`: a operação existente de `unread_count` tem prazo de 10 segundos com `withTimeout`, retorna confirmação somente para resposta sem erro e trata falha de transporte. Não altera outros campos.
- `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportMessages.ts`: a mensagem recebida aparece sem aguardar a confirmação de leitura. O contador só é limpo depois da resposta de sucesso; falha mantém aviso na interface e pode ser repetida em “Recarregar mensagens”. Respostas de outra conversa são descartadas. O polling de histórico não apaga o aviso de leitura.
- `customerSupportReadReceipt.test.ts` e `customerSupportPaging.test.tsx`: regressões do serviço, prazo, contador, recebimento, troca de conversa e permanência do aviso.
- `erp/tests/support-readonly/support-login.spec.ts`: prova de interface usando somente o histórico retido de uma conversa própria arquivada. O guard bloqueia cada PATCH antes do banco e comprova histórico visível, aviso e nova tentativa.

Não há migration, nova fixture, conta ou despacho. O contrato de recebimento e mídia foi preservado. Uma resposta HTTP sem erro não prova a quantidade de linhas alteradas nem reconciliação atômica com uma mensagem que chega simultaneamente; esta correção não faz essa afirmação.

## Provas executadas

| Prova | Resultado | Registro |
| --- | --- | --- |
| Regressões antes da correção | 6 falhas e 11 aprovações | `scratch/central-support-read-receipt-before-2026-10-21.log` |
| Regressões depois da correção e caso adicional de polling | 18/18 em dois arquivos | `scratch/central-support-read-receipt-after-2026-10-21.log` |
| Seleção consolidada da Central | 229/229 em 23 arquivos, incluindo seis negativas anônimas remotas | `scratch/central-support-read-receipt-consolidated-2026-10-21.log` |
| Playwright visível no ERP de desenvolvimento | 1/1 em 12,5s, porta 5173, gravações de negócio bloqueadas | `scratch/central-support-read-receipt-readonly-ui-2026-10-21.log` |
| TypeScript do harness | exit 0 | `scratch/central-support-read-receipt-harness-types-2026-10-21.log` |

A prova de interface confere autenticação, manifesto remoto, proprietário, IDs e canal do run encerrado `8eaed14f-364d-47ab-be41-66be54b3fb65`. Não reabre a autorização de escrita daquele run e não comprova gravação bem-sucedida de leitura no PostgreSQL. As provas com transporte simulado estão identificadas como Vitest/RTL.

## Entrega e limites

A base conferida antes da publicação era `dpl_HEWH6mSt4zhreR7XFtgs2qukSkBR`, commit `39b10c593834b07ed3727bd7f6abad1fcfcad5d2`. O pacote em `C:/Users/mathe/morantehub-central-read-receipt-release-20261021` usa esse commit como base, preserva suas demais mudanças e contém 17 caminhos selecionados. A nova versão foi publicada conforme o registro no início deste documento. Não usar snapshots anteriores para substituir uma produção mais recente. Esta operação não criou commit/push nem alterou a integração Git; preservar as mudanças locais numa entrega Git posterior.

Provas finais do candidato: **232/232 em 23 arquivos** (`unit-final.log`), build completo Vite aprovado em **1m40s** (`build-final.log`), lint dos quatro arquivos de leitura e dos dois arquivos de cópia exit 0, TypeScript final do harness exit 0 e `git diff --check` sem erro de whitespace. Os avisos de tamanho de chunks/anotações de dependências no build não foram convertidos em erro nem tratados como prova de TypeScript global. O total global anterior de 423 diagnósticos continua fora deste gate.

O proprietário dispensou a validação entre duas contas nesta etapa, pela resposta a `call_f6c1fffe89eb47efafa34ed6faf3f751`: ficará para sua conferência futura. Essa prova continua **não realizada**, sem bloquear a continuidade técnica da Inbox e sem autorizar criação de contas ou nova massa.

## Continuidade: copiar telefone sem sucesso falso

O menu em `erp/src/pages/App/CustomerSupport/components/chat/ChatHeader.tsx` chamava `navigator.clipboard.writeText` sem aguardar e imediatamente abria `alert` de sucesso. A recusa do navegador ficava sem tratamento e a API indisponível interrompia o callback.

A correção aguarda a cópia e reaproveita `react-toastify`, já usado pelos snippets: sucesso somente após a confirmação; recusa ou API ausente apresentam erro. Não abre modal bloqueante nem chama comandos de atribuição, status, arquivamento ou envio. Copiar texto não é submissão de dados de formulário.

Três regressões adicionais em `customerSupportCommandForms.test.tsx` falharam antes da mudança (**3 falhas/6 aprovações**) e passaram depois (**9/9**): confirmação pendente, recusa e API ausente. Logs `scratch/central-support-copy-phone-before-2026-10-21.log` e `scratch/central-support-copy-phone-after-2026-10-21.log`.

O cenário opcional `SUPPORT_READONLY_COPY_PHONE=1` passou no Playwright visível: **1/1 em 13,1s**, porta 5173, junto da prova de recusa de leitura/histórico visível. Usa somente a conversa própria retida, aciona a cópia pela UI e confere o sucesso depois de `writeText` nativo; em seguida limpa a área de transferência. **Não relê seu conteúdo pelo sistema**; o argumento exato é comprovado no RTL. Log final `scratch/central-support-copy-phone-readonly-ui-final-2026-10-21.log`. Nenhum PATCH foi entregue ao banco pelo cenário.

Tentativas anteriores foram preservadas: o primeiro seletor não considerava o ícone no nome acessível do botão; depois a cópia nativa confirmou sucesso, mas `readText` ficou pendente. Uma execução encontrou o navegador sem página, recuperada autonomamente pela sessão Playwright visível. A tentativa com limite de cinco segundos localizou a espera em `readText`. A prova final não depende dessa leitura adicional; não tratar esses logs como execuções aprovadas nem como prova de leitura do clipboard. Sem retries automáticos ou reprovisionamento de fixtures.

## Arquivos e linhas de referência

- `customerSupportService.ts:311`: retorno e prazo de leitura.
- `useCustomerSupportMessages.ts:45`: confirmação, descarte de resposta antiga e aviso; `:177`: recebimento independente; `:218`: nova tentativa explícita.
- `ChatHeader.tsx:428`: cópia assíncrona e feedback.
- `customerSupportReadReceipt.test.ts:13`, `customerSupportPaging.test.tsx:141` e `customerSupportCommandForms.test.tsx:30`: provas de regressão.
- `erp/tests/support-readonly/support-login.spec.ts:174`: manifesto/ownership e prova sem gravações; `:202`: cópia nativa pela UI.
