const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'upload', 'report', 'Отчет.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('Файл не найден:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

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

const row0 = [];
const row1 = [];
const row2 = [];

for (let C = range.s.c; C <= range.e.c; C++) {
  const getValue = (row) => {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: C });
    const cellKey = `${row},${C}`;
    if (mergeMap.has(cellKey)) {
      return String(mergeMap.get(cellKey) || '');
    } else {
      const cell = worksheet[cellAddress];
      return cell ? (cell.w || String(cell.v || '')) : '';
    }
  };
  row0.push(getValue(0));
  row1.push(getValue(1));
  row2.push(getValue(2));
}

console.log('=== ВСЕ ЗАГОЛОВКИ (включая согласования) ===\n');

// Обычные поля
console.log('ОБЫЧНЫЕ ПОЛЯ ЗАЯВКИ:');
for (let C = 0; C <= 30; C++) {
  const val = (row2[C] || '').trim();
  if (val) {
    console.log(`  Колонка ${C}: "${val}"`);
  }
}

console.log('\nСОГЛАСОВАНИЯ:');

// Группируем согласования
let currentStage = '';
let currentRole = '';

for (let C = 31; C <= 132; C++) {
  const stage = (row0[C] || '').trim();
  const role = (row1[C] || '').trim();
  const action = (row2[C] || '').trim();
  
  if (stage && stage !== currentStage) {
    if (currentStage) {
      console.log(''); // Пустая строка между этапами
    }
    currentStage = stage;
    console.log(`\n  ЭТАП: "${stage}"`);
    currentRole = '';
  }
  
  if (role && role !== currentRole) {
    currentRole = role;
    console.log(`    Роль: "${role}"`);
  }
  
  if (action) {
    console.log(`      - Колонка ${C}: "${action}"`);
  }
}

console.log('\nДОПОЛНИТЕЛЬНЫЕ ПОЛЯ:');
for (let C = 133; C <= 138; C++) {
  const val = (row2[C] || '').trim();
  if (val) {
    console.log(`  Колонка ${C}: "${val}"`);
  }
}

