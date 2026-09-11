# Mapa Geral do Negócio — Morante Hub

Este documento apresenta a arquitetura funcional de alto nível mostrando como os principais domínios de negócio se relacionam e trocam dados no Morante Hub.

---

## 🔄 Fluxo Geral de Interações Entre Domínios

```mermaid
flowchart LR
    classDef venda fill:#1e3a8a,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef estoque fill:#065f46,stroke:#10b981,color:#fff,font-weight:bold
    classDef financeiro fill:#854d0e,stroke:#eab308,color:#fff,font-weight:bold
    classDef operacao fill:#701a75,stroke:#d946ef,color:#fff,font-weight:bold
    classDef fiscal fill:#1e293b,stroke:#64748b,color:#fff,font-weight:bold

    subgraph VENDAS["🛒 Domínio de Vendas"]
        V1[Pedido de Venda] :::venda
        V2[Rascunho / Orçamento] :::venda
        V3[Devolução de Venda] :::venda
    end

    subgraph ESTOQUE["📦 Domínio de Estoque & Custos"]
        E1[Saldo em Estoque] :::estoque
        E2[Movimentos: Saída/Entrada] :::estoque
        E3[Custo Médio - CMPM] :::estoque
        E4[CMV Materializado] :::estoque
    end

    subgraph RECEBIMENTO["🚛 Domínio de Compras & Recebimento"]
        R1[Pedido de Compra] :::operacao
        R2[Recebimento Físico] :::operacao
        R3[NF-e de Entrada XML] :::fiscal
    end

    subgraph OPERACAO["🛠️ Domínio Operacional & Logística"]
        O1[Agendamento de Entrega] :::operacao
        O2[Montagem Depósito/Fora] :::operacao
        O3[Assistência Técnica] :::operacao
        O4[App Mobile Offline] :::operacao
    end

    subgraph FINANCEIRO["💰 Domínio Financeiro & IA"]
        F1[Contas a Receber] :::financeiro
        F2[Contas a Pagar] :::financeiro
        F3[Assistente IA Gemini] :::financeiro
    end

    subgraph FISCAL["📄 Domínio Fiscal"]
        NF1[Emissão NF-e / NFC-e] :::fiscal
    end

    %% Relações Vendas
    V2 -->|Aprovação| V1
    V1 -->|Pedido Agendado/Atendido| E2
    V1 -->|Reserva/Agendamento| O1
    V1 -->|Faturamento| F1
    V1 -->|Emissão Fiscal| NF1
    E2 -->|Gera Saída| E1
    E2 -->|Materializa Custo| E4

    %% Relações Devoluções
    V3 -->|Entrada Imediata| E2
    V3 -->|Estorno/Crédito| F1
    V3 -->|Reversão de Montagem| O2

    %% Relações Recebimento
    R3 -->|Conciliação| R1
    R1 -->|Confirmação Física| R2
    R2 -->|Gera Entrada| E2
    R2 -->|Recalcula| E3
    R2 -->|Gera Fatura| F2

    %% Relações Operação
    O1 -->|Dispara Equipe| O4
    O1 -->|Requer Montagem| O2
    O3 -->|Consumo de Peças| E2
    O4 -->|Sync Offline| O1

    %% Relações Financeiro IA
    F3 -->|Registra Fatos| F1
    F3 -->|Registra Fatos| F2
```

---

## 📌 Principais Gatilhos e Efeitos Inter-Domínios

| Evento de Origem | Módulo Disparado | Efeito Produzido |
| :--- | :--- | :--- |
| **Venda Agendada ou Atendida** | Estoque, Financeiro, Operação | Registra saída de estoque na data do pedido, trava CMV imutável, gera títulos no financeiro e envia pedido para a grade de entregas/montagens. |
| **Devolução de Venda Cadastrada** | Estoque, Financeiro, Operação | Lança entrada imediata no estoque, estorna/cria crédito financeiro e cancela selos de montagem pendentes. |
| **Confirmação de Recebimento** | Estoque, Financeiro | Lança entrada por compra, recalcula o Custo Médio Ponderado Móvel (CMPM) e gera título em contas a pagar. |
| **Conclusão de Inventário** | Estoque | Registra movimentação de ajuste (`adjustment`), atualizando o saldo para a contagem física real. |
| **Substituição de Peça em Assistência** | Estoque, Operação | Lança saída de estoque por assistência e vincula a peça à Ordem de Serviço. |
| **Emissão de NF-e/NFC-e** | Fiscal | Transmite XML para a SEFAZ-PR direta e grava a chave de acesso no pedido. |
