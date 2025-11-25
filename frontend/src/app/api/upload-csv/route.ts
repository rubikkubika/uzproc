import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Импортируем функции парсинга из purchases-data route
const parseCSV = (content: string) => {
  const rows: string[] = [];
  let currentRow = '';
  let insideQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '"') {
      if (insideQuotes && content[i + 1] === '"') {
        currentRow += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === '\n' && !insideQuotes) {
      rows.push(currentRow);
      currentRow = '';
      continue;
    }
    
    currentRow += char;
  }
  
  if (currentRow.trim()) {
    rows.push(currentRow);
  }
  
  return rows.filter(row => row.trim());
};

const parseLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ';' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

const parseCSVToObjects = (content: string) => {
  const lines = parseCSV(content);
  if (lines.length === 0) return [];
  
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      const key = header || `column_${index}`;
      obj[key] = values[index]?.replace(/^"|"$/g, '').trim() || '';
    });
    return obj;
  });
};

// Функция для конвертации Excel в CSV
const convertExcelToCSV = (buffer: Buffer): string => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Берем первый лист
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Конвертируем в CSV с разделителем ";"
    const csv = XLSX.utils.sheet_to_csv(worksheet, { 
      FS: ';',
      blankrows: false
    });
    
    return csv;
  } catch (error) {
    throw new Error(`Ошибка при чтении Excel файла: ${error}`);
  }
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    // Проверяем тип файла (поддерживаем CSV и Excel)
    const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv';
    const isExcel = file.name.endsWith('.xlsx') || 
                    file.name.endsWith('.xls') || 
                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel';

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { error: 'Файл должен быть в формате CSV или Excel (.xlsx, .xls)' },
        { status: 400 }
      );
    }

    // Читаем содержимое файла
    let fileContent: string;
    
    if (isExcel) {
      // Для Excel файлов конвертируем в CSV
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileContent = convertExcelToCSV(buffer);
    } else {
      // Для CSV файлов читаем как текст
      fileContent = await file.text();
    }
    const filePath = path.join(process.cwd(), 'images', 'для фронта.csv');
    const backupPath = path.join(process.cwd(), 'images', 'для фронта.backup.csv');

    // Проверяем существование текущего файла
    let oldData: any[] = [];
    let oldDataMap = new Map<string, any>();
    
    if (fs.existsSync(filePath)) {
      // Создаем резервную копию
      fs.copyFileSync(filePath, backupPath);
      
      // Парсим старый файл
      const oldContent = fs.readFileSync(filePath, 'utf-8');
      oldData = parseCSVToObjects(oldContent);
      
      // Создаем Map для быстрого поиска по номеру заявки
      oldData.forEach(item => {
        const requestNumber = item['№ заявки'] || '';
        if (requestNumber) {
          oldDataMap.set(requestNumber, item);
        }
      });
    }

    // Парсим новый файл
    const newData = parseCSVToObjects(fileContent);
    const newDataMap = new Map<string, any>();
    newData.forEach(item => {
      const requestNumber = item['№ заявки'] || '';
      if (requestNumber) {
        newDataMap.set(requestNumber, item);
      }
    });

    // Сравниваем данные
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let deletedCount = 0;

    const resultData: any[] = [];
    const processedRequestNumbers = new Set<string>();

    // Обрабатываем новые данные
    newData.forEach(item => {
      const requestNumber = item['№ заявки'] || '';
      if (!requestNumber) return;

      processedRequestNumbers.add(requestNumber);
      const oldItem = oldDataMap.get(requestNumber);

      if (!oldItem) {
        // Новая запись
        newCount++;
        resultData.push(item);
      } else {
        // Проверяем, изменилась ли запись
        // Сравниваем все поля для точного определения изменений
        const oldKeys = Object.keys(oldItem).sort();
        const newKeys = Object.keys(item).sort();
        let hasChanges = false;
        
        // Проверяем наличие всех ключей
        if (oldKeys.length !== newKeys.length || 
            oldKeys.some(key => !newKeys.includes(key)) ||
            newKeys.some(key => !oldKeys.includes(key))) {
          hasChanges = true;
        } else {
          // Сравниваем значения
          hasChanges = oldKeys.some(key => {
            const oldValue = (oldItem[key] || '').trim();
            const newValue = (item[key] || '').trim();
            return oldValue !== newValue;
          });
        }
        
        if (hasChanges) {
          updatedCount++;
        } else {
          unchangedCount++;
        }
        resultData.push(item);
      }
    });

    // Подсчитываем удаленные записи (есть в старом, но нет в новом)
    oldData.forEach(item => {
      const requestNumber = item['№ заявки'] || '';
      if (requestNumber && !processedRequestNumbers.has(requestNumber)) {
        deletedCount++;
      }
    });

    // Восстанавливаем заголовки из старого файла или нового
    const oldHeaders = oldData.length > 0 ? Object.keys(oldData[0]) : [];
    const newHeaders = newData.length > 0 ? Object.keys(newData[0]) : [];
    const allHeaders = Array.from(new Set([...oldHeaders, ...newHeaders]));

    // Формируем CSV с правильными заголовками
    const csvLines: string[] = [];
    
    // Заголовки
    csvLines.push(allHeaders.map(h => `"${h}"`).join(';'));
    
    // Данные
    resultData.forEach(item => {
      const values = allHeaders.map(header => {
        const value = item[header] || '';
        // Экранируем кавычки и оборачиваем в кавычки если нужно
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvLines.push(values.join(';'));
    });

    // Сохраняем новый файл
    fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8');

    // Кэш автоматически обновится при следующем запросе к /api/purchases-data
    // благодаря проверке времени модификации файла

    const stats = {
      total: resultData.length,
      new: newCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      deleted: deletedCount
    };

    return NextResponse.json({
      success: true,
      message: `Данные успешно обновлены. Обработано записей: ${resultData.length}`,
      stats
    });

  } catch (error: any) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при обработке файла',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

