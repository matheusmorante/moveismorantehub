"""Roteiros curtos e clicáveis para consulta durante a operação do estoque."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

W, H = A4
M, TW = 40, W - 80
NAVY = colors.HexColor('#152940')
INK = colors.HexColor('#24364B')
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


def render_roteiros_visuais(c, base):
    """Acrescenta páginas 28 a 35 sem alterar os números do guia detalhado."""
    y = base('Roteiros com figuras', 'O que você quer fazer?',
             'Toque ou clique no quadro. Se estiver impresso, abra a página indicada.')
    gap = 14
    width = (TW - gap) / 2
    cards = [
        ('Receber uma carga', 'Chegaram produtos na loja.', 29, 'box'),
        ('Imprimir etiquetas', 'Identificar os móveis.', 30, 'tag'),
        ('Contar o estoque', 'Fazer um inventário.', 31, 'list'),
        ('Fazer um pedido', 'Registrar uma compra.', 32, 'purchase'),
        ('Produto com problema', 'Avaria ou defeito.', 33, 'warning'),
        ('Preciso de ajuda', 'Algo não saiu como esperado.', 34, 'help'),
    ]
    for index, (title, body, page, icon) in enumerate(cards):
        _map_card(c, M + (index % 2) * (width + gap), y - (index // 2) * 160,
                  width, title, body, page, icon)

    y = base('Roteiro 1 / Recebimento', 'Chegaram produtos?',
             'Siga os passos na ordem. Se algo não bater, pare e peça ajuda.')
    y = _card(c, y, 'Confira a carga',
              'Compare os móveis e as caixas com a nota. Sem nota, use o pedido; se não tiver, peça ajuda.', 1)
    y = _card(c, y, 'Abra Recebimentos',
              'No app: Estoque > Recebimentos > três pontinhos > Novo. No ERP: Estoque > Recebimentos > Receber Mercadoria.', 2)
    y = desenhar_opcoes_recebimento(c, y)
    y = _card(c, y, 'Confira os dados',
              'Veja fornecedor, produto, quantidade e custo. Com nota, resolva XML ou vínculos pendentes antes de continuar.', 3)
    y = _card(c, y, 'Confirme uma vez',
              'Toque em <b>Confirmar recebimento</b>, aguarde e confira se aparece <b>Recebido</b>.', 4)
    _card(c, y, 'PARE: pedido não é entrada',
          'A opção Com pedido de compra está indisponível (Beta). Use o pedido para conferir a carga; escolha o caminho com ou sem nota.', fill=AMBER)
    _back_to_map(c)

    y = base('Roteiro 2 / Etiquetas', 'Uma etiqueta por móvel',
             'A etiqueta de identificação acompanha a unidade física.')
    y = _card(c, y, 'Escolha os produtos',
              'No app, abra Estoque > Etiquetas de identificação. Confira produto e quantidade. No ERP, veja as páginas 17 e 18.', 1)
    y = _card(c, y, 'Confira e imprima',
              'Veja o modelo e a prévia. Escolha <b>Imprimir</b> ou a impressão avançada disponível.', 2)
    y = _boxes_example(c, y)
    y = _card(c, y, 'Cole na caixa principal',
              'Um móvel pode ter várias caixas. Use uma identificação para cada móvel completo.', 3)
    _card(c, y, 'PARE antes de repetir',
          'Cada impressão cria uma nova identificação. Se não souber se já imprimiu, confira ou peça ajuda.', fill=AMBER)
    _back_to_map(c)

    y = base('Roteiro 3 / Inventário', 'Conte antes de concluir',
             'Inventário é a contagem do que existe fisicamente no estoque.')
    y = _card(c, y, 'Escolha o que vai contar',
              'Abra Estoque > Inventário > três pontinhos > Novo inventário. Escolha o modo e o responsável.', 1)
    y = _card(c, y, 'Conte os móveis completos',
              'Confira o produto e a versão. Registre a quantidade encontrada no campo <b>Contado</b> ou use o leitor disponível.', 2)
    y = _count_example(c, y)
    y = _card(c, y, 'Revise e conclua',
              'Compare Sistema, Contado e Ajuste. Reconte as diferenças. Uma pessoa autorizada conclui depois da revisão.', 3)
    _card(c, y, 'PARE se ainda não contou',
          'Itens incluídos podem começar em zero. Não conclua sem conferir: o zero pode reduzir o saldo. Veja as páginas 21 a 23.', fill=AMBER)
    _back_to_map(c)

    y = base('Roteiro 4 / Compra', 'Registre o pedido de compra',
             'O pedido guarda o que foi combinado com o fornecedor.')
    y = _card(c, y, 'Abra um novo pedido',
              'Vá a Estoque > Pedidos de compra. Nos três pontinhos, escolha <b>Novo pedido</b>.', 1)
    y = _card(c, y, 'Escolha fornecedor e produto',
              'Selecione o fornecedor. Adicione ao menos um item e escolha o produto correto.', 2)
    y = _card(c, y, 'Confira e confirme',
              'Revise quantidade e custo. Toque em <b>Confirmar Pedido</b> e aguarde a resposta.', 3)
    y = _card(c, y, 'Pedido não coloca produto no estoque',
              'Quando a carga chegar, registre a entrada em Recebimentos. A opção Com pedido de compra está indisponível (Beta).', fill=AMBER)
    _card(c, y, 'Quer ver mais detalhes?', 'Consulte a página 20.', fill=MINT)
    _back_to_map(c)

    y = base('Roteiro 5 / Produto com problema', 'O produto pode continuar disponível?',
             'Confira a situação antes de registrar uma indisponibilidade.')
    y = _card(c, y, 'SIM. Pode vender ou usar',
              'Avise o responsável. Não registre indisponibilidade enquanto a unidade continuar disponível.', fill=MINT)
    y = _card(c, y, 'NÃO. Precisa sair do estoque disponível',
              'Separe a unidade. Em Estoque > Indisponibilidades, registre produto, quantidade, motivo e destino.', fill=AMBER)
    y = _card(c, y, 'SE O MÓVEL VOLTAR após o conserto',
              'Uma pessoa autorizada pode usar <b>Desfazer</b> depois de conferir o móvel inteiro.')
    _card(c, y, 'SE FOI DEVOLVIDO OU DESCARTADO',
          'O móvel inteiro não volta ao estoque. Mantenha a indisponibilidade e peça orientação sobre peças reaproveitadas. Veja as páginas 25 e 26.')
    _back_to_map(c)

    y = base('Ajuda rápida', 'Algo não saiu como esperado?',
             'Pare, confira o registro e peça ajuda quando tiver dúvida.')
    y = _card(c, y, 'Não sei se confirmou',
              'Abra a lista e procure o registro antes de tentar de novo. Isso ajuda a evitar entradas repetidas.')
    y = _card(c, y, 'O botão está indisponível',
              'Confira o aviso da tela. Se não souber o que falta, peça ajuda a uma pessoa autorizada.')
    invoice_help_top = y
    y = _card(c, y, 'A nota aparece “Em uso”',
              'Abra <b>Gerenciar</b> e procure o mesmo recebimento. Toque neste quadro ou veja a página 35.')
    c.linkRect('', 'p35', Rect=(M, y + 10, M + TW, invoice_help_top), relative=0, thickness=0)
    y = _card(c, y, 'A contagem não bate',
              'Volte à contagem e reconte. Se ainda houver dúvida, peça ajuda antes de concluir o inventário.')
    _card(c, y, 'Veja o guia completo',
          'Notas e vínculos: páginas 4 a 12. Recebimentos: 13 a 16. Inventário: 21 a 23.', fill=MINT)
    _back_to_map(c)

    y = base('Ajuda / Nota fiscal', 'A nota não pode ser escolhida?',
             'Cartões indisponíveis ficam apagados; os avisos mostram o motivo.')
    y = _card(c, y, 'Não encontro a nota',
              'Confira o período. Sem busca, aparecem até 15 notas por página. Para pesquisar, digite 3 caracteres: a busca é automática. Em Outro Mês, escolha ano e mês.')
    y = _card(c, y, 'NF incompleta',
              'Use <b>Obtenha o XML</b> e importe o arquivo completo da mesma nota. Veja a página 7.')
    y = _card(c, y, 'Vínculos pendentes',
              'Abra <b>Gerenciar vínculos</b>, conclua os vínculos, aguarde salvar e feche. Se remover um produto, o aviso volta até vincular os itens que faltam. Se a gravação ficar incerta, consulte novamente antes de repetir.')
    y = _card(c, y, 'Em uso',
              'Rascunho, Recebido ou Estornado mantêm a nota em uso. Use <b>Gerenciar</b> para achar o registro; Limpar filtro volta à lista. Rascunho: Retomar. Recebido: Alterar. Estornado: peça ajuda antes de Desfazer estorno; isso reativa a entrada. Depois, em Recebido, é possível alterar.')
    _card(c, y, 'Notas de Salvados',
          'A seleção de novo recebimento aceita fornecedores de origem Normal. Linhas “Não se aplica” ficam fora do estoque.', fill=AMBER)
    _back_to_map(c)
