import { useState, useCallback } from 'react';
import type { Invoice } from '../types/invoice.types';

const PARSER_URL = 'http://localhost:8020';

export function useInvoiceParser() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const parseFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Файл должен быть в формате PDF');
      return;
    }

    setLoading(true);
    setError(null);
    setInvoice(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${PARSER_URL}/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || `Ошибка сервера: ${response.status}`);
      }

      const data: Invoice = await response.json();
      setInvoice(data);
    } catch (e: any) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        setError('Сервис распознавания недоступен. Убедитесь что invoice-parser запущен на порту 8020.');
      } else {
        setError(e.message || 'Неизвестная ошибка');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setInvoice(null);
    setError(null);
    setFileName(null);
  }, []);

  return { invoice, loading, error, fileName, parseFile, reset };
}
