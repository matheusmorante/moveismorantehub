# Publicação combinada da Inbox — 22/10/2026

## Autorização e resultado

O proprietário autorizou este pacote na resposta `Autorizar publicação deste pacote`, referência `call_9c6777685cd947bf9ed6ff288782c356`. A autorização cobre o candidato congelado em `C:\Users\mathe\morantehub-central-commercial-hydration-release-20261022`: nove arquivos de execução e 24 caminhos selecionados, sem migration ou criação de dados.

**Publicado e promovido:** `dpl_7G4wF7TZaPgWRxd4sVwubwSKd6NL`, estado READY. URL da implantação: [morantehub-on5x3lqis-matheusmorantes-projects.vercel.app](https://morantehub-on5x3lqis-matheusmorantes-projects.vercel.app). A [Inbox pública](https://morantehub.vercel.app/atendimento) passou nas verificações HTTP após a promoção. O envio permanece bloqueado por política da empresa.

As evidências usam 23/10 UTC, correspondente a 22/10 em São Paulo. Antes de criar e antes de promover, a produção ainda era `dpl_GXyA2xGLgWMamjYCpzRwfzrburYE`, base Git `bed981061157e1d07164b4cb9c8fdeb91e78abbb`. Não havia produção Git mais recente a preservar. O agente não fez commit nem push.

## Conteúdo publicado

- Recuperação de confirmação de leitura quando o INSERT Realtime não chega, preservando o histórico carregado.
- Diretório de atendentes compartilhado entre lateral e atribuição, com carregamento, erro e repetição explícitos.
- Resposta HTTP 503 nas duas rotas quando o processador de webhook informa falha; sucesso e duplicata validada continuam 200.
- Falhas de consulta/hidratação comercial não representam ausência de cliente nem zero pedidos; lista confirmada é preservada durante falha de atualização.
- Cabeçalho responsivo: o botão voltar permanece acessível em 390×844.

O manifesto `release-manifest.json` tem SHA-256 **A4BF0BA35D04BA311AD1B6B1A5DF1CC83787B202140746EFA35DD7F1390610E6**. Os 24 arquivos foram conferidos antes do envio e novamente após o build. A árvore bruta de arquivos da Vercel confirmou **9/9 UIDs SHA-1 iguais aos arquivos de execução do candidato**; nenhum arquivo de execução divergente. A integração corta a árvore em profundidade, por isso esta comparação utilizou a CLI autenticada para obter a árvore completa. Nenhum segredo entrou nas evidências.

## Build, promoção e aliases

O envio usou somente a pasta isolada aprovada, com alvo Production e `--skip-domain`; a promoção ocorreu depois das sete verificações HTTP dessa implantação. Build remoto concluído em aproximadamente cinco minutos, máquina de dois núcleos/8 GB e heap Node de 4 GB configurado somente para esse build. Instalação e comandos de build do projeto foram preservados. Foram observados avisos não fatais de dependências, anotação Zod, imports mistos e tamanho de chunks.

Após promover, a API da Vercel resolveu `morantehub.vercel.app` e `morantehub.com` para o novo deployment. O alias técnico `morantehub-matheusmorantes-projects.vercel.app` apareceu apontando para uma implantação antiga na listagem da CLI; foi reassociado explicitamente ao candidato e conferido pela API. O alias Git da main continua representando sua implantação Git.

A conferência do domínio `morantehub.com` nesta etapa foi do vínculo na Vercel, não uma nova prova de DNS/HTTP desse domínio. A URL pública exercitada pela suíte foi `morantehub.vercel.app`.

## Validação

| Prova | Resultado | Limite |
|---|---|---|
| Vitest/RTL da origem e candidato isolado | 257 aprovados e seis checks remotos sem opt-in ignorados em cada execução | Não certifica os checks ignorados |
| Lint e build isolado do ERP | Aprovados; build final local em 5m04s | Sem novo gate TypeScript global |
| Playwright visível no desenvolvimento | 1/1 em 22,5s, porta 5173, viewport 390×844, API 3000 saudável | Escritas abortadas ou ACK restrito simulado; sem nova persistência comprovada |
| HTTP público antes da publicação | 7/7 | Snapshot anterior saudável |
| HTTP da implantação antes da promoção | 7/7 em 29,02s, CLI autenticada | Sem webhook legítimo ou comando comercial |
| HTTP público depois da promoção | 7/7 em 1,84s | Sem login de produção nem dados comerciais positivos |
| Arquivos enviados | 9/9 UIDs iguais ao candidato aprovado | Identidade das fontes, não nova prova funcional do banco |

Cada rodada HTTP conferiu: `/atendimento` 200; dois caminhos de mídia sem sessão 401; dois caminhos de despacho 403; webhook sem assinatura e com assinatura forjada 401. A primeira tentativa de executar o runner HTTP usou o diretório errado e não carregou a configuração; foi corrigida antes das três rodadas válidas, sem mudança de produto.

Não foram enviados webhooks válidos, mensagens à Meta ou comandos de negócio. Nenhuma migration, fixture, cliente, pedido ou conta foi criado nesta publicação. O cenário positivo comercial, a segunda identidade adiada pelo proprietário, mídia legítima/retentativas da Meta e a atomicidade de todos os efeitos legados do webhook não são comprovados por esta etapa.

## Evidências e continuidade

Arquivos em `scratch/`:

- `central-support-approved-deploy-2026-10-22.log`
- `central-support-approved-remote-build-2026-10-22.log`
- `central-support-approved-promotion-2026-10-22.log`
- `central-support-approved-technical-alias-2026-10-22.log`
- `central-support-approved-before-http-proof-2026-10-22.json`
- `central-support-approved-staged-http-proof-2026-10-22.json`
- `central-support-approved-public-http-proof-2026-10-22.json`
- `central-support-approved-runtime-fingerprints-2026-10-22.json`
- `central-support-approved-files-2026-10-22.json`

As fontes anteriores de validação estão no registro `63-comercial-mobile-candidato-2026-10-22.json` da auditoria. O manifesto aprovado e os três candidatos anteriores permanecem preservados. Este registro de publicação não foi adicionado ao pacote congelado depois da aprovação.

Se houver necessidade de reversão, comparar primeiro a produção atual e usar uma implantação compatível com as RPCs já instaladas; preservar histórico e controles de acesso. Não restaurar permissões anônimas nem acesso direto legado. A auditoria A–R e a entrevista de novas decisões continuam em andamento; a publicação não autoriza novas funções ou alteração do bloqueio de envio.
