"""Gera as duas cópias do guia de usuário a partir das capturas e componentes vigentes.

Executar da raiz com o Python do runtime que contém reportlab e pypdf.
As marcações são vetores no PDF; os prints originais permanecem preservados.
"""
from pathlib import Path
import json
import math
import shutil
from xml.sax.saxutils import escape

from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
from roteiros_visuais import desenhar_opcoes_recebimento, render_roteiros_visuais

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
IMAGES = HERE / 'imagens'
OUTPUT = ROOT / 'output/pdf/guia-pratico-do-estoque.pdf'
PUBLIC = ROOT / 'erp/public/guias/guia-pratico-estoque.pdf'
SHOTS = {s['name']: s for s in json.loads((IMAGES / 'capturas.json').read_text(encoding='utf-8'))}
GUIDE = json.loads((ROOT / 'shared-utils/stockGuide.json').read_text(encoding='utf-8'))
FONT_DIR = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Segoe', str(FONT_DIR / 'segoeui.ttf')))
pdfmetrics.registerFont(TTFont('SegoeBold', str(FONT_DIR / 'segoeuib.ttf')))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold')
W, H = A4
M, TW = 40, W - 80
NAVY = colors.HexColor('#152940')
BLUE = colors.HexColor('#285EFF')
TEAL = colors.HexColor('#087F73')
INK = colors.HexColor('#24364B')
MUTED = colors.HexColor('#607187')
LINE = colors.HexColor('#DFE7EF')
PALE = colors.HexColor('#EFF5FF')
MINT = colors.HexColor('#EAF7F1')
AMBER = colors.HexColor('#FFF4D8')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
PUBLIC.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
c.setTitle(GUIDE['title'])
c.setAuthor('MoranteHub')
c.setSubject('Tutorial ilustrado para a operação do estoque no ERP')
pages = []
used_images = set()


def para(text, y, x=M, width=TW, size=11, leading=None, color=INK, gap=9, bold=False):
    style = ParagraphStyle('guide', fontName='SegoeBold' if bold else 'Segoe', fontSize=size,
                           leading=leading or size * 1.42, textColor=color, spaceAfter=0)
    p = Paragraph(text, style)
    _, height = p.wrap(width, H)
    if y - height < 45:
        raise ValueError(f'Texto ultrapassa a área útil na página {c.getPageNumber()}: {text[:70]}')
    p.drawOn(c, x, y - height)
    return y - height - gap


def badge(text, x, y, fill=PALE, color=BLUE):
    width = pdfmetrics.stringWidth(text, 'SegoeBold', 9) + 20
    c.setFillColor(fill)
    c.roundRect(x, y - 20, width, 20, 8, fill=1, stroke=0)
    c.setFont('SegoeBold', 9)
    c.setFillColor(color)
    c.drawString(x + 10, y - 13.7, text)
    return width


def base(section, title, subtitle=''):
    if pages:
        c.showPage()
    n = c.getPageNumber()
    c.bookmarkPage(f'p{n}')
    c.addOutlineEntry(title, f'p{n}', level=0, closed=False)
    pages.append(title)
    c.setFillColor(colors.white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFont('SegoeBold', 8)
    c.setFillColor(TEAL)
    c.drawString(M, H - 34, 'MORANTEHUB  /  GUIA PRÁTICO DO ESTOQUE')
    c.setFillColor(MUTED)
    c.setFont('Segoe', 8)
    c.drawRightString(W - M, H - 34, section.upper())
    y = para(title, H - 59, size=25, leading=29.5, color=NAVY, bold=True, gap=10)
    if subtitle:
        y = para(subtitle, y, size=10.8, color=MUTED, gap=16)
    c.setStrokeColor(LINE)
    c.line(M, 36, W - M, 36)
    c.setFillColor(MUTED)
    c.setFont('Segoe', 8)
    c.drawString(M, 23, f'Operação do ERP e app  |  Edição ilustrada  |  {GUIDE.get("lastUpdated", "29/10/2026")}')
    c.setFont('SegoeBold', 9)
    c.setFillColor(NAVY)
    c.drawRightString(W - M, 22, str(n).zfill(2))
    return y


def step(number, title, text, y, x=M, width=TW):
    c.setFillColor(BLUE)
    c.circle(x + 10, y - 11, 10, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('SegoeBold', 9)
    c.drawCentredString(x + 10, y - 14.2, str(number))
    title_y = para(title, y, x + 31, width - 31, size=11.4, bold=True, gap=3)
    return para(text, title_y, x + 31, width - 31, size=10.6, gap=14)


def note(title, text, y, x=M, width=TW, fill=PALE):
    a = Paragraph(title, ParagraphStyle('note-title', fontName='SegoeBold', fontSize=10.6, leading=14, textColor=NAVY))
    b = Paragraph(text, ParagraphStyle('note-body', fontName='Segoe', fontSize=10.2, leading=14.2, textColor=INK))
    ah = a.wrap(width - 28, H)[1]
    bh = b.wrap(width - 28, H)[1]
    height = ah + bh + 31
    if y - height < 45:
        raise ValueError(f'Caixa ultrapassa a página {c.getPageNumber()}: {title}')
    c.setFillColor(fill)
    c.roundRect(x, y - height, width, height, 10, stroke=0, fill=1)
    a.drawOn(c, x + 14, y - 13 - ah)
    b.drawOn(c, x + 14, y - 18 - ah - bh)
    return y - height - 14


def arrow(x1, y1, x2, y2):
    c.setStrokeColor(BLUE)
    c.setFillColor(BLUE)
    c.setLineWidth(1.3)
    c.line(x1, y1, x2, y2)
    angle = math.atan2(y2 - y1, x2 - x1)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - 6 * math.cos(angle - .5), y2 - 6 * math.sin(angle - .5))
    p.lineTo(x2 - 6 * math.cos(angle + .5), y2 - 6 * math.sin(angle + .5))
    p.close()
    c.drawPath(p, fill=1, stroke=0)


def shot(name, y, width=TW, max_height=360, x=M, crop=None, annotate=True, caption=''):
    meta = SHOTS[name]
    used_images.add(meta['file'])
    ow, oh = meta['width'], meta['height']
    cx, cy, sw, sh = crop or (0, 0, ow, oh)
    scale = min(width / sw, max_height / sh)
    dw, dh = sw * scale, sh * scale
    dx = x + (width - dw) / 2
    bottom = y - dh
    if bottom < 45:
        raise ValueError(f'Imagem ultrapassa a página {c.getPageNumber()}: {name}')
    c.saveState()
    p = c.beginPath()
    p.rect(dx, bottom, dw, dh)
    c.clipPath(p, stroke=0)
    c.drawImage(str(IMAGES / meta['file']), dx - cx * scale, y + cy * scale - oh * scale,
                width=ow * scale, height=oh * scale, mask='auto')
    c.restoreState()
    c.setStrokeColor(LINE)
    c.setLineWidth(.6)
    c.roundRect(dx, bottom, dw, dh, 7, stroke=1, fill=0)
    if annotate:
        for b in meta['boxes']:
            if b['x'] < cx or b['y'] < cy or b['x'] + b['w'] > cx + sw + 2 or b['y'] + b['h'] > cy + sh + 2:
                continue
            bx, by = dx + (b['x'] - cx) * scale, y - (b['y'] - cy + b['h']) * scale
            bw, bh = b['w'] * scale, b['h'] * scale
            c.setStrokeColor(BLUE)
            c.setLineWidth(1.3)
            c.roundRect(bx - 2, by - 2, bw + 4, bh + 4, 4, stroke=1, fill=0)
            tx = dx - 11 if bx - dx < 24 else bx - 13
            ty = min(y - 9, by + bh + 13)
            arrow(tx + 5, ty - 5, bx + min(12, bw / 2), by + bh / 2)
            c.setFillColor(BLUE)
            c.circle(tx, ty, 8.5, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont('SegoeBold', 8)
            c.drawCentredString(tx, ty - 2.8, str(b['n']))
    if caption:
        return para(caption, bottom - 8, x, width, size=8.2, color=MUTED, gap=14)
    return bottom - 17


def table(headers, rows, y, widths=None, x=M, width=TW, size=10.3):
    widths = widths or [width / len(headers)] * len(headers)
    all_rows = [headers, *rows]
    for index, row in enumerate(all_rows):
        ps = [Paragraph(str(cell), ParagraphStyle('cell', fontName='SegoeBold' if index == 0 else 'Segoe',
              fontSize=size, leading=size * 1.4, textColor=colors.white if index == 0 else INK)) for cell in row]
        heights = [p.wrap(w - 20, H)[1] for p, w in zip(ps, widths)]
        height = max(heights) + 18
        if y - height < 45:
            raise ValueError(f'Tabela ultrapassa a página {c.getPageNumber()}')
        c.setFillColor(NAVY if index == 0 else (colors.HexColor('#F3F6FA') if index % 2 else colors.white))
        c.rect(x, y - height, width, height, stroke=0, fill=1)
        xx = x
        for p, w, ph in zip(ps, widths, heights):
            p.drawOn(c, xx + 10, y - 9 - ph)
            xx += w
        y -= height
    return y - 16


def flow_card(title, body, x, top, width, height, fill=PALE, accent=BLUE,
              title_size=9.4, body_size=8.3):
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(.7)
    c.roundRect(x, top - height, width, height, 9, stroke=1, fill=1)
    c.setFillColor(accent)
    c.roundRect(x, top - height, 5, height, 2, stroke=0, fill=1)
    title_p = Paragraph(title, ParagraphStyle('flow-title', fontName='SegoeBold', fontSize=title_size,
                                               leading=title_size * 1.2, textColor=NAVY))
    body_p = Paragraph(body, ParagraphStyle('flow-body', fontName='Segoe', fontSize=body_size,
                                             leading=body_size * 1.27, textColor=INK))
    title_h = title_p.wrap(width - 24, H)[1]
    body_h = body_p.wrap(width - 24, H)[1]
    if title_h + body_h + 18 > height:
        raise ValueError(f'Caixa do fluxograma ultrapassa o tamanho: {title}')
    title_p.drawOn(c, x + 12, top - 9 - title_h)
    body_p.drawOn(c, x + 12, top - 13 - title_h - body_h)


def product_structure_diagram(y):
    y = para('Entenda o tipo de cadastro', y, size=11.2, bold=True, gap=7)
    top = y
    gap = 12
    col_w = (TW - gap) / 2
    left_x = M
    right_x = M + col_w + gap
    diagram_h = 112

    flow_card(
        'PRODUTO SIMPLES',
        '<b>Exemplo: Luminária de mesa</b><br/>Uma única versão cadastrada. Ter uma ou várias unidades no estoque não muda o tipo do cadastro.',
        left_x, top, col_w, diagram_h, fill=PALE, accent=BLUE,
    )

    flow_card(
        'PRODUTO PAI: CADEIRA AURORA',
        'Reúne os dados comuns da família e organiza as versões.',
        right_x, top, col_w, 42, fill=MINT, accent=TEAL,
        title_size=8.6, body_size=7.8,
    )
    child_top = top - 57
    child_gap = 7
    child_w = (col_w - child_gap) / 2
    split_y = child_top + 5
    center_x = right_x + col_w / 2
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(center_x, top - 43, center_x, split_y)
    c.line(right_x + child_w / 2, split_y, right_x + child_w + child_gap + child_w / 2, split_y)
    arrow(right_x + child_w / 2, split_y, right_x + child_w / 2, child_top)
    arrow(right_x + child_w + child_gap + child_w / 2, split_y,
          right_x + child_w + child_gap + child_w / 2, child_top)
    flow_card('VARIAÇÃO: PRETA', 'Nome e saldo da versão.',
              right_x, child_top, child_w, 51, fill=PALE, accent=BLUE,
              title_size=7.4, body_size=7.3)
    flow_card('VARIAÇÃO: BRANCA', 'Nome e saldo da versão.',
              right_x + child_w + child_gap, child_top, child_w, 51, fill=PALE, accent=BLUE,
              title_size=7.4, body_size=7.3)
    return top - diagram_h - 14


def check(text, y, x=M, width=TW):
    c.setStrokeColor(TEAL)
    c.setLineWidth(1)
    c.roundRect(x, y - 13, 12, 12, 2, stroke=1, fill=0)
    return para(text, y + 1, x + 23, width - 23, size=10.6, gap=12)


# 01 - Capa
y = base('Comece aqui', escape(GUIDE['title']))
c.setFillColor(NAVY)
c.rect(0, H - 390, W, 255, fill=1, stroke=0)
para('Da chegada da carga<br/>ao saldo certo.', H - 160, M, TW, size=31, leading=38, color=colors.white, bold=True)
para('Um tutorial para receber mercadorias, completar notas fiscais, vincular produtos, imprimir etiquetas e contar o estoque.', H - 265, M, TW - 70, size=13, leading=19, color=colors.HexColor('#DDE9F7'))
y = H - 418
y = para('O roteiro de uma entrada bem feita', y, size=16, bold=True)
labels = ['Conferir a carga', 'Registrar a nota', 'Vincular os itens', 'Receber', 'Etiquetar']
for i, label in enumerate(labels):
    xx = M + i * 104
    c.setFillColor(MINT)
    c.circle(xx + 18, y - 23, 18, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.setFont('SegoeBold', 13)
    c.drawCentredString(xx + 18, y - 27.5, str(i + 1))
    para(label, y - 52, xx, 95, size=10, bold=True)
    if i < 4:
        c.setStrokeColor(LINE)
        c.line(xx + 41, y - 23, xx + 94, y - 23)
y -= 113
y = note('A regra que evita saldo errado', 'Uma NF-e importada ou um pedido de compra <b>não coloca mercadoria no estoque</b>. A entrada acontece ao usar <b>Confirmar recebimento</b>, depois da conferência física.', y, fill=MINT)
quick_top = y - 4
flow_card('COMECE PELOS ROTEIROS COM FIGURAS',
          'Toque ou clique aqui para escolher sua tarefa. No papel, abra a página 28.',
          M, quick_top, TW, 72, fill=PALE, title_size=13.5, body_size=12)
c.linkRect('', 'p28', Rect=(M, quick_top - 72, W - M, quick_top), relative=0, thickness=0)
para('As telas mostram exemplos. Os menus disponíveis dependem das permissões do seu usuário.',
     quick_top - 84, size=10.5, color=MUTED)

# 02 - Navegação e mapa
y = base('Mapa do guia', 'Onde encontrar cada operação', 'No app, toque novamente em Estoque para voltar à lista. No ERP, abra Estoque pelo menu lateral.')
shot('00-menu-estoque', y, width=172, max_height=447, x=M, crop=(0, 0, 280, 560), caption='No app, use Etiquetas de identificação. Etiquetas de preço ficam no ERP.')
xx, ww = M + 195, TW - 195
yy = y
for title, body in [
    ('Nota Fiscal de Entrada', 'Localizar a nota, importar o arquivo XML e associar os produtos.'),
    ('Recebimentos', 'Conferir a mercadoria recebida e confirmar a entrada.'),
    ('Pedidos de compra', 'Registrar o que foi comprado; isso ainda não coloca os produtos no estoque.'),
    ('Inventário', 'Contar o estoque físico e revisar diferenças.'),
    ('Movimentações', 'Ver o que aumentou ou diminuiu o estoque e por quê.'),
    ('Indisponibilidades', 'Registrar produtos separados e retirados do estoque.'),
    ('Etiquetas de identificação', 'No app, prepare etiquetas de identificação. Etiquetas de preço ficam disponíveis no ERP.'),
    ('Fornecedores', 'Consulte ou mantenha os cadastros. Em três pontinhos, Excluir fornecedor só é liberado quando não há produtos, pedidos de compra, recebimentos, inventários registrados, notas fiscais ou indisponibilidades vinculados.'),
]:
    yy = para(title, yy, xx, ww, size=10.8, bold=True, gap=2)
    yy = para(body, yy, xx, ww, size=9.7, leading=13.4, gap=9)
y = min(yy, y - 480)
y = table(['Procure por assunto', 'Páginas'], [
    ['Conferência da carga, notas e vínculos', '4 a 12'],
    ['Recebimento, custos e confirmação', '13 a 16'],
    ['Etiquetas e caixas de um mesmo produto', '17 a 19'],
    ['Compras e inventário', '20 a 23'],
    ['Movimentações, indisponibilidades, checklist e roteiros', '24 a 44'],
], y, widths=[TW - 90, 90], size=9.3)

# 03 - Fluxo de recebimento
y = base('Mapa de operação', 'Siga o caminho da carga', 'Confira a mercadoria primeiro. Depois siga o caminho conforme o documento que veio com ela.')
common_top = y - 2
flow_card('1. CONFERIR A ENTREGA',
          'Confira produto, versão, quantidade e caixas. Sem NF, use o pedido, a etiqueta ou o catálogo do fornecedor.',
          M, common_top, TW, 58, fill=MINT, accent=TEAL)
arrow(W / 2, common_top - 59, W / 2, common_top - 70)
branch_top = common_top - 76
left_x, gap = M, 14
col_w = (TW - gap) / 2
right_x = left_x + col_w + gap
badge('COM NOTA FISCAL', left_x + 2, branch_top, fill=PALE, color=BLUE)
badge('SEM NOTA FISCAL', right_x + 2, branch_top, fill=AMBER, color=colors.HexColor('#9A5B00'))
cards_top = branch_top - 30
card_h, card_gap = 70, 5
invoice_steps = [
    ('Confira a nota', 'Se faltar produto, importe o XML completo. Passos na página 38.'),
    ('Vincule o fornecedor e os itens', 'Associe o que entra no estoque; marque “Não se aplica” nas demais linhas. Veja a página 39.'),
    ('Confira a carga', 'Revise quantidades, data e despesas fora da nota.'),
    ('Confirme o recebimento', 'A entrada só ocorre após Confirmar recebimento.'),
]
manual_steps = [
    ('Confira o pedido ou a etiqueta', 'Use também a tabela/portfólio do fornecedor, se necessário.'),
    ('Abra Recebimentos', 'Escolha Sem nota fiscal. Com pedido de compra está indisponível (Beta).'),
    ('Adicione os produtos e quantidades', 'Anexe a foto do pedido, se houver. Passos na página 37.'),
    ('Confira e confirme', 'Revise custos e despesas; confirme somente o que chegou.'),
]
for index, (invoice, manual) in enumerate(zip(invoice_steps, manual_steps)):
    top = cards_top - index * (card_h + card_gap)
    flow_card(invoice[0], invoice[1], left_x, top, col_w, card_h, fill=PALE,
              title_size=9.8, body_size=8.8)
    flow_card(manual[0], manual[1], right_x, top, col_w, card_h, fill=AMBER,
              accent=colors.HexColor('#B7791F'), title_size=9.8, body_size=8.8)
    if index < len(invoice_steps) - 1:
        arrow(left_x + col_w / 2, top - card_h - 1, left_x + col_w / 2, top - card_h - card_gap + 1)
        arrow(right_x + col_w / 2, top - card_h - 1, right_x + col_w / 2, top - card_h - card_gap + 1)
note_top = cards_top - len(invoice_steps) * (card_h + card_gap) + card_gap - 9
y = note('Toda NF destinada à empresa deve ser cadastrada',
         'Se não aparecer, importe o XML, mesmo que a entrega tenha divergências. Avise o responsável e só confirme depois de resolver. Cadastrar a NF não altera o estoque.',
         note_top, fill=MINT)

# 03 - Chegada
y = base('01 / Conferência física', 'A carga chegou. Por onde começar?', 'Primeiro compare o que chegou com o documento. Depois registre a operação no sistema.')
y = note('Use a referência disponível', '<b>Com NF:</b> confira a nota. <b>Sem NF:</b> use o pedido; se não houver, confira nome e versão na etiqueta ou no catálogo do fornecedor.', y, fill=MINT)
for n, title, body in [
    (1, 'Confira a empresa e o documento', 'A NF deve ser destinada à empresa. Sem NF, compare com o pedido, etiqueta ou catálogo.'),
    (2, 'Confira produto e versão', 'Compare nome, modelo, medida e cor para selecionar a variação correta.'),
    (3, 'Conte móveis completos', 'Confira todas as caixas. Um móvel em vários volumes continua sendo uma unidade.'),
    (4, 'Anote divergências', 'Não registre o que não chegou. Avise o responsável sobre faltas, sobras, trocas ou avarias.'),
    (5, 'Registre toda NF recebida', 'Se faltar na lista, importe o XML. Não confirme o recebimento enquanto houver divergência.'),
]:
    y = step(n, title, body, y)
y = note('Se algo não estiver conforme', 'Avise a equipe responsável e não confirme quantidades incorretas. Só registre indisponibilidade quando separar a unidade e tirá-la do estoque disponível; veja as páginas 25 e 26.', y, fill=AMBER)

# 04 - Lista de NF
y = base('02 / NF de entrada', 'Localize a nota antes de importar', 'No app: Estoque > Nota Fiscal de Entrada (NF Recebidas). No ERP: Estoque > NF de entrada. A lista mostra até 15 notas por página. Use os controles abaixo para ver as próximas; pesquise e confira o período para evitar duplicidade.')
y = shot('01-nf-entrada-header', y, max_height=75, caption='1 No menu de três pontinhos, selecione Importar.')
y = shot('01-nf-entrada', y, max_height=210, crop=(0, 220, 1380, 500), caption='2 Vinculações pendentes  •  3 XML incompleto. Dados comerciais foram ocultados.')
y = table(['O que aparece', 'O que fazer'], [
    ['<b>NF incompleta / Obter XML</b>', 'Antes de vincular produtos ou gerar recebimento, use esse rótulo para importar o XML completo atualizado do Portal da NF-e.'],
    ['<b>Vinculações Pendentes</b>', 'Fornecedores convencionais: abra para vincular. Salvados: status normal da NF e selo azul “Vinculação não se aplica”; toque no i para ver o motivo.'],
    ['<b>Disponível</b>', 'Confira os itens e os vínculos antes de gerar o recebimento. Esse status, sozinho, não significa entrada no saldo.'],
], y, widths=[145, TW - 145], size=10)
y = para('Abra a nota e consulte as abas Resumo, Participantes, Itens e Fiscal. Se não aparecer, confira busca e período. NFs automáticas sem itens ou valores precisam do XML completo do Portal: use Obter XML.', y, size=10.8)
y = note('Confira o destinatário e evite duplicidade', 'Toda NF recebida em que sua empresa é destinatária deve constar aqui. Confira antes de importar. Se incompleta, use Obter XML. Notas cadastradas não podem ser excluídas.', y, fill=MINT)

# 05 - Importar
y = base('02 / NF de entrada', 'Importe o arquivo XML da nota', 'O XML é o arquivo digital da nota com os dados dos produtos. O DANFE é a versão impressa; foto ou PDF dele não substitui o XML para importar os itens.')
y = shot('02-importar-xml', y, width=TW, max_height=325, caption='1 Escolha ou arraste o arquivo  •  2 Consulta pelo portal, se você ainda precisa obter o XML.')
y = step(1, 'Abra a opção de importar', 'No app e no ERP, toque nos três pontinhos do cabeçalho e em Importar. Para consultar no Portal, use Chave de Acesso; escanear não importa os produtos.', y)
y = step(2, 'Escolha ou arraste o arquivo XML', 'No ERP, arraste o XML sobre a lista. Solte quando aparecer o painel azul para importar; clique no fundo azul para cancelar. No app, escolha o XML pelo seletor do aparelho. Aguarde a mensagem do sistema antes de continuar.', y)
y = step(3, 'Confira a mensagem do sistema', 'Nota nova: ela será adicionada. Nota já cadastrada com dados faltando: será completada. XML igual ao já salvo: o sistema avisará que não houve mudança.', y)
y = note('Importar não é receber', 'Depois de importar, abra <b>Gerenciar vínculos</b>. A nota pode estar completa e ainda precisar de fornecedor e produtos vinculados.', y, fill=MINT)

# 06 - XML incompleto
y = base('02 / NF de entrada', 'Complete a nota com o XML', 'Use o arquivo XML completo para incluir os produtos que faltam na nota.')
y = shot('03-xml-incompleto', y, width=TW, max_height=250, crop=(0, 275, 576, 225), caption='2 Selecione o XML completo da mesma nota.')
y = step(1, 'Obtenha o XML completo', 'Na nota incompleta, clique em Obter XML. No Portal da NF-e, consulte a chave e baixe o XML completo mais recente; depois importe o arquivo nesta mesma nota.', y)
y = step(2, 'Importe o arquivo na mesma nota', 'Selecione ou arraste o XML no campo Arquivo XML da NF-e.', y)
y = step(3, 'Confira e associe os produtos', 'Verifique se os itens aparecem e, em seguida, vincule o fornecedor e os produtos que entrarão no estoque. Marque “Não se aplica” nas demais linhas.', y)
y = note('Ciência sem confirmação', 'Se aparecer “Comunicação sem confirmação”, consulte o Histórico Fiscal antes de tentar registrar a Ciência novamente. O envio pode ter sido processado mesmo sem uma resposta na tela. A SEFAZ também pode exigir uma Ciência aceita para liberar o XML no Portal.', y, fill=AMBER)

# 07 - Vínculos
y = base('03 / Vínculos', 'Associe a nota aos cadastros corretos', 'Abra Gerenciar vínculos em Vinculações Pendentes ou nos três pontinhos. Aguarde o carregamento da nota e dos vínculos antes de editar.')
y = shot('04-gerenciar-vinculos', y, max_height=290, caption='1 Fornecedor  •  2 seletor de modo; Cadastro rápido apenas em Único  •  3 Gerar recebimento abre a NF no app. “Não se aplica” ignora o item no estoque.')
y = shot('04b-fornecedor', y, max_height=65, caption='Ampliação do campo de fornecedor. Quando estiver bloqueado, clique ou toque para consultar o motivo.')
y = step(1, 'Associe o fornecedor correto', 'Compare o Emitente e escolha o fornecedor correspondente. Se o campo estiver bloqueado, clique ou toque nele para consultar o motivo. Para trocar, desvincule todos os produtos antes. Use Novo fornecedor se necessário. Fornecedores exclusivos de Salvados ficam em “Não se aplica” e não geram recebimento nem movimentação de estoque.', y)
y = step(2, 'Confira os dados e encontre o produto', 'Confira Unitário e Total; os dados fiscais ficam nas abas Itens e Fiscal da NF-e. Busque com 3 caracteres: Único mostra variações ativas do fornecedor; Composto, apenas produtos compostos dele (até 5 resultados). Toque no resultado para vincular. Para alterar o cadastro, abra Produtos fora deste modal. Para trocar o modo, remova o vínculo ou todos os componentes. “Não se aplica” não movimenta estoque.', y)
y = step(3, 'Aguarde a confirmação do salvamento', 'Ao remover, a NF volta a “Vinculações Pendentes” até vincular os itens que faltam. Se salvar ficar incerto, consulte novamente antes de repetir.', y)

# 08 - Cadastro rápido
y = base('03 / Vínculos', 'Cadastro rápido: escolha o tipo certo', 'Use no modo de vínculo Único quando não encontrar um produto. O botão fica oculto em Composto e Não se aplica. Pesquise antes de cadastrar.')
y = shot('05-cadastro-rapido', y, max_height=70, caption='1 Produto simples  •  2 Variação de produto existente  •  3 Produto composto.')
y = para('Simples tem uma versão; variação integra uma família; composto reúne produtos. A quantidade em estoque não define o tipo do cadastro.', y, size=10.1, gap=8)
y = product_structure_diagram(y)
y = table(['Opção do formulário', 'Quando escolher'], [
    ['<b>Produto simples</b>', 'O item não existe e não tem outras versões para agrupar. Exemplo: Luminária de mesa.'],
    ['<b>Variação de produto existente</b>', 'O pai já existe. Exemplo: incluir a Cadeira Aurora Branca na família Cadeira Aurora.'],
    ['<b>Produto composto</b>', 'Para kits ou conjuntos. Escolha pelo menos dois componentes distintos e suas quantidades. Não use para cor ou medida.'],
], y, widths=[185, TW - 185], size=8.8)
y = note('Cadastro rápido', 'No simples, informe Nome do produto e Categoria. O sistema aproveita dados disponíveis na NF-e. Preço e fotos podem ser completados depois. <b>Cadastrar e vincular</b> salva; <b>Cancelar</b> fecha. O produto fica ativo para uso interno, oculto do catálogo e com saldo zero até confirmar o recebimento. Se o código já existir, use <b>Reutilizar e vincular</b>.', y, fill=MINT)

# 10 - Composição e características
y = base('03 / Cadastro de produtos', 'Composição e características', 'Produto simples é um item vendido por conta própria. Produto composto é um conjunto de produtos cadastrados como peças.')
card_gap = 14
card_w = (TW - card_gap) / 2
flow_card(
    'PRODUTO COMPOSTO',
    'Cadastre conjuntos, como uma cozinha por módulos, com suas peças e quantidades. Ao selecionar o conjunto no pedido de venda, o ERP inclui os componentes.',
    M, y, card_w, 148, fill=PALE, accent=BLUE,
    title_size=9.8, body_size=9.1,
)
flow_card(
    'CARACTERÍSTICAS',
    'Material, cor, portas, medidas e peso descrevem o produto. Não são a lista de peças de um conjunto.',
    M + card_w + card_gap, y, card_w, 148, fill=MINT, accent=TEAL,
    title_size=9.8, body_size=9.1,
)
y -= 166
y = step(1, 'Cadastre uma composição', 'Use Produto composto para conjuntos com pelo menos duas peças distintas. Informe quantas formam uma unidade. Em produtos com versões, abra a composição da variação; outra cor ou medida deve ser uma variação.', y)
y = step(2, 'Preencha as características', 'Em Características, informe dados corretos do produto e da versão. Use os mesmos nomes e valores para produtos semelhantes.', y)
y = note(
    'Conjunto que chega agrupado na NF-e',
    'Em Gerenciar vínculos, associe manualmente cada peça da nota ao produto ou variação corretos. O ERP calcula o rateio do custo da linha no recebimento.',
    y, fill=AMBER,
)
y = note('Para encontrar depois', 'Use nomes e valores consistentes para localizar produtos e filtrar resultados.', y, fill=MINT)
# 09 - Seleção certa
y = base('03 / Vínculos', 'Nova variação: escolha o pai e complete a versão', 'Use esta opção quando o produto principal já existe e pertence ao fornecedor associado à NF-e.')
y = shot('05b-variacao-existente', y, max_height=90, caption='No campo Produto pai, digite pelo menos duas letras e escolha o cadastro da família correta.')
y = step(1, 'Confira o produto pai e o fornecedor', 'Escolha o produto principal correspondente ao item da nota. O sistema só permite usar um pai associado ao mesmo fornecedor. Se o item já existir como variação, selecione o cadastro encontrado em vez de criar outra versão.', y)
y = step(2, 'Complete o nome da variação', 'Escreva o que diferencia esta versão. Exemplo: pai Cadeira Aurora + complemento Branca = Cadeira Aurora Branca. Confira o nome completo sugerido e não repita uma versão que já esteja cadastrada.', y)
y = step(3, 'Preencha só as características obrigatórias', 'O pai fornece dados gerais como categoria, marca, modelo e NCM. Na seção Características da variação, preencha os campos com asterisco; os opcionais e as fotos podem ficar para depois.', y)
y = table(['Se o código fiscal (NCM) da nota for diferente', 'O que acontece'], [
    ['Usar o NCM da NF só na variação', 'Aplica o código da nota só à nova versão e mantém o código fiscal do produto principal.'],
    ['Usar o NCM da NF e atualizar o pai', 'Muda também o código fiscal do produto principal. Confira antes de salvar.'],
    ['Manter o NCM do pai', 'A nova versão continua com o código fiscal do produto principal.'],
], y, widths=[245, TW - 245], size=9.8)
y = note('Cada variação tem seu próprio saldo', 'Depois de Cadastrar e vincular, o item da nota fica associado à nova versão. A quantidade só entra no estoque quando o recebimento for confirmado. Confira a cor, medida ou modelo antes de concluir.', y, fill=MINT)

# 10 - Gerar
y = base('03 / Vínculos', 'Quando Gerar recebimento fica disponível?', 'Se o botão cinza estiver bloqueado, passe o mouse sobre ele. No teclado, pressione Tab até o botão para ler o motivo.')
y = shot('04c-gerar-recebimento', y, max_height=190, width=TW, caption='Neste exemplo falta vincular o fornecedor. O motivo muda conforme a pendência da nota.')
for text in [
    'O arquivo XML da nota está completo e mostra todos os produtos.',
    'O fornecedor está associado ao cadastro correto.',
    'Os itens que entrarão no estoque estão associados aos produtos e versões corretos; as demais linhas estão marcadas “Não se aplica”.',
    'O sistema terminou de salvar as associações.',
    'Você é Administrador ou Estoquista, e a nota ainda permite gerar a entrada.',
]:
    y = check(text, y)
y = step(1, 'Resolva a pendência indicada', 'Para trocar fornecedor após vincular itens, remova primeiro os vínculos necessários.', y)
y = step(2, 'Abra Gerar recebimento', 'No ERP, use o menu de três pontinhos. No app, use Gerenciar vínculos > Gerar recebimento. É necessário ter acesso ao módulo, XML completo, fornecedor de origem Normal, itens resolvidos e NF sem recebimento concluído.', y)
y = note('Ainda falta a conferência final', 'Gerar recebimento apenas prepara o formulário. Revise a entrega física e as despesas e use <b>Confirmar recebimento</b> para efetivar a entrada.', y, fill=MINT)

# 11 - Receber caminhos
y = base('04 / Recebimentos', 'Escolha o caminho de recebimento', 'ERP: Receber Mercadoria. App: três pontinhos > Novo.')
y = desenhar_opcoes_recebimento(c, y)
y = step('A', 'Sem nota fiscal', 'Selecione o fornecedor, a data de chegada e as variações. Informe as quantidades e o custo unitário de cada item.', y)
y = step('B', 'Com nota fiscal de entrada', 'Escolha a nota da carga e confira a data de chegada. Se a nota não aparecer, estiver incompleta, com vínculos pendentes ou Em uso, veja a página 35. Só notas de fornecedores com origem Normal podem iniciar esse recebimento; linhas “Não se aplica” ficam fora do estoque.', y)
y = note('Com pedido de compra: indisponível (Beta)', 'Use o pedido para conferir a carga. Registre a entrada com nota se houver NF ou sem nota se não houver. O caminho sem nota não vincula o pedido automaticamente, e o pedido Atendido não substitui o recebimento.', y, fill=AMBER)

# 12 - Recebimento
y = base('04 / Recebimentos', 'Revise o formulário antes de confirmar', 'Fornecedor, data, produtos, quantidades e custos precisam corresponder à entrega real.')
y = shot('17-recebimento-campos', y, max_height=110, crop=(0, 150, 600, 95), annotate=False, caption='Data do recebimento: exemplo de preenchimento, sem gravar uma entrada real.')
y = step(1, 'Confira fornecedor e data', 'Use a data de chegada, não a de emissão. Ao alterar um recebimento com NF, somente data e observações podem ser editadas.', y)
y = step(2, 'Confira os itens', 'Sem NF, selecione primeiro o fornecedor e depois produtos individuais vinculados a ele. Todo item precisa de produto selecionado; se faltar, escolha ou remova a linha antes de confirmar. Em novo recebimento com NF, itens, quantidades e custos da nota são informativos.', y)
y = step(3, 'Anexe comprovantes', 'Antes dos itens, anexe até cinco PDFs ou imagens. Use Observações para explicar divergências.', y)
y = note('Status e alterações', 'Rascunho: <b>Retomar</b> ou <b>Descartar</b>; não movimenta estoque. <b>Recebido</b>: alterar ou estornar. <b>Estornado</b>: Desfazer estorno reativa a entrada; depois, o recebimento pode ser alterado. Estornar não libera a NF. Trocar ou remover um item e mudar sua quantidade atualiza as movimentações.', y, fill=MINT)

# 13 - Custos
y = base('04 / Custos', 'Frete e despesas: confira sem duplicar', 'A entrega pode ter custos fora da NF-e, como uma transportadora cobrada separadamente.')
y = shot('18-custos-recebimento', y, max_height=270, caption='1 Frete  •  2 Outras despesas. Selecione % ou R$ conforme o valor informado.')
y = para('<b>No recebimento sem NF e no cadastro novo com NF</b>, o ERP e o app permitem informar frete e outras despesas em porcentagem ou valor fixo; com NF, a área se chama Despesas não fiscais e registra custos cobrados fora da nota. O sistema rateia os valores entre os itens. Na alteração de um recebimento já registrado com NF, os campos de despesas ficam informativos, assim como fornecedor e dados dos itens; somente data e observações podem ser editadas. Confira frete, outras despesas e total na composição de custo de cada item e revise o valor total também no app.', y, size=10.6)
y = table(['Exemplo simples, apenas para entender', 'Valor'], [
    ['10 unidades a R$ 100,00 de custo', 'R$ 1.000,00'],
    ['Frete separado, ainda não incluído', '+ R$ 100,00'],
    ['Total da entrada no exemplo', 'R$ 1.100,00'],
    ['Custo por unidade, sem outras despesas', 'R$ 110,00'],
], y, widths=[TW - 115, 115], size=10.6)
y = note('Compare o total com os documentos', 'O exemplo não substitui os valores da sua operação. Confira como o sistema divide o frete e as despesas entre os produtos.', y, fill=MINT)

# 14 - Confirmar
y = base('04 / Confirmação', 'Confirme uma vez e confira o resultado', 'A entrada deve ser registrada pelo recebimento que corresponde à mercadoria entregue.')
y = shot('07-formulario-recebimento', y, width=TW, max_height=95, crop=(845, 848, 420, 90), annotate=False, caption='Use Confirmar recebimento depois de revisar a carga e o formulário.')
for n, title, body in [
    (1, 'Faça a última conferência', 'Confira fornecedor, itens, quantidades e valor. Em novo recebimento com NF, os dados da nota são informativos; informe só despesas cobradas fora dela. Na alteração de uma NF recebida, só data e observações podem ser editadas. Evite duplicar a entrega e selecione um produto em cada linha.'),
    (2, 'Use Confirmar recebimento e aguarde', 'Clique uma vez e espere a mensagem do sistema. Não feche a tela durante a confirmação.'),
    (3, 'Confira o status Recebido', 'Encontre o registro na lista. NF marcada Em uso já pertence a um rascunho, recebimento ou estorno; retome esse registro em vez de iniciar outro.'),
    (4, 'Confira a movimentação gerada', 'Em Movimentações, localize o produto e o período. A entrada deve corresponder ao recebimento confirmado.'),
]:
    y = step(n, title, body, y)
y = table(['Se acontecer...', 'Como agir'], [
    ['Não apareceu mensagem de sucesso ou erro', 'Confira a lista de recebimentos antes de tentar de novo. A entrada pode já ter sido registrada.'],
    ['A lista não carrega no app', 'Toque em Tentar novamente.'],
    ['Recebimento confirmado com erro', 'Peça ajuda a um usuário autorizado. Estornar Recebimento reverte a entrada e só deve ser usado após conferir a situação real.'],
    ['Preciso usar Duplicar recebimento', 'Use para uma nova entrega. Duplicar e confirmar a mesma entrega aumenta o estoque duas vezes.'],
], y, widths=[180, TW - 180], size=10)

# 15 - Etiquetas
y = base('05 / Etiquetas', 'Escolha por onde imprimir as etiquetas', 'Imprimir abre a janela do sistema; Impressão avançada (BETA) usa a estação conectada e a fila compartilhada.')
y = shot('16-menus-de-acoes', y, max_height=155, caption='No ERP: 2 etiquetas pela NF-e  •  3 etiquetas pelo recebimento concluído. A opção 1 prepara o recebimento pela NF-e.')
y = step(1, 'Pela nota fiscal no ERP', 'Com o fornecedor e os produtos vinculados, abra os três pontinhos e escolha Imprimir etiquetas de identificação. Linhas “Não se aplica” não geram etiquetas.', y)
y = step(2, 'Pelo recebimento no ERP', 'Com o recebimento no status Recebido, abra os três pontinhos e escolha a mesma ação. Em rascunho ou estornado, a impressão fica desativada.', y)
y = step(3, 'Pelo recebimento no aplicativo', 'Nos três pontinhos de um recebimento Recebido, toque em Imprimir etiquetas de identificação. O app abre o gerador do ERP com o mesmo login e preenche a lista com os produtos vinculados e suas quantidades. Rascunhos, recebimentos estornados ou sem produtos vinculados não podem iniciar a impressão.', y)
y = step(4, 'Conecte a estação para impressão avançada', 'No ERP, abra Estoque > Etiquetas de Preço e clique em Conectar esta estação. Quando aparecer Online, confira produto, quantidade e modelo e escolha Impressão avançada (BETA) no ERP ou app. Imprimir abre a impressão normal do dispositivo.', y)
y = note('Etiquetas no app e no ERP', 'O app oferece etiquetas de identificação. No ERP, a etiqueta de identificação acompanha a unidade física e a de preço serve à exposição e à venda; no menu Produtos, a etiqueta de preço exige permissão para editar Produtos.', y, fill=MINT)

# 16 - Preparar etiquetas
y = base('05 / Etiquetas', 'Escolha a forma de imprimir', 'Imprimir abre a janela do sistema. Impressão avançada (BETA) envia o trabalho à estação conectada.')
y = shot('15-selecionar-etiquetas', y, max_height=165, caption='Confira quantidades, modelo e prévia. Dados fictícios de exemplo.')
y = step(1, 'Confira o produto e a quantidade', 'A etiqueta usa o cadastro, não a descrição da nota. No app, toque no campo Produto para abrir a busca; no ERP, pesquise no próprio campo. Digite pelo menos 3 caracteres, aguarde e escolha entre até cinco resultados. Confira também a quantidade de unidades que vai identificar.', y)
y = step(2, 'Confira o modelo e a prévia', 'Na preparação, Adicionar cria uma linha para buscar outro produto. Selecione-o; o campo fica verde com check. Sem produto, a etiqueta permanece em branco. A etiqueta de identificação mostra nome, SKU e QR, sem foto. Revise o modelo e o tamanho da folha antes de imprimir.', y)
y = step(3, 'Escolha como imprimir', 'Use Imprimir para abrir a janela de impressão do dispositivo e escolher uma impressora. Use Impressão avançada (BETA) para enviar à estação conectada; no app, ela imprime pela fila compartilhada sem abrir PDF ou janela. Confira o produto antes de colar.', y)
y = step(4, 'Mantenha a estação pronta', 'No computador da loja, instale o agente e conecte a estação em Etiquetas de Preço. Mantenha computador e impressora ligados; se ficar offline, a tarefa aguarda na fila.', y)
y = note('Modelo da folha e impressora', 'O arquivo usa o tamanho configurado no modelo e margem zero. No Windows, a impressora deve estar instalada e configurada para o mesmo tamanho de papel; a área física imprimível depende do driver e do papel.', y, fill=PALE)
y = note('Evite duas etiquetas para o mesmo móvel', 'Cada impressão cria nova identificação. Não repita as mesmas unidades pela nota e pelo recebimento.', y, fill=AMBER)

# 17 - Volumes
y = base('05 / Etiquetas', 'Um móvel pode ter várias caixas', 'O estoque conta o móvel completo. Cada caixa dele é um volume.')
y = note('Exemplo: um guarda-roupa com três volumes', '<b>1 guarda-roupa = 1 unidade de estoque = 1 identificação.</b><br/>Confira os três volumes, mas cole a etiqueta de identificação apenas no volume 1.', y, fill=MINT)
top = y - 12
for unit_index, unit_name in enumerate(['UNIDADE A', 'UNIDADE B']):
    row_y = top - unit_index * 150
    para(unit_name, row_y, M, TW, size=11, color=TEAL, bold=True)
    for i in range(3):
        bx, by, bw, bh = M + 7 + i * 169, row_y - 103, 144, 75
        c.setFillColor(colors.HexColor('#F5F1E8'))
        c.setStrokeColor(colors.HexColor('#C9BFA9'))
        c.roundRect(bx, by, bw, bh, 6, fill=1, stroke=1)
        c.line(bx + 72, by + 75, bx + 72, by + 52)
        c.setFillColor(INK)
        c.setFont('SegoeBold', 10)
        c.drawCentredString(bx + bw / 2, by + 47, f'VOLUME {i + 1}')
        c.setFont('Segoe', 9)
        c.drawCentredString(bx + bw / 2, by + 32, 'do mesmo guarda-roupa')
        if i == 0:
            c.setFillColor(BLUE)
            c.roundRect(bx + 22, by + 4, 100, 19, 4, fill=1, stroke=0)
            c.setFont('SegoeBold', 8)
            c.setFillColor(colors.white)
            c.drawCentredString(bx + 72, by + 10.5, f'ETIQUETA {unit_name[-1]}')
y = top - 303
y = para('<b>Na imagem: seis caixas formam dois móveis.</b> Imprima duas etiquetas, uma para cada móvel, e confira as demais caixas de cada conjunto.', y, size=12)
y = step(1, 'Cole no volume 1 e confira a correspondência', 'Leia o produto da etiqueta e confira com a caixa antes de colar. Não misture a identificação de uma unidade com volumes de outra.', y)
y = step(2, 'Se não puder colar no volume 1, mantenha um padrão', 'Combine com a equipe qual caixa será a principal e use sempre essa. Etiquetas em caixas diferentes podem causar separação ou entrega incompleta.', y)

# 17 - Compras
y = base('06 / Compras', 'Pedido de compra registra o combinado', 'Estoque > Pedidos de compra > três pontinhos > Novo pedido.')
y = shot('09-pedido-compra', y, max_height=220, caption='Nome longo quebra a linha; composição, custo final e total do item. Exemplo fictício.')
y = step(1, 'Escolha fornecedor e itens', 'Selecione o fornecedor antes de adicionar produtos. Informe data, produto/variação, quantidade e custo base. Revise desconto, IPI e frete; nos campos % e R$, 1234 corresponde a 12,34.', y)
y = step(2, 'Revise e confirme', 'O pedido pode ficar incompleto como rascunho. Para Confirmar Pedido, selecione fornecedor e ao menos um item com produto. O pedido não movimenta estoque.', y)
y = step(3, 'Retome ou atualize conforme o status', 'Rascunhos podem ser retomados ou descartados. Pedidos Pendentes ou Em Ordem podem ser editados enquanto não houver movimento. Atendido também não registra entrada; use Recebimentos quando a carga chegar.', y)
y = note('Pedido cancelado', 'Pode ser apagado pelo menu. Recebimentos já feitos são preservados.', y, fill=PALE)

# 18 - Inventário inicial
y = base('07 / Inventário', 'Defina o que será contado', 'ERP e app: Inventário > três pontinhos > Novo inventário.')
y = table(['Modo de inventário', 'Como funciona'], [
    ['<b>1 · Geral</b>', 'Todos os itens começam em Contado 0. Conte pelo scanner ou cartão do fornecedor; itens sem fornecedor usam o scanner.'],
    ['<b>2 · Livre</b>', 'Inicie somente as etapas dos fornecedores que serão contados.'],
    ['<b>3 · Produto</b>', 'Escolha um produto pai ativo; conte suas variações ativas.'],
    ['<b>4 · Fornecedor</b>', 'Abra o cartão para contar somente os itens dele.'],
], y, widths=[220, TW - 220], size=10.4)
y = step(1, 'Escolha o escopo e o responsável', 'Conte produtos individuais ativos; compostos, de teste, Salvados e Usados ficam fora. No app, o responsável pode vir pré-selecionado. Para Produto, escolha o pai e toque Próxima etapa.', y)
y = step(2, 'Inicie somente o que vai contar', 'No modo Livre, inicie os fornecedores escolhidos. Nos demais, abra o escopo correspondente. Confira a seleção antes de começar.', y)
y = note('Cancelar ou duplicar', 'Cancelar inventário encerra a contagem; Cancelar etapa apaga somente a etapa atual do modo Livre. Duplicar não copia quantidades.', y, fill=MINT)

# 19 - Contagem
y = base('07 / Inventário', 'Registre o que contou', 'Confira produto e variação; informe a quantidade encontrada em Contado.')
y = table(['No cartão', 'O que conferir'], [
    ['<b>Produto</b>', 'Confirme nome e variação.'],
    ['<b>Sistema / Ajuste</b>', 'Saldo registrado e diferença.'],
    ['<b>Contado</b>', 'Quantidade física, pelos botões ou campo.'],
], y, widths=[165, TW - 165], size=10.2)
y = note('O total e o zero', '“Quantidades contadas” soma unidades, não itens visitados. Zero não prova conferência e pode zerar o saldo. No modo Livre, etapas não iniciadas ficam fora do total e da revisão.', y, fill=AMBER)

# 20 - Revisão inventário
y = base('07 / Inventário', 'Revise antes de concluir', 'Sistema é o saldo atual; Contado é o físico; Ajuste é a diferença.')
y = table(['Exemplo', 'Esperado', 'Contado', 'Ajuste'], [
    ['Guarda-roupa', '5', '4', '-1 unidade'],
    ['Produto com saldo -2', '-2', '0', '+2 unidades'],
    ['Produto sem contagem', '2', 'Fora da revisão', 'Sem ajuste'],
], y, widths=[205, 90, 90, TW - 385], size=10.5)
y = para('Exemplos fictícios. Entradas e saídas durante a contagem podem mudar o saldo.', y, size=10.5)
y = step(1, 'Reconte o que divergir', 'Confira variação e caixas. Para corrigir, use Voltar para contagem.', y)
y = step(2, 'Confirme e confira o status', 'Uma pessoa autorizada conclui com a mesma conta que iniciou a confirmação. Aguarde Concluído.', y)
y = table(['Status ou ação', 'O que significa na rotina'], [
    ['Em andamento / Aguardando envio', 'Retome no mesmo aparelho e conta. Se não conseguir, peça ajuda; não inicie outro.'],
    ['Concluído / Ver detalhes', 'Consulte o resultado; peça ajuda para corrigir.'],
], y, widths=[190, TW - 190], size=9.8)

# 21 - Histórico
y = base('08 / Consulta do saldo', 'Descubra o que mudou no estoque', 'Estoque > Movimentações. Consulte quais operações aumentaram ou diminuíram o estoque.')
y = shot('13-movimentacoes', y, max_height=200, caption='1 Buscar produto  •  2 Período. As descrições das operações foram ocultadas na imagem.')
y = step(1, 'Pesquise o produto', 'Use Buscar produto e escolha o item correto. Ajuste o período: uma entrada antiga pode não aparecer no mês atual.', y)
y = step(2, 'Confira a quantidade e o resultado', 'Efetivada altera o saldo; Estornada não tem efeito. A observação mostra a origem, como o recebimento, e o motivo do estorno. Para corrigir, use o documento de origem. Em pedido de venda já movimentado, mudar só o preço não altera o saldo; aumento gera ajuste, e redução, troca ou remoção estornam a saída anterior e podem gerar outra.', y)
y = table(['Tipo', 'Como interpretar'], [
    ['Entrada', 'Acrescenta unidades ao saldo conforme a operação de origem.'],
    ['Saída', 'Retira unidades do saldo conforme a operação de origem.'],
    ['Ajuste', 'Corrige a quantidade do estoque, por exemplo, após uma contagem.'],
], y, widths=[110, TW - 110], size=10.6)
y = note('Confira onde a mudança começou', 'Abra o recebimento, inventário ou registro de indisponibilidade que originou a mudança. A lista de Produtos não corrige o estoque; em produtos compostos, confira também as peças.', y, fill=MINT)
y = para('<b>Listas paginadas:</b> no ERP e no app, cada página mostra até 15 registros. Use as setas ou números abaixo da lista para avançar; não há seletor de quantidade. Ao mudar filtros, a lista volta à primeira página.', y, size=9.7, leading=13.5, gap=0)

# 24 - Avarias e indisponibilidades
y = base('09 / Indisponibilidades', 'Registre só o que sai do estoque', 'Avaria, por si só, não é indisponibilidade. Use o registro quando separar a unidade e ela deixar de estar disponível para venda ou uso.')
y = shot('12-indisponibilidade', y, max_height=270, caption='1 Produto  •  2 Quantidade  •  3 Motivo e tratativa  •  4 Registrar.')
y = step(1, 'Veja se a unidade ficará fora do estoque', 'Se ela continuar disponível para venda ou uso, não registre indisponibilidade. Avise o responsável e siga a orientação da equipe.', y)
y = step(2, 'Separe o produto e informe a quantidade', 'No app, toque em Produto para abrir Buscar Produto. No ERP, pesquise no campo e escolha a sugestão logo abaixo. Em ambos, selecione a variação correta e informe quantas unidades serão retiradas do estoque.', y)
y = step(3, 'Explique o problema e o destino', 'Em Motivo, escolha o que aconteceu: Avaria, Defeito, Separação para devolução ao fornecedor ou Outro. Em Tratativa, escolha Devolução ao fornecedor, Descarte/perda ou Outro. Para devolver, selecione o fornecedor.', y)
y = step(4, 'Registre e confira a saída', 'Adicione local, foto ou observação se ajudar. Ao registrar, essa quantidade sai do estoque. Mantenha o produto separado.', y)
y = note('Motivo e tratativa são diferentes', 'Motivo explica o problema. Tratativa diz o que será feito com o produto.', y, fill=AMBER)

# 25 - Retorno ou saída definitiva
y = base('09 / Indisponibilidades', 'A unidade vai voltar ao estoque?', 'Depois de separar o produto, escolha o caminho conforme o que será feito com ele.')
question_top = y - 2
flow_card('O PRODUTO PRECISA FICAR FORA DO ESTOQUE?',
          'Se continuar disponível para venda ou uso, não registre indisponibilidade. Se precisar separar, siga o caminho à direita.',
          M, question_top, TW, 55, fill=PALE)
branch_y = question_top - 83
half_gap = 14
half_w = (TW - half_gap) / 2
decision_split_y = branch_y + 12
c.setStrokeColor(BLUE)
c.setLineWidth(1.2)
c.line(W / 2, question_top - 56, W / 2, decision_split_y)
c.line(M + half_w / 2, decision_split_y, M + half_w + half_gap + half_w / 2, decision_split_y)
arrow(M + half_w / 2, decision_split_y, M + half_w / 2, branch_y + 1)
arrow(M + half_w + half_gap + half_w / 2, decision_split_y,
      M + half_w + half_gap + half_w / 2, branch_y + 1)
flow_card('NÃO. Pode continuar disponível.',
          'Avise o responsável e siga a orientação da equipe. Não registre indisponibilidade.',
          M, branch_y, half_w, 74, fill=MINT, accent=TEAL)
flow_card('SIM. Separe o produto.',
          'Abra Estoque > Indisponibilidades > Nova indisponibilidade. O sistema retira essa quantidade do estoque.',
          M + half_w + half_gap, branch_y, half_w, 74, fill=AMBER, accent=colors.HexColor('#B7791F'))
arrow(M + half_w + half_gap + half_w / 2, branch_y - 75,
      W / 2, branch_y - 94)
next_top = branch_y - 105
flow_card('DEPOIS, O MÓVEL INTEIRO VOLTA AO ESTOQUE?',
          'Para conserto, responda depois que o produto estiver reparado e conferido.',
          M + 25, next_top, TW - 50, 56, fill=PALE)
route_top = next_top - 76
route_w = (TW - 14) / 2
split_y = route_top + 9
c.setStrokeColor(BLUE)
c.setLineWidth(1.2)
c.line(W / 2, next_top - 57, W / 2, split_y)
c.line(M + route_w / 2, split_y, M + route_w + 14 + route_w / 2, split_y)
arrow(M + route_w / 2, split_y, M + route_w / 2, route_top + 1)
arrow(M + route_w + 14 + route_w / 2, split_y, M + route_w + 14 + route_w / 2, route_top + 1)
flow_card('TEMPORÁRIA. Volta após o conserto',
          'Mantenha o móvel separado durante o conserto. Depois de reparar e conferir, uma pessoa autorizada usa <b>Desfazer</b> no registro. A quantidade volta ao estoque e o registro aparece como <b>Desfeita</b>.',
          M, route_top, route_w, 116, fill=MINT, accent=TEAL)
flow_card('DEFINITIVA. O móvel inteiro não volta',
          'Devolução ao fornecedor, descarte/perda ou desmontagem para reaproveitar peças. Anote o destino e mantenha a indisponibilidade ativa. Não use <b>Desfazer</b>: o móvel inteiro não volta ao estoque.',
          M + route_w + 14, route_top, route_w, 116, fill=AMBER, accent=colors.HexColor('#B7791F'))
y = note('Atenção ao reaproveitar peças',
         'O registro retira do estoque o móvel inteiro, mas não coloca as peças reaproveitadas no estoque. Peça à pessoa responsável para orientar como registrar essas peças.',
         route_top - 126, fill=PALE)

# 26 - Rotina final
y = base('Consulta rápida', 'Conferência final do estoque', 'Antes de encerrar, confira estes pontos. Se algo não bater, abra o registro da operação.')
for text in [
    'A carga foi conferida com a nota ou, sem nota, com o pedido, a etiqueta da caixa ou a tabela/portfólio do fornecedor.',
    'A nota é da empresa correta e o arquivo XML mostra todos os produtos.',
    'Os itens que entrarão no estoque estão associados corretamente; as demais linhas da nota estão marcadas “Não se aplica”.',
    'As quantidades recebidas correspondem às unidades completas que chegaram.',
    'Custos, descontos, frete e outras despesas foram revisados sem duplicidade.',
    'O recebimento está como Recebido e a entrada aparece no estoque.',
    'As etiquetas foram impressas uma vez por unidade e coladas no volume principal.',
    'Avarias foram comunicadas; só produtos separados foram retirados do estoque.',
]:
    y = check(text, y)
y = para('Se algo der errado', y - 6, size=15, bold=True)
y = table(['O que aconteceu?', 'Onde ir'], [
    ['A nota aparece sem produtos', 'Abra XML incompleto e siga as instruções. Pág. 7.'],
    ['Não sei se crio ou associo um produto', 'Pesquise antes de criar. Págs. 8 a 11.'],
    ['Removi um vínculo e a NF voltou a ficar pendente', 'Confira a lista atualizada e vincule novamente os itens aplicáveis. Pág. 8.'],
    ['Gerar recebimento está bloqueado', 'Leia o motivo e resolva o que falta. Pág. 12.'],
    ['Não sei se o recebimento foi salvo', 'Confira a lista antes de tentar de novo. Pág. 16.'],
    ['Estoque ou produto avariado não confere', 'Revise as movimentações e o fluxo de indisponibilidade. Págs. 24 a 26.'],
], y, widths=[190, TW - 190], size=10)
para('Os números e setas azuis indicam onde clicar. Alguns dados comerciais foram ocultados e os exemplos são fictícios. No aplicativo, a tela pode estar organizada de outro jeito; procure os mesmos nomes de menus e botões.', y, size=9.4, color=MUTED)

scan_image = IMAGES / '20-inventory-scan-demo.png'
render_roteiros_visuais(c, base, shot, scan_image)
used_images.add(scan_image.name)

c.save()
reader = PdfReader(str(OUTPUT))
if len(reader.pages) != 44:
    raise ValueError(f'Paginação inesperada: {len(reader.pages)}')
for index, page in enumerate(reader.pages, 1):
    if not (page.extract_text() or '').strip():
        raise ValueError(f'Página vazia: {index}')
shutil.copyfile(OUTPUT, PUBLIC)
if OUTPUT.read_bytes() != PUBLIC.read_bytes():
    raise ValueError('As cópias do guia não são idênticas.')
(HERE / 'manifesto.json').write_text(json.dumps({
    'paginas': len(reader.pages), 'titulos': pages, 'imagens': sorted(used_images),
    'validacao': 'Paginação, texto, limites de layout e cópias idênticas; revisar renderização final.',
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'paginas': len(reader.pages), 'imagens': len(used_images), 'copias_identicas': True}, ensure_ascii=False))
