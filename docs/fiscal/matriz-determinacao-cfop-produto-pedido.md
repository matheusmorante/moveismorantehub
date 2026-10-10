# Determinação de CFOP em vendas e devoluções

**Revisado em:** 09/10/2026. **Estado atual:** catálogo e regras de venda normal estão separados; a matriz interestadual não tem nenhuma regra `APPROVED`. Este documento descreve o comportamento atual do código e não aprova operações fora do escopo registrado em [auditoria-cfop-nfe-nfce.md](auditoria-cfop-nfe-nfce.md), [matriz-saida-interestadual.md](matriz-saida-interestadual.md) e no [status fiscal atual](status-testes-homologacao.md).

## Princípio

O CFOP classifica a natureza da operação. Por si só, ele não determina CSOSN/CST, ICMS, substituição tributária, DIFAL, FCP, PIS/COFINS ou IBS/CBS. A seleção de um CFOP candidato não equivale à aprovação do tratamento tributário completo.

O cadastro fornece fatos do produto, como NCM, origem da mercadoria, condição de produção própria/terceiros e atributos informados de ST. O pedido e a emissão fornecem os fatos da operação concreta, como finalidade, destinatário, UF fiscal de destino e modalidade. A devolução deve usar a venda e a NF-e original vinculadas; o cadastro atual do produto não reescreve os fatos fiscais históricos.

## Venda normal: capacidade atual

O modal pode apresentar CFOPs candidatos compatíveis e permite selecionar entre as opções habilitadas. O backend recompõe o contexto, valida o CFOP e determina o tratamento fiscal antes de reservar numeração. Escolher um candidato no navegador não aprova tributos nem libera uma regra `DRAFT`.

| Cenário | Situação no código em 09/10/2026 |
|---|---|
| PR → PR, mercadoria adquirida de terceiros, sem ST, no cenário interno coberto | `5102` é a única regra habilitada descrita pela auditoria atual. A regra continua limitada ao escopo e ambiente efetivamente aprovados no código. |
| PR → outra UF brasileira | Sem rota liberada. `6102` e `6108` são candidatos sem regra tributária `APPROVED`; o preflight bloqueia antes da reserva/transmissão. |
| Produção própria, venda com ST e demais operações | Sem regra geral aprovada neste fluxo; exigir matriz específica e evidência fiscal antes de habilitar. |

Não trate uma lista de CFOPs no catálogo como matriz tributária. `active` indica que o item está classificado para consulta; não confirma a atualidade da tabela oficial nem habilita uma emissão.

## Devolução: vínculo histórico e limites atuais

A devolução é preparada a partir da NF-e de saída original autorizada, do pedido e da alocação dos itens devolvidos. O backend confere documento, ambiente, itens, quantidades, saldo já devolvido e CFOP candidato. O fluxo atual está limitado às condições descritas em [NF-e de devolução](nfe-devolucao.md); não há suporte comprovado a uma devolução com origem em NFC-e 65 nem a cenários fora da matriz aprovada.

Os códigos de devolução existentes no catálogo são classificações semânticas para filtrar candidatos, não uma autorização genérica. Os códigos `1949` e `2949` permanecem classificados como `other` no catálogo local; não os recategorize como devolução sem revisão jurídica e atualização do mapeamento.

## Atualidade das fontes e do catálogo

O catálogo em `shared-utils/fiscal-cfop-model/catalog.ts` é estático e contém um subconjunto semântico usado pelo ERP. Em 04/09/2026 o Portal Nacional publicou o Informe Técnico 2023.002 v2.10, com atualização da tabela CFOP. A comparação integral do catálogo local com essa edição ainda está pendente; a classificação local de um código não prova que representa a tabela vigente.

A NT 2026.009 v1.00, publicada em 09/09/2026, anuncia correção em regra de validação. O escopo exato da correção ainda precisa ser confrontado com o texto da NT antes de decidir se algum CFOP do fluxo de devolução deve mudar. Até essa revisão, mantenha os códigos semânticos não aprovados bloqueados; não infira a alteração somente pelo número da NT.

Também foram publicadas novas tabelas da Reforma Tributária no Informe Técnico 2025.002 v1.70, em 01/10/2026. O pacote XSD local conter elementos IBS/CBS não significa que o emissor calcula ou serializa esses grupos. A aplicabilidade ao regime, produto e data precisa ser revisada separadamente, conforme o [status fiscal atual](status-testes-homologacao.md).

## Referências

- [Portal Nacional — Informe Técnico 2023.002 v2.10 e demais Informes Técnicos](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=B%2F6oigHgyAw%3D)
- [SVRS — documentos NF-e e NT 2026.009 v1.00](https://dfe-portal.svrs.rs.gov.br/NFe/Documentos)
- [Portal Nacional — tabela CFOP vigente e tabelas de domínio](https://www.nfe.fazenda.gov.br/portal/consulta.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=%2FNJarYc9nus%3D)
- [Índice de manuais, esquemas e Notas Técnicas](manuais/README.md)

Esta matriz deve ser atualizada quando houver mudança de código, de regra aprovada, de catálogo ou de publicação oficial aplicável. Evidências de testes, HML e pendências ficam no [status central](status-testes-homologacao.md).
