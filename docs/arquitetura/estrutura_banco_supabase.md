# Estrutura do Banco de Dados e Supabase — Móveis Morante Hub

> **Status:** Ativo / Referência Arquitetural  
> **Banco:** PostgreSQL 15+ hospedado no Supabase  
> **Abordagem:** Modelo Híbrido Relacional + JSONB para flexibilidade operacional e alta performance.

---

## 1. Entidades Principais e Relacionamentos

```mermaid
erDiagram
    orders ||--o{ inventory_moves : "origina"
    products ||--|{ product_variations : "possui"
    product_variations ||--o{ inventory_moves : "movimenta"
    people ||--o{ orders : "cliente / vendedor"
    purchase_orders ||--o{ inventory_moves : "gera entradas"

    orders {
        uuid id PK
        string order_number "Código sequencial (#002485)"
        string status "draft, scheduled, fulfilled, cancelled"
        jsonb order_data "Snapshot completo do pedido e itens"
        timestamp created_at
        timestamp updated_at
    }

    products {
        uuid id PK
        string name "Nome do produto pai"
        string category "Categoria"
        uuid supplier_id FK
        boolean active "Ativo no ERP"
        string status "published ou hidden no Catálogo"
        boolean is_draft "Flag de rascunho"
    }

    product_variations {
        uuid id PK
        uuid product_id FK
        string sku "Código SKU da variação"
        string name "Nome da variação"
        numeric price "Preço de venda"
        numeric cost_price "Custo Médio (CMPM)"
        numeric stock "Saldo físico atual"
    }

    inventory_moves {
        uuid id PK
        string type "entry ou withdrawal"
        uuid product_id FK
        uuid variation_id FK
        numeric quantity "Quantidade movimentada"
        numeric unit_cost "Custo unitário do movimento"
        string related_entity_type "sales_order, purchase_order, adjustment"
        string related_entity_id "ID ou código da entidade"
        string status "effective, reversed, cancelled"
    }
```

---

## 2. Decisões Arquiteturais Críticas

### 1. Variações como Itens Físicos (`product_variations`)
- O produto pai (`products`) é apenas um agrupador conceitual (ex: "Sofá Retrátil Madri").
- Todo o controle de estoque, saldo físico (`stock`), custo médio (`costPrice`) e preço de venda (`price`) reside na **variação** (`product_variations`).

### 2. Snapshot de Pedido em `order_data` (JSONB)
- A tabela `orders` armazena colunas indexáveis (`id`, `order_number`, `status`, `created_at`) e um campo JSONB rico chamado `order_data`.
- O `order_data` guarda o snapshot completo no momento da venda (endereço de entrega, itens com suas descrições e observações, dados de pagamento, vendedor selecionado com ID e nome).
- **Vantagem:** Se o preço de um produto mudar no cadastro meses depois, o pedido histórico permanece intacto e auditável.

### 3. Histórico de Movimentações (`inventory_moves`) como Fonte da Verdade
- O saldo do estoque (`stock`) em `product_variations` é um **cache materializado** para leitura rápida.
- A **verdade contábil e de auditoria** é a soma histórica das movimentações válidas em `inventory_moves`.
- Qualquer divergência pode ser recalculada através de replay cronológico dos lançamentos.

---

## 3. Ambientes (Desenvolvimento Local vs Produção)

- **Desenvolvimento Local:**
  - `VITE_SUPABASE_URL` aponta para a instância de desenvolvimento / staging.
  - `VITE_SUPABASE_ANON_KEY` com credenciais de desenvolvimento.
- **Produção (Vercel):**
  - Variáveis configuradas diretamente no painel da Vercel.
  - Políticas de RLS (Row Level Security) ativas para proteção de dados multi-usuário.

---

## 4. Scripts e Migrations
- Migrations organizadas cronologicamente em [`supabase/migrations/`](file:///c:/Users/Rosilene/Desktop/morantehub/supabase/migrations/).
- Configurações da CLI do Supabase em [`supabase/config.toml`](file:///c:/Users/Rosilene/Desktop/morantehub/supabase/config.toml).
