# Histórico de correções fiscais — 23/10/2026

Este registro complementa o índice de vigência. Não altera as regras fiscais, snapshots de documentos, XMLs, transmissão SEFAZ ou histórico de documentos emitidos.

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

- `supabase/migrations/20261023103833_remove_bling_and_settings_credentials.sql:1` — remove referências da RPC, elimina os dois nomes legados de `order_data`, recria `order_list_items` sem a coluna Bling preservando `security_invoker`, proprietário e grants, e prepara o descarte da coluna; também limpa segredos antigos das configurações compartilhadas, preservando `cscId`.
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

A migration falha antes de remover a coluna se a definição remota da RPC ou da view divergir dos trechos esperados. `order_list_items` é recriada sem o campo e mantém a configuração `security_invoker`, o proprietário e os grants atuais. O restante do objeto `order_data` é preservado, exceto pelas duas chaves do marcador. Nenhum campo de snapshot fiscal, documento, evento, XML ou autorização é alterado.

Na última leitura de metadados do projeto operacional, havia 720 pedidos com o marcador booleano verdadeiro e 400 com o valor falso; 319 pedidos tinham cópia do marcador em `order_data`. A aplicação da migration removerá esses dados legados. A migration ainda não foi aplicada; o rollback dos valores removidos depende de backup.

O identificador público `cscId` permanece em `public.settings` e no formulário fiscal porque não é o segredo CSC; somente o token CSC e os dados do certificado são retirados do JSON compartilhado.

### Validação

- `npm run build` executado em `erp`: compilação concluída, 12/12 funções Vercel dentro do limite e handlers fiscais nativos carregados; Vite compilou 5.904 módulos.
- 130 testes ERP passaram em dez arquivos; mais 9 testes do serviço de pedidos mobile passaram. O Playwright de leitura da Inbox passou na porta `5173`, com a guarda de gravação comercial ativa.
- A verificação do banco após a migration permanece pendente porque a publicação ainda não foi aprovada.
