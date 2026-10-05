# Política de Testes com Supabase Remoto

Esta é a política canônica para testes de integração que dependem de PostgreSQL/Supabase neste projeto. Use o projeto remoto já configurado no app. Docker e Supabase Local não fazem parte do fluxo de desenvolvimento ou validação.

## Ambiente e confirmação do projeto

- Antes de qualquer leitura ou escrita, confirme que o project ref selecionado corresponde ao ambiente Development configurado no app. Registre apenas o ref e nunca imprima tokens, senhas ou credenciais.
- Não crie projeto ou branch Supabase separado para testes. O ambiente físico do banco não determina o ambiente de negócio usado pela aplicação.
- Use Vitest/RTL e mocks para lógica isolada. Use o Supabase remoto para integração real de RPC, RLS, constraints, triggers, persistência e migrations revisadas.

## Massa sintética e efeitos

- Gere um `testRunId` exclusivo no formato `TEST_AUT_<uuid>` por cenário e registre em memória todos os IDs criados. Atualizações e remoções devem comprovar que cada ID pertence à execução atual.
- Para testes de banco, atomicidade, concorrência, rollback e fluxos comerciais com efeitos em estoque ou financeiro, use registros sintéticos próprios; não use registros operacionais como fixtures nesses cenários.
- **Exceção para smoke test de emissão fiscal em Homologação:** quando o usuário autorizar explicitamente a emissão, pode-se usar um pedido operacional existente na interface do ERP. Não é obrigatório criar pedido sintético nem usar sessão de navegador isolada. Antes de transmitir, confirme `environment=2`/`tpAmb=2`, endpoint exclusivamente de Homologação, ausência de documento/tentativa HML prévia ou incerta para o pedido e NCM compatível com cada produto. Não altere dados comerciais, estoque ou financeiro do pedido. O documento, snapshot e protocolo HML gerados são fatos fiscais rastreáveis e permanecem registrados; confirme que a emissão não cria efeitos de estoque/financeiro nem contamina indicadores.
- **Transmissão manual somente pela interface do ERP:** qualquer teste que efetivamente envie NF-e/NFC-e à SEFAZ, inclusive em Homologação, deve ser executado e validado pelo fluxo da UI. É proibido transmitir por CLI, scripts, SQL ou HTTP direto. Ferramentas técnicas podem executar testes locais/mocados e consultas somente leitura. Em timeout/502 ou resposta ambígua, consultar e reconciliar a tentativa existente na própria interface antes de considerar retry; documentos HML são persistentes e não devem ser tratados como reversíveis.
- Antes e depois do fluxo, confira pedidos, estoque, reservas, financeiro e indicadores afetados. Confirme que dashboards excluem a massa por uma regra verificável, não somente por nome ou observação.
- Limpe fixtures pelo fluxo normal e reverta efeitos somente quando suportado. Preserve históricos confirmados, trilha de auditoria e registros fiscais que precisem permanecer rastreáveis.
- Um produto real do catálogo pode ser referenciado somente quando autorizado, sem editar seu cadastro, custo ou saldo.

## Escritas, transações e migrations

- Mantenha testes de banco restritos aos registros sintéticos próprios. Use RPCs e APIs reais para validar sucesso, parâmetros inválidos, permissões, constraints, idempotência e estado persistido. A exceção de pedido operacional vale somente para smoke test de emissão HML autorizada descrito acima.
- Rollback ou concorrência só podem ser exercitados com fixtures próprias e operações limitadas que não afetem registros compartilhados. Não faça fault injection de amplo alcance, carga ou concorrência em tabelas/linhas operacionais. Se não for possível isolar um caso no projeto remoto, registre a evidência como não executada e explique o risco concreto; prossiga com as demais validações.
- Para migrations: revise o SQL completo, confirme o project ref, confira histórico/estado atual, execute `npm run advisors`, avalie compatibilidade e impacto, aplique a migration versionada pelo caminho autorizado e confira o resultado. Não use reset, `DROP`, `TRUNCATE`, DDL experimental ou alteração ampla de RLS no banco compartilhado.
- Depois da migration, valide os comportamentos afetados com fixtures sintéticas e operações normais. A execução remota não comprova instalação em banco vazio ou upgrade de cópia isolada; declare essa limitação quando aplicável.

## Relato de evidências

Relate a camada validada e use a matriz:

`Teste | Executado | Projeto/ref (sem credenciais) | Massa sintética/testRunId | Resultado | Limitação/evidência pendente`

Não descreva mocks como prova de integração PostgreSQL. Não declare atomicidade, rollback, RLS, idempotência ou concorrência como comprovados sem exercitar a propriedade na camada correspondente. Não marque falta de Docker como bloqueio; documente somente impedimentos concretos de acesso ao projeto remoto. Para a exceção fiscal HML, registre o pedido usado sem expor dados pessoais e a autorização explícita do usuário.
