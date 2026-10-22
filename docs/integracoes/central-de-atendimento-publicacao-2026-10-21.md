# Central — publicação e gates de 21/10/2026

**Publicação mais recente concluída:** **dpl_ECK4N6TZDNtDXivdinz1Vwqqkdb6**, em [Central de Atendimento](https://morantehub.vercel.app/atendimento), autorizado em `call_eca8f155dada4ebaa762ff6a94203895`. Correções de leitura e cópia de telefone: 17 caminhos, três arquivos de runtime, **232/232**, build isolado **1m40s** e Playwright visível **1/1 em 13,1s** na porta 5173. Treze arquivos enviados conferidos por hash, build remoto READY e **7/7 checks HTTP antes e 7/7 depois da promoção**. [Pacote, execução e limites](central-de-atendimento-confirmacao-leitura-2026-10-21.md). A prova entre duas contas foi adiada pelo proprietário para conferência futura. As seções seguintes preservam o histórico.

## Última produção conferida — 21/10

**dpl_HEWH6mSt4zhreR7XFtgs2qukSkBR**, commit Git **39b10c593834b07ed3727bd7f6abad1fcfcad5d2**, já contém a correção da atualização/paginação e manutenção de pastas por qualquer atendente autorizado (escolha C do proprietário). Migration **20261021194621** aplicada, autor protegido. **222 testes** na origem e cópia isolada, build isolado **3m22s**, Playwright somente leitura **1/1 em 20,7s**, **12 blobs** e **sete checks HTTP** conferidos. Nenhum deploy/promoção por este agente nesta operação. Snapshots isolados são somente validação e não devem substituir a produção Git mais recente. Prova entre duas identidades permanece pendente; checkpoints abaixo são históricos.
[Entrega, permissões e limites](central-de-atendimento-manutencao-compartilhada-2026-10-21.md).

## Conferência atual — operação de reabertura concluída

Autorização limitada executada: migrações **20261021190324/20261021190331**, quatro casos remotos e Playwright aprovados; cinco conversas próprias arquivadas, **38 registros preservados de 68 autorizados**. A produção encontrada é **dpl_Hm6cgBdncczxjNk91AvFSqbNacYB**, commit Git **0385fa1343887892117996e3d57fd027956bcadb**, já com o novo processador e o feedback de permissões. Nove blobs conferidos e sete verificações HTTP aprovadas. Este agente não fez deploy nesta operação. Origem e snapshot isolado: **211/211**; build isolado aprovado em **2m24s**. O snapshot usa baseline anterior e não deve ser publicado sobre a produção atual.

Os checkpoints anteriores abaixo preservam o histórico. Restam provas com segunda identidade, vínculos comerciais e webhook/mídia legítimos da Meta; a metadata Vercel Development só contém o par do operador atual. Nenhuma conta nova, pasta, cliente ou pedido foi criado nesta operação.

[Execução, retenção e limites](central-de-atendimento-reabertura-execucao-2026-10-21.md), [conferência de aceite](central-de-atendimento-aceite-2026-10-21.md).

## Autorização e identidade do candidato

O proprietário autorizou **“Autorizar publicação desse candidato”**, condicionado à configuração Meta e ao bloqueio permanente de despacho. A metadata da Vercel confirma `WHATSAPP_APP_SECRET` como variável secreta em Production, Preview e Development. Seu valor não foi consultado. A presença não comprova que o segredo corresponde ao aplicativo Meta; essa correspondência requer um recebimento legítimo assinado.

Projeto: `morantehub`, `prj_cj2JEx1xLPgqhFUH9FiMcPq58YrQ`; equipe `team_dgKjq9dB1Rwj8tUl7ZNAlZ69`; raiz `erp`; Node 24.x. Base Git: `1af47d95f428dee37044794f30e78d3b843792d7`. O checkout principal contém alterações de outras tarefas e não foi publicado integralmente.

| Artefato | Identidade |
| --- | --- |
| Recorte inicial, 86 caminhos | Manifesto SHA-256 `0E517FD08FDC8DD7B5207A32B4A494C7E80B8A31DEEC4C8001766A00B274769A` |
| Revisão de extensões ESM, 90 caminhos | Manifesto SHA-256 `CEBC1029E07FB696A5500EA020D361019C98943B9CE0BC469FF0929F289819A8` |
| Revisão do processador CJS, 92 caminhos | Manifesto SHA-256 `41A9DF356195FC3769D142480C638FD45C8D3F6AC5BD206866E8D23FF803EC26` |
| Implantação inicial recusada nas verificações HTTP | `dpl_CSkLU7s6zGteuYWYuRACDFZHWfVZ`; não promovida |
| Segunda implantação recusada nas verificações HTTP | `dpl_6oMYsCVThdUKSKFSazDRE2kzRU54`; não promovida |
| Implantação com processador empacotado | `dpl_7hG2EdsC9jBdS3tpexoJySN8NwaC` |
| URL imutável com processador empacotado | `https://morantehub-cb022s57o-matheusmorantes-projects.vercel.app` |
| Produção anterior à revisão | `dpl_CukTbYgroRHds17pqyhAktjc7E1z` |

O diretório isolado `C:/Users/mathe/morantehub-central-release-20261021` preserva o manifesto inicial, os dois manifestos corretivos, as cópias anteriores dos arquivos de runtime, os registros de implantação e os logs. As revisões corrigem o HTTP 500 real e reforçam a prova de inicialização, conforme [diagnóstico](central-de-atendimento-runtime-esm-2026-10-21.md). A revisão final empacota o mesmo processador e seus utilitários em CJS explícito, com um produtor comum ao build da Vercel, ao adaptador local e ao teste nativo. A metadata remota corresponde ao projeto, SHA do manifesto, base e revisão `processor-cjs-build`.

## Provas antes da promoção

| Gate | Evidência atual | Limite |
| --- | --- | --- |
| Unidades/componentes/contratos na origem | 192 aprovados em 20 arquivos | Inclui seis negativas anônimas reais; não são 192 testes PostgreSQL |
| Mesma suíte no candidato isolado | 186 aprovados e seis remotos desativados em 20 arquivos | Cópia sem credenciais/arquivos de ambiente |
| Inicialização nativa da API | Produtor real em diretório próprio, entradas públicas sem bundle e processador CJS; recusas 401/403/401/503, HMAC sintético válido e zero rede | Prova local Node; não substitui HTTP na Vercel |
| Build completo do candidato corrigido | Exit 0; validação de inicialização fiscal, build da Central e Vite em 2m08s | Sem transmissão fiscal; avisos de tamanho de chunks permanecem |
| Tipos e lint | 424 diagnósticos globais, zero na Central; lint focado sem erros | O gate TypeScript global permanece reprovado |
| Banco e UI gravável próprios | Quatro Vitest remotos e um Playwright aprovados no checkpoint documentado | Uma identidade; execução encerrada, não reutilizada |
| Limpeza própria | Dois Vitest aprovados; 51 conversas arquivadas, pasta ausente, 190 mensagens/eventos retidos | Histórico preservado |
| UI de leitura final | Playwright 1/1 em 12,7s, ERP 5173 com strictPort | Desenvolvimento; não é teste de UI na produção |

As provas de banco/UI e seus limites estão na [conferência](central-de-atendimento-validacao-2026-10-21.md) e no [registro da operação](central-de-atendimento-fixtures-proposta-2026-10-21.md).

## Estado HTTP e promoção

**Publicada e conferida em `https://morantehub.vercel.app/atendimento`.** A terceira revisão ficou READY e passou nas sete verificações pela URL imutável em 23,29s. Depois foi promovida sem reconstrução pelo endpoint de promoção. A consulta do projeto confirmou `targets.production.id = dpl_7hG2EdsC9jBdS3tpexoJySN8NwaC`; a consulta dos aliases confirmou esse mesmo ID para `morantehub.vercel.app` e `morantehub.com`.

As sete verificações foram repetidas em `https://morantehub.vercel.app` e passaram em 1,94s, às 14:14:52 UTC: HTML 200, duas rotas de mídia sem sessão 401, duas rotas de despacho 403 e webhook sem assinatura/assinatura forjada 401. Isso também confirma que o segredo está carregado, pois a falta de configuração em produção produziria 503. Não comprova a correspondência do valor com o aplicativo Meta.

A suíte Vitest `erp/tests/support-deployment/guards.test.ts` usa a CLI autenticada na URL imutável protegida e HTTP direto no domínio público. A CLI instalada não resolve aliases personalizados como identificadores de implantação. Os destinos são restritos ao projeto e as respostas são mantidas somente em memória; as evidências registram método/caminho/status. Somente corpos vazios destinados à recusa são enviados, sem destinatário ou webhook válido. A prova do domínio público tem 7/7 e a prova da URL imutável tem 7/7; as duas revisões anteriores com HTTP 500 continuam registradas e não foram promovidas.

### DNS do domínio personalizado

`morantehub.com` retornou `ENOTFOUND` no acesso direto. A API da Vercel confirmou `misconfigured=true` e `configuredBy=null`, embora a propriedade do domínio esteja marcada `verified=true`. A atribuição do alias à revisão foi confirmada; a configuração DNS ainda precisa ser tratada. O endereço padrão de produção acima passou nas sete verificações. Logs: `scratch/central-support-cjs-staged-tests-2026-10-21.log`, `scratch/central-support-production-vercel-tests-2026-10-21.log` e os JSON de prova correspondentes.

## Restrição final e limites remanescentes

O SQL [de contração](sql/customer-support-internal-commands-contract.sql) foi aplicado como **20261021162004**, após a conexão Supabase voltar a responder e a reconferência do projeto, histórico, catálogo e alias de produção. Os cinco comandos e seus corpos permaneceram iguais. INSERT direto de mensagens foi revogado; UPDATE direto de conversas ficou limitado a `unread_count`. Service role foi preservado e anon continua sem acesso às quatro tabelas, incluindo por coluna. As sete verificações HTTP na produção passaram novamente. [Execução e limites da restrição](central-de-atendimento-restricao-legada-2026-10-21.md).

Na revisão publicada, `customerSupportService.ts:311` faz somente `UPDATE unread_count=0` diretamente. Os cinco comandos usam as RPCs e não há INSERT direto de mensagens nesse serviço. Portanto, o SQL preparado conserva a operação direta que esse frontend ainda utiliza.

O catálogo remoto pós-contração confirmou cinco RPCs `SECURITY DEFINER`, pertencentes a postgres, com execução autenticada e sem execução anônima, preservando os mesmos MD5 anteriores. Os caminhos legados de escrita foram removidos, mantendo somente UPDATE de `unread_count`, sem DML e sem alterar `service_role`. Rollback do frontend deve conservar o contrato RPC; não restaurar autoria livre por inferência.

Continuam sem prova real: compartilhamento entre duas identidades, conta sem permissão comercial, vínculos comerciais próprios, download de mídia própria e correspondência do App Secret com um evento legítimo da Meta. Nenhum envio foi habilitado. A escolha posterior ATD-009-R1 foi autorizada e tem [implementação local preparada](central-de-atendimento-reabertura-2026-10-21.md), fora deste candidato publicado. A Inbox não está declarada globalmente concluída enquanto esses gates e limites não forem tratados.
## Candidato posterior — leitura e cópia de telefone

Publicado após autorização específica: `C:/Users/mathe/morantehub-central-read-receipt-release-20261021`, base Git `39b10c593834b07ed3727bd7f6abad1fcfcad5d2`, 17 caminhos selecionados e três mudanças de runtime. O manifesto congelado foi autorizado por `call_eca8f155dada4ebaa762ff6a94203895`; deployment `dpl_ECK4N6TZDNtDXivdinz1Vwqqkdb6` promovido sem reconstrução e alias reconferido após os sete checks públicos. Nenhuma migration, fixture, conta ou despacho novo. [Correção, provas e limites](central-de-atendimento-confirmacao-leitura-2026-10-21.md). A operação preservou a produção Git que serviu de base, sem commit/push ou alteração do vínculo Git; integrar os arquivos locais antes de uma publicação Git posterior que possa substituí-los.

Atualização de 22/10/2026: a publicação autorizada e a comparação com a produção atual estão registradas em central-de-atendimento-publicacao-2026-10-22.md. O commit Git de produção da8b0189390c39723e55d1235b5f2ae7da497570 já contém os mesmos hashes dos sete arquivos centrais; sete verificações HTTP passaram. Não foi feita promoção redundante.