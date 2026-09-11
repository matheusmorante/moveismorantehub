# Desfazer e Estorno de Devolução — Morante Hub

Este documento descreve as regras de reversão de devoluções no Morante Hub, incluindo os mecanismos de proteção e o timer de segurança de 5 segundos.

---

## ⏱️ Trava de Segurança e Reversão

1. **Modal de Confirmação com Timer de 5 Segundos**:
   - Acionar a opção "Desfazer Devolução" abre um modal de confirmação com um timer regressivo obrigatório de 5 segundos.
   - O botão de confirmação permanece bloqueado até o término da contagem, prevenindo acionamentos acidentais por duplo clique.
2. **Efeito Compensatório no Estoque**:
   - O estorno da devolução gera uma saída compensatória deduzindo a quantidade que havia entrado pela devolução, restaurando o saldo exatamente ao estado anterior.
3. **Cancelamento do Crédito Financeiro**:
   - Estorna os lançamentos de crédito gerados pela devolução no módulo financeiro.

---

## 🔗 Mapeamento em Código e Testes

- **Operação de Reversão**: `[orderLifecycleOperations.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderLifecycleOperations.ts)` → `undoReturn()`
- **Testes de Proteção**: `[divergenciasCorrecao.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/divergenciasCorrecao.test.ts)`
