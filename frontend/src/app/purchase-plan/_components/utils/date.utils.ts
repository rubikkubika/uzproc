function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWorkingDay(d: Date, holidayKeys?: Set<string>): boolean {
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  if (holidayKeys && holidayKeys.size > 0 && holidayKeys.has(toLocalDateKey(d))) return false;
  return true;
}

/** Рабочие дни от даты: первый шаг — следующий календарный день (как на бэкенде). */
export const addWorkingDays = (date: Date, workingDays: number, holidayKeys?: Set<string>): Date => {
  const result = new Date(date);
  let daysAdded = 0;

  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result, holidayKeys)) {
      daysAdded++;
    }
  }

  return result;
};

// Функция для получения количества рабочих дней на основе сложности
export const getWorkingDaysByComplexity = (complexity: string | null | undefined): number | null => {
  if (!complexity) return null;
  const complexityNum = parseInt(complexity);
  switch (complexityNum) {
    case 1: return 7;
    case 2: return 14;
    case 3: return 22;
    case 4: return 50;
    default: return null;
  }
};

// Функция для расчета даты нового договора на основе сложности и даты заявки
export const calculateNewContractDate = (
  requestDate: string | null,
  complexity: string | null,
  holidayKeys?: Set<string>
): string | null => {
  if (!requestDate || !complexity) return null;
  
  const workingDays = getWorkingDaysByComplexity(complexity);
  if (!workingDays) return null;
  
  try {
    // Парсим дату в формате YYYY-MM-DD (input type="date" возвращает такой формат)
    const requestDateObj = new Date(requestDate + 'T00:00:00');
    if (isNaN(requestDateObj.getTime())) return null;
    
    const newContractDateObj = addWorkingDays(requestDateObj, workingDays, holidayKeys);
    // Форматируем дату обратно в YYYY-MM-DD
    const year = newContractDateObj.getFullYear();
    const month = String(newContractDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(newContractDateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
};
