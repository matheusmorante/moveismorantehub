# Histórico de correções fiscais — 13/11/2026

## Padronização visual dos seletores fiscais de NCM

- **Problema identificado e sintomas:** os campos pesquisáveis de NCM não indicavam a seleção confirmada da mesma forma que os demais seletores do ERP. Um campo não mostrava check; outro usava estilos inconsistentes enquanto apresentava o código já associado à descrição fiscal.
- **Causa raiz técnica comprovada:** `ProductNcmSelector` e `NcmSelect` implementavam estados visuais próprios. A apresentação de um código válido e confirmado não era identificada de forma uniforme e não seguia o padrão visual solicitado para campos selecionados.
- **Arquivos e linhas modificados:**
  - `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx:224-240` — borda inferior verde e check para NCM com descrição confirmada, mantendo prioridade para erro de validação.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NcmSelect.tsx:186-215` — borda inferior verde e check para NCM válido com descrição, preservando a seta que abre a lista de opções.
- **Solução técnica implementada:** os dois campos usam a descrição confirmada como estado de seleção. Esse estado exibe a borda inferior verde, o ícone de check e texto em cor neutra; erros continuam com a indicação vermelha e a abertura do seletor permanece disponível. Nenhuma regra de classificação, validação, persistência ou transmissão fiscal foi alterada.
- **Testes e validações:** não foram executados testes automatizados nem transmissão fiscal; a alteração fiscal limita-se à apresentação. Foi executada a verificação estática `git diff --check`, sem erros de whitespace.
