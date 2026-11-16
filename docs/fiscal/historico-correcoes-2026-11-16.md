# Histórico de correções fiscais — 16/11/2026

## Ordem visual dos ambientes fiscais na escolha de emissão

**Problema e sintomas.** No modal de escolha do ambiente fiscal, o cartão Produção aparecia à direita de Homologação em telas com duas colunas. O operador pediu que Produção fique à esquerda.

**Causa técnica.** O cartão Homologação era o primeiro item do grid e Produção o segundo; a ordem automática do grid seguia a ordem do JSX.

**Arquivos e pontos alterados.**

- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeEnvironmentChoiceModal.tsx:235` e `:270`: classes de ordem CSS dos cartões de Homologação e Produção, respectivamente.
- `docs/fiscal/README.md`: referência atual a este histórico.

**Solução e compatibilidade.** Produção recebeu `order-1` e Homologação `order-2`, posicionando Produção primeiro (à esquerda em duas colunas e acima em coluna única). Handlers, valores `tpAmb`, regras de bloqueio, textos de confirmação e transmissão fiscal não foram alterados.

**Validação e limites.** Testes dinâmicos não foram executados: a alteração é exclusivamente visual e não modifica o fluxo fiscal. Não houve seleção de ambiente, emissão ou transmissão à SEFAZ.
