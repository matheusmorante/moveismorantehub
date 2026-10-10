# Alerta fiscal no modal de emissão — decisão implementada

**Estado verificado em 09/10/2026:** a proposta original de retirar o alerta inline e exibi-lo por ícone no cabeçalho foi implementada. Este arquivo registra a decisão; não é mais um plano pendente. O status dos testes fica em [status-testes-homologacao.md](status-testes-homologacao.md).

## Comportamento e código atuais

- [`NfeEmissionModal.tsx`](../../erp/src/pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx) deriva a apresentação do problema e controla abertura/fechamento do modal fiscal.
- [`NfeEmissionHeader.tsx`](../../erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeEmissionHeader.tsx) apresenta o ícone de alerta e chama a abertura do modal.
- [`NfeFiscalIssueModal.tsx`](../../erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeFiscalIssueModal.tsx) contém o `FiscalIssueCard` e as ações de orientação/recuperação.
- A aba geral não renderiza mais o card de erro inline. O modal de detalhe aceita ocorrências de preparação e de transmissão, sujeito à disponibilidade de conteúdo de apresentação.
- Há cobertura de componentes em `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/__tests__/nfeEmissionComponents.test.tsx`. Este registro documental não reexecutou esses testes; consulte o status central para a execução mais recente.

## Requisitos originais preservados

Solicitação registrada em 06/10/2026: manter a etapa inicial mais limpa, exibir um ícone de alerta no cabeçalho e disponibilizar os detalhes técnicos e ações do `FiscalIssueCard` em modal dedicado. A implementação deve continuar apresentando o estado fiscal sem descartar a tentativa nem iniciar uma nova transmissão automaticamente.
