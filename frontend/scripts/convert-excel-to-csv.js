const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Конвертирует Excel файл в CSV с правильной обработкой объединенных ячеек
 * @param {string} excelPath - Путь к Excel файлу
 * @param {string} csvPath - Путь для сохранения CSV файла
 */
function convertExcelToCSV(excelPath, csvPath) {
  console.log(`Чтение Excel файла: ${excelPath}`);
  
  // Читаем Excel файл
  const workbook = XLSX.readFile(excelPath, { 
    cellStyles: false,
    cellDates: true 
  });
  
  // Берем первый лист
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log(`Обработка листа: ${sheetName}`);
  
  // Получаем информацию об объединенных ячейках
  const merges = worksheet['!merges'] || [];
  console.log(`Найдено объединенных ячеек: ${merges.length}`);
  
  // Создаем карту объединенных ячеек
  // Ключ: координаты ячейки (row, col), Значение: значение из главной ячейки
  const mergeMap = new Map();
  
  merges.forEach(merge => {
    const startCell = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const endCell = XLSX.utils.encode_cell({ r: merge.e.r, c: merge.e.c });
    const cellData = worksheet[startCell];
    const value = cellData ? (cellData.v !== undefined ? cellData.v : '') : '';
    
    // Заполняем все ячейки в объединенном диапазоне значением из главной ячейки
    const rowsInMerge = merge.e.r - merge.s.r + 1;
    const colsInMerge = merge.e.c - merge.s.c + 1;
    
    for (let row = merge.s.r; row <= merge.e.r; row++) {
      for (let col = merge.s.c; col <= merge.e.c; col++) {
        const cellKey = `${row},${col}`;
        mergeMap.set(cellKey, value);
      }
    }
    
    if (value && String(value).trim() !== '') {
      console.log(`  Объединенная ячейка ${startCell}-${endCell}: "${value}" (${rowsInMerge}x${colsInMerge})`);
    }
  });
  
  // Применяем значения из объединенных ячеек к пустым ячейкам
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  let filledCells = 0;
  
  console.log(`Обработка ячеек...`);
  
  // Специальная обработка первых 2 строк заголовков (этапы и роли)
  // Для строки 0 (этапы) - распространяем этап на все колонки до следующего этапа
  
  // Сначала определяем все этапы и их позиции
  const stagePositions = []; // Массив объектов {col, value}
  
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
  
  // Теперь заполняем строку 0 этапами - распространяем каждый этап до следующего
  let currentStage = null;
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
        // Достигли следующего этапа
        currentStage = null;
      } else {
        // Продолжаем распространять текущий этап
        cellValue = currentStage;
      }
    }
    
    // Проверяем значение из объединенной ячейки (приоритет - если есть значение, используем его)
    if (mergeMap.has(cellKey)) {
      const value = mergeMap.get(cellKey);
      if (value !== undefined && value !== null && value !== '') {
        cellValue = value;
        // Если это этап, обновляем currentStage
        const valueStr = String(value);
        if (valueStr.includes('Согласование') || valueStr.includes('Утверждение') || 
            valueStr.includes('Закупочная комиссия') || valueStr.includes('Проверка')) {
          currentStage = value;
        }
      }
    }
    
    // Записываем значение, если оно изменилось или ячейка была пустой
    // НО только если это не обычное поле (не этап и не пустое)
    const isRegularField = cellValue && String(cellValue).trim() !== '' && 
                           !String(cellValue).includes('Согласование') && 
                           !String(cellValue).includes('Утверждение') && 
                           !String(cellValue).includes('Закупочная комиссия') && 
                           !String(cellValue).includes('Проверка');
    
    if (!isRegularField && cellValue && (!existingCell || existingCell.v !== cellValue)) {
      worksheet[cellAddress] = { t: 's', v: String(cellValue) };
      if (!existingCell || existingCell.v === undefined || existingCell.v === null || existingCell.v === '') {
        filledCells++;
      }
    }
  }
  
  // Определяем границы этапов для обработки ролей
  const stages = [];
  for (let i = 0; i < stagePositions.length; i++) {
    const startCol = stagePositions[i].col;
    const endCol = i < stagePositions.length - 1 ? stagePositions[i + 1].col - 1 : range.e.c;
    stages.push({ startCol: startCol, endCol: endCol, value: stagePositions[i].value });
  }
  
  // Обрабатываем строку 1 (роли) - распространяем роль на все колонки до следующей роли
  // Роль распространяется в рамках текущего этапа до следующей роли
  
  // Обрабатываем роли в рамках каждого этапа
  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx];
    
    // Сначала определяем все роли в рамках этого этапа
    const rolePositions = [];
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
    
    // Теперь распространяем роли на все колонки до следующей роли
    let currentRole = null;
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
          // Достигли следующей роли
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
      
      // Записываем значение, если оно изменилось или ячейка была пустой
      if (cellValue && (!existingCell || existingCell.v !== cellValue)) {
        worksheet[cellAddress] = { t: 's', v: String(cellValue) };
        if (!existingCell || existingCell.v === undefined || existingCell.v === null || existingCell.v === '') {
          filledCells++;
        }
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
            // Определяем тип значения
            let cellType = 's'; // строка по умолчанию
            let cellValue = value;
            
            // Если значение - число
            if (typeof value === 'number') {
              cellType = 'n';
              cellValue = value;
            }
            // Если значение - дата
            else if (value instanceof Date) {
              cellType = 'd';
              cellValue = value;
            }
            // Если значение - строка
            else {
              cellType = 's';
              cellValue = String(value);
            }
            
            worksheet[cellAddress] = { t: cellType, v: cellValue };
            filledCells++;
          }
        }
      }
    }
  }
  
  console.log(`  Заполнено ячеек из объединенных: ${filledCells}`);
  
  // Конвертируем в CSV
  console.log(`Конвертация в CSV...`);
  const csv = XLSX.utils.sheet_to_csv(worksheet, { 
    FS: ';', // Разделитель - точка с запятой
    blankrows: false,
    skipHidden: false
  });
  
  // Сохраняем CSV файл
  console.log(`Сохранение CSV файла: ${csvPath}`);
  
  // Создаем резервную копию существующего файла
  if (fs.existsSync(csvPath)) {
    const backupPath = csvPath + '.backup';
    console.log(`Создание резервной копии: ${backupPath}`);
    fs.copyFileSync(csvPath, backupPath);
  }
  
  fs.writeFileSync(csvPath, csv, 'utf8');
  
  console.log(`✓ Конвертация завершена успешно!`);
  console.log(`  Строк обработано: ${range.e.r - range.s.r + 1}`);
  console.log(`  Колонок обработано: ${range.e.c - range.s.c + 1}`);
  console.log(`  Заполнено ячеек из объединенных: ${filledCells}`);
}

// Получаем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Использование: node convert-excel-to-csv.js <путь_к_excel_файлу> [путь_к_csv_файлу]');
  console.error('');
  console.error('Примеры:');
  console.error('  node convert-excel-to-csv.js "Отчет 25.11.xlsx"');
  console.error('  node convert-excel-to-csv.js "Отчет 25.11.xlsx" "для фронта.csv"');
  process.exit(1);
}

// Определяем пути
let excelPath = args[0];
let csvPath = args[1];

// Если путь относительный, ищем файл в папке images
if (!path.isAbsolute(excelPath)) {
  const imagesPath = path.join(__dirname, '..', 'images', excelPath);
  if (fs.existsSync(imagesPath)) {
    excelPath = imagesPath;
  } else {
    excelPath = path.resolve(excelPath);
  }
} else {
  excelPath = path.resolve(excelPath);
}

// Определяем путь для CSV
if (!csvPath) {
  csvPath = path.join(path.dirname(excelPath), path.basename(excelPath, path.extname(excelPath)) + '.csv');
} else if (!path.isAbsolute(csvPath)) {
  // Если путь относительный, сохраняем в папку images
  csvPath = path.join(__dirname, '..', 'images', csvPath);
} else {
  csvPath = path.resolve(csvPath);
}

// Проверяем существование Excel файла
if (!fs.existsSync(excelPath)) {
  console.error(`Ошибка: Файл не найден: ${excelPath}`);
  process.exit(1);
}

// Выполняем конвертацию
try {
  convertExcelToCSV(excelPath, csvPath);
} catch (error) {
  console.error('Ошибка при конвертации:', error);
  process.exit(1);
}

