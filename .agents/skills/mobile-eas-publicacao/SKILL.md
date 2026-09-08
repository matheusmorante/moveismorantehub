---
name: mobile-eas-publicacao
description: Publique mudanças do app mobile pelo EAS escolhendo update OTA ou build nativa, evitando consumo desnecessário de builds do Expo.
---

# Publicação do Mobile com EAS

Use esta skill ao publicar, preparar ou decidir como entregar alterações do aplicativo mobile Morante Hub via Expo/EAS.

## Escolha da entrega

Prefira **EAS Update (OTA)** quando a alteração estiver somente no código ou nos assets já empacotados e for compatível com o `runtimeVersion` das builds instaladas. Exemplos: telas, regras de apresentação, consultas, textos, lógica TypeScript/JavaScript e correções de data.

Use **EAS Build** apenas se houver uma mudança que exija novo binário nativo, como:

- dependência nativa adicionada ou atualizada;
- alteração em `app.json`/plugins que afete a parte nativa;
- permissões, Firebase/FCM, configuração Android/iOS ou código nativo;
- novo som de notificação que precisa entrar em `android/app/src/main/res/raw`;
- alteração de `runtimeVersion`, SDK Expo ou versão nativa incompatível com a build instalada.

Antes de uma build, explique objetivamente qual requisito nativo a torna necessária, qual plataforma será gerada e peça confirmação explícita do usuário. Não inicie, repita ou aumente versão de uma build por iniciativa própria.

## Checklist Obrigatório de Versionamento Unificado (Todos os Lugares)

Ao alterar versão ou gerar uma nova build nativa do App Mobile, é **obrigatório** sincronizar o versionamento em **todos** os locais abaixo sem exceção:

1. **Configuração Expo / EAS (`mobile/app.json`)**:
   - `expo.version`: Versão semântica (ex: `"1.5.0"`).
   - `expo.runtimeVersion`: Versão compatível com OTA (ex: `"1.5.0"`).
   - `expo.android.versionCode`: Número inteiro da build (ex: `13`).
2. **Código Nativo Android (`mobile/android/app/build.gradle`)**:
   - `defaultConfig.versionCode`: Número inteiro da build (ex: `13`).
   - `defaultConfig.versionName`: String da versão semântica (ex: `"1.5.0"`).
   - *Importância*: É daqui que o sistema operacional Android lê a versão ao abrir "Configurações do Celular → Aplicativos → Detalhes do Aplicativo / App Info".
3. **Constantes e Interface do App (`mobile/src/constants/appVersion.ts`)**:
   - `APP_VERSION`: Versão exibida na tela (ex: `'1.5.0'`).
   - `APP_BUILD`: Número da build exibido na tela (ex: `13`).
   - `APP_RELEASE_DATE`: Data da entrega (ex: `'07/09/2026'`).
   - Refletido no modal de perfil do operador (`ProfileModal.tsx`).
4. **Verificação de Atualização Obrigatória (`useMandatoryAppUpdate.ts`)**:
   - Validar se a build instalada corresponde à build requerida.
   - Bloquear aparelhos com APKs anteriores caso seja uma versão com mudanças nativas críticas.
5. **Banco de Dados Supabase (`settings` id `'app'`)**:
   - `data.mobileSettings.requiredAndroidBuild`: Versão da build requerida (ex: `13`).
   - `data.mobileSettings.minimumAndroidBuild`: Versão mínima permitida (ex: `13`).
   - `data.mobileSettings.androidUpdateUrl`: Link de download do novo APK gerado no EAS.
   - Sincronizado também via script `erp/scripts/migration/update_mobile_apk_config.cjs`.
6. **ERP - Landing Page de Download (`erp/src/pages/App/MobileAppLanding.tsx`)**:
   - Link de download do botão *"Baixar APK Oficial (Android)"*.
   - Texto informativo do QR code com a versão e build atuais (ex: `v1.5.0 (Build 13)`).

## Atualização OTA

Antes de publicar, confirme que a mudança é compatível com o `runtimeVersion` das builds instaladas e use o canal/branch de produção correto. Não altere `version`, `versionCode` ou `runtimeVersion` só para publicar uma correção JavaScript.

Após publicar, informe que o app buscará a atualização na próxima abertura (ou após reabrir, conforme a configuração) e forneça o link/grupo do update quando disponível.

## Segurança operacional

Não publique nem gere build sem pedido do usuário. Valide o código antes da entrega em proporção ao risco e preserve alterações locais não relacionadas.

