# Plano e Ideia: Alerta de Erro Fiscal via Ícone no Topo do Modal de Emissão

## Contexto e Solicitação do Usuário
- **Data:** 06/10/2026
- **Solicitação:** No modal de emitir nota fiscal (`NfeEmissionModal`), o card de aviso/erro da nota fiscal (`FiscalIssueCard`) não deve mais ficar em amostra inline na primeira etapa ("Informações Gerais" - `NfeGeneralTab`). Em vez disso, quando houver algum erro ou aviso na nota fiscal, deve aparecer um ícone de triângulo com exclamação de alerta (`bi-exclamation-triangle-fill`) lá em cima no cabeçalho (`NfeEmissionHeader`). Ao clicar nesse ícone, abre-se um modal dedicado contendo o card de aviso com todas as ações e detalhes técnicos. Desta forma, a primeira etapa permanece limpa e despoluída.

## Decisões de Arquitetura e Engenharia
1. **Modularização e Clean Code:**
   - Criação do componente `NfeFiscalIssueModal` em `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeFiscalIssueModal.tsx`.
   - Remoção do bloco inline do `FiscalIssueCard` de dentro de `NfeGeneralTab.tsx`.
   - Adição do trigger visual com ícone de triângulo de exclamação em `NfeEmissionHeader.tsx`.
2. **Usabilidade e Estados:**
   - O ícone só é exibido se houver erro ou pendência fiscal (`emissionResult && !emissionResult.success && issueCopy`).
   - O ícone possui indicação visual de alerta (tom correspondente, animação e badge acessível).
   - O modal pode ser aberto pelo clique no ícone do topo e fechado pelo botão "Fechar", botão 'X' ou clique fora (backdrop).
   - O ícone permanece disponível no topo durante a permanência do erro para consulta ou nova conferência em qualquer aba.
3. **Compatibilidade Dev / Prod:**
   - Funciona de forma idêntica tanto em Homologação (`environment=2`) quanto em Produção (`environment=1`).
4. **Testes Seguros:**
   - Garantir que todos os cenários de erro fiscal, rejeição SEFAZ, retentativa, divergência de snapshot e contingência funcionem abrindo o modal via trigger do ícone.
