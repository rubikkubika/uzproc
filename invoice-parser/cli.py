"""CLI для парсинга счёт-фактур."""

import json
import logging
import sys
from pathlib import Path
from typing import Optional

import typer

from parser import parse_invoice

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = typer.Typer(help="Парсер узбекских счёт-фактур Didox.uz")


@app.command()
def parse(
    path: str = typer.Argument(..., help="Путь к PDF-файлу или папке с PDF-файлами"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Папка для сохранения JSON"),
    pretty: bool = typer.Option(True, "--pretty/--compact", help="Форматированный вывод JSON"),
):
    """Парсит PDF счёт-фактуры и выводит JSON."""
    input_path = Path(path)

    if not input_path.exists():
        typer.echo(f"Ошибка: путь не найден: {path}", err=True)
        raise typer.Exit(code=1)

    output_dir = Path(output) if output else None
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)

    indent = 2 if pretty else None

    if input_path.is_file():
        _parse_file(input_path, output_dir, indent)
    elif input_path.is_dir():
        pdf_files = sorted(input_path.glob("*.pdf"))
        if not pdf_files:
            typer.echo(f"PDF-файлы не найдены в {path}", err=True)
            raise typer.Exit(code=1)
        for pdf_file in pdf_files:
            _parse_file(pdf_file, output_dir or input_path, indent)
    else:
        typer.echo(f"Ошибка: неизвестный тип пути: {path}", err=True)
        raise typer.Exit(code=1)


def _parse_file(pdf_path: Path, output_dir: Optional[Path], indent: Optional[int]):
    """Парсит один файл."""
    try:
        invoice = parse_invoice(pdf_path)
        json_str = invoice.model_dump_json(indent=indent)

        if output_dir:
            out_file = output_dir / f"{pdf_path.stem}.json"
            out_file.write_text(json_str, encoding="utf-8")
            typer.echo(f"✓ {pdf_path.name} → {out_file}")
        else:
            typer.echo(json_str)

    except Exception as e:
        typer.echo(f"✗ {pdf_path.name}: {e}", err=True)


if __name__ == "__main__":
    app()
