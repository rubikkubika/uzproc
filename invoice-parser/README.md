# Didox Invoice Parser

Сервис парсинга узбекских счёт-фактур Didox.uz из PDF.

## Запуск через Docker

### API-сервис

```bash
docker compose up -d invoice-parser
```

Swagger UI: http://localhost:8020/docs

### CLI (парсинг одного файла)

```bash
docker run --rm -v "$(pwd)/sample_invoice.pdf:/data/invoice.pdf" uzproc-invoice-parser python cli.py /data/invoice.pdf
```

### CLI (парсинг папки)

```bash
docker run --rm -v "$(pwd)/invoices:/data" uzproc-invoice-parser python cli.py /data --output /data/output
```

### Тесты

```bash
docker run --rm \
  -v "$(pwd)/invoice-parser:/app" \
  -v "$(pwd)/sample_invoice.pdf:/app/../sample_invoice.pdf" \
  -w /app \
  python:3.11-slim \
  bash -c "pip install -q pdfplumber pydantic pytest typer && python -m pytest tests/ -v"
```

## API

- `POST /parse` — один PDF → JSON
- `POST /parse/batch` — несколько PDF → массив JSON
- `GET /health` — health check
- `GET /docs` — Swagger UI
