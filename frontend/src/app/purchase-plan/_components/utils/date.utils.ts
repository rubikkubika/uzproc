// Функция для добавления рабочих дней к дате (исключая выходные: суббота и воскресенье)
export const addWorkingDays = (date: Date, workingDays: number): Date => {
  const result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay(); // 0 = воскресенье, 6 = суббота
    // Пропускаем выходные (суббота и воскресенье)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
export const calculateNewContractDate = (requestDate: string | null, complexity: string | null): string | null => {
  if (!requestDate || !complexity) return null;
  
  const workingDays = getWorkingDaysByComplexity(complexity);
  if (!workingDays) return null;
  
  try {
    // Парсим дату в формате YYYY-MM-DD (input type="date" возвращает такой формат)
    const requestDateObj = new Date(requestDate + 'T00:00:00');
    if (isNaN(requestDateObj.getTime())) return null;
    
    const newContractDateObj = addWorkingDays(requestDateObj, workingDays);
    // Форматируем дату обратно в YYYY-MM-DD
    const year = newContractDateObj.getFullYear();
    const month = String(newContractDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(newContractDateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
};
