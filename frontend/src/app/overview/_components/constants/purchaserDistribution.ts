/**
 * Данные предлагаемого распределения активных заявок по закупщикам.
 *
 * Срез: активные заявки в работе у закупщиков (статусы от «у закупщика»
 * до «договор на регистрации», без завершённых, архива и проектов) — 193 заявки.
 * «Предмет» — статья расходов (expense_item). Бюджет указан в млн.
 * Распределение сбалансировано по количеству заявок (~48 на закупщика),
 * с учётом нового, ещё не представленного закупщика.
 */

export interface PurchaserDistributionItem {
  /** Предмет (статья расходов) */
  subject: string;
  /** Количество заявок */
  count: number;
  /** Бюджет, млн */
  budgetMln: number;
  /** Сложность (сумма баллов) */
  complexity: number;
}

export interface PurchaserDistributionGroup {
  /** Закупщик */
  buyer: string;
  /** Тематический блок */
  theme: string;
  /** Новый закупщик (ещё не представлен) */
  isNew?: boolean;
  /** Предметы закупщика */
  items: PurchaserDistributionItem[];
}

export const PURCHASER_DISTRIBUTION: PurchaserDistributionGroup[] = [
  {
    buyer: 'Абдулазиз',
    theme: 'Ремонт, стройка, эксплуатация объектов',
    items: [
      { subject: 'Ремонт/обслуж. спецтехники', count: 10, budgetMln: 3960, complexity: 23 },
      { subject: 'Ремонт ПВЗ', count: 8, budgetMln: 6638, complexity: 21 },
      { subject: 'Материалы и запчасти на ремонт', count: 8, budgetMln: 704, complexity: 20 },
      { subject: 'Ремонт зданий и сооружений', count: 7, budgetMln: 343, complexity: 8 },
      { subject: 'Капремонт зданий', count: 5, budgetMln: 2482, complexity: 10 },
      { subject: 'Эксплуатация офиса', count: 5, budgetMln: 48, complexity: 0 },
      { subject: 'Строительство ПВЗ', count: 1, budgetMln: 605, complexity: 0 },
      { subject: 'Капстроительство', count: 1, budgetMln: 50, complexity: 3 },
      { subject: 'Вывоз ТБО', count: 1, budgetMln: 1, complexity: 0 },
    ],
  },
  {
    buyer: 'Шакирова',
    theme: 'Транспорт, страхование, медицина',
    items: [
      { subject: 'Приобретение транспортных средств', count: 8, budgetMln: 27849, complexity: 25 },
      { subject: 'Прочие операционные расходы', count: 15, budgetMln: 1188, complexity: 21 },
      { subject: 'Страхование', count: 11, budgetMln: 317, complexity: 24 },
      { subject: 'Медицинские услуги', count: 3, budgetMln: 70, complexity: 11 },
      { subject: 'Топливо (ГСМ)', count: 2, budgetMln: 363, complexity: 0 },
      { subject: 'Ремонт/обслуж. ТС', count: 2, budgetMln: 50, complexity: 0 },
      { subject: 'Найм транспорта', count: 1, budgetMln: 500, complexity: 4 },
      { subject: 'Прочие расходы на персонал', count: 1, budgetMln: 200, complexity: 0 },
      { subject: 'ОСГОР', count: 1, budgetMln: 141, complexity: 3 },
      { subject: 'Транспортные расходы', count: 1, budgetMln: 100, complexity: 3 },
      { subject: 'Корп. мероприятия', count: 1, budgetMln: 49, complexity: 0 },
      { subject: 'ОСАГО', count: 1, budgetMln: 5, complexity: 3 },
      { subject: 'Обслуживание ТС', count: 1, budgetMln: 0, complexity: 4 },
    ],
  },
  {
    buyer: 'Исакова',
    theme: 'Основные средства / оборудование + маркетинг',
    items: [
      { subject: 'Средства хранения и транспортировки', count: 4, budgetMln: 8678, complexity: 6 },
      { subject: 'Приобретение прочих ОС', count: 7, budgetMln: 4459, complexity: 17 },
      { subject: 'Медиабаинг: наружка', count: 2, budgetMln: 2411, complexity: 7 },
      { subject: 'Списание малоценного оборуд.', count: 8, budgetMln: 1506, complexity: 13 },
      { subject: 'Приобретение орг. техники', count: 6, budgetMln: 1316, complexity: 6 },
      { subject: 'Приобретение мебели', count: 6, budgetMln: 1160, complexity: 5 },
      { subject: 'Серверы', count: 1, budgetMln: 350, complexity: 0 },
      { subject: 'Брендинг', count: 2, budgetMln: 251, complexity: 3 },
      { subject: 'Аренда прочая', count: 1, budgetMln: 150, complexity: 3 },
      { subject: 'Канцелярские товары', count: 6, budgetMln: 89, complexity: 7 },
      { subject: 'Мерч', count: 2, budgetMln: 56, complexity: 6 },
      { subject: 'Услуги ИТ', count: 1, budgetMln: 37, complexity: 4 },
      { subject: 'Медиабаинг: Retargeting', count: 1, budgetMln: 0, complexity: 3 },
      { subject: 'Себестоимость от продажи 1P', count: 1, budgetMln: 0, complexity: 0 },
    ],
  },
  {
    buyer: 'Новый',
    theme: 'Хозобеспечение / АХО',
    isNew: true,
    items: [
      { subject: 'Расходные материалы для заказов', count: 13, budgetMln: 4993, complexity: 21 },
      { subject: 'Униформа', count: 10, budgetMln: 2393, complexity: 12 },
      { subject: 'Списание ТМЦ на опер. нужды', count: 13, budgetMln: 636, complexity: 16 },
      { subject: 'Хозяйственные товары', count: 14, budgetMln: 508, complexity: 16 },
      { subject: 'Утилизация', count: 1, budgetMln: 1, complexity: 0 },
    ],
  },
];
