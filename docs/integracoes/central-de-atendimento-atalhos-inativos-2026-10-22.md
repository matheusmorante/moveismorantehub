# Central de Atendimento — atalhos sem função

**Data:** 22/10/2026  
**Estado:** correção local implementada, validada e compilada em candidato isolado; este lote ainda não foi publicado.

## Problema e causa

O compositor mostrava controles de emoji, gravação de áudio, anexos, variáveis/tags, troca de canal, assistente de IA e expansão do editor sem comportamento implementado. Embora desativados, pareciam ações disponíveis. O rótulo “Whatsapp” também parecia abrir um seletor que não existia.

## Correção

Foram removidos esses controles sem função e transformado o canal atual em uma indicação estática. Snippets e comentários internos continuam disponíveis. O botão de envio permanece desativado, com o motivo da política visível; nenhum caminho de despacho foi alterado.

Arquivos alterados:

- `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx`
- `erp/src/pages/App/CustomerSupport/__tests__/customerSupportInbox.test.tsx`
- `erp/tests/support-readonly/support-login.spec.ts`

## Validação

- Vitest/RTL focado: **17/17** testes aprovados.
- Playwright somente leitura: **1/1** aprovado na porta **5173**, com credenciais carregadas do ambiente Vercel Development. Verificou login autônomo, Inbox, filtros/pasta, ausência dos atalhos e bloqueio visual do envio.
- A guarda do teste rejeitou gravações de negócio; nenhuma conversa, comentário ou mensagem foi criado.
- A primeira execução não encontrou Chrome em CDP `9225`; uma janela dedicada foi aberta apontando para `localhost:5173` e o mesmo teste então passou. A janela ficou aberta para inspeção.
- ESLint focado nos dois arquivos da aplicação: passou sem erros. O arquivo Playwright é ignorado pela configuração ESLint do ERP; o runner Playwright compilou e executou a especificação com sucesso.

## Limites

Build completo do candidato isolado: aprovado (`npm run build`, ERP, 1m44s); Vite transformou 5.912 módulos. Permaneceram apenas os avisos de chunks acima de 500 kB e comentários `@__PURE__` de dependência.

O candidato foi montado sobre a cópia congelada do deploy atual, com cinco caminhos selecionados e manifesto SHA-256 em `C:\Users\mathe\morantehub-central-inactive-shortcuts-release-20261022\release-manifest.json`.

Este lote não tem autorização de publicação própria. O envio continua bloqueado no frontend e backend.
