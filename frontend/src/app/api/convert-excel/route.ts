import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

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
    
    // Обрабатываем каждую ячейку для сохранения форматирования чисел
    const rows: string[][] = [];
    
    for (let R = range.s.r; R <= range.e.r; R++) {
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
          row.push(cell.w);
        } else if (cell.t === 'n' && cell.v !== null && cell.v !== undefined) {
          // Если нет отформатированного значения, но есть число
          // Проверяем формат ячейки
          let formattedValue = String(cell.v);
          
          // Если число большое (>= 1000), форматируем с запятыми
          if (cell.v >= 1000) {
            // Определяем количество знаков после запятой из формата
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

