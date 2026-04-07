#!/usr/bin/env python3
"""Генерация PDF-инструкции по оценке закупки (CSI Feedback) — компактная версия на 1 страницу."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
import os

# --- Colors ---
BLUE_PRIMARY = HexColor('#1E40AF')
BLUE_LIGHT = HexColor('#DBEAFE')
BLUE_MEDIUM = HexColor('#3B82F6')
GRAY_TEXT = HexColor('#374151')
GRAY_LIGHT = HexColor('#F3F4F6')
GRAY_BORDER = HexColor('#D1D5DB')
WHITE = HexColor('#FFFFFF')

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'CSI_Instruction.pdf')


def register_fonts():
    font_paths = [
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
    ]
    bold_paths = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/Library/Fonts/Arial Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    ]
    registered = False
    for path in font_paths:
        if os.path.exists(path):
            try:
                if path.endswith('.ttc'):
                    pdfmetrics.registerFont(TTFont('CustomFont', path, subfontIndex=0))
                else:
                    pdfmetrics.registerFont(TTFont('CustomFont', path))
                registered = True
                break
            except Exception:
                continue
    if not registered:
        return 'Helvetica'

    # Register bold variant
    bold_registered = False
    for path in bold_paths:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('CustomFont-Bold', path))
                bold_registered = True
                break
            except Exception:
                continue
    if not bold_registered:
        # Fallback: use same font as bold
        for path in font_paths:
            if os.path.exists(path):
                try:
                    if path.endswith('.ttc'):
                        pdfmetrics.registerFont(TTFont('CustomFont-Bold', path, subfontIndex=0))
                    else:
                        pdfmetrics.registerFont(TTFont('CustomFont-Bold', path))
                    break
                except Exception:
                    continue

    addMapping('CustomFont', 0, 0, 'CustomFont')       # normal
    addMapping('CustomFont', 1, 0, 'CustomFont-Bold')   # bold

    return 'CustomFont'


def create_styles(font_name):
    styles = {}
    styles['title'] = ParagraphStyle(
        'Title', fontName=font_name, fontSize=16, leading=18,
        alignment=TA_CENTER, textColor=BLUE_PRIMARY, spaceAfter=2,
    )
    styles['subtitle'] = ParagraphStyle(
        'Subtitle', fontName=font_name, fontSize=8, leading=10,
        alignment=TA_CENTER, textColor=GRAY_TEXT, spaceAfter=4,
    )
    styles['heading'] = ParagraphStyle(
        'Heading', fontName=font_name, fontSize=10, leading=12,
        textColor=BLUE_PRIMARY, spaceBefore=6, spaceAfter=2,
    )
    styles['body'] = ParagraphStyle(
        'Body', fontName=font_name, fontSize=8, leading=10,
        textColor=GRAY_TEXT, alignment=TA_JUSTIFY, spaceAfter=2,
    )
    styles['body_center'] = ParagraphStyle(
        'BodyCenter', fontName=font_name, fontSize=8, leading=10,
        textColor=GRAY_TEXT, alignment=TA_CENTER, spaceAfter=0,
    )
    styles['bullet'] = ParagraphStyle(
        'Bullet', fontName=font_name, fontSize=8, leading=10,
        textColor=GRAY_TEXT, leftIndent=10, spaceAfter=1,
    )
    styles['q_title'] = ParagraphStyle(
        'QTitle', fontName=font_name, fontSize=8, leading=10,
        textColor=HexColor('#1F2937'), spaceAfter=0,
    )
    styles['q_desc'] = ParagraphStyle(
        'QDesc', fontName=font_name, fontSize=7, leading=9,
        textColor=HexColor('#6B7280'), leftIndent=0, spaceAfter=0,
    )
    styles['note'] = ParagraphStyle(
        'Note', fontName=font_name, fontSize=7, leading=9,
        textColor=HexColor('#6B7280'), spaceAfter=1,
    )
    styles['footer'] = ParagraphStyle(
        'Footer', fontName=font_name, fontSize=7, leading=9,
        textColor=HexColor('#9CA3AF'), alignment=TA_CENTER,
    )
    return styles


def build_pdf():
    font_name = register_fonts()
    styles = create_styles(font_name)

    doc = SimpleDocTemplate(
        OUTPUT_PATH, pagesize=A4,
        leftMargin=1.2 * cm, rightMargin=1.2 * cm,
        topMargin=0.8 * cm, bottomMargin=0.8 * cm,
    )

    story = []

    # === HEADER ===
    story.append(Paragraph('Инструкция по оценке закупки', styles['title']))
    story.append(Paragraph('CSI Feedback — Опрос удовлетворённости заказчика', styles['subtitle']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=BLUE_MEDIUM, spaceAfter=4, spaceBefore=2))

    # === SECTION 1 ===
    story.append(Paragraph('1. О чём этот опрос', styles['heading']))
    story.append(Paragraph(
        'После завершения закупки вам на почту приходит письмо с приглашением оценить качество проведённой закупки. '
        'Опрос помогает улучшить процессы закупок.',
        styles['body']
    ))

    # Highlight box — scope of survey
    scope_data = [[Paragraph(
        '<b>Важно:</b> Данный опрос оценивает именно процесс закупки — от подачи заявки до подписания договора. '
        'Он не включает в себя оценку поставки товаров, работ и услуг.',
        styles['body']
    )]]
    scope_table = Table(scope_data, colWidths=[doc.width - 0.5 * cm])
    scope_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#FEF3C7')),
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#F59E0B')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Spacer(1, 3))
    story.append(scope_table)

    # === SECTION 2 ===
    story.append(Paragraph('2. Как открыть форму оценки', styles['heading']))
    story.append(Paragraph(
        '<b>1.</b> Откройте письмо «Оценка закупки» от uzProc. '
        '<b>2.</b> Нажмите на ссылку — откроется форма в браузере. '
        '<b>3.</b> В шапке формы — номер заявки, предмет, бюджет и закупщик.',
        styles['body']
    ))

    # === SECTION 3: Вопросы ===
    story.append(Paragraph('3. Вопросы опроса (3 обязательных + 1 дополнительный)', styles['heading']))

    # Build compact questions as a single table
    col_w = doc.width - 0.5 * cm
    questions = [
        ('Вопрос 1 (обязат.)', 'Скорость проведения закупки',
         'Оцените, насколько быстро была проведена закупка — от подачи заявки до заключения договора. '
         'Учитывайте, что срок зависит от сложности закупки (по Регламенту): '
         'Сложность 2 — 7 р.д., Сложность 3 — 15 р.д., Сложность 4 — договорная. '
         'Срок закупки может быть гарантирован, если закупка была в Плане закупок.'),
        ('Вопрос 2 (обязат.)', 'Качество результата',
         'Оцените качество итогового результата: соответствие ТЗ, выбранный поставщик, условия договора.'),
        ('Вопрос 3 (обязат.)', 'Работа закупщика (коммуникация и бизнес-ориентированность)',
         'Оцените работу закупщика: коммуникация, ориентированность на ваши потребности, помощь в решении вопросов.'),
        ('Вопрос 4 (доп.)', 'Пользовались ли вы системой uzProc?',
         'Выберите «Да»/«Нет». При «Да» — оцените удобство системы. При «Нет» — доп. оценка не нужна.'),
    ]

    q_data = []
    for label, title, desc in questions:
        q_data.append([
            Paragraph(f'<b>{label}</b>', styles['q_title']),
            Paragraph(f'<b>{title}</b>', styles['q_title']),
            Paragraph(desc, styles['q_desc']),
        ])

    q_table = Table(q_data, colWidths=[2.8 * cm, 5.5 * cm, col_w - 8.3 * cm])
    q_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, GRAY_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(q_table)

    story.append(Paragraph(
        'Шкала для всех вопросов: от 0.5 до 5.0 (с шагом 0.5). Наведите курсор на звёзды — можно выбрать половину.',
        styles['note']
    ))

    # === SECTION 4: Шкала ===
    story.append(Paragraph('4. Шкала оценки', styles['heading']))

    scale_data = [
        [Paragraph('<b>Оценка</b>', styles['body_center']),
         Paragraph('<b>Значение</b>', styles['body_center'])],
        [Paragraph('5.0', styles['body_center']),
         Paragraph('Отлично', styles['body_center'])],
        [Paragraph('4.0–4.5', styles['body_center']),
         Paragraph('Хорошо', styles['body_center'])],
        [Paragraph('3.0–3.5', styles['body_center']),
         Paragraph('Удовлетворительно', styles['body_center'])],
        [Paragraph('2.0–2.5', styles['body_center']),
         Paragraph('Ниже ожиданий', styles['body_center'])],
        [Paragraph('0.5–1.5', styles['body_center']),
         Paragraph('Неудовлетворительно', styles['body_center'])],
    ]
    scale_table = Table(scale_data, colWidths=[3.5 * cm, 5 * cm])
    scale_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ('BACKGROUND', (0, 1), (-1, 1), HexColor('#F0FDF4')),
        ('BACKGROUND', (0, 2), (-1, 2), HexColor('#ECFDF5')),
        ('BACKGROUND', (0, 3), (-1, 3), HexColor('#FFFBEB')),
        ('BACKGROUND', (0, 4), (-1, 4), HexColor('#FEF3C7')),
        ('BACKGROUND', (0, 5), (-1, 5), HexColor('#FEE2E2')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(scale_table)

    # === SECTION 5: Комментарий ===
    story.append(Paragraph('5. Комментарий (необязательно)', styles['heading']))
    story.append(Paragraph(
        'Внизу формы есть поле «Опишите, чтобы мы могли улучшить» — оставьте пожелания или замечания.',
        styles['body']
    ))

    # Warning box
    warn_data = [[Paragraph(
        '<b>Важно:</b> Оценку можно отправить только один раз. После отправки изменить оценку невозможно.',
        styles['body']
    )]]
    warn_table = Table(warn_data, colWidths=[doc.width - 0.5 * cm])
    warn_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#FEF3C7')),
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#F59E0B')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Spacer(1, 3))
    story.append(warn_table)

    # === FOOTER ===
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=0.5, color=GRAY_BORDER, spaceAfter=3))
    story.append(Paragraph('uzProc — Система управления закупками | По вопросам обращайтесь к команде закупок', styles['footer']))

    doc.build(story)
    print(f'PDF создан: {OUTPUT_PATH}')


if __name__ == '__main__':
    build_pdf()
