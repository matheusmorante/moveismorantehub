# Auditoria — destinatário contribuinte do ICMS e consumidor final

**Estado:** auditoria de regra em andamento; família executável permanece `DRAFT`.
**Família:** `INTERSTATE-TAXPAYER-FINAL-BASE`.
**Escopo modelado:** emitente PR, CRT 1, NF-e 55, destinatário contribuinte (`indIEDest=1`) e consumidor final (`indFinal=1`); a regra ainda usa curingas para UF de destino e mercadoria.
**Caso concreto:** pendente. O pedido HML #4268 foi descartado pelo usuário como cadastro incorreto e não é uma fixture fiscal válida.

## Decisão sobre o pedido #4268

Não usar os dados de #4268, do destinatário ou do produto cadastrado nele para concluir CFOP, CSOSN, ICMS, ST, DIFAL/FCP ou qualquer outro campo da saída. Não alterar o pedido, o produto ou os documentos ligados a eles. O usuário criará novos produtos de teste manualmente; a auditoria concreta será retomada com esses dados.

O pedido não foi usado para transmissão e não houve gravação remota nesta etapa. Os dados observados anteriormente pertencem a um registro que o usuário declarou incorreto, portanto não sustentam uma decisão de emissão. A finalidade fiscal persistida permanece ausente nesse registro e não deve ser completada artificialmente.

## Comportamento implementado no código local

- `fiscalContext.acquisitionPurpose` distingue `resale`, `use_consumption` e `fixed_asset` e é salvo pelo fluxo transacional de atualização do pedido.
- Na emissão interestadual, `indFinal` é derivado dessa finalidade persistida. Um booleano legado `finalConsumer=true` sem finalidade explícita não completa a decisão.
- O backend rejeita finalidade ausente ou divergente antes da consulta à matriz; o validador e o construtor do XML também impedem preparar XML sem finalidade válida.
- A matriz continua bloqueando famílias em `DRAFT`; não há aprovação ampla PR→SC nem liberação de emissão interestadual.

## Fundamentos oficiais já verificados — limites de aplicação

### Classificação da operação e CFOP

A tabela CFOP do CONFAZ distingue `6.101` (venda interestadual de produção do estabelecimento) de `6.102` (venda interestadual de mercadoria adquirida ou recebida de terceiros). Logo, o CFOP depende da natureza real da mercadoria e da operação. Sem cadastro de teste confiável e classificação de propriedade/produção, não se escolhe um dos dois para uma emissão concreta.

### CSOSN 103 e enquadramento do emitente

O MOC da NF-e descreve CSOSN `103` como isenção do ICMS no Simples Nacional para faixa de receita bruta. O art. 2º da Lei PR nº 15.562/2007 prevê o benefício para optantes estabelecidas no Paraná com RBT12 de até R$ 360.000, observadas as condições da norma. O usuário confirmou que o emitente está na faixa que permite CSOSN `103`; essa premissa não autoriza trocar automaticamente para `102` só por a operação ser interestadual.

Para o caso concreto ainda será necessário validar os fatos da emissão e a aplicabilidade do enquadramento ao período/operação. A regra candidata `103` não aprova, por si só, uma família interestadual nem define tratamento de ICMS-ST ou outros campos.

### Consumidor final contribuinte, DIFAL e grupo XML

O MOC da NF-e restringe o grupo `ICMSUFDest` à operação interestadual destinada a consumidor final **não contribuinte** (`indIEDest=9`); para destinatário contribuinte (`indIEDest=1`), esse grupo não deve ser emitido. O eventual diferencial devido pelo destinatário contribuinte na entrada para uso/consumo ou ativo é analisado segundo a legislação do estado de destino e não se confunde com o grupo `ICMSUFDest` da NF-e do vendedor.

No caso de SC, os arts. 3º, XIV, e 9º do RICMS/SC tratam da entrada de mercadoria para uso/consumo ou ativo e da diferença de alíquotas. A finalidade específica precisa ser conhecida: `indFinal=1` sozinho não diferencia uso/consumo de ativo imobilizado, e não deve ser inferido a partir do tipo de pessoa ou da inscrição estadual.

### ICMS-ST e classificação de mercadoria

O Convênio ICMS 142/2018 associa CEST a combinações de NCM/descrição e determina sua informação nos casos previstos, mas a existência de CEST não prova que a operação esteja sujeita à ST. PR e SC alteram suas listas e regras ao longo do tempo; para cada produto novo será necessário confirmar NCM, CEST, descrição comercial, origem, papel na cadeia e vigência da regra aplicável. Nenhuma classificação fiscal do produto de #4268 será reutilizada.

## Campos a decidir para a próxima fixture

| Campo | Situação antes de receber a nova fixture | Fundamento / evidência necessária | Estado |
|---|---|---|---|
| `indIEDest` | Usar o cadastro fiscal real do destinatário | Cadastro/IE e enquadramento estadual | Pendente |
| `indFinal` e finalidade | Persistir uma escolha explícita: revenda, uso/consumo ou ativo | Pedido/ordem de compra; finalidade ausente bloqueia | Pendente |
| CFOP | Depende de produção própria ou mercadoria de terceiros e da operação | Tabela CFOP CONFAZ + origem comercial real | Pendente |
| NCM, CEST, `orig` | Não herdar do #4268 | Cadastro validado, ficha do produto e documentos de aquisição como evidência auxiliar | Pendente |
| CSOSN | `103` é candidato sob a premissa do emitente; ainda precisa ser validado no cenário completo | MOC NF-e + Lei PR 15.562/2007 + fatos do período | Parcial |
| ICMS próprio e grupos CSOSN | Não calculados | Regra aplicável à combinação concreta e ao regime do emitente | Pendente |
| ICMS-ST / retido anteriormente | Não determinado | Legislação vigente por UF, classificação e histórico da unidade | Pendente |
| `ICMSUFDest` / DIFAL / FCP no XML do vendedor | Grupo `ICMSUFDest` não se aplica a destinatário contribuinte; outros campos dependem do caso | MOC NF-e + legislação do destino e perfil do destinatário | Parcial |
| Demais campos fiscais | Não determinados | Modelo/documento, operação e regra vigente | Pendente |

XML de entrada pode apoiar a identificação e o histórico do produto, mas não é autoridade para a tributação da saída.

## Aprovação da matriz

**Manter `DRAFT`.** A premissa de CSOSN `103` e os fundamentos gerais acima não fecham os vetores por produto, UF, propriedade/produção, ST, finalidade e demais campos. Não generalizar um caso futuro para todas as UFs ou mercadorias enquanto qualquer vetor relevante não tiver fundamento suficiente.

## Fontes oficiais

Consultadas em 07/10/2026; as regras estaduais devem ser revalidadas quando a nova fixture for definida.

- [Tabela CFOP do CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24)
- [MOC NF-e 7.0 — Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf)
- [Lei PR nº 15.562/2007, art. 2º, texto compilado](https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=553)
- [Convênio ICMS 142/2018 — CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18)
- [RICMS/SC — Regulamento, arts. 3º e 9º](https://legislacao.sef.sc.gov.br/legtrib_internet/html/regulamentos/icms/ricms_01_00.htm)

Esta auditoria não transmitiu documento fiscal, não aprovou a família e não alterou registros remotos.
