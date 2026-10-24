# Fonte do guia prático do estoque

O PDF para o usuário está em `erp/public/guias/guia-pratico-estoque.pdf`. O submenu Estoque aponta para esse arquivo. A cópia de entrega em `output/pdf/guia-pratico-do-estoque.pdf` deve ser idêntica.

O nome exibido e o caminho público ficam em `shared-utils/stockGuide.json`. Essa configuração é compartilhada pelo menu Estoque do app, pelo submenu do ERP em computador e pelo menu responsivo do ERP. O gerador usa o mesmo nome na capa e nos metadados do PDF. O arquivo mantém o caminho estável, mesmo quando o título muda.

No app, o atalho abre o PDF pelo endereço do ERP (`WEB_URL`) no leitor/navegador do aparelho. A publicação do PDF no ERP e da versão atualizada do app é necessária para disponibilizar a alteração no ambiente instalado.

## Conteúdo e geração

- `gerar_guia.py`: texto do tutorial, paginação, tabelas, ilustrações e marcações vetoriais sobre os prints.
- `imagens/`: capturas dos controles reais do ERP. `capturas.json` registra dimensões e alvos numerados. Não inserir credenciais, chaves de NF-e, CNPJ, fornecedores ou documentos reais em novas imagens.
- `previews.tsx`: componentes reais com dados fictícios para fotografar escolhas que exigiriam salvar uma operação real. Não é rota do produto e não deve ser publicada. Seus callbacks não gravam operações.
- `manifesto.json`: páginas e imagens efetivamente usadas na última geração.

Na raiz do repositório, execute o gerador com um Python que tenha `reportlab` e `pypdf`:

```powershell
python docs/estoque/guia-pratico/gerar_guia.py
```

O script gera as duas cópias, confere a quantidade de páginas, a presença de texto e a igualdade dos arquivos. Esses controles não substituem a revisão visual: renderize com Poppler e confira as páginas alteradas em tamanho de leitura.

## Como atualizar

1. Leia `AGENTS.md`, a documentação fiscal vigente quando aplicável e a skill `morantehub-stock-guide`.
2. Confira os nomes e pré-requisitos no fluxo realmente conectado à interface. Não descreva componentes internos sem acionador como ações disponíveis.
3. Atualize o texto, a data da edição, os números de página do índice e as remissões. Atualize a verificação de paginação se acrescentar páginas.
4. Para fotografar a interface, use Playwright em navegador visível no desenvolvimento da porta 5173. Se precisar iniciar a pilha, use `npm run dev` na raiz. Não confirme recebimentos, inventários, etiquetas físicas ou eventos SEFAZ para obter um print.
5. Prefira recortes legíveis de campos e menus. O gerador desenha círculos, setas e contornos sem alterar o print. Confira se os alvos continuam dentro dos recortes e se os dados comerciais estão ocultados.
6. Se usar as prévias didáticas, monte uma página HTML temporária no Vite que carregue `previews.tsx` e as folhas de estilo do ERP. Os cenários `?screen=menus`, `?screen=labels` e `?screen=inventory` usam dados fictícios; o padrão mostra o cadastro rápido. Remova o ponto de entrada temporário ao terminar. Não inclua essas páginas na navegação do produto.
7. Gere, renderize e revise o PDF. Compare as cópias e verifique o acesso no submenu. Registre alterações fiscais no histórico e no índice de vigência.

## Conferência desta edição — 24/10/2026

O tutorial substitui a versão de oito páginas por uma edição ilustrada de 26 páginas, com 22 capturas utilizadas e desenhos vetoriais. Esta revisão inclui um fluxograma do recebimento com NF-e e sem NF-e, além de um fluxo de decisão para avarias e indisponibilidades temporárias ou definitivas. Avaria, por si só, não cria indisponibilidade: o registro só deve ser aberto quando a unidade for separada e retirada do saldo disponível. O material também atualiza a operação de cadastro rápido: escolha entre produto simples e variação de produto existente; confirme a categoria sugerida; revise duplicidades por código do fornecedor, GTIN e nome; resolva divergências de NCM; e acesse produto composto em Mais opções de cadastro, escolhendo manualmente pelo menos dois componentes distintos e suas quantidades. O cadastro mantém o item fiscal original, não movimenta estoque e não publica automaticamente em catálogo digital. O guia também cobre vínculos automáticos, XML incompleto, recebimentos, despesas, etiquetas, compras, inventário, histórico e indisponibilidades.

As fotos de cadastros rápidos, menus elegíveis, seleção de etiquetas e contagem manual usam os componentes reais com exemplos fictícios. A página 9 também orienta o cadastro pela NF-e no app: o custo de aquisição vem preenchido pela nota e pode ser revisado em Estoque e Precificação antes de salvar; o vínculo é confirmado após o cadastro, e o saldo só muda no recebimento. A página 10 explica que, ao adicionar uma variação a um pai, o custo calculado fica próprio da nova variação e não altera o custo do pai. A página 23 diferencia a consulta do histórico das operações de origem e informa que a lista de Produtos não disponibiliza lançamento avulso de estoque no momento; não apresenta a função como disponível e lembra que o saldo de composições depende dos componentes. As páginas 24 e 25 distinguem avaria de indisponibilidade, explicam quando a unidade sai do saldo e mostram como o produto retorna após conserto ou permanece fora do estoque depois de uma saída definitiva. As demais telas foram consultadas sem confirmar operações de estoque ou eventos fiscais. A emissão/transmissão fiscal e a gravação de negócio no Supabase não são cobertas por essa revisão do guia.

A página 22 orienta que, quando a confirmação do inventário ficar pendente, o operador deve retomar o mesmo inventário, aguardar o envio ser confirmado e não iniciar outra contagem para resolver a incerteza.

A página 22 também esclarece que “Finalizar inventários” é uma permissão separada de “Acessar”: administradores e perfis autorizados podem confirmar a revisão; o padrão concede essa ação a Gestores e Estoquistas. O ERP e o app deixam a confirmação indisponível para os demais perfis.

A página 19 também explica a duplicação de uma contagem no app: os itens e saldos são revistos pelo índice offline disponível, o responsável deve estar selecionado e contagens/etiquetas anteriores não são reaproveitadas. A cópia só inicia depois que o escopo é confirmado.
