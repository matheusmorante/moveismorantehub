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

## Atualização OTA

Antes de publicar, confirme que a mudança é compatível com o `runtimeVersion` das builds instaladas e use o canal/branch de produção correto. Não altere `version`, `versionCode` ou `runtimeVersion` só para publicar uma correção JavaScript.

Após publicar, informe que o app buscará a atualização na próxima abertura (ou após reabrir, conforme a configuração) e forneça o link/grupo do update quando disponível.

## Segurança operacional

Não publique nem gere build sem pedido do usuário. Valide o código antes da entrega em proporção ao risco e preserve alterações locais não relacionadas.
