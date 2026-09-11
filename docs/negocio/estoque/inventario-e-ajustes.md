# Inventário Físico e Ajustes de Estoque — Morante Hub

Este documento descreve o processo de contagem física, acerto de inventário, tratamento de sobras, faltas e baixas por avaria no Morante Hub.

---

## 📋 Fluxo do Inventário Físico

```mermaid
flowchart TD
    A[Iniciar Contagem de Inventário] --> B[Contagem Física por Variação / Depósito]
    B --> C{Comparar Saldo Físico x Saldo Sistema}
    C -- Saldo Físico == Saldo Sistema --> D[Sem divergência - Mantém registro]
    C -- Saldo Físico > Saldo Sistema (Sobra) --> E[Gera inventory_move tipo adjustment (+)]
    C -- Saldo Físico < Saldo Sistema (Falta) --> F[Gera inventory_move tipo adjustment (-)]
    E --> G[Atualiza Saldo da Variação no Banco]
    F --> G[Atualiza Saldo da Variação no Banco]
    G --> H[Registra Log Auditável com Usuário e Data]
```

---

## 🛠️ Baixas por Avaria ou Perda (`loss`)

- **Conceito**: Quando uma mercadoria é danificada no depósito, transporte ou manuseio, é realizada uma baixa por avaria (`loss`).
- **Impacto no Custo**: A movimentação tipo `loss` reduz o saldo físico da variação consumindo o CMPM vigente da peça, mas **não** altera o CMPM unitário das peças restantes.
- **Transparência**: O motivo da baixa e o número da ocorrência são gravados no campo `observation` da movimentação.

---

## 🔗 Mapeamento em Código e Testes

- **Serviço**: `[inventoryService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/inventoryService.ts)` → `saveInventoryMove()`
- **Testes de Proteção**: `[latestRulesBattery.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/latestRulesBattery.test.ts)`
