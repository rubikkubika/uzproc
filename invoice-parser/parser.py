"""Парсер узбекских счёт-фактур Didox.uz из PDF."""

import logging
import re
from pathlib import Path
from typing import Optional, Union

import pdfplumber

from models import Invoice, InvoiceItem, Party, Signature, Signatures, Totals

logger = logging.getLogger(__name__)


def _parse_number(text: str) -> Optional[float]:
    """Парсит число из строки вида '9 910 714.29' → 9910714.29."""
    if not text:
        return None
    cleaned = text.replace(" ", "").replace("\xa0", "").replace(",", ".")
    cleaned = re.sub(r"[^\d.]", "", cleaned)
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _format_date(date_str: str) -> Optional[str]:
    """Конвертирует дату из DD.MM.YYYY → YYYY-MM-DD."""
    if not date_str:
        return None
    m = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", date_str.strip())
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return date_str


def _format_datetime(dt_str: str) -> Optional[str]:
    """Конвертирует datetime из YYYY.MM.DD HH:MM:SS → YYYY-MM-DDTHH:MM:SS."""
    if not dt_str:
        return None
    m = re.match(r"(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}:\d{2}:\d{2})", dt_str.strip())
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}T{m.group(4)}"
    return dt_str


def _extract_text(pdf_path: Union[str, Path]) -> str:
    """Извлекает весь текст из PDF."""
    text_parts = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return "\n".join(text_parts)


def _extract_tables(pdf_path: Union[str, Path]) -> list[list[list[Optional[str]]]]:
    """Извлекает таблицы из PDF."""
    tables = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            if page_tables:
                tables.extend(page_tables)
    return tables


def _find(pattern: str, text: str, group: int = 1, flags: int = 0) -> Optional[str]:
    """Ищет regex-паттерн, возвращает группу или None."""
    m = re.search(pattern, text, flags)
    if m:
        return m.group(group).strip()
    return None


def _parse_header(text: str) -> dict:
    """Парсит заголовок: тип документа, номер, дата, договор."""
    result = {}

    # Тип документа
    doc_type = _find(r"(Счет-фактура|Счёт-фактура)", text, flags=re.IGNORECASE)
    result["document_type"] = doc_type or "Счёт-фактура"

    # Номер и дата: "№ 41 от 11.03.2026"
    m = re.search(r"№\s*(\S+)\s+от\s+(\d{2}\.\d{2}\.\d{4})", text)
    if m:
        result["number"] = m.group(1)
        result["date"] = _format_date(m.group(2))

    # Договор: "к договору № 31-2024 от 23.10.2024"
    m = re.search(r"к\s+договору\s+№\s*(\S+)\s+от\s+(\d{2}\.\d{2}\.\d{4})", text)
    if m:
        result["contract_number"] = m.group(1)
        result["contract_date"] = _format_date(m.group(2))

    return result


def _parse_ids(text: str) -> dict:
    """Парсит ID документов Didox и Rouming."""
    result = {}
    result["didox_id"] = _find(r"ID\s+документа\s*\(Didox\.uz\):\s*(\S+)", text)
    result["rouming_id"] = _find(r"ID\s+документа\s*\(Rouming\.uz\):\s*(\S+)", text)
    return result


def _parse_risk_level(text: str) -> Optional[str]:
    """Парсит уровень риска."""
    return _find(r"Уровень\s+риска:\s*(\S+)", text)


def _parse_supplier(text: str) -> Party:
    """Парсит данные поставщика."""
    # Имя поставщика: текст между "Поставщик:" и "Покупатель:"
    name = _find(r'Поставщик:\s*(.+?)(?:\s+Покупатель:)', text)

    # Адрес — строки между "Адрес:" (поставщика) и "Адрес:" (покупателя)
    # Структура: "Адрес: <supplier_addr> Адрес: <buyer_addr>"
    # Берём первый адрес
    address = None
    addr_m = re.search(
        r'Адрес:\s*(.+?)(?:\s+Адрес:)',
        text, re.DOTALL
    )
    if addr_m:
        # Убираем переносы строк, нормализуем пробелы
        addr_raw = addr_m.group(1).strip()
        addr_raw = re.sub(r'\s+', ' ', addr_raw)
        address = addr_raw

    # ИНН поставщика
    inn = None
    inn_m = re.search(r'Идентификационный\s+номер\s+(\d{9,})\s+Идентификационный', text)
    if inn_m:
        inn = inn_m.group(1)
    else:
        inn_m = re.search(r'поставщика\s*\(ИНН\):\s*(\d+)', text)
        if inn_m:
            inn = inn_m.group(1)

    # НДС регистрация поставщика
    vat_reg = None
    vat_status = None
    vat_m = re.search(r'Регистрационный\s+код\s+(\d+)\s*\(сертификат\s+(\w+)\)', text)
    if vat_m:
        vat_reg = vat_m.group(1)
        vat_status = vat_m.group(2)

    # Р/С и МФО — первое вхождение
    bank = _find(r'Р/С:\s*(\d+)', text)
    mfo = _find(r'МФО:\s*(\d+)', text)

    # Руководитель поставщика
    director = _find(r'Руководитель:\s*(.+?)(?:\s+Руководитель:)', text)

    return Party(
        name=name,
        address=address,
        inn=inn,
        vat_registration=vat_reg,
        vat_status=vat_status,
        bank_account=bank,
        mfo=mfo,
        director=director,
    )


def _parse_buyer(text: str) -> Party:
    """Парсит данные покупателя."""
    # Имя покупателя
    name = _find(r'Покупатель:\s*(.+?)$', text, flags=re.MULTILINE)

    # Адрес покупателя — после второго "Адрес:"
    address = None
    addr_parts = re.split(r'Адрес:', text)
    if len(addr_parts) >= 3:
        # Третий кусок — адрес покупателя до следующего поля
        addr_raw = addr_parts[2]
        # Берём до "Идентификационный"
        addr_raw = re.split(r'Идентификационный', addr_raw)[0].strip()
        addr_raw = re.sub(r'\s+', ' ', addr_raw)
        address = addr_raw

    # ИНН покупателя
    inn = None
    inn_m = re.search(r'Идентификационный\s+номер\s+\d+\s+Идентификационный\s+номер\s+(\d+)', text)
    if inn_m:
        inn = inn_m.group(1)
    else:
        inn_m = re.search(r'покупателя\s*\(ИНН\):\s*(\d+)', text)
        if inn_m:
            inn = inn_m.group(1)

    # НДС — второе вхождение
    vat_reg = None
    vat_status = None
    vat_matches = list(re.finditer(r'Регистрационный\s+код\s+(\d+)\s*\(сертификат\s+(\w+)\)', text))
    if len(vat_matches) >= 2:
        vat_reg = vat_matches[1].group(1)
        vat_status = vat_matches[1].group(2)

    # Р/С и МФО — второе вхождение
    bank_matches = list(re.finditer(r'Р/С:\s*(\d+)', text))
    mfo_matches = list(re.finditer(r'МФО:\s*(\d+)', text))
    bank = bank_matches[1].group(1) if len(bank_matches) >= 2 else None
    mfo = mfo_matches[1].group(1) if len(mfo_matches) >= 2 else None

    # Руководитель покупателя — второй "Руководитель:" на той же строке
    dir_m = re.search(r'Руководитель:.*?Руководитель:\s*(.+?)$', text, re.MULTILINE)
    director = dir_m.group(1).strip() if dir_m else None

    # Главный бухгалтер покупателя — второй "Главный бухгалтер:" на той же строке
    acc_m = re.search(r'Главный\s+бухгалтер:.*?Главный\s+бухгалтер:\s*(.+?)$', text, re.MULTILINE)
    accountant = None
    if acc_m:
        val = acc_m.group(1).strip()
        if val:
            accountant = val

    return Party(
        name=name,
        address=address,
        inn=inn,
        vat_registration=vat_reg,
        vat_status=vat_status,
        bank_account=bank,
        mfo=mfo,
        director=director,
        accountant=accountant,
    )


def _parse_items_from_table(tables: list) -> list[InvoiceItem]:
    """Парсит позиции из таблицы PDF."""
    items = []

    if not tables:
        return items

    table = tables[0]  # Первая (и обычно единственная) таблица

    # Ищем строки с данными — они начинаются с числового индекса
    for row in table:
        if not row or not row[0]:
            continue
        first_cell = str(row[0]).strip()
        # Пропускаем заголовки, нумерацию колонок, "Итого"
        if not first_cell.isdigit():
            continue
        idx = int(first_cell)
        # Строка нумерации колонок (1, 2, 3...) — пропускаем
        if len(row) >= 10 and row[1] and str(row[1]).strip().isdigit():
            continue

        # Колонки: 0=№, 1=Наименование, 2=Код каталога, 3=Ед.изм, 4=Кол-во,
        # 5=Цена, 6=Стоимость, 7=Ставка НДС, 8=Сумма НДС, 9=Итого с НДС, 10=Происхождение
        name = str(row[1]).strip() if row[1] else None

        catalog_code = None
        catalog_name = None
        if row[2]:
            cat_text = str(row[2]).strip()
            cat_m = re.match(r'(\d+)\s*-\s*(.+)', cat_text, re.DOTALL)
            if cat_m:
                catalog_code = cat_m.group(1).strip()
                catalog_name = re.sub(r'\s+', ' ', cat_m.group(2).strip())

        unit = str(row[3]).strip() if row[3] else None
        quantity = _parse_number(str(row[4])) if row[4] else None
        price = _parse_number(str(row[5])) if row[5] else None
        subtotal = _parse_number(str(row[6])) if row[6] else None

        vat_rate = None
        if row[7]:
            rate_str = str(row[7]).replace("%", "").strip()
            if rate_str.isdigit():
                vat_rate = int(rate_str)

        vat_amount = _parse_number(str(row[8])) if row[8] else None
        total = _parse_number(str(row[9])) if row[9] else None
        origin = str(row[10]).strip() if len(row) > 10 and row[10] else None

        items.append(InvoiceItem(
            index=idx,
            name=name,
            catalog_code=catalog_code,
            catalog_name=catalog_name,
            unit=unit,
            quantity=quantity,
            price=price,
            subtotal=subtotal,
            vat_rate=vat_rate,
            vat_amount=vat_amount,
            total=total,
            origin=origin,
        ))

    return items


def _parse_totals(text: str, tables: list) -> Totals:
    """Парсит итоговые суммы."""
    subtotal = None
    vat_amount = None
    total = None
    total_text = None

    # Из таблицы — строка "Итого"
    if tables:
        for row in tables[0]:
            if row and row[0] and "Итого" in str(row[0]):
                subtotal = _parse_number(str(row[6])) if row[6] else None
                # НДС сумма может быть в row[7] или row[8]
                if row[7]:
                    vat_amount = _parse_number(str(row[7]))
                if row[9]:
                    total = _parse_number(str(row[9]))
                break

    # Текст "Всего к оплате:"
    total_text_m = re.search(
        r'Всего\s+к\s+оплате:\s*(.+?)\s*\.\s*в\s+т\.\s*ч\.\s*НДС:',
        text
    )
    if total_text_m:
        total_text = total_text_m.group(1).strip()

    # НДС из текста (запасной вариант)
    if vat_amount is None:
        vat_text = _find(r'в\s+т\.\s*ч\.\s*НДС:\s*([\d\s]+\.?\d*)', text)
        if vat_text:
            vat_amount = _parse_number(vat_text)

    return Totals(
        subtotal=subtotal,
        vat_amount=vat_amount,
        total=total,
        total_text=total_text,
    )


def _parse_signatures(text: str) -> Signatures:
    """Парсит электронные подписи.

    Текст подписей идёт в формате (оба на одних строках):
      №2018443112 2026.03.11 22:11:50 №2027473068 2026.03.16 16:19:29
      ОТПРАВЛЕНО ПОДТВЕРЖДЁН
      JALILOV SHOVKAT ... BENZORUK DMITRIY ...
      Оператор: didox.uz Оператор: didox.uz
      IP: 82.215.91.213 IP: 94.141.76.167
    """
    sent = None
    confirmed = None

    # Номера и даты подписей
    nums_m = re.search(
        r'№(\d+)\s+(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})\s+'
        r'№(\d+)\s+(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})',
        text
    )
    # Альтернатива: одна подпись
    single_m = None
    if not nums_m:
        single_m = re.search(r'№(\d+)\s+(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})', text)

    # IP адреса
    ip_matches = list(re.finditer(r'IP:\s*([\d.]+)', text))

    # Подписанты — строка после ОТПРАВЛЕНО/ПОДТВЕРЖДЁН
    # Ищем строку с обоими статусами
    status_m = re.search(r'ОТПРАВЛЕНО\s+ПОДТВЕРЖДЁН', text)

    # Подписанты на следующей строке
    signer_line = None
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if 'ОТПРАВЛЕНО' in line and i + 1 < len(lines):
            signer_line = lines[i + 1].strip()
            break

    if nums_m:
        # Два подписанта — разделяем имя по паттерну (конец имени + начало нового)
        sent_signer = None
        conf_signer = None
        if signer_line:
            # Имена в верхнем регистре с апострофами, разделены пробелами.
            # Ищем границу: после O'G'LI или подобного конца имени
            # Используем паттерн: конец первого имени перед началом второго
            parts = re.split(r"\s{2,}", signer_line)
            if len(parts) >= 2:
                sent_signer = parts[0].strip()
                conf_signer = parts[1].strip()
            else:
                # Попробуем по руководителям
                dir_m = re.search(r'Руководитель:.*?Руководитель:\s*(.+?)$', text, re.MULTILINE)
                sup_dir_m = re.search(r'Руководитель:\s*(.+?)\s+Руководитель:', text)
                if sup_dir_m and dir_m:
                    sent_signer = sup_dir_m.group(1).strip()
                    conf_signer = dir_m.group(1).strip()

        sent = Signature(
            number=nums_m.group(1),
            datetime=_format_datetime(nums_m.group(2)),
            signer=sent_signer,
            ip=ip_matches[0].group(1) if len(ip_matches) >= 1 else None,
        )
        confirmed = Signature(
            number=nums_m.group(3),
            datetime=_format_datetime(nums_m.group(4)),
            signer=conf_signer,
            ip=ip_matches[1].group(1) if len(ip_matches) >= 2 else None,
        )
    elif single_m:
        status = "ОТПРАВЛЕНО" if re.search(r'ОТПРАВЛЕНО', text) else None
        signer = signer_line
        ip = ip_matches[0].group(1) if ip_matches else None
        sig = Signature(
            number=single_m.group(1),
            datetime=_format_datetime(single_m.group(2)),
            signer=signer,
            ip=ip,
        )
        if status == "ОТПРАВЛЕНО":
            sent = sig
        else:
            confirmed = sig

    return Signatures(sent=sent, confirmed=confirmed)


def _parse_status(text: str) -> Optional[str]:
    """Определяет статус из подписей."""
    if re.search(r'ПОДТВЕРЖДЁН', text):
        return "ПОДТВЕРЖДЁН"
    if re.search(r'ОТПРАВЛЕНО', text):
        return "ОТПРАВЛЕНО"
    return None


def parse_invoice(pdf_path: Union[str, Path]) -> Invoice:
    """Парсит PDF счёт-фактуры и возвращает модель Invoice."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"Файл не найден: {pdf_path}")

    logger.info("Парсинг файла: %s", pdf_path)

    text = _extract_text(pdf_path)
    tables = _extract_tables(pdf_path)

    logger.debug("Извлечённый текст (%d символов), таблиц: %d", len(text), len(tables))

    header = _parse_header(text)
    ids = _parse_ids(text)

    invoice = Invoice(
        document_type=header.get("document_type"),
        number=header.get("number"),
        date=header.get("date"),
        contract_number=header.get("contract_number"),
        contract_date=header.get("contract_date"),
        status=_parse_status(text),
        didox_id=ids.get("didox_id"),
        rouming_id=ids.get("rouming_id"),
        risk_level=_parse_risk_level(text),
        supplier=_parse_supplier(text),
        buyer=_parse_buyer(text),
        items=_parse_items_from_table(tables),
        totals=_parse_totals(text, tables),
        signatures=_parse_signatures(text),
    )

    logger.info("Парсинг завершён: %s №%s, позиций: %d", invoice.document_type, invoice.number, len(invoice.items))
    return invoice


def parse_invoice_bytes(pdf_bytes: bytes) -> Invoice:
    """Парсит PDF из байтов (для API)."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()
        return parse_invoice(tmp.name)
