# Plano e Lembrete: Resolução dos 165 Erros de Lint do ERP

## Resumo do Cenário
- **Total de problemas:** 888 (165 erros, 723 warnings)
- **Total de erros:** 165 distribuídos em 85 arquivos
- **Modelo:** Gemini 3.8 Flash (Medium) para triagem e lotes 1 a 3; subir para Flash High / Pro High apenas se houver nós complexos de concorrência ou cálculo fiscal/estoque.

## Distribuição dos 165 Erros
1. `prefer-const` (84 erros) - Mecânico / seguro
2. `no-useless-assignment` (32 erros) - Variáveis com atribuição sobrescrita sem uso
3. `no-empty` (27 erros) - Blocos vazios (catch/if)
4. `no-case-declarations` (11 erros) - Switch case sem bloco `{}`
5. `preserve-caught-error` (5 erros) - Falta `cause: err` em novos `Error`
6. `no-extra-boolean-cast` (2 erros) - `!!` redundante
7. `no-irregular-whitespace` (1 erro) - Espaço não-padrão
8. `no-useless-escape` (1 erro) - Escape inútil
9. `no-useless-catch` (1 erro) - Try/catch redundante
10. `@typescript-eslint/no-non-null-asserted-optional-chain` (1 erro) - Chaining com asserção não-nula

## Lembrete Futuro (Identificado na tarefa anterior)
- Mover unidade (`unit`) e tipo semântico (`semanticType`) para o cadastro das Informações Técnicas no banco/API (Supabase), substituindo a heurística provisória baseada no nome/label (`"Peso" -> kg`, `"Altura/Largura" -> cm`).
