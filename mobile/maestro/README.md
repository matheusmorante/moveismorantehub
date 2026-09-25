# Maestro: Android físico via USB

Este projeto executa E2E nativo somente em celular Android físico conectado por USB e autorizado no ADB. Emuladores/AVDs e depuração Wi-Fi não são suportados por estes scripts. Playwright continua para o ERP/Web e, opcionalmente, Expo Web; Vitest cobre lógica e serviços.

## Preparação do aparelho

1. Ative Opções do desenvolvedor e Depuração USB no Android.
2. Conecte com cabo de dados, desbloqueie a tela e aceite a chave RSA deste computador.
3. Verifique: `npm run test:mobile:device`. O aparelho precisa aparecer como `device` e ser identificado pelo ADB como USB físico.
4. Se o Windows não enumerar o aparelho, confira cabo/porta/modo USB; instale driver apenas do fabricante correto quando o modelo aparecer no Gerenciador de Dispositivos.

## Build e execução

Em `mobile/`:

```powershell
npm run test:mobile:device
npm run test:mobile:build
npm run test:mobile:start
```

Deixe o Metro rodando. Em outro terminal:

```powershell
npm run test:mobile:smoke
npm run test:mobile:maestro
```

`build` usa `expo run:android --device <serial> --no-bundler`, que compila/instala a development build nesse serial físico; `start` cria o reverse USB da porta 8081 e inicia Metro para development client. `smoke` roda o flow de abertura; `maestro` roda todos os flows em `maestro/flows`. Relatórios JUnit e artefatos são escritos em `%TEMP%\morante-maestro-results`.

O smoke valida apenas que o React Native montou a raiz `app-root`; não valida login, dados, estoque ou backend. Flows adicionais devem ser acrescentados por módulo, com IDs/test data próprios e validação real no aparelho antes de marcar um cenário migrado.
