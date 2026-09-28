# Dry-Run: Saneamento de Códigos Duplicados (SKU)

Este relatório simula a execução do saneamento das duplicatas, preservando o código para o registro com mais vendas ou mais antigo, renumerando os demais a partir da sequence nova (004005) e marcando lixos conhecidos para exclusão. Os códigos TA/TB originais também são preservados exceto se caírem na regra de lixo de teste.

| UUID | Código Atual | Nome do Produto | Pedidos | Ação Simulada | Código Mantido | Novo Código | Justificativa |
|---|---|---|---|---|---|---|---|
| `dca6f9e0-...` | `000001` | [teste_aut]_draft_1789500557478 Poltrona Draft | 0 | **excluir_candidato** | `-` | `-` | Lixo de teste, pode ser limpo para não poluir. |
| `c824ef6d-...` | `000021` | Estante Multiuso Open | 1 | **manter** | `000021` | `-` | Preservado por ter mais vínculos ou ser o registro original. |
| `6d773652-...` | `000021` | Cristaleira 1 Porta de Vidro LED Mirage Artely | 0 | **renumerar** | `-` | `004018` | Receberá novo código limpo a partir de 004005 para sanar o conflito. |
| `75d0d942-...` | `000200` | Cômoda Ripada 6 Gavetas 1 Porta com Pés Vegas Faimec | 1 | **manter** | `000200` | `-` | Preservado por ter mais vínculos ou ser o registro original. |
| `ba14c95b-...` | `000200` | Colchão Dream D20 para Solteiro 88 Gazin | 0 | **renumerar** | `-` | `004005` | Receberá novo código limpo a partir de 004005 para sanar o conflito. |
| `bb3cc2fd-...` | `000200` | Mesa para Escritório NT 2060 2 Gavetas | 0 | **renumerar** | `-` | `004006` | Receberá novo código limpo a partir de 004005 para sanar o conflito. |
| `f56e238f-...` | `000217` | Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença | 1 | **manter** | `000217` | `-` | Preservado por ter mais vínculos ou ser o registro original. |
| `296e2933-...` | `000217` | Guarda Roupa 1,50 Ripado 4 Portas com Pés Flórida Faimec | 1 | **renumerar** | `-` | `004019` | Receberá novo código limpo a partir de 004005 para sanar o conflito. |
| `93c4890a-...` | `000217` | 34343 | 0 | **renumerar** | `-` | `004023` | Receberá novo código limpo a partir de 004005 para sanar o conflito. |
| `d301e582-...` | `ORIG` | Pai Origem Rollback | 0 | **excluir_candidato** | `-` | `-` | Lixo de teste, pode ser limpo para não poluir. |
| `bd0776cf-...` | `TB4425` | Pai B Teste Concorrencia | 0 | **excluir_candidato** | `-` | `-` | Lixo de teste, pode ser limpo para não poluir. |
| `0378c18a-...` | `TB4425` | Pai B Concorrencia Mesma Var | 0 | **manter** | `TB4425` | `-` | Preservado por ter mais vínculos ou ser o registro original. |

*(Nota: tabela resumida para demonstração da engine do dry-run, abrangendo as categorias principais: lixo de teste, renumerar ganhando do empate e legado alfanumérico).*
