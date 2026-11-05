"""Roteiros curtos e clicáveis para consulta durante a operação do estoque."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

W, H = A4
M, TW = 40, W - 80
NAVY = colors.HexColor('#152940')
INK = colors.HexColor('#24364B')
MUTED = colors.HexColor('#607187')
BLUE = colors.HexColor('#285EFF')
TEAL = colors.HexColor('#087F73')
PALE = colors.HexColor('#EFF5FF')
MINT = colors.HexColor('#EAF7F1')
AMBER = colors.HexColor('#FFF4D8')
LINE = colors.HexColor('#C7D5E5')


def _paragraph(text, width, size, bold=False):
    style = ParagraphStyle(
        'roteiro', fontName='SegoeBold' if bold else 'Segoe', fontSize=size,
        leading=size * 1.35, textColor=NAVY if bold else INK,
    )
    item = Paragraph(text, style)
    return item, item.wrap(width, H)[1]


def _card(c, top, title, body, number=None, fill=PALE):
    inset = 52 if number is not None else 16
    title_p, title_h = _paragraph(title, TW - inset - 16, 14, bold=True)
    body_p, body_h = _paragraph(body, TW - inset - 16, 12.2)
    height = max(64, title_h + body_h + 29)
    if top - height < 75:
        raise ValueError(f'Roteiro ultrapassa a área útil: {title}')
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.roundRect(M, top - height, TW, height, 10, fill=1, stroke=1)
    if number is not None:
        c.setFillColor(BLUE)
        c.circle(M + 25, top - 24, 14, fill=1, stroke=0)
        c.setFont('SegoeBold', 13)
        c.setFillColor(colors.white)
        c.drawCentredString(M + 25, top - 28.5, str(number))
    title_p.drawOn(c, M + inset, top - 12 - title_h)
    body_p.drawOn(c, M + inset, top - 17 - title_h - body_h)
    return top - height - 10


def _icon(c, kind, x, y):
    c.saveState()
    c.setStrokeColor(BLUE)
    c.setLineWidth(2)
    if kind == 'box':
        c.rect(x - 13, y - 11, 26, 22, fill=0, stroke=1)
        c.line(x - 13, y + 4, x + 13, y + 4)
        c.line(x, y + 4, x, y - 11)
    elif kind == 'tag':
        path = c.beginPath()
        path.moveTo(x - 13, y - 10)
        path.lineTo(x + 5, y - 10)
        path.lineTo(x + 14, y)
        path.lineTo(x + 5, y + 10)
        path.lineTo(x - 13, y + 10)
        path.close()
        c.drawPath(path, stroke=1, fill=0)
        c.circle(x + 4, y, 2, stroke=1, fill=0)
    elif kind == 'list':
        c.roundRect(x - 12, y - 14, 24, 28, 3, stroke=1, fill=0)
        for offset in (7, 0, -7):
            c.line(x - 5, y + offset, x + 8, y + offset)
            c.circle(x - 8, y + offset, 1, stroke=1, fill=0)
    elif kind == 'purchase':
        c.line(x - 15, y + 11, x - 10, y + 11)
        c.line(x - 10, y + 11, x - 6, y - 6)
        c.line(x - 6, y - 6, x + 11, y - 6)
        c.line(x + 11, y - 6, x + 15, y + 5)
        c.line(x + 15, y + 5, x - 8, y + 5)
        c.circle(x - 4, y - 12, 2, stroke=1, fill=0)
        c.circle(x + 9, y - 12, 2, stroke=1, fill=0)
    elif kind == 'warning':
        path = c.beginPath()
        path.moveTo(x, y + 14)
        path.lineTo(x - 15, y - 12)
        path.lineTo(x + 15, y - 12)
        path.close()
        c.drawPath(path, stroke=1, fill=0)
        c.line(x, y + 5, x, y - 4)
        c.circle(x, y - 8, 1, stroke=1, fill=0)
    else:
        c.circle(x, y, 14, stroke=1, fill=0)
        c.setFillColor(BLUE)
        c.setFont('SegoeBold', 18)
        c.drawCentredString(x, y - 6, '?')
    c.restoreState()


def _map_card(c, x, top, width, title, body, page, icon):
    height = 148
    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.roundRect(x, top - height, width, height, 10, fill=1, stroke=1)
    _icon(c, icon, x + 28, top - 30)
    title_p, title_h = _paragraph(title, width - 65, 14, bold=True)
    body_p, body_h = _paragraph(body, width - 26, 12)
    title_p.drawOn(c, x + 55, top - 17 - title_h)
    body_p.drawOn(c, x + 13, top - 60 - body_h)
    c.setFillColor(BLUE)
    c.setFont('SegoeBold', 11)
    c.drawString(x + 13, top - height + 13, f'ABRIR PÁGINA {page}  >')
    c.linkRect('', f'p{page}', Rect=(x, top - height, x + width, top), relative=0, thickness=0)


def _back_to_map(c):
    c.setFont('SegoeBold', 10.5)
    c.setFillColor(BLUE)
    c.drawString(M, 54, 'VOLTAR AOS ROTEIROS  |  PÁGINA 28')
    c.linkRect('', 'p28', Rect=(M, 49, M + 230, 69), relative=0, thickness=0)


def desenhar_opcoes_recebimento(c, top):
    """Mostra as duas opções disponíveis como ilustração, em texto legível."""
    c.setFillColor(NAVY)
    c.setFont('SegoeBold', 11)
    c.drawString(M, top - 12, 'EXEMPLO: ESCOLHA UMA OPÇÃO')
    top -= 22
    for letter, title in [('A', 'Sem nota fiscal'), ('B', 'Com nota fiscal de entrada')]:
        c.setFillColor(colors.white)
        c.setStrokeColor(LINE)
        c.roundRect(M, top - 43, TW, 43, 8, fill=1, stroke=1)
        c.setFillColor(TEAL if letter == 'A' else BLUE)
        c.circle(M + 23, top - 21.5, 13, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont('SegoeBold', 12)
        c.drawCentredString(M + 23, top - 26, letter)
        c.setFillColor(NAVY)
        c.setFont('SegoeBold', 14)
        c.drawString(M + 48, top - 27, title)
        top -= 50
    return top - 3


def _boxes_example(c, top):
    c.setFillColor(MINT)
    c.roundRect(M, top - 112, TW, 112, 10, fill=1, stroke=0)
    c.setFont('SegoeBold', 12)
    c.setFillColor(NAVY)
    c.drawString(M + 15, top - 20, 'EXEMPLO: 1 MÓVEL EM 3 CAIXAS')
    for index in range(3):
        x = M + 35 + index * 142
        c.setStrokeColor(INK)
        c.setLineWidth(1.5)
        c.rect(x, top - 82, 78, 43, stroke=1, fill=0)
        c.line(x, top - 52, x + 78, top - 52)
        c.setFont('SegoeBold', 10)
        c.setFillColor(INK)
        c.drawCentredString(x + 39, top - 72, f'CAIXA {index + 1}')
        if index == 0:
            c.setFillColor(BLUE)
            c.roundRect(x + 11, top - 98, 100, 14, 3, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont('SegoeBold', 8.5)
            c.drawCentredString(x + 61, top - 95, '1 ETIQUETA')
    return top - 122


def _count_example(c, top):
    c.setFillColor(MINT)
    c.roundRect(M, top - 102, TW, 102, 10, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont('SegoeBold', 12)
    c.drawString(M + 15, top - 20, 'EXEMPLO DE CONTAGEM')
    for index, (label, value) in enumerate([('SISTEMA', '5'), ('CONTADO', '4'), ('AJUSTE', '-1')]):
        center = M + 90 + index * 165
        c.setFont('SegoeBold', 11)
        c.drawCentredString(center, top - 43, label)
        c.setFont('SegoeBold', 25)
        c.drawCentredString(center, top - 73, value)
    c.setFont('Segoe', 10.5)
    c.drawString(M + 15, top - 92, 'Confira o ajuste mostrado na revisão do seu inventário.')
    return top - 112


def _detail_step(c, top, number, title, body, fill=PALE, x=M, width=TW):
    inset = 43
    title_p, title_h = _paragraph(title, width - inset - 18, 11.2, bold=True)
    body_p, body_h = _paragraph(body, width - inset - 18, 10.1)
    height = max(55, title_h + body_h + 23)
    if top - height < 75:
        raise ValueError(f'Etapa detalhada ultrapassa a área útil: {title}')
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.roundRect(x, top - height, width, height, 9, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.circle(x + 23, top - 22, 12, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('SegoeBold', 10)
    c.drawCentredString(x + 23, top - 25.5, str(number))
    title_p.drawOn(c, x + inset, top - 10 - title_h)
    body_p.drawOn(c, x + inset, top - 14 - title_h - body_h)
    return top - height - 8


def _detail_note(c, top, title, body, fill=AMBER):
    title_p, title_h = _paragraph(title, TW - 28, 10.6, bold=True)
    body_p, body_h = _paragraph(body, TW - 28, 9.8)
    height = title_h + body_h + 24
    if top - height < 75:
        raise ValueError(f'Observação detalhada ultrapassa a área útil: {title}')
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.roundRect(M, top - height, TW, height, 9, fill=1, stroke=1)
    title_p.drawOn(c, M + 14, top - 9 - title_h)
    body_p.drawOn(c, M + 14, top - 13 - title_h - body_h)
    return top - height - 8


def _next_page(c, top, page, label):
    c.setFillColor(BLUE)
    c.setFont('SegoeBold', 9.5)
    c.drawString(M, top - 12, f'{label}  →  PÁGINA {page}')
    c.linkRect('', f'p{page}', Rect=(M, top - 18, M + TW, top + 1), relative=0, thickness=0)


def _scan_demo(c, top, image_path):
    """Insere a ilustração gerada do enquadramento; a etiqueta não é escaneável."""
    height = 254
    bottom = top - height
    c.setFillColor(MINT)
    c.setStrokeColor(LINE)
    c.roundRect(M, bottom, TW, height, 11, fill=1, stroke=1)
    c.setFillColor(TEAL)
    c.setFont('SegoeBold', 9)
    c.drawString(M + 15, top - 18, 'COMO ENQUADRAR A ETIQUETA')
    image_width, image_height = 365, 223
    image_x = M + (TW - image_width) / 2
    c.drawImage(str(Path(image_path)), image_x, bottom + 20,
                width=image_width, height=image_height, preserveAspectRatio=True, mask='auto')
    c.setFillColor(MUTED)
    c.setFont('Segoe', 7.8)
    c.drawCentredString(W / 2, bottom + 7, 'Ilustração: etiqueta fictícia, sem código escaneável.')
    return bottom - 10


def render_roteiros_visuais(c, base, shot, scan_image):
    """Acrescenta roteiros resumidos e exemplos práticos ilustrados."""
    y = base('Roteiros com figuras', 'O que você quer fazer?',
             'Toque ou clique no quadro. Se estiver impresso, abra a página indicada.')
    gap = 14
    width = (TW - gap) / 2
    cards = [
        ('Receber sem NF', 'Conferir pelo pedido, etiqueta ou catálogo.', 36, 'box'),
        ('Receber com NF', 'Chave de acesso, XML e entrada.', 38, 'list'),
        ('Contar o estoque', 'Escolher escopo, contar e revisar.', 40, 'list'),
        ('Imprimir etiquetas', 'Uma identificação por móvel completo.', 42, 'tag'),
        ('Fazer um pedido', 'Registrar o combinado com o fornecedor.', 43, 'purchase'),
        ('Produto com problema', 'Decidir se deve sair do estoque disponível.', 44, 'warning'),
    ]
    for index, (title, body, page, icon) in enumerate(cards):
        _map_card(c, M + (index % 2) * (width + gap), y - (index // 2) * 160,
                  width, title, body, page, icon)
    c.setFillColor(BLUE)
    c.setFont('SegoeBold', 9)
    c.drawString(M, 74, 'DÚVIDAS? Ajuda rápida: páginas 34 e 35.')
    c.linkRect('', 'p34', Rect=(M + 64, 68, M + 150, 82), relative=0, thickness=0)
    c.linkRect('', 'p35', Rect=(M + 150, 68, M + 280, 82), relative=0, thickness=0)

    y = base('Roteiro 1 / Recebimento', 'Chegaram produtos?',
             'Confira a carga, escolha o caminho e confirme uma vez.')
    y = _card(c, y, 'Confira a carga',
              'Compare produto, versão, quantidade e caixas. Sem NF, use o pedido, a etiqueta ou o catálogo do fornecedor.', 1)
    y = _card(c, y, 'Abra Recebimentos',
              'App: Estoque > Recebimentos > três pontinhos > Novo. ERP: Estoque > Recebimentos > Receber Mercadoria.', 2)
    y = desenhar_opcoes_recebimento(c, y)
    y = _card(c, y, 'Confira e confirme',
              'Com NF, complete XML e vínculos. Revise a carga e confirme uma vez. Passos: páginas 36 a 39.', 3)
    _card(c, y, 'PARE: pedido não é entrada',
          'Com pedido de compra está indisponível (Beta). Use-o só para conferir a carga.', fill=AMBER)
    _back_to_map(c)

    y = base('Roteiro 2 / Etiquetas', 'Uma etiqueta por móvel',
             'Identifique cada unidade completa, não cada caixa.')
    y = _card(c, y, 'Escolha os produtos',
              'App: Estoque > Etiquetas de identificação. ERP: consulte as páginas 17 e 18.', 1)
    y = _card(c, y, 'Confira e imprima',
              'Veja o modelo e a prévia. Escolha <b>Imprimir</b> ou a impressão avançada disponível.', 2)
    y = _boxes_example(c, y)
    y = _card(c, y, 'Cole na caixa principal',
              'Confira todos os volumes; cole uma etiqueta no volume principal.', 3)
    _card(c, y, 'PARE antes de repetir',
          'Cada impressão cria outra identificação. Confira antes de repetir.', fill=AMBER)
    _back_to_map(c)

    y = base('Roteiro 3 / Inventário', 'Conte antes de concluir',
             'Registre apenas unidades conferidas fisicamente.')
    y = _card(c, y, 'Escolha o que vai contar',
              'Abra Estoque > Inventário > três pontinhos > Novo inventário. Escolha o modo e o responsável.', 1)
    y = _card(c, y, 'Conte móveis completos',
              'Confira a variação e registre o campo <b>Contado</b> ou use o leitor.', 2)
    y = _count_example(c, y)
    y = _card(c, y, 'Revise e conclua',
              'Compare Sistema, Contado e Ajuste. Reconte as diferenças; pessoa autorizada conclui.', 3)
    _card(c, y, 'PARE se ainda não contou',
          'Contado 0 pode zerar o saldo. Confira todos os itens. Exemplo: páginas 40 e 41.', fill=AMBER)
    _back_to_map(c)

    y = base('Roteiro 4 / Compra', 'Registre o pedido de compra',
             'O pedido registra o combinado, não a entrada no estoque.')
    y = _card(c, y, 'Abra um novo pedido',
              'Vá a Estoque > Pedidos de compra. Nos três pontinhos, escolha <b>Novo pedido</b>.', 1)
    y = _card(c, y, 'Escolha fornecedor e produto',
              'Selecione fornecedor, produto/variação e quantidade.', 2)
    y = _card(c, y, 'Confira e confirme',
              'Revise quantidade e custo. Toque em <b>Confirmar Pedido</b> e aguarde a resposta.', 3)
    y = _card(c, y, 'Quando a carga chegar',
              'Registre a entrada em Recebimentos. Com pedido de compra está indisponível (Beta).', fill=AMBER)
    _card(c, y, 'Passos e status', 'Veja a página 43.', fill=MINT)
    _back_to_map(c)

    y = base('Roteiro 5 / Produto com problema', 'O produto pode continuar disponível?',
             'Só registre indisponibilidade quando separar a unidade.')
    y = _card(c, y, 'SIM. Pode vender ou usar',
              'Avise o responsável. Não registre indisponibilidade.', fill=MINT)
    y = _card(c, y, 'NÃO. Sai do estoque disponível',
              'Separe a unidade e registre produto, quantidade, motivo e destino.', fill=AMBER)
    y = _card(c, y, 'SE O MÓVEL VOLTAR após o conserto',
              'Uma pessoa autorizada pode usar <b>Desfazer</b> depois de conferir o móvel inteiro.')
    _card(c, y, 'Devolvido ou descartado',
          'Mantenha a indisponibilidade. Detalhes e peças reaproveitadas: páginas 25, 26 e 44.')
    _back_to_map(c)

    y = base('Ajuda rápida', 'Algo não saiu como esperado?',
             'Confira a lista antes de repetir uma ação.')
    y = _card(c, y, 'Não sei se confirmou',
              'Procure o registro antes de tentar de novo; evita duplicidade.')
    y = _card(c, y, 'O botão está indisponível',
              'Leia o motivo na tela ou peça ajuda a uma pessoa autorizada.')
    invoice_help_top = y
    y = _card(c, y, 'A nota aparece “Em uso”',
              'Abra <b>Gerenciar</b> e procure o mesmo recebimento. Toque neste quadro ou veja a página 35.')
    c.linkRect('', 'p35', Rect=(M, y + 10, M + TW, invoice_help_top), relative=0, thickness=0)
    y = _card(c, y, 'A contagem não bate',
              'Volte à contagem e reconte. Não conclua com dúvida.')
    _card(c, y, 'Ajuda por assunto',
          'NF: página 35. Recebimento: 36 a 39. Inventário: 40 e 41.', fill=MINT)
    _back_to_map(c)

    y = base('Ajuda / Nota fiscal', 'A nota não pode ser escolhida?',
             'Confira o aviso e siga a ação correspondente.')
    y = _card(c, y, 'Não encontro a nota',
              'Confira o período. Digite 3 caracteres para pesquisar; em Outro Mês, escolha mês e ano.')
    y = _card(c, y, 'NF incompleta',
              'Use <b>Obtenha o XML</b> e importe o arquivo da mesma nota. Veja a página 7.')
    y = _card(c, y, 'Vínculos pendentes',
              'Abra <b>Gerenciar vínculos</b> e conclua os itens. Se a gravação ficar incerta, consulte novamente antes de repetir.')
    y = _card(c, y, 'Em uso',
              'Use <b>Gerenciar</b> para abrir o recebimento existente. Rascunho: Retomar. Recebido: Alterar. Estornado: Desfazer estorno reativa a entrada.')
    _card(c, y, 'Notas de Salvados',
          'A seleção de novo recebimento aceita fornecedores de origem Normal. Linhas “Não se aplica” ficam fora do estoque.', fill=AMBER)
    _back_to_map(c)

    y = base('Exemplo prático 1 / Sem nota', 'Sem NF: confira antes de lançar',
             'Para entregas sem NF, como Bovelip ou Ademir. Os dados são fictícios.')
    y = shot('06-opcoes-recebimento', y, max_height=82, crop=(0, 0, 304, 126), annotate=False,
             caption='Escolha Sem nota fiscal. “Com pedido de compra” está indisponível (Beta).')
    y = _detail_step(c, y, 1, 'Identifique o produto e a versão',
                     'Use o nome da etiqueta. Se faltar informação, confira o pedido ou a tabela/portfólio. Selecione a mesma versão, cor e medida.')
    y = _detail_step(c, y, 2, 'Confira com o pedido impresso',
                     'Compare produto e quantidade com as caixas recebidas. Anote faltas, sobras, trocas ou avarias e avise o responsável.')
    y = _detail_step(c, y, 3, 'Abra o recebimento sem NF',
                     'ERP: Estoque > Recebimentos > Receber Mercadoria. App: Estoque > Recebimentos > Novo. Escolha Sem nota fiscal e o fornecedor.', fill=MINT)
    y = _detail_note(c, y, 'O pedido ajuda na conferência',
                     'O papel não cria entrada nem se vincula ao recebimento. Para anexar uma foto, veja a página 37.')
    _next_page(c, y, 37, 'PRÓXIMO PASSO: preencher itens e anexar foto do pedido')
    _back_to_map(c)

    y = base('Exemplo prático 1 / Sem nota', 'Sem NF: preencha, anexe e confirme',
             'Exemplo fictício: Bovelip · Cômoda Aurora, amêndoa · 2 unidades.')
    y = shot('07-formulario-recebimento', y, max_height=205, crop=(0, 0, 1280, 620), annotate=False,
             caption='Formulário do ERP: fornecedor, data, anexos e observações.')
    y = _detail_step(c, y, 1, 'Selecione fornecedor e data de chegada',
                     'Use o fornecedor da entrega e a data em que ela chegou.')
    y = _detail_step(c, y, 2, 'Adicione a variação e a quantidade',
                     'Em Adicionar item, pesquise o nome, confira a versão e informe as unidades recebidas. Use o custo combinado ou confirmado pelo responsável.')
    y = _detail_step(c, y, 3, 'Anexe a foto do pedido',
                     'Antes dos itens, abra Anexos e selecione a foto legível (até 5 PDFs ou imagens). Use Observações para registrar diferenças.', fill=MINT)
    y = _detail_step(c, y, 4, 'Revise e confirme uma vez',
                     'Confira fornecedor, produto, quantidade, custo e anexo. Confirme uma vez e aguarde Recebido. Rascunho não movimenta estoque.')
    _next_page(c, y, 38, 'SE A CARGA VEIO COM NOTA FISCAL, SIGA ESTE CAMINHO')
    _back_to_map(c)

    y = base('Exemplo prático 2 / Com nota', 'Com NF: da chave ao XML completo',
             'A chave identifica a nota. O XML completo é o arquivo que traz os itens para o ERP.')
    y = shot('02-importar-xml', y, max_height=145, crop=(0, 0, 576, 250), annotate=False,
             caption='Digite a chave de 44 números ou leia o código de barras; depois, use Consultar no Portal.')
    y = _detail_step(c, y, 1, 'Confira se a nota já aparece',
                     'ERP: Estoque > NF de entrada. App: Estoque > Nota Fiscal de Entrada. Procure a nota para evitar duplicidade.')
    y = _detail_step(c, y, 2, 'Leia a chave no DANFE',
                     'Em Importar XML, leia o código de barras ou digite a chave. Consultar no Portal localiza a NF; não importa os itens.')
    y = _detail_step(c, y, 3, 'Baixe o XML no Portal da NF-e',
                     'No Portal Nacional da NF-e, use o certificado autorizado da empresa e baixe o XML completo da mesma chave. Se pedir Ciência, siga a orientação fiscal.', fill=MINT)
    y = _detail_note(c, y, 'Use o arquivo certo',
                     'Foto, PDF ou DANFE não substitui o XML. Se não conseguir baixá-lo, peça o arquivo ao fornecedor ou ajuda ao responsável. Não envie certificado ou senha pelo ERP.')
    _next_page(c, y, 39, 'PRÓXIMO: importar o XML, vincular e gerar o recebimento')
    _back_to_map(c)

    y = base('Exemplo prático 2 / Com nota', 'Com NF: importe, vincule e receba',
             'A NF precisa estar completa e com os itens associados antes de iniciar a entrada no estoque.')
    y = shot('04c-gerar-recebimento', y, max_height=120, annotate=False,
             caption='Resolva o vínculo do fornecedor antes de gerar o recebimento.')
    y = _detail_step(c, y, 1, 'Importe o XML completo',
                     'Na lista de NF, use Importar; se estiver incompleta, abra Obtenha o XML. Envie o arquivo da mesma chave e aguarde a confirmação.')
    y = _detail_step(c, y, 2, 'Associe fornecedor e produtos',
                     'Em Gerenciar vínculos, confira o emitente, selecione o fornecedor e associe cada item à variação certa. Marque Não se aplica nas demais linhas e aguarde salvar.')
    y = _detail_step(c, y, 3, 'Gere o recebimento da mesma NF',
                     'Com vínculos resolvidos, use Gerar recebimento ou Use NF. Confira número, fornecedor e valor. Se estiver Em uso, abra Gerenciar; não inicie outro.', fill=MINT)
    y = _detail_step(c, y, 4, 'Confira a entrega e confirme',
                     'Ajuste a data de chegada e confira as quantidades físicas. Informe despesas cobradas fora da NF. Confirme uma vez e aguarde Recebido; abrir o formulário não movimenta estoque.')
    _back_to_map(c)

    y = base('Exemplo prático 3 / Inventário', 'Inventário: escolha o escopo e conte',
             'Conte somente o que você conferiu fisicamente. Um móvel em várias caixas continua sendo uma unidade.')
    y = shot('19-app-inventory-list', y, max_height=92, crop=(0, 0, 412, 165), annotate=True,
             caption='App: Novo inventário. ERP: menu de três pontinhos > Novo inventário.')
    y = _detail_step(c, y, 1, 'Defina quem e o que será contado',
                     'Escolha responsável e escopo. Geral inicia em Contado 0; Livre inicia só os fornecedores escolhidos; Produto inclui as variações ativas do pai selecionado.')
    y = _detail_step(c, y, 2, 'Conte unidades completas',
                     'Confira a variação e conte o móvel completo, não cada caixa.')
    y = _scan_demo(c, y, scan_image)
    y = _detail_step(c, y, 3, 'Use o leitor ou informe a contagem',
                     'Abra Scanner Geral ou Escanear este fornecedor. Leia cada etiqueta uma vez; se repetir, o app avisa Unidade física já contabilizada. Sem etiqueta legível, feche o leitor e informe Contado.')
    _next_page(c, y, 41, 'PRÓXIMO: comparar Sistema, Contado e Ajuste antes de concluir')
    _back_to_map(c)

    y = base('Exemplo prático 3 / Inventário', 'Inventário: revise cada diferença',
             'A revisão compara o saldo registrado com a quantidade que você contou de verdade.')
    y = shot('14-contagem-manual', y, max_height=190, annotate=False,
             caption='Confira o nome e a variação, o saldo do Sistema, o Ajuste e a quantidade Contado.')
    y = _count_example(c, y)
    y = _detail_step(c, y, 1, 'Reconte antes de finalizar',
                     'Se o ajuste parecer estranho, use Voltar para contagem. Confira a variação, as caixas e os movimentos durante o inventário.')
    y = _detail_note(c, y, 'Cuidado com o zero',
                     'No Geral, item não contado pode zerar o saldo. Confira todo o escopo antes de concluir.')
    y = _detail_step(c, y, 2, 'Conclua e confira o status',
                     'Uma pessoa autorizada confirma com a conta que iniciou a confirmação. Aguarde Concluído; se houver dúvida, peça ajuda.', fill=MINT)
    _back_to_map(c)

    y = base('Exemplo prático 4 / Etiquetas', 'Imprima uma etiqueta por móvel',
             'A etiqueta de identificação ajuda a reconhecer a unidade durante a contagem do estoque.')
    y = shot('15-selecionar-etiquetas', y, max_height=230, annotate=False,
             caption='Confira produto, quantidade, modelo da etiqueta e prévia antes de imprimir.')
    y = _detail_step(c, y, 1, 'Escolha o produto correto',
                     'App: Estoque > Etiquetas de identificação. ERP: acesse pela NF-e ou recebimento Recebido. Confira nome, variação e quantidade.')
    y = _detail_step(c, y, 2, 'Use uma etiqueta por unidade completa',
                     'Um móvel em várias caixas é uma unidade. Confira os volumes e cole uma etiqueta no principal.')
    y = _detail_step(c, y, 3, 'Revise a prévia e imprima',
                     'Revise a prévia e escolha Imprimir. Cada impressão cria nova identificação; confira antes de repetir.', fill=MINT)
    _back_to_map(c)

    y = base('Exemplo prático 5 / Compra', 'Pedido de compra: registre o combinado',
             'Exemplo fictício de pedido.')
    y = shot('09-pedido-compra', y, max_height=190, annotate=False,
             caption='Confira produto, quantidade e custos.')
    y = _detail_step(c, y, 1, 'Abra um pedido novo',
                     'Vá a Estoque > Pedidos de compra. No menu de três pontinhos, escolha Novo pedido.')
    y = _detail_step(c, y, 2, 'Escolha fornecedor e itens',
                     'Selecione o fornecedor primeiro. Depois adicione o produto e a variação, informe quantidade e custo combinados e revise os valores.')
    y = _detail_step(c, y, 3, 'Confirme o pedido',
                     'Confira as linhas, use Confirmar Pedido e aguarde o status.')
    y = _detail_note(c, y, 'Quando a carga chegar',
                     'Registre a entrada em Recebimentos. “Com pedido de compra” está indisponível (Beta); o pedido não se vincula automaticamente.')
    _back_to_map(c)

    y = base('Exemplo prático 6 / Avaria', 'Produto com problema: decida antes',
             'Só registre indisponibilidade quando a unidade sair do estoque disponível.')
    y = shot('12-indisponibilidade', y, max_height=210, annotate=False,
             caption='Campos do registro de indisponibilidade.')
    y = _detail_step(c, y, 1, 'O produto ainda pode ser vendido ou usado?',
                     'Se sim, avise o responsável e não registre indisponibilidade. Se não, separe a unidade antes de continuar.')
    y = _detail_step(c, y, 2, 'Registre o que aconteceu',
                     'Em Estoque > Indisponibilidades, escolha produto, quantidade, Motivo e Tratativa. Para devolução, selecione o fornecedor.')
    y = _detail_step(c, y, 3, 'Confirme o destino',
                     'Conserto: mantenha separado; após reparar e conferir o móvel inteiro, pessoa autorizada usa Desfazer. Devolução, descarte ou perda: mantenha o registro ativo.', fill=MINT)
    y = _detail_note(c, y, 'Peças reaproveitadas',
                     'Peças não entram automaticamente no estoque. Peça orientação antes de registrá-las separadamente.')
    _back_to_map(c)
