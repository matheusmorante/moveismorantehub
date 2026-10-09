---
name: vercel-development
description: Política principal de sincronização segura das variáveis Vercel Development para desenvolvimento local do Morante Hub.
---

# Ambiente local Vercel Development

Esta skill é a fonte principal da política de variáveis de ambiente Vercel no Morante Hub. Regras, skills de domínio e scripts devem apontar para este arquivo em vez de manter cópias que possam divergir.

## Fluxo diário

O desenvolvedor inicia o ambiente com:

```bash
npm run dev
```

O script raiz executa `dev:stack` dentro do ambiente Vercel Development, passando o diretório `.vercel` como cwd e o project ID vinculado explicitamente:

```bash
node scripts/run-vercel-env-dev.cjs
```

`dev:stack` compila o bundle fiscal e inicia ERP e API. Não há `predev` fazendo `env pull`: `env run` injeta os valores Development no processo em memória, inclusive secrets disponíveis nesse ambiente. O cwd isolado impede que `.env.local` substitua valores retornados pelo Vercel CLI. O launcher limpa variáveis fiscais, Supabase, Vite e overrides TLS herdados antes da consulta e identifica a origem com `MORANTE_ENV_SOURCE=vercel-development`.

O backend deve aceitar `SUPABASE_SECRET_KEY` diretamente e usar `SUPABASE_SERVICE_ROLE_KEY` somente como fallback de compatibilidade. A API herda as variáveis injetadas sem carregar `.env.local`; o Vite usa o cwd isolado como `envDir`. Os entry points internos exigem a identificação do launcher. Os aliases `dev:erp`, `dev:api` e o `dev` do workspace ERP passam pelo mesmo launcher; o comando oficial continua sendo `npm run dev` na raiz.

Para executar somente a API, use `node scripts/run-vercel-env-dev.cjs api`.

## Projeto e ambientes

- Desenvolvimento local sempre usa o ambiente **Development**. Preview não é fonte padrão e Production nunca é fonte de variáveis locais.
- Confirme `.vercel/project.json` antes do primeiro `env run` ou pull. Se o repositório ainda não estiver vinculado ao projeto esperado, faça `vercel link` uma vez como bootstrap; não relink nem crie branch para transportar variáveis.
- Use Preview somente quando uma função depender do runtime, roteamento ou deployment Vercel, ou quando um secret estiver deliberadamente indisponível localmente e não puder ter credencial própria de Development.
- Não use a API REST Vercel para baixar variáveis ao repositório. `vercel env run` é o padrão para iniciar processos locais. Use `vercel env pull` apenas quando solicitado e ciente de que secrets write-only podem não ser recuperáveis para arquivo.

## Arquivos locais e secrets

- `.env.local` não é a fonte de verdade para secrets write-only: o CLI pode manter um valor local antigo quando a Vercel não permite recuperá-lo. Não use comparação de `.env.local` para confirmar secrets `Hidden`/`Secret`; use `env run` para o processo, verificando apenas presença booleana sem imprimir o valor.
- `.env.local` e `.env.*.local` devem permanecer ignorados pelo Git. Não versione, imprima, registre ou copie valores de secrets em logs, documentação, backups versionados ou relatórios.
- Antes de adotar o pull em um projeto que já tenha `.env.local`, identifique apenas os nomes das chaves locais e preserve configurações legítimas em arquivo local apropriado ao consumidor, como `.env.development.local`. Não revele os valores durante a auditoria.
- Cadastre no Vercel Development credenciais adequadas para uso local quando isso for apropriado. Para Supabase backend, prefira `SUPABASE_SECRET_KEY`; mantenha `SUPABASE_SERVICE_ROLE_KEY` apenas durante compatibilidade necessária.
- Secrets com proteção que impede recuperação local não devem ter seu tipo rebaixado nem ser revelados para permitir pull. Se o usuário autorizar explicitamente ampliar para Development uma credencial existente apropriada para homologação, preserve o tipo e os escopos atuais e adicione Development.

## Segurança fiscal

- Development local deve conter configuração fiscal de homologação. Para NF-e/NFC-e local, `tpAmb=2` é obrigatório; `environment=1` e `tpAmb=1` são exclusivamente Produção.
- Nunca copie para Development certificados, senhas, CSRT ou flags exclusivas de Produção, nem valores que possam habilitar `tpAmb=1`.
- A sincronização local não emite documentos nem altera configuração remota. Persistência/emissão fiscal e dados seguem os gates da skill `testes-seguros-erp` e das skills fiscais.

## Validação e diagnóstico

- Não mostre o conteúdo de `.env.local`. Quando precisar verificar disponibilidade, reporte somente presença booleana por grupo de variáveis e confirme `tpAmb=2` sem imprimir valores.
- Um erro de `env run` deve ser tratado antes de iniciar o ambiente. Classifique a mensagem da CLI como autenticação, projeto não vinculado, TLS/rede ou falta de acesso ao Development. Não continue com um `.env.local` antigo como fallback.
- Se uma variável estiver ausente, identifique somente seu nome, corrija o ambiente Development autorizado, execute `npm run dev` novamente e retome do ponto afetado; não reabra gates sem relação com a ausência.
- Após `env run`, confirme nomes necessários e presença booleana. Não acesse Production para comparação ou fallback.
- `test:nfe:hml` usa o mesmo `env run` isolado e executa apenas probes TLS/WSDL, status e consultas; não transmite notas. O antigo lifecycle de pull e o entry point de emissão por CLI foram desativados.
- Mudanças em regras/script devem verificar que `npm run dev` usa somente Development, `dev:stack` mantém compilação e inicialização, `.env*.local` segue ignorado e nenhum valor sensível aparece.
