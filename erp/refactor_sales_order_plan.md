# Plano de Refatoração e Limpeza - Pedido de Venda e Integração Bling

Este documento registra as ações tomadas para reverter a integração com a Bling e simplificar o lançamento de itens no Pedido de Venda, conforme solicitado em 19/03/2026.

## Ações Realizadas

### 1. Reversão de Código
- O código foi resetado para o commit `dc2c5fb` (referente ao "323"), removendo as funcionalidades de mapeamento e importação de CSV da Bling.
- Arquivos excedentes foram removidos manualmente:
    - `erp/src/pages/App/Settings/components/ImportMappingSection.tsx`
    - `erp/src/pages/utils/blingImporterService.ts`
    - `erp/src/pages/App/Products/BlingImportModal.tsx`

### 2. Limpeza de Dados (Supabase)
Foram removidos os registros importados incorretamente hoje (19/03/2026), dentro da janela de tempo da importação:
- **Clientes:** 452 registros removidos.
- **Fornecedores:** 399 registros removidos.
- **Produtos:** 675 registros removidos.
- **Configurações:** Limpeza do campo `importMappings` na tabela de `settings` (ID 'app').

### 3. Reformulação do Lançamento de Itens
O formulário de Pedido de Venda foi alterado para permitir entrada **manual** de produtos/serviços:
- **BodyRow.tsx/Body.tsx:** Substituído o componente de busca/autocomplete por um campo de texto (`input type="text"`) para a descrição.
- **Integração:** Removida a dependência do catálogo de produtos/serviços e controle de estoque direto no lançamento de itens.
- **Preservação:** A integração com **Clientes** e **Funcionários** (Vendedores) foi mantida ativa.

## Status Atual
O sistema está operando com lançamento manual de itens no PDV. O catálogo de produtos/serviços e o módulo de estoque agora funcionam de forma isolada, sem interferir na agilidade do lançamento do pedido.

## Próximos Passos Sugeridos
- [ ] Validar o fluxo completo de criação de um pedido com itens manuais e salvar no banco.
- [ ] Verificar se há necessidade de habilitar novamente a busca de produtos de forma opcional (apenas como sugestão).
- [ ] Testar a interface mobile para garantir que a descrição manual está confortável para digitação.
