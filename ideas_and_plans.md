# Ideias e Planos Pendentes

## Diagnóstico do Problema "Subir Novo Logotipo/Rótulo"
- **RESOLVIDO**: O conflito de referências `cellInputRef` foi solucionado criando a referência dedicada `logoInputRef`.

## Nova Demanda: Reestilização da Lista de Montagens para Estilo Linha de Tempo (Timeline)
- **CONCLUÍDO**: A interface da Lista de Montagem (`AssemblyListPage.tsx`) foi atualizada para usar o estilo de linha de tempo (timeline) premium igual ao do Cronograma de Entregas (`DeliverySchedule\TimelineView\Index.tsx`).
- Aplicados espaçamentos polidos (`pl-16 pb-16`), nós de timeline maiores (`w-6 h-6`), cabeçalhos de data sticky robustos e badges decorativos estilizados de Hammer (martelo para montagem no depósito) e Shop (loja para mostruário) com animações pulsares.

## Nova Demanda: Filtros de Período e Rolagem Automática ao Dia Atual
- **CONCLUÍDO**:
  1. **Filtro Padrão**: Unificado o comportamento padrão para exibir a partir do dia anterior ("Ontem") e as seguintes datas futuras (mantendo conformidade em ambos os módulos).
  2. **Correção do Scroll Automático no Cronograma**:
     - Resolvido um bug crítico nos três modos de visualização do Cronograma de Entregas (`TimelineView`, `ScheduleCardView` e `ScheduleTableView`) onde a existência de pedidos pendentes para agendar (`pendingOrders.length > 0`) impedia a rolagem automática para a data atual. A trava restritiva foi eliminada e o scroll agora é garantido sempre ao carregar as views.
  3. **Scroll Automático na Lista de Montagem**:
     - Adicionados identificadores exclusivos de data (`id={`timeline-date-${dateKey}`}`) aos divisores sticky da linha de tempo de montagem.
     - Implementado um hook `useEffect` com referência `hasInitialScrolled` em `AssemblyListPage.tsx` para rolar suavemente para o dia de hoje (ou a data agendada mais próxima no futuro) assim que as montagens forem carregadas.
