# Cenários sintéticos completos de venda

> **Snapshot histórico de 09/10/2026, antes das migrations remotas:** as factories existem no código local, mas o fluxo ainda não está pronto para executar gravações no Supabase. As migrations/RPCs foram aplicadas depois desta reconciliação; veja o [status fiscal central](../fiscal/status-testes-homologacao.md). `scenarioKey` é uma chave de cenário/idempotência, não substitui o UUID `runId` e o `ownerId` exigidos pela [política atual de artefatos](SUPABASE_REMOTE_TEST_POLICY.md). Esta página não autoriza criar fixtures nem emitir documento.

## Estado atual

A infraestrutura local combina factories de cliente, produto/variação e pedido. O fluxo não foi executado contra o Supabase naquele snapshot: nenhuma fixture foi criada por aquela auditoria nem houve aplicação remota de migration. O pedido `#4268` não foi lido nem alterado naquela implementação.

O lote ainda não está liberado para uso. A aprovação da migration, a verificação das identidades/classificações reais e uma validação de integração com PostgreSQL continuam pendentes.

## Fluxo implementado

1. O adapter chama a RPC `claim_synthetic_sales_scenario` para reservar a `scenarioKey`, calcular IDs comerciais, fixar o hash do conteúdo e conceder um lease. Essa RPC não aparece definida nas migrations presentes neste checkout; portanto, atomicidade, autorização administrativa e comportamento concorrente só estão cobertos pelos adapters/testes em memória, não pelo PostgreSQL.
2. `buildSyntheticCustomer()` exige nome, documento CPF/CNPJ válido por checksum, tipo PF/PJ compatível, indicador de IE, telefone, origem e endereço. Não gera CPF/CNPJ, IE, telefone nem endereço. A persistência usa `savePerson('customers', ..., { insertOnly: true })`, com ID reservado.
3. `buildSyntheticProduct()` exige categoria e classificação informadas, NCM, origem da mercadoria e estoque inicial. Valida com `checkERPLegibility()`, `getVariationRegistrationIssue()` e `normalizeProductForSave()`; cria uma variação com ID reservado e persiste com `saveProduct()`. Para mercadoria de terceiros, confirma um fornecedor ativo. Não define CFOP, CST/CSOSN, ICMS, ST, DIFAL, FCP, PIS ou COFINS.
4. O vendedor deve ser o funcionário ativo e único chamado **Matheus Morante**, obtido do cadastro existente. Não há fallback para outro vendedor.
5. O pedido é montado com o cliente, produto, variação e vendedor persistidos. Finalidade, `finalConsumer`, modalidade, agendamento, distância, pagamento, estoque e valores são explícitos e validados por `validateOrder()`.
6. `createSyntheticSalesOrder()` define `is_test: true` e `syntheticFixture`; `saveOrder()` acrescenta a metadata canônica de execução somente quando há contexto autenticado válido ativo. O pedido recebe UUID comercial independente da `scenarioKey`. A presença e o vínculo de `runId`/`ownerId` precisam ser comprovados no artefato persistido antes de qualquer execução remota.
7. `saveOrder()` mantém a RPC `create_order_with_inventory_transaction`, que grava pedido, itens, pagamentos, movimento de estoque e histórico de status na mesma transação. O mecanismo reconsulta os registros e só marca o cenário como completo depois de auditar os vínculos, saldo, movimento, histórico e ausência de documento em Produção.

## Segurança, retomada e efeitos

- As migrations citadas no registro anterior (`20261007235500_synthetic_sales_scenario_registry.sql` e `20261007231500_enforce_order_test_mode_admin.sql`) não estão presentes na pasta `supabase/migrations/` deste checkout. Não há prova local versionada de que a RPC de reserva, sua tabela/constraints ou a proteção administrativa foram criadas. Não inferir o estado remoto sem consulta autorizada e documentada.
- A [política atual de artefatos de teste](SUPABASE_REMOTE_TEST_POLICY.md) exige UUID `runId`, proprietário autenticado e metadata JSON nos artefatos já existentes. `scenarioKey` e `syntheticFixture` continuam úteis para idempotência/auditoria do cenário, mas não substituem essa identidade. A migration candidata `20261009200000_test_artifact_json_guards.sql` é outra mudança, permanece local e sua aplicação remota não foi reconsultada; consulte [status da política de artefatos](test-artifact-policy-status-2026-10-09.md).
- `emitNormalSale()` consulta o marcador persistido antes da recuperação/reserva fiscal e bloqueia `is_test=true` em Produção. Em Homologação, uma venda sintética comercialmente válida continua no fluxo normal. `tpAmb`, modelo e série não são definidos pela factory; HML técnico continua separado.
- O serviço normal de cliente pode emitir `people_updated`. O serviço de produto atualiza o cache local, o produto, as categorias e as variações em etapas distintas; falha parcial é registrada e a auditoria impede conclusão indevida. O estoque inicial é gravado pelos campos normais de produto/variação; o serviço de cadastro não cria um lançamento de recebimento no ledger.
- A RPC do pedido preserva a baixa de estoque e o histórico. Depois do commit, pedidos com `is_test=true` não sincronizam contato no CRM nem disparam notificações operacionais. A criação do cliente não é repetida dentro da RPC porque o snapshot já contém o ID persistido.
- `prepareSyntheticScenarioCleanup()` só prepara uma lista exata de IDs e alerta sobre documentos fiscais. Não executa exclusão: pedidos devem seguir cancelamento/devolução comercial normal, com XML, chave, protocolo e linhagem preservados.

## Verificações locais registradas anteriormente

As contagens abaixo são preservadas do registro de implementação. A data de execução não foi registrada neste arquivo e os testes não foram reexecutados durante a reconciliação documental de 09/10.

- Vitest focado: 31 testes passaram em quatro arquivos. O cenário integrado usa adaptadores em memória para exercitar a sequência de serviços, falha após persistir o cliente, retomada após escrita parcial do produto/variação, retry sem duplicar pedido/movimento, concorrência na mesma `scenarioKey`, repetição somente de leitura de cenário concluído, lote incompleto, auditoria pós-criação, identificadores inválidos, pagamentos e datas/horários impossíveis. Testes adicionais cobrem a guarda fiscal e a criação atômica do pedido, inclusive supressão das notificações e sincronização CRM para `is_test=true`.
- Biome focado: passou nos novos módulos e no lint dos arquivos de implementação alterados.
- ESLint não pôde iniciar porque este checkout não contém `eslint.config.*`, embora `erp/package.json` invoque ESLint 10.
- `tsc --noEmit -p tsconfig.json` terminou com erro por incompatibilidades de tipos já presentes no workspace, concentradas em trechos existentes de `api/nfe/emit.ts` (cliente Supabase/opções e nulabilidade). Não houve diagnóstico nos módulos de factory, registry, serviço de pedido/cliente, helper fiscal ou na nova consulta de guarda para retry.
- `git diff --check` passou.

## Matriz de evidência e pendências

| Teste | Executado | Ambiente/massa | Resultado | Evidência pendente |
|---|---|---|---|---|
| Fluxo local cliente → produto/variação → vendedor → pedido → auditoria | Sim | Vitest, adaptadores em memória e IDs sintéticos fixos | Passou; valida chamadas, retomada e estado final simulado | Não prova persistência PostgreSQL/RPC |
| Falha parcial, retry e repetição idempotente | Sim | Mesmo harness em memória | Passou; retoma IDs reservados e não duplica pedido/movimento | Atomicidade e concorrência real no banco |
| Concorrência da mesma `scenarioKey` | Sim | Duas execuções simultâneas no harness | Passou; segunda execução é rejeitada enquanto a primeira tem lease | `SELECT FOR UPDATE`, RLS e comportamento concorrente da RPC no PostgreSQL |
| Guarda de Produção para pedido `is_test` | Sim | Teste unitário da camada API | Passou; bloqueia antes de chamada fiscal/reserva simulada | Migration aplicada e endpoint implantado não foram verificados |
| Autorização admin e políticas RLS das migrations | Não | Nenhum banco acessado | Pendente | pgTAP/integração controlada após autorização para aplicar a migration |
| Emissão em Homologação pela SEFAZ | Não | Nenhum documento emitido | Intencionalmente não executado | Validação manual futura pela interface, após dados/classificações reais confirmados |
| Criação de lote remoto | Não | Nenhum registro remoto criado | Intencionalmente não executado | Só depois de revisar migrations, validar a proteção persistida/deployada e autorizar o lote |

A auditoria local reconsulta pedido, cliente, produto/variação, estoque, movimento, histórico e documentos de Produção. O serviço normal de cadastro de produto grava o estoque inicial nos campos do produto/variação, sem criar movimento de entrada no ledger; a auditoria não inventa esse fato. A criação de pedido continua usando a RPC normal para a baixa e o histórico transacionais.

O lote permanece **bloqueado**: a proteção de `is_test`, a reserva/idempotência e as políticas administrativas ainda dependem de migrations não aplicadas, e o fluxo não foi comprovado em PostgreSQL. Nenhuma exceção global do CALM foi criada ou alterada.

## Dados que precisam vir do operador

Antes de invocar a factory, um administrador deve fornecer cadastros/classificações sintéticos apropriados para Homologação: documento CPF/CNPJ com checksum válido, IE real para a UF/tipo informado, categoria, fornecedor quando necessário, NCM/CEST/origem corretos, estoque, valores, endereço, modalidade, finalidade, agenda e pagamentos. O código verifica formato/checksum e coerência, mas não confirma registro de CPF/CNPJ na Receita, validade estadual da IE nem a correção fiscal material do NCM/CEST. Esses pontos exigem conferência independente; nenhum pedido foi criado para contorná-los.
