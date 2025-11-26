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
      let value = values[index]?.replace(/^"|"$/g, '').trim() || '';
      
      // Убираем запятые из номера заявки (формат должен быть 1054, а не 1,054)
      if (key === '№ заявки') {
        value = value.replace(/,/g, '');
      }
      
      obj[key] = value;
    });
    return obj;
  });
};

// Функция для конвертации Excel в CSV
const convertExcelToCSV = (buffer: Buffer): string => {
  try {
    const workbook = XLSX.read(buffer, { 
      type: 'buffer', 
      cellDates: false,
      cellNF: true, // Включаем форматирование чисел
      cellText: false // Используем отформатированные значения
    });
    
    // Берем первый лист
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Получаем диапазон ячеек
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Сначала определяем колонку с номером заявки (строка 2 - заголовки)
    const headerRowIndex = 2;
    const isRequestNumberColumn = new Map<number, boolean>();
    
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      const cell = worksheet[cellAddress];
      const headerValue = cell?.w || cell?.v || '';
      const headerStr = String(headerValue).trim();
      isRequestNumberColumn.set(C, headerStr === '№ заявки' || headerStr.includes('№ заявки'));
    }
    
    // Формируем четвертую строку с объединенными заголовками
    const headerRow0: string[] = [];
    const headerRow1: string[] = [];
    const headerRow2: string[] = [];
    const headerRow3: string[] = [];
    
    let currentStage = '';
    let currentRole = '';
    let previousStageFromRow0 = ''; // Сохраняем этап из строки 0 предыдущей колонки
    
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell0Address = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell1Address = XLSX.utils.encode_cell({ r: 1, c: C });
      const cell2Address = XLSX.utils.encode_cell({ r: 2, c: C });
      
      const cell0 = worksheet[cell0Address];
      const cell1 = worksheet[cell1Address];
      const cell2 = worksheet[cell2Address];
      
      const val0 = cell0 ? (cell0.w || String(cell0.v || '')) : '';
      const val1 = cell1 ? (cell1.w || String(cell1.v || '')) : '';
      const val2 = cell2 ? (cell2.w || String(cell2.v || '')) : '';
      
      headerRow0.push(val0);
      headerRow1.push(val1);
      headerRow2.push(val2);
      
      // Определяем этап из строки 0
      if (val0 && (val0.includes('Согласование') || val0.includes('Утверждение') || 
          val0.includes('Закупочная комиссия') || val0.includes('Проверка'))) {
        currentStage = val0;
        previousStageFromRow0 = val0; // Сохраняем этап из строки 0
        currentRole = '';
      }
      // Если в строке 0 есть значение, которое может быть этапом (даже без ключевых слов)
      // и оно не пустое, используем его как этап
      else if (val0 && val0.trim() !== '') {
        currentStage = val0;
        previousStageFromRow0 = val0; // Сохраняем этап из строки 0
        currentRole = '';
      }
      // Если строка 0 пустая, но в строке 1 есть значение, которое было этапом в строке 0 предыдущей колонки
      // то это продолжение того же этапа
      else if ((!val0 || val0.trim() === '') && val1 && val1.trim() !== '' && previousStageFromRow0 && val1 === previousStageFromRow0) {
        currentStage = val1; // Используем значение из строки 1 как этап
        // previousStageFromRow0 остается тем же, так как это продолжение этапа
        currentRole = '';
      }
      // Если строка 0 пустая и значение в строке 1 не совпадает с предыдущим этапом, сбрасываем previousStageFromRow0
      else if ((!val0 || val0.trim() === '') && val1 && val1.trim() !== '' && previousStageFromRow0 && val1 !== previousStageFromRow0) {
        // Новый этап не начинается, но и продолжение предыдущего тоже нет
        previousStageFromRow0 = ''; // Сбрасываем, так как этап изменился
      }
      
      // Проверяем, может ли значение в строке 1 быть этапом
      // Если в строке 1 есть значение, которое совпадает с этапом или является названием этапа,
      // то это этап, а не роль
      let isStageInRow1 = false;
      if (val1 && val1.trim() !== '') {
        // Если значение в строке 1 совпадает с текущим этапом, это этап
        if (currentStage && val1 === currentStage) {
          isStageInRow1 = true;
        }
        // Если значение в строке 1 содержит ключевые слова этапов, это этап
        else if (val1.includes('Согласование') || val1.includes('Утверждение') || 
                 val1.includes('Закупочная комиссия') || val1.includes('Проверка')) {
          isStageInRow1 = true;
          // Если это этап в строке 1, используем его как этап
          if (!currentStage || val1 !== currentStage) {
            currentStage = val1;
            previousStageFromRow0 = val1;
            currentRole = '';
          }
        }
      }
      
      // Определяем роль (только если это не этап)
      if (val1 && val1.trim() !== '' && !isStageInRow1) {
        currentRole = val1;
      }
      
      // Формируем объединенный заголовок
      let combinedHeader = '';
      if (currentStage) {
        combinedHeader = currentStage;
        // Добавляем роль только если она есть и не совпадает с этапом
        if (currentRole && currentRole !== currentStage) {
          combinedHeader += currentRole;
        }
        if (val2) {
          const isDuplicate = !currentStage && val0 && 
            (val2 === val0 || val2.includes('№ заявки') || val2.includes('ЦФО'));
          if (!isDuplicate || currentStage) {
            combinedHeader += val2;
          }
        }
      } else if (val0) {
        combinedHeader = val0;
        if (val2 && val2 !== val0) {
          const isDuplicate = val2.includes('№ заявки') || val2.includes('ЦФО') ||
            val2.includes('Предмет ЗП') || val2.includes('Формат ЗП');
          if (!isDuplicate) {
            combinedHeader += val2;
          }
        }
      } else {
        combinedHeader = val2 || `column_${C}`;
      }
      
      headerRow3.push(combinedHeader || `column_${C}`);
    }
    
    const rows: string[][] = [];
    
    // Добавляем строки 0-2 (этапы, роли, поля)
    rows.push(headerRow0);
    rows.push(headerRow1);
    rows.push(headerRow2);
    // Добавляем строку 3 с объединенными заголовками
    rows.push(headerRow3);
    
    // Обрабатываем данные (начиная со строки 3, которая теперь строка 4)
    for (let R = 3; R <= range.e.r; R++) {
      const row: string[] = [];
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (!cell) {
          row.push('');
          continue;
        }
        
        // Используем отформатированное значение (cell.w), если оно есть
        if (cell.w) {
          // Если это колонка с номером заявки, убираем форматирование с запятыми
          if (isRequestNumberColumn.get(C) && cell.w.includes(',')) {
            row.push(String(cell.w).replace(/,/g, ''));
          } else {
            row.push(cell.w);
          }
        } else if (cell.t === 'n' && cell.v !== null && cell.v !== undefined) {
          // Если нет отформатированного значения, но есть число
          let formattedValue = String(cell.v);
          
          // Не форматируем номер заявки - оставляем как есть
          const isRequestNumber = isRequestNumberColumn.get(C);
          
          // Если число большое (>= 1000) и это НЕ номер заявки, форматируем с запятыми
          if (cell.v >= 1000 && !isRequestNumber) {
            const numFormat = cell.z || '';
            const hasDecimals = numFormat.includes('.') || numFormat.includes('0.0');
            const decimalPlaces = hasDecimals ? 2 : 0;
            
            formattedValue = new Intl.NumberFormat('ru-RU', {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces
            }).format(cell.v);
          }
          
          row.push(formattedValue);
        } else if (cell.t === 'd' && cell.v) {
          // Обработка дат
          const date = XLSX.SSF.parse_date_code(cell.v);
          if (date) {
            const day = String(date.d).padStart(2, '0');
            const month = String(date.m).padStart(2, '0');
            const year = date.y;
            row.push(`${day}.${month}.${year}`);
          } else {
            row.push(String(cell.v));
          }
        } else {
          // Для текста используем исходное значение
          row.push(String(cell.v || ''));
        }
      }
      rows.push(row);
    }
    
    // Конвертируем в CSV с разделителем ";"
    const csv = rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        // Экранируем кавычки
        const escaped = cellStr.replace(/"/g, '""');
        // Если содержит разделитель, кавычки или перенос строки, оборачиваем в кавычки
        if (escaped.includes(';') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
          return `"${escaped}"`;
        }
        return escaped;
      }).join(';')
    ).join('\n');
    
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
    const filePath = path.join(process.cwd(), 'upload', 'report', 'для фронта.csv');
    const backupPath = path.join(process.cwd(), 'upload', 'report', 'для фронта.backup.csv');

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

