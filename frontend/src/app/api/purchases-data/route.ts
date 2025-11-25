import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Кэш в памяти
let cachedData: any[] | null = null;
let cacheTimestamp: number = 0;
let fileModTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// Функция для очистки кэша (может быть вызвана из других routes)
export function clearCache() {
  cachedData = null;
  cacheTimestamp = 0;
  fileModTime = 0;
}

export async function GET(request: Request) {
  try {
    // Получаем параметры из query string
    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get('all') === 'true';
    const minimal = searchParams.get('minimal') === 'true'; // Оптимизированный режим для обзора
    const search = searchParams.get('search') || '';
    const page = getAll ? 1 : parseInt(searchParams.get('page') || '1');
    const limit = getAll ? Infinity : parseInt(searchParams.get('limit') || '50');

    // Путь к CSV файлу
    const filePath = path.join(process.cwd(), 'images', 'для фронта.csv');
    
    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      console.error('File not found at:', filePath);
      return NextResponse.json(
        { error: 'CSV file not found', path: filePath },
        { status: 404 }
      );
    }

    // Проверяем время модификации файла
    const stats = fs.statSync(filePath);
    const currentModTime = stats.mtimeMs;

    // Если файл изменился или кэш устарел, перепарсиваем
    if (!cachedData || currentModTime !== fileModTime || Date.now() - cacheTimestamp > CACHE_DURATION) {
      console.log('Parsing CSV file...');
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
        cachedData = [];
        cacheTimestamp = Date.now();
        fileModTime = currentModTime;
        return NextResponse.json({
          data: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
          }
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        });
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
      
      // Пропускаем строки, которые являются частью заголовков (обычно строки 2 и 3)
      // Определяем строки с данными: они должны иметь значение в первой колонке (№ заявки)
      const dataLines = lines.slice(1).filter(line => {
        const values = parseLine(line);
        // Проверяем, что первая колонка содержит номер заявки (не пустая и не является заголовком)
        const firstValue = values[0]?.replace(/^"|"$/g, '').trim() || '';
        // Пропускаем строки, где первая колонка пустая или содержит только текст без цифр (заголовки)
        // Также пропускаем строки, где все колонки пустые или содержат только заголовки
        if (!firstValue) return false;
        // Если первая колонка содержит только текст без цифр и точек, это скорее всего заголовок
        if (firstValue && !/\d/.test(firstValue) && !firstValue.includes('.')) {
          // Проверяем, не является ли это заголовком (содержит слова типа "Руководитель", "Дата" и т.д.)
          const headerKeywords = ['Руководитель', 'Дата', 'Дней', 'Ответственный', 'Финансовый', 'Генеральный', 'Директор', 'Председатель', 'Секретарь', 'Служба'];
          if (headerKeywords.some(keyword => firstValue.includes(keyword))) {
            return false;
          }
        }
        return true;
      });
      
      // Остальные строки - данные
      const data = dataLines.map(line => {
        const values = parseLine(line);
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          const key = header || `column_${index}`;
          obj[key] = values[index]?.replace(/^"|"$/g, '').trim() || '';
        });
        return obj;
      }).filter(item => {
        // Дополнительная фильтрация: пропускаем записи, где номер заявки пустой
        const requestNumber = item['№ заявки'] || '';
        return requestNumber.trim() !== '';
      });
      
      cachedData = data;
      cacheTimestamp = Date.now();
      fileModTime = currentModTime;
      console.log('CSV parsed and cached:', data.length, 'records');
    } else {
      console.log('Using cached data:', cachedData.length, 'records');
    }
    
    // Функция для поиска по всем данным
    const searchData = (data: any[], searchTerm: string) => {
      if (!searchTerm.trim()) return data;
      
      const searchLower = searchTerm.toLowerCase();
      return data.filter(item => {
        const searchableFields = [
          item['№ заявки'] || '',
          item['Предмет ЗП'] || '',
          item['ЦФО'] || '',
          item['Инициатор ЗП'] || '',
          item['Закупшик'] || '',
          item['Наименование поставщика (Закупочная процедура)'] || '',
          item['Состояние заявки на ЗП'] || '',
          item['Статус закупочной процедуры'] || '',
          item['Комментарий'] || '',
          item['Формат ЗП'] || '',
          item['Заявка на ЗП'] || '',
          item['Закупочная процедура'] || ''
        ];
        
        return searchableFields.some(field => 
          field.toLowerCase().includes(searchLower)
        );
      });
    };

    // Функция для фильтрации полей (оптимизация для обзора)
    const filterFields = (data: any[]) => {
      if (!minimal || !data || data.length === 0) return data;
      
      // Поля, необходимые для страницы обзор
      const neededFields = [
        '№ заявки',
        'ЦФО',
        'Предмет ЗП',
        'Формат ЗП',
        'Закупшик',
        'Дата создания ЗП',
        'Состояние заявки на ЗП',
        'Cумма предпологаемого контракта ФАКТ',
        'Экономия',
        'Дней всего согласования ЗП',
      ];
      
      // Добавляем все поля с датами и днями
      const allFields = Object.keys(data[0] || {});
      const dateFields = allFields.filter(f => f.includes('Дата назначения') || f.includes('Дата выполнения'));
      const daysFields = allFields.filter(f => f.includes('Дней в работе'));
      
      const fieldsToKeep = new Set([...neededFields, ...dateFields, ...daysFields]);
      
      return data.map(item => {
        const filtered: Record<string, string> = {};
        fieldsToKeep.forEach(field => {
          if (item[field] !== undefined) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });
    };

    // Применяем поиск если указан
    let filteredData = cachedData;
    if (search) {
      filteredData = searchData(cachedData, search);
    }

    // Если запрошены все данные (для статистики/графиков)
    if (getAll) {
      const resultData = filterFields(filteredData);
      return NextResponse.json(resultData, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Применяем пагинацию к отфильтрованным данным
    const total = filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filterFields(filteredData.slice(startIndex, endIndex));

    // Возвращаем данные с информацией о пагинации
    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
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

