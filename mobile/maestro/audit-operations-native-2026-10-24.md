# Auditoria nativa de Operações — 24/10/2026

## Resultado

O flow Maestro de leitura passou no app Android instalado no telefone físico. Foram abertas as abas Resumo, Entregas, Montagens e Mapa; Resumo alternou entre Hoje e Dias Seguintes; Entregas aceitou os filtros Todas, Manhã e Tarde; e Mapa exibiu o controle de enquadramento do roteiro.

## Dispositivo e build

- Pacote: `com.morante.mobile`, versão instalada `1.6.2`, `versionCode` 29.
- O checkout declara `versionCode` 27 em `mobile/app.json`; a prova se aplica ao binário instalado, não ao código atual do checkout.
- Telefone físico Xiaomi 2312DRA50G, conectado por Depuração sem fio. Serial explícito usado: `192.168.1.4:42859`.
- O serviço de localização do Android estava desligado. A localização não foi ativada e nenhum fluxo de entrega foi iniciado.
- Projeto remoto conferido: `hkoxhourxwlddgsfdgws` (MoranteHub, `ACTIVE_HEALTHY`). Nenhum Supabase Local, Docker, emulador ou Expo Web foi usado.

## Proteção de `team_locations`

A consulta somente de metadados encontrou a policy pública `Allow anon read/write team_locations`, privilégios amplos para `anon` e `authenticated` e privilégios colunares diretos. Nenhuma linha da tabela foi consultada durante essa inspeção.

A migration [20261024230034_secure_team_locations_ownership.sql](../../supabase/migrations/20261024230034_secure_team_locations_ownership.sql) foi aplicada no projeto operacional. A verificação remota confirmou:

- RLS continua habilitado.
- A policy aberta foi removida.
- `authenticated` pode ler o próprio registro e registros de entregas ativas; `INSERT` e `UPDATE` exigem `user_id = auth.uid()::text` tanto na entrada quanto na atualização.
- `anon` e `PUBLIC` não têm privilégios diretos de tabela ou coluna. `authenticated` mantém somente `SELECT`, `INSERT` e `UPDATE`; exclusão e truncamento não são concedidos a esse papel.
- Privilégios de proprietário e `service_role` foram preservados.
- O histórico remoto registra `secure_team_locations_ownership` na versão `20261024230034`.

## Execução Maestro

- Flow: [`operations-readonly.yaml`](flows/operations/operations-readonly.yaml).
- Runner: Maestro CLI 2.10.0, `--no-reinstall-driver`, serial IP selecionado explicitamente, saída JUnit desativada (`--format=NOOP`).
- O flow confirmou os rótulos das abas e os cabeçalhos de Hoje/Dias Seguintes, alternou os filtros de turno e verificou Montagens e o controle do Mapa. Todas as etapas passaram.
- A entrada em Operações monta `useTeamLocations`, cuja rotina tenta sincronizar o status do próprio perfil. O operador havia autorizado esse efeito. Não consultei valores de `team_locations` para confirmar o resultado persistido. A policy do banco restringe qualquer escrita ao ID do usuário autenticado.
- O checkout tem um caminho especial de perfil mestre que usa um ID sentinela. Como o binário instalado é `versionCode` 29 e o checkout declara 27, não atribuí esse comportamento ao binário nem considerei a sincronização do status comprovada.
- Nenhuma ação de iniciar/finalizar entrega, registrar atendimento, preparar pedido ou alterar montagem foi acionada. Nenhuma fixture foi criada.

## Pendências e evidências locais

- Por decisão do operador, esta auditoria permanece somente de leitura; não foram testadas ações que gravam pedidos, entregas ou montagens. A consulta `excludeTestOrders` remove pedidos marcados como teste das listas de Entregas e Montagens, e a política compartilhada também exclui `schedule` e `assemblies`; uma fixture comum não aparece nessa UI. Nenhuma fixture ou exceção foi criada.
- A versão instalada difere do `versionCode` do checkout; não houve build, instalação ou limpeza de dados do app.
- O Maestro criou `commands.json`, `device-logcat.txt` e `maestro.log` em `H:\MoranteHub-Maestro-Audit-20261024\operations-run`. A listagem não mostrou screenshots. O conteúdo desses arquivos não foi aberto nem copiado. A tentativa de remover os artefatos foi recusada pela política automática do shell, então eles permanecem nesse diretório local.
