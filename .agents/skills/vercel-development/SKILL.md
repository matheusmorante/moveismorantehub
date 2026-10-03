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

O script raiz `predev` executa uma vez por inicialização:

```bash
npx vercel env pull .env.local --environment=development --yes
```

O comando `dev` existente permanece responsável por compilar o bundle fiscal e iniciar ERP e API. Scripts filhos não fazem pulls redundantes. Como o lifecycle `predev` falha fechado, a aplicação não inicia usando um `.env.local` antigo quando o pull falha.

O backend deve aceitar `SUPABASE_SECRET_KEY` diretamente e usar `SUPABASE_SERVICE_ROLE_KEY` somente como fallback de compatibilidade. O launcher local carrega `.env.local` em `process.env` e inicia a API com `env: process.env`, sem criar aliases ou duplicar secrets.

Não encadeie o pull dentro de `dev`. Para executar somente a API sem escrever arquivo, a alternativa pontual é `vercel env run -e development -- npm run dev:api:serve`.

## Projeto e ambientes

- Desenvolvimento local sempre usa o ambiente **Development**. Preview não é fonte padrão e Production nunca é fonte de variáveis locais.
- Confirme `.vercel/project.json` antes do primeiro pull. Se o repositório ainda não estiver vinculado ao projeto esperado, faça `vercel link` uma vez como bootstrap; não relink nem crie branch para transportar variáveis.
- Use Preview somente quando uma função depender do runtime, roteamento ou deployment Vercel, ou quando um secret estiver deliberadamente indisponível localmente e não puder ter credencial própria de Development.
- Não use a API REST Vercel para baixar variáveis ao repositório. `vercel env pull` é o padrão; `vercel env run` é a alternativa quando não se deve criar `.env.local`.

## Arquivos locais e secrets

- `.env.local` é gerenciado por `vercel env pull`. O CLI pode manter chaves locais que não estejam cadastradas em Development (ele as reporta como `Kept`); por isso, não mantenha nele valores manuais importantes. Migre configurações legítimas para arquivo local apropriado ao consumidor antes de adotar o pull.
- `.env.local` e `.env.*.local` devem permanecer ignorados pelo Git. Não versione, imprima, registre ou copie valores de secrets em logs, documentação, backups versionados ou relatórios.
- Antes de adotar o pull em um projeto que já tenha `.env.local`, identifique apenas os nomes das chaves locais e preserve configurações legítimas em arquivo local apropriado ao consumidor, como `.env.development.local`. Não revele os valores durante a auditoria.
- Cadastre no Vercel Development credenciais adequadas para uso local quando isso for apropriado. Para Supabase backend, prefira `SUPABASE_SECRET_KEY`; mantenha `SUPABASE_SERVICE_ROLE_KEY` apenas durante compatibilidade necessária.
- Secrets com proteção que impede recuperação local não devem ter seu tipo rebaixado nem ser revelados para permitir pull. Se o usuário autorizar explicitamente ampliar para Development uma credencial existente apropriada para homologação, preserve o tipo e os escopos atuais e adicione Development. Se a Vercel exigir a reentrada de um valor write-only ou não permitir reutilizar um vínculo de branch Preview, deixe a nova entrada preparada e peça que o usuário digite o valor diretamente no Dashboard; não revele, copie ou transmita o valor pelo agente.

## Segurança fiscal

- Development local deve conter configuração fiscal de homologação. Para NF-e/NFC-e local, `tpAmb=2` é obrigatório; `environment=1` e `tpAmb=1` são exclusivamente Produção.
- Nunca copie para Development certificados, senhas, CSRT ou flags exclusivas de Produção, nem valores que possam habilitar `tpAmb=1`.
- A sincronização local não emite documentos nem altera configuração remota. Persistência/emissão fiscal e dados seguem os gates da skill `testes-seguros-erp` e das skills fiscais.

## Validação e diagnóstico

- Não mostre o conteúdo de `.env.local`. Quando precisar verificar disponibilidade, reporte somente presença booleana por grupo de variáveis e confirme `tpAmb=2` sem imprimir valores.
- Um erro de `predev` deve ser tratado antes de iniciar o ambiente. Classifique a mensagem da CLI como autenticação, projeto não vinculado, TLS/rede ou falta de acesso ao Development. Não continue silenciosamente com arquivo antigo.
- Se uma variável estiver ausente, identifique somente seu nome, corrija o ambiente Development autorizado, execute `npm run dev` novamente e retome do ponto afetado; não reabra gates sem relação com a ausência.
- Após `env pull`, confirme nomes necessários e presença booleana. Não acesse Production para comparação ou fallback.
- Mudanças em regras/script devem verificar que `predev` roda uma vez, `dev` continua igual, `.env*.local` está ignorado, nenhum valor sensível aparece e nenhum pull de Production ocorreu.
