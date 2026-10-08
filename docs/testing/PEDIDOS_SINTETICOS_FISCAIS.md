# Cenários sintéticos completos de venda

## Estado atual

A infraestrutura local combina factories de cliente, produto/variação e pedido. Ela não foi executada contra o Supabase: nenhum cadastro, pedido ou documento fiscal foi criado, e nenhuma migration foi aplicada remotamente. O pedido `#4268` não foi lido nem alterado.

O lote ainda não está liberado para uso. A aprovação da migration, a verificação das identidades/classificações reais e uma validação de integração com PostgreSQL continuam pendentes.

## Fluxo implementado

1. `claim_synthetic_sales_scenario` reserva a `scenarioKey`, calcula IDs comerciais UUID independentes, fixa o hash do conteúdo e concede um lease atômico. Só administradores podem reivindicar o cenário. Uma chave repetida com outro conteúdo é rejeitada; uma execução concorrente não duplica cadastros.
2. `buildSyntheticCustomer()` exige nome, documento CPF/CNPJ válido por checksum, tipo PF/PJ compatível, indicador de IE, telefone, origem e endereço. Não gera CPF/CNPJ, IE, telefone nem endereço. A persistência usa `savePerson('customers', ..., { insertOnly: true })`, com ID reservado.
3. `buildSyntheticProduct()` exige categoria e classificação informadas, NCM, origem da mercadoria e estoque inicial. Valida com `checkERPLegibility()`, `getVariationRegistrationIssue()` e `normalizeProductForSave()`; cria uma variação com ID reservado e persiste com `saveProduct()`. Para mercadoria de terceiros, confirma um fornecedor ativo. Não define CFOP, CST/CSOSN, ICMS, ST, DIFAL, FCP, PIS ou COFINS.
4. O vendedor deve ser o funcionário ativo e único chamado **Matheus Morante**, obtido do cadastro existente. Não há fallback para outro vendedor.
5. O pedido é montado com o cliente, produto, variação e vendedor persistidos. Finalidade, `finalConsumer`, modalidade, agendamento, distância, pagamento, estoque e valores são explícitos e validados por `validateOrder()`.
6. `createSyntheticSalesOrder()` grava `is_test: true` e `syntheticFixture` no `order_data`, mas envia um UUID comercial normal separado da `scenarioKey` à opção de idempotência de `saveOrder()`.
7. `saveOrder()` mantém a RPC `create_order_with_inventory_transaction`, que grava pedido, itens, pagamentos, movimento de estoque e histórico de status na mesma transação. O mecanismo reconsulta os registros e só marca o cenário como completo depois de auditar os vínculos, saldo, movimento, histórico e ausência de documento em Produção.

## Segurança, retomada e efeitos

- A migration local `20261007235500_synthetic_sales_scenario_registry.sql` mantém IDs e estado dos estágios; payload incompatível, lease ocupado e identidade alterada são rejeitados. Uma falha parcial fica como `failed`, libera o lease e pode ser retomada com os mesmos IDs; o lote só retorna `complete` se todos os cenários terminarem.
- A migration local `20261007231500_enforce_order_test_mode_admin.sql` protege `order_data.is_test` no banco: ausência significa venda normal, e um não administrador não pode marcar/desmarcar o pedido como teste. A função de reserva da factory também exige administrador.
- `emitNormalSale()` consulta o marcador persistido antes da recuperação/reserva fiscal e bloqueia `is_test=true` em Produção. Em Homologação, uma venda sintética comercialmente válida continua no fluxo normal. `tpAmb`, modelo e série não são definidos pela factory; HML técnico continua separado.
- O serviço normal de cliente pode emitir `people_updated`. O serviço de produto atualiza o cache local, o produto, as categorias e as variações em etapas distintas; falha parcial é registrada e a auditoria impede conclusão indevida. O estoque inicial é gravado pelos campos normais de produto/variação; o serviço de cadastro não cria um lançamento de recebimento no ledger.
- A RPC do pedido preserva a baixa de estoque e o histórico. Depois do commit, pedidos com `is_test=true` não sincronizam contato no CRM nem disparam notificações operacionais. A criação do cliente não é repetida dentro da RPC porque o snapshot já contém o ID persistido.
- `prepareSyntheticScenarioCleanup()` só prepara uma lista exata de IDs e alerta sobre documentos fiscais. Não executa exclusão: pedidos devem seguir cancelamento/devolução comercial normal, com XML, chave, protocolo e linhagem preservados.

## Verificações locais

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
