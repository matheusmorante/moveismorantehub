# Guia de Instalao e Build (App Mobile Moveis Morante)

Este diretrio contm o cdigo-fonte nativo em **React Native (Expo)** do aplicativo móvel.

## Pr-requisitos
- Node.js instalado
- Celular Android ou iOS com o aplicativo **Expo Go** instalado (para testes rpidos)

## Como Rodar Agora (Modo Desenvolvedor)
1. No terminal, v para a pasta: `cd mobile`
2. Instale as dependncias: `npm install`
3. Inicie o servidor: `npx expo start`
4. Use a câmera do seu celular para escanear o **QR Code** que aparecer no terminal e o app abrir instantaneamente via **Expo Go**.

## Como Gerar o Arquivo .APK (para instalar no Android)
Para gerar um instalador real e distribuir para a equipe:
1. Instale a CLI do EAS: `npm install -g eas-cli`
2. Faa login (ou crie conta): `eas login`
3. Configure o projeto: `eas build:configure`
4. Gere o APK: `eas build --platform android --profile preview`

O link para download do .apk ser gerado no terminal aps o trmino da build.

## Funcionalidades Prontas
- **GPS Real-time**: Rastreamento de localização do montador/motorista.
- **Camera Scanner**: Leitura de códigos de barra e QR codes via câmera nativa.
- **WebView Hub**: Acesso a todas as funções do ERP com navegação nativa ultra-rápida.
- **Comunicação bidirecional**: O app conversa com o sistema web via `postMessage`.
