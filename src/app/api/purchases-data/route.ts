import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Путь к CSV файлу
    const filePath = path.join(process.cwd(), 'images', 'для фронта.csv');
    
    console.log('Trying to read file:', filePath);
    
    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      console.error('File not found at:', filePath);
      return NextResponse.json(
        { error: 'CSV file not found', path: filePath },
        { status: 404 }
      );
    }
    
    // Чтение файла
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    console.log('File read successfully, length:', fileContent.length);
    
    // Правильный парсинг CSV с учетом переносов строк внутри кавычек
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
    
    // Парсинг CSV
    const lines = parseCSV(fileContent);
    
    if (lines.length === 0) {
      return NextResponse.json([]);
    }
    
    // Функция для парсинга строки в массив значений
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
    
    // Первая строка - заголовки
    const headers = parseLine(lines[0]);
    
    // Остальные строки - данные
    const data = lines.slice(1).map(line => {
      const values = parseLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        const key = header || `column_${index}`;
        obj[key] = values[index]?.replace(/^"|"$/g, '').trim() || '';
      });
      return obj;
    });
    
    console.log('Parsed data count:', data.length);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error reading CSV file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to read CSV file', 
        message: error?.message || 'Unknown error',
        details: error?.stack 
      },
      { status: 500 }
    );
  }
}

