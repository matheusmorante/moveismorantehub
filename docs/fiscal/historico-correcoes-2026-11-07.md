# Histórico de correções fiscais — 07/11/2026

## Cabeçalho do recebimento de mercadoria extraído

**Problema e causa:** `NewGoodsReceiptModal.tsx` coordenava o recebimento e também montava inline seu cabeçalho com título, etapa/origem da nota e ações de voltar/fechar. Não havia falha observada; a apresentação era uma responsabilidade separável do estado e dos efeitos do recebimento.

**Solução e preservação:** o JSX do cabeçalho foi movido para `ReceiptHeader.tsx`. O modal continua proprietário da etapa, origem, estado de salvamento e handlers assíncronos; fornece os mesmos valores e callbacks ao componente no ponto original. Textos, precedência do subtítulo, condições, acessibilidade, estilos e estados disabled foram preservados.

**Arquivos e linhas:** `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx` (1138 linhas; import e chamada do cabeçalho nas linhas 54 e 869), novo `mobile/src/features/stock/receipts/modals/ReceiptHeader.tsx` (57 linhas), `mobile/src/features/stock/receipts/screens/ReceiptsScreen.tsx:381` (chamador revisado, sem alteração), inventário de arquivos grandes, este índice e este histórico.

**Revisão e validação:** ordem das etapas, título, fallback da numeração da NF-e, condições de voltar/fechar, callbacks, estilos e estrutura visual foram comparados estaticamente com o bloco anterior. A exportação e as props públicas de `NewGoodsReceiptModal` e o chamador em `ReceiptsScreen` permanecem iguais. A refatoração não alterou validação, consulta, persistência, vínculo de nota, estoque ou passos operacionais; o guia prático não precisou de atualização. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso a banco, chamada externa, operação ou transmissão fiscal.

## Apresentação dos registros de correlação NCM extraída

**Problema e causa:** `NcmManagementPanel.tsx` coordenava o catálogo e também apresentava o estado vazio e cada registro de correlação. Não foi identificado defeito funcional; esse bloco visual é uma responsabilidade separável da consulta, do formulário de registro e da seleção de sucessor.

**Solução e preservação:** a apresentação foi movida para `NcmCorrelationRecords.tsx`. O painel fornece as correlações, código selecionado, permissão, situação, presença de produtos e callback existentes. Foram mantidos a ordem e os dados renderizados, o link MDIC, a validação de `https://` para a fonte, o cálculo de relações de saída não ambíguas e todas as condições para oferecer a seleção de sucessor. Consulta, estado, validação, submissão e operação continuam no painel.

**Arquivos e linhas:** `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx` (809 linhas; import na linha 19 e integração nas linhas 760–767), novo `erp/src/pages/App/Settings/components/fiscal/NcmCorrelationRecords.tsx` (88 linhas), `erp/src/pages/App/Settings/components/fiscal/FiscalSettingsSection.tsx:495` (chamador revisado, sem alteração), `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.test.tsx:4` (export público revisado, sem alteração), inventário de arquivos grandes, este índice e este histórico.

**Revisão e validação:** o JSX anterior e o extraído foram comparados estaticamente: mensagens, atributos, classes, campos, critério de ambiguidade, ordem e guarda completa do botão permanecem equivalentes, com apenas substituição dos dados locais por props. O export nomeado e o caminho de import do painel continuam iguais. Nenhuma consulta, permissão, regra de negócio ou validação RHF/Zod foi alterada. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso a banco, chamada externa, operação ou transmissão fiscal.
