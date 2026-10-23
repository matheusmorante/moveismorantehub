# Modelos copiáveis sem dados de demonstração — 22/10/2026

## Problema e causa comprovados

O catálogo fixo `DEFAULT_QUICK_SNIPPETS`, em `erp/src/pages/utils/customerSupport/customerSupportService.ts`, continha chave PIX/CNPJ, endereço, horários e estacionamento sem fonte oficial confirmada. Outros modelos afirmavam consulta de pedido, preparação logística, garantia e abertura imediata de protocolo; a saudação identificava um atendente virtual, embora a Central não tenha IA ativa.

`QuickSnippetsModal.tsx:39` copia diretamente o conteúdo do catálogo para o clipboard e mostra feedback. Não consulta dados comerciais nem abre protocolo. O bloqueio de envio não impede copiar esses textos para uso manual em outro lugar. A causa é conteúdo demonstrativo apresentado como informação operacional, não falha no processador ou na autenticação.

## Correção local

Os cinco modelos continuam disponíveis com os mesmos IDs, categorias e atalhos. Os textos agora orientam conferir os dados reais antes de informar pagamento, endereço, entrega ou próximos passos de assistência. A saudação não declara IA nem identidade fictícia. Três títulos foram ajustados para descrever a orientação/consulta oferecida.

Nenhuma chave PIX ou dado comercial real foi inferido, consultado ou embutido. Não houve cadastro de modelos, nova configuração, protocolo, automação ou ação comercial. Cópia com feedback e bloqueio de despacho foram preservados.

## Provas

- Antes da correção: seis regressões válidas falharam e 43 testes passaram nos dois arquivos focados. Cinco conferem o conteúdo dos modelos; uma comprova que a cópia ainda carregava a chave de demonstração.
- Depois: **49/49** nos mesmos arquivos. O teste de cópia também observa `createInternalNoteMessage` e confirma zero chamadas.
- Suíte da Central: **262 aprovados/seis checks remotos sem opt-in ignorados**, 25 arquivos, 8,59s.
- ESLint do serviço e dos dois testes: aprovado, sem diagnóstico.
- TypeScript do harness de suporte: aprovado, sem novo gate TypeScript global.
- Playwright visível: **1/1 em 27,7s**, porta 5173. Modelo PIX neutro exibido, clique normal em Copiar e confirmação de `writeText` pela UI; zero escrita operacional encaminhada.
- Conjunto com a correção de posicionamento do painel: **263 aprovados/seis ignorados**, 25 arquivos. A compilação do candidato isolado terminou com código 0 em **1m52s** (`scratch/central-support-neutral-panel-build-retry-2026-10-22.log`). A primeira tentativa não deixou resultado conclusivo; depois de confirmar que o processo e a sessão tinham terminado, a repetição foi executada sobre os mesmos arquivos e registrou `✓ built in 1m 52s`. O Vite também registrou avisos não fatais sobre anotações Rollup e tamanho de chunks; o maior chunk listado foi 9.712,43 kB.

A leitura adicional do clipboard do sistema não respondeu: primeiro consumiu o prazo geral e depois excedeu uma etapa diagnóstica de 3s. A escrita nativa já havia sido confirmada pela UI. A versão final exige somente permissão de escrita, não relê o clipboard, e confere o argumento no RTL. A limitação é registrada sem apresentar o diagnóstico como teste de produto aprovado.

A primeira prova Playwright desta rodada excedeu os 15s de `page.goto('/login')`, antes do preenchimento de credenciais. ERP 5173, API 3000 e browser CDP foram conferidos saudáveis depois da falha; a causa profunda desse timeout ainda não está comprovada. A repetição usa o mesmo browser e os mesmos serviços, sem editar autenticação ou aumentar prazo por suposição.

Logs em `scratch/central-support-snippets-before-2026-10-22.log`, `central-support-snippets-after-2026-10-22.log`, `central-support-snippets-central-2026-10-22.log`, `central-support-snippets-eslint-2026-10-22.log`, `central-support-snippets-harness-tsc-2026-10-22.log`, `central-support-snippets-playwright-2026-10-22.log`, `central-support-neutral-panel-clipboard-diagnostic-2026-10-22.log`, `central-support-neutral-panel-playwright-approved-2026-10-22.log` e `central-support-neutral-panel-build-retry-2026-10-22.log`.

## Arquivos e limite da publicação

O candidato isolado combina dois arquivos de execução: `customerSupportService.ts` (modelos) e `CustomerInfoPanel.tsx` (painel contextual), oito caminhos alterados no total e 29 caminhos selecionados. Os outros sete caminhos são testes, harness e documentação. Provas de modelos em `customerSupport.test.ts`, `customerSupportInbox.test.tsx` e no cenário opt-in `SUPPORT_READONLY_SNIPPETS` de `erp/tests/support-readonly/support-login.spec.ts`; prova do painel em `customerSupportLinkForms.test.tsx` e no mesmo fluxo Playwright.

A produção observada continua no pacote combinado `dpl_7G4wF7TZaPgWRxd4sVwubwSKd6NL`. Este candidato passa a ter compilação local aprovada, mas ainda não tem manifesto final nem publicação autorizada. A composição mantém os nove arquivos de execução já publicados e inclui apenas os dois deltas de execução indicados acima; nenhum snapshot anterior pode substituir a produção inteira sem essa composição conferida.

Sem escrita operacional, migration, fixture, envio à Meta, commit ou push. Os runs graváveis anteriores continuam encerrados; a prova UI usará somente histórico próprio retido e guardas de bloqueio de escrita. A pesquisa G/H/I e a entrevista de novas funcionalidades permanecem separadas desta correção técnica de dados demonstrativos.
