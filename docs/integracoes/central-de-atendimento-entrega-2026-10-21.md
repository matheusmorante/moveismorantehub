# Central — preparação da entrega em 21/10/2026

> Estado posterior da publicação e dos gates: [registro atual](central-de-atendimento-publicacao-2026-10-21.md). As seções abaixo preservam os checkpoints da preparação; autorização, presença do App Secret e correções de runtime avançaram depois deles.

## Alvo e base conferidos

Projeto Vercel `morantehub`, ID `prj_cj2JEx1xLPgqhFUH9FiMcPq58YrQ`, equipe `team_dgKjq9dB1Rwj8tUl7ZNAlZ69`. A produção READY `dpl_6FDFHaFHkbcPBfM3gkc1qcTrkaKn` corresponde ao commit `1af47d95f428dee37044794f30e78d3b843792d7`, também HEAD do checkout no momento da preparação. Nenhuma publicação foi executada nesta etapa.

Candidato local em `C:/Users/mathe/morantehub-central-release-20261021/source`, criado de `git archive HEAD` e das alterações selecionadas da Central. `manifest.json` no diretório pai registra 86 caminhos, operação e SHA-256: 85 cópias e a exclusão do nome antigo da migration inicial. Contém frontend/serviços da Central, proxy/webhook, schema, harnesses, seis migrations, documentação da Central e ajustes necessários de ferramentas. Alterações não relacionadas de fiscal, produtos, estoque, mobile e catálogo ficaram fora dessa seleção. Inventários/documentos compartilhados conservam seus registros no checkout principal e não foram copiados integralmente para o candidato.

As dependências locais são junctions para as instalações existentes; nenhum arquivo `.env`, storage state ou credencial foi copiado do checkout. O candidato não é uma nova implantação nem um ambiente de banco. O primeiro teste da seleção detectou a omissão de `erp/api/whatsapp-webhook.ts`; esse arquivo foi incluído no manifesto e a suíte foi repetida.

## Provas do candidato

- Vitest/RTL final: 19 arquivos, 185 casos aprovados e seis checks remotos explicitamente desativados nesta cópia sem ambiente de credenciais. No checkout principal, o conjunto completo passou em 191 casos, incluindo os seis checks negativos reais. O backend também foi compilado pelo esbuild no teste HTTP Vitest.
- Build Vite do candidato: aprovado em 1m46s, com avisos de tamanho de chunks. A atualização posterior da configuração de mídia alterou somente backend/testes; a suíte do candidato foi repetida e passou. Isso não equivale ao build/deploy completo na infraestrutura Vercel.
- Provas remotas graváveis e Playwright: [conferência e limites](central-de-atendimento-validacao-2026-10-21.md). A massa foi encerrada: 51 conversas arquivadas, pasta excluída e 190 mensagens/eventos retidos. Não reutilizar a execução para novos writes.
- Playwright de leitura final no checkout principal: 1/1 em 12,7s após o complemento de mídia. TypeScript global: 424 diagnósticos, nenhum na Central. Diff focado sem erros de whitespace. Seguem pendentes as respostas sobre publicação e fonte protegida do App Secret.

## Configuração observada

A consulta autenticada de metadata das variáveis do projeto, com `decrypt=false`, não listou `WHATSAPP_APP_SECRET`/`META_APP_SECRET`, nem `WHATSAPP_ACCESS_TOKEN`/`META_ACCESS_TOKEN`/`WHATSAPP_TOKEN`. Retornou zero variáveis de produção ocultas. O outro projeto da mesma equipe, `erp`, não retornou variáveis. As variáveis públicas do Supabase e `SUPABASE_SECRET_KEY` de produção estão presentes; nenhum valor foi impresso ou copiado para a evidência.

Uma consulta restrita a booleanos de presença em `settings/app` confirmou token de acesso, número e WABA do canal existente, com número correspondente às conversas. Não encontrou `appSecret`. O proxy passou a reutilizar essa configuração no servidor quando não houver token no ambiente, exigindo JWT/permissão/mensagem RLS e correspondência do canal antes de usar a chave. Treze testes isolados passaram; não foi atestada a validade externa do token nem baixada mídia real. Nenhum segredo foi retornado pela inspeção de metadata.

O webhook rejeita POST em produção quando o segredo de assinatura está ausente. Portanto, o App Secret válido permanece um gate de recebimento. Não inventar segredo nem remover a guarda. A configuração deve ser disponibilizada por uma fonte autorizada/protegida, sem colar o valor no chat. A ferramenta de navegador da aplicação retornou erro de inicialização `os error 3`; não foi possível usá-la para consultar uma eventual sessão Meta existente. O Playwright da Inbox continua funcional. Essas observações não são um teste de disponibilidade do canal publicado.

## Ordem de implantação ainda não executada

1. Conferir a configuração válida do canal Meta e o alvo de produção; preservar o bloqueio de envio.
2. Aprovar a publicação concreta deste candidato com frontend e backend correspondentes.
3. Publicar e conferir identidade/build, consulta autenticada e guardas HTTP. Uma prova gravável adicional exige fixture autorizada ainda não encerrada; os resultados anteriores não certificam uma versão publicada diferente.
4. Somente após o frontend compatível estar publicado e o gate de prova atendido, aplicar `sql/customer-support-internal-commands-contract.sql`: revogar INSERT direto de mensagens e os campos de UPDATE substituídos por RPC, conservando apenas `unread_count`.
5. Conferir a restrição e manter os históricos. Rollback do frontend após a contração exige versão ainda compatível com as RPCs; não restaurar privilégios de autoria por inferência.

Até lá o contrato autenticado legado continua disponível para compatibilidade; não declarar autoria impossível de forjar por esse caminho. Nenhuma nova escolha do benchmark foi implementada.

## Autorização posterior e prévia completa

O proprietário respondeu **“Autorizar publicação desse candidato”**. A autorização vale para os 86 caminhos preparados, projeto/equipe acima, preservando o envio bloqueado e a condição de conferir a configuração Meta. Não solicitar a mesma autorização novamente. A cópia aprovada mantém o manifesto SHA-256 `0E517FD08FDC8DD7B5207A32B4A494C7E80B8A31DEEC4C8001766A00B274769A`; os registros posteriores ficam fora da cópia congelada.

O build completo `npm run build` da cópia passou: empacotamento, inicialização nativa e contagem de **12/12 funções**, seguidos do Vite em **2m20s**, código de saída zero. Executado sem credenciais fiscais/Supabase/VITE no ambiente do processo, sem banco, certificado ou transmissão. A documentação fiscal vigente e os invariantes foram consultados para esse gate; nenhum código/regra fiscal foi alterado. Os 85 hashes dos arquivos selecionados continuam idênticos ao manifesto.

O proprietário recebeu a orientação para cadastrar **`WHATSAPP_APP_SECRET`**, ambiente **Production**, tipo **Secret**, com o segredo do aplicativo Meta. A [documentação atual da Vercel](https://vercel.com/docs/environment-variables/sensitive-environment-variables) usa os tipos Config/Secret; Sensitive é legado. A última conferência de metadata ainda não encontrou a variável. A publicação não foi iniciada e a contração permanece condicionada ao deploy compatível.
