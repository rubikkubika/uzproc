"""FastAPI-сервис для парсинга счёт-фактур."""

import logging

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import Invoice
from parser import parse_invoice_bytes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Didox Invoice Parser",
    description="Сервис парсинга узбекских счёт-фактур Didox.uz из PDF",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/parse", response_model=Invoice)
async def parse_single(file: UploadFile = File(...)):
    """Парсит один PDF-файл счёт-фактуры."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Файл должен быть в формате PDF")

    try:
        content = await file.read()
        invoice = parse_invoice_bytes(content)
        return invoice
    except Exception as e:
        logger.exception("Ошибка парсинга файла %s", file.filename)
        raise HTTPException(status_code=422, detail=f"Ошибка парсинга: {str(e)}")


@app.post("/parse/batch", response_model=list[Invoice])
async def parse_batch(files: list[UploadFile] = File(...)):
    """Парсит несколько PDF-файлов."""
    results = []
    errors = []

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            errors.append({"file": file.filename, "error": "Не PDF файл"})
            continue
        try:
            content = await file.read()
            invoice = parse_invoice_bytes(content)
            results.append(invoice)
        except Exception as e:
            logger.exception("Ошибка парсинга файла %s", file.filename)
            errors.append({"file": file.filename, "error": str(e)})

    if errors and not results:
        raise HTTPException(status_code=422, detail={"errors": errors})

    if errors:
        logger.warning("Частичные ошибки: %s", errors)

    return results


@app.get("/health")
async def health():
    return {"status": "ok"}
