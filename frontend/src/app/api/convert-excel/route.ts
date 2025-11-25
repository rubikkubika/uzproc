import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { clearCache } from '../purchases-data/route';

// Функция для конвертации Excel в CSV с правильной обработкой объединенных ячеек
const convertExcelToCSV = (buffer: Buffer): string => {
  try {
    const workbook = XLSX.read(buffer, { 
      type: 'buffer', 
      cellDates: true,
      cellStyles: false
    });
    
    // Берем первый лист
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Получаем информацию об объединенных ячейках
    const merges = worksheet['!merges'] || [];
    
    // Создаем карту объединенных ячеек
    const mergeMap = new Map<string, any>();
    
    merges.forEach(merge => {
      const startCell = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      const cellData = worksheet[startCell];
      const value = cellData ? (cellData.v !== undefined ? cellData.v : '') : '';
      
      // Заполняем все ячейки в объединенном диапазоне значением из главной ячейки
      for (let row = merge.s.r; row <= merge.e.r; row++) {
        for (let col = merge.s.c; col <= merge.e.c; col++) {
          const cellKey = `${row},${col}`;
          mergeMap.set(cellKey, value);
        }
      }
    });
    
    // Получаем диапазон ячеек
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Обрабатываем первые 2 строки (этапы и роли) с правильным распространением
    // Определяем все этапы и их позиции
    const stagePositions: Array<{col: number, value: any}> = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cellKey = `0,${col}`;
      const existingCell = worksheet[cellAddress];
      let cellValue = existingCell ? (existingCell.v !== undefined ? existingCell.v : '') : '';
      
      // Проверяем значение из объединенной ячейки
      if (mergeMap.has(cellKey)) {
        const value = mergeMap.get(cellKey);
        if (value !== undefined && value !== null && value !== '') {
          cellValue = value;
        }
      }
      
      // Проверяем, является ли это этапом согласования
      if (cellValue && String(cellValue).trim() !== '') {
        const valueStr = String(cellValue);
        if (valueStr.includes('Согласование') || valueStr.includes('Утверждение') || 
            valueStr.includes('Закупочная комиссия') || valueStr.includes('Проверка')) {
          stagePositions.push({ col: col, value: cellValue });
        }
      }
    }
    
    // Распространяем этапы на все колонки до следующего этапа
    let currentStage: any = null;
    let stageIndex = 0;
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cellKey = `0,${col}`;
      const existingCell = worksheet[cellAddress];
      let cellValue = existingCell ? (existingCell.v !== undefined ? existingCell.v : '') : '';
      
      // Проверяем, не начался ли новый этап в этой колонке
      if (stageIndex < stagePositions.length && stagePositions[stageIndex].col === col) {
        currentStage = stagePositions[stageIndex].value;
        cellValue = currentStage;
        stageIndex++;
      } else if (currentStage !== null) {
        // Проверяем, не начался ли следующий этап
        if (stageIndex < stagePositions.length && col >= stagePositions[stageIndex].col) {
          currentStage = null;
        } else {
          // Продолжаем распространять текущий этап
          cellValue = currentStage;
        }
      }
      
      // Проверяем значение из объединенной ячейки (приоритет)
      if (mergeMap.has(cellKey)) {
        const value = mergeMap.get(cellKey);
        if (value !== undefined && value !== null && value !== '') {
          cellValue = value;
          const valueStr = String(value);
          if (valueStr.includes('Согласование') || valueStr.includes('Утверждение') || 
              valueStr.includes('Закупочная комиссия') || valueStr.includes('Проверка')) {
            currentStage = value;
          }
        }
      }
      
      // Записываем значение, если это не обычное поле
      const isRegularField = cellValue && String(cellValue).trim() !== '' && 
                           !String(cellValue).includes('Согласование') && 
                           !String(cellValue).includes('Утверждение') && 
                           !String(cellValue).includes('Закупочная комиссия') && 
                           !String(cellValue).includes('Проверка');
      
      if (!isRegularField && cellValue && (!existingCell || existingCell.v !== cellValue)) {
        worksheet[cellAddress] = { t: 's', v: String(cellValue) };
      }
    }
    
    // Определяем границы этапов для обработки ролей
    const stages: Array<{startCol: number, endCol: number, value: any}> = [];
    for (let i = 0; i < stagePositions.length; i++) {
      const startCol = stagePositions[i].col;
      const endCol = i < stagePositions.length - 1 ? stagePositions[i + 1].col - 1 : range.e.c;
      stages.push({ startCol: startCol, endCol: endCol, value: stagePositions[i].value });
    }
    
    // Обрабатываем строку 1 (роли) - распространяем роль на все колонки до следующей роли
    for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
      const stage = stages[stageIdx];
      
      // Определяем все роли в рамках этого этапа
      const rolePositions: Array<{col: number, value: any}> = [];
      for (let col = stage.startCol; col <= stage.endCol; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
        const cellKey = `1,${col}`;
        const existingCell = worksheet[cellAddress];
        let cellValue = existingCell ? (existingCell.v !== undefined ? existingCell.v : '') : '';
        
        // Проверяем значение из объединенной ячейки
        if (mergeMap.has(cellKey)) {
          const value = mergeMap.get(cellKey);
          if (value !== undefined && value !== null && value !== '') {
            cellValue = value;
          }
        }
        
        // Если в ячейке есть значение, это роль
        if (cellValue && String(cellValue).trim() !== '') {
          rolePositions.push({ col: col, value: cellValue });
        }
      }
      
      // Распространяем роли на все колонки до следующей роли
      let currentRole: any = null;
      let roleIndex = 0;
      
      for (let col = stage.startCol; col <= stage.endCol; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
        const cellKey = `1,${col}`;
        const existingCell = worksheet[cellAddress];
        let cellValue = existingCell ? (existingCell.v !== undefined ? existingCell.v : '') : '';
        
        // Проверяем, не началась ли новая роль в этой колонке
        if (roleIndex < rolePositions.length && rolePositions[roleIndex].col === col) {
          currentRole = rolePositions[roleIndex].value;
          cellValue = currentRole;
          roleIndex++;
        } else if (currentRole !== null) {
          // Проверяем, не началась ли следующая роль
          if (roleIndex < rolePositions.length && col >= rolePositions[roleIndex].col) {
            currentRole = null;
          } else {
            // Продолжаем распространять текущую роль
            cellValue = currentRole;
          }
        }
        
        // Проверяем значение из объединенной ячейки (приоритет)
        if (mergeMap.has(cellKey)) {
          const value = mergeMap.get(cellKey);
          if (value !== undefined && value !== null && value !== '') {
            cellValue = value;
            currentRole = value;
          }
        }
        
        // Записываем значение
        if (cellValue && (!existingCell || existingCell.v !== cellValue)) {
          worksheet[cellAddress] = { t: 's', v: String(cellValue) };
        }
      }
    }
    
    // Обрабатываем остальные строки (включая строку 2 - действия, и данные)
    for (let row = 2; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cellKey = `${row},${col}`;
        const existingCell = worksheet[cellAddress];
        
        // Если ячейка пустая, но есть значение в mergeMap, заполняем её
        if (mergeMap.has(cellKey)) {
          const value = mergeMap.get(cellKey);
          if (!existingCell || existingCell.v === undefined || existingCell.v === null || existingCell.v === '') {
            if (value !== undefined && value !== null && value !== '') {
              let cellType = 's';
              let cellValue = value;
              
              if (typeof value === 'number') {
                cellType = 'n';
                cellValue = value;
              } else if (value instanceof Date) {
                cellType = 'd';
                cellValue = value;
              } else {
                cellType = 's';
                cellValue = String(value);
              }
              
              worksheet[cellAddress] = { t: cellType, v: cellValue };
            }
          }
        }
      }
    }
    
    // Теперь конвертируем в CSV
    // Сначала определяем колонку с номером заявки (строка 2 - заголовки)
    const requestNumberColIndex = range.s.c;
    const headerRowIndex = 2;
    const isRequestNumberColumn = new Map<number, boolean>();
    
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      const cell = worksheet[cellAddress];
      const headerValue = cell?.w || cell?.v || '';
      const headerStr = String(headerValue).trim();
      isRequestNumberColumn.set(C, headerStr === '№ заявки' || headerStr.includes('№ заявки'));
    }
    
    // Сначала формируем заголовки для четвертой строки
    const headerRow0: string[] = []; // Строка 0 - этапы
    const headerRow1: string[] = []; // Строка 1 - роли
    const headerRow2: string[] = []; // Строка 2 - поля
    const headerRow3: string[] = []; // Строка 3 - объединенные заголовки
    
    let headerCurrentStage = '';
    let headerCurrentRole = '';
    
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
      
      // Определяем этап
      if (val0 && (val0.includes('Согласование') || val0.includes('Утверждение') || 
          val0.includes('Закупочная комиссия') || val0.includes('Проверка'))) {
        headerCurrentStage = val0;
        headerCurrentRole = '';
      }
      
      // Определяем роль
      if (val1 && !val1.includes('Согласование') && !val1.includes('Утверждение') && 
          !val1.includes('Закупочная комиссия') && !val1.includes('Проверка')) {
        headerCurrentRole = val1;
      }
      
      // Формируем объединенный заголовок
      let combinedHeader = '';
      if (headerCurrentStage) {
        combinedHeader = headerCurrentStage;
        if (headerCurrentRole) {
          combinedHeader += headerCurrentRole;
        }
        if (val2) {
          const isDuplicate = !headerCurrentStage && val0 && 
            (val2 === val0 || val2.includes('№ заявки') || val2.includes('ЦФО'));
          if (!isDuplicate || headerCurrentStage) {
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
    
    // Теперь добавляем данные (начиная со строки 3, которая теперь строка 4)
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
    const { filename } = await request.json().catch(() => ({}));
    
    // Ищем Excel файлы в папке images
    const imagesDir = path.join(process.cwd(), 'images');
    
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json(
        { error: 'Папка images не найдена' },
        { status: 404 }
      );
    }

    // Если указано имя файла, используем его, иначе ищем первый .xlsx файл
    let excelFile: string | null = null;
    
    if (filename) {
      const filePath = path.join(imagesDir, filename);
      if (fs.existsSync(filePath) && (filename.endsWith('.xlsx') || filename.endsWith('.xls'))) {
        excelFile = filePath;
      }
    } else {
      // Ищем все Excel файлы
      const files = fs.readdirSync(imagesDir);
      const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
      
      if (excelFiles.length === 0) {
        return NextResponse.json(
          { error: 'Excel файлы не найдены в папке images' },
          { status: 404 }
        );
      }
      
      // Берем первый найденный файл
      excelFile = path.join(imagesDir, excelFiles[0]);
    }

    if (!excelFile || !fs.existsSync(excelFile)) {
      return NextResponse.json(
        { error: 'Excel файл не найден' },
        { status: 404 }
      );
    }

    // Читаем Excel файл
    const excelBuffer = fs.readFileSync(excelFile);
    const csvContent = convertExcelToCSV(excelBuffer);

    // Сохраняем в CSV файл
    const csvFilePath = path.join(imagesDir, 'для фронта.csv');
    const backupPath = path.join(imagesDir, 'для фронта.backup.csv');

    // Создаем резервную копию существующего CSV, если он есть
    if (fs.existsSync(csvFilePath)) {
      fs.copyFileSync(csvFilePath, backupPath);
    }

    // Сохраняем новый CSV
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8');
    
    console.log('CSV file saved, size:', csvContent.length, 'bytes');
    console.log('CSV file lines:', csvContent.split('\n').length);

    // Очищаем кэш данных, чтобы новые данные загрузились
    clearCache();
    console.log('Cache cleared after conversion');

    const excelFileName = path.basename(excelFile);

    return NextResponse.json({
      success: true,
      message: `Excel файл "${excelFileName}" успешно конвертирован в CSV`,
      sourceFile: excelFileName,
      targetFile: 'для фронта.csv'
    });

  } catch (error: any) {
    console.error('Error converting Excel:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при конвертации Excel файла',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ищем Excel файлы в папке images
    const imagesDir = path.join(process.cwd(), 'images');
    
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json(
        { error: 'Папка images не найдена' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(imagesDir);
    const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

    return NextResponse.json({
      excelFiles: excelFiles.map(f => ({
        filename: f,
        path: path.join(imagesDir, f),
        size: fs.statSync(path.join(imagesDir, f)).size
      }))
    });

  } catch (error: any) {
    console.error('Error listing Excel files:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при получении списка Excel файлов',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

