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
    c.drawString(M, 23, 'Operação do ERP  |  Edição ilustrada  |  24/10/2026')
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


def check(text, y, x=M, width=TW):
    c.setStrokeColor(TEAL)
    c.setLineWidth(1)
    c.roundRect(x, y - 13, 12, 12, 2, stroke=1, fill=0)
    return para(text, y + 1, x + 23, width - 23, size=10.6, gap=12)


# 01 - Capa
y = base('Comece aqui', escape(GUIDE['title']).replace(' pra o Lucas', '<br/>pra o Lucas'))
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
y = para('Leia na ordem na primeira utilização. Depois, use os capítulos como consulta rápida durante a operação.', y - 4, size=11.4, color=MUTED)
para('Com telas reais, ampliações, setas e exemplos de contagem.<br/>Os menus disponíveis dependem das permissões do seu usuário.', y - 5, size=10.2, color=MUTED)

# 02 - Navegação e mapa
y = base('Mapa do guia', 'Onde encontrar cada operação', 'No aplicativo ou no sistema do computador, abra Estoque. O guia em PDF fica nessa lista.')
shot('00-menu-estoque', y, width=172, max_height=447, x=M, caption='1 NF de entrada  •  2 Recebimentos<br/>3 Abrir o guia em PDF')
xx, ww = M + 195, TW - 195
yy = y
for title, body in [
    ('NF de entrada', 'Localizar a nota, importar o arquivo XML e associar os produtos.'),
    ('Recebimentos', 'Conferir a mercadoria recebida e confirmar a entrada.'),
    ('Pedidos de compra', 'Registrar o que foi comprado; isso ainda não coloca os produtos no estoque.'),
    ('Inventário', 'Contar o estoque físico e revisar diferenças.'),
    ('Movimentações', 'Ver o que aumentou ou diminuiu o estoque e por quê.'),
    ('Indisponibilidades', 'Registrar produtos separados e retirados do estoque.'),
    ('Identificação e Preços', 'Preparar a impressão do tipo de etiqueta correto.'),
    ('Fornecedores', 'Consultar ou manter os cadastros usados nas compras.'),
]:
    yy = para(title, yy, xx, ww, size=10.8, bold=True, gap=2)
    yy = para(body, yy, xx, ww, size=9.7, leading=13.4, gap=9)
y = min(yy, y - 480)
y = table(['Procure por assunto', 'Páginas'], [
    ['Conferência da carga, notas e vínculos', '4 a 11'],
    ['Recebimento, custos e confirmação', '12 a 15'],
    ['Etiquetas e caixas de um mesmo produto', '16 a 18'],
    ['Compras e inventário', '19 a 22'],
    ['Movimentações, indisponibilidades e checklist', '23 a 26'],
], y, widths=[TW - 90, 90], size=9.3)

# 03 - Fluxo de recebimento
y = base('Mapa de operação', 'Siga o caminho da carga', 'Confira a mercadoria primeiro. Depois siga o caminho conforme o documento que veio com ela.')
common_top = y - 2
flow_card('1. CONFERIR A ENTREGA',
          'Compare produtos, modelos, quantidades e caixas com a nota fiscal. Sem nota, use o pedido de compra.',
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
    ('Use a nota ou importe o arquivo', 'Se a nota não aparecer na lista, importe o XML. Se disser XML incompleto, obtenha o arquivo completo pelo Portal SEFAZ.'),
    ('Associe fornecedor e produtos', 'Escolha o fornecedor correto e associe cada item da nota ao produto correspondente.'),
    ('Gere o recebimento', 'Com fornecedor e produtos associados, clique em Gerar recebimento.'),
    ('Confira quantidades e custos', 'Revise o que chegou, o custo, o frete e as outras despesas, sem duplicar valores.'),
    ('Confirme a entrada', 'Use Confirmar recebimento. Só então os produtos entram no estoque. Imprima etiquetas se necessário.'),
]
manual_steps = [
    ('Confira o pedido de compra', 'Compare os produtos e as quantidades que foram combinados.'),
    ('Abra Recebimentos', 'Use o pedido como origem quando houver um. Sem pedido, escolha Sem nota fiscal.'),
    ('Informe o que chegou', 'Selecione o fornecedor e os produtos. Digite as quantidades recebidas.'),
    ('Confira custos e despesas', 'Revise o custo, o frete e as outras despesas, sem duplicar valores.'),
    ('Confirme a entrada', 'Use Confirmar recebimento. Só então os produtos entram no estoque. Imprima etiquetas se necessário.'),
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
y = note('A entrada só acontece ao confirmar o recebimento',
         'A nota fiscal e o pedido ajudam na conferência, mas não colocam os produtos no estoque. Resolva faltas, sobras ou avarias antes de confirmar.',
         note_top, fill=MINT)

# 03 - Chegada
y = base('01 / Conferência física', 'A carga chegou. Por onde começar?', 'Primeiro compare o que chegou com o documento. Depois registre a operação no sistema.')
y = note('Qual documento usar para conferir?', '<b>Com nota fiscal:</b> confira primeiro a nota fiscal eletrônica que veio com a carga (NF-e).<br/><b>Sem nota fiscal:</b> confira o pedido de compra para ver o que foi combinado.', y, fill=MINT)
for n, title, body in [
    (1, 'Separe os documentos da entrega', 'Tenha a nota fiscal e seu arquivo XML, quando disponíveis, ou o pedido de compra. Confira se a entrega é para a empresa.'),
    (2, 'Compare os produtos', 'Confira nome, modelo, medidas, cor e acabamento. Isso ajuda a escolher a versão correta do produto no sistema.'),
    (3, 'Conte unidades completas e confira as caixas', 'Um móvel com três volumes continua sendo uma unidade. Confira todos os volumes de cada unidade e procure faltas ou avarias.'),
    (4, 'Compare quantidades e valores', 'Não registre o que ainda não chegou. Anote faltas, sobras e trocas; avaria só vira indisponibilidade quando a unidade é separada e sai do estoque disponível.'),
    (5, 'Só então siga para o registro', 'Com nota fiscal, localize ou importe a nota, complete o arquivo se necessário e associe os produtos. Sem nota, escolha o caminho do recebimento conforme o pedido.'),
]:
    y = step(n, title, body, y)
y = note('Se algo não estiver conforme', 'Avise a equipe responsável e não confirme quantidades incorretas. Só registre indisponibilidade quando separar a unidade e tirá-la do estoque disponível; veja as páginas 24 e 25.', y, fill=AMBER)

# 04 - Lista de NF
y = base('02 / NF de entrada', 'Localize a nota antes de importar', 'Estoque > NF de entrada. Pesquise e confira o período para evitar duplicar trabalho.')
y = shot('01-nf-entrada', y, max_height=275, caption='1 Importar XML  •  2 Vinculações pendentes  •  3 XML incompleto. Dados comerciais foram ocultados.')
y = table(['O que aparece', 'O que fazer'], [
    ['<b>XML incompleto</b>', 'A nota chegou em resumo, sem os itens. Abra esse rótulo para ver as instruções e importar o arquivo completo.'],
    ['<b>Vinculações Pendentes</b>', 'Abra o rótulo para associar o fornecedor e cada produto ao cadastro correto.'],
    ['<b>Disponível</b>', 'Confira os itens e os vínculos antes de gerar o recebimento. Esse status, sozinho, não significa entrada no saldo.'],
], y, widths=[145, TW - 145], size=10)
y = para('Se a nota não aparecer, confira a busca e amplie o período de emissão. A consulta automática pode trazer apenas um resumo e não substitui a conferência dos documentos da carga.', y, size=10.8)
y = note('Documento correto, empresa correta', 'O sistema aceita apenas notas de entrada destinadas à sua empresa. Notas já registradas não podem ser excluídas. Para completar uma nota, importe o XML da mesma nota.', y, fill=MINT)

# 05 - Importar
y = base('02 / NF de entrada', 'Importe o arquivo XML da nota', 'O XML é o arquivo digital da nota com os dados dos produtos. O DANFE é a versão impressa; foto ou PDF dele não substitui o XML para importar os itens.')
y = shot('02-importar-xml', y, width=TW, max_height=325, caption='1 Escolha ou arraste o arquivo  •  2 Consulta pelo portal, se você ainda precisa obter o XML.')
y = step(1, 'Abra Importar XML da NF-e', 'Para consultar no portal, use o campo Chave de Acesso, o código que identifica a nota. Escanear esse código ajuda na consulta, mas não importa os produtos.', y)
y = step(2, 'Escolha ou arraste o arquivo XML', 'A importação começa ao escolher o arquivo. Aguarde a mensagem do sistema antes de continuar.', y)
y = step(3, 'Confira a mensagem do sistema', 'Nota nova: ela será adicionada. Nota já cadastrada com dados faltando: será completada. XML igual ao já salvo: o sistema avisará que não houve mudança.', y)
y = note('Importar não é receber', 'Depois de importar, abra <b>Gerenciar vínculos</b>. A nota pode estar completa e ainda precisar de fornecedor e produtos vinculados.', y, fill=MINT)

# 06 - XML incompleto
y = base('02 / NF de entrada', 'Apareceu “XML incompleto”?', 'A nota aparece na lista, mas ainda não tem todos os produtos para fazer o recebimento.')
y = shot('03-xml-incompleto', y, max_height=330, caption='1 Consultar no Portal  •  2 Importar o XML completo da mesma nota.')
y = step(1, 'Clique no rótulo XML incompleto', 'A janela explica o problema e mostra o botão Consultar no Portal. A consulta usa a chave da nota.', y)
y = step(2, 'Baixe o XML completo pelo Portal SEFAZ', 'Se o portal liberar o download, salve o arquivo. Se não liberar, peça o XML ao fornecedor ou à pessoa responsável pela documentação.', y)
y = step(3, 'Importe o arquivo nessa janela', 'Arraste o XML ou escolha o arquivo. O sistema completa a nota que já existe. Confira se os produtos apareceram e depois associe fornecedor e produtos.', y)
y = note('Se o Portal SEFAZ não liberar o XML', 'Siga a mensagem do portal e peça ajuda à pessoa responsável. Não repita a consulta para tentar forçar o download.', y, fill=AMBER)

# 07 - Vínculos
y = base('03 / Vínculos', 'Associe a nota aos cadastros corretos', 'No sistema, esta etapa se chama Gerenciar vínculos. Abra Vinculações Pendentes ou os três pontinhos da nota.')
y = shot('04-gerenciar-vinculos', y, max_height=290, caption='Visão geral: 1 fornecedor  •  2 produtos  •  3 gerar recebimento. Os vínculos são salvos automaticamente.')
y = shot('04b-fornecedor', y, max_height=65, caption='Ampliação do campo de fornecedor. Digite pelo menos duas letras para pesquisar.')
y = step(1, 'Associe o fornecedor correto', 'Escolha o cadastro com o mesmo nome da empresa que emitiu a nota. Se não existir, use Novo fornecedor e confira os dados antes de criar.', y)
y = step(2, 'Encontre o produto antes de criar outro', 'Pesquise pelo nome ou código. Confira modelo, cor e medida. Associar um item parecido pode registrar a entrada no produto errado.', y)
y = step(3, 'Aguarde a confirmação do salvamento', 'Os dados são salvos automaticamente. Aguarde “Salvando e confirmando vínculos...” e resolva qualquer aviso antes de continuar.', y)

# 08 - Cadastro direto
y = base('03 / Vínculos', 'Produto novo ou outra versão?', 'Variação é outra versão do mesmo produto, como outra cor ou medida. Se o produto ainda não existe, use Cadastrar na linha da nota.')
y = shot('05-cadastro-rapido', y, max_height=95, caption='Componente real com dados de exemplo: 1 Novo produto simples  •  2 Nova variação de produto existente.')
y = shot('05c-confirmar-categoria', y, max_height=95, caption='1 Escolha a categoria correta  •  2 Confirme a categoria depois de revisá-la.')
y = step(1, 'Escolha Novo produto simples e confira os dados', 'No ERP, confira o custo e o código fiscal do produto (NCM). No app, revise o custo em Estoque e Precificação. Você pode corrigi-lo antes de salvar; fornecedor e unidade vêm da nota.', y)
y = step(2, 'Confira e confirme a categoria', 'A sugestão ajuda na escolha, mas não é salva sem sua confirmação. Se precisar, selecione outra categoria e marque a confirmação correspondente.', y)
y = step(3, 'Conclua e confira a associação', 'No ERP, use Cadastrar e vincular. No app, salve o formulário. Confira se o produto ficou associado à nota; se houver falha, consulte o cadastro antes de repetir. A nota original é preservada.', y)
y = note('O que fica para depois', 'O produto novo começa <b>sem entrada de estoque</b>, com preço de venda ainda a definir e oculto dos catálogos digitais. Revise o cadastro em Produtos quando precisar completar preço, características ou publicação.', y, fill=MINT)
y = note('Se encontrar um cadastro parecido', 'Código do fornecedor ou código de barras (GTIN) já cadastrado bloqueia outra criação e oferece <b>Reutilizar e vincular</b>. Se só o nome for parecido, confira os resultados antes de criar outro produto.', y, fill=AMBER)

# 09 - Seleção certa
y = base('03 / Vínculos', 'Adicionar outra versão do produto', 'Escolha o cadastro principal correto. Uma variação é outra versão do mesmo produto, como uma cor ou medida diferente.')
y = shot('05b-variacao-existente', y, max_height=110, caption='Em Nova variação de produto existente, escolha o produto principal do mesmo fornecedor. Um produto simples pode receber outra variação.')
y = step(1, 'Confira o produto principal', 'O sistema chama esse cadastro de produto pai. A nova versão recebe o custo da nota sem mudar o custo principal. O saldo começa em zero e só aumenta no recebimento. Se ela já existir, escolha-a na busca.', y)
y = step(2, 'Complete o nome da nova versão', 'Informe o que muda, como cor ou medida. Confira se o nome não repete outra versão do mesmo produto.', y)
y = step(3, 'Preencha as características específicas exigidas', 'Confira as características configuradas por variação. Preencha as marcadas como obrigatórias; não é necessário completar características opcionais ou fotos para esta entrada.', y)
y = table(['Se o código fiscal (NCM) da nota for diferente', 'O que acontece'], [
    ['Usar o NCM da NF só na variação', 'Aplica o código da nota só à nova versão e mantém o código fiscal do produto principal.'],
    ['Usar o NCM da NF e atualizar o pai', 'Muda também o código fiscal do produto principal. Confira antes de salvar.'],
    ['Manter o NCM do pai', 'A nova versão continua com o código fiscal do produto principal.'],
], y, widths=[245, TW - 245], size=9.8)
y = note('Mais opções: produto composto', 'Produto composto é um conjunto formado por outros produtos. Abra <b>Mais opções de cadastro</b> &gt; <b>Novo produto composto</b> e escolha pelo menos dois produtos e suas quantidades. Use somente quando o sistema controlar o conjunto dessa forma. Esse cadastro não substitui o recebimento.', y, fill=AMBER)

# 10 - Gerar
y = base('03 / Vínculos', 'Quando Gerar recebimento fica disponível?', 'Se o botão cinza estiver bloqueado, passe o mouse sobre ele. No teclado, pressione Tab até o botão para ler o motivo.')
y = shot('04c-gerar-recebimento', y, max_height=190, width=TW, caption='Neste exemplo falta vincular o fornecedor. O motivo muda conforme a pendência da nota.')
for text in [
    'O arquivo XML da nota está completo e mostra todos os produtos.',
    'O fornecedor está associado ao cadastro correto.',
    'Todos os itens estão associados aos produtos e versões corretos.',
    'O sistema terminou de salvar as associações.',
    'Você tem acesso a Recebimentos e a nota ainda permite gerar a entrada.',
]:
    y = check(text, y)
y = step(1, 'Resolva a pendência indicada', 'Se precisar trocar o fornecedor depois de vincular produtos, confira a orientação da tela e remova os vínculos necessários antes da troca.', y)
y = step(2, 'Clique em Gerar recebimento', 'O formulário abre com fornecedor, itens, quantidades e custos da nota. O atalho também aparece nos três pontinhos quando a nota estiver apta.', y)
y = note('Ainda falta a conferência final', 'Gerar recebimento apenas prepara o formulário. Revise a entrega física e as despesas e use <b>Confirmar recebimento</b> para efetivar a entrada.', y, fill=MINT)

# 11 - Receber caminhos
y = base('04 / Recebimentos', 'Escolha o caminho de recebimento', 'Estoque > Recebimentos > Receber Mercadoria.')
y = shot('06-opcoes-recebimento', y, max_height=220, caption='As três opções separam a origem dos dados. A confirmação final continua sendo feita no recebimento.')
y = step(1, 'Com nota fiscal de entrada', 'Use a nota já registrada. Se fornecedor e produtos já estiverem associados, prefira Gerar recebimento na própria nota.', y)
y = step(2, 'Com pedido de compra', 'Escolha o fornecedor e o pedido desta carga. Confira os itens previstos e ajuste as quantidades para o que chegou.', y)
y = step(3, 'Sem nota ou pedido adequado', 'Informe o fornecedor, os produtos, as quantidades recebidas e os custos disponíveis.', y)
y = note('O pedido não substitui o recebimento', 'Mesmo que o pedido esteja como Atendido ou tenha sido conferido, registre a entrada em Recebimentos.', y, fill=AMBER)

# 12 - Recebimento
y = base('04 / Recebimentos', 'Revise o formulário antes de confirmar', 'Fornecedor, data, produtos, quantidades e custos precisam corresponder à entrega real.')
y = shot('17-recebimento-campos', y, max_height=235, caption='Detalhe do formulário: 1 fornecedor  •  2 data do recebimento. Exemplo vazio, sem gravar uma entrada real.')
y = step(1, 'Confira fornecedor e data de chegada', 'Ao abrir pela nota, confira os dados carregados. Ajuste a data do recebimento para o dia em que a mercadoria chegou, não para a data em que a nota foi emitida.', y)
y = step(2, 'Revise cada produto e a quantidade recebida', 'Confira modelo, cor ou medida, quantidade entregue e custo por unidade. Não registre o que ainda está faltando. No cadastro manual, selecione o fornecedor antes de Adicionar Item.', y)
y = step(3, 'Registre observações e documentos úteis', 'Use as observações para explicar divergências. Anexe pedido, comprovante ou imagem quando ajudarem; a tela aceita até cinco anexos.', y)
y = note('Rascunho não movimenta o estoque', 'Rascunho é um preenchimento ainda não confirmado. Continue a revisão e confirme quando os dados estiverem corretos. Não crie outro recebimento só porque já existe um rascunho.', y, fill=MINT)

# 13 - Custos
y = base('04 / Custos', 'Frete e despesas: confira sem duplicar', 'A entrega pode ter custos fora da NF-e, como uma transportadora cobrada separadamente.')
y = shot('18-custos-recebimento', y, max_height=270, caption='1 Desconto  •  2 Frete  •  3 Outras despesas. Selecione % ou R$ conforme o valor informado.')
y = para('<b>Confira o que já veio da nota</b> antes de acrescentar valores. Informe apenas o frete à parte, desconto ou despesa que ainda falta considerar. Depois revise <b>Custo unitário final</b>, <b>Total do item final</b> e <b>Total final</b>.', y, size=10.6)
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
    (1, 'Faça a última conferência', 'Confira fornecedor, produtos, quantidades e valor final. Veja se a mesma entrega já não foi registrada.'),
    (2, 'Use Confirmar recebimento e aguarde', 'Clique uma vez e espere a mensagem do sistema. Não feche a tela durante a confirmação.'),
    (3, 'Confira o status Recebido', 'Encontre o recebimento na lista e veja se está como Recebido. A nota também aparece como recebida quando todos os itens esperados dão entrada.'),
    (4, 'Confira a movimentação gerada', 'Em Movimentações, localize o produto e o período. A entrada deve corresponder ao recebimento confirmado.'),
]:
    y = step(n, title, body, y)
y = table(['Se acontecer...', 'Como agir'], [
    ['Não apareceu mensagem de sucesso ou erro', 'Confira a lista de recebimentos antes de tentar de novo. A entrada pode já ter sido registrada.'],
    ['Recebimento confirmado com erro', 'Peça ajuda a um usuário autorizado. Estornar Recebimento reverte a entrada e só deve ser usado após conferir a situação real.'],
    ['Preciso usar Duplicar recebimento', 'Use para uma nova entrega. Duplicar e confirmar a mesma entrega aumenta o estoque duas vezes.'],
], y, widths=[180, TW - 180], size=10)

# 15 - Etiquetas
y = base('05 / Etiquetas', 'Escolha por onde imprimir as etiquetas', 'Use só a nota ou o recebimento para identificar as mesmas unidades.')
y = shot('16-menus-de-acoes', y, max_height=267, caption='Menus reais com exemplo didático: 2 etiquetas pela NF-e  •  3 etiquetas pelo recebimento concluído. A opção 1 prepara o recebimento pela NF-e.')
y = step(1, 'Pela nota fiscal', 'Com o fornecedor e todos os produtos vinculados, abra os três pontinhos e escolha Imprimir etiquetas de identificação.', y)
y = step(2, 'Pelo recebimento', 'Com o recebimento concluído e no status Recebido, abra os três pontinhos e escolha a mesma ação. Em rascunho ou estornado, a impressão fica desativada.', y)
y = note('Identificação e preço têm usos diferentes', 'A etiqueta de identificação acompanha a unidade física. A etiqueta de preço serve à exposição e à venda. Não use uma etiqueta de preço para contar o estoque.', y, fill=MINT)

# 16 - Preparar etiquetas
y = base('05 / Etiquetas', 'Confira a seleção antes de imprimir', 'A janela mostra os produtos associados e as quantidades. Revise antes de imprimir.')
y = shot('15-selecionar-etiquetas', y, max_height=310, caption='1 Confira a quantidade de cada produto  •  2 Imprimir Etiquetas abre a preparação da impressão. Dados fictícios de exemplo.')
y = step(1, 'Confira o produto e a quantidade', 'A etiqueta usa o nome e os dados do produto cadastrado no sistema, não a descrição da nota. A quantidade deve ser igual ao número de unidades que você vai identificar.', y)
y = step(2, 'Confira o modelo e a prévia', 'Use Imprimir Etiquetas para preparar o arquivo. Revise o modelo e a posição das etiquetas na folha antes de imprimir.', y)
y = step(3, 'Imprima e confira cada etiqueta', 'Confira o produto escrito na etiqueta antes de colar. Cada móvel precisa de uma identificação, mesmo que tenha várias caixas.', y)
y = note('Evite duas etiquetas para o mesmo móvel', 'Cada impressão cria uma nova identificação. Não imprima os mesmos itens pela nota e pelo recebimento. Para substituir uma etiqueta, peça orientação para não deixar duas etiquetas ativas no mesmo móvel.', y, fill=AMBER)

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
y = note('Etiquetas por volume ainda não fazem parte desta rotina', 'A quantidade de caixas pode mudar na fábrica. Uma solução futura precisará garantir que os volumes de uma mesma unidade compartilhem a mesma identificação e contem apenas uma unidade.', y, fill=AMBER)

# 17 - Compras
y = base('06 / Compras', 'Pedido de compra registra o combinado', 'Estoque > Pedidos de compra > Nova Compra. Use o pedido para lembrar o que foi comprado e conferir a entrega.')
y = shot('09-pedido-compra', y, max_height=285, caption='Tela real do pedido: fornecedor, data, impostos/despesas, anexos e itens. Confirmar Pedido não recebe mercadoria.')
y = step(1, 'Selecione o fornecedor e a data', 'Escolha o fornecedor correto antes dos itens. Para trocar de fornecedor depois, a tela pode exigir remover os itens do pedido.', y)
y = step(2, 'Adicione produtos, quantidades e custos previstos', 'Em Adicionar Item, selecione produto ou variação, informe Qtd e Custo unitário e use Adicionar. Confira despesas e anexos úteis.', y)
y = step(3, 'Use Confirmar Pedido', 'O pedido registra a compra prevista. Acompanhe Em Ordem, Atendido ou Cancelado conforme a operação.', y)
y = note('Conferir Pedido também não dá entrada', 'Essa conferência compara o pedido, a nota e o que chegou, e pode mostrar diferenças. Depois, registre a entrada em Recebimentos. O estoque não aumenta só porque o pedido ficou Atendido.', y, fill=AMBER)

# 18 - Inventário inicial
y = base('07 / Inventário', 'Defina o que será contado', 'Estoque > Inventário > Novo inventário. Escolha os produtos que entram na contagem antes de começar.')
y = shot('10-inventario-escopo', y, max_height=180, caption='1 Estoque completo em etapas por fornecedor  •  2 Seleção personalizada de produtos ou variações.')
y = shot('11-inventario-responsavel', y, max_height=120, caption='Pesquise o nome e escolha uma pessoa autorizada. A lista pode ser atualizada no app quando houver internet.')
y = step(1, 'Escolha quais produtos contar', 'Estoque Completo organiza a contagem por fornecedor. Seleção Personalizada permite escolher os produtos que precisam ser contados.', y)
y = step(2, 'Escolha quem vai fazer a contagem', 'Digite pelo menos duas letras do nome, escolha uma pessoa da lista e confira. Atualize a lista com internet usando Tentar sincronizar lista. Se continuar vazia, peça à equipe responsável para conferir o acesso dessa pessoa.', y)
y = step(3, 'Use Confirmar e Iniciar', 'No inventário por etapas, abra Iniciar ou Continuar na etapa do fornecedor correto. Na seleção personalizada, adicione os itens que pertencem à contagem.', y)
y = note('Duplicar inventário', 'Combine com a equipe para não contar duas vezes. Confira fornecedor e local. Ao duplicar, revise os produtos, quantidades e responsável; a contagem e as etiquetas antigas não são copiadas. Atualize a lista se faltar produto.', y, fill=MINT)

# 19 - Contagem
y = base('07 / Inventário', 'Conte os produtos que encontrou', 'Digite a quantidade real de cada produto ou leia suas etiquetas de identificação, quando disponíveis.')
y = shot('14-contagem-manual', y, max_height=315, caption='Exemplo didático: 1 filtros  •  2 quantidade contada  •  3 zero  •  4 campo vazio. Os dados não são de uma contagem real.')
y = table(['Campo Contado', 'Significado'], [
    ['<b>4</b>', 'Você contou quatro unidades do produto completo.'],
    ['<b>0</b>', 'Você contou e não encontrou nenhuma unidade. Pode gerar ajuste para zero após a revisão.'],
    ['<b>Vazio</b>', 'Este item ainda não foi contado. Não equivale a zero e o saldo não deve ser zerado por isso.'],
], y, widths=[130, TW - 130], size=10.2)
y = note('Leitura do QR Code', 'Cada etiqueta lida acrescenta uma unidade. Não leia a mesma etiqueta duas vezes. Se ela não estiver na lista da contagem, pare e confira. Leia uma etiqueta por móvel, não uma por caixa.', y, fill=MINT)

# 20 - Revisão inventário
y = base('07 / Inventário', 'Revise as diferenças antes de concluir', 'Compare Esperado (saldo no sistema), Contado (quantidade encontrada) e Ajuste (diferença que será aplicada). Reconte o que parecer errado.')
y = table(['Exemplo', 'Esperado', 'Contado', 'Ajuste'], [
    ['Guarda-roupa', '5', '4', '-1 unidade'],
    ['Mesa', '3', '0', '-3 unidades'],
    ['Cômoda não contada', '2', 'Vazio', 'Sem ajuste'],
], y, widths=[205, 90, 90, TW - 385], size=10.5)
y = para('Os números são exemplos. O sistema considera as entradas e saídas feitas durante a contagem; confira a revisão atual, não só o saldo que aparecia no começo.', y, size=11)
y = step(1, 'Reconte o que estiver diferente', 'Confira se o produto está em outro local, se houve entrada ou saída durante a contagem e se todas as caixas desse móvel foram verificadas.', y)
y = step(2, 'Volte à contagem se precisar corrigir', 'Use Voltar para contagem quando encontrar erro. Não conclua um ajuste apenas para eliminar a pendência da tela.', y)
y = step(3, 'Conclua depois da revisão', 'Só pessoas autorizadas podem finalizar inventários. Se o botão estiver indisponível, peça ajuda a um Gestor ou Estoquista autorizado. Aguarde a mensagem de sucesso e confira o status.', y)
y = table(['Status ou ação', 'O que significa na rotina'], [
    ['Em andamento / Continuar inventário', 'A contagem pode ser retomada. Se fechar a tela, continue o mesmo inventário no aparelho.'],
    ['Aguardando envio / Retomar envio', 'Se aparecer “Confirmação pendente”, abra o mesmo inventário e espere a confirmação. Não comece outra contagem.'],
    ['Concluído / Ver detalhes', 'Consulte o resultado. Se precisar desfazer algo, peça ajuda a uma pessoa autorizada.'],
], y, widths=[190, TW - 190], size=10)

# 21 - Histórico
y = base('08 / Consulta do saldo', 'Descubra o que mudou no estoque', 'Estoque > Movimentações. Consulte quais operações aumentaram ou diminuíram o estoque.')
y = shot('13-movimentacoes', y, max_height=200, caption='1 Buscar produto  •  2 Período. As descrições das operações foram ocultadas na imagem.')
y = step(1, 'Pesquise o produto', 'Use Buscar produto e escolha o item correto. Ajuste o período: uma entrada antiga pode não aparecer no mês atual.', y)
y = step(2, 'Confira a quantidade e o resultado', 'Efetivada significa que a mudança foi registrada. Estornada significa que ela foi desfeita. Confira qual operação gerou a mudança.', y)
y = table(['Tipo', 'Como interpretar'], [
    ['Entrada', 'Acrescenta unidades ao saldo conforme a operação de origem.'],
    ['Saída', 'Retira unidades do saldo conforme a operação de origem.'],
    ['Ajuste', 'Corrige a quantidade do estoque, por exemplo, após uma contagem.'],
], y, widths=[110, TW - 110], size=10.6)
y = note('Confira onde a mudança começou', 'Se a mudança veio de um recebimento, abra esse recebimento. Se veio de inventário ou indisponibilidade, abra esse registro. A lista de Produtos não serve para corrigir o estoque diretamente. Em produto composto, confira também os produtos que formam o conjunto.', y, fill=MINT)

# 24 - Avarias e indisponibilidades
y = base('09 / Indisponibilidades', 'Registre só o que sai do estoque', 'Avaria, por si só, não é indisponibilidade. Use o registro quando separar a unidade e ela deixar de estar disponível para venda ou uso.')
y = shot('12-indisponibilidade', y, max_height=270, caption='1 Produto e variação  •  2 Quantidade  •  3 Motivo e tratativa  •  4 Registrar.')
y = step(1, 'Veja se a unidade ficará fora do estoque', 'Se ela continuar disponível para venda ou uso, não registre indisponibilidade. Avise o responsável e siga a orientação da equipe.', y)
y = step(2, 'Separe o produto e informe a quantidade', 'Escolha o produto e a versão correta. Informe quantas unidades estão sendo retiradas do estoque.', y)
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
    'A carga foi conferida com a nota ou, sem nota, com o pedido de compra.',
    'A nota é da empresa correta e o arquivo XML mostra todos os produtos.',
    'O fornecedor e todos os produtos estão associados corretamente à nota.',
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
    ['Não sei se crio ou associo um produto', 'Pesquise antes de criar. Págs. 8 a 10.'],
    ['Gerar recebimento está bloqueado', 'Leia o motivo e resolva o que falta. Pág. 11.'],
    ['Não sei se o recebimento foi salvo', 'Confira a lista antes de tentar de novo. Pág. 15.'],
    ['Estoque ou produto avariado não confere', 'Revise as movimentações e o fluxo de indisponibilidade. Págs. 23 a 25.'],
], y, widths=[190, TW - 190], size=10)
para('Os números e setas azuis indicam onde clicar. Alguns dados comerciais foram ocultados e os exemplos são fictícios. No aplicativo, a tela pode estar organizada de outro jeito; procure os mesmos nomes de menus e botões.', y, size=9.4, color=MUTED)

c.save()
reader = PdfReader(str(OUTPUT))
if len(reader.pages) != 26:
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
