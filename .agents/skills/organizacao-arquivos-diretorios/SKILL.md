---
name: organizacao-arquivos-diretorios
description: Diretrizes obrigatórias para organização estruturada de pastas, arquivos e subpastas no Morante Hub, garantindo migração segura sem perda de código, preservação de imports e integridade absoluta do sistema.
---

# Skill: Organização Estruturada de Arquivos e Diretórios (Zero Perda de Código)

## Quando aplicar esta Skill
Aplicar sempre que a tarefa envolver:
- Reorganização de pastas com acúmulo excessivo de arquivos (pastas com mais de 8 a 10 arquivos soltos);
- Criação de subpastas semânticas (`components/`, `modals/`, `services/`, `hooks/`, `utils/`, `types/`, `sections/`);
- Movimentação de arquivos e componentes para novas estruturas de diretório;
- Limpeza e padronização visual da árvore de pastas do ERP ou Mobile;
- Criação de barrels (`index.ts`) para compatibilidade retroativa de importações.

## Quando NÃO aplicar
- Para simples correções pontuais de bugs de lógica em um único arquivo;
- Para refatoração profunda de regras de negócio internas (consultar `modularizacao_codigo` e `regras-de-negocio-erp`).

---

## 1. Princípio Fundamental de Segurança em Movimentações

> [!IMPORTANT]
> **"NENHUMA INFORMAÇÃO É PERDIDA. NENHUM IMPORT É QUEBRADO. NENHUM CAMINHO CRÍTICO É ALTERADO SEM TESTES."**

Ao organizar diretórios e mover arquivos de lugar:
1. **Nunca apague ou sobrescreva arquivos** sem antes garantir que o novo destino contém 100% do conteúdo original.
2. **Crie Barrels Reexportadores ou atualize todos os consumidores**: Se outros módulos importam de `Stock/InboundInvoices/InboundInvoiceDetailsModal`, crie um arquivo proxy ou reexportador no caminho anterior ou atualize rigorosamente todos os caminhos relativos de importação em todos os arquivos dependentes.
3. **Valide a compilação do TypeScript e execute Vitest imediatamente**: O comando de build/teste deve ser executado para comprovar que nenhuma rota ou tela ficou em branco.

---

## 2. Padrão Canônico de Subpastas por Módulo

Ao organizar um diretório extenso (ex: telas em `src/pages/App/...` ou features em `mobile/src/features/...`):

| Subpasta | O que deve conter | Exemplos |
|---|---|---|
| `components/` | Componentes visuais secundários da tela, cards de itens, paginações, headers e tabelas parciais | `InboundInvoicesTable.tsx`, `ReceiptCard.tsx` |
| `modals/` | Diálogos modais, overlays de confirmação, formulários de criação/edição em modal e seletores popup | `InboundInvoiceDetailsModal.tsx`, `InboundDocumentImportModal.tsx` |
| `sections/` | Seções extensas da mesma página quando dividida em blocos lógicos | `InboundAdditionalCostsSection.tsx` |
| `hooks/` | Custom hooks React específicos daquele módulo | `useInboundInvoices.ts`, `useReceipts.ts` |
| `services/` | Lógica de cálculo, chamadas a APIs, integração com Supabase ou engines utilitárias | `inboundInvoiceService.ts`, `FabricLabelEngine.ts` |
| `utils/` | Funções puras de formatação, regex, conversores e datas | `inboundDateUtils.ts`, `receiptPeriodUtils.ts` |
| `types/` | Tipos TypeScript, interfaces e enums exclusivos do módulo | `inboundInvoice.types.ts` |
| `Raiz do módulo` | Manter apenas o orquestrador principal (`Index.tsx`) e barrels de exportação quando necessário. | `Index.tsx` |

---

## 3. Checklist Operacional de Execução Segura

1. **Mapeamento Prévio de Referências**:
   - Rodar busca por texto (`grep_search`) pelo nome do arquivo a ser movido em todo o repositório (`erp/src` ou `mobile/src`) para descobrir quem o importa.
2. **Criação do Novo Arquivo / Movimentação**:
   - Mover ou copiar o arquivo para a subpasta adequada (`modals/`, `components/`, etc.).
   - Ajustar os imports relativos dentro do próprio arquivo movido (ex: `import { x } from './utils'` vira `import { x } from '../utils'`).
3. **Preservação de Retrocompatibilidade (Barrel / Re-export)**:
   - Na raiz do módulo anterior, caso outros módulos externos importem daquele caminho antigo, reexportar:
     ```ts
     export * from './modals/InboundInvoiceDetailsModal';
     export { default } from './modals/InboundInvoiceDetailsModal';
     ```
   - Ou atualizar todos os importadores diretos.
4. **Verificação de Regressão**:
   - Rodar `npx vitest` e verificar status da compilação.
   - Confirmar ausência de erros 404 de Vite no navegador.
