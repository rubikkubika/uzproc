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
    const filePath = path.join(process.cwd(), 'upload', 'report', 'для фронта.csv');
    
    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      console.error('File not found at:', filePath);
      // Возвращаем пустой массив вместо 404, чтобы фронтенд мог работать
      return NextResponse.json(
        [],
        { 
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
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
      
      // Используем новую структуру CSV с четвертой строкой заголовков
      // Строка 0: этапы согласования
      // Строка 1: роли
      // Строка 2: поля (Дата назначения, Дата выполнения, Дней в работе)
      // Строка 3: объединенные заголовки (этап + роль + поле) - используем эту строку
      // Строка 4+: данные
      
      // Проверяем, есть ли четвертая строка с готовыми заголовками (индекс 3 = строка 4)
      let headers: string[] = [];
      let dataStartIndex = 3; // По умолчанию данные начинаются с 4-й строки (индекс 3)
      
      if (lines.length > 3) {
        const headerLine4 = parseLine(lines[3] || ''); // Строка 4 (индекс 3)
        // Проверяем, содержит ли четвертая строка объединенные заголовки
        // (обычно это строки типа "Согласование Заявки на ЗПРуководитель закупщикаДата назначения")
        const hasCombinedHeaders = headerLine4.some(h => 
          h.includes('Согласование') && h.includes('Дата') || 
          h.includes('Утверждение') && h.includes('Дата') ||
          h.includes('Закупочная комиссия')
        );
        
        if (hasCombinedHeaders) {
          // Используем четвертую строку как заголовки
          // Убираем дублирование в заголовках (например, "№ заявки№ заявки" -> "№ заявки")
          headers = headerLine4.map((h, idx) => {
            if (!h) return `column_${idx}`;
            // Проверяем, не является ли заголовок дублированным (например, "№ заявки№ заявки")
            // Если заголовок состоит из двух одинаковых частей, берем только одну
            const halfLength = Math.floor(h.length / 2);
            if (halfLength > 0 && h.substring(0, halfLength) === h.substring(halfLength)) {
              return h.substring(0, halfLength);
            }
            return h;
          });
          dataStartIndex = 4; // Данные начинаются с 5-й строки (индекс 4)
        } else {
          // Старый формат - формируем заголовки из строк 0-2
          const headerLine1 = parseLine(lines[0] || '');
          const headerLine2 = parseLine(lines[1] || '');
          const headerLine3Old = parseLine(lines[2] || '');
          
          const maxLength = Math.max(headerLine1.length, headerLine2.length, headerLine3Old.length);
          let currentStage = '';
          let currentRole = '';
          let previousStageFromRow0 = ''; // Сохраняем этап из строки 0 предыдущей колонки
          
          for (let i = 0; i < maxLength; i++) {
            const cell1 = headerLine1[i] || '';
            const cell2 = headerLine2[i] || '';
            const cell3 = headerLine3Old[i] || '';
            
            // Определяем этап из строки 0 (cell1)
            if (cell1 && cell1.trim() !== '' && 
                (cell1.includes('Согласование') || cell1.includes('Утверждение') || 
                 cell1.includes('Закупочная комиссия') || cell1.includes('Проверка'))) {
              currentStage = cell1;
              previousStageFromRow0 = cell1; // Сохраняем этап из строки 0
              currentRole = '';
            }
            // Если в строке 0 есть значение, которое может быть этапом (даже без ключевых слов)
            else if (cell1 && cell1.trim() !== '') {
              currentStage = cell1;
              previousStageFromRow0 = cell1; // Сохраняем этап из строки 0
              currentRole = '';
            }
            // Если строка 0 пустая, но в строке 1 есть значение, которое было этапом в строке 0 предыдущей колонки
            // то это продолжение того же этапа
            else if ((!cell1 || cell1.trim() === '') && cell2 && cell2.trim() !== '' && previousStageFromRow0 && cell2 === previousStageFromRow0) {
              currentStage = cell2; // Используем значение из строки 1 как этап
              // previousStageFromRow0 остается тем же, так как это продолжение этапа
              currentRole = '';
            }
            // Если строка 0 пустая и значение в строке 1 не совпадает с предыдущим этапом, сбрасываем previousStageFromRow0
            else if ((!cell1 || cell1.trim() === '') && cell2 && cell2.trim() !== '' && previousStageFromRow0 && cell2 !== previousStageFromRow0) {
              // Новый этап не начинается, но и продолжение предыдущего тоже нет
              previousStageFromRow0 = ''; // Сбрасываем, так как этап изменился
            }
            
            // Проверяем, может ли значение в строке 1 (cell2) быть этапом
            let isStageInRow1 = false;
            if (cell2 && cell2.trim() !== '') {
              // Если значение в строке 1 совпадает с текущим этапом, это этап
              if (currentStage && cell2 === currentStage) {
                isStageInRow1 = true;
              }
              // Если значение в строке 1 содержит ключевые слова этапов, это этап
              else if (cell2.includes('Согласование') || cell2.includes('Утверждение') || 
                       cell2.includes('Закупочная комиссия') || cell2.includes('Проверка')) {
                isStageInRow1 = true;
                // Если это этап в строке 1, используем его как этап
                if (!currentStage || cell2 !== currentStage) {
                  currentStage = cell2;
                  previousStageFromRow0 = cell2;
                  currentRole = '';
                }
              }
            }
            
            // Определяем роль (только если это не этап)
            if (cell2 && cell2.trim() !== '' && !isStageInRow1) {
              currentRole = cell2;
            } else if (currentRole && (!cell2 || cell2.trim() === '')) {
              // Продолжаем использовать текущую роль
            }
            
            let header = '';
            if (currentStage) {
              header = currentStage;
            } else if (cell1 && cell1.trim() !== '') {
              header = cell1;
            }
            
            // Добавляем роль только если она есть и не совпадает с этапом
            if (currentRole && currentRole.trim() !== '' && currentStage && currentRole !== currentStage) {
              header = header + currentRole;
            }
            
            if (cell3 && cell3.trim() !== '') {
              const isDuplicateHeader = !currentStage && cell1 && cell1.trim() !== '' && 
                                         (cell3 === cell1 || 
                                          cell3.includes('№ заявки') || 
                                          cell3.includes('ЦФО'));
              if (!isDuplicateHeader || currentStage) {
                header = header + cell3;
              }
            }
            
            if (!header || header.trim() === '') {
              header = `column_${i}`;
            }
            
            headers.push(header);
          }
          dataStartIndex = 3; // Данные начинаются с 4-й строки
        }
      }
      
      // Определяем строки с данными: они должны иметь значение в первой колонке (№ заявки)
      const dataLines = lines.slice(dataStartIndex).filter(line => {
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
      // Создаем Map для отслеживания количества вхождений каждого заголовка
      const headerCounts = new Map<string, number>();
      const uniqueHeaders = headers.map((header, index) => {
        const baseHeader = header || `column_${index}`;
        const count = headerCounts.get(baseHeader) || 0;
        headerCounts.set(baseHeader, count + 1);
        
        // Если заголовок повторяется, добавляем суффикс с номером колонки для сохранения всех данных
        if (count > 0) {
          return `${baseHeader}_col${index}`;
        }
        return baseHeader;
      });
      
      const data = dataLines.map(line => {
        const values = parseLine(line);
        const obj: Record<string, string> = {};
        uniqueHeaders.forEach((key, index) => {
          // Безопасное получение значения - проверяем, что индекс существует
          const rawValue = index < values.length ? values[index] : '';
          let value = rawValue?.replace(/^"|"$/g, '').trim() || '';
          
          // Убираем запятые из номера заявки (формат должен быть 1054, а не 1,054)
          if (key === '№ заявки' || key.startsWith('№ заявки_col')) {
            value = value.replace(/,/g, '');
          }
          
          // Всегда присваиваем значение, даже если оно пустое
          obj[key] = value;
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
      console.log('Total lines in file:', lines.length);
      console.log('Data lines after filtering:', dataLines.length);
      console.log('Sample headers (first 10):', headers.slice(0, 10));
      if (data.length > 0) {
        console.log('Sample record keys:', Object.keys(data[0]).slice(0, 20));
      }
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

    // Сортируем данные по номеру заявки в порядке убывания (более высокие номера сначала)
    filteredData = filteredData.sort((a, b) => {
      const numA = parseInt(a['№ заявки'] || '0', 10) || 0;
      const numB = parseInt(b['№ заявки'] || '0', 10) || 0;
      return numB - numA; // Убывающий порядок
    });

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

