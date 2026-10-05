---
name: organizacao-arquivos-diretorios
description: Diretrizes obrigatórias para organização estruturada de pastas, arquivos e subpastas no Morante Hub, garantindo migração segura sem perda de código, preservação de imports e integridade absoluta do sistema com reauditoria de arquitetura.
---

# Skill: Organização Estruturada de Arquivos e Diretórios (Zero Perda de Código)

## Quando aplicar esta Skill
Aplicar sempre que a tarefa envolver:
- Reorganização quando a árvore de diretórios não expressar claramente os domínios, as responsabilidades ou a propriedade dos arquivos;
- Separação de arquivos relacionados que estejam dispersos ou agrupados com responsabilidades distintas;
- Criação, fusão ou remoção de subpastas semânticas (`components/`, `modals/`, `services/`, `hooks/`, `utils/`, `types/`, `sections/`);
- Movimentação de arquivos e componentes para novas estruturas de diretório;
- Limpeza e padronização visual da árvore de pastas do ERP ou Mobile.

## 1. Organização guiada por coesão, sem limites por quantidade
- Mantenha arquivos diretamente na pasta quando pertencerem claramente ao mesmo módulo.
- Decida a estrutura com base em responsabilidade única, coesão, dependências e facilidade de descoberta. A quantidade de arquivos não determina a qualidade da organização.

## 2. Princípio Fundamental de Segurança em Movimentações
> [!IMPORTANT]
> **"NENHUMA INFORMAÇÃO É PERDIDA. NENHUM IMPORT É QUEBRADO. NENHUM CAMINHO CRÍTICO É ALTERADO SEM TESTES."**
1. Nunca apague ou sobrescreva arquivos sem garantir que o novo destino contém 100% do conteúdo.
2. Crie Barrels Reexportadores ou atualize todos os consumidores.
3. Valide a compilação (TypeScript/Vitest).

# REGRAS OBRIGATÓRIAS DE AUDITORIA DE ORGANIZAÇÃO

A organização de pastas e arquivos também deve seguir critérios objetivos de reauditoria para não encerrar a tarefa prematuramente.

## 1. AUDITORIA DEVE SER GLOBAL DENTRO DO ESCOPO
Ao organizar um módulo, faça uma varredura em **todos** os arquivos do escopo e inspecione a localização das responsabilidades. Não limite a análise aos arquivos que o usuário apontou. A tarefa não está concluída enquanto houver arquivos obviamente mal posicionados no módulo auditado.

## 2. SEPARAÇÃO DE RESPONSABILIDADES
Aplique o padrão canônico apenas quando fizer sentido:
- `components/`: Componentes visuais secundários da tela.
- `modals/`: Diálogos modais, overlays de confirmação.
- `hooks/`: Custom hooks específicos daquele módulo.
- `services/`: Lógica de cálculo, integrações, Supabase.
- `utils/`: Funções puras, formatação.
- `types/`: Interfaces e enums exclusivos.

**Não crie subpastas genéricas (ex: utils/tudo.ts) nem pastas se não houver responsabilidade concreta correspondente.**

## 3. UI NÃO DEVE VIRAR CAMADA DE INFRAESTRUTURA
Ao organizar as pastas, verifique se existem serviços ou infraestrutura (chamadas diretas ao Supabase, queries) escondidos em pastas de UI (como `components/` ou `hooks/`). Mova-os para `services/` ou `repositories/`.

## 4. DOMÍNIO NÃO DEVE FICAR ESPALHADO NA UI
Ao reorganizar os diretórios, identifique regras fiscais, status e validações de domínio e centralize-os em subpastas adequadas do domínio.

## 5. VERIFICAR ORGANIZAÇÃO GLOBAL
Durante a organização, analise:
- Nomes de arquivos e diretórios;
- Módulos com arquivos em lugares incorretos;
- Arquivos duplicados e helpers genéricos demais;
- Imports com caminhos excessivamente profundos ou dependências circulares.
- Não reorganize por estética, mas sim para melhorar fronteiras arquiteturais.

## 6. EVITAR REFATORAÇÃO COSMÉTICA
Não crie dezenas de arquivos pequenos apenas para diluir um arquivo grande, se isso não reduzir o acoplamento real ou melhorar a arquitetura.

## 7. REAUDITORIA OBRIGATÓRIA
Depois de mover e organizar: **AUDITE NOVAMENTE A ÁRVORE DE DIRETÓRIOS DO ESCOPO.**
Não faça: `criei as pastas -> testes passaram -> concluído`.
O correto é: `organização -> correção de imports -> REAUDITORIA -> verificar se existem arquivos que restaram mal posicionados`.

## 8. CRITÉRIO DE SAÍDA E RELATÓRIO FINAL
Antes de concluir, garanta que:
- Não existem arquivos visivelmente fora de contexto.
- Os imports não indicam fronteiras ruins.
- Os testes relevantes continuam passando.

Ao final, forneça um **relatório honesto** indicando a árvore nova, os problemas resolvidos e os problemas restantes (se houverem). Não declare que "A organização está perfeita" sem evidência da reauditoria.
