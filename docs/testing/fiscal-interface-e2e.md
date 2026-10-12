# E2E fiscal pela interface

## Fonte dos dados

A fonte única dos cenários fiscais é o Supabase remoto operacional já vinculado ao ERP, na branch principal e schema `public`. O runner exige `--run-id <UUID>`, `--order-id <UUID>` e `--scenario-key <key>` de registros existentes. Não gera identificadores, seleciona pedidos operacionais por conveniência, cria massa implícita ou repara dados inválidos.

O `fiscal-policy.global-setup.ts` primeiro confirma a ref local do projeto, o readiness dos guards e a configuração Development/Homologação. Em seguida autentica `NFE_HML_TEST_OPERATOR_EMAIL` e `NFE_HML_TEST_OPERATOR_PASSWORD` por um cliente Supabase com anon key, confere o e-mail e `is_administrator()`, e carrega o pedido com `fiscal-persisted-artifact.cjs`. A chave de serviço é usada somente pelo RPC read-only de readiness. `scenarioKey` faz parte da metadata JSON do mesmo artefato; o runner a compara com `--scenario-key` e define `VITE_TEST_ARTIFACT_RUN_ID`/`VITE_TEST_ARTIFACT_SCENARIO_KEY` para manter o contexto da UI coerente com o pedido selecionado.

O resolvedor valida UUIDs, `order_data.is_test`, metadata canônica `order_data.testArtifact`, owner igual ao usuário autenticado, cliente persistido, itens, pagamentos, produtos, variações e vínculos entre eles via `test_artifact_row_data`. Para NFC-e, também compara `shipping.deliveryMethod` com a coluna persistida e com `scenarioKey` (`nfce65_pickup`/`nfce65_delivery`). Na UI, exige destinatário identificado para NF-e 55 e NFC-e com entrega. A leitura de documento ou snapshot fiscal anterior bloqueia esse fluxo de nova emissão. Não se usa prefixo `TEST_AUT_`, nome ou flag ambiental como autorização. Falha de acesso, dado ausente, vínculo cruzado ou estado fiscal incerto interrompe a execução.

## Preparar artefatos pela interface

Quando um cenário ainda não existir, a criação é uma etapa explícita feita pelos formulários reais do ERP. Não há geração implícita no runner nem presets comerciais em código. Abra o ambiente Development com um `runId` temporário:

```powershell
$runId = [guid]::NewGuid().ToString().ToLowerInvariant()
$env:VITE_TEST_ARTIFACT_RUN_ID = $runId
$env:VITE_TEST_ARTIFACT_SCENARIO_KEY = 'nfe55_sale'
Write-Host "runId=$runId"
Write-Host "scenarioKey=$env:VITE_TEST_ARTIFACT_SCENARIO_KEY"
npm run dev
```

Use a sessão do operador HML configurado. Crie o cliente, o produto e a venda nos formulários existentes e ative “Artefato de teste”/“Modo teste” nos formulários que exibirem essa opção. A autorização do operador, o `runId`, o `scenarioKey` e o `ownerId` da sessão marcam os registros; as validações Zod, regras comerciais e serviços de gravação continuam sendo os mesmos do ERP. As chaves aceitas são `nfe55_sale`, `nfe55_delivery_own_transport`, `nfce65_pickup` e `nfce65_delivery`; o runner confirma modelo, modalidade e, para transporte próprio, `freightMode=3` no XML de prévia. Salve somente dados fiscais e comerciais válidos para o cenário. A captura das linhas persistidas e a prontidão dos guards precisam estar verificadas antes de qualquer gravação remota.

Localize o UUID do pedido salvo pelo registro da própria venda ou por consulta somente de leitura filtrada por `order_data.testArtifact.runId` e `ownerId`. Passe esse UUID e o mesmo `runId` ao runner. Se o artefato não existir, se algum formulário não oferecer o modo autorizado ou se os vínculos falharem, interrompa e corrija a preparação pela interface; não complete os dados com fixtures no código.

## Fluxo da UI

Os testes Playwright usam janela visível e autenticam pelo formulário real. A navegação até a venda usa o UUID exato resolvido; não percorre a lista escolhendo o primeiro pedido operacional. A pré-validação fiscal lê os dados persistidos do formulário, não inventa CPF/CNPJ nem aplica defaults. A prévia do XML exige `<tpAmb>2</tpAmb>` e compara o modelo 55/65 e os itens exibidos na UI.

A execução padrão é somente leitura: abre o modal, valida os campos e a prévia do XML, fecha o modal e não transmite. A transmissão só ocorre pela interface quando o operador inicia o modo HML com a opção explícita `--authorize-hml-transmission`; a identidade, ownership, prontidão, vínculos, ambiente e ausência de tentativa anterior continuam obrigatórios. Depois da autorização, a UI valida autorização, chave e protocolo; o runner consulta XML assinado, snapshot e persistência por uma sessão autenticada. Nunca transmitir por CLI, SQL ou requisição HTTP direta.

## Comandos

O atalho único executa o fluxo HML e gera relatórios HTML e JSON do Playwright:

```powershell
npm run test:fiscal:e2e
```

Sem parâmetros, o comando usa `FISCAL_E2E_RUN_ID`, `FISCAL_E2E_ORDER_ID` e `FISCAL_E2E_SCENARIO_KEY` do ambiente Vercel Development. Também aceita os parâmetros explícitos abaixo para selecionar uma execução persistida. O runner não cria `runId`, cliente, produto ou pedido; sem um cenário válido e já persistido, encerra antes de abrir o navegador. Para transmitir, continua exigindo a autorização específica `--authorize-hml-transmission`.

```powershell
npm run test:e2e:fiscal:simulated -- --run-id <UUID> --order-id <UUID> --scenario-key <key>
npm run test:e2e:fiscal:hml -- --run-id <UUID> --order-id <UUID> --scenario-key <key>
npm run test:fiscal:e2e -- --run-id <UUID> --order-id <UUID> --scenario-key <key>
```

Esses comandos não criam artefatos. O modo HML acima valida a UI e a prévia, sem clicar em transmitir. A opção `--authorize-hml-transmission` é uma decisão operacional separada e só deve ser usada sob autorização explícita para a transmissão concreta, exclusivamente em HML. Não repetir após timeout/502 ou resposta ambígua; reconciliar a tentativa pela UI primeiro.

## Estado e limitações

- O leitor e os testes unitários de ownership, UUID, vínculos cruzados e tentativa fiscal estão no código local.
- Os testes focados do resolvedor usam mocks; não provam RLS, ownership no PostgreSQL remoto, isolamento, persistência commitada, idempotência, concorrência ou reconciliação SEFAZ.
- Esta tarefa não recebeu `runId`/`orderId` de um cenário persistido. Consultou apenas o RPC read-only de readiness no projeto vinculado: HTTP 200, `ready=true`, `policyVersion=json-artifacts-v1`, `behavioralProofRequired=false`. Não leu artefatos de uma execução, nem gravou dados, aplicou DDL, limpou registros ou transmitiu. Portanto, não declara nenhum cenário HML 55/65 aprovado.
- O resolvedor atual cobre a seleção de venda nova para pré-validação/emissão. Cenários de cancelamento, estorno e devolução precisam de leitores/estados próprios que validem documento autorizado, mesmo ambiente fiscal e vínculos da operação antes de liberar esses fluxos; não são gerados ou marcados como aprovados por este runner.
- Os cenários de venda validam o modelo esperado pela chave persistida. Após emissão explicitamente autorizada, o Playwright também exige a chave de acesso, XML assinado, `cStat=100`, protocolo e snapshot correspondentes no Supabase.
- O status histórico de homologação e das migrations está em [status-testes-homologacao.md](../fiscal/status-testes-homologacao.md); as evidências anteriores não substituem uma execução com artefato persistido selecionado.
