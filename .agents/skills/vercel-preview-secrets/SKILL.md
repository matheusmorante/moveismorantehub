---
name: vercel-preview-secrets
description: Configure and validate Vercel Preview deployments and backend secrets, including Supabase Secret Keys, without exposing values or changing Production.
---

# Vercel Preview e Secrets de backend

Use esta skill ao configurar variáveis de ambiente, criar deployments Preview ou executar backends que dependam de Secrets armazenados na Vercel.

## Regras para variáveis e Secrets

- Mantenha Secrets no runtime do backend. Nunca os imprima, registre em logs, inclua no código, grave em arquivos temporários ou exponha em respostas, snapshots e relatórios.
- Para variáveis Config, use `vercel env run` ou `vercel env pull` quando apropriado. Não tente extrair Secrets da Vercel para desenvolvimento local; execute o backend que os consome em Preview.
- Em testes, use Preview, nunca `--prod`, e não altere variáveis nem deployments de Production. Restrinja Secrets à branch do Preview quando isso atender ao fluxo.
- Ao inserir um Secret manualmente, passe-o diretamente entre os sistemas confiáveis sem colocá-lo em argumentos de comando, arquivos ou saídas de automação. Confirme somente nome da variável, tipo e escopo.
- Para backend Supabase, prefira `SUPABASE_SECRET_KEY` (`sb_secret_...`) e mantenha `SUPABASE_SERVICE_ROLE_KEY` apenas como fallback temporário de compatibilidade. A Secret Key é opaca: não tente decodificá-la como JWT nem verificar `iat` ou data de emissão.
- Se um Secret aparecer em saída, snapshot, log ou arquivo, considere-o comprometido: interrompa seu uso, remova as cópias temporárias controláveis e solicite rotação antes de continuar.

## Deployment Preview e readiness

- Após uma mudança de variável ou de código necessária, crie um novo deployment Preview e confirme o escopo da branch sem exibir valores.
- Para um fluxo fiscal, o readiness retorna apenas booleanos de configuração e `tpAmb`; deve confirmar `tpAmb=2` antes de qualquer emissão HML. Nunca retorne valor, prefixo completo, hash reutilizável ou trecho de credencial.
- Se um requisito retornar `false`, investigue somente esse requisito. Corrija-o, execute um único readiness mínimo e retome o fluxo do último gate aprovado; não repita verificações sem relação com a mudança.
