// Функция для получения символа валюты
export const getCurrencyIcon = (currency: string | null) => {
  if (!currency) return null;
  const currencyUpper = currency.toUpperCase();
  if (
    currencyUpper === 'USD' ||
    currencyUpper === 'ДОЛЛАР' ||
    currencyUpper === '$'
  ) {
    return <span className="ml-0.5">$</span>;
  } else if (
    currencyUpper === 'EUR' ||
    currencyUpper === 'ЕВРО' ||
    currencyUpper === '€'
  ) {
    return <span className="ml-0.5">€</span>;
  } else if (
    currencyUpper === 'UZS' ||
    currencyUpper === 'СУМ' ||
    currencyUpper === 'СУММ'
  ) {
    return <span className="ml-0.5 text-xs">UZS</span>;
  }
  return <span className="ml-0.5 text-xs">{currency}</span>;
};
