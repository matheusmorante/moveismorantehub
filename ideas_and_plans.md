# Ideias e Planos Pendentes

## Diagnóstico do Problema "Subir Novo Logotipo/Rótulo"
- RESOLVIDO: O conflito de referências `cellInputRef` foi solucionado criando a referência dedicada `logoInputRef`.

## Nova Demanda: Reestilização da Lista de Montagens para Estilo Linha de Tempo (Timeline)
- O usuário solicitou alterar a interface da Lista de Montagem (`AssemblyListPage.tsx`) para usar o estilo de linha de tempo (timeline) igual ao do Cronograma de Entregas (`DeliverySchedule\TimelineView\Index.tsx`), adaptado para as tarefas de montagem.
- O cronograma de entregas possui estilos premium com cores dinâmicas para cards de pedidos (`getOrderTypeClasses`), espaçamentos polidos (`pl-16 pb-16`), nós de timeline maiores (`w-6 h-6`), cabeçalhos de data sticky robustos e badges estilizados para sinalizar a modalidade de entrega/montagem.

## Plano de Ação para a Timeline de Montagens
1. **Importar Utilitários de Cores**:
   - Adicionar a importação de `getOrderTypeClasses` de `@/pages/utils/orderTypeColorUtils` em `AssemblyListPage.tsx`.
2. **Reestilizar Cabeçalho de Data**:
   - Ajustar o cabeçalho sticky de data de montagens para ser idêntico ao do cronograma (fontes maiores, badges polidos de contagem de tarefas, e o gradiente separador horizontal).
3. **Reestilizar Timeline e Nós**:
   - Ajustar o padding e as margens da timeline (`pl-16 pb-16`).
   - Mudar os nós da timeline para o formato maior (`w-6 h-6 -ml-3 shadow-lg`).
4. **Cores Dinâmicas dos Cards de Montagem**:
   - Utilizar as cores base do cronograma: `rose` (rosa) para as montagens de mostruário (`showcase`) e `orange` (laranja) para as montagens de pedidos no depósito (`order`).
   - Aplicar `cls.cardBg` e `cls.cardBorder` aos cards correspondentes.
5. **Adicionar Badges de Martelo (Hammer) e Mostruário (Shop)**:
   - Para pedidos: Adicionar o badge pulsante de "Montagem no Depósito" com ícone de martelo (`bi-hammer`) idêntico ao do cronograma de entregas.
   - Para mostruário: Adicionar um badge elegante de "Montagem de Mostruário" com ícone de loja (`bi-shop`) para fornecer uma rica identidade visual adaptada a essa tela.
6. **Polimento Geral**:
   - Formatar os itens de montagem e as observações para manter o visual premium e consistente com o restante da aplicação.
