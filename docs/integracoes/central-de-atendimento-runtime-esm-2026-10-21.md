# Central — correção de inicialização ESM em 21/10/2026

## Falha observada

A primeira implantação isolada, `dpl_CSkLU7s6zGteuYWYuRACDFZHWfVZ`, terminou READY. A suíte Vitest pela CLI autenticada recebeu HTML 200 e seis respostas 500 nas rotas WhatsApp; a versão não foi promovida ao domínio principal. O build completo anterior validava a inicialização fiscal e o frontend; o teste HTTP local empacotava o WhatsApp com esbuild. Essas provas não detectavam resolução nativa de imports ESM do WhatsApp.

Logs reais, consultados com `vercel logs --no-branch` e filtro da implantação, confirmaram `ERR_MODULE_NOT_FOUND`: o Node tentou resolver `/var/task/erp/src/pages/utils/customerSupport/whatsappMediaProxy` a partir de `erp/api/whatsapp-webhook.js`. A ausência de extensão causava a falha antes do handler. A CLI de logs precisa desativar o filtro automático da branch para essa implantação manual. Nenhum segredo ou conteúdo de mensagem foi incluído na evidência.

## Correção

Imports relativos do grafo compartilhado agora usam a extensão de saída `.js`; imports exclusivamente de tipo foram explicitados. O formato das requisições/respostas, permissões, SQL e política de envio permanecem com as mesmas regras.

| Arquivo | Linhas | Alteração |
| --- | --- | --- |
| `erp/api/whatsapp-webhook.ts` | 3, 10 | Dois imports de implementação com `.js` |
| `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts` | 2–4 | Tipo Supabase e imports de telefone/matching |
| `erp/src/pages/utils/customerSupport/customerMatchingService.ts` | 1–3 | Tipo Supabase e imports de timeout/telefone |
| `api/whatsapp-media.ts` | 2–3 | Imports de configuração e proxy |
| `api/whatsapp-webhook.ts` | 3, 9 | Imports de configuração e processador |

As duas entradas de webhook e a entrada de mídia usam o mesmo grafo compatível. Não foi criada outra implementação do processador nem alterada a política de retry investigada separadamente.

## Prova e publicação corretiva

A primeira versão de `customerSupportNativeApi.test.ts` transpilava somente a sintaxe dos nove arquivos do grafo em ESM, conservava os limites dos pacotes e importava os módulos em um processo Node real. Usava ambiente mínimo e `fetch` proibido. Falhou antes com o módulo ausente e passou depois: mídia 401, despacho 403, mídia standalone 401 e segredo ausente em produção 503, com zero chamadas de rede. Essa prova ainda não reproduzia a diferença de compilação da Vercel entre os pacotes da raiz e do ERP.

A suíte consolidada passou em **192 testes/20 arquivos**, incluindo esse caso e seis negativas anônimas reais. A verificação HTTP publicada é uma suíte separada em `tests/support-deployment/guards.test.ts`: origem restrita, vínculo do projeto conferido, autenticação da proteção pela CLI, sem segredo em argumentos/evidências, somente HTML e comandos destinados à recusa. A primeira forma de URL foi corrigida para o contrato da CLI instalada: caminho com `--deployment` explícito. Falhas de transporte e falhas da aplicação ficaram registradas separadamente.

O ajuste técnico necessário será incluído na republicação autorizada. A cópia original/manifesto e o identificador da tentativa anterior são preservados para auditoria; a revisão terá um manifesto próprio. Não promover enquanto as sete verificações HTTP não passarem. A contração dos privilégios legados continua condicionada ao frontend compatível publicado e às provas próprias anteriores.

Logs locais ignorados: `scratch/central-support-native-startup-before-2026-10-21.log`, `scratch/central-inbox-unit-2026-10-21.log` e os JSON de diagnóstico/verificação da implantação. A massa remota permanece encerrada com 51 conversas arquivadas e 190 mensagens/eventos retidos; não foi reutilizada.

## Segunda falha publicada: tipos de módulo diferentes

A revisão `dpl_6oMYsCVThdUKSKFSazDRE2kzRU54`, manifesto `CEBC1029E07FB696A5500EA020D361019C98943B9CE0BC469FF0929F289819A8`, também ficou READY e entregou HTML 200, mas as seis verificações de API retornaram 500. Os logs reais identificaram outra causa: `shared-utils/withTimeout.js` não oferecia o export nomeado `withTimeout` ao módulo ESM. O pacote raiz não declara `type`, enquanto `erp/package.json` declara `module`; a transpilação inteiramente ESM do teste anterior não equivalia a esse artefato. Essa revisão também não foi promovida.

O build da Central agora segue a borda CJS explícita já usada pelo projeto. `erp/scripts/build-customer-support.cjs` empacota o processador canônico e seus utilitários relativos em `erp/server/customer-support/whatsapp-processor.cjs`, mantendo pacotes externos. As duas entradas de webhook importam o objeto CJS por default e extraem as mesmas funções. A lógica de recebimento, HMAC, contratos HTTP, prazos e bloqueio de envio não foi duplicada ou alterada. O script também produz o bundle HTTP local já existente; `scripts/build-customer-support-api.cjs` delega ao mesmo produtor. Nenhum tipo global de pacote foi mudado.

`erp/package.json` executa `build:support` depois do build fiscal no build completo e antes de Vitest em `test:unit`; `.vercelignore` inclui somente o novo script necessário. Os artefatos continuam ignorados pelo Git. A declaração `.d.cts` importa somente os tipos da implementação canônica.

A prova nativa foi reforçada: copia as fontes para um diretório próprio, executa o produtor real, transpila somente as entradas públicas e o proxy, e importa as APIs no Node. Não emite `whatsappWebhookProcessor.js` nem `withTimeout.js` externos: as entradas precisam usar o artefato CJS produzido. Confere as recusas 401/403/401/503, uma assinatura HMAC sintética válida pelo export compilado, payload vazio sem mensagens e zero rede. O subconjunto passou em 65 testes; a suíte consolidada posterior passou em 192 testes/20 arquivos. A terceira tentativa continua condicionada ao build isolado e às sete verificações HTTP na Vercel.
