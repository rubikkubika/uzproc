'use client';

import { useInvoiceParser } from './hooks/useInvoiceParser';
import UploadArea from './ui/UploadArea';
import InvoiceResult from './ui/InvoiceResult';

export default function InvoiceRecognition() {
  const { invoice, loading, error, fileName, parseFile, reset } = useInvoiceParser();

  return (
    <div className="space-y-4">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Распознавание счёт-фактур</h1>
        <p className="text-sm text-gray-500 mt-1">
          Загрузите PDF-файл счёт-фактуры Didox.uz для извлечения данных
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {!invoice && (
          <UploadArea
            onFileSelect={parseFile}
            loading={loading}
            fileName={fileName}
          />
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {invoice && (
          <InvoiceResult invoice={invoice} onReset={reset} />
        )}
      </div>
    </div>
  );
}
