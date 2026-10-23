# Histórico de correções fiscais — 23/10/2026

Este registro complementa o índice de vigência. Não altera as regras fiscais, snapshots de documentos, XMLs, transmissão SEFAZ ou histórico de documentos emitidos.

## Scanner da chave da NF de entrada com código de barras e leitura de texto

### Problema e sintomas

O scanner de chave da NF de entrada descrevia QR Code como opção, mas o DANFE modelo 55 apresenta a chave em código de barras linear. O quadro quadrado do scanner dificultava enquadrar esse código. Quando o código não era reconhecido, o app também encerrava o scanner antes de permitir usar a leitura do texto impresso. A interface usava “NF-e” como se significasse nota de entrada.

### Causa raiz

O modal de importação reutiliza `InventoryScannerScreen` com `accessKeyMode`, mas o componente configurava somente `qr` para todos os modos e aplicava uma moldura quadrada. O OCR da chave já existia, porém a interface não o apresentava claramente como alternativa ao código de barras; o manipulador também fechava o scanner quando a leitura não continha uma chave válida.

### Arquivos e linhas

- `mobile/src/features/stock/inventory/screens/InventoryScannerScreen.tsx:80,170,221,273,313` — usa o formato CODE-128 e moldura horizontal somente em `accessKeyMode`, mantém o QR no scanner de inventário e identifica a leitura OCR como alternativa para os 44 caracteres impressos.
- `mobile/src/features/stock/inventory/screens/inventory-scanner/inventoryScanner.styles.ts:94` — adiciona a moldura horizontal para a chave.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportModal.tsx:89,122-132,164,229-230` — renomeia o fluxo para NF de entrada, informa código de barras e OCR e mantém o scanner aberto caso o código lido não resulte em uma chave válida.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportAccessKeySection.tsx:32,36,58` — atualiza o título, validação visível e acessibilidade para NF de entrada.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportXmlUploadSection.tsx:21,37` — identifica a entrada e informa o formato eletrônico aceito, modelo 55.
- `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesPageHeader.tsx:57,117` — atualiza o botão de importação e a busca.
- `mobile/src/features/stock/invoices/utils/inboundXmlParser.ts:41,50` — corrige as mensagens de erro do parser de XML da entrada.
- `shared-utils/lookupFormSchemas.ts:15,19` — atualiza mensagens dos schemas de XML e chave da entrada.
- `docs/fiscal/README.md:9` — adiciona esta correção às referências atuais.

### Solução e limites

O modo de chave agora lê CODE-128, padrão do código de barras da chave no DANFE, e usa uma moldura horizontal. Se a leitura falhar, o operador pode acionar “Ler chave impressa” para reconhecer a chave de 44 caracteres; uma leitura inválida mantém o scanner aberto. O scanner de inventário conserva sua configuração anterior. Os rótulos desta operação passam a dizer “NF de entrada”; “nota fiscal eletrônica” é escrito por extenso ao descrever o documento eletrônico.

### Validação

A seção 2 do [MOC 7.0, Anexo II — Manual de Especificações Técnicas do DANFE e Código de Barras](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-ii-manual-especificacoes-tecnicas-danfe-codigo-barras.pdf) especifica CODE-128C para o código de barras da NF-e. Os tipos instalados do `expo-camera` incluem `code128`; a configuração alterada se aplica somente a `accessKeyMode`. Não foram executados testes automatizados nem leitura em dispositivo físico. Nenhum XML, registro fiscal, banco de dados ou comunicação com a SEFAZ foi alterado.

## DANFE NFC-e A4 preenche a tabela de itens em todas as folhas

### Problema e sintomas

O DANFE A4 da NFC-e 65 podia deixar uma área grande sem uso abaixo dos itens. Em documentos com mais de uma folha, as folhas de continuação também precisavam usar o espaço disponível para a tabela.

### Causa raiz

`danfeNfceA4.ts` já definia o paginador que separa os itens por capacidade de cada folha e acrescenta uma linha de preenchimento até o rodapé. Porém, a constante `DANFE_NFCE_A4_PAGINATION_SCRIPT` não era incluída no HTML retornado; o navegador imprimia o HTML inicial sem executar a paginação e o preenchimento.

### Arquivos e linhas

- `erp/src/pages/utils/nfe/danfe/danfeNfceA4.ts:11-242,1487-1489` — inclui no HTML o paginador existente antes de fechar o `body`; a lógica existente trata todas as folhas que contêm itens.
- `docs/fiscal/README.md:9` — adiciona esta correção às referências atuais.

### Solução e limites

O HTML agora executa o paginador depois de montar o documento. Ele divide os itens entre folhas, mantém o cabeçalho da tabela e aumenta a linha de preenchimento para ocupar o espaço restante em cada folha de itens. Dados, valores, QR Code e autorização continuam vinculados ao XML autorizado; o modelo 55 e o cupom de 80 mm não foram alterados.

### Validação

A inspeção confirmou que a constante estava definida, mas não era referenciada, e que o fallback de impressão inicia `window.print()` no evento `load`, após a execução do script inline no fim do HTML. Não foram executados testes automatizados, navegador ou impressão física nesta alteração; a confirmação visual da distribuição das linhas em diferentes navegadores permanece pendente. Nenhum dado, XML, banco ou comunicação com a SEFAZ foi alterado.

## Remoção do marcador legado do Bling dos pedidos

### Problema e sintomas

O contrato de pedidos ainda guardava `is_registered_in_bling` na tabela `orders`, no JSON de `order_data` e na RPC `save_order_transaction`. A remoção da integração Bling deixaria a gravação de pedidos quebrada se a coluna fosse removida sem atualizar a RPC e seus leitores/escritores.

### Causa raiz

O marcador era um campo residual da integração de importação e exportação Bling; nenhum fluxo atual precisa dele. A função transacional continuava incluindo a coluna em `INSERT`/`UPDATE`.

### Arquivos e linhas

- `supabase/migrations/20261023103833_remove_bling_and_settings_credentials.sql:1` — remove a coluna Bling da RPC e da view `order_list_items`, preserva `security_invoker`, proprietário e grants, e elimina a coluna física; limpa credenciais antigas de `public.settings` sem remover o identificador público `cscId`.
- `erp/src/pages/types/order.type.ts:99` — remove o campo do tipo `Order`.
- `erp/src/pages/utils/orderMapper/mapOrderFromDatabase.ts:16-21,124` — copia o JSON antes de sanitizar os dois nomes legados e grava o snapshot sem o estado Bling, sem modificar a linha de origem.
- `erp/src/pages/utils/orderMapper/orderMapperTypes.ts:30` — remove o campo do contrato do banco.
- `erp/src/pages/utils/orderPersistencePayload.ts:59-60,88` — remove o campo do payload físico e limpa caches antigos antes de salvar `order_data`.
- `erp/src/pages/utils/orderSyncQueries/orderSyncConstants.ts:11` — remove o campo da projeção usada nas consultas.
- `mobile/src/features/orders/services/mobileOrderListService.ts:26,167-172` — remove a coluna Bling da consulta e limpa o JSON legado antes de montar o item mobile.
- `erp/src/pages/utils/settings/migrations.ts:14-40` e `storage.ts:41-64` — eliminam segredos e configuração antiga do Bling das configurações/cache, sem apagar o `cscId` público.
- `erp/src/pages/utils/__tests__/orderMapper.test.ts:290`, `erp/src/pages/utils/__tests__/orderSnapshotResolution.test.ts:300` e `mobile/src/features/orders/services/mobileOrderListService.test.ts:181` — provam limpeza no mapeador, no payload salvo e na lista mobile.
- `erp/server/nfe/audit-order-edit.cjs:2345-2394` e `erp/server/nfe/audit-order-edit.cjs.map` — artefatos compilados regenerados sem o campo.

### Solução e limites

A migration falha antes de remover a coluna se a definição remota da RPC ou da view divergir dos trechos esperados. `order_list_items` é recriada sem o campo e mantém a configuração `security_invoker`, o proprietário e os grants atuais. A RPC deixa de ler/escrever a coluna e elimina os dois nomes legados quando pedidos forem salvos no futuro. Nenhuma linha antiga de `orders.order_data` é atualizada: a tentativa de limpeza ampla acionou as guardas de artefatos de teste e de devolução comercial (`RETURN_SOURCE_LINE_INVALID`), além de triggers fiscais/comerciais. Os marcadores antigos permanecem inertes para auditoria; nenhum snapshot fiscal, documento, evento, XML ou autorização é alterado.

Na leitura imediatamente anterior à aplicação, 316 pedidos tinham uma das chaves legadas em `order_data`. A pós-verificação confirmou que essas 316 cópias históricas foram preservadas. A auditoria recursiva das configurações não encontrou valores não vazios com nomes de token, segredo, senha, certificado ou chave de API após a limpeza.

O identificador público `cscId` permanece em `public.settings` e no formulário fiscal porque não é o segredo CSC; somente o token CSC e os dados do certificado são retirados do JSON compartilhado.

A publicação de produção foi concluída antes da migration. A chamada Supabase aplicou a migration registrada no histórico remoto como versão `20261023130851`, nome `20261023103833_remove_bling_and_settings_credentials`; a versão de histórico é gerada no momento da aplicação pelo conector. A implantação de produção mais recente é `dpl_8BqN79XPkSLtVfuPkF6WeWWdzkAk`, `READY`, com os aliases `morantehub.vercel.app` e `morantehub.com`.

### Validação

- Build ERP aprovado e implantação Vercel de produção em `READY`; os erros de tipagem do candidato foram corrigidos antes da implantação atual.
- 293 testes ERP passaram em 23 arquivos; os testes focados do candidato passaram 92/92 em sete arquivos. O Playwright de leitura da Inbox passou 1/1 na porta `5173`, com gravações comerciais bloqueadas.
- Pós-verificação remota: coluna `orders.is_registered_in_bling` ausente; RPC sem referência à coluna; `order_list_items` sem a coluna, com `security_invoker=true`, proprietário `postgres` e grants de leitura para `anon`, `authenticated` e `service_role`; credenciais antigas e configuração Bling ausentes; `cscId` preservado; 316 snapshots históricos inalterados.
