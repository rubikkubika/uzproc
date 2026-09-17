import type { DeliveryQuery } from '../types/delivery-query.types';

/**
 * Query-параметры фильтров списка поставок: фильтры, год, вкладка, выбранный день ленты или карточка горизонта.
 * Горизонт и лента месяца считаются по всем поставкам и эти параметры не используют.
 */
export function buildDeliveryQueryParams(query: DeliveryQuery): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(query.filters).forEach(([key, value]) => {
    if (value && value.trim() !== '') params.append(key, value.trim());
  });

  if (query.noDate) {
    params.append('dateNull', 'true');
  } else if (query.year !== null) {
    params.append('dateYear', String(query.year));
  }

  if (query.paymentScheme) params.append('paymentScheme', query.paymentScheme);
  if (query.shipmentStatus) params.append('shipmentStatus', query.shipmentStatus);
  // 'all' — вкладка «Все»: фильтра по состоянию нет, параметр не отправляем
  if (query.tab && query.tab !== 'all') params.append('tab', query.tab);
  if (query.overdue) params.append('overdue', 'true');
  if (query.deliveredYear !== null) params.append('deliveredYear', String(query.deliveredYear));

  if (query.plannedDate) params.append('plannedDeliveryDate', query.plannedDate);
  if (query.horizon) params.append('horizon', query.horizon);

  return params;
}
