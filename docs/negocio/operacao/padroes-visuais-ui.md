# Padrões Visuais e Identidade da Interface (UI/UX) — Morante Hub

Este documento especifica os **padrões visuais canônicos de componentes e elementos da interface** do ERP Web e do Aplicativo Mobile Morante Hub.

---

## 1. Terminologia de Estado de Produtos e Itens
- **No ERP**: Produtos e variações utilizam os rótulos **Ativos** / **Desativados** (é proibido utilizar "publicados/despublicados" na interface do ERP).
- **No Catálogo / Vitrine**: É utilizado o rótulo **Publicado no Catálogo** / **Ocultado do Catálogo**.

---

## 2. Ícone e Selos de Montagem (`Drill` - Furadeira Preenchida)
- **Componente Oficial**: Usar obrigatoriamente o componente preenchido `Drill` (`@/components/shared/DrillIcon` no ERP e `MobileDrill` no Mobile).
- **Cores e Convenções**:
  - **Montagem Fora** (na residência/local do cliente): Fundo Vermelho (`bg-red-600` / `#dc2626`) com texto branco.
  - **Montagem Depósito** (no galpão/depósito da loja): Fundo Amarelo/Âmbar (`bg-amber-500` / `#f59e0b`) com texto escuro/branco.
- **Regra de Exibição Dupla**: Se um pedido contiver itens com montagem fora e itens com montagem no depósito, ambos os selos são exibidos lado a lado no card do pedido.
- **Devoluções (`is_return: true`)**: Em pedidos de devolução, os selos de montagem **nunca** são exibidos.

---

## 3. Selo "Queima dos Salvados"
- **Formatação do Nome**: Sempre exibir o nome completo **"Queima dos Salvados"** (nunca abreviar para "Salvados" ou "Queima").
- **Ícone e Estilo**:
  - Ícone de fogo (`bi-fire` no ERP e `Flame` no Mobile Lucide).
  - Fundo âmbar suave (`bg-amber-50 dark:bg-amber-950/30`), texto âmbar escuro e borda âmbar (`border-amber-300`).

---

## 4. Inputs Numéricos e Financeiros
- **Container sem Divisor Vertical**:
  - Os componentes `CurrencyInput`, `CurrencyOrPercentInput` e `UnitInput` não possuem borda divisória vertical separando o prefixo/símbolo (`R$`, `%`, `UN`) do campo numérico digitado.
  - O símbolo e o valor devem permanecer visualmente integrados no mesmo container suave.

---

## 5. Cabeçalhos de Recibos, Termos e Impressões
- **Identidade da Logo**: Apresentar apenas a logo oficial imagem do ERP/Loja (sem repetição textual do nome da empresa ao lado).
- **Container Limpo**: O container da logo em documentos de impressão (DANFE, recibos, folhas de separação) é limpo, sem bordas decorativas e sem sombras.

---

---

## 6. Padrão de Inputs e Formulários (Editáveis vs Não-Editáveis)
- **Campos Editáveis**:
  - **Fundo**: Obrigatoriamente **Fundo Branco** (`bg-white dark:bg-slate-900` ou `dark:bg-slate-800`).
  - **Borda**: Apenas na parte inferior (borda de baixo), na cor **Cinza** (`border-0 border-b-2 border-slate-200 dark:border-slate-700 rounded-none`).
  - **Foco (Focus)**: Ao receber foco, a borda inferior fica **Azul** (`focus:border-blue-600 dark:focus:border-blue-500 outline-none`).
- **Campos Não-Editáveis (Calculados, Bloqueados ou Somente Leitura)**:
  - **Fundo**: Obrigatoriamente **Fundo Cinza** (`bg-slate-100` / `bg-slate-50` / `dark:bg-slate-800/60`).
  - Sinalizam imediatamente ao operador que os dados são gerados pelo sistema, fixados por documento ou não interativos.

---

## 7. Referência no Código
- **ERP Icons**: `erp/src/components/shared/DrillIcon.tsx`
- **Mobile Icons**: `mobile/src/components/MobileDrill.tsx`
- **Numeric Inputs**: `erp/src/components/CurrencyInput.tsx`, `erp/src/components/CurrencyOrPercentInput.tsx`
- **Supplier & Product Autocomplete**: `erp/src/components/SupplierAutocomplete.tsx`, `erp/src/components/ProductAutocomplete.tsx`
- **Items Section**: `erp/src/components/PurchaseItemsSection.tsx`
