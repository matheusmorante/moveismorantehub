# Maestro: Android físico por Depuração Wi‑Fi

O Maestro executa os flows Android somente em um celular físico pareado e conectado ao ADB pela **Depuração sem fio (Wi‑Fi)**. O executor recusa emuladores/AVDs e alvos conectados por USB. Use o Supabase remoto durante o teste; não inicie o Docker local em paralelo por causa do consumo de RAM.

## Preparar o celular

1. Ative as **Opções do desenvolvedor** e **Depuração sem fio** no Android.
2. Na tela Depuração sem fio, use **Parear dispositivo com código de pareamento**. No computador, rode `adb pair IP:PORTA_DE_PAREAMENTO` e informe o código mostrado no celular.
3. Ainda na tela Depuração sem fio, use a porta de conexão exibida e rode `adb connect IP:PORTA_DE_CONEXAO`.
4. Confirme que `adb devices -l` mostra o celular como `device`. Não conecte um AVD nem selecione um serial USB.
5. Se houver mais de um celular conectado por Wi‑Fi, defina `ANDROID_SERIAL` com o serial IP:porta mostrado pelo ADB.

Requisitos: OpenJDK 17, Android SDK `platform-tools` (ADB) e Maestro CLI 2.10.0.

## Flows (`mobile/maestro/flows/`)

```text
mobile/maestro/flows/
├── smoke/
│   └── app-launch.yaml       # Validação de inicialização e montagem do root
└── inventory/
    └── inventory-audit.yaml   # Abertura de Estoque, escopo, contagem e revisão
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
