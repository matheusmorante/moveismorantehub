# Segurança das configurações compartilhadas — 22/10/2026

## Achado confirmado

Uma leitura somente de metadados e predicados booleanos no projeto Supabase operacional confirmou:

- `public.settings` tem a política `Authenticated can read settings`, com `SELECT` e `USING (true)` para o papel `authenticated`.
- A linha `id='app'` possui valores não vazios nos campos `whatsappConfig.accessToken`, `geminiApiKey` e `blingConfig.clientSecret`. `googleMapsApiKey` também está preenchida, mas precisa ser classificada como chave pública ou segredo e ter suas restrições verificadas.
- Nenhum valor secreto foi consultado, impresso ou armazenado como evidência. Esta verificação não prova acesso pelo papel `anon`.

No código, `settings/storage.ts` lê a coluna integral `data` e mantém a configuração no estado do cliente e em `localStorage`. A tela de configuração de WhatsApp mostra o token em um campo de texto e `metaHttpClient.ts` o utiliza como Bearer em chamadas feitas pelo navegador. A proteção do proxy de mídias não impede que uma sessão autenticada consulte diretamente a linha de configurações.

O achado atravessa integrações além da Inbox. A correção precisa incluir consumidores Meta, Gemini, Bling e mapas, além de classificar o fallback `VITE_GEMINI_API_KEY`. Ocultar campos na tela da Central não resolve a leitura direta da tabela e pode interromper outros módulos.

## Contenção e situação

- O envio de mensagens da Central continua bloqueado no frontend e no backend.
- Nenhuma migration, atualização da linha, rotação de credenciais ou publicação foi executada para este achado.
- Uma proposta de arquitetura, transferência server-side, preservação das configurações públicas, testes e rotação posterior está registrada no dossiê de auditoria em `79-proposta-segredos-servidor-2026-10-22.md`, acompanhada pela evidência booleana `80-achado-token-compartilhado-2026-10-22.json`.
- A mudança abrange módulos fora do escopo da Inbox e requer uma autorização separada para o escopo de produto e outra aprovação explícita antes de qualquer migration remota, conforme `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`.

## Próximo trabalho técnico

Antes de qualquer alteração remota, preparar um candidato completo que inventarie campos e consumidores, mova credenciais privadas para armazenamento acessível apenas pelo backend, exponha ao navegador uma projeção sanitizada e preserve as demais configurações. A migration precisa comparar origem e destino sem revelar valores, bloquear leituras diretas por qualquer JWT e ter rollback definido. A rotação só pode ocorrer depois de validar os novos caminhos protegidos.

## Revalidação e inventário inicial — 23/10/2026

O catálogo remoto foi consultado novamente no projeto `hkoxhourxwlddgsfdgws`, sem selecionar conteúdo da configuração. `public.settings` segue com RLS habilitada, `anon` sem `SELECT`, `authenticated` com `SELECT` e a política `Authenticated can read settings` usando `true`. A tabela contém apenas `id`, `data` (`jsonb`) e timestamps; as credenciais e demais configurações compartilham o mesmo documento JSON.

Busca estática em arquivos de runtime, excluindo testes e artefatos compilados, encontrou acessos `.from('settings')` em **27 arquivos**. Referências aos campos/grupos foram encontradas em **17 arquivos Meta/WhatsApp**, **9 Gemini**, **7 Bling** e **11 mapas**; os grupos se sobrepõem. Os caminhos localizados incluem `settings/storage.ts` (carga integral para estado/cache local), `metaService/*`, `productMetaCatalogSync.ts`, `safeSender.ts`, `warrantyWhatsAppService.ts`, `AiGateway.ts`, `geminiClient.ts`, `blingService.ts` e `utils/maps/*`. São contagens de busca direta, não um grafo transitivo fechado: consumidores via `getSettings()` e nomes de configuração indiretos ainda precisam ser percorridos antes do desenho final.

O risco continua restrito a sessões autenticadas; esta conferência não demonstrou acesso anônimo. Nenhum valor foi lido, nenhuma chamada externa ocorreu e não houve DDL ou alteração de configuração. Esconder o campo na tela ou corrigir apenas o proxy de mídia deixaria a leitura direta do documento disponível; a próxima correção precisa migrar a projeção e os consumidores em conjunto, preservando os usos comerciais, fiscais, Meta, Gemini, Bling e mapas.

## Implementação server-side e remoção do Bling — 23/10/2026

O candidato transversal foi implementado e validado localmente. Os campos secretos agora são removidos pelo migrador de configurações/cache; Meta, Gemini e Google Routes usam proxies autenticados com variáveis Vercel server-side. O envio na Central permanece bloqueado. As rotas, telas, serviços, funções e scripts operacionais do Bling foram retirados; sobram apenas referências para limpar estado legado. Detalhes, nomes de variáveis e limites da migration estão em [segredos de integrações e remoção do Bling — 23/10](seguranca-integracoes-remocao-bling-2026-10-23.md).

A publicação e a migration remota ainda estão pendentes. A autorização anterior de publicação foi aplicada ao pacote anterior, e a migration não foi executada nesta etapa.
