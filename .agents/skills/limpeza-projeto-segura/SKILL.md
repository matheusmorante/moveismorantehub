---
name: limpeza-projeto-segura
description: Limpeza segura de arquivos e diretórios desnecessários, temporários, órfãos e lixos de build no Morante Hub, com verificação estrita de não-uso, simulação prévia (dry-run) e relatório detalhado com métricas em KB/MB e contagem de itens removidos.
---

# Skill: Limpeza Segura de Projeto (Zero Perda de Código)

## Quando aplicar esta Skill
Aplicar sempre que a tarefa envolver:
- Identificação e remoção de arquivos e pastas desnecessários no projeto;
- Limpeza de relatórios voláteis de testes (`test-results/`, `playwright-report/`), dumps de terminal e logs temporários;
- Exclusão de arquivos órfãos de refatoração (`temp_*_backup.tsx`, `*.bak`, resíduos de extrações pontuais);
- Limpeza de caches e builds regeneráveis (`dist/`, `.expo/`, `.turbo/`, etc.);
- Levantamento de espaço ocupado em disco por itens não essenciais (métricas em KB e MB).

## Quando NÃO aplicar
- Para exclusão de arquivos de negócio ativos ou código que possua qualquer importação no projeto;
- Para limpeza de migrations de banco de dados (`supabase/migrations/` é inviolável);
- Para reorganização e renomeação semântica de pastas (consultar `organizacao-arquivos-diretorios`);
- Para refatoração profunda de arquitetura de código (consultar `modularizacao_codigo`).

---

## 1. Princípios Permanentes Invioláveis

> [!IMPORTANT]
> **"NA DÚVIDA, NÃO APAGUE. ANTES DE APAGAR, COMPROVE NÃO-USO. SIMULE ANTES DE EXECUTAR. NUNCA TOQUE ARQUIVOS CRÍTICOS."**

1. **Simulação Obrigatória (`--dry-run` Primeiro)**: Toda rotina de limpeza deve primeiro rodar em modo simulação, exibindo o diagnóstico, os tamanhos exatos em KB/MB e a lista discriminada para validação.
2. **Checagem Estrita de Referências**: Nenhum arquivo com extensão de código (`.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.json`) pode ser excluído sem que uma busca textual em todo o repositório comprove **zero referências e zero imports**.
3. **Lista de Bloqueio Rígida (Arquivos Sagrados)**: O agente e os scripts são terminantemente proibidos de remover ou sugerir remoção de:
   - `.git/` e qualquer subdiretório de versionamento;
   - `.env`, `.env.*` (chaves de API, senhas e configurações de ambiente);
   - `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`;
   - `tsconfig*.json`, `vite.config.*`, `metro.config.*`, `app.json`, `eas.json`, `tailwind.config.*`;
   - `supabase/migrations/` (todas as migrations SQL são dados históricos invioláveis);
   - `docs/` e `.agents/` (documentação viva, regras e skills do sistema).
4. **Proteção de Scripts Diagnósticos (`scratch/`)**: Arquivos na pasta `scratch/` são criados durante sessões de diagnóstico técnico e nunca devem ser removidos na limpeza padrão, exceto com flag explícita `--include-scratch`.
5. **Comprovação de Não-Regressão**: Sempre que arquivos forem removidos, a suíte de testes Vitest deve ser executada imediatamente após a limpeza para comprovar que nenhuma tela, rota ou utilitário foi afetado.

---

## 2. Categorização de Risco

| Nível | Categoria | Exemplos | Política de Limpeza |
|---|---|---|---|
| **Nível 1** | **Risco Zero: Lixo de SO, Dumps e Logs** | `.DS_Store`, `Thumbs.db`, `desktop.ini`, `tmp/*.log`, `tsc_output.txt`, `checklist_output.txt`, `mobile/npx`, `test-results/` | Remoção automática e imediata sob demanda. |
| **Nível 2** | **Risco Baixo: Builds e Caches Regeneráveis** | `dist/`, `build/`, `.expo/`, `.expo-ota-validation/`, `.turbo/`, `.parcel-cache/` | Remoção segura com flag `--clean-builds` (recriados em novo build). |
| **Nível 3** | **Risco Moderado: Backups e Órfãos Confirmados** | `temp_*_backup.tsx`, `*.bak`, `*.old`, `*.orig`, `test_*.wav`, `drawBannerSync_extracted.tsx` | Somente após checagem estrita de **zero imports** no repositório. |
| **Nível 4** | **Requer Confirmação: Scratches** | `scratch/*.cjs`, `scratch/*.js` | Somente com flag explícita `--include-scratch`. |

---

## 3. Scripts Automatizados da Skill

A skill disponibiliza um script Node.js utilitário em `scripts/safe_cleanup.js`:

```bash
# 1. Simulação segura (Dry-run padrão - nenhum arquivo é apagado)
node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --dry-run

# 2. Execução da limpeza segura (Níveis 1 e 3 comprovados sem import)
node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --execute

# 3. Incluindo pastas de compilação/build regeneráveis (dist/, .expo/)
node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --execute --clean-builds

# 4. Incluindo scripts temporários da pasta scratch/
node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --execute --include-scratch
```

---

## 4. Métricas e Formato de Relatório

Todo relatório emitido por esta skill deve conter obrigatoriamente:
- **Tamanho Total Liberado**: Formatado em KB e MB (ex: `1.85 MB (1.894 KB)`);
- **Quantidade de Arquivos Removidos**: Número inteiro;
- **Quantidade de Pastas Removidas**: Número inteiro;
- **Tabela discriminativa**: com nome, categoria e tamanho de cada item.
