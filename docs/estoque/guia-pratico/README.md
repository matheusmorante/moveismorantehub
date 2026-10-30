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
6. Se usar as prévias didáticas, copie temporariamente `previews.tsx` para `erp/src`, ajuste apenas o import da folha de estilo para `@/index.css` e crie um HTML temporário na raiz do Vite. Os cenários `?screen=mappings`, `?screen=menus`, `?screen=labels` e `?screen=inventory` usam dados fictícios; o padrão mostra o cadastro rápido. Remova os arquivos temporários ao terminar. Não inclua essas páginas na navegação do produto.
7. Gere, renderize e revise o PDF. Compare as cópias e verifique o acesso no submenu. Registre alterações fiscais no histórico e no índice de vigência.

## Conferência desta edição — 29/10/2026

A página 8 agora mostra um único menu com o modo ativo: Único, Composto ou Não se aplica. No fim da linha, o seletor de modo fica à esquerda e Cadastro rápido ao lado; o seletor usa apenas uma borda inferior e Cadastro rápido não tem fundo nem borda. A ação permanece visível e desativada quando indisponível. Mesmo em “Não se aplica”, o cabeçalho continua como “Vincular produto”. A linha permanece na nota fiscal e fica fora do estoque do recebimento; ela não conta como vínculo pendente no ERP ou no app. Fornecedores exclusivos de Salvados ficam permanentemente nesse modo: não exigem vínculo de produto, não geram recebimento e não movimentam o estoque. As páginas 3, 10, 13, 15 e 27 também explicam como essa escolha afeta a conclusão do recebimento e a impressão de etiquetas. A seleção de fornecedor também foi alinhada entre ERP e app: o campo continua visível e preenchido com a escolha atual, sem botão “Alterar”; para trocar, desvincule todos os produtos da nota, pois o campo fica bloqueado enquanto houver vínculos.

No app, o módulo agora se chama “Notas Fiscais de Entrada”; a importação fica no menu de três pontinhos do cabeçalho, na opção “Importar”. No ERP, a importação também fica na opção “Importar” do menu de três pontinhos do cabeçalho, sem subtítulo abaixo do título do módulo.

No app, o módulo Recebimentos informa quando a lista está vazia ou não foi possível carregá-la. Se aparecer erro de carregamento, toque em “Tentar novamente”.

O tutorial substitui a versão de oito páginas por uma edição ilustrada de 27 páginas, com 21 capturas utilizadas e desenhos vetoriais. Esta revisão inclui um fluxograma do recebimento com NF-e e sem NF-e, além de um fluxo de decisão para avarias e indisponibilidades temporárias ou definitivas. Avaria, por si só, não cria indisponibilidade: o registro só deve ser aberto quando a unidade for separada e retirada do saldo disponível. Também simplifica instruções e explica siglas ou palavras do sistema na primeira vez em que aparecem, como XML, variação, NCM, GTIN, rascunho e estorno. O material ainda atualiza a operação de cadastro rápido: escolha entre produto simples, variação de produto existente ou produto composto diretamente nas opções de cadastro; selecione manualmente a categoria; revise duplicidades por código do fornecedor, GTIN e nome; resolva divergências de NCM; e, para produtos compostos, escolha manualmente pelo menos dois componentes distintos e suas quantidades. No ERP, o NCM aparece no resumo da NF e não há campos editáveis de custo ou NCM neste cadastro. O custo médio é atualizado pelas entradas e a venda registra o CMV conforme o custo no momento da baixa. O cadastro mantém o item fiscal original, não movimenta estoque por si só e não publica automaticamente em catálogo digital. O guia também cobre recebimentos, despesas, etiquetas, compras, inventário, histórico e indisponibilidades.

A edição também deixa explícita a regra de que toda nota fiscal recebida em que a empresa aparece como destinatária deve constar em NF de entrada, mesmo se ainda aparecer como XML incompleto ou houver divergência na carga. O guia orienta a conferir a lista antes de importar para evitar duplicidade e separa o cadastro da nota da confirmação do recebimento, que é quando a mercadoria entra no estoque.

A página 13 agora explica que fornecedores sem origem Normal, como os exclusivos de Salvados, não aparecem no seletor “Usar Nota Fiscal de Entrada”. As NF-e desses fornecedores continuam na lista de notas, mas ficam fixas em “Não se aplica”, sem vínculo de produto, recebimento ou movimentação de estoque. Também orienta que notas resumo ou com XML incompleto não aparecem até serem completadas na lista de NF-e, e que cartões com “Vinculações Pendentes” têm fundo cinza e mostram “Finalizar Vinculação”; associe os produtos antes de usar as demais NF-e.

A página 8 explica que a busca de vínculos mostra somente variações disponíveis, inclusive quando a pesquisa é pelo nome do produto principal; o operador deve conferir a cor, medida ou modelo. Variações já vinculadas a outra linha da mesma NF-e deixam de aparecer na busca. A página 12 identifica Administrador e Estoquista como os perfis que podem gerar o recebimento.

A página 8 também orienta que uma tentativa sem confirmação deve ser conferida reabrindo “Gerenciar vínculos” antes de tentar novamente. Isso evita repetir às cegas uma gravação cujo resultado não apareceu na tela.

A página 14 explica que rascunhos não movimentam o estoque, recebem um código no primeiro salvamento automático, devolvem o código para reutilização quando excluídos e podem ser continuados pelo menu de ações usando “Retomar”.

A página 7 contém as instruções práticas para obter o XML completo no Portal ou com o fornecedor e importá-lo na nota existente. Inclui também a orientação de consultar o Histórico Fiscal antes de tentar registrar a Ciência novamente quando a comunicação não confirmar o resultado. As páginas 3 e 4 orientam a abrir XML incompleto e importar o arquivo sem descrever detalhes técnicos da consulta.

A página 5 informa que a lista de NF de entrada mostra até 15 notas por página no ERP e no app, orienta a usar a navegação abaixo da lista e identifica a opção Importar no menu de três pontinhos do ERP e do app. No ERP, o título não tem subtítulo, os horários da rotina da SEFAZ ficam ocultos no estado normal e, a partir de 768 px, período e busca ficam na mesma linha; em telas menores, continuam empilhados para preservar a leitura.

As fotos de cadastros rápidos, menus elegíveis, seleção de etiquetas e contagem manual usam componentes reais com exemplos fictícios. A página 9 orienta o cadastro ERP pela NF-e: selecione a categoria manualmente; o NCM fica visível no resumo “Produto da nota fiscal”, sem campo de edição; e o custo da nota é aproveitado sem campo de edição, enquanto as entradas atualizam o custo médio do estoque. A venda registra o CMV conforme o custo médio no momento da baixa. No app, o custo de aquisição continua preenchido pela nota e pode ser revisado em Estoque e Precificação antes de salvar; nos dois fluxos, o vínculo é confirmado após o cadastro e o saldo só muda no recebimento. A página 11 explica que as entradas atualizam o custo médio da própria variação sem alterar o produto pai. A página 24 diferencia a consulta do histórico das operações de origem e informa que a lista de Produtos não disponibiliza lançamento avulso de estoque no momento; não apresenta a função como disponível e lembra que o saldo de composições depende dos componentes. As páginas 25 e 26 distinguem avaria de indisponibilidade, explicam quando a unidade sai do saldo e mostram como o produto retorna após conserto ou permanece fora do estoque depois de uma saída definitiva. As demais telas foram consultadas sem confirmar operações de estoque ou eventos fiscais. A emissão/transmissão fiscal e a gravação de negócio no Supabase não são cobertas por essa revisão do guia.

A página 18 orienta a trocar um produto incorreto diretamente no card da etiqueta, buscar com pelo menos três caracteres e escolher entre até cinco produtos convencionais antes de conferir a quantidade e imprimir.

A página 23 orienta que, quando a confirmação do inventário ficar pendente, o operador deve retomar o mesmo inventário com a conta usada para iniciar a confirmação, aguardar a mensagem de sucesso e não começar outra contagem. A instrução diferencia essa conta da pessoa responsável pela contagem sem descrever mecanismos internos de envio.

A página 23 também esclarece que “Finalizar inventários” é uma permissão separada de “Acessar”: administradores e perfis autorizados podem confirmar a revisão; o padrão concede essa ação a Gestores e Estoquistas. O ERP e o app deixam a confirmação indisponível para os demais perfis.

A página 21 também explica a duplicação de uma contagem no app: os itens e saldos são revistos pelo índice offline disponível, o responsável deve estar selecionado e contagens/etiquetas anteriores não são reaproveitadas. A cópia só inicia depois que o escopo é confirmado.

A página 21 explica que o inventário conta somente produtos convencionais ativos. No seletor geral, só aparecem fornecedores marcados explicitamente com origem Convencional; sem origem cadastrada ou exclusivos de Salvados/Usados ficam fora, e fornecedores que também tenham origem Convencional continuam disponíveis. O app sincroniza essa origem no catálogo offline e aplica o mesmo filtro do ERP. Produtos classificados como Salvado ou Usado ficam fora das etapas e da seleção do inventário. Também orienta que Estoque Completo pode contar um, vários ou todos os fornecedores, abrindo apenas as etapas desejadas; fornecedor sem contagem e produto sem contagem ficam sem ajuste.

A página 22 explica que a contagem começa vazia, que zero é uma contagem explícita e que os botões +/-, a digitação e o QR Code correspondente permitem registrar a quantidade. No início, “Escanear inventário completo” aceita todos os itens, inclusive sem fornecedor. Dentro de uma etapa, “Escanear este fornecedor” aceita somente produtos daquele fornecedor; ao ler outro, o alerta vermelho informa que nada foi contado e orienta voltar à etapa correta ou usar o scanner geral. Produtos sem fornecedor ficam fora das etapas. Cada QR contabilizado recebe um bipe individual de cerca de 80 ms; quando as leituras chegam juntas, os beeps começam com pelo menos 20 ms entre si e podem se sobrepor. A leitura não espera pelo áudio nem pela gravação das outras leituras; duplicados e itens ignorados não tocam. O visor mantém até as duas últimas leituras.

A página 23 reforça que somente itens com contagem numérica entram nos ajustes; etapas não abertas e itens sem contagem permanecem sem alteração, inclusive quando outros itens do mesmo fornecedor foram contados.

A página 23 também orienta que uma contagem offline em andamento só pode ser retomada no aparelho em que foi iniciada e pela mesma conta conectada.

A página 16 esclarece que “Etiqueta de Preço” na lista Produtos exige permissão para editar Produtos; perfis somente consulta devem solicitar a impressão a alguém autorizado. A permissão separada para etiquetas de identificação continua distinta.

A página 9 identifica o atalho na linha do item da NF-e pelo nome atual do botão, “Cadastro rápido”.

A página 9 agora explica a diferença entre produto simples, produto pai, variação e produto composto com um esquema visual e exemplos. Também lista os campos necessários no cadastro rápido, os dados aproveitados da NF-e, os botões de salvar/cancelar/reutilizar e o efeito do cadastro sobre o saldo e os catálogos digitais. A página 11 mostra o passo a passo para incluir uma variação, conferir o fornecedor e preencher somente as características obrigatórias.


A página 10 agora explica o que são produto composto, composição e características, mostra como preencher esses dados e destaca a importância de valores consistentes para buscas no catálogo, relatórios e conteúdos com IA. Também deixa claro que filtros, análises financeiras e geração de conteúdo dependem dos recursos disponíveis. As seções seguintes foram renumeradas e o índice e as remissões acompanham a nova página.

A página 10 também esclarece que o pedido de venda inclui automaticamente as peças e quantidades do produto composto. Para conjuntos recebidos em uma única linha da NF-e, explica que a associação das peças é manual e que o ERP calcula o rateio do custo no recebimento. A orientação deixou de incluir a fórmula manual para reajustar preços unitários.

A página 21 esclarece que o campo “Responsável pelo Inventário” mostra colaboradores com perfil de acesso de Administrador, Gestor ou Estoquista. Quando há seleção, o campo mostra o nome e um check; sem responsável escolhido, mantém a busca. No app, o colaborador associado ao usuário logado fica pré-selecionado quando elegível; é possível trocar pelo nome de outro colaborador. Se a pessoa não aparecer, confira o perfil de acesso no cadastro de colaboradores.

A página 21 orienta a retomar pela lista uma contagem que já está em andamento, informa que cada contagem recebe um código próprio e aponta os botões de paginação abaixo da lista.

A página 24 explica como escolher a quantidade de registros e navegar pelas listas paginadas do ERP, além de indicar que a mudança de filtros retorna à primeira página e que o app usa os números da lista.

A página 18 diferencia uma nova linha de busca de uma etiqueta em branco: “Adicionar” abre espaço para buscar outro produto, a seleção fica marcada em verde com check e, sem produto selecionado, a etiqueta continua em branco. Também informa que a etiqueta de identificação mostra nome, SKU e QR, sem foto do produto.

A página 21 orienta que o cabeçalho mostra o progresso geral na lista de fornecedores e o progresso da etapa aberta. No app, ao abrir uma etapa, o título mostra somente o nome do fornecedor e a contagem e a barra de progresso consideram apenas os produtos dele. O cartão redundante de progresso geral foi removido; cada fornecedor continua mostrando seu próprio andamento. A página 22 explica que o contador do scanner usa as contagens salvas no inventário e permanece após finalizar a leitura. O scanner geral mostra o total; dentro da etapa, mostra apenas os produtos daquele fornecedor.

A página 22 também informa que o quadrado do scanner é apenas uma referência de posicionamento: a câmera do app aceita QRs em qualquer ponto da imagem. Repetir a mesma unidade física continua sem alterar a contagem; os 20 ms entre inícios de beeps regulam somente o áudio, sem esperar antes da contagem.
