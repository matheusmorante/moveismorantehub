# Modelo de Dados e Schemas PostgreSQL — Morante Hub

Este documento especifica o modelo relacional de dados do Supabase PostgreSQL no Morante Hub, as tabelas principais e seus relacionamentos.

---

## 📐 Diagrama Entidade-Relacionamento (ERD Concept Mermaid)

```mermaid
erDiagram
    products ||--|{ product_variations : "possui"
    products ||--o{ product_categories : "pertence"
    categories ||--o{ product_categories : "agrupa"
    products ||--o{ product_images : "contém"
    
    people ||--o{ orders : "solicita (cliente)"
    people ||--o{ goods_receipts : "fornece"
    
    orders ||--|{ inventory_moves : "gera movimentação"
    goods_receipts ||--|{ inventory_moves : "gera entrada por compra"
    product_variations ||--o{ inventory_moves : "afeta saldo/custo"

    orders {
        uuid id PK
        string order_number
        string status
        uuid customer_id FK
        string customer_name
        decimal total_amount
        jsonb order_data
        timestamp created_at
        timestamp updated_at
    }

    products {
        uuid id PK
        string name
        string code
        string slug
        uuid category_id FK
        boolean active
        boolean deleted
        timestamp created_at
    }

    product_variations {
        uuid id PK
        uuid product_id FK
        string sku
        string name
        decimal price
        integer stock
        jsonb attributes
        string image_url
        uuid merged_to_variation_id
    }

    inventory_moves {
        uuid id PK
        uuid product_id FK
        uuid variation_id FK
        string type
        decimal quantity
        decimal unit_cost
        string related_entity_type
        uuid related_entity_id
        timestamp date
    }

    people {
        uuid id PK
        string full_name
        string phone
        string type
        jsonb full_address
        string marketing_origin
        boolean active
    }

    goods_receipts {
        uuid id PK
        string receipt_number
        uuid supplier_id FK
        string status
        decimal total_cost
        jsonb receipt_data
        timestamp date
    }
```

---

## 🔒 Segurança (RLS - Row Level Security) e Triggers

- Todas as tabelas possuem **Row Level Security (RLS)** configuradas em mode permissivo para operações autorizadas do ERP e App Mobile, evitando rejeições silenciosas.
- A sincronia entre colunas de busca rápida (`customer_name`, `total_amount`, `order_number`) e a coluna JSON `order_data` é mantida por triggers de integridade ou pela helper `buildOrderPersistencePayload()`.
