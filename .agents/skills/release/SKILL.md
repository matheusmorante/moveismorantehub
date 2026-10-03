---
name: release
description: Prepare an explicitly requested Morante Hub release or deployment. Discover the repository's current release path and reuse approved validation/deployment gates.
disable-model-invocation: true
---

# Release e publicação do Morante Hub

Use somente quando o usuário solicitar release ou publicação. Para Vercel, siga também a skill aplicável de deployments; para EAS, siga `mobile-eas-publicacao`.

## Quando aplicar esta Skill

Quando o usuário pedir explicitamente uma release, deploy Preview/Production ou publicação para usuários.

## Quando NÃO aplicar

Não use para validar um fluxo E2E sem publicar, nem para alterar um ambiente de deployment sem pedido correspondente.

## Processo

1. Inspecione uma vez o estado Git, versão, changelog, scripts de release e workflows realmente existentes. Não presuma que arquivos ou comandos de outro projeto estejam instalados.
2. Se houver um caminho de release implementado, prepare os arquivos e validações exigidos por esse caminho. Se não houver, apresente a lacuna concreta e prepare um procedimento revisável sem inventar script ou checklist.
3. Valide somente os arquivos e gates afetados pela release. Reutilize os resultados enquanto código, lockfile, configuração e alvo não mudarem; não execute `outdated`, Advisors, suíte completa ou auditoria do deployment sem motivo ligado ao escopo.
4. Preview pode ser criado e inspecionado dentro do pedido. Deploy de Produção, promoção de Preview, commit/tag e push exigem autorização explícita para a ação correspondente. Nunca exponha secrets.
5. Depois de ação autorizada, execute uma vez, verifique o resultado e retome apenas a etapa que falhou. Não repita publicação por resposta ambígua: consulte o deployment/tentativa existente primeiro.

## Segurança

- Preserve mudanças locais e não relacionadas. Nunca faça force-push.
- Para testes fiscais, use somente Preview com `tpAmb=2`; Produção fiscal continua bloqueada sem autorização e aprovação próprias, conforme `fiscal-nfe-nfce-official-docs`.
- Nunca atualize dependências apenas para cortar uma release. Atualização exige relação concreta com o artefato, risco ou requisito solicitado.

## Referências e Fonte Canônica de Documentação

- Vercel: use a skill `vercel:deployments-cicd` do ambiente para comandos da plataforma; os gates deste repositório prevalecem.
- EAS: `.agents/skills/mobile-eas-publicacao/SKILL.md`.
- Testes e gates: `.agents/skills/testes-seguros-erp/SKILL.md`.
