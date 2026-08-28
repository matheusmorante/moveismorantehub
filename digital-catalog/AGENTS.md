# Regras do Projeto — Móveis Morante

- Siga princípios de código limpo e modularizado.
- Sempre salve ideias e planos pendentes em um arquivo (`ideias_planos.md`) para posterior consulta e lembrete.
- Economize o máximo de cota do plano de assinatura.
- Lembre que existem os ambientes de desenvolvimento e produção: deixe ajustado para cada um o que for fazer.
- Relate imediatamente bugs que estão impedindo o progresso para o usuário saber da demora enquanto continua resolvendo o problema.
- Sempre considere ambiente Dev e ambiente Prod ao configurar rotas, variáveis de ambiente e outros dados ambíguos para funcionar corretamente em ambos.
- Pergunte se tiver dúvida de ambiguidade ou entendimento no que o usuário disser ou mostrar.
- Salve as regras sempre em um arquivo do projeto (`AGENTS.md`).
- Fale apenas em Português Brasileiro.
- Siga as práticas de código limpo, padrões recomendados do React e a estrutura baseada em funcionalidades ("Feature-based Architecture") do Next.js (com pastas locais para components, hooks, types, api, etc., expondo apenas o que for público através de um arquivo `index.ts` na raiz da feature).


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
