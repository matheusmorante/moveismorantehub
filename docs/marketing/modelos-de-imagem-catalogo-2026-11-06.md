# Modelos de imagem para posts de produtos do ERP

Acesso em **Marketing → Modelos de imagem**, na rota `/marketing/image-templates` do ERP. A biblioteca é compartilhada com os operadores que têm a permissão **Gerenciar modelos** desse menu. Administradores e gestores têm acesso por padrão.

## Fluxo de referência

As capturas públicas do Gestor de Comércio mostram uma biblioteca, um seletor de modelos iniciais e um editor com lista de camadas à esquerda, propriedades da camada ao lado e prévia de produto no centro. Abaixo da prévia, o operador escolhe o conjunto e alterna os itens. As proporções verticais começam a partir de uma cópia do formato já editado. [Criação de modelo](https://cdn.confect.io/uploads/media/create-a-template-popup-with-starter-templates.png) · [Editor e controles da prévia](https://cdn.confect.io/uploads/media/the-template-editor-with-layers-panel-canvas-and-product-preview.png) · [Seleção de proporção](https://cdn.confect.io/uploads/media/aspect-ratio-selection-showing-4-5-template.png).

A sessão da conta foi consultada nesta conversa: a lista apresenta nome, descrição, publicação e data; o editor apresenta abas 1:1, 4:5 e 9:16, ações por camada, controles de posição e uma prévia de produto. Um modelo publicado aparece bloqueado para edição direta na Meta. Na retomada, a abertura da aba integrada devolveu `Local browser use is disabled in Work settings`; por isso a comparação visual final do ERP com a conta continua pendente.

## Pesquisa complementar

- A [ajuda oficial do Meta para modelos de imagem](https://www.facebook.com/business/help/947145298422088) foi localizada, mas a página redirecionou para login e não expôs o conteúdo ao leitor web.
- O [Meta Blueprint tem um replay sobre mídia de produto](https://www.facebookblueprint.com/student/activity/726303-increase-campaign-performance-with-partnership-ads). O treinamento cobre anúncios com produtos e catálogos, mas a página não apresenta uma demonstração pública do editor camada a camada.
- As buscas públicas por um vídeo do editor específico não retornaram uma demonstração verificável. As capturas enviadas pelo operador permanecem a referência direta para os controles e sua aparência.
- O editor local oferece sete famílias de fonte. Como a lista aberta de fontes do Meta não aparece nas capturas e a ajuda oficial está atrás de login, não foi possível confirmar os nomes adicionais sem inventar opções.
- A captura do editor confirma que a remoção do fundo aparece sob **Melhorar com IA**. No módulo local, a remoção atual recorta apenas fundos uniformes; não é segmentação por IA e preserva a imagem quando não detecta um fundo simples. Uma implementação de IA precisaria de um modelo local compatível ou de um serviço externo, inexistente na integração atual.

## Como usar

1. Escolha **Criar**, selecione a tela em branco ou um dos cinco modelos iniciais, informe o nome e avance.
2. Use **Adicionar camada** para incluir foto do produto, campo do produto, texto, imagem, adesivo ou fundo. Arraste as camadas para alterar a ordem. O menu de ações permite alterar o nome, excluir ou duplicar uma camada. A camada de fundo fica atrás das demais e cada formato mantém pelo menos uma camada de produto.
3. Arraste, redimensione e gire no quadro ou use os campos de tamanho, posição e ângulo. As camadas de texto têm fonte, tamanho, cor e opacidade do texto, estilos, alinhamentos horizontal e vertical e espaçamento entre linhas e letras. O botão **+** na mensagem insere campos do produto do ERP. A camada de imagem mostra miniatura e nome do arquivo, e permite substituir ou remover a imagem. A camada de produto permite escolher uma foto, configurar uma imagem de cópia de segurança, recortar e remover um fundo uniforme.
4. Use **Apresentação condicional** em camadas de produto, campos, imagens e textos. Por exemplo, uma camada de produto pode aparecer quando o preço promocional estiver preenchido. **Preço atual** usa o preço promocional cadastrado quando ele for menor que o preço normal.
5. Escolha um produto do ERP e, quando existir mais de uma, sua variação. Use as abas de proporção para adicionar **4:5** ou **9:16** a partir do formato em edição e ajuste cada versão separadamente.
6. Escolha **Salvar** para guardar o desenho. **Baixar PNG** relê o produto e a variação selecionados no ERP e gera a imagem no formato atual. Na biblioteca, o menu de três pontos oferece **Editar**, **Renomear**, **Fazer uma cópia** e **Excluir**.

Os modelos são guardados no ERP e a prévia usa os produtos, variações, preços e fotos do próprio ERP. O PNG exportado pode ser usado como post. A remoção de fundo funciona com fundos uniformes e preserva a foto quando essa condição não é detectada.

## Dados e consumo

- A lista lê cinco colunas e a contagem de até 15 linhas por página. O desenho é buscado pelo ID ao abrir ou copiar um modelo. Mudar camadas, formatos, posição ou escala redesenha no navegador.
- A prévia consulta até 15 nomes e códigos de produtos do ERP por página. A busca de três ou mais letras ou números também consulta nomes e SKUs de variações. O detalhe do produto selecionado traz preços, variações e fotos; a geração relê esse detalhe antes do download. Rascunhos, serviços e produtos excluídos ficam fora da seleção; produtos desativados são identificados.
- Logos e imagens enviados ao editor são convertidos em WebP de até 300 KiB e guardados em `catalog_image_template_assets`, com acesso restrito. A identidade do arquivo deriva de seu conteúdo. Modelos duplicados podem compartilhar as imagens. A consulta carrega os arquivos visíveis que faltam no editor em um lote. A exclusão remove o modelo e preserva os arquivos imutáveis para outras cópias. A biblioteca não faz limpeza automática de arquivos sem referência.
- Atualizações e exclusões conferem a versão exibida para detectar edição concorrente. O editor valida os valores com React Hook Form e Zod e só envia imagens novas que ainda fazem parte do desenho. O trigger recusa referências a imagens ausentes. A geração de PNG usa os dados do ERP no momento do download. O navegador precisa conseguir abrir as imagens com CORS para compor o arquivo.
- Projeto `hkoxhourxwlddgsfdgws`, schema `public`. A migration `20261106211851_create_catalog_image_templates.sql` criou duas tabelas e RLS. A migration `20261106224925_catalog_image_template_list.sql` criou a visão que faltava para a lista, com busca normalizada e datas de São Paulo; `security_invoker` preserva o RLS da tabela e apenas usuários autenticados podem consultar a visão. O rollback de interface pode retirar a rota e o menu preservando as tabelas e seus registros.
- A listagem não baixa imagens nem desenhos. Requisições, egress faturável e duração das consultas ainda não foram medidos em uso.

## Validação

| Verificação | Evidência | Limite |
| --- | --- | --- |
| Vitest e Testing Library | 28 testes passaram em 6 arquivos: formatos independentes, texto dinâmico, tipografia, duplicação, rotação, regras, produto/variação e exportação; 2 testes ao vivo foram ignorados | Os testes ao vivo dependem dos serviços externos |
| Produtos do ERP | Listagem, busca, detalhe de produto e variação consultados com a sessão do operador; uma foto retornou HTTP 200 com CORS permitido | Verificação somente de leitura; não cria posts ou altera produtos |
| Supabase operacional | Listagem com filtros consultada com a sessão do operador; leitura anônima recusada; visão, privilégios e `security_invoker` conferidos | Biblioteca vazia; sem escrita de modelo de teste ou teste com outras funções de acesso |
| Compilação Vite | Build do ERP aprovado | Não comprova o fluxo visual no navegador |
| TypeScript | Nenhum diagnóstico nos arquivos deste módulo na última checagem global | A checagem global encerrou com 867 diagnósticos em outros arquivos do projeto |
| Referência de interface | Lista e editor da conta conferidos na conversa | Comparação visual final no ERP indisponível pela configuração do navegador |

O módulo é próprio do ERP, com menu desktop e responsivo. O aplicativo nativo ainda não tem um editor equivalente. Dois imports impediam o build geral do ERP. Foram corrigidos o leitor de nomes de campanhas na sincronização pontual do Catálogo Meta e a origem do helper de categorias de conjuntos de mesa usado pelo código compartilhado com o app.
