# Orientação de contexto do projeto

## Cancelamento comercial e tratamento fiscal

- O cancelamento pode ser iniciado pelo Pedido de Venda ou pela tela de Notas Fiscais de Saída. Ambos devem usar a mesma operação comercial transacional e a mesma política/serviço fiscal central; a tela fiscal não altera status diretamente.
- A regra central `hasGoodsCirculated(order)` considera `fulfilled` como circulação tanto para entrega (Entregue) quanto para retirada (Retirado), além de evidências de saída/trânsito.
- Com circulação, bloquear cancelamento por operação não realizada e não gerar estorno; quando a mercadoria retornar, usar devolução vinculada à venda e preservar a NF-e original.
- Sem circulação e sem documento autorizado (ausente, rejeitado ou nunca autorizado), cancelar somente o pedido/estoque, sem ação fiscal.
- Sem circulação e com documento autorizado, selecionar automaticamente cancelamento fiscal dentro do prazo ou estorno quando a regra aplicável permitir. O usuário não escolhe entre esses efeitos.
- No Paraná, NF-e 55: 168 horas; NFC-e 65: 30 minutos conforme orientação atual da SEFA/PR. Centralizar prazos e testar o instante exato do limite.
- NF-e de estorno segue o RICMS/PR art. 298, VII e NPF 038/2022. É aplicável à emissão indevida após perda do prazo; quando emitida em período de apuração posterior, revisar diferenças/acréscimos do art. 298, §2º antes de transmitir. Exigir revisão fiscal, referenciar a chave original e preservar XML, chave, protocolo e linhagem.
- Depois da circulação, usar devolução vinculada e preservar a NF-e original. Criar a devolução não significa retorno físico. Devolução por coleta só se conclui quando a coleta for confirmada (“Coletada”); cliente já trouxe à loja conclui como “Recebida”. Entrada de estoque acompanha a confirmação física dentro da transação do pedido. A NF-e de devolução é preparada na área fiscal após esse retorno, não ao abrir o cadastro.
- A atualização comercial/estoque é transacional. A chamada externa à SEFAZ ocorre após o commit; manter estado de tentativa/reconciliação idempotente e nunca desfazer o fato comercial por falha fiscal posterior.

## Uso de skills

- Carregue somente a skill diretamente relacionada à tarefa atual.
- Não leia nem liste todas as skills antes de escolher uma.
- Para tarefas simples (`git`, execução local, inspeção pontual), não carregue skill especializada.
- Se mais de uma skill parecer aplicável, use a menor combinação que cubra a tarefa.
- Para criar, alterar, substituir, remover ou aplicar migrations do Supabase, siga obrigatoriamente [`supabase-migration-lifecycle`](.agents/skills/supabase-migration-lifecycle/SKILL.md). Classifique e registre o destino de cada migration antes de concluir.
- Leia referências adicionais de uma skill somente quando a tarefa exigir.
- Ao escolher, inserir, trocar ou adaptar responsivamente logos, favicons ou splash screens, siga obrigatoriamente `morante-responsive-logo-usage`.

## Ambiente local da Vercel

- A política única para sincronização de variáveis, `.env.local`, Development, Preview, secrets, Supabase e ambiente fiscal local está em [`.agents/skills/vercel-development/SKILL.md`](.agents/skills/vercel-development/SKILL.md). Consulte-a antes de alterar scripts ou orientar setup local; skills de domínio devem referenciá-la em vez de duplicar regras de ambiente.
- O comando diário é `npm run dev`, que inicia `dev:stack` com Vercel Development via `scripts/run-vercel-env-dev.cjs`. O CLI usa `.vercel` como cwd e recebe o project ID vinculado explicitamente para que `.env.local` não sobreponha as variáveis remotas.

## Saída e investigação

- Prefira comandos com saída limitada e direcionada.
- Não repita leituras do mesmo arquivo ou status sem mudança observável.
- Preserve alterações existentes e faça mudanças pequenas, verificáveis e reversíveis.

## Regra global: atomicidade e consistência das operações

- Antes de alterar um fluxo, identifique os efeitos obrigatórios que ele cria ou reverte: estoque, financeiro, fiscal, reservas e históricos que representam estado confirmado. Declare o estado que dispara cada efeito e se uma transição posterior deve criar outro efeito.
- Quando a operação principal e seus efeitos precisam permanecer consistentes, grave-os na mesma transação do banco ou RPC transacional. Se qualquer etapa essencial falhar, reverta tudo e apresente o erro. Chamadas independentes do cliente não constituem uma transação; não use fallback que salve apenas parte da operação.
- Garanta idempotência e proteção contra retries, cliques repetidos e concorrência com vínculos e restrições apropriados no banco. Cancelamentos e reversões devem ser rastreáveis, vinculados à origem e não duplicados; preserve fatos confirmados em vez de apagá-los.
- Declare quais efeitos podem ocorrer após o commit e como serão reconciliados em caso de falha. Antes de concluir, teste sucesso, falha em cada etapa essencial, repetição, concorrência, cancelamento e reversão.
- A regra vale para todos os módulos, mas o gatilho de cada efeito deve seguir a regra de negócio específica do fluxo; não aplique o mesmo momento de movimentação a vendas, recebimentos, inventários e devoluções.

## Política de validação de código

- Ao alterar código, identifique pelo `git diff` os arquivos, módulo e dependências afetados; execute primeiro somente a validação focada mais barata para esse módulo, antes do commit.
- Se o teste focado passar, rode apenas as verificações estáticas aplicáveis (TypeScript/compilação e lint nos arquivos alterados). Para mudanças exclusivamente de texto ou CSS, limite-se ao mínimo aplicável e faça validação visual somente se ela agregar evidência.
- Só avance para integração, Playwright/E2E ou navegador depois que as etapas focadas anteriores passarem e quando o escopo exigir. Integração é indicada para persistência, API, autenticação, banco, sincronização ou contratos entre serviços; E2E deve cobrir apenas o fluxo afetado.
- Sempre que uma tarefa replicar, portar ou adaptar uma tela, aba, componente ou módulo existente do ERP Web para o App Mobile, siga obrigatoriamente a skill `erp-web-to-mobile-replication`. Inspecione a implementação original, mapeie estados e interações, preserve semântica, regras e fluxos, e compare visualmente Web × Mobile. Adapte layout para telas menores sem mudar comportamento, salvo limitação técnica real ou solicitação explícita.
- Mudanças na replicação/sincronização ERP ↔ App Mobile exigem teste focado do módulo de sync e, se envolverem persistência ou comunicação real entre serviços, integração isolada. E2E cobre somente o fluxo afetado quando agregar cobertura que testes focados não dão.
- Não rode a suíte completa repetidamente durante o desenvolvimento; deixe-a preferencialmente para o CI no push/PR. Só execute localmente quando a mudança for transversal, houver risco concreto de regressão ampla ou o usuário solicitar.
- Se uma camada falhar, corrija antes de escalar. Não repita validações aprovadas sem mudança relevante e mantenha logs resumidos.

## Roteamento rápido

- Código/arquitetura: `design-patterns`, `modularizacao_codigo`, `modelagem-negocio-arquitetura`.
- Banco/Supabase: `database-supabase`, `supabase-egress-guard`; lifecycle de migrations: `supabase-migration-lifecycle` (obrigatória).
- ERP/regras fiscais: `regras-de-negocio-erp`, `testes-seguros-erp`; para fontes oficiais de NF-e/NFC-e, consulte os links em `docs/fiscal/manuais/README.md`.
- Testes/triagem: `rtk-tdd`, `testes-seguros-erp`, `issue-triage`.
- Refatoração/limpeza: `safe-refactor`, `surgical-patch`, `limpeza-projeto-segura`.
- Deploy/release: `release`, `mobile-eas-publicacao`.
- Git/PR: `caveman-commit`, `pr-triage`.
- Identidade visual responsiva: `morante-responsive-logo-usage`.

## Ferramentas de inspeção assistida

- **Serena MCP:** no início de uma tarefa de código, consulte `initial_instructions` e confirme/ative o projeto/cwd atual. Prefira `get_symbols_overview`, `find_symbol` e `find_referencing_symbols` antes de abrir arquivos completos; leia somente as definições e consumidores necessários. Use busca textual quando o alvo não for símbolo ou Serena não estiver disponível. No contexto Codex, use as ferramentas nativas para editar/rodar comandos; Serena é prioritariamente navegação semântica.
- **CALM MCP:** use `repo_overview` para orientação em mudanças amplas e `callers`/`callees`/`path`/`reference_impact` para rastrear relações e delimitar arquivos antes da leitura quando a tarefa envolver fluxo entre módulos. Use `diff_impact` depois de mudanças quando disponível. Para uma busca textual simples, use `rg`; CALM complementa Serena no grafo relacional e não substitui skills, documentação de negócio ou testes. A configuração do projeto está em `.codex/config.toml`; o índice local fica em `.calm/` e não deve ser versionado.
- **Chrome DevTools MCP:** para diagnóstico técnico do ERP no navegador, use Network/Console/Performance para confirmar requests, erros e comportamento real. Capture somente a interação/período relevante, não exporte ou exponha tokens, cookies, payloads pessoais ou dados sensíveis. Playwright continua sendo a ferramenta de automação funcional/E2E; DevTools complementa o diagnóstico, não o substitui.
- **Sessão do ERP em testes manuais:** prefira a aba do ERP já autenticada que o usuário disponibilizou; não exija uma conta ou perfil de teste separado para validar a interface com fixtures `TEST_AUT`. Se a aba estiver deslogada e o usuário indicar/autorizar uma conta Google, siga o login normal nessa conta. Não grave senhas, códigos ou tokens. Diferencie sessão deslogada de **Aguardando Aprovação**: este último indica que a identidade foi reconhecida, mas ainda não tem acesso aprovado no ERP; não tente contornar a aprovação ou trocar de conta para escapar dela. Peça ao usuário ou administrador autorizado para restaurar o acesso antes de continuar ações que dependam de permissão.
- **Conta indicada para login real em testes:** use `matheusmorante0012@gmail.com` para login manual no ERP/Google e para Playwright quando o cenário precisar autenticar uma conta real. Use a sessão já autenticada ou o fluxo normal do Google. Os parâmetros `auth_email`/`user_id` usados por alguns E2E simulam identidade e não comprovam login nessa conta. Scripts fiscais HML devem receber essa identidade por `NFE_HML_TEST_OPERATOR_EMAIL` e `NFE_HML_TEST_OPERATOR_PASSWORD` em Vercel Development, como secrets de runtime, e conferir o acesso fiscal sem imprimir valores; o login real do Playwright deve consumir as mesmas credenciais somente em runtime. Não reutilize credenciais de outro operador quando a regra exigir essa conta. Não grave a senha, códigos, tokens, cookies ou `storageState` em regras, código, arquivos `.env*`, logs ou relatórios. Se a fonte segura não estiver disponível, pare no login e peça ao usuário para autenticar pelo fluxo normal.
- **Roteamento de testes por plataforma:**
  - **Vitest**: lógica pura, cálculos de negócio, transformações e integração de serviços isolados em memória.
  - **Playwright**: automação funcional e E2E no navegador (ERP React/Web e Expo Web quando suportado). Viewports mobile no Playwright são úteis para responsividade web, mas não comprovam runtime nativo.
  - **Maestro**: ferramenta E2E para o app Android, somente em celular físico conectado por **Depuração sem fio (Wi‑Fi)**. Emulador/AVD e alvo USB são recusados pelo executor. O celular deve estar pareado/conectado no ADB antes de iniciar o Maestro; use `ANDROID_SERIAL` se houver mais de um alvo Wi‑Fi. Testes de integração que usam PostgreSQL/Supabase usam o projeto remoto configurado, com fixtures sintéticas isoladas conforme `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`; smoke test manual de emissão HML segue a exceção fiscal descrita nessa política.
  - **ADB**: usado somente para parear/conectar o celular por Wi‑Fi e pelas operações necessárias ao Maestro (seleção do dispositivo, instalação/build e reverse da porta Metro). Não usar ADB para executar testes em emulador nem em alvo USB.
  - **Teste manual no APK**: validação final de hardware não automatizável (sensores, biometria física, câmera real).
- **Emissão fiscal em testes manuais**: qualquer transmissão real para a SEFAZ, inclusive em Homologação, deve ser iniciada e validada exclusivamente pelo fluxo da interface do ERP. Não transmitir NF-e/NFC-e por CLI, scripts, SQL ou chamadas HTTP diretas. CLI e testes automatizados podem cobrir validações locais/mocks e consultas somente leitura, mas nunca emitir. Antes de transmitir, confirme pedido, modelo, ambiente e ausência de tentativa anterior incerta; após timeout/502, consulte e reconcilie pela interface antes de qualquer retry. Trate documentos HML como fatos persistentes, sem presumir que possam ser desfeitos.
- **Replicação ERP ↔ App:** preservar testes Playwright do ERP e testar o caminho Expo Web no navegador quando aplicável. Complementar com Vitest e verificações estáticas focadas; no Android via Maestro e celular físico conectado por Wi‑Fi, validar os fluxos nativos do aplicativo. Para limitações nativas que não possam ser verificadas pelo Maestro, entregar APK para validação manual.

## Acesso ao Supabase

- Se o plugin do Supabase ou o CLI/token não estiver disponível ou falhar, use o navegador integrado já autenticado em supabase.com. O usuário autorizou acessar o Dashboard da conta Movesmorante/Morante Hub e executar, no SQL Editor, o SQL necessário às tarefas de Supabase solicitadas; não é preciso pedir novamente autorização apenas por trocar de ferramenta.
- No SQL Editor, confira o texto e o projeto selecionado antes de executar. Preserve migrations versionadas para alterações de schema e registre o resultado sem expor dados sensíveis. O navegador é um caminho de acesso, não uma exceção às regras de testes, isolamento e segurança do banco.
- Antes de qualquer alteração remota, confirme que o projeto/ref corresponde ao configurado no app e limite a operação ao escopo autorizado.
- Nunca exponha tokens, senhas ou outras credenciais; prefira ferramentas oficiais/API quando disponíveis e registre evidência sem dados sensíveis.


## Governança de Desenvolvimento e Testes (Supabase, pgTAP, k6, ZAP)

**Regra fiscal de ambiente:** `environment=1` é exclusivamente Produção; `environment=2` e `tpAmb=2` são Homologação. Documentos, eventos, cancelamentos e devoluções só se vinculam a registros do mesmo ambiente (1→1, 2→2). A localização remota do Supabase não altera o ambiente fiscal.
- **Ambiente de banco**: O Supabase remoto configurado é o ambiente padrão para testes de integração com PostgreSQL. Antes de qualquer operação remota, confirme o project ref configurado no app e siga `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`. Use registros sintéticos próprios identificados por `TEST_AUT_<uuid>`, preserve registros operacionais e exclua essa massa de dashboards, indicadores, cronogramas, agendas e listas de montagem, mesmo quando os pedidos estiverem agendados. Mantenha-os acessíveis nos fluxos de vendas/fiscais necessários para validar e limpar as fixtures pelo fluxo normal. A exceção é smoke test manual de emissão fiscal HML autorizado explicitamente, que pode vincular o documento a um pedido existente sem exigir pedido sintético ou sessão isolada, conforme a política canônica. Limpe fixtures pelo fluxo normal. Mudanças versionadas de schema exigem revisão da migration, confirmação do projeto, `npm run advisors` e execução controlada; não faça reset, DROP/TRUNCATE, fault injection ou carga ampla no projeto operacional.
- **Supabase remoto**: Use para integração, persistência, RPC, RLS e migrations revisadas, sempre com escopo controlado e fixtures sintéticas. A única exceção para vincular teste a pedido operacional é o smoke test manual de emissão HML autorizado pelo usuário, conforme `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`. Não use Supabase Local ou Docker para testes.
- **pgTAP**: Utilize para testes nativos de banco de dados (RPCs, RLS, Constraints, Triggers).
- **Atomicidade e Banco Real**: Falhas no meio de transações devem ser provadas no banco, garantindo o rollback.
- **k6 e ZAP**: Use k6 para concorrência/carga e OWASP ZAP para segurança dinâmica complementar (com escopo isolado e controlado; não gerar carga ampla no Supabase operacional).
- **Separação Estrita**: Diferencie testes de persistência local (SQLite/IndexedDB) de persistência real (PostgreSQL). O fluxo de testes deve ser proporcional ao risco (Baixo a Crítico/Concorrente).

## Ferramentas Oficiais de Qualidade, Infraestrutura e Segurança
- **Knip (`npm run check:knip`)**: Executar para auditoria periódica de código morto, exports órfãos e dependências não utilizadas em todos os workspaces.
- **Biome (`npm run lint:biome`, `npm run format:biome`)**: Formatação e linting ultrarrápido complementar para checagens de alta frequência.
- **ast-grep**: Use `npm run quality:ast-grep:scan` para auditoria estrutural ampla solicitada e `npm run quality:ast-grep:critical` para regras críticas; não adicione à rotina de alterações pequenas. Critérios canônicos em `.agents/skills/governanca-skills/SKILL.md`.
- **Supabase Advisors (`npm run advisors`)**: Obrigatório antes de qualquer migração para detectar RLS desabilitado, search_path vulnerável e índices faltantes.
- **React Compiler**: Habilitado nativamente no Mobile (`experiments.reactCompiler`) e validado no ERP via `eslint-plugin-react-compiler` (`npm run lint --prefix erp`).
- **Gitleaks (`npm run security:secrets`)**: Scanner de segredos. Primariamente focado para o CI, mas pode ser rodado localmente antes de commits específicos se for pertinente. Não rode automaticamente a cada tarefa.
- **Trivy (`npm run security:vuln`, `npm run security:sbom`)**: Scanner de vulnerabilidades (CVEs). Use em CI ou auditoria de segurança direcionada.
- **OpenTelemetry (`src/telemetry/tracer.ts`)**: Tracing padrão vendor-neutral para instrumentação de fluxos críticos de negócio com sanitização obrigatória de PII (LGPD).
