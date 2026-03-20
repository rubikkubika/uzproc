"""Тесты парсера счёт-фактур на sample_invoice.pdf."""

import pytest
from pathlib import Path

from parser import parse_invoice

SAMPLE_PDF = Path(__file__).parent.parent.parent / "sample_invoice.pdf"


@pytest.fixture
def invoice():
    assert SAMPLE_PDF.exists(), f"Файл не найден: {SAMPLE_PDF}"
    return parse_invoice(SAMPLE_PDF)


def test_document_type(invoice):
    assert invoice.document_type == "Счет-фактура"


def test_number_and_date(invoice):
    assert invoice.number == "41"
    assert invoice.date == "2026-03-11"


def test_contract(invoice):
    assert invoice.contract_number == "31-2024"
    assert invoice.contract_date == "2024-10-23"


def test_status(invoice):
    assert invoice.status == "ПОДТВЕРЖДЁН"


def test_didox_id(invoice):
    assert invoice.didox_id == "6429e7121d6d11f1bfa0fa163ea3fd69"


def test_rouming_id(invoice):
    assert invoice.rouming_id == "69b1a2554c2a7f34f4b740e0"


def test_risk_level(invoice):
    assert invoice.risk_level == "НИЗКИЙ"


class TestSupplier:
    def test_name(self, invoice):
        assert '"ALLSTROY" MCHJ' in invoice.supplier.name

    def test_inn(self, invoice):
        assert invoice.supplier.inn == "311186238"

    def test_vat(self, invoice):
        assert invoice.supplier.vat_registration == "326070242920"
        assert invoice.supplier.vat_status == "активный"

    def test_bank(self, invoice):
        assert invoice.supplier.bank_account == "20208000807044365001"
        assert invoice.supplier.mfo == "00873"

    def test_director(self, invoice):
        assert "JALILOV SHOVKAT" in invoice.supplier.director


class TestBuyer:
    def test_name(self, invoice):
        assert '"UZUM MARKET" MCHJ XK' in invoice.buyer.name

    def test_inn(self, invoice):
        assert invoice.buyer.inn == "309376127"

    def test_vat(self, invoice):
        assert invoice.buyer.vat_registration == "326030187867"
        assert invoice.buyer.vat_status == "активный"

    def test_bank(self, invoice):
        assert invoice.buyer.bank_account == "20208000005504983001"
        assert invoice.buyer.mfo == "00974"

    def test_director(self, invoice):
        assert "BENZORUK DMITRIY" in invoice.buyer.director

    def test_accountant(self, invoice):
        assert "DIAMINOVA ILMIRA" in invoice.buyer.accountant


class TestItems:
    def test_count(self, invoice):
        assert len(invoice.items) == 1

    def test_first_item(self, invoice):
        item = invoice.items[0]
        assert item.index == 1
        assert "Урна" in item.name
        assert item.catalog_code == "03926001020000000"
        assert item.unit == "шт."
        assert item.quantity == 30.0
        assert item.price == 330357.14
        assert item.subtotal == 9910714.29
        assert item.vat_rate == 12
        assert item.vat_amount == 1189285.71
        assert item.total == 11100000.0
        assert item.origin == "Купля-продажа"


class TestTotals:
    def test_subtotal(self, invoice):
        assert invoice.totals.subtotal == 9910714.29

    def test_vat(self, invoice):
        assert invoice.totals.vat_amount == 1189285.71

    def test_total(self, invoice):
        assert invoice.totals.total == 11100000.0

    def test_total_text(self, invoice):
        assert "Одиннадцать миллионов" in invoice.totals.total_text


class TestSignatures:
    def test_sent(self, invoice):
        sent = invoice.signatures.sent
        assert sent.number == "2018443112"
        assert sent.datetime == "2026-03-11T22:11:50"
        assert "JALILOV" in sent.signer
        assert sent.ip == "82.215.91.213"

    def test_confirmed(self, invoice):
        conf = invoice.signatures.confirmed
        assert conf.number == "2027473068"
        assert conf.datetime == "2026-03-16T16:19:29"
        assert "BENZORUK" in conf.signer
        assert conf.ip == "94.141.76.167"
