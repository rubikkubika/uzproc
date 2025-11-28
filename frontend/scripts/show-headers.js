const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'upload', 'report', 'Отчет.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('Файл не найден:', filePath);
  process.exit(1);
}

console.log('Чтение файла:', filePath);
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

console.log(`\nДиапазон: ${range.s.r}-${range.e.r} строк, ${range.s.c}-${range.e.c} колонок\n`);

// Получаем информацию об объединенных ячейках
const merges = worksheet['!merges'] || [];
const mergeMap = new Map();

merges.forEach(merge => {
  const startCell = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
  const cellData = worksheet[startCell];
  const value = cellData ? (cellData.v !== undefined ? cellData.v : '') : '';
  
  for (let row = merge.s.r; row <= merge.e.r; row++) {
    for (let col = merge.s.c; col <= merge.e.c; col++) {
      const cellKey = `${row},${col}`;
      mergeMap.set(cellKey, value);
    }
  }
});

console.log('=== СТРОКА 0 (ЭТАПЫ) ===');
const row0 = [];
for (let C = range.s.c; C <= range.e.c; C++) {
  const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
  const cellKey = `0,${C}`;
  let value = '';
  
  if (mergeMap.has(cellKey)) {
    value = String(mergeMap.get(cellKey) || '');
  } else {
    const cell = worksheet[cellAddress];
    value = cell ? (cell.w || String(cell.v || '')) : '';
  }
  
  row0.push(value);
  if (value && value.trim()) {
    console.log(`  Col ${C}: "${value}"`);
  }
}

console.log('\n=== СТРОКА 1 (РОЛИ) ===');
const row1 = [];
for (let C = range.s.c; C <= range.e.c; C++) {
  const cellAddress = XLSX.utils.encode_cell({ r: 1, c: C });
  const cellKey = `1,${C}`;
  let value = '';
  
  if (mergeMap.has(cellKey)) {
    value = String(mergeMap.get(cellKey) || '');
  } else {
    const cell = worksheet[cellAddress];
    value = cell ? (cell.w || String(cell.v || '')) : '';
  }
  
  row1.push(value);
  if (value && value.trim()) {
    console.log(`  Col ${C}: "${value}"`);
  }
}

console.log('\n=== СТРОКА 2 (ПОЛЯ/ДЕЙСТВИЯ) ===');
const row2 = [];
for (let C = range.s.c; C <= range.e.c; C++) {
  const cellAddress = XLSX.utils.encode_cell({ r: 2, c: C });
  const cellKey = `2,${C}`;
  let value = '';
  
  if (mergeMap.has(cellKey)) {
    value = String(mergeMap.get(cellKey) || '');
  } else {
    const cell = worksheet[cellAddress];
    value = cell ? (cell.w || String(cell.v || '')) : '';
  }
  
  row2.push(value);
  if (value && value.trim()) {
    console.log(`  Col ${C}: "${value}"`);
  }
}

console.log('\n=== ДЕТАЛЬНАЯ СВОДНАЯ ТАБЛИЦА (все колонки) ===');
console.log('Col | Строка 0 (Этап)                    | Строка 1 (Роль)                     | Строка 2 (Поле/Действие)');
console.log('----|-------------------------------------|-------------------------------------|---------------------------');

for (let C = range.s.c; C <= range.e.c; C++) {
  const val0 = row0[C] || '';
  const val1 = row1[C] || '';
  const val2 = row2[C] || '';
  
  const val0Display = val0.substring(0, 35).padEnd(35);
  const val1Display = val1.substring(0, 35).padEnd(35);
  const val2Display = val2.substring(0, 25);
  
  // Показываем все колонки
  console.log(`${C.toString().padStart(3)} | ${val0Display} | ${val1Display} | ${val2Display}`);
  
  // Если это согласование (есть этап и роль), выводим полную информацию
  if (val0 && val0.trim() && val1 && val1.trim() && val2 && val2.trim() && 
      (val0.includes('Согласование') || val0.includes('Утверждение') || 
       val0.includes('Руководитель') || val0.includes('Закупочная') || 
       val0.includes('Проверка'))) {
    console.log(`     └─ Этап: "${val0}" | Роль: "${val1}" | Действие: "${val2}"`);
  }
}

console.log(`\nВсего колонок: ${range.e.c - range.s.c + 1}`);

// Группировка по этапам
console.log('\n=== ГРУППИРОВКА ПО ЭТАПАМ СОГЛАСОВАНИЙ ===');
const stagesMap = new Map();

for (let C = range.s.c; C <= range.e.c; C++) {
  const val0 = (row0[C] || '').trim();
  const val1 = (row1[C] || '').trim();
  const val2 = (row2[C] || '').trim();
  
  // Если это согласование
  if (val0 && val1 && val2 && 
      (val0.includes('Согласование') || val0.includes('Утверждение') || 
       val0.includes('Руководитель') || val0.includes('Закупочная') || 
       val0.includes('Проверка'))) {
    
    if (!stagesMap.has(val0)) {
      stagesMap.set(val0, {
        stage: val0,
        roles: new Map()
      });
    }
    
    const stageData = stagesMap.get(val0);
    if (!stageData.roles.has(val1)) {
      stageData.roles.set(val1, []);
    }
    
    stageData.roles.get(val1).push({
      column: C,
      action: val2
    });
  }
}

stagesMap.forEach((stageData, stageName) => {
  console.log(`\n📋 ЭТАП: "${stageName}"`);
  stageData.roles.forEach((actions, roleName) => {
    console.log(`   └─ Роль: "${roleName}"`);
    actions.forEach(action => {
      console.log(`      └─ Колонка ${action.column}: ${action.action}`);
    });
  });
});

