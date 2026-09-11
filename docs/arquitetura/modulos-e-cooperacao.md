# Módulos e Cooperação entre Sistemas — Morante Hub

Este documento é o guia canônico de como os módulos do ERP Web e do App Mobile se relacionam, cooperam e mantêm dependências funcionais sem acoplamento nocivo.

---

## 🗺️ 1. Grafo de Dependências entre Módulos do Sistema

```mermaid
flowchart LR
    subgraph VENDAS["Módulo de Vendas"]
        VendaDraft[Rascunho Pedido]
        VendaAgendada[Venda Agendada]
        VendaAtendida[Venda Atendida]
    end

    subgraph ESTOQUE["Módulo de Estoque"]
        SaldoFisico[(Saldo por Variação UUID)]
        CMPM[Custo Médio Ponderado - CMPM]
        InvMoves[Movimentações inventory_moves]
    end

    subgraph RECEBIMENTO["Módulo de Recebimentos & NF-e"]
        RecManual[Recebimento sem NF]
        RecNFe[Importação XML NF-e]
        RecPedido[Recebimento por Pedido]
    end

    subgraph DEVOLUCAO["Módulo de Devoluções"]
        DevVinculada[Devolução de Venda]
        DevLivre[Devolução Avulsa]
    end

    subgraph FINANCEIRO["Módulo Financeiro"]
        Receber[Contas a Receber]
        Pagar[Contas a Pagar]
        CMVHist[Custo CMV Registrado]
    end

    subgraph OPERACAO["Módulo de Operação & Mobile"]
        Agenda[Agenda de Entregas/Montagens]
        MobileSync[App Mobile SQLite 4-Estados]
    end

    VendaAgendada -->|Reserva / Baixa| InvMoves
    VendaAtendida -->|Confirma Saída & CMV| CMVHist
    VendaAgendada -->|Alimenta Rota| Agenda

    RecManual -->|Gera Entrada & Recalcula| CMPM
    RecNFe -->|Gera Entrada & Concilia| SaldoFisico
    RecNFe -->|Lança Custo| Pagar

    DevVinculada -->|Entrada CMV Histórico| InvMoves
    DevVinculada -->|Gera Crédito/Reembolso| Pagar

    MobileSync -->|Evento Confirmado| VendaAtendida
    MobileSync -->|Baixa em Campo| InvMoves
```

---

## 📊 2. Matriz de Interação e Efeitos entre Módulos

| Módulo Origem | Módulo Destino | Tipo de Interação | Efeito Provocado |
| :--- | :--- | :--- | :--- |
| **Vendas** | **Estoque** | Escreve / Movimenta | Lança saída de estoque (`inventory_moves`) usando CMPM atual |
| **Vendas** | **Financeiro** | Escreve / Registra | Lança títulos a receber em `orders.payment_methods` e apura margem comercial |
| **Vendas** | **Operação** | Dispara Evento | Inclui agendamento na agenda de entregas e sincroniza App Mobile |
| **Recebimentos** | **Estoque** | Escreve / Recalcula | Incrementa saldo físico e recalcula CMPM da variação |
| **Recebimentos** | **Financeiro** | Escreve | Lança obrigações a pagar ao fornecedor |
| **NF-e Entrada** | **Produtos** | Lê / Vincula | Mapeia `product_supplier_codes` entre fornecedor e variação ERP |
| **Devoluções** | **Estoque** | Escreve / Entra | Lança entrada com o CMV histórico original da venda |
| **Mobile App** | **Servidor/ERP** | Sincroniza (4 Estados) | Envia eventos `PENDING` -> `SYNCING` -> `CONFIRMED`/`REJECTED` |

---

## 🔁 3. Orquestração Temporal de Chamadas

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Usuário / Vendedor
    participant ERP as ERP Web (React)
    participant Service as OrderHistoryService (TS)
    participant Inventory as InventoryService (TS)
    participant DB as Supabase PostgreSQL
    participant Mobile as App Mobile (React Native)

    Usuario->>ERP: Criar/Editar Pedido de Venda
    ERP->>Service: saveOrder(order)
    Service->>Service: resolveOrderCustomerSnapshot(order)
    Service->>DB: INSERT INTO orders (order_data, customer_id, ...)
    DB-->>Service: OK (id, order_number)
    Service->>Inventory: handleStockAndBusinessRules(rowId, order)
    Inventory->>DB: INSERT INTO inventory_moves (EXIT, unit_cost=CMPM)
    DB-->>Inventory: Confirmação
    DB-->>Realtime: Dispara Webhook / Evento Realtime
    Realtime-->>Mobile: Notificação Push / Atualização de Agendamento
```

---

## 🔗 4. Mapeamento de Serviços Canônicos no Código

- **Vendas & Ciclo de Vida**: [`orderHistoryService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderHistoryService.ts)
- **Estoque, CMPM & Movimentos**: [`inventoryService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/inventoryService.ts)
- **Recebimento de Mercadorias**: [`goodsReceiptService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/goodsReceiptService.ts)
- **NF-e de Entrada & Vínculos**: [`inboundInvoicesService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/inboundNfe/inboundInvoicesService.ts)
- **Produtos & Variações**: [`productMutationService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productService/productMutationService.ts)
- **Emissão Fiscal SEFAZ-PR**: [`nfeService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/nfeService.ts)
