# Relatório de Diagnóstico de SKUs e Códigos Duplicados

## 1. Visão Geral da Base de Dados

Foi executada uma série de queries via MCP diretamente no PostgreSQL (`hkoxhourxwlddgsfdgws`) para mapear o cenário atual dos identificadores do catálogo.

| Métrica | Resultado |
|---|---|
| **Códigos Duplicados em `products`** | Múltiplos casos (ex: `ORIG` com 37x, `000001` com 24x, e dezenas de reais duplicados 2x/3x) |
| **Códigos Nulos** | `products`: 0 \| `product_variations.sku`: 2 |
| **Formatos fora de `^\d{6}$`** | `products`: 186 (ex: `TB5456`, `ORIG`) \| `product_variations`: 198 (ex: `003976_1820-01`) |
| **Maior raiz puramente numérica (`code`)** | `4004` (ignorado códigos com letras como `TB9970`) |

---

## 2. Classificação das Duplicatas (Onde o problema vive)

Através da varredura detalhada dos agrupamentos `HAVING COUNT(*) > 1`, as duplicatas dividem-se em duas categorias muito claras:

### A. Testes Automatizados e Placeholders (Legado Intencional/Sujo)
Estes registros não afetam o faturamento histórico e foram claramente gerados por rotinas de automação, testes de carga ou scripts de rollback.

- **`ORIG` (37 Ocorrências)**
  - **Nomes:** Todos chamam-se `"Pai Origem Rollback"`.
  - **Pedidos (`order_items`):** 0
  - **Diagnóstico:** Placeholder semântico provável de algum script de rollback ou de testes de banco em Setembro.
- **`000001` (24 Ocorrências)**
  - **Nomes:** `"[teste_aut]_draft_1789497231862 Guarda-Roupa Fênix Draft"`, etc.
  - **Pedidos:** 0
  - **Diagnóstico:** Resíduos de um runner de testes E2E/integração que sempre recomeçou do zero localmente mas enviou para a base remota.
- **`TB4425` (2 Ocorrências)**
  - **Nomes:** `"Pai B Teste Concorrencia"` e `"Pai B Concorrencia Mesma Var"`.
  - **Diagnóstico:** Exatamente o que o nome diz.

### B. Duplicidade Acidental em Produtos Reais (Concorrência do MAX+1)
Este é o sintoma real da falha na geração de SKUs do frontend. Produtos reais e distintos acabaram recebendo o mesmo código de identificação, e **alguns deles já possuem histórico de vendas**.

- **`000200` (3 Ocorrências)**
  - Colchão Dream D20 para Solteiro (Criado em Julho)
  - Mesa para Escritório NT 2060 (Criado em Agosto)
  - Cômoda Ripada Vegas (Criado em Agosto)
  - **Pedidos:** 1
- **`000217` (3 Ocorrências)**
  - Balcão para Pia (Agosto)
  - Guarda Roupa 1,50 Ripado (Agosto)
  - "34343" (Agosto)
  - **Pedidos:** 2
- **Múltiplos Códigos com 2 Ocorrências cada:**
  - `000021`, `000024`, `000128`, `000130`, `000215`, `000222`, `000223`, `000225`, `000226`, `000229`, `000237`, `000242`, `000244`, `000253`, `000254`, `000255`, `000345`, `000347`, `000348`.
  - **Nomes:** Variam completamente (ex: `000128` divide-se entre uma *Escrivaninha Infinity* e um *Balcão com Tampo Cristal*).
  - **Pedidos:** Vários deles possuem 1 a 2 pedidos vinculados.

---

## 3. Revisão do Contrato do SKU

Respondendo aos seus questionamentos:

1. **`products.code` é sempre 6 dígitos?**
   **Não.** A base atual possui 186 códigos que contêm prefixos alfabéticos como `TA`, `TB` e `TC` (ex: `TB5456`, `TC6951`). Impor uma Sequence pura que exige 6 dígitos numéricos estritos vai colidir com esse legado ou exigir o remapeamento desses códigos "T-alguma-coisa".
2. **Código de produto nunca pode ser reutilizado?**
   Atualmente ele é reutilizado desenfreadamente devido ao bug. Na regra ideal, sim, não deveria. Mas aplicar o `UNIQUE` agora faria a migration falhar instantaneamente.
3. **Composição usa código normal ou sufixo?**
   O front-end (`generateUniqueCode` em `productSkuService.ts`) força ativamente a inclusão do sufixo `-COMP` ao final de 6 dígitos para composições.
4. **Variação continua `XXXXXX-XXX`?**
   A maioria sim, mas existem 198 SKUs de variações com formatos irregulares, incluindo underscores (`003976_1820-01`).

---

## 4. Proposta Inicial de Saneamento

**A. Para o Legado de Testes (`ORIG`, `000001` automatizados, `TB... teste`)**:
- Como possuem `0` order_items, eles podem ser isolados e ter seus códigos convertidos para UUIDs puros (ou algo como `TEST-UUID`) e depois inativados/deletados em massa, liberando o código numérico 000001 para a sequence.

**B. Para Duplicidades Reais (Produtos Diferentes)**:
- Critério sugerido: O produto mais antigo ou com mais registros em `order_items` preserva o código original.
- Os produtos mais novos com o mesmo código recebem um novo código gerado a partir do topo atual (4005 em diante).
- Como `products.code` não é FK (as FKs reais usam o UUID `id`), a alteração do `code` não quebrará as tabelas filhas. No entanto, é vital que as variações acompanhem essa renumeração (`velho-01` -> `novo-01`).

**C. O caso dos códigos TA/TB/TC**:
- Precisa ser definido por você: eles são códigos de fornecedor inseridos no campo errado? São de alguma importação de planilhas? Eles podem ser mantidos (já que a Sequence pode viver convivendo com VARCHAR) ou devem ser higienizados?

O que acha da linha sugerida para o Saneamento? A query crua agrupada com os nomes já me ajudou a diferenciar os testes do erro real de concorrência. Posso redigir a script/query de saneamento baseada nessas premissas se concordar.
