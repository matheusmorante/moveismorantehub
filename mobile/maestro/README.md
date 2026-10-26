# Maestro: Android físico por Depuração Wi‑Fi

O Maestro executa os flows Android somente em um celular físico pareado e conectado ao ADB pela **Depuração sem fio (Wi‑Fi)**. O executor recusa emuladores/AVDs e alvos conectados por USB. Use o Supabase remoto configurado durante o teste e siga `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`, com fixtures sintéticas próprias; Docker/Supabase Local não fazem parte do fluxo.

## Preparar o celular

1. Ative as **Opções do desenvolvedor** e **Depuração sem fio** no Android.
2. Na tela Depuração sem fio, use **Parear dispositivo com código de pareamento**. No computador, rode `adb pair IP:PORTA_DE_PAREAMENTO` e informe o código mostrado no celular.
3. Ainda na tela Depuração sem fio, use a porta de conexão exibida e rode `adb connect IP:PORTA_DE_CONEXAO`.
4. Confirme que `adb devices -l` mostra o celular como `device`. Não conecte um AVD nem selecione um serial USB.
5. Se houver mais de um celular conectado por Wi‑Fi, defina `ANDROID_SERIAL` com o serial IP:porta mostrado pelo ADB.

Requisitos: OpenJDK 17, Android SDK `platform-tools` (ADB) e Maestro CLI 2.10.0.

## Seleção da build e segurança dos fluxos

* Maestro é o runner da interface nativa Android. Playwright continua sendo o runner de navegador; não use Expo Web como prova do aplicativo instalado no celular.
* Antes do teste, registre a versão e o `versionCode` instalados no pacote `com.morante.mobile` e compare com `mobile/app.json`. Um resultado no aparelho comprova somente a build instalada; não atribua falhas ao checkout quando as versões divergirem.
* Não use `clearState: true`, não limpe os dados do app e não desinstale/reinstale uma build durante uma auditoria. Se o fluxo pedir outra build, pare e registre a limitação.
* `smoke/app-launch.yaml` só abre o app e verifica a raiz; não grava dados de estoque.
* `inventory/inventory-audit.yaml` grava um rascunho local no SQLite ao confirmar o escopo e contar, e para antes da confirmação remota. Rode com a rede do app bloqueada; o flow só exclui o rascunho quando o código visível começa com `LOCAL-`, para não tocar em contagens existentes. Se essa guarda falhar, pare e limpe somente o rascunho próprio pela UI.
* `inventory/inventory-offline-scope-ready.yaml` abre o escopo de inventário com a rede do app disponível e espera o catálogo terminar de carregar. Não cria contagem nem altera dados remotos. Depois, bloqueie a rede apenas para `com.morante.mobile` antes de executar os flows offline.
* `inventory/inventory-offline-roundtrip.yaml` parte do escopo de um Novo Inventário já aberto e carregado, cria uma contagem offline, confere a persistência ao retomá-la e exclui pela UI somente quando o primeiro rascunho exibe código `LOCAL-`. Bloqueie a rede apenas para `com.morante.mobile`, mantenha o ADB Wi‑Fi conectado e confirme a limpeza antes de encerrar.
* `inventory/inventory-offline-custom.yaml` parte do escopo já aberto, exercita seleção personalizada e busca local de produto offline, verifica a retomada e exclui apenas o rascunho próprio `LOCAL-` pela UI.
* Para compras, recebimentos e indisponibilidades, mantenha o teste em leitura: abra listas, detalhes e formulários e cancele antes de salvar, receber, desfazer ou cancelar registros existentes. Qualquer operação que altere o banco operacional exige fixture própria com `runId`, owner, vínculos e gates comprovados em [`docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`](../../docs/testing/SUPABASE_REMOTE_TEST_POLICY.md).
* `operations/operations-readonly.yaml` verifica as abas de Operações, o escopo Hoje/Dias Seguintes e os filtros de turno em Entregas. A montagem da tela também aciona a sincronização normal do próprio status em `team_locations`; execute somente com autorização do operador e com ownership/RLS já conferidos. O flow não inicia nem finaliza entregas ou montagens.
* `operations/delivery-flow-readonly.yaml` valida os caminhos visíveis para abrir o Fluxo de Entrega, as quatro etapas e seus controles, sem avançar, voltar, finalizar ou cancelar pedidos.
* `operations/delivery-details-readonly.yaml` testa em Dias Seguintes o botão de início apresentado nos detalhes, sem iniciar a rota.
* `operations/delivery-start-gate-readonly.yaml` verifica que checklist incompleto mantém o início da rota bloqueado, sem gravar pedido.
* Quando vários destinos ADB forem exibidos, selecione o serial do telefone explicitamente (`ANDROID_SERIAL` ou `--device`). Não deixe o Maestro escolher um destino ambíguo.
* Para trazer ao primeiro plano um app que continua aberto em segundo plano, use `launchApp: { stopApp: false }`; sem essa opção, o comando para e reinicia o app. Prefira o botão Voltar visível do próprio app. Use o BACK do Android apenas quando o comportamento do botão do sistema for parte do teste, pois ele pode sair do app. Veja a [referência do launchApp](https://docs.maestro.dev/reference/commands-available/launchapp).
* Depois que `dev.mobile.maestro` e `dev.mobile.maestro.test` estiverem instalados no celular, use `--no-reinstall-driver` nas execuções seguintes para evitar reinstalações do auxiliar. Se o Android retornar `INSTALL_FAILED_USER_RESTRICTED`, pare a execução e registre o bloqueio; não repita a instalação em loop.
* Se o volume padrão estiver sem espaço, passe `--test-output-dir` e `--debug-output` apontando para um volume com espaço suficiente. A [documentação de relatórios do Maestro](https://docs.maestro.dev/maestro-flows/workspace-management/test-reports-and-artifacts) descreve os artefatos de cada diretório.

## Flows (`mobile/maestro/flows/`)

```text
mobile/maestro/flows/
├── smoke/
│   └── app-launch.yaml       # Validação de inicialização e montagem do root
├── inventory/
│   ├── inventory-audit.yaml  # Abertura de Estoque, escopo, contagem e revisão
│   ├── inventory-offline-roundtrip.yaml # Rascunho local, retomada e limpeza offline
│   ├── inventory-offline-scope-ready.yaml # Carrega o catálogo antes do bloqueio
│   └── inventory-offline-custom.yaml # Busca local e contagem personalizada offline
└── operations/
    ├── operations-readonly.yaml # Abas e filtros de Operações em leitura
    ├── delivery-flow-readonly.yaml # Abertura e controles do fluxo de entrega em leitura
    ├── delivery-details-readonly.yaml # Botão do detalhe em Dias Seguintes
    └── delivery-start-gate-readonly.yaml # Bloqueio de início com checklist incompleto
```

---

## Scripts (`mobile/`)

```powershell
# Confirmar alvo físico Wi-Fi
npm run test:mobile:device

# Smoke test
npm run test:mobile:smoke

# Teste E2E de Inventário
npm run test:mobile:inventory

# Suíte Maestro
npm run test:mobile:maestro
```

O `test:mobile:build` compila e instala a development build no celular Wi‑Fi selecionado. `test:mobile:start` inicia o Metro e configura o reverse da porta 8081. Os demais comandos rodam Maestro no mesmo alvo. Relatórios JUnit ficam em `%TEMP%\morante-maestro-results`.
