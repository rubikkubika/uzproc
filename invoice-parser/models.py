from pydantic import BaseModel
from typing import Optional


class Party(BaseModel):
    """Поставщик или покупатель."""
    name: Optional[str] = None
    address: Optional[str] = None
    inn: Optional[str] = None
    vat_registration: Optional[str] = None
    vat_status: Optional[str] = None
    bank_account: Optional[str] = None
    mfo: Optional[str] = None
    director: Optional[str] = None
    accountant: Optional[str] = None


class InvoiceItem(BaseModel):
    """Позиция в счёт-фактуре."""
    index: int
    name: Optional[str] = None
    catalog_code: Optional[str] = None
    catalog_name: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    subtotal: Optional[float] = None
    vat_rate: Optional[int] = None
    vat_amount: Optional[float] = None
    total: Optional[float] = None
    origin: Optional[str] = None


class Totals(BaseModel):
    """Итоговые суммы."""
    subtotal: Optional[float] = None
    vat_amount: Optional[float] = None
    total: Optional[float] = None
    total_text: Optional[str] = None


class Signature(BaseModel):
    """Электронная подпись."""
    number: Optional[str] = None
    datetime: Optional[str] = None
    signer: Optional[str] = None
    ip: Optional[str] = None


class Signatures(BaseModel):
    """Подписи отправителя и получателя."""
    sent: Optional[Signature] = None
    confirmed: Optional[Signature] = None


class Invoice(BaseModel):
    """Полная счёт-фактура Didox.uz."""
    document_type: Optional[str] = None
    number: Optional[str] = None
    date: Optional[str] = None
    contract_number: Optional[str] = None
    contract_date: Optional[str] = None
    status: Optional[str] = None
    didox_id: Optional[str] = None
    rouming_id: Optional[str] = None
    risk_level: Optional[str] = None
    supplier: Optional[Party] = None
    buyer: Optional[Party] = None
    items: list[InvoiceItem] = []
    totals: Optional[Totals] = None
    signatures: Optional[Signatures] = None
