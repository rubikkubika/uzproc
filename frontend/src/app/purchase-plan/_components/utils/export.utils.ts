import { PurchasePlanItem } from '../types/purchase-plan-items.types';

// Функция для подготовки данных для экспорта в Excel
export const prepareExportData = (items: PurchasePlanItem[]) => {
  return items.map((item) => ({
    'ID': item.id || '',
    'GUID': item.guid || '',
    'Год': item.year || '',
    'Компания': item.company || '',
    'ЦФО': item.cfo || '',
    'Предмет закупки': item.purchaseSubject || '',
    'Бюджет (UZS)': item.budgetAmount || '',
    'Срок окончания договора': item.contractEndDate 
      ? new Date(item.contractEndDate).toLocaleDateString('ru-RU')
      : '',
    'Дата заявки': item.requestDate 
      ? new Date(item.requestDate).toLocaleDateString('ru-RU')
      : '',
    'Дата завершения закупки': item.newContractDate 
      ? new Date(item.newContractDate).toLocaleDateString('ru-RU')
      : '',
    'Закупщик': item.purchaser || '',
    'Продукция': item.product || '',
    'Есть договор': item.hasContract ? 'Да' : (item.hasContract === false ? 'Нет' : ''),
    'КА действующего': item.currentKa || '',
    'Сумма текущего': item.currentAmount || '',
    'Сумма текущего договора': item.currentContractAmount || '',
    'Остаток текущего договора': item.currentContractBalance || '',
    'Дата окончания действующего': item.currentContractEndDate 
      ? new Date(item.currentContractEndDate).toLocaleDateString('ru-RU')
      : '',
    'Автопролонгация': item.autoRenewal ? 'Да' : (item.autoRenewal === false ? 'Нет' : ''),
    'Сложность': item.complexity || '',
    'Холдинг': item.holding || '',
    'Категория': item.category || '',
    'Дата создания': item.createdAt 
      ? new Date(item.createdAt).toLocaleDateString('ru-RU')
      : '',
    'Дата обновления': item.updatedAt 
      ? new Date(item.updatedAt).toLocaleDateString('ru-RU')
      : '',
  }));
};
