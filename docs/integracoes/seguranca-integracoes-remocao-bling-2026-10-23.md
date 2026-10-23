# Segredos de integrações e remoção do Bling — 23/10/2026

## Achado

Configurações privadas de Meta/WhatsApp, Gemini, mapas e certificado fiscal eram mantidas no JSON compartilhado `public.settings.data`. Essa linha é carregada no navegador e também pode ficar no `localStorage`, portanto campos de segredo não devem permanecer nela. A integração Bling também tinha telas, rotas, serviços, scripts e um marcador técnico em pedidos.

## Mudanças preparadas

- O frontend não recebe mais tokens Meta/WhatsApp, chaves Gemini/Maps de servidor, credenciais de certificado ou o segredo CSC. `migrateSettings` e o cache local eliminam cópias legadas; a migration remota limpa o JSON compartilhado. O `cscId` permanece como identificador público usado no QR Code da NFC-e.
- As consultas Meta, Gemini e Google Routes passam pelo handler autenticado `erp/api/secure-integrations.ts`, que usa `WHATSAPP_ACCESS_TOKEN`, `GEMINI_API_KEY` e `GOOGLE_MAPS_API_KEY` apenas no servidor. Os contratos de mídia e recebimento permanecem; o envio da Central continua bloqueado.
- O webhook e o proxy de mídia usam somente variáveis de ambiente, sem fallback para `public.settings`.
- A auditoria recursiva de `public.settings` encontrou somente `geminiApiKey`, `googleMapsApiKey`, `openRouteServiceApiKey` e `whatsappConfig.accessToken` com nomes de segredo. Em 23/10, os valores atuais de Gemini, Maps server-side e WhatsApp foram copiados em memória para as variáveis Vercel `sensitive/secret`, sem expor valores em saída ou arquivos. `GEMINI_API_KEY` e `GOOGLE_MAPS_API_KEY` cobrem Development, Preview e Production; `WHATSAPP_ACCESS_TOKEN` permanece apenas em Production. `openRouteServiceApiKey` está vazio e não tem consumidor ativo, então será removido sem criar variável sem uso.
- As telas, serviços, rotas, funções, importadores e scripts operacionais do Bling foram removidos. As únicas referências restantes no runtime limpam configurações e marcadores antigos para impedir que reapareçam; o registro histórico de migrações e backups permanece para auditoria e recuperação. O projeto Supabase não lista Edge Functions Bling ativas e o projeto Vercel não tem variáveis Bling.
- A migration também elimina a permissão `viewBlingStock`, mapeamentos de importação Bling e o campo `orders.is_registered_in_bling` com suas cópias em `order_data`. A view mobile `order_list_items` é recriada sem esse campo, mantendo `security_invoker` e os grants vigentes. A última leitura remota encontrou 720 marcadores verdadeiros, 400 falsos e 319 cópias JSON; somente esses metadados legados serão apagados. `cscId` e os demais dados da empresa permanecem.

## Configuração de ambiente

Os segredos de integração permanecem como variáveis Vercel com tipo `sensitive`/visibilidade `secret`, incluindo `WHATSAPP_ACCESS_TOKEN` (somente Production), `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, segredos CSC/certificado fiscal, `SUPABASE_SECRET_KEY` e o segredo R2. Os valores não foram impressos nem incluídos nesta documentação.

O `VITE_GEMINI_API_KEY` antigo foi removido. As credenciais do operador fiscal foram renomeadas para `NFE_HML_TEST_OPERATOR_EMAIL` e `NFE_HML_TEST_OPERATOR_PASSWORD` e marcadas como secret; `R2_ACCESS_KEY_ID` também foi marcado como secret.

`VITE_GOOGLE_MAPS_API_KEY`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam sendo configurações públicas necessárias ao cliente web. A chave Maps com prefixo `VITE_` fica visível no navegador e não é segredo; mantenha-a restrita por domínio e APIs. A chave server-side `GOOGLE_MAPS_API_KEY` é separada e atende ao Routes API.

## Migration e publicação

O código e a migration estão preparados, mas ainda não foram publicados nem aplicados ao Supabase. A ordem segura é publicar a versão compatível primeiro e, em seguida, aplicar `supabase/migrations/20261023103833_remove_bling_and_settings_credentials.sql`. A alteração remove os campos antigos de segredo e dados residuais do Bling; a restauração desses valores exige backup. Não foram criados pedidos, clientes ou outras fixtures nesta etapa.

## Validação executada

- Build do ERP passou após as alterações finais: 11/12 slots de API Vercel, verificações de inicialização fiscal e XSD, 5.903 módulos Vite. Permaneceram avisos de empacotamento já existentes, sem falha de build.
- A suíte completa Vitest passou: 293 testes em 23 arquivos.
- No candidato final, 92 testes Vitest focados passaram em sete arquivos: proxy de mídia, migração das configurações, fronteira de segredos Meta, consultas Meta e remoção de marcadores Bling.
- O Playwright de leitura da Inbox passou na porta `5173`; a suíte impediu gravações comerciais.
- Metadados Vercel rechecados sem descriptografar valores; credenciais privadas listadas como `sensitive/secret`, `VITE_GEMINI_API_KEY` removida, a chave pública Maps mantida com uso restrito e nenhum segredo Bling encontrado.
- Edge Functions do projeto remoto consultadas somente por metadados; nenhuma função Bling ativa.
