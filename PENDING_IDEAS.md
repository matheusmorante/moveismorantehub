# Plano de Ação e Ideias Pendentes

Este arquivo documenta o progresso atual e os próximos passos para o refatoramento do formulário de produtos e outras melhorias do sistema.

## ✅ Concluído Recentemente

-   **Refatoração do Formulário de Produto:**
    -   Remoção de campos técnicos redundantes (Linha, Diferencial, Cores, etc.) para simplificar a UI.
    -   Implementação de botões "Herdar para os filhos" (Preço, Custo, Condição) no formulário pai.
    -   Ajuste da logica de herança default para novas variações.
    -   Substituição do seletor de fornecedor por `SmartInput` (busca por nome).
-   **Seletor de Categorias:**
    -   Criação do `CategorySearchModal` para busca e seleção múltipla de categorias.
    -   Integração do modal no `ProductFormModal`.
-   **Desempenho de Busca:**
    -   Limitação de resultados de busca para 30 itens nos componentes `SmartInput` e `ProductSearchModal`.
-   **Padronização de Nomenclatura:**
    -   Renomeado menu "Catálogo do Site" para "Produtos e Serviços" (erp/src/components/layout/DesktopNav.tsx, MobileNav.tsx, Index.tsx)
    -   Renomeado "Tipo de Móveis" para "Categorias" em todo o sistema (Categorias/Index.tsx, ProductFilters.tsx, ProductGeneralTab.tsx, ProductMaterialsSection.tsx)
    -   Refatoração de labels e mensagens de sucesso/erro para manter a consistência com "Categorias".
    -   Correção de bug no campo SKU (variável indefinida no input manual)

## 📌 Pendente / Próximos Passos

1.  **Limpeza de Banco de Dados (SQL):**
    -   [ ] Avaliar e executar o DROP das colunas removidas da UI na tabela `products` (`line`, `main_differential`, `colors`, `not_included`, `width`, `height`, `depth`, `extra_dimensions`).
2.  **Testes de Integração:**
    -   [ ] Testar se a sincronização de preços entre pai e filhos funciona corretamente em tempo real após a economia.
    -   [ ] Verificar se o `initialStock` está sendo distribuído corretamente entre variações se `hasVariations` for true.
3.  **Refinamento de UX:**
    -   [ ] Avaliar o comportamento do `CategorySearchModal` em dispositivos móveis.
    -   [ ] Adicionar feedback visual mais claro quando a herança está ativa.
4.  **Deploy Final:**
    -   [ ] Executar build de produção para verificar integridade (`npm run build`).
    -   [ ] Sincronizar migrações com o ambiente de produção.

## 💡 Ideias Futuras

-   Implementar assistente de IA para sugerir NCM e tributação baseado na descrição do produto (Beta já implementado, precisa de refino).
-   Adicionar histórico de alteração de estoque (já iniciado em algumas views, unificar).
