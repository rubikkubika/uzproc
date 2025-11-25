'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileCheck, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  stats?: {
    total: number;
    new: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };
}

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [excelFiles, setExcelFiles] = useState<Array<{filename: string, size: number}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загружаем список Excel файлов при монтировании компонента
  useEffect(() => {
    fetch('/api/convert-excel')
      .then(res => res.json())
      .then(data => {
        if (data.excelFiles) {
          setExcelFiles(data.excelFiles);
        }
      })
      .catch(err => console.error('Error loading Excel files:', err));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Более гибкая проверка типа файла (CSV и Excel)
      const isCSV = 
        selectedFile.type === 'text/csv' || 
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.type === 'application/csv' ||
        selectedFile.name.toLowerCase().endsWith('.csv') ||
        selectedFile.name.toLowerCase().endsWith('.txt');
      
      const isExcel = 
        selectedFile.name.toLowerCase().endsWith('.xlsx') ||
        selectedFile.name.toLowerCase().endsWith('.xls') ||
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel';
      
      if (isCSV || isExcel) {
        setFile(selectedFile);
        setResult(null);
      } else {
        setResult({
          success: false,
          message: `Пожалуйста, выберите CSV или Excel файл (.csv, .xlsx, .xls). Выбранный файл: ${selectedFile.name} (тип: ${selectedFile.type || 'неизвестен'})`
        });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setResult({
        success: false,
        message: 'Пожалуйста, выберите файл для загрузки'
      });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Файл успешно загружен и данные обновлены',
          stats: data.stats
        });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Обновляем страницу через 2 секунды для отображения новых данных
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.error || 'Ошибка при загрузке файла'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        message: 'Ошибка при загрузке файла. Попробуйте еще раз.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConvertExcel = async (filename?: string) => {
    setConverting(true);
    setResult(null);

    try {
      const response = await fetch('/api/convert-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filename ? { filename } : {}),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Excel файл успешно конвертирован в CSV'
        });
        // Обновляем список Excel файлов
        const listResponse = await fetch('/api/convert-excel');
        const listData = await listResponse.json();
        if (listData.excelFiles) {
          setExcelFiles(listData.excelFiles);
        }
        // Обновляем страницу через 2 секунды для отображения новых данных
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.error || 'Ошибка при конвертации Excel файла'
        });
      }
    } catch (error) {
      console.error('Convert error:', error);
      setResult({
        success: false,
        message: 'Ошибка при конвертации Excel файла. Попробуйте еще раз.'
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="space-y-6">
          {/* Информация о загрузке */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FileCheck className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Как работает загрузка:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Система автоматически сравнивает новый файл с текущим</li>
                  <li>Обновляются только измененные записи (по номеру заявки)</li>
                  <li>Добавляются новые записи</li>
                  <li>Удаленные записи помечаются соответствующим образом</li>
                  <li>После загрузки данные автоматически обновятся на всех страницах</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Выбор файла */}
          <div>
            <label htmlFor="csv-file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Выберите CSV или Excel файл (.csv, .xlsx, .xls)
            </label>
            <div className="flex items-center space-x-4">
              <label
                htmlFor="csv-file-input"
                className="flex items-center justify-center px-6 py-3 bg-green-50 text-green-700 rounded-lg font-semibold
                  hover:bg-green-100 cursor-pointer transition-colors duration-200
                  disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
              >
                <Upload className="w-5 h-5 mr-2" />
                {file ? 'Файл выбран' : 'Выбрать файл'}
              </label>
              <input
                id="csv-file-input"
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </div>
            {file && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <FileCheck className="w-4 h-4 mr-2" />
                <span>{file.name}</span>
                <span className="ml-2 text-gray-400">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Автоматическая конвертация Excel файлов */}
          {excelFiles.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileSpreadsheet className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 mb-2">
                    Найдены Excel файлы в папке images:
                  </p>
                  <div className="space-y-2">
                    {excelFiles.map((excelFile, index) => (
                      <div key={index} className="flex items-center justify-between bg-white rounded p-2">
                        <span className="text-sm text-gray-700">
                          {excelFile.filename} ({(excelFile.size / 1024).toFixed(2)} KB)
                        </span>
                        <button
                          onClick={() => handleConvertExcel(excelFile.filename)}
                          disabled={converting}
                          className="px-4 py-1.5 bg-green-600 text-white text-sm rounded
                            hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                            transition-colors duration-200"
                        >
                          {converting ? (
                            <>
                              <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
                              Конвертация...
                            </>
                          ) : (
                            'Конвертировать в CSV'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Кнопка загрузки */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading || converting}
            className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg font-semibold
              hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-colors duration-200"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Загрузка и обработка...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Загрузить и обновить данные
              </>
            )}
          </button>

          {/* Результат загрузки */}
          {result && (
            <div className={`rounded-lg p-4 ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.success && result.stats && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-gray-500">Всего записей</div>
                        <div className="text-lg font-bold text-gray-900">{result.stats.total}</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-green-600">Новых</div>
                        <div className="text-lg font-bold text-green-700">{result.stats.new}</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-blue-600">Обновлено</div>
                        <div className="text-lg font-bold text-blue-700">{result.stats.updated}</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-gray-600">Без изменений</div>
                        <div className="text-lg font-bold text-gray-700">{result.stats.unchanged}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

